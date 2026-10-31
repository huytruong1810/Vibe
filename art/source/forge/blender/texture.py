"""texture: project reference-sheet colours onto mesh vertices (colour attribute "Col").

blender -b --factory-startup -P texture.py -- <in.blend> <out.blend> <views.json>
views.json: {"front": "<path>_fill.png", "left": ..., "back": ..., "right": ...}
View conventions (model faces -Y): front = seen from -Y, image x -> +X; left = profile facing
screen-left, seen from +X, image x -> +Y; back = seen from +Y, image x -> -X; right = seen
from -X, image x -> -Y. Image y -> -Z in all views.
Each sheet view is aligned to the mesh's silhouette bbox in that view (uniform scale by height).
Colours come from the sheet, not from a generative texture model, so identity follows the
reference exactly (PRD-3.5); the palette mapping happens later in pixelize.
"""

import json
import sys

import bpy
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, views = argv[0], argv[1], json.loads(open(argv[2]).read())
mirror = views.pop("_mirrorSides", True)  # bilateral subjects: the left view also paints the right flank

bpy.ops.wm.open_mainfile(filepath=src)
obj = bpy.data.objects["Body"]
mesh = obj.data

VIEW = {
    "front": (Vector((0, -1, 0)), Vector((1, 0, 0))),
    "left": (Vector((1, 0, 0)), Vector((0, 1, 0))),
    "back": (Vector((0, 1, 0)), Vector((-1, 0, 0))),
    "right": (Vector((-1, 0, 0)), Vector((0, -1, 0))),
}

co = np.array([v.co[:] for v in mesh.vertices])
nrm = np.array([v.normal[:] for v in mesh.vertices])
n = len(co)
acc = np.zeros((n, 3))
wsum = np.zeros(n)
best = np.full(n, -1.0)
fallback = np.zeros((n, 3))

jobs = [(name, path, False) for name, path in views.items()]
if mirror and "left" in views and "right" not in views:
    jobs.append(("right", views["left"], True))  # mirrored left profile seen from -X
for name, path, flip in jobs:
    to_cam, u_axis = VIEW[name]
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # top-down
    if flip:
        px = px[:, ::-1]
    alpha = px[..., 3] > 0.5
    ys, xs = np.nonzero(alpha)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    u = co @ np.array(u_axis[:])
    z = co[:, 2]
    scale = (y1 - y0) / (z.max() - z.min())
    uc, xc = (u.min() + u.max()) / 2, (x0 + x1) / 2
    ix = np.clip(np.round(xc + (u - uc) * scale).astype(int), 0, w - 1)
    iy = np.clip(np.round(y1 - (z - z.min()) * scale).astype(int), 0, h - 1)
    sample = px[iy, ix, :3]
    facing = nrm @ np.array(to_cam[:])
    vis = np.zeros(n, dtype=bool)
    eps = 1e-4 * float(np.ptp(co, axis=0).max())
    for i in np.flatnonzero(facing > 0.05):
        origin = Vector(co[i]) + Vector(nrm[i]) * eps
        hit, *_ = obj.ray_cast(origin, to_cam)
        vis[i] = not hit
    wgt = np.where(vis, np.clip(facing, 0, None) ** 2, 0.0)
    acc += sample * wgt[:, None]
    wsum += wgt
    better = facing > best
    best = np.where(better, facing, best)
    fallback[better] = sample[better]
    bpy.data.images.remove(img)

# a vertex is coloured by a view only if some view sees it fairly head-on (facing >= ~0.35);
# grazing glances (the top of a back seen edge-on from the front) normalise to full strength
# and paint the wrong colour, so those vertices take their neighbours' colour instead
covered = wsum > 0.12
col = np.where(covered[:, None], acc / np.maximum(wsum, 1e-6)[:, None], 0.0)
# Surfaces no view sees (the top of a back, the underside) take colour from their seen
# neighbours across the mesh, ring by ring. The old fallback copied the nearest view's pixel at
# that height, which painted a front view's cream chest onto a creature's back (C3d).
edges = np.array([e.vertices[:] for e in mesh.edges])
known = covered.copy()
for _ in range(200):
    if known.all() or not len(edges):
        break
    a_, b_ = edges[:, 0], edges[:, 1]
    s_acc, s_cnt = np.zeros((n, 3)), np.zeros(n)
    for x_, y_ in ((a_, b_), (b_, a_)):
        m_ = known[y_] & ~known[x_]
        np.add.at(s_acc, x_[m_], col[y_[m_]])
        np.add.at(s_cnt, x_[m_], 1)
    grow = s_cnt > 0
    if not grow.any():
        break
    col[grow] = s_acc[grow] / s_cnt[grow][:, None]
    known |= grow
col = np.where(known[:, None], col, fallback)
# image pixels are sRGB-encoded; colour attributes are linear
col = np.where(col <= 0.04045, col / 12.92, ((col + 0.055) / 1.055) ** 2.4)
attr = mesh.color_attributes.get("Col") or mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
rgba = np.concatenate([col, np.ones((n, 1))], axis=1).astype(np.float32)
attr.data.foreach_set("color", rgba.ravel())
mesh.color_attributes.active_color = attr

mat = bpy.data.materials.get("Albedo") or bpy.data.materials.new("Albedo")
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()
a = nt.nodes.new("ShaderNodeVertexColor")
a.layer_name = "Col"
e = nt.nodes.new("ShaderNodeEmission")
o = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(a.outputs["Color"], e.inputs["Color"])
nt.links.new(e.outputs["Emission"], o.inputs["Surface"])
mesh.materials.clear()
mesh.materials.append(mat)

bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("TEXTURE", json.dumps({"vertices": n, "covered": float(covered.mean()), "views": sorted(name for name, _, _ in jobs)}))
