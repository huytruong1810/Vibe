"""
Procedural Architecture, Landmarks, and Foliage Generator for Hearthwild HD Presentation.
Generates tree_oak, canopy_oak, house_aqualia, landmark_well, landmark_waystone, prop_hearth
with rich JRPG pixel-art detail, layered textures, and crisp outlines.
"""

from typing import Dict, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_AQUALIA, PALETTE_TERRAIN, PALETTE_FLORA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect, apply_selective_outline,
    draw_shaded_ellipsoid
)

def render_tree_oak() -> Image.Image:
    """Generates 128x160 full oak tree with textured bark, spreading roots, and lush organic canopy."""
    img = create_canvas(128, 160)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    aq = PALETTE_AQUALIA
    cx, ground_y = 64, 150
    leaf_ramp = [f["leaf_dark"], f["leaf_mid"], f["leaf_light"], f["leaf_bright"]]

    # 1. Spreading gnarled roots
    draw_pixel_line(img, cx - 22, ground_y, cx - 10, ground_y - 18, aq["timber_dark"])
    draw_pixel_line(img, cx - 18, ground_y + 1, cx - 8, ground_y - 12, aq["timber_shadow"])
    draw_pixel_line(img, cx + 22, ground_y, cx + 10, ground_y - 18, aq["timber_dark"])
    draw_pixel_line(img, cx + 18, ground_y + 1, cx + 8, ground_y - 12, aq["timber_mid"])
    draw_pixel_line(img, cx - 26, ground_y + 2, cx - 14, ground_y - 6, aq["timber_shadow"])
    draw_pixel_line(img, cx + 26, ground_y + 2, cx + 14, ground_y - 6, aq["timber_mid"])

    # Moss accents on roots
    for mx, my in [(cx - 20, ground_y - 2), (cx - 16, ground_y - 4), (cx + 14, ground_y - 2), (cx + 18, ground_y - 3)]:
        draw_pixel(img, mx, my, f["leaf_light"])
        draw_pixel(img, mx + 1, my, f["leaf_mid"])

    # 2. Main trunk with vertical bark ridges
    draw_shaded_rect(img, cx - 14, ground_y - 68, 28, 68, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    for by in range(ground_y - 64, ground_y - 8, 4):
        draw_pixel_line(img, cx - 8, by, cx - 8, by + 3, aq["timber_dark"])
        draw_pixel_line(img, cx - 2, by + 1, cx - 2, by + 4, aq["timber_mid"])
        draw_pixel_line(img, cx + 5, by, cx + 5, by + 3, aq["timber_highlight"])
    # Knothole
    draw.ellipse([cx - 4, ground_y - 36, cx + 2, ground_y - 28], fill=aq["timber_dark"], outline=OUTLINE_DARK)
    draw_pixel(img, cx - 1, ground_y - 32, aq["timber_shadow"])

    # Branch forks extending into foliage
    draw.line([(cx - 8, ground_y - 60), (cx - 28, ground_y - 82)], fill=aq["timber_shadow"], width=4)
    draw.line([(cx + 8, ground_y - 60), (cx + 28, ground_y - 82)], fill=aq["timber_mid"], width=4)
    draw.line([(cx, ground_y - 64), (cx, ground_y - 94)], fill=aq["timber_shadow"], width=5)

    # 3. Organic Spherical Foliage Canopy Clusters (Back to Front)
    # Background clusters
    draw_shaded_ellipsoid(img, (cx - 24, 68), 28, 24, leaf_ramp, light_dir=(-0.5, -0.85), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx + 24, 68), 28, 24, leaf_ramp, light_dir=(-0.5, -0.85), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx, 50), 34, 28, leaf_ramp, light_dir=(-0.5, -0.85), outline_color=OUTLINE_DARK)

    # Mid-layer clusters
    draw_shaded_ellipsoid(img, (cx - 30, 54), 22, 20, leaf_ramp, light_dir=(-0.6, -0.8), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx + 30, 54), 22, 20, leaf_ramp, light_dir=(-0.4, -0.8), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx - 16, 36), 26, 22, leaf_ramp, light_dir=(-0.6, -0.8), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx + 16, 36), 26, 22, leaf_ramp, light_dir=(-0.4, -0.8), outline_color=OUTLINE_DARK)

    # Upper crown / foreground clusters
    draw_shaded_ellipsoid(img, (cx, 26), 26, 18, leaf_ramp, light_dir=(-0.5, -0.9), outline_color=OUTLINE_DARK)

    return apply_selective_outline(img, OUTLINE_DARK)

