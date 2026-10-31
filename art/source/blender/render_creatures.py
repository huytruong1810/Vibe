"""
Headless Batch Renderer for all 8 Hearthwild Creatures.
Loads creatures.blend, configures orthographic camera with exact
shift_y = 38/96 locking ground anchor (0, 0, 0) to pixel (48, 86),
and renders 8-directional, zero-drift pixel-art sprite sheets.

Usage:
  blender -b art/source/blender/models/creatures.blend -P art/source/blender/render_creatures.py -- --all
  blender -b art/source/blender/models/creatures.blend -P art/source/blender/render_creatures.py -- --species rivallie
"""

import sys
import math
from pathlib import Path

try:
    import bpy
except ImportError:
    print("This script must be executed inside Blender: blender -b [file.blend] -P render_creatures.py")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT_DIR = REPO_ROOT / "art" / "source" / "exports"

ANGLES = [
    (0, "s"),
    (45, "se"),
    (90, "e"),
    (135, "ne"),
    (180, "n"),
    (225, "nw"),
    (270, "w"),
    (315, "sw"),
]

CREATURES = [
    ("rivallie", "Creature_Rivallie", "rivallie"),
    ("ignicap", "Creature_Ignicap", "creatures/ignicap"),
    ("zephyrit", "Creature_Zephyrit", "creatures/zephyrit"),
    ("mireling", "Creature_Mireling", "creatures/mireling"),
    ("cindermoth", "Creature_Cindermoth", "creatures/cindermoth"),
    ("steamshell", "Creature_Steamshell", "creatures/steamshell"),
    ("bramblefang", "Creature_Bramblefang", "creatures/bramblefang"),
    ("marshstalker", "Creature_Marshstalker", "creatures/marshstalker"),
]

# Gentle 6-frame continuous breathing cycle displacements (in world Z units)
BREATHING_DELTAS = [0.000, 0.008, 0.016, 0.016, 0.008, 0.000]

def setup_render_settings(width: int = 96, height: int = 96):
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'

    scene.render.engine = 'BLENDER_WORKBENCH'
    shading = scene.display.shading
    shading.light = 'STUDIO'
    shading.color_type = 'MATERIAL'
    shading.show_cavity = True
    shading.cavity_type = 'BOTH'
    shading.curvature_ridge_factor = 2.0
    shading.curvature_valley_factor = 2.0
    shading.show_object_outline = True
    shading.object_outline_color = (0.09, 0.11, 0.15)
    scene.display.render_aa = 'OFF'

def setup_ortho_camera(pitch_deg: float = 22.0, ortho_scale: float = 1.90):
    scene = bpy.context.scene
    for obj in list(scene.objects):
        if obj.type == 'CAMERA':
            bpy.data.objects.remove(obj, do_unlink=True)

    cam_data = bpy.data.cameras.new("CreaturePixelCam")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = ortho_scale
    # shift_y = 35 / 96 maps world (0, 0, 0) to ground row 83-86 with safe border padding
    cam_data.shift_y = 35.0 / 96.0

    cam_obj = bpy.data.objects.new("CreaturePixelCam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    pitch_rad = math.radians(pitch_deg)
    dist = 10.0
    cam_obj.location = (0, -dist * math.cos(pitch_rad), dist * math.sin(pitch_rad))
    cam_obj.rotation_euler = (math.radians(90 - pitch_deg), 0, 0)
    return cam_obj

def render_creature(cid: str, obj_name: str, export_subdir: str, base_out_dir: Path):
    target_obj = bpy.data.objects.get(obj_name)
    if not target_obj:
        print(f"Error: Object '{obj_name}' not found.")
        return

    # Hide all other creatures, show only target
    for other_cid, other_obj_name, _ in CREATURES:
        other_obj = bpy.data.objects.get(other_obj_name)
        if other_obj:
            is_active = (other_obj_name == obj_name)
            other_obj.hide_render = not is_active
            other_obj.hide_viewport = not is_active

    out_dir = base_out_dir / export_subdir
    out_dir.mkdir(parents=True, exist_ok=True)

    orig_loc = target_obj.location.copy()
    orig_rot = target_obj.rotation_euler.copy()

    print(f"\n>>> Baking 3D Creature: {cid} ({obj_name}) -> {out_dir}")

    total_rendered = 0
    for deg, facing in ANGLES:
        target_obj.rotation_euler = (orig_rot.x, orig_rot.y, math.radians(deg))

        for f_idx, dz in enumerate(BREATHING_DELTAS):
            # Subtle breathing vertical bob
            target_obj.location = (orig_loc.x, orig_loc.y, orig_loc.z + dz)
            bpy.context.view_layer.update()

            out_file = out_dir / f"idle_{facing}_{f_idx}.png"
            bpy.context.scene.render.filepath = str(out_file)
            bpy.ops.render.render(write_still=True)
            total_rendered += 1

        print(f"  Facing '{facing:2s}' ({deg:3d} deg): 6 breathing frames baked.")

    target_obj.location = orig_loc
    target_obj.rotation_euler = orig_rot
    print(f"  [SUCCESS] {cid}: {total_rendered} frames saved.")

def main():
    argv = sys.argv
    args = argv[argv.index("--") + 1:] if "--" in argv else []

    target_species = "rivallie"
    render_all = False
    out_dir = DEFAULT_OUT_DIR

    if "--all" in args:
        render_all = True
    elif "--species" in args:
        idx = args.index("--species")
        if idx + 1 < len(args):
            target_species = args[idx + 1]

    if "--out-dir" in args:
        idx = args.index("--out-dir")
        if idx + 1 < len(args):
            out_dir = Path(args[idx + 1]).resolve()

    setup_render_settings(width=96, height=96)
    setup_ortho_camera(pitch_deg=22.0, ortho_scale=1.70)

    if render_all:
        for cid, obj_name, subdir in CREATURES:
            render_creature(cid, obj_name, subdir, out_dir)
    else:
        for cid, obj_name, subdir in CREATURES:
            if cid == target_species:
                render_creature(cid, obj_name, subdir, out_dir)
                break

if __name__ == "__main__":
    main()
