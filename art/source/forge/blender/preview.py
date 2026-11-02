"""Render a 4-view preview sheet (front, left, back, three-quarter) of a mesh file.

blender -b --factory-startup -P preview.py -- <in.glb|in.blend> <out.png> [--size 384]
Used after gen3d/clean/rig so the operator can look at the result (doctrine PRD-5).
"""

import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
size = int(argv[argv.index("--size") + 1]) if "--size" in argv else 384

if src.endswith(".blend"):
    bpy.ops.wm.open_mainfile(filepath=src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)

scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == "MESH"]
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
center, extent = (lo + hi) / 2, max(hi - lo)

scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "FLAT" if any(o.data.color_attributes for o in meshes) else "STUDIO"
scene.display.shading.color_type = "VERTEX" if any(o.data.color_attributes for o in meshes) else "OBJECT"
scene.display.shading.show_cavity = True
scene.render.film_transparent = False
scene.world = bpy.data.worlds.new("w") if scene.world is None else scene.world
scene.render.resolution_x, scene.render.resolution_y = size * 4, size
cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = extent * 1.15 * 4
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam

# Lay out 4 copies side by side by rotating instances in a row.
views = [0, -90, 180, -45]  # front (-Y), left profile, back, three-quarter
for o in meshes:
    o.select_set(False)
groups = []
for i, rot in enumerate(views):
    empty = bpy.data.objects.new(f"view{i}", None)
    scene.collection.objects.link(empty)
    empty.location = Vector(((i - 1.5) * extent * 1.15, 0, 0))
    empty.rotation_euler = (0, 0, math.radians(rot))
    for o in meshes:
        dup = o.copy()
        dup.data = o.data
        scene.collection.objects.link(dup)
        dup.parent = empty
        dup.matrix_parent_inverse.identity()
        dup.location = o.location - center
    groups.append(empty)
for o in meshes:
    o.hide_render = True
cam.location = Vector((0, -extent * 10, 0))
cam.rotation_euler = (math.radians(90), 0, 0)
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print("PREVIEW", out)
