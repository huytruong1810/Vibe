"""
Procedural Items and Weapons Generator for Hearthwild HD Presentation.
Generates 96x96 inventory icons and ground drops for 16 base items + 4 weapons.
"""

from typing import Dict, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_AQUALIA, PALETTE_TERRAIN, PALETTE_FLORA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect, apply_selective_outline
)

ICON_SIZE = 96

def render_item_berries() -> Image.Image:
    """96x96 Plump river berries with leaf sprig."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    cx, cy = 48, 52
    f = PALETTE_FLORA
    # Sprig leaves
    draw_shaded_rect(img, cx - 18, cy - 24, 16, 12, f["leaf_dark"], f["leaf_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 2, cy - 28, 18, 14, f["leaf_mid"], f["leaf_bright"], OUTLINE_DARK)
    # Berry cluster
    offsets = [(-14, -6), (6, -8), (-6, 6), (12, 8), (-16, 14), (2, 16)]
    for ox, oy in offsets:
        draw_shaded_rect(img, cx + ox - 8, cy + oy - 8, 16, 16, f["berry_dark"], f["berry_mid"], OUTLINE_DARK)
        draw_pixel(img, cx + ox - 2, cy + oy - 3, f["berry_bright"])
        draw_pixel(img, cx + ox - 1, cy + oy - 4, (255, 200, 215, 255))
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_reeds() -> Image.Image:
    """96x96 Tied river reed stalks with cattails."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    f = PALETTE_FLORA
    cx, cy = 48, 48
    # Stalks diagonally
    for i in range(-12, 13, 6):
        draw_pixel_line(img, cx + i - 16, cy + 30, cx + i + 16, cy - 26, f["reed_stem_mid"])
        draw_pixel_line(img, cx + i - 15, cy + 30, cx + i + 17, cy - 26, f["reed_stem_dark"])
    # Cattail heads
    draw_shaded_rect(img, cx + 14, cy - 36, 10, 20, f["cattail_brown"], f["cattail_light"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 2, cy - 30, 8, 18, f["cattail_brown"], f["cattail_light"], OUTLINE_DARK)
    # Reed tie cord
    draw_shaded_rect(img, cx - 10, cy, 20, 8, f["wheat_gold"], f["cattail_brown"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_wheat() -> Image.Image:
    """96x96 Golden wheat sheaf."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    f = PALETTE_FLORA
    cx, cy = 48, 50
    # Stems
    for dx in range(-10, 11, 4):
        draw_pixel_line(img, cx + dx, cy + 30, cx + dx * 2, cy - 10, f["wheat_dark"])
        draw_shaded_rect(img, cx + dx * 2 - 4, cy - 32 + abs(dx), 8, 18, f["wheat_mid"], f["wheat_gold"], OUTLINE_DARK)
        draw_pixel(img, cx + dx * 2, cy - 34 + abs(dx), f["wheat_highlight"])
    # Tie band
    draw_shaded_rect(img, cx - 12, cy + 8, 24, 6, f["cattail_brown"], f["cattail_light"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_nectar() -> Image.Image:
    """96x96 Glass vial filled with luminous golden nectar."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    cx, cy = 48, 50
    f = PALETTE_FLORA
    # Cork stopper
    draw_shaded_rect(img, cx - 6, cy - 34, 12, 8, f["cattail_brown"], f["cattail_light"], OUTLINE_DARK)
    # Glass bottle neck
    draw_shaded_rect(img, cx - 8, cy - 26, 16, 10, (180, 220, 230, 200), (220, 245, 255, 230), OUTLINE_DARK)
    # Round bottle body
    draw_shaded_rect(img, cx - 22, cy - 16, 44, 46, (140, 200, 220, 180), (210, 245, 255, 220), OUTLINE_DARK)
    # Golden glowing nectar liquid
    draw_shaded_rect(img, cx - 18, cy - 6, 36, 32, f["nectar_gold"], f["wheat_highlight"], None)
    # Glass specular shine
    draw_pixel_line(img, cx - 14, cy - 10, cx - 14, cy + 18, (255, 255, 255, 240))
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_ashgrass() -> Image.Image:
    """96x96 Silvery ashgrass blades with cyan veins."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    f = PALETTE_FLORA
    cx, cy = 48, 52
    for ox in range(-18, 19, 6):
        draw_pixel_line(img, cx + ox, cy + 28, cx + ox * 1.5, cy - 24, f["ashgrass_mid"])
        draw_pixel_line(img, cx + ox + 1, cy + 28, cx + ox * 1.5 + 1, cy - 24, f["ashgrass_dark"])
        draw_pixel(img, int(cx + ox * 1.5), cy - 26, f["ashgrass_cyan"])
        draw_pixel(img, int(cx + ox * 1.5), cy - 25, f["ashgrass_light"])
    draw_shaded_rect(img, cx - 14, cy + 10, 28, 6, f["ashgrass_dark"], f["ashgrass_light"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_fungi() -> Image.Image:
    """96x96 Turquoise shelf mushrooms."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    f = PALETTE_FLORA
    cx, cy = 48, 50
    # Stalks
    draw_shaded_rect(img, cx - 14, cy, 10, 26, f["fungi_stem"], f["leaf_dark"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 4, cy - 6, 12, 32, f["fungi_stem"], f["leaf_dark"], OUTLINE_DARK)
    # Small left cap
    draw_shaded_rect(img, cx - 26, cy - 8, 24, 14, f["fungi_cap_dark"], f["fungi_cap_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 22, cy - 12, 16, 6, f["fungi_cap_mid"], f["fungi_cap_bright"], None)
    # Large right cap
    draw_shaded_rect(img, cx - 8, cy - 20, 34, 18, f["fungi_cap_dark"], f["fungi_cap_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 4, cy - 26, 26, 8, f["fungi_cap_mid"], f["fungi_cap_bright"], None)
    draw_pixel(img, cx + 4, cy - 24, (255, 255, 255, 220))
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_flint() -> Image.Image:
    """96x96 Chipped river flint rock."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    cx, cy = 48, 48
    draw_shaded_rect(img, cx - 22, cy - 18, 44, 38, hex_to_rgba("#2b3036"), hex_to_rgba("#4f5863"), OUTLINE_DARK)
    draw_shaded_rect(img, cx - 14, cy - 26, 28, 16, hex_to_rgba("#4f5863"), hex_to_rgba("#7b8899"), OUTLINE_DARK)
    # Flaked sharp facets
    draw_pixel_line(img, cx - 12, cy - 14, cx + 10, cy + 8, hex_to_rgba("#9fb0c4"))
    draw_pixel_line(img, cx - 8, cy - 10, cx + 14, cy + 12, hex_to_rgba("#1d2024"))
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_stick() -> Image.Image:
    """96x96 Carved hardwood stick."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Diagonal branch
    for offset in range(-3, 4):
        draw_pixel_line(img, cx - 28 + offset, cy + 28, cx + 28 + offset, cy - 28, aq["timber_mid"])
    draw_pixel_line(img, cx - 31, cy + 28, cx + 25, cy - 28, aq["timber_dark"])
    draw_pixel_line(img, cx - 25, cy + 28, cx + 31, cy - 28, aq["timber_highlight"])
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_fiber() -> Image.Image:
    """96x96 Skein of twisted vegetal cordage."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    f = PALETTE_FLORA
    cx, cy = 48, 48
    # Outer coil oval
    draw_shaded_rect(img, cx - 26, cy - 18, 52, 36, f["cattail_brown"], f["wheat_gold"], OUTLINE_DARK)
    # Inner hole
    draw_shaded_rect(img, cx - 12, cy - 8, 24, 16, CLEAR, CLEAR, OUTLINE_DARK)
    # Twisted twine ridges
    for ox in range(cx - 22, cx + 22, 6):
        draw_pixel_line(img, ox, cy - 14, ox + 4, cy + 14, f["wheat_highlight"])
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_tool_head() -> Image.Image:
    """96x96 Chiseled stone/copper axe head."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    cx, cy = 48, 48
    draw_shaded_rect(img, cx - 20, cy - 22, 40, 44, hex_to_rgba("#4a3625"), hex_to_rgba("#8c6441"), OUTLINE_DARK)
    # Beveled cutting edge
    draw_shaded_rect(img, cx + 12, cy - 26, 12, 52, hex_to_rgba("#b88554"), hex_to_rgba("#f0b87f"), OUTLINE_DARK)
    # Haft socket notch
    draw_shaded_rect(img, cx - 16, cy - 10, 14, 20, OUTLINE_DARK, hex_to_rgba("#2e2117"), None)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_hatchet() -> Image.Image:
    """96x96 Bound woodsman's hatchet."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Handle diagonal
    for offset in range(-2, 3):
        draw_pixel_line(img, cx - 24 + offset, cy + 28, cx + 16 + offset, cy - 20, aq["timber_mid"])
    # Axe blade attached near top
    draw_shaded_rect(img, cx + 6, cy - 32, 22, 24, hex_to_rgba("#4a3625"), hex_to_rgba("#8c6441"), OUTLINE_DARK)
    draw_pixel_line(img, cx + 27, cy - 32, cx + 27, cy - 8, hex_to_rgba("#f0b87f"))
    # Leather cord wrapping
    draw_shaded_rect(img, cx + 8, cy - 18, 12, 8, aq["reed_shadow"], aq["reed_mid"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_poultice() -> Image.Image:
    """96x96 Herbal medicine wrap."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    f = PALETTE_FLORA
    cx, cy = 48, 48
    draw_shaded_rect(img, cx - 22, cy - 18, 44, 36, hex_to_rgba("#c4bda9"), hex_to_rgba("#f0ece1"), OUTLINE_DARK)
    # Green healing herbs protruding
    draw_shaded_rect(img, cx - 12, cy - 24, 24, 10, f["leaf_dark"], f["leaf_bright"], OUTLINE_DARK)
    # Cross tie string
    draw_pixel_line(img, cx, cy - 18, cx, cy + 18, f["cattail_brown"])
    draw_pixel_line(img, cx - 22, cy, cx + 22, cy, f["cattail_brown"])
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_water() -> Image.Image:
    """96x96 Ceramic river flask with freshwater symbol."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Cork
    draw_shaded_rect(img, cx - 5, cy - 32, 10, 8, aq["reed_shadow"], aq["reed_mid"], OUTLINE_DARK)
    # Clay jug body
    draw_shaded_rect(img, cx - 20, cy - 18, 40, 44, aq["cloth_indigo"], aq["cloth_teal_mid"], OUTLINE_DARK)
    # Water drop emblem
    draw_shaded_rect(img, cx - 6, cy - 4, 12, 16, aq["water_surface"], aq["water_caustic"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_ore() -> Image.Image:
    """96x96 Copper river ore chunk."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    cx, cy = 48, 48
    draw_shaded_rect(img, cx - 24, cy - 20, 48, 42, hex_to_rgba("#38322c"), hex_to_rgba("#61574d"), OUTLINE_DARK)
    # Copper metallic veins
    copper_mid = hex_to_rgba("#c7774e")
    copper_shine = hex_to_rgba("#f5b08c")
    draw_shaded_rect(img, cx - 12, cy - 12, 16, 14, copper_mid, copper_shine, OUTLINE_DARK)
    draw_shaded_rect(img, cx + 4, cy + 2, 14, 12, copper_mid, copper_shine, OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_meat() -> Image.Image:
    """96x96 Skewered roasted river meat."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Wooden skewer
    draw_pixel_line(img, cx - 28, cy + 28, cx + 28, cy - 28, aq["timber_dark"])
    # Roasted meat cuts
    for ox, oy in [(-12, 12), (0, 0), (12, -12)]:
        draw_shaded_rect(img, cx + ox - 8, cy + oy - 8, 16, 16, hex_to_rgba("#592019"), hex_to_rgba("#a84432"), OUTLINE_DARK)
        draw_pixel(img, cx + ox - 2, cy + oy - 2, hex_to_rgba("#e37754"))
    return apply_selective_outline(img, OUTLINE_DARK)

def render_item_meal() -> Image.Image:
    """96x96 Cooked bowl of river stew."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Ceramic bowl
    draw_shaded_rect(img, cx - 26, cy - 8, 52, 34, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)
    # Hot stew broth
    draw_shaded_rect(img, cx - 22, cy - 12, 44, 14, hex_to_rgba("#803b1f"), hex_to_rgba("#bd6533"), OUTLINE_DARK)
    # Spoon
    draw_pixel_line(img, cx + 8, cy - 24, cx + 18, cy + 4, aq["timber_highlight"])
    return apply_selective_outline(img, OUTLINE_DARK)

def render_weapon_sword() -> Image.Image:
    """96x96 Balanced iron/copper sword with leather wrapped grip."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Diagonal blade from bottom-left to top-right
    for off in range(-1, 2):
        draw_pixel_line(img, cx - 10 + off, cy + 10, cx + 26 + off, cy - 26, hex_to_rgba("#8c99a6"))
    draw_pixel_line(img, cx - 11, cy + 10, cx + 25, cy - 26, hex_to_rgba("#4f5963"))
    draw_pixel_line(img, cx - 9, cy + 10, cx + 27, cy - 26, hex_to_rgba("#d2dbe3"))
    # Crossguard
    draw_pixel_line(img, cx - 18, cy + 4, cx - 6, cy + 16, aq["brass_bright"])
    draw_pixel_line(img, cx - 19, cy + 4, cx - 7, cy + 16, aq["brass_mid"])
    # Grip & Pommel
    draw_pixel_line(img, cx - 12, cy + 12, cx - 22, cy + 22, aq["timber_dark"])
    draw_shaded_rect(img, cx - 26, cy + 24, 6, 6, aq["brass_shadow"], aq["brass_bright"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_weapon_spear() -> Image.Image:
    """96x96 Long ashwood spear with bound copper leaf blade."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Ashwood shaft
    for off in range(-1, 2):
        draw_pixel_line(img, cx - 32 + off, cy + 32, cx + 22 + off, cy - 22, aq["timber_mid"])
    # Leaf spearhead
    draw_shaded_rect(img, cx + 20, cy - 32, 14, 14, hex_to_rgba("#8c4e33"), hex_to_rgba("#c7774e"), OUTLINE_DARK)
    draw_pixel(img, cx + 32, cy - 34, hex_to_rgba("#f0ad86"))
    # Binding cord
    draw_shaded_rect(img, cx + 14, cy - 20, 8, 8, aq["reed_shadow"], aq["reed_mid"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_weapon_bow() -> Image.Image:
    """96x96 Curved recurve bow strung with waxed river cord."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Bow string
    draw_pixel_line(img, cx - 18, cy - 32, cx - 18, cy + 32, hex_to_rgba("#d4cfc3"))
    # Curved stave
    draw_pixel_line(img, cx - 18, cy - 32, cx + 14, cy - 12, aq["timber_dark"])
    draw_pixel_line(img, cx + 14, cy - 12, cx + 18, cy, aq["timber_highlight"])
    draw_pixel_line(img, cx + 18, cy, cx + 14, cy + 12, aq["timber_highlight"])
    draw_pixel_line(img, cx + 14, cy + 12, cx - 18, cy + 32, aq["timber_dark"])
    # Wrapped grip in center
    draw_shaded_rect(img, cx + 12, cy - 6, 8, 12, aq["cloth_indigo"], aq["cloth_teal_mid"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_weapon_arrow_bundle() -> Image.Image:
    """96x96 Quiver sheaf of 12 fledged arrows."""
    img = create_canvas(ICON_SIZE, ICON_SIZE)
    aq = PALETTE_AQUALIA
    cx, cy = 48, 48
    # Quiver body
    draw_shaded_rect(img, cx - 16, cy - 8, 32, 42, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    # Arrows protruding from top
    for dx in range(-10, 11, 4):
        draw_pixel_line(img, cx + dx, cy - 8, cx + dx, cy - 30, aq["reed_mid"])
        # Feather fletching
        draw_shaded_rect(img, cx + dx - 2, cy - 32, 5, 6, aq["cloth_teal_bright"], hex_to_rgba("#f7f3eb"), OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)
