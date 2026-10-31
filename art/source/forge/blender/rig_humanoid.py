"""rig_humanoid: fit the UAL2 skeleton to an A-pose human mesh by landmarks and weight it (L6, PRD-3.1).

blender -b --factory-startup -P rig_humanoid.py -- <texture.blend> <rig.blend> <params.json> <preview_dir>
params: {"template": spec/skeletons/humanoid.json, "library": ual_library.blend,
         "yawDeg": null | float, "landmarks": {"wrist_l": [x, y, z], ...}}   # recipe overrides
Every UAL2 bone keeps its own frame, rotated rigidly onto the mesh's joints, so UAL2 and UAL1
actions retarget by rest-relative rotation (blender/retarget.py). Our humans are 4.5-5 heads tall
(L3): joints come from the mesh, never from scaled realistic proportions.
Writes rig.blend (armature "Rig" + skinned "Body"), preview PNGs, and prints "RIG {json}".
"""

import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

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
if P.get("yawDeg"):
    body.data.transform(Matrix.Rotation(math.radians(P["yawDeg"]), 4, "Z"))
    body.data.update()
V = np.array([tuple(body.matrix_world @ v.co) for v in body.data.vertices])
H = float(V[:, 2].max())
step = LM["sliceFraction"] * H
gap = 0.02 * H
warnings: list[str] = []


def slab(z0: float, z1: float) -> np.ndarray:
    return V[(V[:, 2] >= z0) & (V[:, 2] < z1)]


def comps(pts: np.ndarray) -> list[np.ndarray]:
    """1-D clusters of slab points along x (sorted), as point arrays."""
    if not len(pts):
        return []
    o = pts[np.argsort(pts[:, 0])]
    cut = np.where(np.diff(o[:, 0]) > gap)[0]
    return np.split(o, cut + 1)


def mid_y(c: np.ndarray | None, default: float) -> float:
    """Median depth of the points nearest the body's centre line (robust to hair, shoulders, packs)."""
    if c is None or not len(c):
        return default
    core = c[np.abs(c[:, 0]) < 0.04 * H]
    return float(np.median((core if len(core) >= 3 else c)[:, 1]))


def central(pts: np.ndarray) -> np.ndarray | None:
    cs = comps(pts)
    if not cs:
        return None
    return min(cs, key=lambda c: 0 if c[:, 0].min() <= 0 <= c[:, 0].max() else min(abs(c[:, 0].min()), abs(c[:, 0].max())))


# ---------------------------------------------------------------- legs
z_crotch = None
for z in np.arange(0.12 * H, 0.7 * H, step):
    if any(c[:, 0].min() < 0 < c[:, 0].max() for c in comps(slab(z, z + step))):
        z_crotch = float(z)
        break
if z_crotch is None:
    z_crotch = 0.47 * H
    warnings.append("crotch not found; using 0.47 H (set rig.landmarks.hip_l/hip_r)")
lmk: dict[str, tuple] = {}
side_sign = {"l": 1.0, "r": -1.0}


def side_pts(pts: np.ndarray, side: str, maxx: float = 0.2) -> np.ndarray:
    s = side_sign[side]
    return pts[(pts[:, 0] * s > 0) & (np.abs(pts[:, 0]) < maxx * H)]


hip_z = z_crotch + 0.03 * H
leg_top = slab(z_crotch - 0.08 * H, z_crotch - 0.02 * H)
for sd in "lr":
    lt = side_pts(leg_top, sd)
    hx, hy = (float(lt[:, 0].mean()), float(lt[:, 1].mean())) if len(lt) else (side_sign[sd] * 0.05 * H, 0.0)
    lmk[f"hip_{sd}"] = (hx, hy, hip_z)
    an = side_pts(slab(0.04 * H, 0.09 * H), sd)
    ax, ay = (float(an[:, 0].mean()), float(an[:, 1].mean())) if len(an) else (hx, hy)
    lmk[f"ankle_{sd}"] = (ax, ay, LM["ankleHeight"] * H)
    kz = (hip_z + LM["ankleHeight"] * H) / 2
    kn = side_pts(slab(kz - 0.02 * H, kz + 0.02 * H), sd)
    lmk[f"knee_{sd}"] = (float(kn[:, 0].mean()), float(kn[:, 1].mean()) - 0.01 * H, kz) if len(kn) else ((hx + ax) / 2, (hy + ay) / 2, kz)
    ft = side_pts(V[V[:, 2] < 0.04 * H], sd, 0.3)
    tip = ft[ft[:, 1].argmin()] if len(ft) else np.array([ax, ay - LM["toeForward"] * H, 0])
    lmk[f"toe_{sd}"] = (float(tip[0]), float(tip[1]), 0.01 * H)
    lmk[f"ball_{sd}"] = (ax + 0.65 * (tip[0] - ax), ay + 0.65 * (tip[1] - ay), 0.02 * H)

