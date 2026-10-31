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

for name, path in views.items():
    to_cam, u_axis = VIEW[name]
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]  # top-down
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

col = np.where(wsum[:, None] > 1e-6, acc / np.maximum(wsum, 1e-6)[:, None], fallback)
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
print("TEXTURE", json.dumps({"vertices": n, "covered": float((wsum > 1e-6).mean()), "views": sorted(views)}))
