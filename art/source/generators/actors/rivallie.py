"""
High-Fidelity Procedural Pixel-Art Rivallie Creature Generator.
Sculpts sleek semi-aquatic otter curves, broad paddle fan tail, dorsal crest,
and expressive whiskered muzzle on 96x96 canvas at integer root (48, 86).
"""

from typing import Dict, Tuple, List
from PIL import Image, ImageDraw
import numpy as np
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, PALETTE_AQUALIA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect,
    draw_shaded_ellipsoid, draw_shaded_capsule, blit_pixel_matrix,
    apply_selective_outline
)
from ..core.rig import get_rivallie_idle_pose, RIVALLIE_ROOT

TARGET_W, TARGET_H = 96, 96

# Rivallie Specific 4-Step Color Ramps
PELT_RAMP: List[RGBA] = [
    hex_to_rgba("#133647"),  # Deep shadow
    hex_to_rgba("#1d546e"),  # Shadow
    hex_to_rgba("#2b7a9e"),  # Midtone
    hex_to_rgba("#43abd4"),  # Highlight
]

BELLY_RAMP: List[RGBA] = [
    hex_to_rgba("#8f8776"),
    hex_to_rgba("#c4bda9"),
    hex_to_rgba("#f0ece1"),
    hex_to_rgba("#ffffff"),
]

CREST_RAMP: List[RGBA] = [
    hex_to_rgba("#1b5b69"),
    hex_to_rgba("#2c949c"),
    hex_to_rgba("#59f0e3"),
    hex_to_rgba("#d2fcf8"),
]

