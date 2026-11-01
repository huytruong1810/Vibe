"""PRD-2 calibration proxy ONLY. No production asset or recipe uses this geometry.

blender -b --factory-startup -P fixture_item.py -- <fixture.blend>
"""
import json
import os
import sys

import bpy

output = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_cube_add(size=1)
body = bpy.context.object
body.name = "CalibrationOnly"
body.dimensions = (0.25, 0.1875, 0.5)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
attribute = body.data.color_attributes.new(name="Col", type="FLOAT_COLOR", domain="POINT")
repo = os.environ["FORGE_REPO"]
with open(os.path.join(repo, "art/source/forge/spec/palette.json")) as handle:
    palette = json.load(handle)
color = palette["ramps"]["wood"]["steps"]["mid"]
values = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in values]
for value in attribute.data:
    value.color = (*linear, 1)
bpy.ops.wm.save_as_mainfile(filepath=output)
print("FIXTURE item: calibration cuboid, not a game prop")
