"""C9b item source orientation: numpy only, so Blender's bundled Python can import it.

A prop sheet is one object in three-quarter view (PRD-3.3); gen3d therefore returns
it in an arbitrary pose. This module finds the canonical held-item frame from the
mesh itself, never from typed geometry (L5):

- the longest principal axis is the haft; the end with the wider cross-section is
  the head and points +Z (grip bucket 0 = head up on screen);
- the head's farthest perpendicular point (blade, tines, hook) points forward, -Y;
- the grip sits on the haft axis at `gripFraction` of the length from the butt;
- uniform scale makes the butt-to-head length `lengthArtPx` art pixels;
- the haft's median width is measured so the Blender side can inflate the model to
  the ART-6.3 minimum feature width ("thinner features thicken in the model").

Every choice has a recipe override (`flipHead`, `flipForward`, `gripFraction`,
explicit `grip`/`iconPivot`), the operator's fix-the-input lever.
"""
from __future__ import annotations

import numpy as np

END_SLICE = 0.2  # fraction of the length examined at each end


def _unit(v: np.ndarray) -> np.ndarray:
    n = float(np.linalg.norm(v))
    if n < 1e-12:
        raise ValueError("degenerate item geometry: cannot find a direction")
    return v / n


def icon_scale(length_art_px: float, depth_art_px: float, icon_px: int, margin_px: int) -> float:
    """Uniform icon scale so the 45-degree item fills its slot: the diagonal bounding square
    of a length x depth item is (length + depth) / sqrt(2); one outline pixel each side."""
    side = (length_art_px + depth_art_px) / np.sqrt(2)
    return float(np.clip(np.floor(100 * (icon_px - 2 * margin_px - 2) / side) / 100, 1.0, 4.0))


def inflation(haft_width_px: float, min_feature_px: float, art_px_per_unit: float) -> float:
    """World-unit offset along normals that brings the haft to 1.25x the minimum width."""
    return max(0.0, (1.25 * min_feature_px - haft_width_px) / 2) / art_px_per_unit


def orient(vertices: np.ndarray, length_art_px: float, art_px_per_unit: float, *,
           grip_fraction: float = 0.15, flip_head: bool = False, flip_forward: bool = False,
           max_reach_art_px: float | None = None) -> dict:
    """Return the 4x4 model transform plus grip/icon pivots in the transformed frame."""
    v = np.asarray(vertices, dtype=float)
    if v.ndim != 2 or v.shape[1] != 3 or len(v) < 8 or not np.isfinite(v).all():
        raise ValueError("item orientation needs at least 8 finite vertices")
    if not (0.0 < grip_fraction < 0.5):
        raise ValueError("gripFraction must lie in (0, 0.5)")
    if not (length_art_px > 0 and art_px_per_unit > 0):
        raise ValueError("lengthArtPx and artPixelsPerWorldUnit must be positive")
    centre = v.mean(axis=0)
    rel = v - centre
    eigval, eigvec = np.linalg.eigh(np.cov(rel.T))
    axis = _unit(eigvec[:, int(np.argmax(eigval))])
    t = rel @ axis
    lo, hi = float(t.min()), float(t.max())
    span = hi - lo
    if span < 1e-9:
        raise ValueError("degenerate item geometry: zero length")
    perp = rel - np.outer(t, axis)
    radius = np.linalg.norm(perp, axis=1)
    low_end, high_end = t <= lo + END_SLICE * span, t >= hi - END_SLICE * span
    head_high = radius[high_end].max() >= radius[low_end].max()
    if flip_head:
        head_high = not head_high
    if not head_high:
        axis, t, lo, hi = -axis, -t, -hi, -lo
        low_end, high_end = high_end, low_end
    head = np.flatnonzero(high_end)
    forward = _unit(perp[head[int(np.argmax(radius[head]))]])
    forward = _unit(forward - axis * float(forward @ axis))
    if flip_forward:
        forward = -forward
    # Canonical frame: +Z = head, -Y = forward, X = Y x Z (right-handed).
    z, y = axis, -forward
    x = np.cross(y, z)
    rotation = np.stack([x, y, z])  # rows map model -> canonical
    scale = length_art_px / art_px_per_unit / span
    butt = lo + grip_fraction * span
    near = np.abs(t - butt) <= 0.04 * span
    grip_world = centre + axis * butt + (perp[near].mean(axis=0) if near.any() else 0.0)
    linear = rotation * scale
    translation = -linear @ grip_world  # grip lands on the origin
    transformed = rel @ linear.T + (linear @ centre + translation)
    reach_px = float(np.linalg.norm(transformed, axis=1).max() * art_px_per_unit)
    if max_reach_art_px is not None and reach_px > max_reach_art_px + 1e-6:
        raise ValueError(f"item reaches {reach_px:.1f} art px from its grip; the held canvas allows "
                         f"{max_reach_art_px:.1f}. Lower lengthArtPx or raise gripFraction.")
    shaft = (t >= lo + 0.1 * span) & (t <= lo + 0.6 * span)
    haft_width_px = float(2 * np.median(radius[shaft]) * scale * art_px_per_unit) if shaft.any() else 0.0
    lo_box, hi_box = transformed.min(axis=0), transformed.max(axis=0)
    matrix = np.eye(4)
    matrix[:3, :3], matrix[:3, 3] = linear, translation
    r = lambda a: [round(float(c), 6) for c in a]  # noqa: E731 - small local formatter
    return {"matrix": [r(row) for row in matrix], "grip": [0.0, 0.0, 0.0],
            "iconPivot": r((lo_box + hi_box) / 2), "reachArtPx": round(reach_px, 3),
            "lengthArtPx": length_art_px, "haftWidthArtPx": round(haft_width_px, 3), "headFlipped": bool(flip_head), "forwardFlipped": bool(flip_forward),
            "dimensions": r(hi_box - lo_box)}
