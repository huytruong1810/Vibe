"""
Modular Cast Batch Renderer for Hearthwild.
Loads humanoid_modular_base.blend, configures swappable modular attachments
(hair, outfits, tools, skin palette), and renders 8-directional, zero-drift
pixel-art sprite sheets conforming to the strict (48, 132) ground anchor
and >= 2px border margin contracts.

Usage:
  blender -b art/source/blender/models/humanoid_modular_base.blend -P art/source/blender/render_modular_cast.py -- --character neris
  blender -b art/source/blender/models/humanoid_modular_base.blend -P art/source/blender/render_modular_cast.py -- --all
"""

import sys
import math
from pathlib import Path

try:
    import bpy
    from mathutils import Vector, Euler
except ImportError:
    print("This script must be executed inside Blender: blender -b [file.blend] -P render_modular_cast.py")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_EXPORTS_DIR = REPO_ROOT / "art" / "source" / "blender" / "renders_modular"

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

MODULAR_ROSTER = {
    "player_aqualia": {
        "name": "Player Aqualia",
        "export_subdir": "player_aqualia",
        "hair": "Hair_Aqualia",
        "outfit": "Outfit_Aqualia",
        "tool_r": None,
        "tool_l": None,
    },
    "neris": {
        "name": "Neris · Master Fishmonger",
        "export_subdir": "npcs/neris",
        "hair": "Hair_Neris",
        "outfit": "Outfit_Fishmonger",
        "tool_r": "Tool_FishingNet",
        "tool_l": None,
    },
    "reed": {
        "name": "Reed · Master Reedweaver",
        "export_subdir": "npcs/reed",
        "hair": "Hair_Reed",
        "outfit": "Outfit_Reedweaver",
        "tool_r": "Tool_ReedBundle",
        "tool_l": None,
    },
    "willa": {
        "name": "Willa · Canal Cook",
        "export_subdir": "npcs/willa",
        "hair": "Hair_Willa",
        "outfit": "Outfit_Cook",
        "tool_r": "Tool_CookingLadle",
        "tool_l": None,
    },
    "oren": {
        "name": "Oren · Runic Stonemason",
        "export_subdir": "npcs/oren",
        "hair": "Hair_Oren",
        "outfit": "Outfit_Stonemason",
        "tool_r": "Tool_RuneChisel",
        "tool_l": None,
    },
    "lark": {
        "name": "Lark · Canal Ferryman",
        "export_subdir": "npcs/lark",
        "hair": "Hair_Lark",
        "outfit": "Outfit_Ferryman",
        "tool_r": "Tool_FerryOar",
        "tool_l": None,
    },
    "dara": {
        "name": "Dara · Waterkeeper",
        "export_subdir": "npcs/dara",
        "hair": "Hair_Dara",
        "outfit": "Outfit_Waterkeeper",
        "tool_r": "Tool_WaterPhial",
        "tool_l": None,
    },
    "finn": {
        "name": "Finn · Wetland Scout",
        "export_subdir": "npcs/finn",
        "hair": "Hair_Finn",
        "outfit": "Outfit_Scout",
        "tool_r": "Tool_ScoutStaff",
        "tool_l": None,
    },
    "vulkan": {
        "name": "Vulkan · Master Armorer",
        "export_subdir": "npcs/vulkan",
        "hair": "Hair_Vulkan",
        "outfit": "Outfit_Blacksmith",
        "tool_r": "Tool_ForgeHammer",
        "tool_l": None,
    },
}

def setup_render_settings(width: int = 96, height: int = 144):
    """Sets up Workbench render engine with cavity and stylized outlines."""
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

