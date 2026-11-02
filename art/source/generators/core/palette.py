"""
Canonical color palettes and palette ramps for Hearthwild HD Presentation.
Supports 16-color and 32-color quantized JRPG ramps with highlights, midtones, shadows, and deep outlines.
"""

from typing import Dict, List, Tuple

RGBA = Tuple[int, int, int, int]
RGB = Tuple[int, int, int]

def hex_to_rgba(hex_str: str, alpha: int = 255) -> RGBA:
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 6:
        r, g, b = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)
        return (r, g, b, alpha)
    elif len(hex_str) == 8:
        r, g, b, a = int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16), int(hex_str[6:8], 16)
        return (r, g, b, a)
    raise ValueError(f"Invalid hex color: {hex_str}")

# --- Faction Palettes ---
PALETTE_AQUALIA: Dict[str, RGBA] = {
    "water_deep": hex_to_rgba("#133e54"),
    "water_mid": hex_to_rgba("#1d6a8a"),
    "water_surface": hex_to_rgba("#35a3b8"),
    "water_foam": hex_to_rgba("#89e0dc"),
    "water_caustic": hex_to_rgba("#c4fcf4"),
    "timber_dark": hex_to_rgba("#2b211b"),
    "timber_shadow": hex_to_rgba("#453326"),
    "timber_mid": hex_to_rgba("#68503c"),
    "timber_highlight": hex_to_rgba("#8a6d54"),
    "cloth_indigo": hex_to_rgba("#223354"),
    "cloth_teal_shadow": hex_to_rgba("#1e5559"),
    "cloth_teal_mid": hex_to_rgba("#2c8285"),
    "cloth_teal_bright": hex_to_rgba("#4ec2b6"),
    "reed_shadow": hex_to_rgba("#59582d"),
    "reed_mid": hex_to_rgba("#8c8b4b"),
    "reed_bright": hex_to_rgba("#c9c471"),
    "brass_shadow": hex_to_rgba("#6b4918"),
    "brass_mid": hex_to_rgba("#ad7e2b"),
    "brass_bright": hex_to_rgba("#ebd065"),
    "stone_canal_shadow": hex_to_rgba("#38424a"),
    "stone_canal_mid": hex_to_rgba("#56646e"),
    "stone_canal_bright": hex_to_rgba("#7f919e"),
}

PALETTE_PYRADOR: Dict[str, RGBA] = {
    "basalt_dark": hex_to_rgba("#121114"),
    "basalt_shadow": hex_to_rgba("#242229"),
    "basalt_mid": hex_to_rgba("#3d3945"),
    "basalt_light": hex_to_rgba("#615b6e"),
    "terracotta_shadow": hex_to_rgba("#5c221a"),
    "terracotta_mid": hex_to_rgba("#9c3d2e"),
    "terracotta_bright": hex_to_rgba("#cf5d44"),
    "ember_deep": hex_to_rgba("#801f11"),
    "ember_glow": hex_to_rgba("#d94818"),
    "ember_bright": hex_to_rgba("#f5912c"),
    "ember_hot": hex_to_rgba("#ffde59"),
    "copper_shadow": hex_to_rgba("#522c1d"),
    "copper_mid": hex_to_rgba("#8c4e33"),
    "copper_bright": hex_to_rgba("#c7774e"),
    "copper_sheen": hex_to_rgba("#f0ad86"),
    "iron_dark": hex_to_rgba("#1c1f24"),
    "iron_mid": hex_to_rgba("#3b424a"),
    "iron_light": hex_to_rgba("#6e7985"),
}

PALETTE_ZEPHYRIA: Dict[str, RGBA] = {
    "wood_pale_dark": hex_to_rgba("#473c33"),
    "wood_pale_shadow": hex_to_rgba("#756456"),
    "wood_pale_mid": hex_to_rgba("#a69280"),
    "wood_pale_light": hex_to_rgba("#d9c8b8"),
    "sky_blue_dark": hex_to_rgba("#2c4a6b"),
    "sky_blue_mid": hex_to_rgba("#4a7da8"),
    "sky_blue_light": hex_to_rgba("#87bce3"),
    "feather_cream_shadow": hex_to_rgba("#8c8577"),
    "feather_cream_mid": hex_to_rgba("#c2bbb0"),
    "feather_cream_light": hex_to_rgba("#f7f3eb"),
    "bloom_purple_shadow": hex_to_rgba("#4d2a59"),
    "bloom_purple_mid": hex_to_rgba("#854a9c"),
    "bloom_purple_bright": hex_to_rgba("#c27de0"),
    "brass_wind_shadow": hex_to_rgba("#5c4c22"),
    "brass_wind_mid": hex_to_rgba("#9e823a"),
    "brass_wind_light": hex_to_rgba("#e3c46d"),
}

# --- Human Anatomy Ramps (4-Step Shading: Outline/Deep Shadow, Shadow, Midtone, Highlight) ---
SKIN_RAMPS: Dict[str, List[RGBA]] = {
    "fair": [
        hex_to_rgba("#613a30"),  # Deep shadow
        hex_to_rgba("#a36b59"),  # Shadow
        hex_to_rgba("#d99b82"),  # Midtone
        hex_to_rgba("#ffd1ba"),  # Highlight
    ],
    "olive": [
        hex_to_rgba("#4a3725"),
        hex_to_rgba("#785b3f"),
        hex_to_rgba("#ad8761"),
        hex_to_rgba("#deb990"),
    ],
    "warm_bronze": [
        hex_to_rgba("#3d2117"),
        hex_to_rgba("#6e3c2b"),
        hex_to_rgba("#a66249"),
        hex_to_rgba("#d99275"),
    ],
    "deep_umber": [
        hex_to_rgba("#211410"),
        hex_to_rgba("#40271f"),
        hex_to_rgba("#6e4437"),
        hex_to_rgba("#996352"),
    ],
}

