"""Dual-grid overlay sets: one tile per corner mask, matching src/presentation/autotiler.ts.

A dual tile sits half a tile up-left of the primary grid; its four corners sample the four
primary cells around it (bits NW=1, NE=2, SW=4, SE=8). The shoreline is the 0.5 contour of the
same bilinear blend of corner bits as DualGridAutotiler.patterns, displaced along its normal by
a smooth wobble with a period of one tile. Both depend only on what neighbouring tiles share,
so masks meet without a seam. Edge bands are pixel distances from the displaced contour.
"""

from __future__ import annotations

import numpy as np
from scipy.ndimage import gaussian_filter

from .core import TileError, colour, spec

BAYER2 = np.array([[0.0, 0.5], [0.75, 0.25]])
MATERIAL_CLASS = 100
INSIDE_CLASS = 50  # + band index
OUTSIDE_CLASS = 10  # + band index


def corner_field(mask: int, n: int) -> np.ndarray:
    u = (np.arange(n) + 0.5) / n
    U, V = np.meshgrid(u, u)  # V varies down rows
    return ((mask & 1 > 0) * (1 - U) * (1 - V) + (mask & 2 > 0) * U * (1 - V)
            + (mask & 4 > 0) * (1 - U) * V + (mask & 8 > 0) * U * V)


def periodic_noise(n: int, scale: float, seed: int) -> np.ndarray:
    z = np.random.default_rng(seed).standard_normal((n, n))
    z = gaussian_filter(z, scale, mode="wrap")
    return (z - z.mean()) / (z.std() or 1.0)


def signed_distance(mask: int, n: int, amp: float, noise: np.ndarray) -> np.ndarray:
    """Pixel distance to the shoreline (positive inside). The clean contour is the autotiler's
    bilinear 0.5 line (analytic gradient, so it agrees across tile borders); the wobble moves
    it along its normal by amp * noise px with a period of one tile, so neighbours still meet."""
    u = (np.arange(n) + 0.5) / n
    U, V = np.meshgrid(u, u)
    b = [(mask >> i) & 1 for i in range(4)]
    f = b[0] * (1 - U) * (1 - V) + b[1] * U * (1 - V) + b[2] * (1 - U) * V + b[3] * U * V
    fu = (-b[0] * (1 - V) + b[1] * (1 - V) - b[2] * V + b[3] * V) / n
    fv = (-b[0] * (1 - U) - b[1] * U + b[2] * (1 - U) + b[3] * U) / n
    d = (f - 0.5) / np.maximum(np.hypot(fu, fv), 0.25 / n)
    return d + amp * noise


def despeckle(d: np.ndarray, min_px: int = 10) -> np.ndarray:
    """Islands and holes smaller than min_px that do not touch the tile edge are flipped, so
    shores carry no stray droplets. Components touching an edge stay (neighbours share them)."""
    from scipy.ndimage import label

    d = d.copy()
    for sign in (1, -1):
        lab, k = label(sign * d >= 0 if sign > 0 else d < 0)
        if not k:
            continue
        edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])))
        sizes = np.bincount(lab.ravel())
        for c in range(1, k + 1):
            if c not in edge and sizes[c] < min_px:
                d[lab == c] = -sign * 8.0
    return d


def build_overlay(o: dict, materials: dict, tile_px: int):
    """Returns the overlay record with 16 tiles (mask 0..15): rgba and class maps."""
    mat = materials.get(o["material"])
    if mat is None or mat["kind"] != "material":
        raise TileError(f"overlay {o['id']}: material '{o['material']}' is not a material in this set")
    under = materials.get(o["under"]) if o.get("under") else None
    if o.get("under") and (under is None or under["kind"] != "material"):
        raise TileError(f"overlay {o['id']}: under '{o['under']}' is not a material in this set")
    edge = o["edge"]
    amp = edge.get("noise", 1.2)
    noise = periodic_noise(tile_px, edge.get("noiseScale", 4.0), edge.get("seed", 7))
    inside, outside = edge.get("inside", []), edge.get("outside", [])
    mat_rgb = np.array(mat["colours"], np.uint8)[mat["base"]]
    under_rgb = np.array(under["colours"], np.uint8)[under["base"]] if under else None
    y, x = np.mgrid[0:tile_px, 0:tile_px]
    bayer = BAYER2[y % 2, x % 2]
    refs = list(mat["refs"])
    for b in inside + outside:
        if b["value"] not in refs:
            refs.append(b["value"])
    tiles = []
    for mask in range(16):
        d = despeckle(signed_distance(mask, tile_px, amp, noise))
        rgb = np.zeros((tile_px, tile_px, 3), np.uint8)
        cls = np.zeros((tile_px, tile_px), np.int16)
        filled = np.zeros((tile_px, tile_px), bool)
        # inside: bands from the contour inward, then the material body
        lo = 0.0
        for i, b in enumerate(inside):
            hi = lo + b["px"]
            band = (d >= lo) & (d < hi) & ~filled
            if "dither" in b:
                band &= bayer < b["dither"]
            rgb[band] = colour(b["value"])
            cls[band] = INSIDE_CLASS + i
            filled |= band
            lo = hi
        body = (d >= 0) & ~filled
        rgb[body] = mat_rgb[body]
        cls[body] = MATERIAL_CLASS
        filled |= body
        # outside: bands from the contour outward over whatever ground is below
        lo = 0.0
        for i, b in enumerate(outside):
            hi = lo + b["px"]
            band = (d < -lo) & (d >= -hi) & ~filled
            if "dither" in b:
                band &= bayer < b["dither"]
            rgb[band] = colour(b["value"])
            cls[band] = OUTSIDE_CLASS + i
            filled |= band
            lo = hi
        alpha = filled.copy()
        if under_rgb is not None:
            rest = ~filled
            rgb[rest] = under_rgb[rest]
            alpha[:] = True
        out = np.zeros((tile_px, tile_px, 4), np.uint8)
        out[..., :3] = rgb
        out[..., 3] = np.where(alpha, 255, 0)
        rid = None
        if o.get("runtimeIdTemplate") and mask in spec()["dualGrid"]["drawnMasks"]:
            rid = o["runtimeIdTemplate"].replace("{mask}", str(mask))
        tiles.append({"mask": mask, "rgba": out, "classes": cls, "runtimeId": rid})
    return {"kind": "overlay", "id": o["id"], "material": mat["id"], "under": o.get("under"),
            "refs": refs, "tiles": tiles, "bodyRefs": mat["refs"],
            "bandRefs": sorted({b["value"] for b in inside + outside})}


def dual_mask(cells: np.ndarray, x: int, y: int) -> int:
    """Mask of the dual tile whose corners are cells (x-1, y-1)..(x, y); out of range = 0.
    Mirrors renderer.drawChunk: tiler.mask(grid, x - 1, y - 1, matches)."""
    h, w = cells.shape
    m = 0
    for corner in range(4):
        cx, cy = x - 1 + corner % 2, y - 1 + corner // 2
        if 0 <= cx < w and 0 <= cy < h and cells[cy, cx]:
            m |= 1 << corner
    return m