def render_rivallie_frame(facing: str) -> Image.Image:
    """
    Renders high-fidelity Rivallie creature idle frame with sleek otter curves,
    broad paddle fan tail, dorsal crest, and expressive face.
    """
    pose = get_rivallie_idle_pose(facing)
    canvas = create_canvas(TARGET_W, TARGET_H)

    px, py = pose.pelvis
    cx, cy = pose.chest
    nx, ny = pose.neck
    hx, hy = pose.head
    mx, my = pose.muzzle
    tx, ty = pose.socket_tail
    cr_x, cr_y = pose.socket_crest

    if facing == "s":
        # 1. Broad paddle fan tail resting behind
        draw_shaded_ellipsoid(canvas, (tx, ty + 4), 13.0, 7.5, PELT_RAMP)
        draw_pixel_line(canvas, int(tx - 6), int(ty + 2), int(tx - 3), int(ty + 8), PELT_RAMP[0])
        draw_pixel_line(canvas, int(tx + 6), int(ty + 2), int(tx + 3), int(ty + 8), PELT_RAMP[0])

        # 2. Hind webbed paws
        draw_shaded_ellipsoid(canvas, (pose.paw_back_l[0], pose.paw_back_l[1] - 3), 5.5, 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_back_r[0], pose.paw_back_r[1] - 3), 5.5, 3.5, PELT_RAMP)

        # 3. Main Body: Torso & Chest capsules
        draw_shaded_capsule(canvas, (px, py), (cx, cy), 13.5, PELT_RAMP)
        # Cream underbelly patch
        draw_shaded_ellipsoid(canvas, (cx, cy + 5), 8.5, 10.0, BELLY_RAMP)

        # 4. Front webbed paws
        draw_shaded_capsule(canvas, (cx - 10, cy + 4), (pose.paw_front_l[0], pose.paw_front_l[1] - 4), 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_front_l[0], pose.paw_front_l[1] - 3), 4.5, 3.0, PELT_RAMP)

        draw_shaded_capsule(canvas, (cx + 10, cy + 4), (pose.paw_front_r[0], pose.paw_front_r[1] - 4), 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_front_r[0], pose.paw_front_r[1] - 3), 4.5, 3.0, PELT_RAMP)

        # 5. Dorsal fin-crest along nape
        draw_shaded_ellipsoid(canvas, (cr_x, cr_y + 4), 3.5, 7.0, CREST_RAMP)

        # 6. Rounded Otter Head & Ears
        draw_shaded_ellipsoid(canvas, (hx, hy), 11.5, 9.5, PELT_RAMP)
        # Ears (small rounded cups)
        draw_shaded_ellipsoid(canvas, (hx - 10, hy - 4), 2.5, 2.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (hx + 10, hy - 4), 2.5, 2.5, PELT_RAMP)

        # Cream Muzzle & Whiskers
        draw_shaded_ellipsoid(canvas, (mx, my - 2), 8.0, 5.0, BELLY_RAMP)
        # Dark button nose
        draw_pixel(canvas, int(mx), int(my - 4), OUTLINE_DARK)
        draw_pixel(canvas, int(mx - 1), int(my - 4), OUTLINE_DARK)
        draw_pixel(canvas, int(mx + 1), int(my - 4), OUTLINE_DARK)

        # Expressive Otter Eyes (Dark iris with cyan glint)
        OTTER_EYE = """
        .OO.
        OSGO
        .OO.
        """
        eye_map = {'O': OUTLINE_DARK, 'S': hex_to_rgba("#133647"), 'G': hex_to_rgba("#59f0e3")}
        blit_pixel_matrix(canvas, (int(hx - 7), int(hy - 5)), OTTER_EYE, eye_map)
        blit_pixel_matrix(canvas, (int(hx + 4), int(hy - 5)), OTTER_EYE, eye_map)

        # Whiskers
        draw_pixel_line(canvas, int(mx - 8), int(my - 2), int(mx - 13), int(my - 1), PELT_RAMP[1])
        draw_pixel_line(canvas, int(mx + 8), int(my - 2), int(mx + 13), int(my - 1), PELT_RAMP[1])

    elif facing in ("se", "sw"):
        flip = 1 if facing == "se" else -1
        # 1. Broad paddle fan tail tapering out behind
        draw_shaded_capsule(canvas, (px, py), (tx, ty), 7.0, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (tx, ty), 12.0, 6.5, PELT_RAMP, angle=0.3 * flip)
        # Tail paddle ribs
        draw_pixel_line(canvas, int(tx - 6 * flip), int(ty - 2), int(tx + 6 * flip), int(ty + 2), PELT_RAMP[0])

        # 2. Hind paws
        draw_shaded_capsule(canvas, (px, py + 2), (pose.paw_back_l[0], pose.paw_back_l[1] - 4), 4.0, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_back_l[0], pose.paw_back_l[1] - 3), 5.5, 3.2, PELT_RAMP)
        draw_shaded_capsule(canvas, (px + 6 * flip, py + 2), (pose.paw_back_r[0], pose.paw_back_r[1] - 4), 4.0, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_back_r[0], pose.paw_back_r[1] - 3), 5.5, 3.2, PELT_RAMP)

        # 3. Main sleek elongated body
        draw_shaded_capsule(canvas, (px, py), (cx, cy), 13.0, PELT_RAMP)
        # Cream underbelly streak
        draw_shaded_capsule(canvas, (px + 3 * flip, py + 3), (cx + 3 * flip, cy + 4), 7.0, BELLY_RAMP)

        # 4. Front paws
        draw_shaded_capsule(canvas, (cx - 2 * flip, cy + 4), (pose.paw_front_l[0], pose.paw_front_l[1] - 4), 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_front_l[0], pose.paw_front_l[1] - 3), 4.5, 3.0, PELT_RAMP)

        draw_shaded_capsule(canvas, (cx + 8 * flip, cy + 4), (pose.paw_front_r[0], pose.paw_front_r[1] - 4), 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_front_r[0], pose.paw_front_r[1] - 3), 4.5, 3.0, PELT_RAMP)

        # 5. Dorsal fin crest along nape
        draw_shaded_ellipsoid(canvas, (cr_x, cr_y + 3), 4.5, 8.0, CREST_RAMP, angle=-0.2 * flip)

        # 6. Head & 3/4 snout
        draw_shaded_ellipsoid(canvas, (hx, hy), 11.0, 9.0, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (hx - 7 * flip, hy - 4), 2.5, 2.5, PELT_RAMP)  # ear
        # Muzzle
        draw_shaded_ellipsoid(canvas, (mx, my - 2), 7.0, 5.0, BELLY_RAMP)
        draw_pixel(canvas, int(mx + 2 * flip), int(my - 4), OUTLINE_DARK)
        # Eye
        OTTER_EYE = """
        .OO.
        OSGO
        .OO.
        """
        eye_map = {'O': OUTLINE_DARK, 'S': hex_to_rgba("#133647"), 'G': hex_to_rgba("#59f0e3")}
        blit_pixel_matrix(canvas, (int(hx + 1 * flip), int(hy - 5)), OTTER_EYE, eye_map)
        # Whiskers
        draw_pixel_line(canvas, int(mx + 4 * flip), int(my - 2), int(mx + 9 * flip), int(my - 1), PELT_RAMP[1])

    elif facing in ("e", "w"):
        flip = 1 if facing == "e" else -1
        # 1. Full horizontal paddle fan tail
        draw_shaded_capsule(canvas, (px, py), (tx, ty), 6.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (tx, ty), 13.0, 6.5, PELT_RAMP)
        # Paddle ribs
        draw_pixel_line(canvas, int(tx - 6 * flip), int(ty), int(tx + 4 * flip), int(ty), PELT_RAMP[0])

        # 2. Hind paws
        draw_shaded_capsule(canvas, (px, py + 2), (pose.paw_back_l[0], pose.paw_back_l[1] - 4), 4.0, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_back_l[0], pose.paw_back_l[1] - 3), 5.5, 3.2, PELT_RAMP)
        draw_shaded_capsule(canvas, (px + 6 * flip, py + 2), (pose.paw_back_r[0], pose.paw_back_r[1] - 4), 4.0, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_back_r[0], pose.paw_back_r[1] - 3), 5.5, 3.2, PELT_RAMP)

        # 3. Streamlined torso
        draw_shaded_capsule(canvas, (px, py), (cx, cy), 12.5, PELT_RAMP)
        draw_shaded_capsule(canvas, (px + 3 * flip, py + 3), (cx + 3 * flip, cy + 4), 6.5, BELLY_RAMP)

        # 4. Front paws
        draw_shaded_capsule(canvas, (cx - 2 * flip, cy + 4), (pose.paw_front_l[0], pose.paw_front_l[1] - 4), 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_front_l[0], pose.paw_front_l[1] - 3), 4.5, 3.0, PELT_RAMP)

        draw_shaded_capsule(canvas, (cx + 8 * flip, cy + 4), (pose.paw_front_r[0], pose.paw_front_r[1] - 4), 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_front_r[0], pose.paw_front_r[1] - 3), 4.5, 3.0, PELT_RAMP)

        # 5. Nape crest
        draw_shaded_ellipsoid(canvas, (cr_x, cr_y + 3), 4.5, 8.0, CREST_RAMP, angle=-0.3 * flip)

        # 6. Profile Head & Snout
        draw_shaded_ellipsoid(canvas, (hx, hy), 10.5, 8.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (hx - 6 * flip, hy - 4), 2.5, 2.5, PELT_RAMP)  # ear
        draw_shaded_ellipsoid(canvas, (mx, my - 2), 6.5, 4.5, BELLY_RAMP)
        draw_pixel(canvas, int(mx + 3 * flip), int(my - 4), OUTLINE_DARK)
        # Eye
        OTTER_EYE = """
        .OO.
        OSGO
        .OO.
        """
        eye_map = {'O': OUTLINE_DARK, 'S': hex_to_rgba("#133647"), 'G': hex_to_rgba("#59f0e3")}
        blit_pixel_matrix(canvas, (int(hx + 1 * flip), int(hy - 5)), OTTER_EYE, eye_map)
        draw_pixel_line(canvas, int(mx + 4 * flip), int(my - 2), int(mx + 8 * flip), int(my - 1), PELT_RAMP[1])

    else:  # North view
        # 1. Paddle fan tail resting between paws
        draw_shaded_ellipsoid(canvas, (tx, ty + 4), 11.0, 7.5, PELT_RAMP)
        draw_pixel_line(canvas, int(tx - 4), int(ty + 2), int(tx - 2), int(ty + 8), PELT_RAMP[0])
        draw_pixel_line(canvas, int(tx + 4), int(ty + 2), int(tx + 2), int(ty + 8), PELT_RAMP[0])

        # 2. Hind paws
        draw_shaded_ellipsoid(canvas, (pose.paw_back_l[0], pose.paw_back_l[1] - 3), 5.5, 3.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_back_r[0], pose.paw_back_r[1] - 3), 5.5, 3.5, PELT_RAMP)

        # 3. Back of body
        draw_shaded_capsule(canvas, (px, py), (cx, cy), 13.5, PELT_RAMP)

        # 4. Front paws
        draw_shaded_ellipsoid(canvas, (pose.paw_front_l[0], pose.paw_front_l[1] - 3), 4.5, 3.0, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (pose.paw_front_r[0], pose.paw_front_r[1] - 3), 4.5, 3.0, PELT_RAMP)

        # 5. Dorsal fin-crest running down center of spine
        draw_shaded_ellipsoid(canvas, (cr_x, cr_y + 4), 3.5, 10.0, CREST_RAMP)

        # 6. Back of head & ears
        draw_shaded_ellipsoid(canvas, (hx, hy), 11.5, 9.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (hx - 10, hy - 4), 2.5, 2.5, PELT_RAMP)
        draw_shaded_ellipsoid(canvas, (hx + 10, hy - 4), 2.5, 2.5, PELT_RAMP)

    return apply_selective_outline(canvas, OUTLINE_DARK)
