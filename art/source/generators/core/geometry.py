"""
Pixel-perfect geometric rasterization, cluster shading, and outline utilities for PIL pixel art.
"""

from typing import List, Tuple, Optional, Dict
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

def draw_shaded_ellipsoid(
    image: Image.Image,
    center: Tuple[float, float],
    rx: float,
    ry: float,
    ramp: List[RGBA],
    angle: float = 0.0,
    light_dir: Tuple[float, float] = (-0.6, -0.8),
    outline_color: Optional[RGBA] = None,
):
    """
    Renders an organically shaded 3D ellipsoid with normal-mapped spherical shading.
    ramp: 4-step color ramp [deep_shadow, shadow, midtone, highlight].
    """
    cx, cy = center
    cos_a, sin_a = np.cos(angle), np.sin(angle)
    lx, ly = light_dir
    l_mag = np.hypot(lx, ly)
    if l_mag > 0:
        lx, ly = lx / l_mag, ly / l_mag

    min_x = max(0, int(cx - max(rx, ry) - 2))
    max_x = min(image.width, int(cx + max(rx, ry) + 3))
    min_y = max(0, int(cy - max(rx, ry) - 2))
    max_y = min(image.height, int(cy + max(rx, ry) + 3))

    for y in range(min_y, max_y):
        for x in range(min_x, max_x):
            dx = x - cx
            dy = y - cy
            # Rotate into local coordinate frame
            u = (dx * cos_a + dy * sin_a) / rx
            v = (-dx * sin_a + dy * cos_a) / ry
            dist_sq = u * u + v * v

            if dist_sq <= 1.0:
                dist = np.sqrt(dist_sq)
                # Reconstruct pseudo-3D surface normal (nx, ny, nz)
                nz = np.sqrt(max(0.0, 1.0 - dist_sq))
                # Unrotated surface normal
                nx = (u * cos_a - v * sin_a)
                ny = (u * sin_a + v * cos_a)
                
                # Dot product with light source
                dot = nx * lx + ny * ly + nz * 0.5
                
                # Bayer dither threshold perturbation
                dither = (BAYER_2X2[y % 2][x % 2] - 1.5) * 0.12
                effective_dot = dot + dither

                if dist > 0.88 and outline_color is not None:
                    color = outline_color
                elif effective_dot > 0.40:
                    color = ramp[3]  # Highlight
                elif effective_dot > -0.05:
                    color = ramp[2]  # Midtone
                elif effective_dot > -0.45:
                    color = ramp[1]  # Shadow
                else:
                    color = ramp[0]  # Deep shadow

                draw_pixel(image, x, y, color)

def draw_shaded_capsule(
    image: Image.Image,
    p0: Tuple[float, float],
    p1: Tuple[float, float],
    radius: float,
    ramp: List[RGBA],
    light_dir: Tuple[float, float] = (-0.6, -0.8),
    outline_color: Optional[RGBA] = None,
):
    """
    Renders an organically shaded 3D cylindrical capsule between p0 and p1.
    Ideal for limbs, fingers, tails, horns, and cloth folds.
    """
    x0, y0 = p0
    x1, y1 = p1
    vx = x1 - x0
    vy = y1 - y0
    seg_len_sq = vx * vx + vy * vy
    seg_len = np.sqrt(seg_len_sq)

    lx, ly = light_dir
    l_mag = np.hypot(lx, ly)
    if l_mag > 0:
        lx, ly = lx / l_mag, ly / l_mag

    min_x = max(0, int(min(x0, x1) - radius - 2))
    max_x = min(image.width, int(max(x0, x1) + radius + 3))
    min_y = max(0, int(min(y0, y1) - radius - 2))
    max_y = min(image.height, int(max(y0, y1) + radius + 3))

    for y in range(min_y, max_y):
        for x in range(min_x, max_x):
            px = x - x0
            py = y - y0
            if seg_len_sq == 0:
                t = 0.0
            else:
                t = max(0.0, min(1.0, (px * vx + py * vy) / seg_len_sq))

            closest_x = x0 + t * vx
            closest_y = y0 + t * vy
            dx = x - closest_x
            dy = y - closest_y
            dist_sq = (dx * dx + dy * dy) / (radius * radius)

            if dist_sq <= 1.0:
                dist = np.sqrt(dist_sq)
                nz = np.sqrt(max(0.0, 1.0 - dist_sq))
                nx = dx / radius
                ny = dy / radius

                dot = nx * lx + ny * ly + nz * 0.5
                dither = (BAYER_2X2[y % 2][x % 2] - 1.5) * 0.12
                effective_dot = dot + dither

                if dist > 0.88 and outline_color is not None:
                    color = outline_color
                elif effective_dot > 0.40:
                    color = ramp[3]
                elif effective_dot > -0.05:
                    color = ramp[2]
                elif effective_dot > -0.45:
                    color = ramp[1]
                else:
                    color = ramp[0]

                draw_pixel(image, x, y, color)

def blit_pixel_matrix(
    image: Image.Image,
    top_left: Tuple[int, int],
    matrix_str: str,
    char_map: Dict[str, Optional[RGBA]],
):
    """
    Renders an exact pixel grid template.
    Allows hand-sculpting eyes, mouths, hair strands, and decorative emblems pixel by pixel.
    """
    lines = [line.strip() for line in matrix_str.strip().splitlines() if line.strip()]
    ox, oy = top_left
    for row_idx, row in enumerate(lines):
        for col_idx, char in enumerate(row):
            color = char_map.get(char)
            if color is not None:
                draw_pixel(image, ox + col_idx, oy + row_idx, color)


