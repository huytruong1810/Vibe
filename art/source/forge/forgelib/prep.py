"""prep: validate a reference sheet (PRD-3) and produce clean RGBA view images for gen3d/texture."""

from __future__ import annotations

import numpy as np
from PIL import Image
from scipy import ndimage

from .color import rgb8_to_oklab
from .core import REPO, ForgeError, load_sheet, record, reference_dir, work_dir

VIEWS = ("front", "left", "back", "right")
MIN_CONTENT_PX = 256
STANDARD_CONTENT_PX = 1024


def remove_background(img: Image.Image, tol: float = 0.07) -> Image.Image:
    """Make the flat sheet background transparent (PRD-3.1 requires a plain background)."""
    rgba = np.array(img.convert("RGBA"))
    if (rgba[..., 3] < 250).mean() > 0.05:  # already has real alpha
        return Image.fromarray(rgba)
    lab = rgb8_to_oklab(rgba[..., :3])
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.median(border, axis=0)
    near = np.linalg.norm(lab - bg, axis=-1) < tol
    labels, _ = ndimage.label(near)
    edge = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bgmask = np.isin(labels, edge[edge > 0])
    fg = ~bgmask
    fg = ndimage.binary_opening(fg, iterations=1)
    lab_fg, n = ndimage.label(fg)
    if n == 0:
        raise ForgeError("Background removal found no subject; the sheet needs a plain flat background (PRD-3.1).")
    sizes = ndimage.sum(fg, lab_fg, range(1, n + 1))
    main = 1 + int(np.argmax(sizes))
    touching = set(np.unique(np.concatenate([lab_fg[0], lab_fg[-1], lab_fg[:, 0], lab_fg[:, -1]]))) - {0, main}
    big = 1 + np.flatnonzero(sizes >= max(sizes.max() * 0.01, 64))
    # neighbouring figures in a multi-view master enter crops from the edge: drop them
    keep = np.isin(lab_fg, [c for c in big if c not in touching])
    keep = ndimage.binary_fill_holes(keep)
    rgba[..., 3] = np.where(keep, 255, 0).astype(np.uint8)
    return Image.fromarray(rgba)


def fill_colors(cut: Image.Image) -> Image.Image:
    """RGBA where transparent pixels take the nearest subject colour, so colour projection
    never samples background at silhouette mismatches. Alpha is kept for bbox alignment."""
    rgba = np.array(cut)
    inside = rgba[..., 3] > 0
    _, (iy, ix) = ndimage.distance_transform_edt(~inside, return_indices=True)
    filled = rgba.copy()
    filled[..., :3] = rgba[iy, ix, :3]
    return Image.fromarray(filled)


def frame_subject(img: Image.Image, size: int = 1024, margin: float = 0.06) -> Image.Image:
    """Crop to the subject and centre it on a square transparent canvas (gen3d input convention)."""
    a = np.array(img)[..., 3]
    ys, xs = np.nonzero(a > 0)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    sub = img.crop(box)
    side = int(max(sub.size) / (1 - 2 * margin))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(sub, ((side - sub.width) // 2, (side - sub.height) // 2), sub)
    return canvas.resize((size, size), Image.LANCZOS)


def run(asset_id: str) -> dict:
    sheet = load_sheet(asset_id)
    ref = reference_dir(asset_id)
    out = work_dir(asset_id) / "prep"
    out.mkdir(exist_ok=True)
    views = sheet.get("views", {})
    if sheet.get("kind") == "item" and set(views) == {"threeQuarter"}:
        # Prop sheets are one object in three-quarter view (PRD-3.3). gen3d and texture
        # treat it as their single front view; orient then finds the item's own axes.
        views = {"front": views["threeQuarter"]}
    if "front" not in views:
        raise ForgeError("sheet.json must define a 'front' view (PRD-3.1).")
    warnings, inputs, outputs, heights = [], [ref / "sheet.json"], [], {}
    for name, spec_ in views.items():
        if name not in VIEWS:
            raise ForgeError(f"Unknown view '{name}'; use {VIEWS}.")
        if isinstance(spec_, str):
            spec_ = {"file": spec_}
        src = (ref / spec_["file"]) if "file" in spec_ else (REPO / spec_["source"])
        if not src.exists():
            raise ForgeError(f"View '{name}' file missing: {src.relative_to(REPO)}")
        inputs.append(src)
        img = Image.open(src).convert("RGBA")
        if "crop" in spec_:
            img = img.crop(tuple(spec_["crop"]))
        if spec_.get("mirror"):
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        cut = remove_background(img)
        a = np.array(cut)[..., 3]
        ys, xs = np.nonzero(a)
        h = int(ys.max() - ys.min() + 1)
        heights[name] = h
        if ys.min() == 0 or xs.min() == 0 or ys.max() == a.shape[0] - 1 or xs.max() == a.shape[1] - 1:
            raise ForgeError(f"View '{name}': subject touches the image edge (cropped). PRD-3.1 needs the full body.")
        if h < MIN_CONTENT_PX:
            raise ForgeError(f"View '{name}': subject is only {h}px tall; need at least {MIN_CONTENT_PX}px (PRD-3.1).")
        if h < STANDARD_CONTENT_PX:
            warnings.append(f"view '{name}' subject is {h}px tall (standard is {STANDARD_CONTENT_PX}px, PRD-3.1)")
        cut.save(out / f"{name}_cutout.png")
        framed = frame_subject(cut)
        framed.save(out / f"{name}.png")
        fill_colors(cut).save(out / f"{name}_fill.png")
        outputs += [out / f"{name}_cutout.png", out / f"{name}.png", out / f"{name}_fill.png"]
    rec = record(asset_id, "prep", inputs, outputs, {"views": sorted(views), "warnings": warnings, "heights": heights})
    return rec
