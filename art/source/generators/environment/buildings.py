"""
Procedural Architecture, Landmarks, and Foliage Generator for Hearthwild HD Presentation.
Generates tree_oak, canopy_oak, house_aqualia, landmark_well, landmark_waystone, prop_hearth.
"""

from typing import Dict, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_AQUALIA, PALETTE_TERRAIN, PALETTE_FLORA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect, apply_selective_outline
)

def render_tree_oak() -> Image.Image:
    """Generates 128x160 full oak tree with textured trunk and tiered foliage canopy."""
    img = create_canvas(128, 160)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    aq = PALETTE_AQUALIA
    cx, ground_y = 64, 150

    # 1. Trunk and roots
    # Roots spreading into ground
    draw_pixel_line(img, cx - 18, ground_y, cx - 8, ground_y - 14, aq["timber_shadow"])
    draw_pixel_line(img, cx + 18, ground_y, cx + 8, ground_y - 14, aq["timber_dark"])
    draw_pixel_line(img, cx - 24, ground_y + 2, cx - 14, ground_y - 8, aq["timber_shadow"])
    draw_pixel_line(img, cx + 24, ground_y + 2, cx + 14, ground_y - 8, aq["timber_dark"])
    # Main trunk
    draw_shaded_rect(img, cx - 12, ground_y - 60, 24, 60, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    # Bark vertical ridges
    for by in range(ground_y - 56, ground_y - 10, 8):
        draw_pixel_line(img, cx - 5, by, cx - 5, by + 6, aq["timber_dark"])
        draw_pixel_line(img, cx + 4, by, cx + 4, by + 6, aq["timber_highlight"])

    # 2. Canopy tiers (lower, mid, upper)
    # Lower tier
    draw_shaded_rect(img, cx - 50, 60, 100, 48, f["leaf_dark"], f["leaf_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 44, 54, 88, 36, f["leaf_mid"], f["leaf_light"], None)
    # Mid tier
    draw_shaded_rect(img, cx - 42, 34, 84, 44, f["leaf_dark"], f["leaf_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 36, 28, 72, 36, f["leaf_mid"], f["leaf_light"], None)
    # Upper crown
    draw_shaded_rect(img, cx - 30, 14, 60, 36, f["leaf_mid"], f["leaf_light"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 22, 10, 44, 26, f["leaf_light"], f["leaf_bright"], None)

    return apply_selective_outline(img, OUTLINE_DARK)

def render_canopy_oak() -> Image.Image:
    """Generates 128x160 separate oak canopy matching tree_oak registration for foliage fading."""
    img = create_canvas(128, 160)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    cx = 64

    # Renders upper canopy clusters matching tree_oak upper silhouette exactly
    draw_shaded_rect(img, cx - 50, 60, 100, 48, f["leaf_dark"], f["leaf_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 44, 54, 88, 36, f["leaf_mid"], f["leaf_light"], None)
    draw_shaded_rect(img, cx - 42, 34, 84, 44, f["leaf_dark"], f["leaf_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 36, 28, 72, 36, f["leaf_mid"], f["leaf_light"], None)
    draw_shaded_rect(img, cx - 30, 14, 60, 36, f["leaf_mid"], f["leaf_light"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 22, 10, 44, 26, f["leaf_light"], f["leaf_bright"], None)

    return apply_selective_outline(img, OUTLINE_DARK)

def render_house_aqualia() -> Image.Image:
    """
    Generates 192x160 Aqualia river cottage matching 3x2 solid footprint.
    Features river-timber framework, stone plinth, pitched thatch/shingle roof,
    timber door, teal curtains, and wharf lantern.
    """
    img = create_canvas(192, 160)
    draw = ImageDraw.Draw(img)
    aq = PALETTE_AQUALIA
    cx, ground_y = 96, 150
    w, h = 168, 76  # Facade width and height

    # 1. Stone foundation plinth (rows ground_y-14..ground_y)
    draw_shaded_rect(img, cx - (w // 2), ground_y - 14, w, 14, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)
    for sx in range(cx - (w // 2) + 16, cx + (w // 2) - 8, 22):
        draw_pixel_line(img, sx, ground_y - 14, sx, ground_y, aq["stone_canal_shadow"])

    # 2. Timber wall facade (rows ground_y-74..ground_y-14)
    draw_shaded_rect(img, cx - (w // 2) + 4, ground_y - 74, w - 8, 60, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    # Timber horizontal siding planks
    for py in range(ground_y - 70, ground_y - 16, 10):
        draw_pixel_line(img, cx - (w // 2) + 6, py, cx + (w // 2) - 6, py, aq["timber_shadow"])
        draw_pixel_line(img, cx - (w // 2) + 6, py + 1, cx + (w // 2) - 6, py + 1, aq["timber_highlight"])

    # 3. Pitched Gable Thatch / Weathered Shingle Roof (rows 12..ground_y-68)
    roof_w = w + 12
    draw_shaded_rect(img, cx - (roof_w // 2), 34, roof_w, 48, aq["reed_shadow"], aq["reed_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - (roof_w // 2) + 8, 20, roof_w - 16, 24, aq["reed_mid"], aq["reed_bright"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 36, 10, 72, 14, aq["reed_bright"], aq["reed_mid"], OUTLINE_DARK)
    # Reed trim ridges
    for rx in range(cx - (roof_w // 2) + 12, cx + (roof_w // 2) - 10, 16):
        draw_pixel_line(img, rx, 34, rx - 6, 78, aq["reed_shadow"])

    # 4. Timber Door in center
    door_w, door_h = 24, 38
    draw_shaded_rect(img, cx - (door_w // 2), ground_y - 14 - door_h, door_w, door_h, aq["timber_dark"], aq["timber_shadow"], OUTLINE_DARK)
    # Brass latch
    draw_pixel(img, cx + 6, ground_y - 14 - (door_h // 2), aq["brass_bright"])
    # Teal door canopy awning
    draw_shaded_rect(img, cx - (door_w // 2) - 4, ground_y - 14 - door_h - 6, door_w + 8, 6, aq["cloth_teal_mid"], aq["cloth_teal_bright"], OUTLINE_DARK)

    # 5. Windows with Teal Trim & Warm Glass
    for win_x in [cx - 48, cx + 48]:
        win_w, win_h = 20, 24
        draw_shaded_rect(img, win_x - (win_w // 2), ground_y - 14 - 32, win_w, win_h, aq["cloth_teal_shadow"], aq["cloth_teal_mid"], OUTLINE_DARK)
        # Warm interior lantern glow
        draw_shaded_rect(img, win_x - (win_w // 2) + 3, ground_y - 14 - 29, win_w - 6, win_h - 6, (245, 190, 75, 255), (255, 225, 120, 255), OUTLINE_DARK)
        # Window muntin cross
        draw_pixel_line(img, win_x, ground_y - 14 - 29, win_x, ground_y - 14 - 11, OUTLINE_DARK)
        draw_pixel_line(img, win_x - 7, ground_y - 14 - 20, win_x + 7, ground_y - 14 - 20, OUTLINE_DARK)

    # 6. Brass Wharf Lantern on left corner
    lx, ly = cx - (w // 2) + 10, ground_y - 50
    draw_pixel_line(img, lx, ly, lx + 6, ly - 4, aq["brass_mid"])
    draw_shaded_rect(img, lx + 4, ly - 3, 6, 8, aq["brass_shadow"], aq["brass_bright"], OUTLINE_DARK)
    draw_pixel(img, lx + 7, ly, (255, 240, 150, 255))  # lantern glow

    return apply_selective_outline(img, OUTLINE_DARK)

def render_landmark_well() -> Image.Image:
    """Generates 64x80 stone well with timber roof, crank, rope, and water bucket."""
    img = create_canvas(64, 80)
    draw = ImageDraw.Draw(img)
    aq = PALETTE_AQUALIA
    cx, ground_y = 32, 74

    # 1. Circular stone well curb
    curb_w, curb_h = 44, 22
    draw_shaded_rect(img, cx - (curb_w // 2), ground_y - curb_h, curb_w, curb_h, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)
    # Deep water interior
    draw_shaded_rect(img, cx - (curb_w // 2) + 4, ground_y - curb_h + 2, curb_w - 8, 6, aq["water_deep"], aq["water_mid"], None)

    # 2. Side timber support posts
    draw_shaded_rect(img, cx - 18, ground_y - 58, 4, 38, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 14, ground_y - 58, 4, 38, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)

    # 3. Timber crossbeam and rope spindle
    draw_shaded_rect(img, cx - 18, ground_y - 56, 36, 6, aq["timber_mid"], aq["timber_highlight"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 6, ground_y - 54, 12, 8, aq["reed_shadow"], aq["reed_mid"], OUTLINE_DARK)  # coiled rope
    draw_pixel_line(img, cx, ground_y - 46, cx, ground_y - 28, aq["reed_mid"])  # hanging rope

    # 4. Small wooden bucket
    draw_shaded_rect(img, cx - 4, ground_y - 28, 8, 8, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)

    # 5. Pitched timber rooflet
    roof_w = 48
    draw_shaded_rect(img, cx - (roof_w // 2), ground_y - 72, roof_w, 16, aq["reed_shadow"], aq["reed_bright"], OUTLINE_DARK)

    return apply_selective_outline(img, OUTLINE_DARK)

def render_landmark_waystone() -> Image.Image:
    """Generates 64x96 carved river stone megalith with glowing teal nautical runes."""
    img = create_canvas(64, 96)
    draw = ImageDraw.Draw(img)
    aq = PALETTE_AQUALIA
    cx, ground_y = 32, 90

    # 1. Carved monolithic river stone body
    stone_w = 34
    draw_shaded_rect(img, cx - (stone_w // 2), ground_y - 70, stone_w, 70, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)
    # Weathered top slope
    draw_shaded_rect(img, cx - 12, ground_y - 78, 24, 10, aq["stone_canal_mid"], aq["stone_canal_bright"], OUTLINE_DARK)

    # 2. Engraved glowing teal nautical runes & wind-rose
    # Wind-rose diamond
    draw_pixel_line(img, cx, ground_y - 56, cx - 6, ground_y - 48, aq["cloth_teal_bright"])
    draw_pixel_line(img, cx - 6, ground_y - 48, cx, ground_y - 40, aq["cloth_teal_bright"])
    draw_pixel_line(img, cx, ground_y - 40, cx + 6, ground_y - 48, aq["cloth_teal_bright"])
    draw_pixel_line(img, cx + 6, ground_y - 48, cx, ground_y - 56, aq["cloth_teal_bright"])
    draw_pixel(img, cx, ground_y - 48, aq["water_caustic"])  # Center gem glow

    # Flowing river glyph lines
    draw_pixel_line(img, cx - 8, ground_y - 32, cx + 8, ground_y - 32, aq["cloth_teal_bright"])
    draw_pixel_line(img, cx - 6, ground_y - 24, cx + 6, ground_y - 24, aq["cloth_teal_bright"])
    draw_pixel_line(img, cx - 4, ground_y - 16, cx + 4, ground_y - 16, aq["cloth_teal_bright"])

    return apply_selective_outline(img, OUTLINE_DARK)

def render_prop_hearth() -> Image.Image:
    """Generates 64x64 stone cooking hearth with embers, copper pot, and chimneypot."""
    img = create_canvas(64, 64)
    draw = ImageDraw.Draw(img)
    aq = PALETTE_AQUALIA
    f = PALETTE_FLORA
    cx, ground_y = 32, 58

    # 1. Stone hearth base
    base_w, base_h = 42, 26
    draw_shaded_rect(img, cx - (base_w // 2), ground_y - base_h, base_w, base_h, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)

    # 2. Hearth firebox opening
    draw_shaded_rect(img, cx - 12, ground_y - 18, 24, 18, OUTLINE_DARK, aq["stone_canal_shadow"], None)

    # 3. Glowing embers and fire
    draw_shaded_rect(img, cx - 8, ground_y - 6, 16, 6, f["burnt_ember"], (255, 180, 40, 255), None)
    draw_pixel(img, cx - 2, ground_y - 8, (255, 230, 90, 255))
    draw_pixel(img, cx + 2, ground_y - 10, f["burnt_ember"])

    # 4. Copper cooking kettle suspended over fire
    draw_shaded_rect(img, cx - 6, ground_y - 16, 12, 8, (140, 78, 51, 255), (199, 119, 78, 255), OUTLINE_DARK)
    draw_pixel_line(img, cx - 5, ground_y - 17, cx + 5, ground_y - 17, OUTLINE_DARK)  # kettle handle

    # 5. Short stone chimney vent
    draw_shaded_rect(img, cx - 8, ground_y - base_h - 12, 16, 14, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)

    return apply_selective_outline(img, OUTLINE_DARK)
