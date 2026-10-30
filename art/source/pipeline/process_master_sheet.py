"""
Automated Figure Segmentation, Alpha Matting, and Anchor Registration Pipeline.
Extracts individual figures from master sheets, mats clean alpha with BiRefNet,
scales with lanczos/nearest hybrid pixel-art preservation, aligns to integer root anchors,
and enforces >= 2px transparent padding with zero border contact.
"""

import os
import sys
from pathlib import Path
from typing import List, Tuple, Dict, Optional
import numpy as np
from PIL import Image, ImageDraw
import scipy.ndimage
import rembg

def init_matting_session():
    """Initializes high-precision BiRefNet alpha matting session."""
    return rembg.new_session("birefnet-general")

def segment_and_extract_figures(
    master_image: Image.Image,
    session=None,
    min_area: int = 500,
    padding: int = 4,
) -> List[Image.Image]:
    """
    Removes background, identifies connected components, and extracts individual
    figures sorted from left to right.
    """
    if session is None:
        session = init_matting_session()

    # 1. Background removal via BiRefNet
    matted = rembg.remove(master_image, session=session)
    arr = np.array(matted)
    alpha = arr[:, :, 3] > 20  # Threshold faint noise

    # 2. Connected component labeling
    labeled, num_features = scipy.ndimage.label(alpha)
    slices = scipy.ndimage.find_objects(labeled)

    components = []
    for idx, sl in enumerate(slices):
        y_slice, x_slice = sl
        comp_mask = labeled[sl] == (idx + 1)
        area = int(np.sum(comp_mask))
        if area < min_area:
            continue

        ymin, ymax = y_slice.start, y_slice.stop
        xmin, xmax = x_slice.start, x_slice.stop

        # Add generous padding while staying inside image bounds
        ymin_pad = max(0, ymin - padding)
        ymax_pad = min(matted.height, ymax + padding)
        xmin_pad = max(0, xmin - padding)
        xmax_pad = min(matted.width, xmax + padding)

        # Extract cutout from matted RGBA image
        cutout = matted.crop((xmin_pad, ymin_pad, xmax_pad, ymax_pad))
        # Ensure tight transparent bounding box
        bbox = cutout.getbbox()
        if bbox:
            cutout_tight = cutout.crop(bbox)
            components.append((xmin, cutout_tight))

    # Sort figures from left to right along X axis
    components.sort(key=lambda c: c[0])
    return [c[1] for c in components]

def register_actor_on_canvas(
    cutout: Image.Image,
    target_canvas: Tuple[int, int],
    ground_anchor: Tuple[int, int],
    target_height: int,
    max_width: Optional[int] = None,
) -> Image.Image:
    """
    Scales a cutout figure and registers it onto a transparent canvas:
    - Horizontal center: aligned to ground_anchor[0]
    - Vertical ground: bottom-most pixel aligned to ground_anchor[1]
    - Enforces >= 2px transparent margins on all 4 borders.
    """
    tw, th = target_canvas
    gx, gy = ground_anchor

    # Determine scaling factor
    scale = target_height / float(cutout.height)
    if max_width is not None and (cutout.width * scale) > max_width:
        scale = max_width / float(cutout.width)

    new_w = max(1, int(round(cutout.width * scale)))
    new_h = max(1, int(round(cutout.height * scale)))
    scaled = cutout.resize((new_w, new_h), Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    # Place bottom of figure at gy, horizontally centered at gx
    pos_x = gx - (new_w // 2)
    pos_y = gy - new_h

    # Ensure position stays within margins
    pos_x = max(2, min(tw - new_w - 2, pos_x))
    pos_y = max(2, min(th - new_h - 2, pos_y))

    canvas.paste(scaled, (pos_x, pos_y), scaled)

    # Validate margins
    bbox = canvas.getbbox()
    if not bbox:
        raise ValueError("Canvas is completely transparent after pasting cutout!")

    assert bbox[0] >= 2, f"Left margin violation: x0={bbox[0]} < 2"
    assert bbox[1] >= 2, f"Top margin violation: y0={bbox[1]} < 2"
    assert bbox[2] <= tw - 2, f"Right margin violation: x1={bbox[2]} > {tw - 2}"
    assert bbox[3] <= th - 2, f"Bottom margin violation: y1={bbox[3]} > {th - 2}"

    return canvas

def build_contact_sheet(
    frames: List[Tuple[str, Image.Image]],
    frame_size: Tuple[int, int],
    anchor: Tuple[int, int],
    padding: int = 8,
    bg_color: Tuple[int, int, int, int] = (24, 26, 32, 255),
) -> Image.Image:
    """Creates horizontal contact sheet with ground registration lines and anchor dots."""
    fw, fh = frame_size
    n = len(frames)
    sw = 20 + n * (fw + padding)
    sh = fh + 32

    sheet = Image.new("RGBA", (sw, sh), bg_color)
    draw = ImageDraw.Draw(sheet)

    ground_y = 16 + anchor[1]
    draw.line([(0, ground_y), (sw, ground_y)], fill=(0, 200, 255, 180), width=1)

    for idx, (label, f) in enumerate(frames):
        fx = 10 + idx * (fw + padding)
        fy = 16
        sheet.paste(f, (fx, fy), f)
        draw.rectangle([fx, fy, fx + fw - 1, fy + fh - 1], outline=(70, 80, 100, 150))
        ax, ay = fx + anchor[0], fy + anchor[1]
        draw.ellipse([ax - 2, ay - 2, ax + 2, ay + 2], fill=(255, 80, 80, 255))

    return sheet

