"""fixture_mannequin: the forge selftest's human fixture, built from the vendored UAL2 mannequin.

blender -b --factory-startup -P fixture_mannequin.py -- glb <ual_library.blend> <out.glb>
    A-pose the UAL2 "Mannequin" (arms 45 deg down, PRD-3.1) at doctrine proportions (L3: bigger head,
    shorter limbs), bake the pose into the mesh, paint flat
    vertex colours by body region and export a GLB that the normal `clean` stage ingests.
blender -b --factory-startup -P fixture_mannequin.py -- finish <clean.blend> <texture.blend>
    Name the colour attribute "Col" so the cleaned fixture stands in for the `texture` stage.
This is a test fixture for the forge, never game art.
"""

import math
import sys

import bpy
from mathutils import Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
mode = argv[0]

if mode == "finish":
    bpy.ops.wm.open_mainfile(filepath=argv[1])
    body = bpy.data.objects["Body"]
    attrs = body.data.color_attributes
    if not attrs:
        raise SystemExit("fixture: cleaned mesh lost its colours")
    attrs[0].name = "Col"
    attrs.active_color = attrs[0]
    bpy.ops.wm.save_as_mainfile(filepath=argv[2], compress=True)
    print("FIXTURE finish", attrs[0].name, len(body.data.vertices))
    raise SystemExit(0)

bpy.ops.wm.open_mainfile(filepath=argv[1])
arm = bpy.data.objects["UAL2"]
mesh = next(o for o in bpy.data.objects if o.type == "MESH" and o.parent is arm)
for o in list(bpy.data.objects):
    if o not in (arm, mesh):
        bpy.data.objects.remove(o, do_unlink=True)
arm.animation_data_create()
arm.animation_data.action = None
for pb in arm.pose.bones:
    pb.matrix_basis = Matrix.Identity(4)
bpy.context.view_layer.update()
for side, sign in (("l", 1), ("r", -1)):
    pb = arm.pose.bones[f"upperarm_{side}"]
    rest = arm.matrix_world @ pb.bone.matrix_local
    rot = Matrix.Rotation(math.radians(45 * sign), 4, "Y")  # +X arm down for left, -X arm down for right
    head = rest.to_translation()
    world = Matrix.Translation(head) @ rot @ Matrix.Translation(-head) @ rest
    pb.matrix = arm.matrix_world.inverted() @ world
    bpy.context.view_layer.update()

# doctrine proportions (L3: 4.5-5 heads): a bigger head, shorter arms and legs than the realistic mannequin
for name, k in (("Head", 1.9), ("upperarm_l", 0.8), ("upperarm_r", 0.8), ("thigh_l", 0.8), ("thigh_r", 0.8)):
    arm.pose.bones[name].scale = (k, k, k)
bpy.context.view_layer.update()

dg = bpy.context.evaluated_depsgraph_get()
baked = bpy.data.meshes.new_from_object(mesh.evaluated_get(dg))
baked.transform(mesh.matrix_world)
body = bpy.data.objects.new("Body", baked)
bpy.context.scene.collection.objects.link(body)
bpy.data.objects.remove(mesh, do_unlink=True)
bpy.data.objects.remove(arm, do_unlink=True)

zs = [v.co.z for v in baked.vertices]
lo, hi = min(zs), max(zs)
H = hi - lo
col = baked.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
SKIN, SHIRT, PANTS, SHOES, HAIR = (0.86, 0.66, 0.52, 1), (0.18, 0.52, 0.56, 1), (0.36, 0.27, 0.2, 1), (0.15, 0.12, 0.1, 1), (0.1, 0.35, 0.38, 1)
for v, c in zip(baked.vertices, col.data):
    t = (v.co.z - lo) / H
    if t > 0.93:
        c.color = HAIR
    elif t > 0.83:
        c.color = SKIN
    elif abs(v.co.x) > 0.2 * H * 0.6 and t > 0.4:
        c.color = SKIN  # forearms and hands outside the torso
    elif t > 0.48:
        c.color = SHIRT
    elif t > 0.05:
        c.color = PANTS
    else:
        c.color = SHOES
bpy.ops.export_scene.gltf(filepath=argv[2], export_format="GLB", use_selection=False, export_vertex_color="ACTIVE",
                          export_all_vertex_colors=True, export_animations=False, export_skins=False)
print("FIXTURE glb", len(baked.vertices), round(H, 3))
