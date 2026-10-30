"""
Procedural Flora and Resource Node Generator for Hearthwild HD Presentation.
Generates 6 plant families across 3 states (healthy, harvested, burnt) = 18 sprites,
plus harvestable nodes (ore, flint, stick, pebbles).
"""

from typing import Dict, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_FLORA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect, apply_selective_outline
)

def render_flora_berries(state: str) -> Image.Image:
    """Generates 48x48 berry bush sprite in healthy, harvested, or burnt state."""
    img = create_canvas(48, 48)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    cx, cy = 24, 28

    if state == "healthy":
        # 1. Foliage bush volume
        draw_shaded_rect(img, cx - 14, cy - 10, 28, 22, f["leaf_dark"], f["leaf_mid"], OUTLINE_DARK)
        draw_shaded_rect(img, cx - 11, cy - 14, 22, 14, f["leaf_mid"], f["leaf_light"], None)
        draw_shaded_rect(img, cx - 7, cy - 16, 14, 8, f["leaf_light"], f["leaf_bright"], None)
        # 2. Clusters of ripe red berries
        berry_locs = [
            (cx - 8, cy - 8), (cx - 4, cy - 6), (cx + 5, cy - 8), (cx + 8, cy - 4),
            (cx - 6, cy + 2), (cx + 2, cy + 3), (cx + 6, cy + 5), (cx - 1, cy - 12)
        ]
        for bx, by in berry_locs:
            draw_pixel(img, bx, by, f["berry_bright"])
            draw_pixel(img, bx + 1, by, f["berry_mid"])
            draw_pixel(img, bx, by + 1, f["berry_dark"])
            draw_pixel(img, bx - 1, by, OUTLINE_DARK)

    elif state == "harvested":
        # Bush with leaves, but stripped of berries, showing stems
        draw_shaded_rect(img, cx - 12, cy - 8, 24, 20, f["leaf_dark"], f["leaf_mid"], OUTLINE_DARK)
        draw_shaded_rect(img, cx - 9, cy - 12, 18, 12, f["leaf_mid"], f["leaf_light"], None)
        # Bare green stems
        draw_pixel_line(img, cx - 6, cy - 8, cx - 8, cy - 12, f["leaf_bright"])
        draw_pixel_line(img, cx + 4, cy - 6, cx + 7, cy - 10, f["leaf_bright"])
        draw_pixel_line(img, cx - 2, cy - 4, cx, cy - 10, f["leaf_bright"])

    elif state == "burnt":
        # Charred skeletal branches with ash and faint glowing embers
        draw_shaded_rect(img, cx - 10, cy - 6, 20, 16, f["burnt_charcoal"], f["burnt_shadow"], OUTLINE_DARK)
        draw_pixel_line(img, cx, cy + 6, cx - 7, cy - 10, f["burnt_ash"])
        draw_pixel_line(img, cx, cy + 6, cx + 7, cy - 10, f["burnt_ash"])
        draw_pixel_line(img, cx - 3, cy - 2, cx - 9, cy - 6, f["burnt_shadow"])
        draw_pixel_line(img, cx + 3, cy - 2, cx + 9, cy - 6, f["burnt_shadow"])
        # Glowing embers
        draw_pixel(img, cx - 2, cy + 1, f["burnt_ember"])
        draw_pixel(img, cx + 4, cy + 3, f["burnt_ember"])

    return apply_selective_outline(img, OUTLINE_DARK)

