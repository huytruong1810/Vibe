"""PRD-2 calibration proxies ONLY: primitive creature bodies for the template selftests. No species uses them.

blender -b --factory-startup -P fixture_creature.py -- <template> <out.glb>
template: winged | shelled | mushroom-biped. Builds the body plan from overlapping closed
primitives (the voxel weight proxy unions them), facing -Y, paints flat vertex colours per
part from palette ramp mid steps and exports a GLB that the normal `clean` stage ingests;
`fixture_mannequin.py finish` then names the colour attribute "Col".
"""
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

template, output = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
with open(os.path.join(os.environ["FORGE_REPO"], "art/source/forge/spec/palette.json")) as handle:
    RAMPS = json.load(handle)["ramps"]


def linear(ramp: str) -> tuple:
    h = RAMPS[ramp]["steps"]["mid"]
    vals = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return (*[x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in vals], 1.0)


parts: list = []  # (bmesh, ramp)


def ellipsoid(centre, radii, ramp, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=14, radius=1.0)
    m = Matrix.Translation(Vector(centre)) @ (rot or Matrix.Identity(4)) @ Matrix.Diagonal((*radii, 1.0))
    bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
    parts.append((bm, ramp))


def cylinder(base, top, radius, ramp):
    bm = bmesh.new()
    a, b = Vector(base), Vector(top)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=radius, radius2=radius, depth=(b - a).length)
    rot = Vector((0, 0, 1)).rotation_difference((b - a).normalized()).to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b) / 2) @ rot, verts=bm.verts)
    parts.append((bm, ramp))


if template == "winged":  # small moth/bird: span about twice the length
    ellipsoid((0, 0.05, 0.42), (0.24, 0.62, 0.24), "cream")
    ellipsoid((0, -0.62, 0.5), (0.2, 0.2, 0.2), "cream")
    ellipsoid((0, 0.72, 0.36), (0.14, 0.42, 0.13), "ochre")
    for s in (1, -1):
        ellipsoid((s * 0.95, 0.02, 0.46), (0.82, 0.42, 0.06), "sky", Matrix.Rotation(math.radians(-8 * s), 4, "Z"))
    for s in (1, -1):  # short legs under the body
        cylinder((s * 0.1, -0.1, 0.0), (s * 0.1, -0.1, 0.3), 0.05, "ochre")
elif template == "shelled":  # tortoise-like: domed shell over four stubby legs, no tail
    ellipsoid((0, 0.05, 0.5), (0.78, 1.0, 0.42), "basalt")
    ellipsoid((0, 0.05, 0.36), (0.72, 0.92, 0.18), "ochre")
    cylinder((0, -0.75, 0.38), (0, -1.08, 0.48), 0.15, "ochre")
    ellipsoid((0, -1.18, 0.5), (0.2, 0.24, 0.18), "ochre")
    for x, y in ((0.52, -0.55), (-0.52, -0.55), (0.52, 0.62), (-0.52, 0.62)):
        cylinder((x, y, 0.0), (x, y, 0.42), 0.15, "ochre")
elif template == "mushroom-biped":  # cap on a stem on two short legs
    ellipsoid((0, 0, 0.72), (0.34, 0.3, 0.4), "cream")
    ellipsoid((0, 0, 1.28), (0.78, 0.7, 0.34), "ember")
    for s in (1, -1):
        cylinder((s * 0.2, 0, 0.05), (s * 0.2, 0, 0.5), 0.11, "cream")
        ellipsoid((s * 0.2, -0.07, 0.06), (0.12, 0.19, 0.07), "cream")
else:
    raise SystemExit(f"fixture_creature: unknown template {template}")

mesh = bpy.data.meshes.new("Body")
bm = bmesh.new()
ramp_of = []
for part, ramp in parts:
    tmp = bpy.data.meshes.new("tmp")
    part.to_mesh(tmp)
    part.free()
    bm.from_mesh(tmp)
    ramp_of += [ramp] * (len(bm.verts) - len(ramp_of))
    bpy.data.meshes.remove(tmp)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(mesh)
bm.free()
col = mesh.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
for value, ramp in zip(col.data, ramp_of):
    value.color = linear(ramp)
body = bpy.data.objects.new("Body", mesh)
bpy.context.scene.collection.objects.link(body)
bpy.ops.export_scene.gltf(filepath=output, export_format="GLB", use_selection=False, export_vertex_color="ACTIVE",
                          export_all_vertex_colors=True, export_animations=False, export_skins=False)
print("FIXTURE", template, len(mesh.vertices), "calibration proxy, not a game creature")