# ---------------------------------------------------------------- neck, head, torso
best = None
for z in np.arange(LM["neckSearch"][0] * H, LM["neckSearch"][1] * H, step):
    c = central(slab(z - 1.5 * step, z + 1.5 * step))  # thick slab: sparse slices fake a narrow neck
    if c is not None and len(c) >= 15:
        w = float(c[:, 0].max() - c[:, 0].min())
        if best is None or w < best[0]:
            best = (w, float(z), mid_y(c, 0.0))
z_neck, y_neck = (best[1], best[2]) if best else (0.8 * H, 0.0)
if not best:
    warnings.append("neck not found; using 0.8 H (set rig.landmarks.neck_base/head_base)")
head_v = V[V[:, 2] > z_neck + 0.02 * H]
y_head = float(np.median(head_v[:, 1])) if len(head_v) else y_neck
lmk["crown"] = (0.0, y_head, H)
lmk["head_base"] = (0.0, (y_neck + y_head) / 2, z_neck + 0.015 * H)
lmk["neck_base"] = (0.0, y_neck, z_neck - 0.04 * H)
pel_y = float(np.mean([lmk["hip_l"][1], lmk["hip_r"][1]]))
lmk["pelvis"] = (0.0, pel_y, hip_z)
for name, f in (("spine_01", 0.2), ("spine_02", 0.5), ("spine_03", 0.78)):
    z = hip_z + (lmk["neck_base"][2] - hip_z) * f
    c = central(slab(z - step, z + step))
    lmk[name] = (0.0, mid_y(c, pel_y), z)

# ---------------------------------------------------------------- arms (A-pose: arms leave the torso below the shoulder)
z_ap = None
for z in np.arange(lmk["neck_base"][2] - 0.02 * H, z_crotch, -step):
    cs = comps(slab(z, z + step))
    c = central(slab(z, z + step))
    if c is None:
        continue
    others = [k for k in cs if k is not c]
    if any(k[:, 0].mean() > c[:, 0].max() for k in others) and any(k[:, 0].mean() < c[:, 0].min() for k in others):
        z_ap = float(z)
        break
arm_found = z_ap is not None
if not arm_found:
    z_ap = lmk["neck_base"][2] - 0.1 * H
    warnings.append("arms not separated from the torso (A-pose expected, PRD-3.1); arms placed by proportion (set rig.landmarks.shoulder_*/elbow_*/wrist_*)")
torso = central(slab(z_ap, z_ap + 2 * step))
half_w = float(max(abs(torso[:, 0].min()), abs(torso[:, 0].max()))) if torso is not None else 0.1 * H
sh_z = z_ap + 0.55 * (z_neck - z_ap)
arm_pts = {"l": [], "r": []}
if arm_found:
    # Follow each arm down as a chain: at the armpit take the piece beside the torso, then in every
    # lower slab only the piece overlapping the one above. Legs (wide stances, capes) never join the
    # chain unless a hand touches them, so they can't be mistaken for arms.
    for sd in "lr":
        s_ = side_sign[sd]
        prev = None
        for z in np.arange(z_ap, 0.1 * H, -step):
            sl = slab(z, z + step)
            c = central(sl)
            cands = [k for k in comps(sl) if not (c is not None and k is c) and k[:, 0].mean() * s_ > 0]
            if prev is None:
                pick = max(cands, key=lambda k: abs(k[:, 0].mean()), default=None)
            else:
                lo, hi = prev[0] - gap, prev[1] + gap
                over = [k for k in cands if k[:, 0].max() >= lo and k[:, 0].min() <= hi]
                pick = max(over, key=len, default=None)
            if pick is None:
                if prev is not None:
                    break  # the chain ended: fingertips
                continue
            arm_pts[sd].append(pick)
            prev = (float(pick[:, 0].min()), float(pick[:, 0].max()))
