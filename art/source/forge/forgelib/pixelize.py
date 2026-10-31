"""pixelize: turn baked passes into doctrine pixel art (ART-3, ART-4, ART-5).

Per pixel: classify the material ramp from albedo (hue/chroma weighted), light it with the
spec key light in bands, then add a selective outline, depth-based interior lines and
cleanup. Output is the art-pixel frame plus its exact 2x export (L1).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from .color import is_glossy, ramp, rgb8_to_oklab
from .core import ForgeError, spec

STEPS = ("deep", "shadow", "mid", "light", "highlight")
L_WEIGHT = 0.35  # lightness matters less than hue: lighting comes from our bands, not the sheet
CAM_DIST, DEPTH_RANGE = 20.0, 4.0  # must match blender/bake.py
NORMAL_SIGMA = 0.9


def _load16(p: Path) -> np.ndarray:
    a = np.array(Image.open(p))
    return a.astype(np.float64) / (65535.0 if a.dtype == np.uint16 else 255.0)


def _linear_to_srgb8(c: np.ndarray) -> np.ndarray:
    s = np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.clip(c, 0, None) ** (1 / 2.4) - 0.055)
    return np.clip(np.round(s * 255), 0, 255).astype(np.uint8)


class RampSet:
    def __init__(self, ramps: dict[str, str]):
        if not ramps:
            raise ForgeError("No palette ramps assigned. Map every material slot to a ramp in the recipe (ART-4.1).")
        self.slots = list(ramps)
        self.names = [ramps[s] for s in self.slots]
        self.rgb = np.array([[ramp(n)[st] for st in STEPS] for n in self.names], dtype=np.uint8)  # (R,5,3)
        lab = rgb8_to_oklab(self.rgb)
        self.lab = lab * np.array([L_WEIGHT, 1, 1])
        self.glossy = np.array([is_glossy(n) for n in self.names])

    def classify(self, albedo8: np.ndarray) -> np.ndarray:
        lab = rgb8_to_oklab(albedo8) * np.array([L_WEIGHT, 1, 1])
        d = np.linalg.norm(lab[:, :, None, None, :] - self.lab[None, None, :, 1:4, :], axis=-1)  # vs shadow/mid/light
        return d.min(axis=-1).argmin(axis=-1)


def _majority(labels: np.ndarray, mask: np.ndarray, n: int) -> np.ndarray:
    """3x3 majority vote over opaque pixels: removes speckle islands from texture noise."""
    counts = np.stack([ndimage.convolve((labels == k) & mask, np.ones((3, 3)), mode="constant") for k in range(n)])
    out = counts.argmax(axis=0)
    keep = counts.max(axis=0) <= 2  # too few neighbours to vote confidently
    return np.where(mask & ~keep, out, labels)


def pixelize_frame(albedo_p: Path, normal_p: Path, depth_p: Path, ramps: RampSet) -> tuple[np.ndarray, dict]:
    rs = spec("render_spec")
    alb = _load16(albedo_p)
    nrm = _load16(normal_p)
    dep = _load16(depth_p)
    mask = alb[..., 3] > 0.5
    h, w = mask.shape
    labels = ramps.classify(_linear_to_srgb8(alb[..., :3]))
    labels = _majority(labels, mask, len(ramps.names))

    n = nrm[..., :3] * 2 - 1
    # smooth normals inside the silhouette: gen3d surfaces are bumpy at this scale
    wsum = ndimage.gaussian_filter(mask.astype(float), NORMAL_SIGMA)
    n = np.stack([ndimage.gaussian_filter(n[..., c] * mask, NORMAL_SIGMA) for c in range(3)], -1) / np.maximum(wsum, 1e-6)[..., None]
    n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-6)
    L = np.array(rs["light"]["keyDirectionWorld"], dtype=np.float64)
    L /= np.linalg.norm(L)
    ndl = n @ L
    b = rs["light"]["bands"]
    step = np.where(ndl < b["shadowBelow"], 1, np.where(ndl < b["lightAbove"], 2, 3))
    step = _majority(step - 1, mask, 3) + 1  # no single-pixel band speckle
    gloss = ramps.glossy[labels] & (ndl >= b["highlightAbove"])
    step = np.where(gloss, 4, step)

    depth = dep[..., 0] * 2 * DEPTH_RANGE + (CAM_DIST - DEPTH_RANGE)
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., :3] = ramps.rgb[labels, step]
    out[..., 3] = np.where(mask, 255, 0)

    # interior lines where depth jumps: the farther pixel takes its ramp's deep step (ART-5.3)
    thr = rs["outline"]["interiorDepthJumpWorldUnits"]
    interior = np.zeros_like(mask)
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nb_depth = np.roll(depth, (dy, dx), axis=(0, 1))
        nb_mask = np.roll(mask, (dy, dx), axis=(0, 1))
        interior |= mask & nb_mask & (depth - nb_depth > thr)
    out[interior, :3] = ramps.rgb[labels[interior], 0]

    # orphan cleanup: a body pixel unlike all 8 neighbours takes the most common neighbour colour
    flat = (out[..., 0].astype(np.int64) << 16) | (out[..., 1].astype(np.int64) << 8) | out[..., 2]
    for y, x in zip(*np.nonzero(mask)):
        ys, xs = slice(max(y - 1, 0), y + 2), slice(max(x - 1, 0), x + 2)
        nb = flat[ys, xs][mask[ys, xs]]
        nb = nb[nb != flat[y, x]] if (nb == flat[y, x]).sum() == 1 else None
        if nb is not None and len(nb) >= 5:
            vals, cnt = np.unique(nb, return_counts=True)
            v = vals[cnt.argmax()]
            out[y, x, :3] = ((v >> 16) & 255, (v >> 8) & 255, v & 255)

    # exterior selective outline (ART-5.1, ART-5.2): drawn on transparent pixels touching the body
    outline = np.zeros((h, w, 4), dtype=np.uint8)
    for (dy, dx), lit in (((0, -1), True), ((-1, 0), True), ((0, 1), False), ((1, 0), False)):
        # neighbour of an outline pixel at offset: outline on the body's left/top edge is top-lit
        src_mask = np.roll(mask, (dy, dx), axis=(0, 1))
        src_lab = np.roll(labels, (dy, dx), axis=(0, 1))
        cand = ~mask & src_mask & (outline[..., 3] == 0)
        stepi = 1 if lit and rs["outline"].get("topLitExteriorStep") == "shadow" else 0
        outline[cand, :3] = ramps.rgb[src_lab[cand], stepi]
        outline[cand, 3] = 255
    # pixel-perfect pass: drop L-corner outline pixels (ART-5.4)
    om = outline[..., 3] > 0
    up, dn = np.roll(om, 1, 0), np.roll(om, -1, 0)
    lf, rt = np.roll(om, 1, 1), np.roll(om, -1, 1)
    corner = om & (((up & rt) | (rt & dn) | (dn & lf) | (lf & up)) & ((up.astype(int) + dn + lf + rt) == 2))
    body_diag = np.zeros_like(om)
    for dy, dx in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        body_diag |= np.roll(mask, (dy, dx), axis=(0, 1))
    body_orth = np.roll(mask, 1, 0) | np.roll(mask, -1, 0) | np.roll(mask, 1, 1) | np.roll(mask, -1, 1)
    outline[corner & body_diag & ~body_orth] = 0
    final = _clean_orphans(np.where(outline[..., 3:] > 0, outline, out))

    info = {
        "labels": {ramps.slots[k]: int(((labels == k) & mask).sum()) for k in range(len(ramps.names))},
        "interiorLinePx": int(interior.sum()),
    }
    return final, info


def _clean_orphans(img: np.ndarray, passes: int = 4) -> np.ndarray:
    """Final pass with QA's exact definition (ART-5.4): an interior pixel (all four neighbours
    opaque) whose colour matches none of its 8 neighbours takes their most common colour.
    Runs on the composited frame, because the outline turns former edge pixels into interior."""
    img = img.copy()
    for _ in range(passes):
        a = img[..., 3] > 0
        interior = a & np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1)
        flat = (img[..., 0].astype(np.int64) << 16) | (img[..., 1].astype(np.int64) << 8) | img[..., 2]
        same = np.zeros_like(a)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    same |= (np.roll(flat, (dy, dx), (0, 1)) == flat) & np.roll(a, (dy, dx), (0, 1))
        bad = interior & ~same
        if not bad.any():
            break
        for y, x in zip(*np.nonzero(bad)):
            ys, xs = slice(max(y - 1, 0), y + 2), slice(max(x - 1, 0), x + 2)
            nb = flat[ys, xs][a[ys, xs]]
            nb = nb[nb != flat[y, x]]
            if not len(nb):
                continue
            vals, cnt = np.unique(nb, return_counts=True)
            v = vals[cnt.argmax()]
            img[y, x, :3] = ((v >> 16) & 255, (v >> 8) & 255, v & 255)
    return img


def upscale2(img: np.ndarray) -> np.ndarray:
    k = spec("render_spec")["pixelScale"]["exportScale"]
    return img.repeat(k, axis=0).repeat(k, axis=1)


def run_dir(bake_dir: Path, out_dir: Path, ramps_map: dict[str, str]) -> dict:
    ramps = RampSet(ramps_map)
    tracks = json.loads((bake_dir / "tracks.json").read_text())
    summary = {}
    for clip, facings in tracks["clips"].items():
        (out_dir / clip).mkdir(parents=True, exist_ok=True)
        (out_dir / "export" / clip).mkdir(parents=True, exist_ok=True)
        for facing, frames in facings.items():
            for i in range(len(frames)):
                base = bake_dir / clip / f"{facing}_{i}_"
                img, info = pixelize_frame(Path(f"{base}albedo.png"), Path(f"{base}normal.png"), Path(f"{base}depth.png"), ramps)
                Image.fromarray(img).save(out_dir / clip / f"{facing}_{i}.png")
                Image.fromarray(upscale2(img)).save(out_dir / "export" / clip / f"{facing}_{i}.png")
                summary[f"{clip}/{facing}_{i}"] = info
    (out_dir / "pixelize.json").write_text(json.dumps(summary, indent=1))
    return summary
