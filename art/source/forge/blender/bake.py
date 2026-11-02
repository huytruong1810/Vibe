"""bake: render exact per-pixel passes for every facing/frame at art-pixel resolution.

blender -b --factory-startup -P bake.py -- <in.blend> <out_dir> <params.json>
params: {"canvas": [w, h], "anchor": [ax, ay], "artPxPerUnit": 32, "elevationDeg": 30,
         "facings": {"s": 0, ...}, "clips": [{"name": "idle", "action": "Idle" | null,
         "frames": [1, 5, ...], "facings": ["n", "e", ...]}], "sockets": ["Socket_Head", ...]}
Writes <out_dir>/<clip>/<facing>_<i>_{albedo,normal,depth}.png (16-bit, raw/linear) and
<out_dir>/tracks.json with projected root/socket positions in art pixels (doctrine L2, L4, ART-2).
One sample at the pixel centre with a 0.01 px filter: no anti-aliasing, fully deterministic.
"""

import json
import math
import os
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
src, out_dir, P = argv[0], argv[1], json.loads(open(argv[2]).read())
W, H = P["canvas"]
AX, AY = P["anchor"]
DEPTH_RANGE = 4.0  # world units either side of the camera focus mapped into [0, 1]
CAM_DIST = 20.0

bpy.ops.wm.open_mainfile(filepath=src)
scene = bpy.context.scene

# --- render settings -------------------------------------------------------------------
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.samples = 1
cy.use_adaptive_sampling = False
cy.use_denoising = False
cy.seed = 0
cy.pixel_filter_type = "BOX"
cy.filter_width = 0.01
cy.max_bounces = 0
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.use_persistent_data = True
scene.view_settings.view_transform = "Raw"
scene.view_settings.look = "None"
scene.display_settings.display_device = "sRGB"
try:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            if any(d.type == backend for d in prefs.devices):
                for d in prefs.devices:
                    d.use = d.type == backend
                cy.device = "GPU"
                break
        except TypeError:
            continue
except Exception:
    cy.device = "CPU"

# --- camera (L2): ortho, 30 deg elevation, looking north, root at the anchor pixel -------
elev = math.radians(P.get("elevationDeg", 30))
cam_data = bpy.data.cameras.new("ForgeCam")
cam_data.type = "ORTHO"
cam_data.sensor_fit = "AUTO"
cam_data.clip_start, cam_data.clip_end = 0.1, 100


def set_canvas(size, anchor):
    """Resolution and camera shift so the root lands on the anchor pixel of this canvas."""
    global W, H, AX, AY
    W, H = size
    AX, AY = anchor
    scene.render.resolution_x, scene.render.resolution_y = W, H
    maxdim = max(W, H)
    cam_data.ortho_scale = maxdim / P.get("artPxPerUnit", 32)
    cam_data.shift_x = -(AX - W / 2) / maxdim
    cam_data.shift_y = (AY - H / 2) / maxdim


set_canvas(P["canvas"], P["anchor"])
cam = bpy.data.objects.new("ForgeCam", cam_data)
scene.collection.objects.link(cam)
view_dir = Vector((0, math.cos(elev), -math.sin(elev)))
cam.location = -view_dir * CAM_DIST
cam.rotation_euler = (math.pi / 2 - elev, 0, 0)
scene.camera = cam

# --- AOV materials ---------------------------------------------------------------------
vl = scene.view_layers[0]
for name, kind in (("albedo", "COLOR"), ("normal", "COLOR"), ("depth", "VALUE")):
    if name not in vl.aovs:
        a = vl.aovs.add()
        a.name, a.type = name, kind
vl.use_pass_combined = True


