"""
Pixel-perfect geometric rasterization, cluster shading, and outline utilities for PIL pixel art.
"""

from typing import List, Tuple, Optional
from PIL import Image, ImageDraw
import numpy as np
from .palette import RGBA, CLEAR, OUTLINE_DARK

# 2x2 Bayer Dither Matrix for retro JRPG texture transitions
BAYER_2X2 = [
    [0, 2],
    [3, 1]
]

def create_canvas(width: int, height: int, fill: RGBA = CLEAR) -> Image.Image:
    """Create a new transparent RGBA canvas."""
    return Image.new("RGBA", (width, height), fill)

def draw_pixel(image: Image.Image, x: int, y: int, color: RGBA):
    """Safely plot a single pixel if within image boundaries."""
    if 0 <= x < image.width and 0 <= y < image.height:
        image.putpixel((x, y), color)

def draw_pixel_line(image: Image.Image, x0: int, y0: int, x1: int, y1: int, color: RGBA):
    """Draw a Bresenham pixel-perfect line."""
    dx = abs(x1 - x0)
    dy = abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx - dy

    while True:
        draw_pixel(image, x0, y0, color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x0 += sx
        if e2 < dx:
            err += dx
            y0 += sy

def draw_shaded_rect(
    image: Image.Image,
    x: int,
    y: int,
    w: int,
    h: int,
    fill_color: RGBA,
    highlight_color: Optional[RGBA] = None,
    shadow_color: Optional[RGBA] = None,
    outline_color: Optional[RGBA] = OUTLINE_DARK,
):
    """
    Renders an orthographic rectangular cluster with top/left highlights,
    bottom/right shadows, and pixel outlines.
    """
    draw = ImageDraw.Draw(image)
    # Fill main body
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=fill_color)

    # Apply highlights (top row, left column)
    if highlight_color:
        for xi in range(x + 1, x + w - 1):
            draw_pixel(image, xi, y + 1, highlight_color)
        for yi in range(y + 1, y + h - 1):
            draw_pixel(image, x + 1, yi, highlight_color)

    # Apply shadows (bottom-1 row, right-1 column)
    if shadow_color:
        for xi in range(x + 1, x + w - 1):
            draw_pixel(image, xi, y + h - 2, shadow_color)
        for yi in range(y + 1, y + h - 1):
            draw_pixel(image, x + w - 2, yi, shadow_color)

    # Apply outline
    if outline_color:
        draw.rectangle([x, y, x + w - 1, y + h - 1], outline=outline_color)

def apply_selective_outline(image: Image.Image, outline_color: RGBA = OUTLINE_DARK) -> Image.Image:
    """
    Extracts the alpha boundary of the non-transparent content and
    applies a crisp, single-pixel exterior outline.
    """
    arr = np.array(image)
    alpha = arr[:, :, 3] > 0
    h, w = alpha.shape

    # Find 4-neighborhood exterior boundary
    boundary = np.zeros_like(alpha)
    for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        shifted = np.roll(np.roll(alpha, dy, axis=0), dx, axis=1)
        # Handle wrap-around zeroing
        if dy == 1: shifted[0, :] = False
        elif dy == -1: shifted[-1, :] = False
        if dx == 1: shifted[:, 0] = False
        elif dx == -1: shifted[:, -1] = False
        boundary |= (~alpha & shifted)

    out_arr = arr.copy()
    out_arr[boundary] = outline_color
    return Image.fromarray(out_arr)

def dither_fill(
    image: Image.Image,
    x: int,
    y: int,
    w: int,
    h: int,
    color_a: RGBA,
    color_b: RGBA,
    density: float = 0.5,
):
    """
    Fill an area using an ordered 2x2 Bayer dither pattern between color_a and color_b.
    density: 0.0 (all A) to 1.0 (all B).
    """
    threshold = int(density * 4)
    for yi in range(y, y + h):
        for xi in range(x, x + w):
            bayer_val = BAYER_2X2[yi % 2][xi % 2]
            chosen = color_b if bayer_val < threshold else color_a
            draw_pixel(image, xi, yi, chosen)
