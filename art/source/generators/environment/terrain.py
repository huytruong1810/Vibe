"""
Procedural Terrain and Shoreline Mask Generator for Hearthwild HD Presentation.
Generates 64x64 terrain tiles (grass, dirt, sand, freshwater), 14 freshwater shoreline masks,
64x16 cliff strips, and 64x64 ramps.
"""

import math
from typing import Dict, List, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_TERRAIN, hex_to_rgba
)
from ..core.geometry import create_canvas, draw_pixel, draw_shaded_rect

TILE_SIZE = 64

def _pseudo_noise(x: int, y: int, seed: int = 42) -> float:
    """Deterministic 2D noise in [0.0, 1.0] using integer hashing."""
    n = (x * 374761393 + y * 668265263 + seed * 9999991) & 0xFFFFFFFF
    n = ((n ^ (n >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0x7FFFFFFF) / float(0x7FFFFFFF)

def render_ground_grass(seed: int = 101) -> Image.Image:
    """Generates seamless 64x64 grass tile with organic blade texturing."""
    img = create_canvas(TILE_SIZE, TILE_SIZE)
    t = PALETTE_TERRAIN
    
    # 1. Base midtone grass
    for y in range(TILE_SIZE):
        for x in range(TILE_SIZE):
            val = _pseudo_noise(x, y, seed)
            if val < 0.25:
                color = t["grass_shadow"]
            elif val < 0.70:
                color = t["grass_mid"]
            elif val < 0.90:
                color = t["grass_light"]
            else:
                color = t["grass_highlight"]
            draw_pixel(img, x, y, color)

    # 2. Organic blade clusters
    draw = ImageDraw.Draw(img)
    for y in range(2, TILE_SIZE - 2, 6):
        for x in range(2, TILE_SIZE - 2, 6):
            if _pseudo_noise(x, y, seed + 10) > 0.45:
                # Vertical/diagonal grass tuft (2-3 pixels tall)
                draw.line([(x, y), (x, y - 2)], fill=t["grass_highlight"])
                draw.line([(x + 1, y), (x + 2, y - 3)], fill=t["grass_light"])
                draw.point((x, y + 1), fill=t["grass_deep"])

    return img

def render_ground_dirt(seed: int = 202) -> Image.Image:
    """Generates seamless 64x64 rich loam dirt tile with small pebbles."""
    img = create_canvas(TILE_SIZE, TILE_SIZE)
    t = PALETTE_TERRAIN
    
    for y in range(TILE_SIZE):
        for x in range(TILE_SIZE):
            val = _pseudo_noise(x, y, seed)
            if val < 0.20:
                color = t["dirt_deep"]
            elif val < 0.55:
                color = t["dirt_shadow"]
            elif val < 0.85:
                color = t["dirt_mid"]
            else:
                color = t["dirt_light"]
            draw_pixel(img, x, y, color)

    # Small scattered river pebbles
    for y in range(4, TILE_SIZE - 4, 8):
        for x in range(4, TILE_SIZE - 4, 8):
            if _pseudo_noise(x, y, seed + 20) > 0.70:
                draw_pixel(img, x, y, t["dirt_pebble"])
                draw_pixel(img, x + 1, y, t["dirt_light"])
                draw_pixel(img, x, y + 1, t["dirt_deep"])

    return img

def render_ground_sand(seed: int = 303) -> Image.Image:
    """Generates seamless 64x64 pale river sand tile with gentle ripples."""
    img = create_canvas(TILE_SIZE, TILE_SIZE)
    t = PALETTE_TERRAIN
    
    for y in range(TILE_SIZE):
        for x in range(TILE_SIZE):
            # Subtle horizontal wave ripple
            ripple = math.sin((x + y * 0.5) * 0.25) * 0.15
            val = _pseudo_noise(x, y, seed) + ripple
            if val < 0.35:
                color = t["sand_shadow"]
            elif val < 0.80:
                color = t["sand_mid"]
            else:
                color = t["sand_light"]
            draw_pixel(img, x, y, color)

    return img

def render_ground_freshwater(seed: int = 404) -> Image.Image:
    """Generates seamless 64x64 clear river freshwater tile with caustics."""
    img = create_canvas(TILE_SIZE, TILE_SIZE)
    t = PALETTE_TERRAIN
    
    for y in range(TILE_SIZE):
        for x in range(TILE_SIZE):
            # Gentle diagonal wave caustics
            caustic = math.sin((x * 0.18 + y * 0.12) + math.cos(x * 0.1 - y * 0.15)) * 0.5 + 0.5
            noise = _pseudo_noise(x, y, seed) * 0.3
            val = caustic + noise
            if val < 0.35:
                color = t["water_deep"]
            elif val < 0.65:
                color = t["water_mid"]
            elif val < 0.88:
                color = t["water_surface"]
            else:
                color = t["water_caustic"]
            draw_pixel(img, x, y, color)

    return img

def render_shore_freshwater_mask(mask: int, seed: int = 505) -> Image.Image:
    """
    Generates 64x64 transparent transition overlay for freshwater shoreline.
    Convention: NW = 1, NE = 2, SW = 4, SE = 8.
    Mask 0 = empty, Mask 15 = full water.
    Masks 1..14 = directional shoreline transitions with organic foam and caustic rim.
    """
    img = create_canvas(TILE_SIZE, TILE_SIZE)
    if mask <= 0 or mask >= 15:
        return img

    nw = bool(mask & 1)
    ne = bool(mask & 2)
    sw = bool(mask & 4)
    se = bool(mask & 8)

    t = PALETTE_TERRAIN
    half = TILE_SIZE // 2

    # Corner anchors in normalized [0, 1]
    # For each pixel, calculate distance to nearest land or water field
    for y in range(TILE_SIZE):
        ny = y / float(TILE_SIZE - 1)
        for x in range(TILE_SIZE):
            nx = x / float(TILE_SIZE - 1)
            
            # Bilinear interpolation of corner water presence [0.0..1.0]
            val = (
                (1.0 - nx) * (1.0 - ny) * float(nw) +
                nx * (1.0 - ny) * float(ne) +
                (1.0 - nx) * ny * float(sw) +
                nx * ny * float(se)
            )
            
            # Add subtle organic shoreline noise perturbation
            perturb = (_pseudo_noise(x, y, seed) - 0.5) * 0.18
            effective_val = val + perturb

            # Threshold for water vs land transition
            # > 0.5 = water, 0.40..0.50 = foam fringe, < 0.40 = transparent land
            if effective_val >= 0.50:
                caustic = math.sin((x * 0.2 + y * 0.15)) * 0.5 + 0.5
                if effective_val > 0.75:
                    color = t["water_surface"] if caustic > 0.4 else t["water_mid"]
                else:
                    color = t["water_surface"]
                draw_pixel(img, x, y, color)
            elif effective_val >= 0.38:
                # Shoreline foam fringe
                draw_pixel(img, x, y, t["water_foam"])
            elif effective_val >= 0.32:
                # Faint translucent wet shore rim
                draw_pixel(img, x, y, (137, 224, 220, 110))

    return img

def render_cliff_grass(seed: int = 606) -> Image.Image:
    """Generates 64x16 vertical elevation cliff strip with overhanging grass."""
    img = create_canvas(TILE_SIZE, 16)
    t = PALETTE_TERRAIN
    
    # 1. Stratified stone cliff body (rows 4..15)
    for y in range(4, 16):
        for x in range(TILE_SIZE):
            val = _pseudo_noise(x, y, seed)
            # Stratified horizontal bands
            band = (y + int(math.sin(x * 0.2) * 1.5)) % 4
            if y == 15:
                color = OUTLINE_DARK  # Base shadow contact
            elif band == 0 or val < 0.25:
                color = t["cliff_stone_dark"]
            elif band == 1 or val < 0.65:
                color = t["cliff_stone_mid"]
            else:
                color = t["cliff_stone_light"]
            draw_pixel(img, x, y, color)

    # 2. Overhanging grass fringe (rows 0..4)
    for x in range(TILE_SIZE):
        fringe_h = 3 + int(_pseudo_noise(x, 0, seed + 1) * 2.5)
        for y in range(min(fringe_h, 5)):
            if y == 0:
                color = t["grass_light"]
            elif y == 1:
                color = t["grass_mid"]
            elif y == fringe_h - 1:
                color = t["grass_deep"]
            else:
                color = t["grass_shadow"]
            draw_pixel(img, x, y, color)

    return img

def render_ramp_grass(seed: int = 707) -> Image.Image:
    """Generates 64x64 ramp connecting two elevation tiers with timber steps."""
    img = create_canvas(TILE_SIZE, TILE_SIZE)
    t = PALETTE_TERRAIN
    
    # 1. Earthen ramp incline in center (x: 6..57, y: 0..63)
    for y in range(TILE_SIZE):
        for x in range(6, 58):
            val = _pseudo_noise(x, y, seed)
            step_y = y % 8
            if step_y == 7:
                # Timber riser step shadow
                color = t["ramp_wood_dark"]
            elif step_y == 6:
                # Timber riser edge
                color = t["ramp_wood_mid"]
            elif step_y == 0:
                # Timber step highlight
                color = t["ramp_wood_light"]
            elif val < 0.5:
                color = t["dirt_mid"]
            else:
                color = t["dirt_light"]
            draw_pixel(img, x, y, color)

    # 2. Left retaining stone wall (x: 0..5)
    for y in range(TILE_SIZE):
        for x in range(6):
            val = _pseudo_noise(x, y, seed + 5)
            if x == 0 or x == 5:
                color = t["cliff_stone_dark"]
            elif val < 0.5:
                color = t["cliff_stone_mid"]
            else:
                color = t["cliff_stone_light"]
            draw_pixel(img, x, y, color)

    # 3. Right retaining stone wall (x: 58..63)
    for y in range(TILE_SIZE):
        for x in range(58, 64):
            val = _pseudo_noise(x, y, seed + 6)
            if x == 58 or x == 63:
                color = t["cliff_stone_dark"]
            elif val < 0.5:
                color = t["cliff_stone_mid"]
            else:
                color = t["cliff_stone_light"]
            draw_pixel(img, x, y, color)

    return img