def render_canopy_oak() -> Image.Image:
    """Generates 128x160 separate oak canopy matching tree_oak upper silhouette for foliage fading."""
    img = create_canvas(128, 160)
    f = PALETTE_FLORA
    cx = 64
    leaf_ramp = [f["leaf_dark"], f["leaf_mid"], f["leaf_light"], f["leaf_bright"]]

    # Renders upper canopy clusters matching tree_oak upper silhouette exactly
    draw_shaded_ellipsoid(img, (cx - 24, 68), 28, 24, leaf_ramp, light_dir=(-0.5, -0.85), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx + 24, 68), 28, 24, leaf_ramp, light_dir=(-0.5, -0.85), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx, 50), 34, 28, leaf_ramp, light_dir=(-0.5, -0.85), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx - 30, 54), 22, 20, leaf_ramp, light_dir=(-0.6, -0.8), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx + 30, 54), 22, 20, leaf_ramp, light_dir=(-0.4, -0.8), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx - 16, 36), 26, 22, leaf_ramp, light_dir=(-0.6, -0.8), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx + 16, 36), 26, 22, leaf_ramp, light_dir=(-0.4, -0.8), outline_color=OUTLINE_DARK)
    draw_shaded_ellipsoid(img, (cx, 26), 26, 18, leaf_ramp, light_dir=(-0.5, -0.9), outline_color=OUTLINE_DARK)

    return apply_selective_outline(img, OUTLINE_DARK)

