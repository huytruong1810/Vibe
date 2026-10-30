"""
Layered sprite compositing engine with directional depth ordering and occlusion masks.
Ensures clothing, hair, weapons, and limbs are drawn in the authoritative depth order per facing.
"""

from typing import Dict, List, Optional
from PIL import Image
from .palette import CLEAR

LAYER_ORDER_SOUTH: List[str] = [
    "back_attachment",     # Slung staff/rod behind back
    "back_cloak",          # Cloak hanging down
    "body_base",           # Torso and pelvis
    "legs_garment",        # Trousers
    "feet_garment",        # Boots
    "torso_garment",       # Tunic, poncho
    "limbs_far",           # Far arms
    "limbs_near",          # Near arms
    "head_base",           # Neck, face, ears
    "facial_features",     # Eyes, mouth, blush
    "hair_base",           # Hair shape
    "head_garment",        # Hat, hood
    "hair_fringe",         # Bangs over brow
    "hands_garment",       # Gloves
    "held_tool",           # Carried tool / fishing rod
    "held_weapon",         # Equipped weapon
    "foreground_hands",    # Hands gripping weapon
]

LAYER_ORDER_NORTH: List[str] = [
    "head_base",           # Face (hidden behind)
    "facial_features",
    "limbs_far",
    "limbs_near",
    "body_base",           # Back of torso
    "legs_garment",        # Back of trousers
    "feet_garment",        # Back of boots
    "torso_garment",       # Back of tunic
    "hair_base",           # Long hair falling over back
    "head_garment",        # Back of hood
    "back_cloak",          # Cloak covering back
    "back_attachment",     # Strapped rod across back
    "hands_garment",
    "held_weapon",
    "held_tool",
    "foreground_hands",
]

LAYER_ORDER_SIDE: List[str] = [
    "far_arm",
    "far_leg",
    "back_attachment",
    "body_base",
    "legs_garment",
    "feet_garment",
    "torso_garment",
    "near_leg",
    "head_base",
    "facial_features",
    "hair_base",
    "head_garment",
    "near_arm",
    "hands_garment",
    "held_weapon",
    "held_tool",
    "foreground_hands",
]

def get_layer_order(facing: str) -> List[str]:
    """Returns the depth-ordered list of layer keys for the given facing."""
    if facing == "n" or facing in ("ne", "nw"):
        return LAYER_ORDER_NORTH
    elif facing == "s":
        return LAYER_ORDER_SOUTH
    else:  # e, w, se, sw
        return LAYER_ORDER_SIDE

def composite_layers(
    canvas_size: tuple[int, int],
    layers: Dict[str, Image.Image],
    facing: str,
) -> Image.Image:
    """
    Composites available layer images into a single transparent canvas
    following the strict depth order for the current facing direction.
    """
    canvas = Image.new("RGBA", canvas_size, CLEAR)
    order = get_layer_order(facing)

    for layer_name in order:
        if layer_name in layers and layers[layer_name] is not None:
            layer_img = layers[layer_name]
            canvas.alpha_composite(layer_img)

    return canvas