for sd in "lr":
    s = side_sign[sd]
    shoulder = np.array([s * half_w * 0.85, lmk["spine_03"][1], sh_z])
    pts = np.concatenate(arm_pts[sd]) if arm_pts[sd] else None
    if pts is not None and len(pts) > 10:
        tip = pts[np.linalg.norm(pts - shoulder, axis=1).argmax()]
    else:
        tip = shoulder + np.array([s * 0.32 * H, 0, -0.32 * H])
        if arm_found:
            warnings.append(f"arm_{sd} not found; placed by proportion")
    d = (tip - shoulder) / max(np.linalg.norm(tip - shoulder), 1e-6)
    hand_len = LM["handFraction"] * float(np.linalg.norm(tip - shoulder))
    wrist = tip - d * hand_len
    elbow = shoulder + 0.5 * (wrist - shoulder)
    if pts is not None and len(pts):
        near = pts[np.linalg.norm(pts - elbow, axis=1) < 0.05 * H]
        if len(near) > 3:
            elbow = near.mean(0)
    lmk[f"clavicle_{sd}"] = (s * 0.02 * H, lmk["spine_03"][1], lmk["neck_base"][2] - 0.01 * H)
    lmk[f"shoulder_{sd}"] = tuple(shoulder)
    lmk[f"elbow_{sd}"] = tuple(elbow)
    lmk[f"wrist_{sd}"] = tuple(wrist)
    lmk[f"hand_end_{sd}"] = tuple(wrist + d * hand_len * 0.55)
    lmk[f"palm_{sd}"] = tuple(wrist + d * hand_len * 0.4)
head_pts = V[V[:, 2] > z_neck]
lmk["face"] = (0.0, float(head_pts[:, 1].min()) if len(head_pts) else y_neck - 0.05 * H, z_neck + 0.45 * (H - z_neck))
bk = slab(lmk["spine_03"][2] - step, lmk["spine_03"][2] + step)
bk = bk[np.abs(bk[:, 0]) < half_w]
lmk["back"] = (0.0, float(bk[:, 1].max()) if len(bk) else y_neck + 0.08 * H, lmk["spine_03"][2])
for k, v in (P.get("landmarks") or {}).items():
    lmk[k] = tuple(v)

# ---------------------------------------------------------------- armature: rigid UAL2 frames onto the landmarks
with bpy.data.libraries.load(P["library"], link=False) as (data_from, data_to):
    data_to.objects = ["UAL2"]
src_arm = data_to.objects[0]
arm_data = src_arm.data.copy()
arm_data.name = "Rig"
arm = bpy.data.objects.new("Rig", arm_data)
scene.collection.objects.link(arm)
bpy.data.objects.remove(src_arm, do_unlink=True)
old = {b.name: (b.head_local.copy(), b.tail_local.copy(), b.matrix_local.to_3x3().normalized()) for b in arm_data.bones}
ual_h = max(t.z for _, t, _ in old.values())
TARGETS = {
    "pelvis": ("pelvis", "spine_01"), "spine_01": ("spine_01", "spine_02"), "spine_02": ("spine_02", "spine_03"),
    "spine_03": ("spine_03", "neck_base"), "neck_01": ("neck_base", "head_base"), "Head": ("head_base", "crown"),
}
for sd in "lr":
    TARGETS.update({f"clavicle_{sd}": (f"clavicle_{sd}", f"shoulder_{sd}"), f"upperarm_{sd}": (f"shoulder_{sd}", f"elbow_{sd}"),
                    f"lowerarm_{sd}": (f"elbow_{sd}", f"wrist_{sd}"), f"hand_{sd}": (f"wrist_{sd}", f"hand_end_{sd}"),
                    f"thigh_{sd}": (f"hip_{sd}", f"knee_{sd}"), f"calf_{sd}": (f"knee_{sd}", f"ankle_{sd}"),
                    f"foot_{sd}": (f"ankle_{sd}", f"ball_{sd}"), f"ball_{sd}": (f"ball_{sd}", f"toe_{sd}")})

bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
eb = arm_data.edit_bones
for e in eb:
    e.use_connect = False
frames: dict[str, tuple] = {}  # bone -> (old head, new head, rotation, scale)
scale0 = H / ual_h


def depth(name: str) -> int:
    d, b = 0, arm_data.bones[name]
    while b.parent:
        d, b = d + 1, b.parent
    return d


