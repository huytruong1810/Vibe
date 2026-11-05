"""layout (environment, C10): textured model -> footprint-scaled base and roof/canopy layers.

blender -b --factory-startup -P env_layout.py -- <texture.blend> <out_dir> <params.json>
params: {"footprint": [w, d] (tiles), "split": {"layer": "roof"|"canopy", "aboveFraction": 0.55} | null,
         "artPxPerUnit": 32, "elevationDeg": 30, "depthStretch": 2.0, "marginPx": 2, "widthMultipleOf": 32}
1 tile = 1 world unit (32 art px). The model is scaled uniformly so its ground contact is
footprint[0] tiles wide, grounded at z = 0 and centred on the footprint; the footprint's
south edge centre is the anchor (render_spec canvases.environment). Faces whose centre lies
above aboveFraction of the height go to the top layer (ART-11.1). Prints ENV_LAYOUT {...}
with the measured contact depth (QA compares it with footprint[1], ART-11.4) and the canvas.
"""

import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix

argv = sys.argv[sys.argv.index("--") + 1:]
src, out_dir, P = argv[0], Path(argv[1]), json.loads(open(argv[2]).read())

bpy.ops.wm.open_mainfile(filepath=src)
obj = bpy.data.objects["Body"]
if not obj.data.color_attributes.get("Col"):
    raise SystemExit("layout: texture stage output lacks the Col colour attribute")
co = np.array([obj.matrix_world @ v.co for v in obj.data.vertices])
zmin, zmax = co[:, 2].min(), co[:, 2].max()
contact = co[co[:, 2] < zmin + 0.04 * (zmax - zmin)]
cx = (contact[:, 0].min() + contact[:, 0].max()) / 2
cy = (contact[:, 1].min() + contact[:, 1].max()) / 2
fw, fd = P["footprint"]
s = fw / max(contact[:, 0].max() - contact[:, 0].min(), 1e-6)
m = Matrix.Diagonal((s, s, s, 1)) @ Matrix.Translation((-cx, -cy, -zmin))
obj.data.transform(m @ obj.matrix_world)
obj.matrix_world = Matrix.Identity(4)
obj.data.update()
co = np.array([v.co[:] for v in obj.data.vertices])
height = float(co[:, 2].max())
low = co[co[:, 2] < 0.04 * height]
contact_depth = float(low[:, 1].max() - low[:, 1].min())

# canvas: screen-up of a vertex is z*cos(e) + (stretch*y)*sin(e); right is x
e, k, ppu = math.radians(P["elevationDeg"]), P["depthStretch"], P["artPxPerUnit"]
up = co[:, 2] * math.cos(e) + k * co[:, 1] * math.sin(e)
root_up = k * (-fd / 2) * math.sin(e)
margin, mult = P["marginPx"], P["widthMultipleOf"]
half = max(abs(co[:, 0]).max() * ppu, fw * ppu / 2) + margin + 1
width = int(math.ceil(2 * half / mult) * mult)
top, bottom = max(up.max(), root_up) * ppu, min(up.min(), root_up) * ppu
height_px = int(math.ceil(top - bottom + 2 * margin + 2))
height_px += height_px % 2
anchor = [width // 2, int(round(margin + 1 + top - root_up * ppu))]

split = P.get("split")
layers = {"base": None}
if split:
    cut = split["aboveFraction"] * height
    layers[split["layer"]] = cut
    layers["base"] = cut


def save_layer(name: str, keep_above: float | None, keep_below: float | None) -> int:
    bpy.ops.wm.open_mainfile(filepath=str(out_dir / "layout_full.blend"))
    o = bpy.data.objects["Body"]
    bm = bmesh.new()
    bm.from_mesh(o.data)
    drop = [f for f in bm.faces
            if (keep_above is not None and f.calc_center_median().z <= keep_above)
            or (keep_below is not None and f.calc_center_median().z > keep_below)]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bm.to_mesh(o.data)
    count = len(bm.faces)
    bm.free()
    bpy.ops.wm.save_as_mainfile(filepath=str(out_dir / f"{name}.blend"), compress=True)
    return count


out_dir.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out_dir / "layout_full.blend"), compress=True)
faces = {"base": save_layer("base", None, layers["base"])}
if split:
    faces[split["layer"]] = save_layer(split["layer"], layers[split["layer"]], None)
print("ENV_LAYOUT", json.dumps({
    "scale": round(s, 6), "heightUnits": round(height, 4), "contactDepthTiles": round(contact_depth, 3),
    "footprint": [fw, fd], "canvas": {"size": [width, height_px], "anchor": anchor},
    "rootPivot": [0.0, -fd / 2, 0.0], "layers": list(faces), "faces": faces}))
