"""
Deterministic Seed-42 Aqualia Town Square Layout Proof Generator.
Renders the 1920x1080 orthographic camera view matching seed-42 simulation coordinates:
- Center: (264, 282)
- 30x17 tiles (64px grid)
- Cleared water interior with road cross at x in [263..265], y in [281..283]
- 10 cottages at y=273 and y=289
- Authoritative landmarks (waystone, well, hearth) and forage nodes
- Player Aqualia and Rivallie scale anchors
"""

from typing import Dict, List, Tuple
from PIL import Image, ImageDraw
from ..core.geometry import create_canvas
from .terrain import (
    render_ground_grass, render_ground_dirt, render_ground_freshwater,
    render_shore_freshwater_mask, render_cliff_grass, render_ramp_grass
)
from .resources import (
    render_flora_berries, render_flora_reeds, render_flora_wheat,
    render_flora_nectar, render_flora_ashgrass, render_flora_fungi
)
from .buildings import (
    render_tree_oak, render_house_aqualia, render_landmark_well,
    render_landmark_waystone, render_prop_hearth
)
from ..actors.humanoid import render_player_aqualia_frame
from ..actors.rivallie import render_rivallie_frame

VIEW_W, VIEW_H = 1920, 1080
TILE = 64
CAM_CENTER_X, CAM_CENTER_Y = 264.0, 282.0

