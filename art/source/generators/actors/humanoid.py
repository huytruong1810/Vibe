"""
High-Fidelity Procedural Pixel-Art Humanoid Actor Generator.
Sculpts organic anatomical curves, expressive JRPG eyes, flowing hair locks,
and draped cloth folds on 96x144 canvas at integer root (48, 132).
"""

from typing import Dict, Tuple, List, Optional
from PIL import Image, ImageDraw
import numpy as np
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, OUTLINE_SOFT,
    SKIN_RAMPS, HAIR_RAMPS, PALETTE_AQUALIA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect,
    draw_shaded_ellipsoid, draw_shaded_capsule, blit_pixel_matrix,
    apply_selective_outline, dither_fill
)
from ..core.rig import get_humanoid_idle_pose, HUMAN_ROOT
from ..core.composer import composite_layers

TARGET_W, TARGET_H = 96, 144

# Custom color ramps for clothing
CLOTH_INDIGO_RAMP: List[RGBA] = [
    hex_to_rgba("#131a29"),
    hex_to_rgba("#1c283d"),
    hex_to_rgba("#293a59"),
    hex_to_rgba("#3f557d"),
]

CLOTH_TEAL_RAMP: List[RGBA] = [
    hex_to_rgba("#14383b"),
    hex_to_rgba("#1e5559"),
    hex_to_rgba("#2c8285"),
    hex_to_rgba("#4ec2b6"),
]

LEATHER_BOOT_RAMP: List[RGBA] = [
    hex_to_rgba("#241913"),
    hex_to_rgba("#3d2a1f"),
    hex_to_rgba("#5e4231"),
    hex_to_rgba("#876149"),
]

STAFF_RAMP: List[RGBA] = [
    hex_to_rgba("#211914"),
    hex_to_rgba("#382b21"),
    hex_to_rgba("#594535"),
    hex_to_rgba("#82664f"),
]

