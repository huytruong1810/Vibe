"""Swatch -> seamless, palette-locked 32-px material tiles with border-locked variants (ART-11.2).

The swatch gives structure (where it is light or dark); the recipe gives the colours (at most
four palette values) and how much of each. Steps:
  1. downscale the swatch to art pixels (area average) and measure Oklab lightness;
  2. pick the windows whose wrap edges already nearly match and whose lighting is even;
  3. remove what still jumps across the wrap edges with a smooth ramp, then high-pass away
     the swatch's lighting so a field of tiles shows no grid;
  4. quantise by rank to the recipe's proportions, then clear isolated pixels;
  5. variants share the base tile's border band exactly, so every tile fits every other.
"""

from __future__ import annotations

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

from .core import N4, N8, TileError, colour, ref_l, shift, spec

DEFAULT_PROPORTIONS = {2: [0.5, 0.5], 3: [0.25, 0.5, 0.25], 4: [0.18, 0.42, 0.28, 0.12]}


def load_swatch(path, swatch_tile_px: float, tile_px: int):
    try:
        im = Image.open(path).convert("RGBA")
    except FileNotFoundError:
        raise TileError(f"swatch not found: {path}") from None
    scale = tile_px / swatch_tile_px
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    small = im.resize(size, Image.Resampling.BOX)
    a = np.asarray(small, dtype=np.float64) / 255.0
    from .core import oklab_l

    return oklab_l(a[..., :3]), a[..., 3] > 0.99