def setup_ortho_camera(pitch_deg: float = 20.0, ortho_scale: float = 2.80):
    """
    Sets up orthographic camera with exact shift_y = 60/144
    locking the ground anchor (0, 0, 0) to exactly pixel (48, 132).
    """
    scene = bpy.context.scene

    for obj in list(scene.objects):
        if obj.type == 'CAMERA':
            bpy.data.objects.remove(obj, do_unlink=True)

    cam_data = bpy.data.cameras.new("ModularPixelCam")
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = ortho_scale
    cam_data.shift_y = 60.0 / 144.0

    cam_obj = bpy.data.objects.new("ModularPixelCam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    pitch_rad = math.radians(pitch_deg)
    dist = 10.0
    cam_obj.location = (0, -dist * math.cos(pitch_rad), dist * math.sin(pitch_rad))
    cam_obj.rotation_euler = (math.radians(90 - pitch_deg), 0, 0)
    return cam_obj

def configure_character_visibility(char_config: dict):
    """Hides all modular parts and makes only the selected character's gear visible."""
    modular_collections = ["Col_Hair", "Col_Outfits", "Col_Tools"]
    active_parts = {
        char_config.get("hair"),
        char_config.get("outfit"),
        char_config.get("tool_r"),
        char_config.get("tool_l"),
    }
    active_parts.discard(None)

    for col_name in modular_collections:
        col = bpy.data.collections.get(col_name)
        if not col:
            continue
        for obj in col.objects:
            should_show = obj.name in active_parts
            obj.hide_render = not should_show
            obj.hide_viewport = not should_show

def render_character(char_id: str, action_name: str = "idle_breathing", num_frames: int = 6, base_out_dir: Path = DEFAULT_EXPORTS_DIR):
    """
    Renders all 8 facings x num_frames for a character configuration.
    """
    if char_id not in MODULAR_ROSTER:
        print(f"Unknown character '{char_id}'. Available: {list(MODULAR_ROSTER.keys())}")
        return

    config = MODULAR_ROSTER[char_id]
    print(f"\n>>> Baking modular 3D character: {config['name']} ({char_id})")

    configure_character_visibility(config)

    arm_obj = bpy.data.objects.get("Humanoid_Rig")
    if not arm_obj:
        print("Error: 'Humanoid_Rig' object not found in scene.")
        return

    action = bpy.data.actions.get(action_name)
    if action:
        arm_obj.animation_data.action = action
    else:
        print(f"Warning: Action '{action_name}' not found. Using current pose.")

    out_dir = base_out_dir / config["export_subdir"]
    out_dir.mkdir(parents=True, exist_ok=True)

    orig_rot_z = arm_obj.rotation_euler.z

    total_rendered = 0
    for deg, facing in ANGLES:
        arm_obj.rotation_euler.z = math.radians(deg)

        for f_idx in range(num_frames):
            bpy.context.scene.frame_set(f_idx)
            bpy.context.view_layer.update()

            prefix = "idle" if "idle" in action_name else action_name
            out_file = out_dir / f"{prefix}_{facing}_{f_idx}.png"
            bpy.context.scene.render.filepath = str(out_file)
            bpy.ops.render.render(write_still=True)
            total_rendered += 1

        print(f"  Facing '{facing:2s}' ({deg:3d} deg): {num_frames} frames baked.")

    arm_obj.rotation_euler.z = orig_rot_z
    print(f"  [SUCCESS] {config['name']}: {total_rendered} frames saved to {out_dir}")

def main():
    argv = sys.argv
    args = argv[argv.index("--") + 1:] if "--" in argv else []

    target_char = "neris"
    render_all = False
    action = "idle_breathing"
    frames = 6
    out_dir = DEFAULT_EXPORTS_DIR

    if "--all" in args:
        render_all = True
    elif "--character" in args:
        idx = args.index("--character")
        if idx + 1 < len(args):
            target_char = args[idx + 1]

    if "--action" in args:
        idx = args.index("--action")
        if idx + 1 < len(args):
            action = args[idx + 1]
            frames = 8 if action == "walk" else 6

    if "--out-dir" in args:
        idx = args.index("--out-dir")
        if idx + 1 < len(args):
            out_dir = Path(args[idx + 1]).resolve()

    setup_render_settings(width=96, height=144)
    setup_ortho_camera(pitch_deg=20.0, ortho_scale=2.80)

    if render_all:
        for cid in MODULAR_ROSTER:
            render_character(cid, action_name=action, num_frames=frames, base_out_dir=out_dir)
    else:
        render_character(target_char, action_name=action, num_frames=frames, base_out_dir=out_dir)

if __name__ == "__main__":
    main()