def render_house_aqualia() -> Image.Image:
    """
    Generates 192x160 Aqualia river cottage matching 3x2 solid footprint.
    Features river-timber framework, stone plinth, pitched thatch/shingle roof,
    timber door, teal curtains, leaded-glass windows, and wharf lantern.
    """
    img = create_canvas(192, 160)
    draw = ImageDraw.Draw(img)
    aq = PALETTE_AQUALIA
    f = PALETTE_FLORA
    cx, ground_y = 96, 150
    w = 168

    # 1. Stone foundation plinth with mortar courses
    draw_shaded_rect(img, cx - (w // 2), ground_y - 16, w, 16, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)
    for row in [ground_y - 12, ground_y - 6]:
        draw_pixel_line(img, cx - (w // 2) + 1, row, cx + (w // 2) - 1, row, aq["stone_canal_shadow"])
    for sx in range(cx - (w // 2) + 12, cx + (w // 2) - 8, 18):
        draw_pixel_line(img, sx, ground_y - 16, sx, ground_y - 12, aq["stone_canal_shadow"])
        draw_pixel_line(img, sx + 9, ground_y - 12, sx + 9, ground_y - 6, aq["stone_canal_shadow"])
        draw_pixel_line(img, sx, ground_y - 6, sx, ground_y, aq["stone_canal_shadow"])
    # Water-line algae & moss
    for mx in range(cx - (w // 2) + 4, cx + (w // 2) - 4, 14):
        draw_pixel(img, mx, ground_y - 1, f["leaf_mid"])
        draw_pixel(img, mx + 1, ground_y - 2, f["leaf_light"])

    # 2. Weathered timber wall facade with framing posts and cross braces
    draw_shaded_rect(img, cx - (w // 2) + 4, ground_y - 74, w - 8, 58, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    for py in range(ground_y - 70, ground_y - 18, 8):
        draw_pixel_line(img, cx - (w // 2) + 6, py, cx + (w // 2) - 6, py, aq["timber_shadow"])
        draw_pixel_line(img, cx - (w // 2) + 6, py + 1, cx + (w // 2) - 6, py + 1, aq["timber_highlight"])
    for post_x in [cx - 68, cx - 26, cx + 26, cx + 68]:
        draw_shaded_rect(img, post_x - 3, ground_y - 74, 6, 58, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
        draw_pixel(img, post_x, ground_y - 70, OUTLINE_DARK)
        draw_pixel(img, post_x, ground_y - 20, OUTLINE_DARK)
    draw.line([(cx - 68, ground_y - 20), (cx - 26, ground_y - 70)], fill=aq["timber_shadow"], width=2)
    draw.line([(cx + 26, ground_y - 70), (cx + 68, ground_y - 20)], fill=aq["timber_shadow"], width=2)

    # 3. Pitched Gable Shingle Roof with textured courses
    roof_w = w + 12
    draw_shaded_rect(img, cx - (roof_w // 2), 34, roof_w, 46, aq["reed_shadow"], aq["reed_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - (roof_w // 2) + 8, 20, roof_w - 16, 24, aq["reed_mid"], aq["reed_bright"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 36, 10, 72, 14, aq["reed_bright"], aq["reed_mid"], OUTLINE_DARK)
    for sy in range(38, 76, 6):
        draw_pixel_line(img, cx - (roof_w // 2) + 4, sy, cx + (roof_w // 2) - 4, sy, aq["reed_shadow"])
        for sx in range(cx - (roof_w // 2) + 8, cx + (roof_w // 2) - 8, 12):
            draw_pixel_line(img, sx, sy, sx, sy + 5, aq["reed_shadow"])
            draw_pixel(img, sx + 2, sy + 1, aq["reed_bright"])
    # Moss clumps on thatch
    for rx, ry in [(cx - 40, 42), (cx - 36, 44), (cx + 30, 48), (cx + 34, 46)]:
        draw_pixel(img, rx, ry, f["leaf_light"])

    # 4. Paneled River-Timber Door
    door_w, door_h = 24, 40
    draw_shaded_rect(img, cx - (door_w // 2), ground_y - 16 - door_h, door_w, door_h, aq["timber_dark"], aq["timber_shadow"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 8, ground_y - 16 - door_h + 4, 16, 14, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 8, ground_y - 16 - door_h + 22, 16, 14, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    draw_pixel(img, cx + 5, ground_y - 16 - 18, aq["brass_bright"])
    # Teal door awning
    draw_shaded_rect(img, cx - (door_w // 2) - 4, ground_y - 16 - door_h - 6, door_w + 8, 6, aq["cloth_teal_mid"], aq["cloth_teal_bright"], OUTLINE_DARK)

    # 5. Windows with Leaded Glass & Warm Interior Glow
    for win_x in [cx - 47, cx + 47]:
        win_w, win_h = 22, 26
        draw_shaded_rect(img, win_x - (win_w // 2), ground_y - 16 - 36, win_w, win_h, aq["cloth_teal_shadow"], aq["cloth_teal_mid"], OUTLINE_DARK)
        draw_shaded_rect(img, win_x - (win_w // 2) + 3, ground_y - 16 - 33, win_w - 6, win_h - 6, (245, 190, 75, 255), (255, 225, 120, 255), OUTLINE_DARK)
        draw.line([(win_x, ground_y - 16 - 33), (win_x, ground_y - 16 - 13)], fill=OUTLINE_DARK)
        draw.line([(win_x - 7, ground_y - 16 - 23), (win_x + 7, ground_y - 16 - 23)], fill=OUTLINE_DARK)
        # Planter box with blooming flora
        draw_shaded_rect(img, win_x - (win_w // 2) - 2, ground_y - 16 - 10, win_w + 4, 6, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
        for fx in range(win_x - 8, win_x + 9, 4):
            draw_pixel(img, fx, ground_y - 16 - 11, f["nectar_gold"])
            draw_pixel(img, fx + 1, ground_y - 16 - 12, f["leaf_bright"])

    # 6. Brass Wharf Lantern with warm light halo
    lx, ly = cx - (w // 2) + 10, ground_y - 54
    draw_pixel_line(img, lx, ly, lx + 6, ly - 4, aq["brass_mid"])
    draw_shaded_rect(img, lx + 4, ly - 3, 6, 9, aq["brass_shadow"], aq["brass_bright"], OUTLINE_DARK)
    draw_pixel(img, lx + 7, ly, (255, 245, 160, 255))
    for hx, hy in [(lx + 7, ly - 1), (lx + 6, ly), (lx + 8, ly), (lx + 7, ly + 1)]:
        draw_pixel(img, hx, hy, (255, 220, 100, 120))

    return apply_selective_outline(img, OUTLINE_DARK)

def render_landmark_well() -> Image.Image:
    """Generates 64x80 stone well with timber roof, crank, coiled rope, and water bucket."""
    img = create_canvas(64, 80)
    aq = PALETTE_AQUALIA
    cx, ground_y = 32, 74

    # 1. Circular stone well curb with individual stone relief
    curb_w, curb_h = 42, 22
    draw_shaded_rect(img, cx - (curb_w // 2), ground_y - curb_h, curb_w, curb_h, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)
    for sy in [ground_y - curb_h + 4, ground_y - curb_h + 12]:
        for sx in range(cx - (curb_w // 2) + 4, cx + (curb_w // 2) - 4, 8):
            draw_pixel(img, sx, sy, aq["stone_canal_bright"])
            draw_pixel(img, sx + 1, sy + 1, aq["stone_canal_shadow"])
    # Deep water interior with caustic gleam
    draw_shaded_rect(img, cx - (curb_w // 2) + 4, ground_y - curb_h + 2, curb_w - 8, 6, aq["water_deep"], aq["water_mid"], None)
    draw_pixel_line(img, cx - 10, ground_y - curb_h + 4, cx + 10, ground_y - curb_h + 4, aq["water_caustic"])

    # 2. Side timber support posts
    draw_shaded_rect(img, cx - 17, ground_y - 56, 4, 36, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 13, ground_y - 56, 4, 36, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)

    # 3. Timber crossbeam, coiled hemp rope, and hanging line
    draw_shaded_rect(img, cx - 17, ground_y - 54, 34, 6, aq["timber_mid"], aq["timber_highlight"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 6, ground_y - 52, 12, 7, aq["reed_shadow"], aq["reed_mid"], OUTLINE_DARK)
    draw_pixel_line(img, cx, ground_y - 45, cx, ground_y - 28, aq["reed_mid"])

    # 4. Small iron-banded wooden bucket
    draw_shaded_rect(img, cx - 4, ground_y - 28, 8, 8, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_pixel_line(img, cx - 4, ground_y - 26, cx + 3, ground_y - 26, aq["brass_shadow"])
    draw_pixel_line(img, cx - 4, ground_y - 22, cx + 3, ground_y - 22, aq["brass_shadow"])

    # 5. Pitched timber shingle rooflet
    roof_w = 46
    draw_shaded_rect(img, cx - (roof_w // 2), ground_y - 68, roof_w, 14, aq["reed_shadow"], aq["reed_bright"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 12, ground_y - 71, 24, 4, aq["reed_bright"], aq["reed_mid"], OUTLINE_DARK)

    return apply_selective_outline(img, OUTLINE_DARK)

def render_landmark_waystone() -> Image.Image:
    """Generates 64x96 carved river stone megalith with glowing teal nautical runes."""
    img = create_canvas(64, 96)
    aq = PALETTE_AQUALIA
    cx, ground_y = 32, 90

    # 1. Carved monolithic river stone body
    stone_w = 32
    draw_shaded_rect(img, cx - (stone_w // 2), ground_y - 70, stone_w, 70, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 11, ground_y - 78, 22, 10, aq["stone_canal_mid"], aq["stone_canal_bright"], OUTLINE_DARK)
    # Weathered fissures
    draw_pixel_line(img, cx - 6, ground_y - 64, cx - 10, ground_y - 50, OUTLINE_DARK)
    draw_pixel_line(img, cx + 7, ground_y - 30, cx + 11, ground_y - 18, OUTLINE_DARK)

    # 2. Engraved glowing teal nautical runes & wind-rose
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
    aq = PALETTE_AQUALIA
    f = PALETTE_FLORA
    cx, ground_y = 32, 58

    # 1. Fieldstone hearth base
    base_w, base_h = 42, 26
    draw_shaded_rect(img, cx - (base_w // 2), ground_y - base_h, base_w, base_h, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)

    # 2. Hearth firebox arched opening
    draw_shaded_rect(img, cx - 12, ground_y - 18, 24, 18, OUTLINE_DARK, aq["stone_canal_shadow"], None)

    # 3. Glowing embers and fire
    draw_shaded_rect(img, cx - 8, ground_y - 6, 16, 6, f["burnt_ember"], (255, 180, 40, 255), None)
    draw_pixel(img, cx - 2, ground_y - 8, (255, 230, 90, 255))
    draw_pixel(img, cx + 2, ground_y - 10, f["burnt_ember"])
    draw_pixel(img, cx, ground_y - 12, (255, 240, 150, 255))

    # 4. Copper cooking kettle suspended over fire
    draw_shaded_rect(img, cx - 6, ground_y - 16, 12, 8, (140, 78, 51, 255), (199, 119, 78, 255), OUTLINE_DARK)
    draw_pixel_line(img, cx - 5, ground_y - 17, cx + 5, ground_y - 17, OUTLINE_DARK)
    draw_pixel(img, cx - 2, ground_y - 14, (230, 160, 120, 255))

    # 5. Short stone chimney vent
    draw_shaded_rect(img, cx - 7, ground_y - base_h - 12, 14, 14, aq["stone_canal_shadow"], aq["stone_canal_mid"], OUTLINE_DARK)

    return apply_selective_outline(img, OUTLINE_DARK)
