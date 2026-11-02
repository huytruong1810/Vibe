"""clean: gen3d mesh -> grounded, scaled, decimated single mesh saved as .blend.

blender -b --factory-startup -P clean.py -- <in.glb> <out.blend> <params.json>
params: {"heightArtPx": int, "canvas": [w, h], "anchor": [ax, ay], "artPxPerUnit": 32,
         "elevationDeg": 30, "targetFaces": 14000, "minIslandFraction": 0.004, "marginPx": 3}
heightArtPx is the tallest on-screen extent above the anchor across all facings.
The model faces -Y (south) after import, which is the forge convention (spec facings: s = 0 deg).
"""

import json
import math
import sys

import bmesh
import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, params = argv[0], argv[1], json.loads(open(argv[2]).read())

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
if not meshes:
    raise SystemExit("clean: no mesh in gen3d output")
for o in bpy.context.scene.objects:
    o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(bpy.context.scene.objects):
    if o is not obj:
        bpy.data.objects.remove(o, do_unlink=True)
obj.name = "Body"
obj.data.name = "Body"
obj.data.materials.clear()

# merge, drop tiny floating islands, recalc normals
bm = bmesh.new()
bm.from_mesh(obj.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bm.verts.ensure_lookup_table()
seen, islands = set(), []
for v in bm.verts:
    if v.index in seen:
        continue
    stack, isl = [v], []
    seen.add(v.index)
    while stack:
        cur = stack.pop()
        isl.append(cur)
        for e in cur.link_edges:
            w = e.other_vert(cur)
            if w.index not in seen:
                seen.add(w.index)
                stack.append(w)
    islands.append(isl)
total = len(bm.verts)
drop = [v for isl in islands if len(isl) < params.get("minIslandFraction", 0.004) * total for v in isl]
bmesh.ops.delete(bm, geom=drop, context="VERTS")
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(obj.data)
bm.free()

# decimate to the target face budget (pixel output never needs more)
faces = len(obj.data.polygons)
target = params.get("targetFaces", 14000)
if faces > target:
    mod = obj.modifiers.new("dec", "DECIMATE")
    mod.ratio = target / faces
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)

# ground and centre: feet on z=0, footprint centred on x/y = 0
co = [obj.matrix_world @ v.co for v in obj.data.vertices]
minz = min(c.z for c in co)
low = [c for c in co if c.z < minz + 0.03 * (max(c.z for c in co) - minz)]
cx = (min(c.x for c in low) + max(c.x for c in low)) / 2
cy = (min(c.y for c in low) + max(c.y for c in low)) / 2
obj.location -= Vector((cx, cy, minz))
bpy.ops.object.transform_apply(location=True)

# scale so the silhouette fits the canvas in every facing at the spec camera (ART-6.1, L2):
# screen-up offset of a vertex = z*cos(e) + y'*sin(e) (depth toward north rises on screen)
e = math.radians(params.get("elevationDeg", 30))
ppu = params.get("artPxPerUnit", 32)
cw, ch = params["canvas"]
ax, ay = params["anchor"]
margin = params.get("marginPx", 3)
top = bottom = half_w = 0.0
for deg in range(0, 360, 45):
    r = math.radians(deg)
    for v in obj.data.vertices:
        x = v.co.x * math.cos(r) - v.co.y * math.sin(r)
        y = v.co.x * math.sin(r) + v.co.y * math.cos(r)
        up = v.co.z * math.cos(e) + y * math.sin(e)
        top, bottom = max(top, up), min(bottom, up)
        half_w = max(half_w, abs(x))
limits = [params["heightArtPx"] / ppu / top,
          (ay - margin) / ppu / top,
          (ch - ay - margin) / ppu / max(-bottom, 1e-6),
          (min(ax, cw - ax) - margin) / ppu / half_w]
s = min(limits)
obj.scale = (s, s, s)
bpy.ops.object.transform_apply(scale=True)
for p in obj.data.polygons:
    p.use_smooth = True

bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
dims = obj.dimensions
print("CLEAN", json.dumps({"faces": len(obj.data.polygons), "vertices": len(obj.data.vertices),
                           "dimensions": [round(d, 4) for d in dims], "droppedIslandVerts": len(drop), "fitLimit": limits.index(min(limits))}))
