"""
Procedural Pixel-Art Rivallie Creature Generator.
Renders canonical semi-aquatic river otter anatomy with rounded muzzle, dorsal crest, and paddle fan tail.
Canvas size: 96x96, ground root anchor: (48, 86).
"""

from typing import Dict, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_AQUALIA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect,
    apply_selective_outline
)
from ..core.rig import get_rivallie_idle_pose, RIVALLIE_ROOT

TARGET_W, TARGET_H = 96, 96

# Rivallie Specific Color Ramp
PELT_DEEP = hex_to_rgba("#133647")
PELT_SHADOW = hex_to_rgba("#1d546e")
PELT_MID = hex_to_rgba("#2b7a9e")
PELT_HIGHLIGHT = hex_to_rgba("#43abd4")
BELLY_CREAM = hex_to_rgba("#f0ece1")
BELLY_SHADOW = hex_to_rgba("#c4bda9")
CREST_CYAN = hex_to_rgba("#59f0e3")
CREST_HIGHLIGHT = hex_to_rgba("#bafcf6")

def render_rivallie_frame(facing: str) -> Image.Image:
    """
    Deterministically generates a complete Rivallie creature idle frame in the given facing direction.
    """
    pose = get_rivallie_idle_pose(facing)
    canvas = create_canvas(TARGET_W, TARGET_H)
    draw = ImageDraw.Draw(canvas)

    px, py = pose.pelvis
    cx, cy = pose.chest
    nx, ny = pose.neck
    hx, hy = pose.head
    mx, my = pose.muzzle
    tx, ty = pose.socket_tail
    cr_x, cr_y = pose.socket_crest

    if facing == "s":
        # 1. Broad paddle tail resting behind
        draw_shaded_rect(canvas, tx - 12, ty, 24, 14, PELT_SHADOW, PELT_MID, OUTLINE_DARK)
        # 2. Hind webbed paws
        draw_shaded_rect(canvas, pose.paw_back_l[0] - 5, pose.paw_back_l[1] - 8, 10, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_back_r[0] - 5, pose.paw_back_r[1] - 8, 10, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        # 3. Main body (rounded torso & chest)
        draw_shaded_rect(canvas, cx - 16, cy - 6, 32, 28, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # Pale cream belly patch
        draw_shaded_rect(canvas, cx - 8, cy - 2, 16, 20, BELLY_CREAM, BELLY_SHADOW, None)
        # 4. Front webbed paws
        draw_shaded_rect(canvas, pose.paw_front_l[0] - 4, pose.paw_front_l[1] - 10, 9, 10, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_front_r[0] - 4, pose.paw_front_r[1] - 10, 9, 10, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # 5. Dorsal fin-crest behind head
        draw_shaded_rect(canvas, cr_x - 3, cr_y, 6, 12, CREST_CYAN, CREST_HIGHLIGHT, OUTLINE_DARK)
        # 6. Head & rounded otter muzzle
        draw_shaded_rect(canvas, hx - 12, hy - 10, 24, 20, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # Rounded snout / muzzle
        draw_shaded_rect(canvas, mx - 8, my - 6, 16, 10, BELLY_CREAM, BELLY_SHADOW, OUTLINE_DARK)
        # Nose and eyes
        draw_pixel(canvas, mx, my - 4, OUTLINE_DARK)
        draw_pixel(canvas, hx - 6, hy - 4, OUTLINE_DARK)
        draw_pixel(canvas, hx + 6, hy - 4, OUTLINE_DARK)
        # Whiskers
        draw_pixel(canvas, mx - 9, my - 3, PELT_SHADOW)
        draw_pixel(canvas, mx + 9, my - 3, PELT_SHADOW)

    elif facing in ("se", "sw"):
        flip = 1 if facing == "se" else -1
        # 1. Broad paddle fan tail angled back
        draw_shaded_rect(canvas, tx - 14 * flip, ty - 6, 28, 14, PELT_SHADOW, PELT_MID, OUTLINE_DARK)
        # 2. Back paws
        draw_shaded_rect(canvas, pose.paw_back_l[0] - 5, pose.paw_back_l[1] - 8, 10, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_back_r[0] - 5, pose.paw_back_r[1] - 8, 10, 8, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # 3. Main body elongated
        draw_shaded_rect(canvas, px - 10 * flip, py - 12, 34, 24, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # Cream underbelly streak
        draw_shaded_rect(canvas, px + 2 * flip, py - 4, 18, 14, BELLY_CREAM, BELLY_SHADOW, None)
        # 4. Front paws
        draw_shaded_rect(canvas, pose.paw_front_l[0] - 4, pose.paw_front_l[1] - 10, 9, 10, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_front_r[0] - 4, pose.paw_front_r[1] - 10, 9, 10, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # 5. Dorsal aquatic crest
        draw_shaded_rect(canvas, cr_x - 4, cr_y, 8, 14, CREST_CYAN, CREST_HIGHLIGHT, OUTLINE_DARK)
        # 6. Head & rounded muzzle
        draw_shaded_rect(canvas, hx - 10, hy - 9, 20, 18, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        draw_shaded_rect(canvas, mx - 5, my - 5, 12, 10, BELLY_CREAM, BELLY_SHADOW, OUTLINE_DARK)
        draw_pixel(canvas, mx + 2 * flip, my - 3, OUTLINE_DARK)
        draw_pixel(canvas, hx + 3 * flip, hy - 4, OUTLINE_DARK)

    elif facing in ("e", "w"):
        flip = 1 if facing == "e" else -1
        # 1. Full elongated paddle fan-tail
        draw_shaded_rect(canvas, tx - 16 * flip, ty - 6, 32, 14, PELT_SHADOW, PELT_MID, OUTLINE_DARK)
        # Tail paddle ribs
        draw_pixel_line(canvas, tx - 10 * flip, ty, tx - 2 * flip, ty, PELT_DEEP)
        # 2. Rear paw
        draw_shaded_rect(canvas, pose.paw_back_l[0] - 5, pose.paw_back_l[1] - 8, 11, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_back_r[0] - 5, pose.paw_back_r[1] - 8, 11, 8, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # 3. Sleek mammalian body
        draw_shaded_rect(canvas, px - 12 * flip, py - 12, 38, 22, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        draw_shaded_rect(canvas, px + 2 * flip, py - 3, 20, 12, BELLY_CREAM, BELLY_SHADOW, None)
        # 4. Front paws
        draw_shaded_rect(canvas, pose.paw_front_l[0] - 4, pose.paw_front_l[1] - 10, 9, 10, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_front_r[0] - 4, pose.paw_front_r[1] - 10, 9, 10, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        # 5. Crest along neck nape
        draw_shaded_rect(canvas, cr_x - 6, cr_y, 10, 14, CREST_CYAN, CREST_HIGHLIGHT, OUTLINE_DARK)
        # 6. Profile head & rounded otter muzzle
        draw_shaded_rect(canvas, hx - 9, hy - 9, 18, 18, PELT_MID, PELT_HIGHLIGHT, OUTLINE_DARK)
        draw_shaded_rect(canvas, mx - 6, my - 5, 12, 9, BELLY_CREAM, BELLY_SHADOW, OUTLINE_DARK)
        draw_pixel(canvas, mx + 3 * flip, my - 3, OUTLINE_DARK)
        draw_pixel(canvas, hx + 1 * flip, hy - 4, OUTLINE_DARK)

    else:  # North / Back view
        # 1. Fan tail resting between hind legs
        draw_shaded_rect(canvas, tx - 10, ty, 20, 16, PELT_SHADOW, PELT_MID, OUTLINE_DARK)
        # 2. Hind paws
        draw_shaded_rect(canvas, pose.paw_back_l[0] - 5, pose.paw_back_l[1] - 8, 10, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_back_r[0] - 5, pose.paw_back_r[1] - 8, 10, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        # 3. Back of body
        draw_shaded_rect(canvas, cx - 16, cy - 6, 32, 28, PELT_DEEP, PELT_MID, OUTLINE_DARK)
        # 4. Front paws slightly tucked
        draw_shaded_rect(canvas, pose.paw_front_l[0] - 4, pose.paw_front_l[1] - 8, 9, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        draw_shaded_rect(canvas, pose.paw_front_r[0] - 4, pose.paw_front_r[1] - 8, 9, 8, PELT_DEEP, PELT_SHADOW, OUTLINE_DARK)
        # 5. Dorsal fin-crest running down center of neck/back
        draw_shaded_rect(canvas, cr_x - 3, cr_y - 2, 6, 20, CREST_CYAN, CREST_HIGHLIGHT, OUTLINE_DARK)
        # 6. Back of head & ears
        draw_shaded_rect(canvas, hx - 12, hy - 10, 24, 20, PELT_DEEP, PELT_MID, OUTLINE_DARK)
        # Rounded otter ears
        draw_pixel(canvas, hx - 12, hy - 8, PELT_HIGHLIGHT)
        draw_pixel(canvas, hx + 11, hy - 8, PELT_HIGHLIGHT)

    outlined = apply_selective_outline(canvas, OUTLINE_DARK)
    return outlined