def aov_material(src_mat):
    m = bpy.data.materials.new(f"AOV_{src_mat.name if src_mat else 'none'}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(emit.outputs[0], out.inputs["Surface"])
    vcol = nt.nodes.new("ShaderNodeVertexColor")
    vcol.layer_name = "Col"
    a_alb = nt.nodes.new("ShaderNodeOutputAOV")
    a_alb.aov_name = "albedo"
    nt.links.new(vcol.outputs["Color"], a_alb.inputs["Color"])
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    enc = nt.nodes.new("ShaderNodeVectorMath")
    enc.operation = "MULTIPLY_ADD"
    enc.inputs[1].default_value = (0.5, 0.5, 0.5)
    enc.inputs[2].default_value = (0.5, 0.5, 0.5)
    nt.links.new(geo.outputs["Normal"], enc.inputs[0])
    a_n = nt.nodes.new("ShaderNodeOutputAOV")
    a_n.aov_name = "normal"
    nt.links.new(enc.outputs[0], a_n.inputs["Color"])
    camd = nt.nodes.new("ShaderNodeCameraData")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = CAM_DIST - DEPTH_RANGE
    mr.inputs["From Max"].default_value = CAM_DIST + DEPTH_RANGE
    nt.links.new(camd.outputs["View Z Depth"], mr.inputs["Value"])
    a_d = nt.nodes.new("ShaderNodeOutputAOV")
    a_d.aov_name = "depth"
    nt.links.new(mr.outputs["Result"], a_d.inputs["Value"])
    return m


meshes = [o for o in scene.objects if o.type == "MESH"]
if P.get("itemPoses") and (not meshes or any(not o.data.color_attributes.get("Col") for o in meshes)):
    raise SystemExit("Item source needs a separate textured mesh with its Col vertex-color attribute")
for o in meshes:
    mats = list(o.data.materials) or [None]
    o.data.materials.clear()
    for m in mats:
        o.data.materials.append(aov_material(m))

# --- compositor: write each pass as 16-bit PNG with alpha ------------------------------
scene.use_nodes = True
ct = scene.node_tree
ct.nodes.clear()
rl = ct.nodes.new("CompositorNodeRLayers")
fo = ct.nodes.new("CompositorNodeOutputFile")
fo.format.file_format = "PNG"
fo.format.color_depth = "16"
fo.format.color_mode = "RGBA"
fo.file_slots.clear()
for name in ("albedo", "normal", "depth"):
    sa = ct.nodes.new("CompositorNodeSetAlpha")
    sa.mode = "REPLACE_ALPHA"
    ct.links.new(rl.outputs[name], sa.inputs["Image"])
    ct.links.new(rl.outputs["Alpha"], sa.inputs["Alpha"])
    fo.file_slots.new(name)
    ct.links.new(sa.outputs[0], fo.inputs[name])

# --- turntable root: rotate the whole model, keep camera and light fixed ---------------
pivot = bpy.data.objects.new("ForgePivot", None)
scene.collection.objects.link(pivot)
roots = [o for o in scene.objects if o.parent is None and o not in (cam, pivot)]
for o in roots:
    o.parent = pivot
arm = next((o for o in scene.objects if o.type == "ARMATURE"), None)
if P.get("itemPoses") and arm:
    raise SystemExit("Item rendering requires a separate static prop mesh, not an actor armature")

tracks = {"canvas": [W, H], "anchor": [AX, AY], "clips": {}, "canvases": {}}
for clip in P["clips"]:
    cv = clip.get("canvas") or {"size": P["canvas"], "anchor": P["anchor"]}
    set_canvas(cv["size"], cv["anchor"])
    tracks["canvases"][clip["name"]] = {"size": list(cv["size"]), "anchor": list(cv["anchor"])}
    if arm and clip.get("action"):
        arm.animation_data_create()
        arm.animation_data.action = bpy.data.actions[clip["action"]]
    ctrack = tracks["clips"].setdefault(clip["name"], {})
    wanted = clip.get("facings") or list(P["facings"])  # 4-facing clips render cardinals only
    for facing, deg in ((f, d) for f, d in P["facings"].items() if f in wanted):
        item_pose = P.get("itemPoses", {}).get(f"{clip['name']}/{facing}")
        if "itemPoses" in P and item_pose is None:
            raise SystemExit(f"Missing declared item pose: {clip['name']}/{facing}")
        if item_pose:
            rotation = item_pose["rotation"]
            translation = item_pose["translation"]
            k = item_pose.get("scale", 1.0)  # inventory icon only; held poses stay rigid
            pivot.matrix_world = Matrix([[k * v for v in row] + [translation[i]] for i, row in enumerate(rotation)] + [[0, 0, 0, 1]])
        else:
            pivot.rotation_euler = (0, 0, math.radians(deg))
        ftrack = ctrack.setdefault(facing, [])
        for i, frame in enumerate(clip.get("frames") or [scene.frame_current]):
            scene.frame_set(frame)
            base = os.path.join(out_dir, clip["name"], f"{facing}_{i}_")
            fo.base_path = os.path.join(out_dir, clip["name"])
            for slot, name in zip(fo.file_slots, ("albedo", "normal", "depth")):
                slot.path = f"{facing}_{i}_{name}_"
            bpy.ops.render.render(write_still=False)

            def px(world):
                c = world_to_camera_view(scene, cam, world)
                return [round(c.x * W, 3), round((1 - c.y) * H, 3)]

            entry = {"frame": frame, "root": px(Vector((0, 0, 0)))}
            if item_pose:
                entry["root"] = px(pivot.matrix_world @ Vector(item_pose["sourcePivot"]))
            if item_pose and item_pose["view"] == "held":
                entry[P["itemSocket"]] = entry["root"]
                if "supportGrip" in item_pose:
                    entry["SupportGrip"] = px(Vector(item_pose["supportGrip"]))
            if arm:
                for b in P.get("sockets", []):
                    pb = arm.pose.bones.get(b)
                    if pb:
                        entry[b] = px(arm.matrix_world @ pb.head)
            ftrack.append(entry)

# Blender appends the frame number to file-output names; normalise them.
for clip in P["clips"]:
    d = os.path.join(out_dir, clip["name"])
    for f in os.listdir(d):
        stem, ext = os.path.splitext(f)
        if stem[-4:].isdigit() and stem[-5] == "_":
            os.replace(os.path.join(d, f), os.path.join(d, stem[:-5] + ext))
with open(os.path.join(out_dir, "tracks.json"), "w") as f:
    json.dump(tracks, f, indent=1)
print("BAKE", json.dumps({"clips": [c["name"] for c in P["clips"]], "device": cy.device}))
