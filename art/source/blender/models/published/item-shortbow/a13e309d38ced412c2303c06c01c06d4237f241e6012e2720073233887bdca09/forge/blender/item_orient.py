"""orient (items): textured gen3d prop -> canonical held-item source model.

blender -b --factory-startup -P item_orient.py -- <texture.blend> <out.blend> <params.json>
params: {"lengthArtPx": float, "artPxPerUnit": 32, "gripFraction": 0.15, "flipHead": bool,
         "flipForward": bool, "maxReachArtPx": float, "minFeaturePx": 2 (ART-6.3), "inflate": "all"|"thin"}
Applies the transform from forgelib/item_orient.py to the mesh data (rigid + uniform
scale, never mirrored), keeps the "Col" vertex colours from texture, and prints
ITEM_ORIENT {...} with the grip (origin) and icon pivot for the item recipe.
"""

import json
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib.item_orient import icon_scale, inflate, inflation_offsets, orient  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, params = argv[0], argv[1], json.loads(open(argv[2]).read())

bpy.ops.wm.open_mainfile(filepath=src)
obj = bpy.data.objects["Body"]
if not obj.data.color_attributes.get("Col"):
    raise SystemExit("orient: texture stage output lacks the Col colour attribute")
co = np.array([obj.matrix_world @ v.co for v in obj.data.vertices])
result = orient(co, params["lengthArtPx"], params["artPxPerUnit"],
                grip_fraction=params.get("gripFraction", 0.15), flip_head=params.get("flipHead", False),
                flip_forward=params.get("flipForward", False), max_reach_art_px=params.get("maxReachArtPx"))
obj.data.transform(Matrix(result["matrix"]) @ obj.matrix_world)
obj.matrix_world = Matrix.Identity(4)
# ART-6.3: thin features thicken in the model. Offset every vertex along its normal so
# the haft clears the minimum width; the blade and head grow by the same small offset.
offsets = inflation_offsets(result["dimensions"], params.get("minFeaturePx", 2), params["artPxPerUnit"],
                            params.get("inflate", "all"), result["haftWidthArtPx"])
if any(o > 0 for o in offsets):
    obj.data.update()
    verts = obj.data.vertices
    moved = inflate(np.array([v.co for v in verts]), np.array([v.normal for v in verts]), offsets)
    for v, co in zip(verts, moved):
        v.co = co
d = max(offsets)
result["inflateArtPx"] = round(d * params["artPxPerUnit"], 3)
depth_px = result["dimensions"][1] * params["artPxPerUnit"] + 2 * offsets[1] * params["artPxPerUnit"]
result["iconScale"] = icon_scale(result["lengthArtPx"] + 2 * offsets[2] * params["artPxPerUnit"], depth_px,
                                 params["iconSizePx"], params["marginPx"])
obj.name = obj.data.name = "Item"
for o in list(bpy.data.objects):
    if o is not obj:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("ITEM_ORIENT", json.dumps(result))
