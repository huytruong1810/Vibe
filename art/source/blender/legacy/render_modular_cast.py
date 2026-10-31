"""
Modular Cast Batch Renderer for Hearthwild.
Loads humanoid_modular_base.blend, configures swappable modular attachments
(hair, outfits, tools), and renders 8-directional, zero-drift pixel-art sprite sheets
conforming to the strict (48, 132) ground anchor and >= 2px border margin contracts.

Supports all 30 villagers across Pyrador, Aqualia, and Zephyria,
plus the 3 Player origins.
"""

import sys
import math
from pathlib import Path

try:
    import bpy
except ImportError:
    print("This script must be executed inside Blender: blender -b [file.blend] -P render_modular_cast.py")
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_EXPORTS_DIR = REPO_ROOT / "art" / "source" / "exports"

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
    # --------------------------------------------------------------------------
    # 3 Player Origins
    # --------------------------------------------------------------------------
    "player_aqualia": {
        "name": "Player Aqualia",
        "export_subdir": "player_aqualia",
        "hair": "Hair_Aqualia",
        "outfit": "Outfit_Aqualia",
        "tool_r": None,
    },
    "player_pyrador": {
        "name": "Player Pyrador",
        "export_subdir": "player_pyrador",
        "hair": "Hair_Pyrador",
        "outfit": "Outfit_Pyrador",
        "tool_r": None,
    },
    "player_zephyria": {
        "name": "Player Zephyria",
        "export_subdir": "player_zephyria",
        "hair": "Hair_Zephyria",
        "outfit": "Outfit_Zephyria",
        "tool_r": None,
    },

    # --------------------------------------------------------------------------
    # 10 Pyrador Villagers (Village 0)
    # --------------------------------------------------------------------------
    "vulkan": {
        "name": "Vulkan · Master Armorer",
        "export_subdir": "npcs/vulkan",
        "hair": "Hair_Vulkan",
        "outfit": "Outfit_Blacksmith",
        "tool_r": "Tool_ForgeHammer",
    },
    "emberlyn": {
        "name": "Emberlyn · Geothermal Alchemist",
        "export_subdir": "npcs/emberlyn",
        "hair": "Hair_Emberlyn",
        "outfit": "Outfit_Alchemist",
        "tool_r": "Tool_AlchemistFlask",
    },
    "soren": {
        "name": "Soren · Volcanic Glassworker",
        "export_subdir": "npcs/soren",
        "hair": "Hair_Oren",
        "outfit": "Outfit_Stonemason",
        "tool_r": "Tool_RuneChisel",
    },
    "tala": {
        "name": "Tala · Mountain Herbalist",
        "export_subdir": "npcs/tala",
        "hair": "Hair_Tala",
        "outfit": "Outfit_Farmer",
        "tool_r": "Tool_FlowerShears",
    },
    "bram": {
        "name": "Bram · Charcoal Keeper",
        "export_subdir": "npcs/bram",
        "hair": "Hair_Vulkan",
        "outfit": "Outfit_Miner",
        "tool_r": "Tool_MinerPick",
    },
    "iona": {
        "name": "Iona · Forge Medic",
        "export_subdir": "npcs/iona",
        "hair": "Hair_Willa",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_AlchemistFlask",
    },
    "flint": {
        "name": "Flint · Mineral Prospector",
        "export_subdir": "npcs/flint",
        "hair": "Hair_Flint",
        "outfit": "Outfit_Miner",
        "tool_r": "Tool_MinerPick",
    },
    "cora": {
        "name": "Cora · Community Cook",
        "export_subdir": "npcs/cora",
        "hair": "Hair_Willa",
        "outfit": "Outfit_Cook",
        "tool_r": "Tool_CookingLadle",
    },
    "aster": {
        "name": "Aster · Outpost Courier",
        "export_subdir": "npcs/aster",
        "hair": "Hair_Finn",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_ScoutStaff",
    },
    "runa": {
        "name": "Runa · Ember Shrine Keeper",
        "export_subdir": "npcs/runa",
        "hair": "Hair_Runa",
        "outfit": "Outfit_ShrineKeeper",
        "tool_r": "Tool_AlchemistFlask",
    },

    # --------------------------------------------------------------------------
    # 10 Aqualia Villagers (Village 1)
    # --------------------------------------------------------------------------
    "caelum": {
        "name": "Caelum · Canal Master",
        "export_subdir": "npcs/caelum",
        "hair": "Hair_Dara",
        "outfit": "Outfit_ShrineKeeper",
        "tool_r": "Tool_ScoutStaff",
    },
    "marina": {
        "name": "Marina · Reed Diver",
        "export_subdir": "npcs/marina",
        "hair": "Hair_Aqualia",
        "outfit": "Outfit_Fishmonger",
        "tool_r": "Tool_DivingShell",
    },
    "neris": {
        "name": "Neris · Ferry Keeper",
        "export_subdir": "npcs/neris",
        "hair": "Hair_Neris",
        "outfit": "Outfit_Fishmonger",
        "tool_r": "Tool_FishingNet",
    },
    "reed": {
        "name": "Reed · Grain Farmer",
        "export_subdir": "npcs/reed",
        "hair": "Hair_Reed",
        "outfit": "Outfit_Farmer",
        "tool_r": "Tool_ReedBundle",
    },
    "willa": {
        "name": "Willa · Wetland Herbalist",
        "export_subdir": "npcs/willa",
        "hair": "Hair_Willa",
        "outfit": "Outfit_Cook",
        "tool_r": "Tool_CookingLadle",
    },
    "oren": {
        "name": "Oren · Waterwheel Builder",
        "export_subdir": "npcs/oren",
        "hair": "Hair_Oren",
        "outfit": "Outfit_Stonemason",
        "tool_r": "Tool_RuneChisel",
    },
    "mira": {
        "name": "Mira · Wildlife Surveyor",
        "export_subdir": "npcs/mira",
        "hair": "Hair_Dara",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_ScoutStaff",
    },
    "lark": {
        "name": "Lark · Wetland Painter",
        "export_subdir": "npcs/lark",
        "hair": "Hair_Lark",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_FerryOar",
    },
    "dara": {
        "name": "Dara · Outpost Courier",
        "export_subdir": "npcs/dara",
        "hair": "Hair_Dara",
        "outfit": "Outfit_Aqualia",
        "tool_r": "Tool_AlchemistFlask",
    },
    "finn": {
        "name": "Finn · Canal Apprentice",
        "export_subdir": "npcs/finn",
        "hair": "Hair_Finn",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_ScoutStaff",
    },

    # --------------------------------------------------------------------------
    # 10 Zephyria Villagers (Village 2)
    # --------------------------------------------------------------------------
    "zephyr": {
        "name": "Zephyr · Elder Navigator",
        "export_subdir": "npcs/zephyr",
        "hair": "Hair_Runa",
        "outfit": "Outfit_ShrineKeeper",
        "tool_r": "Tool_NavigatorKite",
    },
    "kaelen": {
        "name": "Kaelen · Glider Courier",
        "export_subdir": "npcs/kaelen",
        "hair": "Hair_Finn",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_ScoutStaff",
    },
    "sable": {
        "name": "Sable · Pearl Keeper",
        "export_subdir": "npcs/sable",
        "hair": "Hair_Aqualia",
        "outfit": "Outfit_Fishmonger",
        "tool_r": "Tool_DivingShell",
    },
    "niko": {
        "name": "Niko · Sailmaker",
        "export_subdir": "npcs/niko",
        "hair": "Hair_Neris",
        "outfit": "Outfit_Fishmonger",
        "tool_r": "Tool_FishingNet",
    },
    "pippa": {
        "name": "Pippa · Flower Farmer",
        "export_subdir": "npcs/pippa",
        "hair": "Hair_Tala",
        "outfit": "Outfit_Farmer",
        "tool_r": "Tool_FlowerShears",
    },
    "ellis": {
        "name": "Ellis · Windmill Mechanic",
        "export_subdir": "npcs/ellis",
        "hair": "Hair_Flint",
        "outfit": "Outfit_Miner",
        "tool_r": "Tool_RuneChisel",
    },
    "jun": {
        "name": "Jun · Shore Ecologist",
        "export_subdir": "npcs/jun",
        "hair": "Hair_Dara",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_ScoutStaff",
    },
    "faye": {
        "name": "Faye · Communal Cook",
        "export_subdir": "npcs/faye",
        "hair": "Hair_Willa",
        "outfit": "Outfit_Cook",
        "tool_r": "Tool_CookingLadle",
    },
    "rowan": {
        "name": "Rowan · Outpost Courier",
        "export_subdir": "npcs/rowan",
        "hair": "Hair_Finn",
        "outfit": "Outfit_Courier",
        "tool_r": "Tool_ScoutStaff",
    },
    "sol": {
        "name": "Sol · Wind Shrine Keeper",
        "export_subdir": "npcs/sol",
        "hair": "Hair_Runa",
        "outfit": "Outfit_ShrineKeeper",
        "tool_r": "Tool_AlchemistFlask",
    },
}

def setup_render_settings(width: int = 96, height: int = 144):
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
    modular_collections = ["Col_Hair", "Col_Outfits", "Col_Tools"]
    active_parts = {
        char_config.get("hair"),
        char_config.get("outfit"),
        char_config.get("tool_r"),
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
    if char_id not in MODULAR_ROSTER:
        print(f"Unknown character '{char_id}'. Available: {list(MODULAR_ROSTER.keys())}")
        return

    config = MODULAR_ROSTER[char_id]
    print(f"\n>>> Baking 3D character: {config['name']} ({char_id})")

    configure_character_visibility(config)

    arm_obj = bpy.data.objects.get("Humanoid_Rig")
    if not arm_obj:
        print("Error: 'Humanoid_Rig' object not found in scene.")
        return

    action = bpy.data.actions.get(action_name)
    if action:
        arm_obj.animation_data.action = action

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

    target_char = "player_aqualia"
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
