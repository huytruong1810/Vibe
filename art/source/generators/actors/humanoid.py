"""
Procedural Pixel-Art Humanoid Actor Generator.
Renders modular humanoid sprites across 8 facings and 3 builds, matching the 96x144 canvas and root anchor (48, 132).
"""

from typing import Dict, Tuple
from PIL import Image, ImageDraw
from ..core.palette import (
    RGBA, CLEAR, OUTLINE_DARK, OUTLINE_SOFT,
    SKIN_RAMPS, HAIR_RAMPS, PALETTE_AQUALIA, hex_to_rgba
)
from ..core.geometry import (
    create_canvas, draw_pixel, draw_pixel_line, draw_shaded_rect,
    apply_selective_outline, dither_fill
)
from ..core.rig import get_humanoid_idle_pose, HUMAN_ROOT
from ..core.composer import composite_layers

TARGET_W, TARGET_H = 96, 144

def render_player_aqualia_frame(facing: str) -> Image.Image:
    """
    Deterministically generates a complete Player Aqualia idle frame in the given facing direction.
    Features sea-teal wavy hair with shell hairpin, woven poncho, indigo tunic, and strapped walking staff.
    """
    pose = get_humanoid_idle_pose(facing, build="slender")
    layers: Dict[str, Image.Image] = {}

    skin = SKIN_RAMPS["fair"]
    hair = HAIR_RAMPS["teal"]
    aq = PALETTE_AQUALIA

    # 1. Back Attachment: Slung fishing rod / walking staff
    img_back = create_canvas(TARGET_W, TARGET_H)
    bx, by = pose.socket_back
    if facing == "s":
        # Diagonal rod slung behind back: top-left to bottom-right
        draw_pixel_line(img_back, bx - 14, by - 24, bx + 12, by + 26, aq["timber_dark"])
        draw_pixel_line(img_back, bx - 13, by - 24, bx + 13, by + 26, aq["timber_mid"])
        draw_pixel(img_back, bx - 14, by - 24, aq["brass_bright"])
    elif facing in ("se", "e"):
        draw_pixel_line(img_back, bx - 10, by - 22, bx + 8, by + 24, aq["timber_dark"])
        draw_pixel_line(img_back, bx - 9, by - 22, bx + 9, by + 24, aq["timber_mid"])
        draw_pixel(img_back, bx - 10, by - 22, aq["brass_bright"])
    elif facing == "n":
        draw_pixel_line(img_back, bx - 14, by - 24, bx + 12, by + 26, aq["timber_dark"])
        draw_pixel_line(img_back, bx - 13, by - 24, bx + 13, by + 26, aq["timber_mid"])
        draw_pixel(img_back, bx - 14, by - 24, aq["brass_bright"])
    layers["back_attachment"] = img_back

    # 2. Base Body & Legs
    img_legs = create_canvas(TARGET_W, TARGET_H)
    # Trousers (dark indigo wool)
    hx_l, hy_l = pose.hip_l
    hx_r, hy_r = pose.hip_r
    kx_l, ky_l = pose.knee_l
    kx_r, ky_r = pose.knee_r
    ax_l, ay_l = pose.ankle_l
    ax_r, ay_r = pose.ankle_r

    if facing in ("s", "n"):
        draw_shaded_rect(img_legs, hx_l - 4, hy_l, 9, ky_l - hy_l + 8, aq["cloth_indigo"], aq["cloth_teal_shadow"], OUTLINE_DARK)
        draw_shaded_rect(img_legs, hx_r - 4, hy_r, 9, ky_r - hy_r + 8, aq["cloth_indigo"], aq["cloth_teal_shadow"], OUTLINE_DARK)
    elif facing in ("se", "e"):
        draw_shaded_rect(img_legs, hx_l - 4, hy_l, 8, ky_l - hy_l + 8, aq["cloth_indigo"], aq["cloth_teal_shadow"], OUTLINE_DARK)
        draw_shaded_rect(img_legs, hx_r - 4, hy_r, 8, ky_r - hy_r + 8, aq["cloth_indigo"], aq["cloth_teal_shadow"], OUTLINE_DARK)
    layers["legs_garment"] = img_legs

    # 3. Feet: Water moccasin boots
    img_feet = create_canvas(TARGET_W, TARGET_H)
    if facing == "s":
        draw_shaded_rect(img_feet, ax_l - 5, ay_l - 12, 10, 12, aq["timber_shadow"], aq["timber_highlight"], OUTLINE_DARK)
        draw_shaded_rect(img_feet, ax_r - 5, ay_r - 12, 10, 12, aq["timber_shadow"], aq["timber_highlight"], OUTLINE_DARK)
        # Small brass buckle
        draw_pixel(img_feet, ax_l, ay_l - 6, aq["brass_bright"])
        draw_pixel(img_feet, ax_r, ay_r - 6, aq["brass_bright"])
    elif facing in ("se", "e"):
        draw_shaded_rect(img_feet, ax_l - 4, ay_l - 12, 11, 12, aq["timber_shadow"], aq["timber_highlight"], OUTLINE_DARK)
        draw_shaded_rect(img_feet, ax_r - 3, ay_r - 12, 12, 12, aq["timber_shadow"], aq["timber_highlight"], OUTLINE_DARK)
        draw_pixel(img_feet, ax_l + 2, ay_l - 6, aq["brass_bright"])
        draw_pixel(img_feet, ax_r + 3, ay_r - 6, aq["brass_bright"])
    elif facing == "n":
        draw_shaded_rect(img_feet, ax_l - 5, ay_l - 12, 10, 12, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
        draw_shaded_rect(img_feet, ax_r - 5, ay_r - 12, 10, 12, aq["timber_shadow"], aq["timber_mid"], OUTLINE_DARK)
    layers["feet_garment"] = img_feet

    # 4. Torso: Indigo tunic & woven teal poncho capelet
    img_torso = create_canvas(TARGET_W, TARGET_H)
    tx, ty = pose.torso
    px, py = pose.pelvis
    t_width = 22 if facing in ("s", "n") else 18
    # Indigo tunic base
    draw_shaded_rect(img_torso, tx - (t_width // 2), ty, t_width, py - ty + 6, aq["cloth_indigo"], aq["cloth_teal_shadow"], OUTLINE_DARK)

    # Woven teal waterproof poncho / shoulder capelet
    poncho_w = t_width + 8
    draw_shaded_rect(img_torso, tx - (poncho_w // 2), ty - 4, poncho_w, 20, aq["cloth_teal_mid"], aq["cloth_teal_bright"], aq["cloth_teal_shadow"])
    # Embroidered wave trim at poncho hem
    for wx in range(tx - (poncho_w // 2) + 2, tx + (poncho_w // 2) - 1, 3):
        draw_pixel(img_torso, wx, ty + 14, aq["reed_bright"])
    layers["torso_garment"] = img_torso

    # 5. Arms & Hands
    img_arms = create_canvas(TARGET_W, TARGET_H)
    slx, sly = pose.shoulder_l
    wlx, wly = pose.wrist_l
    srx, sry = pose.shoulder_r
    wrx, wry = pose.wrist_r
    # Sleeves
    draw_pixel_line(img_arms, slx, sly, wlx, wly, aq["cloth_indigo"])
    draw_pixel_line(img_arms, slx + 1, sly, wlx + 1, wly, aq["cloth_teal_shadow"])
    draw_pixel_line(img_arms, srx, sry, wrx, wry, aq["cloth_indigo"])
    draw_pixel_line(img_arms, srx + 1, sry, wrx + 1, wry, aq["cloth_teal_shadow"])
    # Hands (bare skin)
    draw_shaded_rect(img_arms, wlx - 2, wly, 5, 6, skin[2], skin[3], OUTLINE_DARK)
    draw_shaded_rect(img_arms, wrx - 2, wry, 5, 6, skin[2], skin[3], OUTLINE_DARK)
    layers["limbs_near"] = img_arms

    # 6. Head & Face
    img_head = create_canvas(TARGET_W, TARGET_H)
    hx, hy = pose.head
    head_w, head_h = 20, 22
    # Neck
    nx, ny = pose.neck
    draw_shaded_rect(img_head, nx - 3, ny - 6, 7, 8, skin[1], skin[2], OUTLINE_DARK)
    # Head oval
    draw_shaded_rect(img_head, hx - (head_w // 2), hy - (head_h // 2), head_w, head_h, skin[2], skin[3], OUTLINE_DARK)

    # Face details (only on front and 3/4 front)
    if facing == "s":
        # Eyes
        draw_pixel(img_head, hx - 4, hy - 1, aq["cloth_indigo"])
        draw_pixel(img_head, hx - 4, hy - 2, OUTLINE_DARK)
        draw_pixel(img_head, hx + 4, hy - 1, aq["cloth_indigo"])
        draw_pixel(img_head, hx + 4, hy - 2, OUTLINE_DARK)
        # Soft cheek blush
        draw_pixel(img_head, hx - 6, hy + 2, skin[1])
        draw_pixel(img_head, hx + 6, hy + 2, skin[1])
        # Smile
        draw_pixel_line(img_head, hx - 2, hy + 4, hx + 2, hy + 4, OUTLINE_DARK)
        # Sea-glass necklace
        draw_pixel(img_head, nx - 2, ny - 2, aq["water_caustic"])
        draw_pixel(img_head, nx, ny - 1, aq["water_foam"])
        draw_pixel(img_head, nx + 2, ny - 2, aq["water_caustic"])
    elif facing in ("se", "e"):
        # Profile / 3/4 eye
        draw_pixel(img_head, hx + 3, hy - 1, aq["cloth_indigo"])
        draw_pixel(img_head, hx + 3, hy - 2, OUTLINE_DARK)
        draw_pixel(img_head, hx + 5, hy + 2, skin[1])
        draw_pixel(img_head, hx + 2, hy + 4, OUTLINE_DARK)
        draw_pixel(img_head, nx + 1, ny - 2, aq["water_foam"])
    layers["head_base"] = img_head

    # 7. Hair: Wavy sea-teal with shell hairpin
    img_hair = create_canvas(TARGET_W, TARGET_H)
    if facing in ("s", "se"):
        # Hair volume over crown and temples
        draw_shaded_rect(img_hair, hx - (head_w // 2) - 2, hy - (head_h // 2) - 4, head_w + 4, 12, hair[2], hair[3], hair[0])
        # Side bangs
        draw_pixel_line(img_hair, hx - 8, hy - 2, hx - 9, hy + 8, hair[2])
        draw_pixel_line(img_hair, hx + 8, hy - 2, hx + 9, hy + 8, hair[2])
        # Carved spiral shell hairpin on left temple
        draw_pixel(img_hair, hx - 9, hy - 4, aq["water_caustic"])
        draw_pixel(img_hair, hx - 8, hy - 3, aq["reed_bright"])
    elif facing == "e":
        draw_shaded_rect(img_hair, hx - (head_w // 2) - 2, hy - (head_h // 2) - 4, head_w + 2, 14, hair[2], hair[3], hair[0])
        draw_pixel_line(img_hair, hx - 8, hy + 2, hx - 6, hy + 12, hair[2])
    elif facing == "n":
        # Full back hair flowing over shoulders
        draw_shaded_rect(img_hair, hx - (head_w // 2) - 2, hy - (head_h // 2) - 4, head_w + 4, 18, hair[2], hair[3], hair[0])
        draw_pixel_line(img_hair, hx - 6, hy + 10, hx - 5, hy + 18, hair[1])
        draw_pixel_line(img_hair, hx + 6, hy + 10, hx + 5, hy + 18, hair[1])
        # Back view of shell pin
        draw_pixel(img_hair, hx - 7, hy - 2, aq["water_caustic"])
    layers["hair_base"] = img_hair

    # Composite all layers according to facing depth
    final_canvas = composite_layers((TARGET_W, TARGET_H), layers, facing)
    # Apply selective outline for crisp JRPG readability
    outlined = apply_selective_outline(final_canvas, OUTLINE_DARK)
    return outlined
