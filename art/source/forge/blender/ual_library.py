"""ual_library: import the vendored UAL1 and UAL2 GLBs once into a cached .blend (doctrine L6).

blender -b --factory-startup -P ual_library.py -- <ual2.glb> <ual1.glb> <out.blend>
The cache holds the UAL2 armature "UAL2" (with its "Mannequin" mesh), the UAL1 armature "UAL1"
and every action of both libraries (fake user, so none are dropped). Animate and the selftest
fixture load from it instead of re-importing the GLBs (about a minute each) on every run.
"""

import json
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
ual2, ual1, out = argv[0], argv[1], argv[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
counts = {}
for path, name in ((ual2, "UAL2"), (ual1, "UAL1")):
    before = set(bpy.data.objects)
    acts_before = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next(o for o in new if o.type == "ARMATURE")
    arm.name = name
    arm.data.name = name
    if arm.animation_data:
        arm.animation_data.action = None
        for t in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(t)
    for o in new:
        if o.type == "MESH" and o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o, do_unlink=True)
    acts = [a for a in bpy.data.actions if a not in acts_before]
    for a in acts:
        a.use_fake_user = True
    counts[name] = len(acts)
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("UALLIB", json.dumps({"actions": counts, "objects": [o.name for o in bpy.data.objects]}))