def render_flora_reeds(state: str) -> Image.Image:
    """Generates 48x64 wetland reeds sprite in healthy, harvested, or burnt state."""
    img = create_canvas(48, 64)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    cx, ground_y = 24, 56

    if state == "healthy":
        # 1. Tall slender reed stalks
        stalk_offsets = [-10, -5, -1, 4, 9]
        for idx, ox in enumerate(stalk_offsets):
            h = 36 + (idx % 3) * 6
            top_y = ground_y - h
            draw_pixel_line(img, cx + ox, ground_y, cx + ox + (1 if idx % 2 else -1), top_y, f["reed_stem_mid"])
            draw_pixel_line(img, cx + ox + 1, ground_y, cx + ox + (2 if idx % 2 else 0), top_y, f["reed_stem_dark"])
            # Cattail plume at tip
            draw_shaded_rect(img, cx + ox - 1, top_y, 4, 12, f["cattail_brown"], f["cattail_light"], OUTLINE_DARK)
            draw_pixel(img, cx + ox, top_y - 2, f["reed_stem_light"])  # reed spike

    elif state == "harvested":
        # Cut reed stalks near ground
        stalk_offsets = [-10, -5, -1, 4, 9]
        for ox in stalk_offsets:
            h = 10 + (abs(ox) % 4) * 3
            draw_pixel_line(img, cx + ox, ground_y, cx + ox, ground_y - h, f["reed_stem_mid"])
            draw_pixel(img, cx + ox, ground_y - h, f["reed_stem_light"])

    elif state == "burnt":
        # Scorched reed stumps with ash
        stalk_offsets = [-8, -4, 0, 5, 8]
        for ox in stalk_offsets:
            h = 6 + (abs(ox) % 3) * 2
            draw_pixel_line(img, cx + ox, ground_y, cx + ox, ground_y - h, f["burnt_charcoal"])
            draw_pixel(img, cx + ox, ground_y - h, f["burnt_ash"])
        draw_pixel(img, cx - 2, ground_y - 2, f["burnt_ember"])

    return apply_selective_outline(img, OUTLINE_DARK)

