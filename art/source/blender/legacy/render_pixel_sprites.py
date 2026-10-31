"""
Hearthwild Headless Blender Pixel-Art Renderer.
Bakes 3D character and creature models into 8-directional, zero-drift 2D pixel-art sprite sheets.

Usage:
  blender -b [model.blend] -P art/source/blender/render_pixel_sprites.py
  blender -b --python art/source/blender/render_pixel_sprites.py -- --model player
"""

import os
import sys
import math
from pathlib import Path

# Optional argument parsing when run via Blender
argv = sys.argv
args = []
if "--" in argv:
    args = argv[argv.index("--") + 1:]

try:
    import bpy
except ImportError:
    print("This script must be executed inside Blender: blender -b -P render_pixel_sprites.py")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[3]
EXPORTS_DIR = REPO_ROOT / "art" / "source" / "exports"

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

def setup_render_engine(width: int, height: int):
    """Configures Blender for pixel-art orthographic rendering."""
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'

    # Use Workbench for crisp, fast rendering on CPU
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = 'BOTH'
    scene.display.shading.curvature_ridge_factor = 2.0
    scene.display.shading.curvature_valley_factor = 2.0
    scene.display.shading.show_object_outline = True
    scene.display.shading.object_outline_color = (0.09, 0.11, 0.15)
    scene.display.render_aa = 'OFF'  # Disable anti-aliasing for raw pixel art edges

def setup_camera(target_canvas=(96, 144), pitch_deg=20.0, ortho_scale=2.2):
    """Sets up an orthographic camera aimed at the origin."""
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new("PixelCam")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = ortho_scale

    cam_obj = bpy.data.objects.new("PixelCam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # Position camera with top-down 3/4 pitch
    pitch_rad = math.radians(pitch_deg)
    dist = 10.0
    cam_obj.location = (0, -dist * math.cos(pitch_rad), dist * math.sin(pitch_rad))
    cam_obj.rotation_euler = (math.radians(90 - pitch_deg), 0, 0)
    return cam_obj

def render_turntable(target_object, out_dir: Path, prefix: str = "idle"):
    """Rotates target object through all 8 angles and renders PNG frames."""
    out_dir.mkdir(parents=True, exist_ok=True)
    orig_rot = target_object.rotation_euler.copy()

    for deg, facing in ANGLES:
        # Rotate around Z axis (Blender's vertical axis)
        target_object.rotation_euler = (orig_rot.x, orig_rot.y, orig_rot.z + math.radians(deg))
        bpy.context.view_layer.update()

        out_path = out_dir / f"{prefix}_{facing}_0.png"
        bpy.context.scene.render.filepath = str(out_path)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered: {out_path.name}")

    target_object.rotation_euler = orig_rot

def main():
    print("=" * 60)
    print("Hearthwild Blender Pixel-Art Turntable Renderer")
    print("=" * 60)

    # Detect character or creature in scene
    # By convention, the root object is named 'Player' or 'Rivallie' or 'Armature'
    target = None
    for name in ["Player", "Rivallie", "Armature", "Character"]:
        if name in bpy.data.objects:
            target = bpy.data.objects[name]
            break

    if not target:
        # Default to first non-camera, non-light mesh or armature
        for obj in bpy.context.scene.objects:
            if obj.type in ['MESH', 'ARMATURE']:
                target = obj
                break

    if not target:
        print("ERROR: No suitable mesh or armature object found in the scene.")
        return

    is_humanoid = "player" in target.name.lower() or "human" in target.name.lower()
    if is_humanoid:
        setup_render_engine(96, 144)
        setup_camera(target_canvas=(96, 144), pitch_deg=18.0, ortho_scale=2.0)
        out_folder = EXPORTS_DIR / "player_aqualia"
    else:
        setup_render_engine(96, 96)
        setup_camera(target_canvas=(96, 96), pitch_deg=22.0, ortho_scale=1.5)
        out_folder = EXPORTS_DIR / "rivallie"

    print(f"Target object: {target.name} ({'Humanoid 96x144' if is_humanoid else 'Creature 96x96'})")
    render_turntable(target, out_folder)
    print("Turntable render complete.")

if __name__ == "__main__":
    main()

