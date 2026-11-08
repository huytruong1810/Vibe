"""PRD-2 calibration proxy ONLY: a box with a prism roof. No production asset uses it.

blender -b --factory-startup -P fixture_env.py -- <texture.blend>
Writes the object "Body" with a Col attribute (walls timber, roof teal), as the texture
stage would, so selftest can run layout -> bake -> pixelize -> qa.
"""
import json
import os
import sys

import bmesh
import bpy

output = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
mesh = bpy.data.meshes.new("Body")
bm = bmesh.new()
w, d, h, r = 1.8, 1.8, 1.0, 0.75  # walls w x d x h, roof ridge height above the eaves
v = [bm.verts.new(p) for p in [(-w/2, -d/2, 0), (w/2, -d/2, 0), (w/2, d/2, 0), (-w/2, d/2, 0),
                                (-w/2, -d/2, h), (w/2, -d/2, h), (w/2, d/2, h), (-w/2, d/2, h)]]
for f in [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]:
    bm.faces.new([v[i] for i in f])
e = 0.15  # eaves overhang
rv = [bm.verts.new(p) for p in [(-w/2 - e, -d/2 - e, h), (w/2 + e, -d/2 - e, h), (w/2 + e, d/2 + e, h),
                                 (-w/2 - e, d/2 + e, h), (-w/2 - e, 0, h + r), (w/2 + e, 0, h + r)]]
for f in [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]:
    bm.faces.new([rv[i] for i in f])
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=6, use_grid_fill=True)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(mesh)
bm.free()
body = bpy.data.objects.new("Body", mesh)
bpy.context.scene.collection.objects.link(body)
with open(os.path.join(os.environ["FORGE_REPO"], "art/source/forge/spec/palette.json")) as handle:
    ramps = json.load(handle)["ramps"]


def linear(hexcolor):
    vals = [int(hexcolor[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in vals]


wall, roof = linear(ramps["timber"]["steps"]["mid"]), linear(ramps["teal"]["steps"]["mid"])
col = mesh.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="POINT")
for vert, value in zip(mesh.vertices, col.data):
    value.color = (*(roof if vert.co.z > h + 1e-4 else wall), 1)
bpy.ops.wm.save_as_mainfile(filepath=output)
print("FIXTURE environment: calibration house, not a game building")
