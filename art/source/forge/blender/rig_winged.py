"""rig (winged template): front-facing textured mesh -> fitted, weighted winged-v1 rig.

blender -b --factory-startup -P rig_winged.py -- <texture.blend> <rig.blend> <params.json> <preview_dir>
params: {"template": spec/skeletons/winged.json, "yawDeg": null | float, "landmarks": {...overrides}}
Writes rig.blend (armature "Rig" + skinned "Body"), <preview_dir>/rig_<view>.png and prints
"RIG {json}" like rig.py (doctrine L6, PRD-1). Landmarks come from the mesh (L5): the body
core is the narrow band about the centre line, the wings are everything wider.
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
half = float(V[:, 0].max())
ymin, ymax = float(V[:, 1].min()), float(V[:, 1].max())
L = ymax - ymin
warnings = []
if 2 * half < LM["minWingSpanRatio"] * L:
    warnings.append(f"span {2 * half:.3f} is not wider than the body length {L:.3f}: wings folded or the front view is turned (set rig.yawDeg)")

ax = np.abs(V[:, 0]) / half
core = V[ax < LM["coreFraction"]]
if len(core) < 20:
    raise SystemExit("rig_winged: no body core on the centre line; check the mesh faces -Y")
cy0, cy1 = float(core[:, 1].min()), float(core[:, 1].max())
Lc = cy1 - cy0


def band(sign: int, lo: float, hi: float) -> np.ndarray:
    m = (V[:, 0] * sign > 0) & (ax >= lo) & (ax < hi)
    return V[m]


def core_z(y: float, q: float = 0.5) -> float:
    m = np.abs(core[:, 1] - y) < 0.06 * Lc
    return float(np.quantile(core[m, 2], q)) if m.sum() >= 3 else float(np.median(core[:, 2]))


lmk = {}
roots = {}
for side, sign in (("l", 1), ("r", -1)):
    r = band(sign, *LM["rootBand"])
    mid = band(sign, *LM["midBand"])
    tip = band(sign, LM["tipFraction"], 1.01)
    if not (len(r) and len(mid) and len(tip)):
        warnings.append(f"wing {side} not found; placed by proportion (set rig.landmarks.wing_{side}_root/mid/tip)")
        z = float(np.median(core[:, 2]))
        r = mid = tip = None
        lmk[f"wing_{side}_root"] = (sign * LM["rootBand"][0] * half, cy0 + 0.4 * Lc, z)
        lmk[f"wing_{side}_mid"] = (sign * 0.6 * half, cy0 + 0.45 * Lc, z)
        lmk[f"wing_{side}_tip"] = (sign * half, cy0 + 0.5 * Lc, z)
    else:
        lmk[f"wing_{side}_root"] = tuple(r.mean(0))
        lmk[f"wing_{side}_mid"] = tuple(mid.mean(0))
        lmk[f"wing_{side}_tip"] = tuple(tip.mean(0))
    roots[side] = lmk[f"wing_{side}_root"]
chest_y = (roots["l"][1] + roots["r"][1]) / 2
lmk["chest"] = (0.0, chest_y, core_z(chest_y))
head_reg = core[core[:, 1] < cy0 + LM["headRegionFraction"] * Lc]
upper = head_reg[head_reg[:, 2] > np.median(head_reg[:, 2])] if len(head_reg) > 6 else head_reg
sn = upper[upper[:, 1].argmin()]
cr = head_reg[head_reg[:, 2].argmax()]
lmk["snout"] = (0.0, float(sn[1]), float(sn[2]))
lmk["crown"] = (0.0, float(cr[1]), float(cr[2]))
hb_y = chest_y + 0.55 * (float(sn[1]) - chest_y)
if hb_y >= chest_y - 1e-3 or hb_y <= float(sn[1]):
    warnings.append("head base not between chest and snout (set rig.landmarks.head_base)")
lmk["head_base"] = (0.0, hb_y, core_z(hb_y))
rear = cy1 - chest_y
lmk["hip"] = (0.0, chest_y + 0.3 * rear, core_z(chest_y + 0.3 * rear))
lmk["tail_1"] = (0.0, chest_y + 0.65 * rear, core_z(chest_y + 0.65 * rear))
tail_tip = core[core[:, 1] > cy1 - 0.04 * Lc]
lmk["tail_2"] = (0.0, cy1, float(np.median(tail_tip[:, 2])))
lmk["back_top"] = (0.0, chest_y, core_z(chest_y, 0.9))
for k, v in (P.get("landmarks") or {}).items():
    lmk[k] = tuple(v)

arm = riglib.build_armature(scene, T, lmk, Hh, L)
size = max(2 * half, L, Hh)
empty, unweighted = riglib.transfer_weights(scene, body, arm, T["weights"]["proxyVoxelFraction"] * size, T["weights"]["maxInfluences"])
bpy.ops.wm.save_as_mainfile(filepath=out)

pv = riglib.Preview(scene, size, Vector((0, (ymin + ymax) / 2, Hh * 0.5)), prev_dir)
pv.add_markers(lmk, 0.015 * size, lambda n: (1.0, 0.8, 0.1, 1.0) if n.startswith("wing") else (1.0, 0.1, 0.1, 1.0))
FRONT, THREE_Q, SIDE = Vector((0, -1, 0.5)), Vector((0.8, -0.8, 0.6)), Vector((1, 0, 0.35))
wings = lambda a, b: {"wing_l_01": (a, 0, 0), "wing_l_02": (b, 0, 0), "wing_r_01": (a, 0, 0), "wing_r_02": (b, 0, 0)}  # noqa: E731
shots = [("rest_landmarks_front", {}, FRONT, True), ("rest_landmarks_3q", {}, THREE_Q, True),
         ("wings_up", wings(40, 15), FRONT, False), ("wings_down", wings(-30, -10), FRONT, False),
         ("wings_folded", {"wing_l_01": (-10, 0, 60), "wing_r_01": (-10, 0, -60)}, THREE_Q, False),
         ("head_tail", {"head": (-20, 0, 25), "tail_01": (15, 0, 15), "tail_02": (15, 0, 15)}, SIDE, False)]
previews = []
for name, rot, view, show in shots:
    riglib.set_pose(arm, rot)
    previews.append(pv.shot(name, view, show))
riglib.set_pose(arm, {})

print("RIG", json.dumps({"orient": "front view (-Y)" if not P.get("yawDeg") else "recipe", "yawDeg": round(float(P.get("yawDeg") or 0), 1),
                         "landmarks": {k: [round(float(c), 4) for c in v] for k, v in lmk.items()},
                         "proxyFallbackVerts": empty, "unweightedVerts": unweighted, "warnings": warnings,
                         "heightUnits": round(Hh, 4), "lengthUnits": round(L, 4), "spanUnits": round(2 * half, 4),
                         "bones": len(arm.data.bones), "previews": previews}))