def _box(a: np.ndarray, h: int, w: int) -> np.ndarray:
    """Sum of every h x w window (valid positions only) via an integral image."""
    s = np.pad(a, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    return s[h:, w:] - s[:-h, w:] - s[h:, :-w] + s[:-h, :-w]


OVERLAP = 6  # art px blended across each wrap edge from the swatch's own continuation


def window_costs(L, opaque, w, h, wrap_x, wrap_y):
    """Cost of every window: how different the overlap strips are (they are blended together),
    plus uneven lighting. inf where the extended window is not fully opaque."""
    H, W = L.shape
    bx, by = (OVERLAP if wrap_x else 0), (OVERLAP if wrap_y else 0)
    ew, eh = w + bx, h + by
    if H < eh or W < ew:
        raise TileError(
            f"swatch is {W}x{H} art px after scaling but one tile needs {ew}x{eh} (tile plus overlap); "
            "lower swatchTilePx or supply a larger swatch")
    ny, nx = H - eh + 1, W - ew + 1
    cost = np.zeros((ny, nx))
    if wrap_x:
        d = np.abs(L[:, : W - w] - L[:, w:])
        cost += _box(d, eh, bx)[:ny, :nx] / (eh * bx)
    if wrap_y:
        d = np.abs(L[: H - h] - L[h:])
        cost += _box(d, by, ew)[:ny, :nx] / (by * ew)
    hh, hw = h // 2, w // 2
    quads = [_box(L, hh, hw)[oy: oy + ny, ox: ox + nx] / (hh * hw)
             for oy in (0, hh) for ox in (0, hw)]
    cost += 0.5 * (np.max(quads, axis=0) - np.min(quads, axis=0))
    holes = _box((~opaque).astype(np.float64), eh, ew)
    cost[holes > 0] = np.inf
    return cost


def pick_windows(cost, count, w, h, forced=None):
    picks = [tuple(forced)] if forced else []
    order = np.argsort(cost, axis=None)
    for flat in order:
        if len(picks) >= count:
            break
        y, x = np.unravel_index(flat, cost.shape)
        if not np.isfinite(cost[y, x]):
            break
        if all(max(abs(int(x) - px), abs(int(y) - py)) >= min(w, h) // 2 for px, py in picks):
            picks.append((int(x), int(y)))
    if len(picks) < count:
        raise TileError(
            f"the swatch holds only {len(picks)} distinct opaque windows; {count} are needed "
            "(base + variants). Supply a larger swatch, lower swatchTilePx or ask for fewer variants")
    return picks


def _blend(a, b, wgt, mu):
    """Variance-preserving cross-fade (two unrelated textures averaged would go flat)."""
    return mu + (wgt * (a - mu) + (1 - wgt) * (b - mu)) / np.sqrt(wgt**2 + (1 - wgt) ** 2)


def make_periodic(ext, w, h, wrap_x, wrap_y, flatten):
    """ext is the window plus OVERLAP px past its right/bottom edge. The first OVERLAP columns
    are cross-faded with the columns just past the right edge, so column 0 continues column w-1
    exactly as the swatch did (same for rows)."""
    T = ext.copy()
    mu = T.mean()
    a = 1.0 - (np.arange(OVERLAP) + 0.5) / OVERLAP
    if wrap_x:
        for i in range(OVERLAP):
            T[:, i] = _blend(T[:, w + i], T[:, i], a[i], mu)
        T = T[:, :w]
    if wrap_y:
        for i in range(OVERLAP):
            T[i] = _blend(T[h + i], T[i], a[i], mu)
        T = T[:h]
    if flatten:
        modes = ["wrap" if wrap_y else "nearest", "wrap" if wrap_x else "nearest"]
        T = T - gaussian_filter(T, flatten, mode=modes) + T.mean()
    return remove_tile_waves(T, wrap_x, wrap_y)


def remove_tile_waves(L, wrap_x, wrap_y):
    """Zero the lighting waves one tile long (what reads as a grid when the tile repeats)."""
    if wrap_x and wrap_y:
        F = np.fft.fft2(L)
        for i, j in ((0, 1), (1, 0), (1, 1), (1, -1)):
            F[i, j] = F[-i, -j] = 0
        return np.real(np.fft.ifft2(F))
    if wrap_x:
        F = np.fft.fft(L, axis=1)
        F[:, 1] = F[:, -1] = 0
        return np.real(np.fft.ifft(F, axis=1))
    return L


def _modes(wrap_x, wrap_y):
    return ["wrap" if wrap_y else "nearest", "wrap" if wrap_x else "nearest"]


def cleanup(idx, wrap_x, wrap_y, locked=None, iters=4):
    """Give every pixel with no same-valued 4-neighbour the most common 8-neighbour value."""
    idx = idx.copy()
    locked = np.zeros(idx.shape, bool) if locked is None else locked
    k = int(idx.max()) + 1
    for _ in range(iters):
        same = sum((shift(idx, dy, dx, wrap_x, wrap_y) == idx) for dy, dx in N4)
        orphan = (same == 0) & ~locked
        if not orphan.any():
            break
        nb = np.stack([shift(idx, dy, dx, wrap_x, wrap_y) for dy, dx in N8])
        counts = np.stack([(nb == v).sum(0) for v in range(k)])
        idx[orphan] = counts.argmax(0)[orphan]
    return idx


def edge_distance(h, w, wrap_x, wrap_y):
    y, x = np.mgrid[0:h, 0:w]
    big = np.full((h, w), 10**6)
    dx = np.minimum(x, w - 1 - x) if wrap_x else big
    dy = np.minimum(y, h - 1 - y) if wrap_y else big
    return np.minimum(dx, dy)


def build_material(m: dict, set_dir, tile_px: int):
    """Returns the material record: refs, colours, base index tile, variants, provenance."""
    refs = list(m["values"])
    for r in refs:
        colour(r)  # validate names early
    props = m.get("proportions") or DEFAULT_PROPORTIONS[len(refs)]
    if len(props) != len(refs):
        raise TileError(f"material {m['id']}: {len(props)} proportions for {len(refs)} values")
    order = sorted(range(len(refs)), key=lambda i: ref_l(refs[i]))
    notes = []
    if order != list(range(len(refs))):
        notes.append("values reordered dark to light by Oklab L")
    refs = [refs[i] for i in order]
    props = np.array([props[i] for i in order], float)
    props = props / props.sum()

    wrap = m.get("wrap", "xy")
    wrap_x, wrap_y = True, wrap == "xy"
    h = m.get("heightPx", tile_px) if wrap == "x" else tile_px
    w = tile_px
    L, opaque = load_swatch(set_dir / m["swatch"], m.get("swatchTilePx", 128), tile_px)
    count = 1 + m.get("variants", 0)
    cost = window_costs(L, opaque, w, h, wrap_x, wrap_y)
    picks = pick_windows(cost, count, w, h, m.get("window"))
    flatten = m.get("flatten", 0)
    cluster = m.get("cluster", 0.7)
    modes = _modes(wrap_x, wrap_y)

    ew, eh = w + (OVERLAP if wrap_x else 0), h + (OVERLAP if wrap_y else 0)

    def field(px, py):
        return make_periodic(L[py: py + eh, px: px + ew], w, h, wrap_x, wrap_y, flatten)

    base_l = field(*picks[0])
    smooth = gaussian_filter(base_l, cluster, mode=modes) if cluster else base_l
    thresholds = np.quantile(smooth, np.cumsum(props)[:-1])
    base = cleanup(np.searchsorted(thresholds, smooth), wrap_x, wrap_y)

    extra = []
    for row_key, ref in (m.get("rows") or {}).items():
        if ref not in refs and ref not in extra:
            colour(ref)
            extra.append(ref)
    all_refs = refs + extra

    def apply_rows(idx):
        for row_key, ref in (m.get("rows") or {}).items():
            idx[int(row_key)] = all_refs.index(ref)
        return idx

    base = apply_rows(base)
    border = spec()["qa"]["variantBorderPx"]
    dist = edge_distance(h, w, wrap_x, wrap_y)
    locked = dist < border
    variants = []
    mu, sd = base_l.mean(), base_l.std() or 1.0
    for px, py in picks[1:]:
        lv = field(px, py)
        lv = (lv - lv.mean()) / (lv.std() or 1.0) * sd + mu
        mix_w = np.clip((dist - border + 1) / 4.0, 0, 1)
        mixed = mu + (mix_w * (lv - mu) + (1 - mix_w) * (base_l - mu)) / np.sqrt(mix_w**2 + (1 - mix_w) ** 2)
        mixed = remove_tile_waves(mixed, wrap_x, wrap_y)
        sm = gaussian_filter(mixed, cluster, mode=modes) if cluster else mixed
        idx = np.searchsorted(thresholds, sm)
        idx[locked] = base[locked]
        idx = apply_rows(cleanup(idx, wrap_x, wrap_y, locked=locked))
        variants.append(idx)

    return {
        "kind": "strip" if wrap == "x" else "material",
        "id": m["id"],
        "runtimeId": m.get("runtimeId"),
        "refs": all_refs,
        "colours": [colour(r) for r in all_refs],
        "proportions": props.tolist(),
        "base": base,
        "variants": variants,
        "windows": picks,
        "wrap": wrap,
        "notes": notes,
    }


def rgba(idx: np.ndarray, colours, alpha=None) -> np.ndarray:
    pal = np.array(colours, np.uint8)
    out = np.zeros(idx.shape + (4,), np.uint8)
    valid = idx >= 0
    out[valid, :3] = pal[idx[valid]]
    out[valid, 3] = 255
    if alpha is not None:
        out[..., 3] = np.where(alpha, out[..., 3], 0)
    return out
