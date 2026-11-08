"""Grey clay pose-guide views of a mesh (C27): one transparent PNG per view at one shared scale.

blender -b --factory-startup -P pose_guide.py -- <in.blend|in.glb> <out_dir> <view,view,...> [--size 1536]
    [--action NAME --frame F]   pose the armature with a clip frame first (an animate.blend source)
Views: front (the mesh faces -Y, toward the camera), left (left profile, head to the left of
the image), back. Workbench single-colour clay with studio light and cavity, so the guide
carries pose and volume but no colour or surface design. `forge.py pose-guide` lays the
views out on the concept template's canvas.
"""

import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out_dir, view_names = argv[0], argv[1], argv[2].split(",")
size = int(argv[argv.index("--size") + 1]) if "--size" in argv else 1536
action = argv[argv.index("--action") + 1] if "--action" in argv else None
frame = int(argv[argv.index("--frame") + 1]) if "--frame" in argv else 1
ROT = {"front": 0, "left": -90, "back": 180}  # same angles as preview.py

if src.endswith(".blend"):
    bpy.ops.wm.open_mainfile(filepath=src)
else:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)

scene = bpy.context.scene
for o in list(scene.objects):
    if o.type not in ("MESH", "ARMATURE"):
        o.hide_render = True
meshes = [o for o in scene.objects if o.type == "MESH" and not o.hide_render]
if not meshes:
    raise SystemExit("pose_guide: no mesh in " + src)
if action:
    for arm in (o for o in scene.objects if o.type == "ARMATURE"):
        arm.animation_data_create().action = bpy.data.actions[action]
    scene.frame_set(frame)
depsgraph = bpy.context.evaluated_depsgraph_get()
pts = [o.matrix_world @ v.co for o in meshes for v in o.evaluated_get(depsgraph).to_mesh().vertices]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
center, extent = (lo + hi) / 2, max(hi - lo)

scene.render.engine = "BLENDER_WORKBENCH"
shading = scene.display.shading
shading.light = "STUDIO"
shading.color_type = "SINGLE"
shading.single_color = (0.42, 0.42, 0.42)
shading.show_cavity = True
shading.cavity_type = "BOTH"
shading.show_object_outline = False
shading.show_specular_highlight = False
scene.render.film_transparent = True
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_x = scene.render.resolution_y = size
scene.render.resolution_percentage = 100
scene.display.render_aa = "32"

cam_data = bpy.data.cameras.new("cam")
cam_data.type = "ORTHO"
cam_data.ortho_scale = extent * 1.1  # one scale for every view
cam = bpy.data.objects.new("cam", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam.location = Vector((center.x, center.y - extent * 10, center.z))
cam.rotation_euler = (math.radians(90), 0, 0)
cam_data.clip_end = extent * 30

pivot = bpy.data.objects.new("pivot", None)
scene.collection.objects.link(pivot)
pivot.location = center
bpy.context.view_layer.update()  # matrix_world must include the pivot's location before parenting
for o in [o for o in scene.objects if o.parent is None and o.type in ("MESH", "ARMATURE")]:  # roots keep deformation
    world = o.matrix_world.copy()
    o.parent = pivot
    o.matrix_parent_inverse = pivot.matrix_world.inverted()
    o.matrix_world = world

for name in view_names:
    pivot.rotation_euler = (0, 0, math.radians(ROT[name]))
    bpy.context.view_layer.update()
    scene.render.filepath = f"{out_dir}/{name}.png"
    bpy.ops.render.render(write_still=True)
    print("POSEGUIDE", name, scene.render.filepath)