HAIR_RAMPS: Dict[str, List[RGBA]] = {
    "teal": [
        hex_to_rgba("#0f2a2e"),
        hex_to_rgba("#184c52"),
        hex_to_rgba("#287982"),
        hex_to_rgba("#48b5bf"),
    ],
    "copper": [
        hex_to_rgba("#38170c"),
        hex_to_rgba("#692b16"),
        hex_to_rgba("#a84a27"),
        hex_to_rgba("#e37746"),
    ],
    "dark_charcoal": [
        hex_to_rgba("#121214"),
        hex_to_rgba("#212226"),
        hex_to_rgba("#3b3d45"),
        hex_to_rgba("#5e626e"),
    ],
    "silver": [
        hex_to_rgba("#36373d"),
        hex_to_rgba("#61646e"),
        hex_to_rgba("#9aa0ab"),
        hex_to_rgba("#dce0e8"),
    ],
    "golden_wheat": [
        hex_to_rgba("#453316"),
        hex_to_rgba("#7a5d2c"),
        hex_to_rgba("#b8924b"),
        hex_to_rgba("#f2cd77"),
    ],
}

# --- Environment & Flora Palettes ---
PALETTE_TERRAIN: Dict[str, RGBA] = {
    "grass_deep": hex_to_rgba("#1d3824"),
    "grass_shadow": hex_to_rgba("#2d5c38"),
    "grass_mid": hex_to_rgba("#42824e"),
    "grass_light": hex_to_rgba("#65ad6e"),
    "grass_highlight": hex_to_rgba("#8ad48f"),
    "dirt_deep": hex_to_rgba("#2e2117"),
    "dirt_shadow": hex_to_rgba("#4a3523"),
    "dirt_mid": hex_to_rgba("#6e4f35"),
    "dirt_light": hex_to_rgba("#96714f"),
    "dirt_pebble": hex_to_rgba("#7d776d"),
    "sand_shadow": hex_to_rgba("#8a7b5d"),
    "sand_mid": hex_to_rgba("#b5a480"),
    "sand_light": hex_to_rgba("#ded0aa"),
    "water_deep": hex_to_rgba("#133e54"),
    "water_mid": hex_to_rgba("#1d6a8a"),
    "water_surface": hex_to_rgba("#35a3b8"),
    "water_foam": hex_to_rgba("#89e0dc"),
    "water_caustic": hex_to_rgba("#c4fcf4"),
    "cliff_stone_dark": hex_to_rgba("#333b37"),
    "cliff_stone_mid": hex_to_rgba("#4d5752"),
    "cliff_stone_light": hex_to_rgba("#6b7872"),
    "ramp_wood_dark": hex_to_rgba("#3d2f23"),
    "ramp_wood_mid": hex_to_rgba("#634d3a"),
    "ramp_wood_light": hex_to_rgba("#8c6f54"),
}

PALETTE_FLORA: Dict[str, RGBA] = {
    "leaf_dark": hex_to_rgba("#1a3b20"),
    "leaf_mid": hex_to_rgba("#2b5930"),
    "leaf_light": hex_to_rgba("#45804c"),
    "leaf_bright": hex_to_rgba("#6db375"),
    "berry_dark": hex_to_rgba("#70132b"),
    "berry_mid": hex_to_rgba("#b52449"),
    "berry_bright": hex_to_rgba("#f04873"),
    "reed_stem_dark": hex_to_rgba("#364a27"),
    "reed_stem_mid": hex_to_rgba("#56753e"),
    "reed_stem_light": hex_to_rgba("#7da35c"),
    "cattail_brown": hex_to_rgba("#523019"),
    "cattail_light": hex_to_rgba("#784b2c"),
    "wheat_dark": hex_to_rgba("#6e4c16"),
    "wheat_mid": hex_to_rgba("#ab7d2c"),
    "wheat_gold": hex_to_rgba("#e6b34a"),
    "wheat_highlight": hex_to_rgba("#fae089"),
    "nectar_petal_dark": hex_to_rgba("#541e4d"),
    "nectar_petal_mid": hex_to_rgba("#963989"),
    "nectar_petal_light": hex_to_rgba("#d95fca"),
    "nectar_gold": hex_to_rgba("#f5be27"),
    "ashgrass_dark": hex_to_rgba("#2f3836"),
    "ashgrass_mid": hex_to_rgba("#4e5c58"),
    "ashgrass_light": hex_to_rgba("#788c86"),
    "ashgrass_cyan": hex_to_rgba("#4ef2d5"),
    "fungi_stem": hex_to_rgba("#d4ccb8"),
    "fungi_cap_dark": hex_to_rgba("#19403d"),
    "fungi_cap_mid": hex_to_rgba("#2c6b66"),
    "fungi_cap_bright": hex_to_rgba("#4cc4bb"),
    "burnt_charcoal": hex_to_rgba("#161617"),
    "burnt_shadow": hex_to_rgba("#262629"),
    "burnt_ash": hex_to_rgba("#4d4d54"),
    "burnt_ember": hex_to_rgba("#e04a1b"),
}

# --- Shared Outlines & Utility ---
OUTLINE_DARK = hex_to_rgba("#141417")
OUTLINE_SOFT = hex_to_rgba("#292930")
CLEAR = (0, 0, 0, 0)
