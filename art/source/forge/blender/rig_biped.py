"""rig (mushroom-biped template): front-facing textured mesh -> fitted, weighted mushroom-biped-v1 rig.

blender -b --factory-startup -P rig_biped.py -- <texture.blend> <rig.blend> <params.json> <preview_dir>
params: {"template": spec/skeletons/mushroom-biped.json, "yawDeg": null | float, "landmarks": {...overrides}}
Writes rig.blend (armature "Rig" + skinned "Body"), <preview_dir>/rig_<view>.png and prints
"RIG {json}" like rig.py (doctrine L6, PRD-1). Landmarks come from the mesh (L5): the crotch
splits the legs, the widest upper slices are the cap.
"""

import json
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import riglib  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, P, prev_dir = argv[0], argv[1], json.loads(open(argv[2]).read()), argv[3]
T = P["template"]
LM = T["landmarks"]

bpy.ops.wm.open_mainfile(filepath=src)
scene = bpy.context.scene
body = bpy.data.objects["Body"]
for o in list(scene.objects):
    if o is not body:
        bpy.data.objects.remove(o, do_unlink=True)

V = riglib.front_mesh(body, P.get("yawDeg"))
Hh = float(V[:, 2].max())
W = float(np.ptp(V[:, 0]))
ymin, ymax = float(V[:, 1].min()), float(V[:, 1].max())
L = ymax - ymin
warnings = []

# crotch: the lowest centre-line point above the ground band
centre = V[(np.abs(V[:, 0]) < LM["centreBand"] * W) & (V[:, 2] > LM["crotchMin"] * Hh)]
crotch = float(centre[:, 2].min()) if len(centre) else 0.3 * Hh
if not len(centre) or crotch > 0.6 * Hh:
    warnings.append("crotch not found on the centre line; legs placed by proportion (set rig.landmarks.hip)")
    crotch = 0.3 * Hh
legs = {}
low = V[V[:, 2] < crotch]
for side, sign in (("l", 1), ("r", -1)):
    g = low[low[:, 0] * sign > LM["centreBand"] * W]
    if len(g) < 6:
        warnings.append(f"{side} leg not found below the crotch; placed by proportion (set rig.landmarks.ankle_{side})")
        g = np.array([[sign * 0.18 * W, 0.0, 0.0], [sign * 0.18 * W, 0.0, crotch]])
    legs[side] = g
lmk = {}
ah, kf = LM["ankleHeight"] * Hh, LM["kneeForward"] * L
for side, g in legs.items():
    x, y = float(np.median(g[:, 0])), float(np.median(g[:, 1]))
    foot = g[g[:, 2] < 2.5 * ah] if (g[:, 2] < 2.5 * ah).sum() >= 3 else g
    lmk[f"hip_{side}"] = (0.8 * x, y, crotch)
    lmk[f"ankle_{side}"] = (x, y, ah)
    lmk[f"knee_{side}"] = (x * 0.95, y - kf, (crotch + ah) / 2)
    lmk[f"toe_{side}"] = (x, float(foot[:, 1].min()), 0.02 * Hh)
yc = (lmk["hip_l"][1] + lmk["hip_r"][1]) / 2
lmk["hip"] = (0.0, yc, crotch)

# cap: the lowest upper slice at least capWidthFraction as wide as the widest one
step = LM["sliceFraction"] * Hh
sl = [s for s in riglib.slice_widths(V, LM["capSearchMin"] * Hh, Hh, step) if s[2] > 2]
widest = max(w for _, w, _ in sl) if sl else 0.0
cap_z = next((z - step / 2 for z, w, _ in sl if w >= LM["capWidthFraction"] * widest), None)
if cap_z is None or cap_z <= crotch:
    warnings.append("cap not found above the stem (set rig.landmarks.cap_base)")
    cap_z = 0.6 * Hh
lmk["cap_base"] = (0.0, yc, cap_z)
lmk["stem_mid"] = (0.0, yc, (crotch + cap_z) / 2)
lmk["crown"] = (0.0, yc, Hh)
fz = crotch + LM["faceFraction"] * (cap_z - crotch)
fs = V[(np.abs(V[:, 2] - fz) < step) & (np.abs(V[:, 0]) < 0.25 * W)]
lmk["face"] = (0.0, float(fs[:, 1].min()) if len(fs) else ymin, fz)
top = V[V[:, 2] > cap_z + 0.6 * (Hh - cap_z)]
lmk["back_top"] = (0.0, float(np.quantile(top[:, 1], 0.7)) if len(top) else yc, float(np.quantile(top[:, 2], 0.8)) if len(top) else Hh)
for k, v in (P.get("landmarks") or {}).items():
    lmk[k] = tuple(v)

arm = riglib.build_armature(scene, T, lmk, Hh, L)
empty, unweighted = riglib.transfer_weights(scene, body, arm, T["weights"]["proxyVoxelFraction"] * Hh, T["weights"]["maxInfluences"])
bpy.ops.wm.save_as_mainfile(filepath=out)

pv = riglib.Preview(scene, max(W, L, Hh), Vector((0, (ymin + ymax) / 2, Hh * 0.45)), prev_dir)
pv.add_markers(lmk, 0.018 * max(W, Hh), lambda n: (1.0, 0.8, 0.1, 1.0) if n[-2:] in ("_l", "_r") else (1.0, 0.1, 0.1, 1.0))
FRONT, THREE_Q, SIDE = Vector((0, -1, 0.4)), Vector((0.8, -0.8, 0.6)), Vector((1, 0, 0.35))
s = 0.12 * L + 0.05 * Hh
shots = [("rest_landmarks_front", {}, {}, FRONT, True), ("rest_landmarks_side", {}, {}, SIDE, True),
         ("stride", {}, {"ik_l": (0, -s, 0.05 * Hh), "ik_r": (0, s, 0)}, SIDE, False),
         ("waddle_roll", {"pelvis": (0, 0, 10), "head": (0, 0, -6)}, {"ik_r": (0, 0, 0.08 * Hh)}, FRONT, False),
         ("cap_nod_turn", {"head": (20, 25, 0), "stem": (10, 0, 0)}, {}, THREE_Q, False)]
previews = []
for name, rot, move, view, show in shots:
    riglib.set_pose(arm, rot, move)
    previews.append(pv.shot(name, view, show))
riglib.set_pose(arm, {})

print("RIG", json.dumps({"orient": "front view (-Y)" if not P.get("yawDeg") else "recipe", "yawDeg": round(float(P.get("yawDeg") or 0), 1),
                         "landmarks": {k: [round(float(c), 4) for c in v] for k, v in lmk.items()},
                         "proxyFallbackVerts": empty, "unweightedVerts": unweighted, "warnings": warnings,
                         "heightUnits": round(Hh, 4), "lengthUnits": round(L, 4), "widthUnits": round(W, 4),
                         "bones": len(arm.data.bones), "previews": previews}))
