"""
Contact sheet and animated preview generator for native 1x and enlarged review.
"""

from typing import List, Tuple
from PIL import Image, ImageDraw

Vec2 = Tuple[int, int]

def generate_contact_sheet(
    frames: List[Tuple[str, Image.Image]],
    frame_size: Vec2,
    anchor: Vec2,
    padding: int = 8,
    draw_anchors: bool = True,
    bg_color: Tuple[int, int, int, int] = (24, 26, 32, 255),
) -> Image.Image:
    """
    Assembles a horizontal 1x contact sheet with frame outlines,
    ground registration lines, and anchor crosshairs.
    """
    fw, fh = frame_size
    n = len(frames)
    sheet_w = 20 + n * (fw + padding)
    sheet_h = fh + 32

    sheet = Image.new("RGBA", (sheet_w, sheet_h), bg_color)
    draw = ImageDraw.Draw(sheet)

    # Draw continuous ground registration line
    ground_y = 16 + anchor[1]
    draw.line([(0, ground_y), (sheet_w, ground_y)], fill=(0, 200, 255, 180), width=1)

    for idx, (label, frame) in enumerate(frames):
        fx = 10 + idx * (fw + padding)
        fy = 16
        sheet.paste(frame, (fx, fy), frame)

        if draw_anchors:
            # Frame boundary
            draw.rectangle([fx, fy, fx + fw - 1, fy + fh - 1], outline=(70, 80, 100, 150))
            # Anchor crosshair
            ax, ay = fx + anchor[0], fy + anchor[1]
            draw.ellipse([ax - 2, ay - 2, ax + 2, ay + 2], fill=(255, 80, 80, 255))

    return sheet

def scale_nearest(image: Image.Image, factor: int = 3) -> Image.Image:
    """Enlarges a pixel-art image using nearest-neighbor sampling."""
    return image.resize((image.width * factor, image.height * factor), Image.Resampling.NEAREST)

def generate_animated_gif(
    frames: List[Image.Image],
    output_path: str,
    fps: int = 8,
    scale_factor: int = 2,
    loop: int = 0,
    bg_color: Tuple[int, int, int] = (24, 26, 32),
):
    """Generates an animated GIF for motion and locomotion review."""
    duration_ms = int(1000 / fps)
    p_frames = []
    for f in frames:
        scaled = scale_nearest(f, scale_factor)
        # Paste over solid background to avoid GIF alpha edge artifacts
        bg = Image.new("RGB", scaled.size, bg_color)
        bg.paste(scaled, (0, 0), scaled)
        p_frame = bg.convert("P", palette=Image.Palette.ADAPTIVE)
        p_frames.append(p_frame)

    if not p_frames:
        return

    p_frames[0].save(
        output_path,
        save_all=True,
        append_images=p_frames[1:],
        duration=duration_ms,
        loop=loop,
        optimize=False,
    )