def render_player_aqualia_frame(facing: str) -> Image.Image:
    """
    Renders high-fidelity Player Aqualia idle sprite with sculpted organic curves,
    expressive anime eyes, layered wavy hair, and draped poncho.
    """
    pose = get_humanoid_idle_pose(facing, build="slender")
    layers: Dict[str, Image.Image] = {}

    skin = SKIN_RAMPS["fair"]
    hair = HAIR_RAMPS["teal"]
    aq = PALETTE_AQUALIA

    # -------------------------------------------------------------
    # 1. Back Attachment: Slung Ashwood Walking Staff
    # -------------------------------------------------------------
    img_back = create_canvas(TARGET_W, TARGET_H)
    bx, by = pose.socket_back
    if facing in ("s", "se", "e", "n"):
        dx = -12 if facing in ("s", "n") else -8
        # Diagonal staff slung across shoulders
        p_top = (bx + dx, by - 26)
        p_bot = (bx - dx, by + 28)
        draw_shaded_capsule(img_back, p_top, p_bot, 2.0, STAFF_RAMP)
        # Polished brass caps on both ends
        draw_pixel(img_back, int(p_top[0]), int(p_top[1]), aq["brass_bright"])
        draw_pixel(img_back, int(p_bot[0]), int(p_bot[1]), aq["brass_mid"])
    layers["back_attachment"] = img_back

    # -------------------------------------------------------------
    # 2. Legs: Tapered Indigo Trousers
    # -------------------------------------------------------------
    img_legs = create_canvas(TARGET_W, TARGET_H)
    hx_l, hy_l = pose.hip_l
    hx_r, hy_r = pose.hip_r
    kx_l, ky_l = pose.knee_l
    kx_r, ky_r = pose.knee_r
    ax_l, ay_l = pose.ankle_l
    ax_r, ay_r = pose.ankle_r

    # Left Leg (Thigh & Calf capsules)
    draw_shaded_capsule(img_legs, (hx_l, hy_l), (kx_l, ky_l), 4.2, CLOTH_INDIGO_RAMP)
    draw_shaded_capsule(img_legs, (kx_l, ky_l), (ax_l, ay_l - 4), 3.8, CLOTH_INDIGO_RAMP)

    # Right Leg (Thigh & Calf capsules)
    draw_shaded_capsule(img_legs, (hx_r, hy_r), (kx_r, ky_r), 4.2, CLOTH_INDIGO_RAMP)
    draw_shaded_capsule(img_legs, (kx_r, ky_r), (ax_r, ay_r - 4), 3.8, CLOTH_INDIGO_RAMP)
    layers["legs_garment"] = img_legs

    # -------------------------------------------------------------
    # 3. Feet: Water Moccasin Boots
    # -------------------------------------------------------------
    img_feet = create_canvas(TARGET_W, TARGET_H)
    for ax, ay, is_right in [(ax_l, ay_l, False), (ax_r, ay_r, True)]:
        foot_x = ax + (1 if is_right and facing in ("se", "e") else 0)
        # Boot shaft
        draw_shaded_capsule(img_feet, (ax, ay - 10), (foot_x, ay - 2), 4.0, LEATHER_BOOT_RAMP)
        # Boot toe curve
        toe_dx = 3 if facing in ("se", "e") else (-2 if not is_right else 2)
        draw_shaded_ellipsoid(img_feet, (foot_x + toe_dx, ay - 2), 5.5, 3.2, LEATHER_BOOT_RAMP)
        # Small brass buckle
        draw_pixel(img_feet, int(foot_x + (toe_dx // 2)), ay - 6, aq["brass_bright"])
    layers["feet_garment"] = img_feet

    # -------------------------------------------------------------
    # 4. Torso: Indigo Tunic & Draped Teal Poncho Capelet
    # -------------------------------------------------------------
    img_torso = create_canvas(TARGET_W, TARGET_H)
    tx, ty = pose.torso
    px, py = pose.pelvis

    # Base Tunic: Contoured capsule
    draw_shaded_capsule(img_torso, (tx, ty), (px, py), 9.0, CLOTH_INDIGO_RAMP)

    # Draped Poncho Capelet: Overlapping organic ellipsoids
    poncho_rx = 15.0 if facing in ("s", "n") else 12.5
    draw_shaded_ellipsoid(img_torso, (tx, ty + 2), poncho_rx, 11.0, CLOTH_TEAL_RAMP)
    # Scalloped bottom drape
    draw_shaded_ellipsoid(img_torso, (tx - 5, ty + 10), 7.0, 5.0, CLOTH_TEAL_RAMP)
    draw_shaded_ellipsoid(img_torso, (tx + 5, ty + 10), 7.0, 5.0, CLOTH_TEAL_RAMP)

    # Woven wave hem embroidery
    draw = ImageDraw.Draw(img_torso)
    for wx in range(int(tx - poncho_rx + 4), int(tx + poncho_rx - 3), 3):
        draw_pixel(img_torso, wx, ty + 12, aq["reed_bright"])
        draw_pixel(img_torso, wx + 1, ty + 13, aq["water_caustic"])
    layers["torso_garment"] = img_torso

    # -------------------------------------------------------------
    # 5. Arms & Hands: Sculpted Sleeves & Fingers
    # -------------------------------------------------------------
    img_arms = create_canvas(TARGET_W, TARGET_H)
    slx, sly = pose.shoulder_l
    elx, ely = pose.elbow_l
    wlx, wly = pose.wrist_l

    srx, sry = pose.shoulder_r
    erx, ery = pose.elbow_r
    wrx, wry = pose.wrist_r

    # Left Arm (Upper arm & forearm capsules)
    draw_shaded_capsule(img_arms, (slx, sly), (elx, ely), 3.2, CLOTH_INDIGO_RAMP)
    draw_shaded_capsule(img_arms, (elx, ely), (wlx, wly), 2.8, CLOTH_INDIGO_RAMP)
    # Left Hand (bare skin palm & fingers)
    draw_shaded_ellipsoid(img_arms, (wlx, wly + 3), 2.8, 3.2, skin)

    # Right Arm
    draw_shaded_capsule(img_arms, (srx, sry), (erx, ery), 3.2, CLOTH_INDIGO_RAMP)
    draw_shaded_capsule(img_arms, (erx, ery), (wrx, wry), 2.8, CLOTH_INDIGO_RAMP)
    # Right Hand
    draw_shaded_ellipsoid(img_arms, (wrx, wry + 3), 2.8, 3.2, skin)
    layers["limbs_near"] = img_arms

    # -------------------------------------------------------------
    # 6. Head, Neck & Expressive JRPG Facial Features
    # -------------------------------------------------------------
    img_head = create_canvas(TARGET_W, TARGET_H)
    hx, hy = pose.head
    nx, ny = pose.neck

    # Neck
    draw_shaded_capsule(img_head, (nx, ny - 4), (nx, ny + 3), 3.0, skin)

    # Head Dome & Tapered Jaw
    # Cranium (round dome)
    draw_shaded_ellipsoid(img_head, (hx, hy - 3), 10.0, 9.5, skin)
    # Jawline / Chin tapering softly
    draw_shaded_ellipsoid(img_head, (hx, hy + 3), 7.5, 6.0, skin)

    # Expressive Anime/JRPG Face Matrices
    if facing == "s":
        # Left Eye (Matrix template for crisp JRPG clarity)
        # '.'=none, 'O'=outline/lash, 'S'=sclera white, 'I'=indigo iris, 'G'=cyan glint, 'D'=deep
        EYE_L = """
        .OOO.
        OSSIO
        OSGIO
        .ODO.
        """
        # Right Eye (Mirrored)
        EYE_R = """
        .OOO.
        OISSO
        OIGSO
        .ODO.
        """
        eye_map = {
            'O': OUTLINE_DARK,
            'S': hex_to_rgba("#fbfcfc"),
            'I': hex_to_rgba("#1d3a54"),
            'G': hex_to_rgba("#5cf5e3"),
            'D': hex_to_rgba("#0f1f2e"),
        }
        blit_pixel_matrix(img_head, (int(hx - 8), int(hy - 4)), EYE_L, eye_map)
        blit_pixel_matrix(img_head, (int(hx + 3), int(hy - 4)), EYE_R, eye_map)

        # Delicate eyebrows
        draw_pixel_line(img_head, int(hx - 7), int(hy - 7), int(hx - 4), int(hy - 8), hair[1])
        draw_pixel_line(img_head, int(hx + 4), int(hy - 8), int(hx + 7), int(hy - 7), hair[1])

        # Rosy cheek blush
        draw_pixel(img_head, int(hx - 6), int(hy + 2), hex_to_rgba("#e6958a"))
        draw_pixel(img_head, int(hx + 6), int(hy + 2), hex_to_rgba("#e6958a"))

        # Nose & Gentle Smile
        draw_pixel(img_head, int(hx), int(hy), skin[1])
        draw_pixel(img_head, int(hx - 1), int(hy + 4), OUTLINE_DARK)
        draw_pixel(img_head, int(hx), int(hy + 4), OUTLINE_DARK)
        draw_pixel(img_head, int(hx + 1), int(hy + 4), OUTLINE_DARK)

        # Sea-glass necklace on collar
        draw_pixel(img_head, int(nx - 2), int(ny), aq["water_caustic"])
        draw_pixel(img_head, int(nx), int(ny + 1), aq["water_foam"])
        draw_pixel(img_head, int(nx + 2), int(ny), aq["water_caustic"])

    elif facing in ("se", "e"):
        flip = 1 if facing == "se" else 1.2
        EYE_34 = """
        .OOO.
        OSSIO
        OSGIO
        .ODO.
        """
        eye_map = {
            'O': OUTLINE_DARK,
            'S': hex_to_rgba("#fbfcfc"),
            'I': hex_to_rgba("#1d3a54"),
            'G': hex_to_rgba("#5cf5e3"),
            'D': hex_to_rgba("#0f1f2e"),
        }
        blit_pixel_matrix(img_head, (int(hx + 1), int(hy - 4)), EYE_34, eye_map)
        draw_pixel_line(img_head, int(hx + 1), int(hy - 7), int(hx + 5), int(hy - 8), hair[1])
        # Blush & Smile
        draw_pixel(img_head, int(hx + 4), int(hy + 2), hex_to_rgba("#e6958a"))
        draw_pixel(img_head, int(hx + 1), int(hy + 4), OUTLINE_DARK)
        draw_pixel(img_head, int(hx + 2), int(hy + 4), OUTLINE_DARK)
        draw_pixel(img_head, int(nx + 1), int(ny), aq["water_foam"])
    layers["head_base"] = img_head

    # -------------------------------------------------------------
    # 7. Hair: Sculpted Wavy Sea-Teal with Spiral Shell Pin
    # -------------------------------------------------------------
    img_hair = create_canvas(TARGET_W, TARGET_H)
    if facing in ("s", "se"):
        # Hair crown volume (curved ellipsoid)
        draw_shaded_ellipsoid(img_hair, (hx, hy - 7), 11.5, 8.0, hair)
        # Front bangs: Layered curved strands
        draw_shaded_capsule(img_hair, (hx - 9, hy - 7), (hx - 8, hy + 4), 2.2, hair)
        draw_shaded_capsule(img_hair, (hx - 4, hy - 8), (hx - 3, hy - 1), 2.0, hair)
        draw_shaded_capsule(img_hair, (hx + 4, hy - 8), (hx + 3, hy - 1), 2.0, hair)
        draw_shaded_capsule(img_hair, (hx + 9, hy - 7), (hx + 8, hy + 4), 2.2, hair)
        # Side wavy locks cascading past shoulders
        draw_shaded_capsule(img_hair, (hx - 9, hy), (hx - 10, hy + 14), 2.4, hair)
        draw_shaded_capsule(img_hair, (hx + 9, hy), (hx + 10, hy + 14), 2.4, hair)
        # Carved spiral conch shell pin on left temple
        draw_shaded_ellipsoid(img_hair, (hx - 9, hy - 6), 3.2, 2.5, [aq["brass_shadow"], aq["reed_mid"], aq["water_caustic"], aq["water_foam"]])
        draw_pixel(img_hair, int(hx - 9), int(hy - 6), aq["water_caustic"])

    elif facing == "e":
        draw_shaded_ellipsoid(img_hair, (hx - 2, hy - 7), 10.5, 8.5, hair)
        draw_shaded_capsule(img_hair, (hx - 6, hy - 4), (hx - 7, hy + 16), 3.0, hair)
        draw_shaded_capsule(img_hair, (hx + 2, hy - 8), (hx + 4, hy - 2), 2.0, hair)
        draw_shaded_ellipsoid(img_hair, (hx - 5, hy - 6), 3.0, 2.5, [aq["brass_shadow"], aq["reed_mid"], aq["water_caustic"], aq["water_foam"]])

    elif facing == "n":
        # Full back hair cascading across shoulders
        draw_shaded_ellipsoid(img_hair, (hx, hy - 6), 12.0, 9.0, hair)
        # Back locks flowing down past poncho collar
        draw_shaded_capsule(img_hair, (hx - 7, hy), (hx - 6, hy + 20), 3.0, hair)
        draw_shaded_capsule(img_hair, (hx, hy + 1), (hx, hy + 22), 3.5, hair)
        draw_shaded_capsule(img_hair, (hx + 7, hy), (hx + 6, hy + 20), 3.0, hair)
        # Hair ribbon / shell pin back view
        draw_pixel(img_hair, int(hx - 8), int(hy - 4), aq["water_caustic"])
    layers["hair_base"] = img_hair

    # Composite layers based on facing order
    final_canvas = composite_layers((TARGET_W, TARGET_H), layers, facing)
    # Apply crisp single-pixel JRPG outline
    return apply_selective_outline(final_canvas, OUTLINE_DARK)