for name in sorted(old, key=depth):
    h0, t0, m0 = old[name]
    e = eb[name]
    d0 = (t0 - h0).normalized()
    if name in TARGETS:
        h1, t1 = Vector(lmk[TARGETS[name][0]]), Vector(lmk[TARGETS[name][1]])
        if (t1 - h1).length < 1e-5:
            t1 = h1 + d0 * (t0 - h0).length * scale0
        R = d0.rotation_difference((t1 - h1).normalized()).to_matrix()
        s = (t1 - h1).length / max((t0 - h0).length, 1e-6)
    else:
        par = arm_data.bones[name].parent
        if par is None or par.name not in frames:
            R, s = Matrix.Identity(3), scale0
            h1 = h0 * scale0
        else:
            ph0, ph1, pR, ps = frames[par.name]
            R, s = pR, ps
            h1 = ph1 + pR @ ((h0 - ph0) * ps)
        t1 = h1 + R @ d0 * (t0 - h0).length * s
    e.head, e.tail = h1, t1
    e.align_roll(R @ m0.col[2])
    frames[name] = (h0, h1, R, s)
for sk in T["sockets"]:
    e = eb.new(sk["name"])
    p = Vector(lmk[sk["at"]])
    e.head, e.tail = p, p + Vector((0, 0, 0.03 * H))
    e.parent = eb[sk["parent"]]
    e.use_deform = False
for name in T["nonDeform"]:
    if name in eb:
        eb[name].use_deform = False
bpy.ops.object.mode_set(mode="OBJECT")
# A-pose -> T-pose lift per arm: the retarget reference is this rig in the libraries' T-pose.
for sd in "lr":
    fit = (Vector(lmk[f"elbow_{sd}"]) - Vector(lmk[f"shoulder_{sd}"])).normalized()
    ual = (old[f"upperarm_{sd}"][1] - old[f"upperarm_{sd}"][0]).normalized()
    arm_data[f"forge_a2t_{sd}"] = list(fit.rotation_difference(ual))

fallback, unweighted = riglib.transfer_weights(scene, body, arm, T["weights"]["proxyVoxelFraction"] * H, T["weights"]["maxInfluences"])
bpy.ops.wm.save_as_mainfile(filepath=out)

# ---------------------------------------------------------------- preview (PRD-5)
pv = riglib.Preview(scene, H, Vector((0, 0, H * 0.5)), prev_dir)
pv.add_markers({k: v for k, v in lmk.items() if not k.startswith(("hand_end", "palm"))}, 0.012 * H,
               lambda n: (0.2, 0.5, 1.0, 1.0) if n in ("face", "back") else (1.0, 0.1, 0.1, 1.0))
pb = arm.pose.bones


def reset():
    for b in pb:
        b.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()


def turn(bone: str, axis: str, deg: float):
    """Rotate a bone about a world axis through its head (armature = world)."""
    b = pb[bone]
    head = b.matrix.to_translation()
    b.matrix = Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-head) @ b.matrix
    bpy.context.view_layer.update()


FRONT, SIDE = Vector((0, -1, 0.25)), Vector((1, 0, 0.25))
previews = [pv.shot("rest_landmarks_front", FRONT, True), pv.shot("rest_landmarks_side", SIDE, True)]
reset()
turn("upperarm_l", "Y", -110)
turn("upperarm_r", "Y", 110)
previews.append(pv.shot("arms_up", FRONT, False))
reset()
turn("thigh_l", "X", -35)
turn("calf_l", "X", 40)
turn("thigh_r", "X", 25)
turn("upperarm_r", "X", -40)
previews.append(pv.shot("stride", SIDE, False))
reset()
turn("spine_02", "X", -25)
turn("neck_01", "Z", 30)
turn("Head", "Z", 15)
previews.append(pv.shot("bend_head_turn", Vector((0.8, -0.8, 0.4)), False))
reset()

print("RIG", json.dumps({"orient": "front view (-Y)" if not P.get("yawDeg") else "recipe", "yawDeg": P.get("yawDeg") or 0,
                         "landmarks": {k: [round(float(c), 4) for c in v] for k, v in lmk.items()},
                         "proxyFallbackVerts": fallback, "unweightedVerts": unweighted, "warnings": warnings,
                         "heightUnits": round(H, 4), "lengthUnits": round(H, 4), "bones": len(arm_data.bones), "previews": previews}))