def render_flora_wheat(state: str) -> Image.Image:
    """Generates 48x64 golden wheat sheaf in healthy, harvested, or burnt state."""
    img = create_canvas(48, 64)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    cx, ground_y = 24, 56

    if state == "healthy":
        # Swaying golden grain stalks
        for ox in range(-12, 13, 4):
            h = 32 + abs(ox) % 8
            top_y = ground_y - h
            draw_pixel_line(img, cx + ox, ground_y, cx + ox // 2, top_y, f["wheat_dark"])
            draw_shaded_rect(img, cx + ox // 2 - 2, top_y - 6, 5, 10, f["wheat_mid"], f["wheat_gold"], OUTLINE_DARK)
            draw_pixel(img, cx + ox // 2, top_y - 8, f["wheat_highlight"])

    elif state == "harvested":
        # Clipped stubble sheaf tied at base
        draw_shaded_rect(img, cx - 8, ground_y - 14, 16, 14, f["wheat_dark"], f["wheat_mid"], OUTLINE_DARK)
        draw_pixel_line(img, cx - 7, ground_y - 8, cx + 7, ground_y - 8, f["cattail_brown"])  # tie cord

    elif state == "burnt":
        # Scorched black stubble
        draw_shaded_rect(img, cx - 7, ground_y - 10, 14, 10, f["burnt_charcoal"], f["burnt_shadow"], OUTLINE_DARK)
        draw_pixel(img, cx + 1, ground_y - 6, f["burnt_ember"])

    return apply_selective_outline(img, OUTLINE_DARK)

def render_flora_nectar(state: str) -> Image.Image:
    """Generates 48x48 nectar blossom in healthy, harvested, or burnt state."""
    img = create_canvas(48, 48)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    cx, cy = 24, 28

    if state == "healthy":
        # Stem and leaves
        draw_pixel_line(img, cx, cy + 14, cx, cy + 4, f["leaf_dark"])
        draw_shaded_rect(img, cx - 8, cy + 8, 6, 4, f["leaf_mid"], f["leaf_light"], OUTLINE_DARK)
        draw_shaded_rect(img, cx + 2, cy + 6, 6, 4, f["leaf_mid"], f["leaf_light"], OUTLINE_DARK)
        # Petals
        draw_shaded_rect(img, cx - 10, cy - 8, 20, 14, f["nectar_petal_dark"], f["nectar_petal_mid"], OUTLINE_DARK)
        draw_shaded_rect(img, cx - 6, cy - 12, 12, 8, f["nectar_petal_mid"], f["nectar_petal_light"], OUTLINE_DARK)
        # Golden nectar bead
        draw_shaded_rect(img, cx - 3, cy - 4, 6, 6, f["nectar_gold"], f["wheat_highlight"], OUTLINE_DARK)

    elif state == "harvested":
        # Bloom with center cup drained
        draw_pixel_line(img, cx, cy + 14, cx, cy + 4, f["leaf_dark"])
        draw_shaded_rect(img, cx - 10, cy - 8, 20, 14, f["nectar_petal_dark"], f["nectar_petal_mid"], OUTLINE_DARK)
        draw_shaded_rect(img, cx - 6, cy - 12, 12, 8, f["nectar_petal_mid"], f["nectar_petal_light"], OUTLINE_DARK)
        # Empty center well
        draw_pixel(img, cx, cy - 2, f["nectar_petal_dark"])

    elif state == "burnt":
        # Scorched curled petals
        draw_shaded_rect(img, cx - 8, cy - 6, 16, 12, f["burnt_charcoal"], f["burnt_shadow"], OUTLINE_DARK)
        draw_pixel(img, cx, cy - 1, f["burnt_ember"])

    return apply_selective_outline(img, OUTLINE_DARK)

def render_flora_ashgrass(state: str) -> Image.Image:
    """Generates 48x48 silvery ashgrass tuft with bioluminescent tips."""
    img = create_canvas(48, 48)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    cx, ground_y = 24, 40

    if state == "healthy":
        for ox in range(-10, 11, 3):
            h = 16 + abs(ox) % 7
            top_y = ground_y - h
            draw_pixel_line(img, cx + ox, ground_y, cx + ox + (ox // 3), top_y, f["ashgrass_mid"])
            draw_pixel(img, cx + ox + (ox // 3), top_y, f["ashgrass_cyan"])  # Glowing tip
            draw_pixel(img, cx + ox + (ox // 3), top_y + 1, f["ashgrass_light"])

    elif state == "harvested":
        for ox in range(-8, 9, 3):
            h = 8 + abs(ox) % 4
            top_y = ground_y - h
            draw_pixel_line(img, cx + ox, ground_y, cx + ox, top_y, f["ashgrass_dark"])
            draw_pixel(img, cx + ox, top_y, f["ashgrass_mid"])

    elif state == "burnt":
        for ox in range(-6, 7, 3):
            h = 5 + abs(ox) % 3
            draw_pixel_line(img, cx + ox, ground_y, cx + ox, ground_y - h, f["burnt_charcoal"])
            draw_pixel(img, cx + ox, ground_y - h, f["burnt_ash"])

    return apply_selective_outline(img, OUTLINE_DARK)

def render_flora_fungi(state: str) -> Image.Image:
    """Generates 48x48 turquoise shelf mushroom caps in healthy, harvested, or burnt state."""
    img = create_canvas(48, 48)
    draw = ImageDraw.Draw(img)
    f = PALETTE_FLORA
    cx, ground_y = 24, 38

    if state == "healthy":
        # Stalk
        draw_shaded_rect(img, cx - 4, ground_y - 12, 8, 12, f["fungi_stem"], f["leaf_dark"], OUTLINE_DARK)
        # Lower shelf cap
        draw_shaded_rect(img, cx - 12, ground_y - 12, 14, 6, f["fungi_cap_dark"], f["fungi_cap_mid"], OUTLINE_DARK)
        draw_pixel_line(img, cx - 12, ground_y - 7, cx + 1, ground_y - 7, f["fungi_cap_bright"])
        # Upper large shelf cap
        draw_shaded_rect(img, cx - 8, ground_y - 20, 18, 9, f["fungi_cap_dark"], f["fungi_cap_mid"], OUTLINE_DARK)
        draw_pixel_line(img, cx - 8, ground_y - 12, cx + 9, ground_y - 12, f["fungi_cap_bright"])

    elif state == "harvested":
        # Cut stalk with spore base
        draw_shaded_rect(img, cx - 4, ground_y - 6, 8, 6, f["fungi_stem"], f["leaf_dark"], OUTLINE_DARK)
        draw_pixel(img, cx - 2, ground_y - 6, f["fungi_cap_mid"])

    elif state == "burnt":
        # Desiccated black fungus crust
        draw_shaded_rect(img, cx - 6, ground_y - 8, 12, 8, f["burnt_charcoal"], f["burnt_shadow"], OUTLINE_DARK)
        draw_pixel(img, cx, ground_y - 4, f["burnt_ash"])

    return apply_selective_outline(img, OUTLINE_DARK)
