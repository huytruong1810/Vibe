"""
Procedural Interior Furniture and Regional Construction Kit Generator.
Generates tables, chairs, beds, workbenches, shelves, and hearths across
the 3 regional aesthetics (Pyrador basalt/copper, Aqualia river timber/reeds, Zephyria pale wood).
"""

from typing import Dict, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_AQUALIA, PALETTE_TERRAIN, PALETTE_FLORA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect, apply_selective_outline
)

def render_furniture_table_aqualia() -> Image.Image:
    """64x48 River timber dining/study table with nautical runner."""
    img = create_canvas(64, 48)
    aq = PALETTE_AQUALIA
    cx, ground_y = 32, 44
    # Table legs (4 legs)
    draw_shaded_rect(img, cx - 24, ground_y - 20, 6, 20, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 18, ground_y - 20, 6, 20, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 18, ground_y - 24, 5, 20, aq["timber_dark"], aq["timber_shadow"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 13, ground_y - 24, 5, 20, aq["timber_dark"], aq["timber_shadow"], OUTLINE_DARK)
    # Heavy timber tabletop
    draw_shaded_rect(img, cx - 28, ground_y - 32, 56, 14, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    draw_pixel_line(img, cx - 28, ground_y - 32, cx + 27, ground_y - 32, aq["timber_highlight"])
    # Teal woven fabric runner
    draw_shaded_rect(img, cx - 6, ground_y - 32, 12, 18, aq["cloth_teal_mid"], aq["cloth_teal_bright"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_furniture_chair_aqualia() -> Image.Image:
    """32x48 River timber carved chair with reed-cushioned seat."""
    img = create_canvas(32, 48)
    aq = PALETTE_AQUALIA
    cx, ground_y = 16, 44
    # Chair back uprights
    draw_shaded_rect(img, cx - 9, ground_y - 38, 4, 38, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 5, ground_y - 38, 4, 38, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx - 9, ground_y - 38, 18, 6, aq["timber_mid"], aq["timber_highlight"], OUTLINE_DARK)
    # Seat cushion (woven reeds)
    draw_shaded_rect(img, cx - 10, ground_y - 18, 20, 8, aq["reed_shadow"], aq["reed_bright"], OUTLINE_DARK)
    # Front legs
    draw_shaded_rect(img, cx - 9, ground_y - 12, 4, 12, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 5, ground_y - 12, 4, 12, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_furniture_bed_aqualia() -> Image.Image:
    """64x64 River timber framed bed with indigo blanket and reed pillow."""
    img = create_canvas(64, 64)
    aq = PALETTE_AQUALIA
    cx, ground_y = 32, 58
    # Headboard
    draw_shaded_rect(img, cx - 24, ground_y - 48, 48, 22, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    # Reed straw pillow
    draw_shaded_rect(img, cx - 18, ground_y - 38, 36, 12, aq["reed_shadow"], aq["reed_bright"], OUTLINE_DARK)
    # Mattress and Indigo wool blanket
    draw_shaded_rect(img, cx - 22, ground_y - 28, 44, 26, aq["cloth_indigo"], aq["cloth_teal_shadow"], OUTLINE_DARK)
    # Folded teal quilt edge
    draw_shaded_rect(img, cx - 22, ground_y - 28, 44, 8, aq["cloth_teal_mid"], aq["cloth_teal_bright"], OUTLINE_DARK)
    # Footboard frame
    draw_shaded_rect(img, cx - 24, ground_y - 6, 48, 6, aq["timber_dark"], aq["timber_highlight"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_furniture_workbench_aqualia() -> Image.Image:
    """64x48 Sturdy artisan workbench with vice, brass fittings, and drying rack."""
    img = create_canvas(64, 48)
    aq = PALETTE_AQUALIA
    cx, ground_y = 32, 44
    # Robust timber frame legs
    draw_shaded_rect(img, cx - 26, ground_y - 24, 8, 24, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 18, ground_y - 24, 8, 24, aq["timber_dark"], aq["timber_mid"], OUTLINE_DARK)
    # Stretcher bar with stored timber planks
    draw_shaded_rect(img, cx - 18, ground_y - 10, 36, 6, aq["timber_dark"], aq["timber_shadow"], OUTLINE_DARK)
    # Heavy plank bench top
    draw_shaded_rect(img, cx - 28, ground_y - 32, 56, 12, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    draw_pixel_line(img, cx - 28, ground_y - 32, cx + 27, ground_y - 32, aq["timber_highlight"])
    # Brass clamp vice on left edge
    draw_shaded_rect(img, cx - 28, ground_y - 36, 8, 8, aq["brass_shadow"], aq["brass_bright"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)

def render_furniture_shelf_aqualia() -> Image.Image:
    """48x64 Upright timber bookcase / apothecary shelf with jars and scrolls."""
    img = create_canvas(48, 64)
    aq = PALETTE_AQUALIA
    cx, ground_y = 24, 60
    # Outer frame
    draw_shaded_rect(img, cx - 20, ground_y - 54, 40, 54, aq["timber_dark"], aq["timber_shadow"], OUTLINE_DARK)
    # 3 Shelf tiers
    for sy in [ground_y - 40, ground_y - 26, ground_y - 12]:
        draw_shaded_rect(img, cx - 18, sy, 36, 4, aq["timber_mid"], aq["timber_highlight"], OUTLINE_DARK)
    # Tier 1 items: Glass reagent jars
    draw_shaded_rect(img, cx - 14, ground_y - 50, 8, 10, aq["water_mid"], aq["water_caustic"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 4, ground_y - 50, 10, 10, aq["cloth_teal_mid"], aq["cloth_teal_bright"], OUTLINE_DARK)
    # Tier 2 items: Tied parchment scrolls and books
    draw_shaded_rect(img, cx - 14, ground_y - 36, 12, 10, aq["reed_shadow"], aq["reed_bright"], OUTLINE_DARK)
    draw_shaded_rect(img, cx + 2, ground_y - 36, 14, 10, aq["cloth_indigo"], aq["cloth_teal_shadow"], OUTLINE_DARK)
    # Tier 3 items: Storage crates
    draw_shaded_rect(img, cx - 14, ground_y - 22, 28, 10, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    return apply_selective_outline(img, OUTLINE_DARK)
