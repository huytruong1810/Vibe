"""animate: key every clip on the fitted rig with stepped interpolation (ART-9.2).

blender -b --factory-startup -P animate.py -- <rig.blend> <animate.blend> <params.json>
params: {"template": {...}, "clips": [{"name": "idle", "frames": 6, "facings": [...], "phases": {...},
         "playback": "loop", "segments": [...] (humans)}], "library": ual_library.blend (humans),
         "boneMapUal1": {...}, "libraries": {...}}
Creatures: parametric gaits (gaits.py, one clip set per skeleton template). Humans: UAL2/UAL1 actions retargeted (retarget.py).
Writes animate.blend with one action per clip (named exactly after the clip) and prints
"ANIMATE {json}" listing clip, action, frame numbers and facings for the bake stage.
Every pose bone is keyed on every frame, so switching actions never leaks a pose.
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, P = argv[0], argv[1], json.loads(open(argv[2]).read())
bpy.ops.wm.open_mainfile(filepath=src)
arm = bpy.data.objects["Rig"]
body = bpy.data.objects["Body"]
bones = arm.data.bones
height = max((body.matrix_world @ Vector(c)).z for c in body.bound_box)
ys = [(body.matrix_world @ Vector(c)).y for c in body.bound_box]
length = max(ys) - min(ys)
arm.animation_data_create()
made = []

if P["template"].get("kind") == "humanoid":
    import retarget  # noqa: E402

    rt = retarget.Retargeter(bpy.context.scene, arm, P["library"], P["libraries"], P["boneMapUal1"],
                             P["template"].get("pelvisTravelMaxH", 0.1))
    for clip in P["clips"]:
        act = rt.bake_clip(clip["name"], clip["segments"], clip["frames"], clip["playback"] in ("loop", "distance"))
        made.append({"name": clip["name"], "action": act.name, "frames": list(range(1, clip["frames"] + 1)),
                     "facings": clip["facings"], "canvas": clip.get("canvas")})
    for o in list(bpy.data.objects):  # keep only the target rig and mesh in the saved file
        if o.name.startswith(("UAL1", "UAL2")):
            bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        if a.name.endswith(("_Rig", "_Armature")):
            bpy.data.actions.remove(a)
else:
    import gaits  # noqa: E402

    ctx = gaits.Ctx(P["template"]["gait"], height, length, bones["pelvis"].head_local.z)
    pbs = arm.pose.bones
    for b in pbs:
        b.rotation_mode = "XYZ"
    rest_inv = {b.name: b.matrix_local.to_3x3().inverted() for b in bones}
    for clip in P["clips"]:
        fn = gaits.clips_for(P["template"])[clip["name"]]
        n = clip["frames"]
        poses = fn(ctx, n, clip["phases"]) if clip["name"] in gaits.PHASED else fn(ctx, n)
        if len(poses) != n:
            raise SystemExit(f"animate: {clip['name']} produced {len(poses)} poses, spec says {n}")
        act = bpy.data.actions.new(clip["name"])
        act.use_fake_user = True
        arm.animation_data.action = act
        for i, pose in enumerate(poses):
            for b in pbs:
                e = pose.get(b.name)
                b.rotation_euler = tuple(math.radians(a) for a in e["rot"]) if e else (0, 0, 0)
                b.location = rest_inv[b.name] @ Vector(e["move"]) if e else (0, 0, 0)
                b.keyframe_insert("location", frame=i + 1)
                b.keyframe_insert("rotation_euler", frame=i + 1)
        for fc in act.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "CONSTANT"
        made.append({"name": clip["name"], "action": act.name, "frames": list(range(1, n + 1)), "facings": clip["facings"],
                     "canvas": clip.get("canvas")})

arm.animation_data.action = bpy.data.actions[made[0]["action"]] if made else None
bpy.ops.wm.save_as_mainfile(filepath=out)
print("ANIMATE", json.dumps({"clips": made, "heightUnits": round(height, 4), "lengthUnits": round(length, 4)}))
