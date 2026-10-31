"""rig: orient the textured mesh, detect landmarks, fit the template skeleton, weight it.

blender -b --factory-startup -P rig.py -- <texture.blend> <rig.blend> <params.json> <preview_dir>
params: {"template": {...spec/skeletons/<t>.json...}, "yawDeg": null | float,
         "landmarks": {"snout": [x, y, z], ...}}   # recipe overrides (the operator's lever)
Writes rig.blend (armature "Rig" + skinned "Body"), <preview_dir>/rig_<view>.png renders for the
preview sheet, and prints "RIG {json}" with the landmarks used (doctrine L6, PRD-1).
Quadruped template only; humanoid (UAL2) fitting is codex ticket C9.
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


def verts() -> np.ndarray:
    mw = body.matrix_world
    return np.array([tuple(mw @ v.co) for v in body.data.vertices])


# ---------------------------------------------------------------- orient: head to -Y (south)
V = verts()
if P.get("yawDeg") is not None:
    yaw = math.radians(P["yawDeg"])
    how = "recipe"
else:
    xy = V[:, :2] - V[:, :2].mean(0)
    w, vec = np.linalg.eigh(np.cov(xy.T))
    ax = vec[:, 1]
    proj = xy @ ax
    lo, hi = np.quantile(proj, [0.15, 0.85])
    head_dir = -ax if np.quantile(V[proj < lo, 2], 0.9) > np.quantile(V[proj > hi, 2], 0.9) else ax
    yaw = -math.pi / 2 - math.atan2(head_dir[1], head_dir[0])  # rotate head_dir onto -Y
    how = "pca"
body.data.transform(Matrix.Rotation(yaw, 4, "Z"))
V = verts()
shift = Vector((-(V[:, 0].min() + V[:, 0].max()) / 2, -(V[:, 1].min() + V[:, 1].max()) / 2, -V[:, 2].min()))
body.data.transform(Matrix.Translation(shift))
body.data.update()
V = verts()

# ---------------------------------------------------------------- landmarks
Hh = float(V[:, 2].max())
ymin, ymax = float(V[:, 1].min()), float(V[:, 1].max())
L = ymax - ymin


def slice_center(y, half=0.05, zmin=0.25):
    m = (np.abs(V[:, 1] - y) < half * L) & (V[:, 2] > zmin * Hh)
    if m.sum() < 5:
        m = np.abs(V[:, 1] - y) < half * 2 * L
    return float(np.median(V[m, 0])), float(np.median(V[m, 2]))


# leg columns: XY cells whose vertices span the low band from near the ground upward
b0, b1 = LM["legColumnBand"]
cell = LM["legColumnCellFraction"] * L
low = V[V[:, 2] < b1 * Hh * 1.2]
cells: dict = {}
for x, y, z in low:
    cells.setdefault((int(math.floor(x / cell)), int(math.floor(y / cell))), []).append(z)
cols = [(k, v) for k, v in cells.items() if min(v) <= b0 * Hh * 3 and max(v) >= b1 * Hh * 0.8]
pts = np.array([((k[0] + 0.5) * cell, (k[1] + 0.5) * cell) for k, _ in cols]) if cols else np.zeros((0, 2))
pts = pts[pts[:, 1] < ymin + 0.85 * L] if len(pts) else pts  # tail tip is never a leg
legs = {}
warnings = []
if len(pts) >= 2:
    ys = pts[:, 1]
    c1, c2 = np.quantile(ys, 0.2), np.quantile(ys, 0.8)
    for _ in range(20):  # 1-D k-means: front vs back columns
        front = np.abs(ys - c1) <= np.abs(ys - c2)
        c1, c2 = ys[front].mean(), ys[~front].mean() if (~front).any() else c2
    for end, sel in (("f", front), ("b", ~front)):
        grp = pts[sel]
        for side, sgn in (("l", 1), ("r", -1)):
            g = grp[(grp[:, 0] * sgn) > 0]
            if len(g):
                legs[end + side] = g.mean(0)
        for side, other in (("l", "r"), ("r", "l")):
            if end + side not in legs and end + other in legs:
                legs[end + side] = legs[end + other] * np.array([-1, 1])
                warnings.append(f"{end}{side} leg mirrored from {end}{other}")
for k, (yf, xs) in {"fl": (0.25, 1), "fr": (0.25, -1), "bl": (0.75, 1), "br": (0.75, -1)}.items():
    if k not in legs:
        legs[k] = np.array([xs * 0.12 * L, ymin + yf * L])
        warnings.append(f"{k} leg column not found; placed by proportion (set rig.landmarks.{k}_ankle)")

y_front = (legs["fl"][1] + legs["fr"][1]) / 2
y_back = (legs["bl"][1] + legs["br"][1]) / 2
_, z_front = slice_center(y_front)
_, z_back = slice_center(y_back)
lmk = {}
lmk["shoulder"] = (0.0, y_front, z_front + 0.05 * Hh)
lmk["hip"] = (0.0, y_back, z_back)
for name, f in (("spine_a", 0.25), ("spine_b", 0.5), ("spine_c", 0.75)):
    y = y_back + (y_front - y_back) * f
    x, z = slice_center(y)
    lmk[name] = (0.0, y, z)
ah, tf, kf = LM["ankleHeight"] * Hh, LM["toeForward"] * L, LM["kneeFraction"]
for k, (px, py) in legs.items():
    top_z = z_front if k[0] == "f" else z_back
    joint = np.array([px * 0.8, py, top_z])
    ankle = np.array([px, py, ah])
    knee = joint + (ankle - joint) * kf + np.array([0, 0.03 * L if k[0] == "f" else -0.03 * L, 0])
    lmk[f"{k}_joint"], lmk[f"{k}_knee"], lmk[f"{k}_ankle"] = tuple(joint), tuple(knee), tuple(ankle)
    lmk[f"{k}_toe"] = (px, py - tf, 0.02 * Hh)
head_reg = V[V[:, 1] < ymin + LM["headRegionFraction"] * L]
hi_reg = head_reg[head_reg[:, 2] > 0.3 * Hh] if (head_reg[:, 2] > 0.3 * Hh).any() else head_reg
sn = hi_reg[hi_reg[:, 1].argmin()]
cr = head_reg[head_reg[:, 2].argmax()]
lmk["snout"] = (0.0, float(sn[1]), float(sn[2]))
lmk["crown"] = (0.0, float(cr[1]), float(cr[2]))
lmk["head_base"] = (0.0, float(cr[1]) + 0.04 * L, float(cr[2]) - 0.14 * Hh)
# tail: follow the surface. Shortest path (Dijkstra over mesh edges) from the tail base to the
# geodesically farthest vertex behind the hips, skipping leg columns; curled tails stay on course.
lmk["tail_0"] = (0.0, y_back + 0.05 * L, z_back)
paws = np.array([legs[k] for k in ("fl", "fr", "bl", "br")])
near_leg = (np.min(np.linalg.norm(V[:, None, :2] - paws[None], axis=2), axis=1) < 0.07 * L) & (V[:, 2] < 0.35 * Hh)
region = (V[:, 1] > y_back - 0.1 * L) & (V[:, 2] < z_back + 0.1 * Hh) & ~near_leg
adj: dict = {}
for e in body.data.edges:
    a, b = e.vertices
    if region[a] and region[b]:
        d = float(np.linalg.norm(V[a] - V[b]))
        adj.setdefault(a, []).append((b, d))
        adj.setdefault(b, []).append((a, d))
tail_ok = False
if adj:
    import heapq
    cand = np.array(list(adj))
    start = int(cand[np.argmin(np.linalg.norm(V[cand] - np.array(lmk["tail_0"]), axis=1))])
    dist, prev, heap = {start: 0.0}, {}, [(0.0, start)]
    while heap:
        d0, u = heapq.heappop(heap)
        if d0 > dist.get(u, 1e9):
            continue
        for v, w in adj.get(u, []):
            if d0 + w < dist.get(v, 1e9):
                dist[v], prev[v] = d0 + w, u
                heapq.heappush(heap, (d0 + w, v))
    tip = max(dist, key=dist.get)
    path = [tip]
    while path[-1] in prev:
        path.append(prev[path[-1]])
    path = path[::-1]
    if dist[tip] > 0.2 * L and len(path) > 8:
        cum = np.array([dist[i] for i in path])
        for k, f in ((1, 0.25), (2, 0.5), (3, 0.75), (4, 1.0)):
            pv = V[path[int(np.searchsorted(cum, f * cum[-1]).clip(0, len(path) - 1))]]
            near = V[region & (np.linalg.norm(V - pv, axis=1) < 0.06 * L)]
            lmk[f"tail_{k}"] = tuple(near.mean(0) if len(near) else pv)
        tail_ok = True
if not tail_ok:
    warnings.append("tail path not found; tail bones placed by proportion (set rig.landmarks.tail_1..tail_4)")
    for i in range(1, 5):
        lmk[f"tail_{i}"] = (0.0, y_back + 0.05 * L + i * 0.06 * L, z_back * (1 - 0.15 * i))
bt = V[(np.abs(V[:, 1] - lmk["spine_b"][1]) < 0.05 * L)]
lmk["back_top"] = (0.0, lmk["spine_b"][1], float(np.quantile(bt[:, 2], 0.8)) if len(bt) else Hh)
for k, v in (P.get("landmarks") or {}).items():
    lmk[k] = tuple(v)

# ---------------------------------------------------------------- armature
arm_data = bpy.data.armatures.new("Rig")
arm = bpy.data.objects.new("Rig", arm_data)
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")


def resolve(ref: str) -> Vector:
    if ref == "ground":
        return Vector((0, 0, 0))
    if ref == "ground+up":
        return Vector((0, 0, 0.1 * Hh))
    base, _, mod = ref.partition("+")
    p = Vector(lmk[base])
    return p + {"": Vector(), "up": Vector((0, 0, 0.06 * Hh)), "fwd": Vector((0, -0.06 * L, 0))}[mod]


eb = arm_data.edit_bones
for b in T["bones"]:
    e = eb.new(b["name"])
    e.head, e.tail = resolve(b["head"]), resolve(b["tail"])
    if (e.tail - e.head).length < 1e-4:
        e.tail = e.head + Vector((0, 0, 0.02 * Hh))
    e.use_deform = b["deform"]
    vertical = abs((e.tail - e.head).normalized().z) > 0.7
    e.align_roll(Vector((0, -1, 0)) if vertical else Vector((0, 0, 1)))
for b in T["bones"]:
    if b["parent"]:
        e = eb[b["name"]]
        e.parent = eb[b["parent"]]
        e.use_connect = False
bpy.ops.object.mode_set(mode="OBJECT")
for spec_ik in T.get("ik", []):
    c = arm.pose.bones[spec_ik["bone"]].constraints.new("IK")
    c.target, c.subtarget, c.chain_count = arm, spec_ik["target"], spec_ik["chain"]
    c.use_tail = True

# ---------------------------------------------------------------- weights: voxel proxy -> mesh
empty, unweighted = riglib.transfer_weights(scene, body, arm, T["weights"]["proxyVoxelFraction"] * Hh, T["weights"]["maxInfluences"])
bpy.ops.wm.save_as_mainfile(filepath=out)

# ---------------------------------------------------------------- preview renders (PRD-5)
pv = riglib.Preview(scene, max(L, Hh), Vector((0, (ymin + ymax) / 2, Hh * 0.45)), prev_dir)
pv.add_markers(lmk, 0.018 * L, lambda n: (1.0, 0.1, 0.1, 1.0) if not n.startswith("tail") else (1.0, 0.8, 0.1, 1.0))
pb = arm.pose.bones
for b in pb:
    b.rotation_mode = "XYZ"


def pose(rot: dict, move: dict | None = None):
    for b in pb:
        b.rotation_euler = (0, 0, 0)
        b.location = (0, 0, 0)
    for name, r in rot.items():
        pb[name].rotation_euler = tuple(math.radians(a) for a in r)
    for name, d in (move or {}).items():  # world-space offsets for IK targets and the body
        pb[name].location = arm_data.bones[name].matrix_local.to_3x3().inverted() @ Vector(d)
    bpy.context.view_layer.update()


SIDE, THREE_Q = Vector((1, 0, 0.35)), Vector((0.8, -0.8, 0.6))
sl = 0.18 * L
shots = [("rest_landmarks_side", {}, {}, SIDE, True), ("rest_landmarks_3q", {}, {}, THREE_Q, True),
         ("stride", {}, {"ik_fl": (0, -sl, 0.06 * Hh), "ik_br": (0, -sl, 0.06 * Hh), "ik_fr": (0, sl, 0), "ik_bl": (0, sl, 0)}, SIDE, False),
         ("rear_up", {"pelvis": (40, 0, 0)}, {"ik_fl": (0, 0.1 * L, 0.45 * Hh), "ik_fr": (0, 0.1 * L, 0.45 * Hh)}, SIDE, False),
         ("head_turn_tail_sway", {"neck": (0, 0, 30), "head": (-15, 0, 10), "tail_01": (0, 0, 20), "tail_02": (0, 0, 20), "tail_03": (0, 0, 20)}, {}, THREE_Q, False)]
previews = []
for name, rot, move, view, show in shots:
    pose(rot, move)
    previews.append(pv.shot(name, view, show))
pose({})

print("RIG", json.dumps({"orient": how, "yawDeg": round(math.degrees(yaw), 1), "landmarks": {k: [round(float(c), 4) for c in v] for k, v in lmk.items()},
                         "proxyFallbackVerts": empty, "unweightedVerts": unweighted, "warnings": warnings,
                         "heightUnits": round(Hh, 4), "lengthUnits": round(L, 4), "bones": len(arm_data.bones), "previews": previews}))