def world_to_screen(wx: float, wy: float) -> Tuple[int, int]:
    """Converts continuous world tile coordinates to 1920x1080 screen pixels."""
    sx = int((wx - CAM_CENTER_X) * TILE + (VIEW_W // 2))
    sy = int((wy - CAM_CENTER_Y) * TILE + (VIEW_H // 2))
    return sx, sy

def render_aqualia_layout_proof() -> Image.Image:
    """Generates the authoritative 1920x1080 seed-42 Aqualia layout proof."""
    canvas = create_canvas(VIEW_W, VIEW_H)
    
    # 1. Pre-render base material tiles
    tile_grass = render_ground_grass()
    tile_dirt = render_ground_dirt()
    tile_water = render_ground_freshwater()

    # 2. Render Terrain Layer (Ground & Roads)
    # Visible tile range: cx - 16 .. cx + 16, cy - 10 .. cy + 10
    min_tx = int(CAM_CENTER_X - 16)
    max_tx = int(CAM_CENTER_X + 16)
    min_ty = int(CAM_CENTER_Y - 10)
    max_ty = int(CAM_CENTER_Y + 10)

    for ty in range(min_ty, max_ty + 1):
        for tx in range(min_tx, max_tx + 1):
            sx, sy = world_to_screen(tx, ty)
            # Determine tile material:
            # Road cross at tx in [263..265] or ty in [281..283]
            is_road = (263 <= tx <= 265) or (281 <= ty <= 283)
            # East river boundary at tx >= 279
            is_river = (tx >= 279)
            
            if is_river and not is_road:
                canvas.paste(tile_water, (sx, sy))
            elif is_road:
                canvas.paste(tile_dirt, (sx, sy))
            else:
                canvas.paste(tile_grass, (sx, sy))

    # 3. River shoreline transition mask along east boundary (tx=279)
    # Mask 10 (NE + SE = right edge water)
    mask_shore_right = render_shore_freshwater_mask(10)
    for ty in range(min_ty, max_ty + 1):
        if not (281 <= ty <= 283):
            sx, sy = world_to_screen(278, ty)
            canvas.paste(mask_shore_right, (sx, sy), mask_shore_right)

    # 4. Y-Sorted Object / Prop Layer
    # Collect all props with (depth_y, draw_callable)
    props: List[Tuple[float, callable]] = []

    # 4a. 10 Cottages at y=273 and y=289
    img_house = render_house_aqualia()
    cottage_xs = [-13, -7, 3, 9, 15]
    # Row 1 (North row) at y=273
    for dx in cottage_xs:
        wx = 264 + dx
        wy = 273.0
        def make_draw_house(x=wx, y=wy):
            return lambda: _paste_prop(canvas, img_house, x, y, (0.5, 1.0))
        props.append((wy, make_draw_house()))

    # Row 2 (South row) at y=289
    for dx in cottage_xs:
        wx = 264 + dx
        wy = 289.0
        def make_draw_house(x=wx, y=wy):
            return lambda: _paste_prop(canvas, img_house, x, y, (0.5, 1.0))
        props.append((wy, make_draw_house()))

    # 4b. Landmarks
    img_waystone = render_landmark_waystone()
    props.append((283.0, lambda: _paste_prop(canvas, img_waystone, 261.5, 283.0, (0.5, 1.0))))

    img_well = render_landmark_well()
    props.append((280.0, lambda: _paste_prop(canvas, img_well, 268.5, 280.0, (0.5, 1.0))))

    img_hearth = render_prop_hearth()
    props.append((279.0, lambda: _paste_prop(canvas, img_hearth, 259.0, 279.0, (0.5, 1.0))))

    # 4c. Starter Forage Nodes
    img_flint = render_flora_wheat("healthy")  # Wheat in field
    props.append((276.0, lambda: _paste_prop(canvas, img_flint, 260.0, 276.0, (0.5, 1.0))))
    props.append((276.0, lambda: _paste_prop(canvas, img_flint, 270.0, 276.0, (0.5, 1.0))))

    img_berries = render_flora_berries("healthy")
    props.append((284.0, lambda: _paste_prop(canvas, img_berries, 261.0, 284.0, (0.5, 1.0))))

    img_reeds = render_flora_reeds("healthy")
    props.append((284.0, lambda: _paste_prop(canvas, img_reeds, 260.0, 284.0, (0.5, 1.0))))
    props.append((280.0, lambda: _paste_prop(canvas, img_reeds, 277.5, 280.0, (0.5, 1.0))))

    img_fungi = render_flora_fungi("healthy")
    props.append((284.0, lambda: _paste_prop(canvas, img_fungi, 259.0, 284.0, (0.5, 1.0))))

    # 4d. Oak Trees framing square corners
    img_tree = render_tree_oak()
    tree_coords = [
        (250.0, 270.0), (256.0, 269.0), (272.0, 269.0), (278.0, 270.0),
        (249.0, 285.0), (250.0, 292.0), (278.0, 286.0), (277.0, 293.0)
    ]
    for tx, ty in tree_coords:
        def make_draw_tree(x=tx, y=ty):
            return lambda: _paste_prop(canvas, img_tree, x, y, (0.5, 0.94))
        props.append((ty, make_draw_tree()))

    # 4e. Player Aqualia & Rivallie scale anchors at settlement center (264, 282)
    img_player = render_player_aqualia_frame("s")
    props.append((282.0, lambda: _paste_prop(canvas, img_player, 264.0, 282.0, (0.5, 0.92))))

    img_rivallie = render_rivallie_frame("se")
    props.append((281.5, lambda: _paste_prop(canvas, img_rivallie, 262.2, 281.5, (0.5, 0.90))))

    # 5. Execute Depth Sorting & Rendering
    props.sort(key=lambda item: item[0])
    for depth, draw_fn in props:
        draw_fn()

    # 6. Technical HUD & Calibration Overlay
    draw = ImageDraw.Draw(canvas)
    # 64px Grid Overlay in faint cyan (top-left ruler)
    for x in range(0, VIEW_W, TILE):
        draw.line([(x, 0), (x, 24)], fill=(0, 220, 255, 90))
    for y in range(0, VIEW_H, TILE):
        draw.line([(0, y), (24, y)], fill=(0, 220, 255, 90))

    # Center settlement crosshair
    cx_s, cy_s = world_to_screen(264.0, 282.0)
    draw.line([(cx_s - 12, cy_s), (cx_s + 12, cy_s)], fill=(255, 220, 50, 220), width=1)
    draw.line([(cx_s, cy_s - 12), (cx_s, cy_s + 12)], fill=(255, 220, 50, 220), width=1)

    return canvas

def _paste_prop(canvas: Image.Image, sprite: Image.Image, wx: float, wy: float, anchor: Tuple[float, float]):
    """Pastes sprite onto canvas positioned at world coordinate with anchor offset."""
    sx, sy = world_to_screen(wx, wy)
    px = int(sx - sprite.width * anchor[0])
    py = int(sy - sprite.height * anchor[1])
    canvas.paste(sprite, (px, py), sprite)
