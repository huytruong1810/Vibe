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
    def __init__(self, ramps: dict[str, str], shift: dict[str, int] | None = None):
        if not ramps:
            raise ForgeError("No palette ramps assigned. Map every material slot to a ramp in the recipe (ART-4.1).")
        self.slots = list(ramps)
        # rampShift: a dark (or pale) material keeps its lighting bands but sits lower (or
        # higher) on its ramp, e.g. a charcoal shell whose sunlit top must stay dark. Input
        # lever only; deep stays reserved for outlines and interior lines (ART-5).
        shift = shift or {}
        if set(shift) - set(self.slots) or any(type(v) is not int or v not in (-2, -1, 1) for v in shift.values()):
            raise ForgeError("rampShift maps recipe material slots to -2, -1 or 1")
        self.shift = np.array([shift.get(s, 0) for s in self.slots], dtype=np.int64)
        self.names = [ramps[s] for s in self.slots]
        self.rgb = np.array([[ramp(n)[st] for st in STEPS] for n in self.names], dtype=np.uint8)  # (R,5,3)
        lab = rgb8_to_oklab(self.rgb)
        self.lab = lab * np.array([L_WEIGHT, 1, 1])
        self.glossy = np.array([is_glossy(n) for n in self.names])

    def classify(self, albedo8: np.ndarray) -> np.ndarray:
        lab = rgb8_to_oklab(albedo8) * np.array([L_WEIGHT, 1, 1])
        # vs shadow..highlight: without the highlight step, a sheet's specular highlight on a dark
        # ramp lands nearer a pale ramp (teal highlights became cream belly spots, C3d)
        d = np.linalg.norm(lab[:, :, None, None, :] - self.lab[None, None, :, 1:5, :], axis=-1)
        return d.min(axis=-1).argmin(axis=-1)


def _shift(a: np.ndarray, dy: int, dx: int, fill=0) -> np.ndarray:
    """Shift without wrap-around: pixels pushed past an edge vanish and the gap is `fill`.
    (A wrapping roll moved bottom-row pixels to the top row and invented outline pixels there.)"""
    out = np.full_like(a, fill)
    h, w = a.shape[:2]
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    out[yd, xd] = a[ys, xs]
    return out


def _min_regions(labels: np.ndarray, mask: np.ndarray, n: int, min_px: int, exempt: set[int]) -> np.ndarray:
    """Material regions smaller than `min_px` take the dominant label around them. Projected
    sheet highlights land closer to a light ramp (cream) than to the body ramp and leave
    speckle clusters a 3x3 vote can't remove. Slots in `exempt` (fangs, eyes, lures: small on
    purpose) keep their regions."""
    out = labels.copy()
    eight = np.ones((3, 3))
    for _ in range(2):
        changed = False
        for k in range(n):
            if k in exempt:
                continue
            cc, num = ndimage.label((out == k) & mask, structure=eight)
            if not num:
                continue
            sizes = ndimage.sum(np.ones_like(cc), cc, range(1, num + 1))
            for i, size in enumerate(sizes, start=1):
                if size >= min_px:
                    continue
                region = cc == i
                ring = ndimage.binary_dilation(region, structure=eight) & ~region & mask
                if ring.any():
                    vals, cnt = np.unique(out[ring], return_counts=True)
                    out[region] = vals[cnt.argmax()]
                    changed = True
        if not changed:
            break
    return out


def _majority(labels: np.ndarray, mask: np.ndarray, n: int) -> np.ndarray:
    """3x3 majority vote over opaque pixels: removes speckle islands from texture noise."""
    counts = np.stack([ndimage.convolve((labels == k) & mask, np.ones((3, 3)), mode="constant") for k in range(n)])
    out = counts.argmax(axis=0)
    keep = counts.max(axis=0) <= 2  # too few neighbours to vote confidently
    return np.where(mask & ~keep, out, labels)


FEATURE_FACINGS = ("s", "se", "sw", "e", "w")  # a face is out of sight from behind


def _near(track: dict, sockets: list[str], radius: float, h: int, w: int) -> np.ndarray:
    """Pixels within `radius` art pixels of the segment through the named socket tracks."""
    pts = [np.array(track[s_]) for s_ in sockets if s_ in track]
    if not pts:
        raise ForgeError(f"feature sockets {sockets} are not in the bake tracks")
    yy, xx = np.mgrid[0:h, 0:w]
    q = np.stack([xx + 0.5, yy + 0.5], -1)
    a, b = pts[0], pts[-1]
    ab = b - a
    t = np.clip(((q - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
    return np.linalg.norm(q - (a + t[..., None] * ab), axis=-1) <= radius


def _ss_labels(ss_p: Path, k: int, ramps: RampSet, mask: np.ndarray, features: dict,
               track: dict | None = None, facing: str | None = None) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """C26: labels from a K x K supersampled albedo. Each art pixel takes the most common
    non-feature label of its samples; a feature slot (fangs, eyes: smaller than a pixel at game
    size) wins the pixel when at least `minSamples` of its samples hit it and the pixel sits on
    one of its `on` hosts (a slot, or "edge" for a fang hanging past the silhouette), within
    `radiusPx` of the `near` socket segment (default Socket_Head to Socket_Mouth) and on a
    facing in `facings` (default: not from behind). `enclosed` keeps a feature only where all
    eight neighbours are host pixels (an eye inside the face, not the mane fringe beside it);
    `maxPx` (default 4) keeps the pixels with the most samples; `step` (default light) is the
    one ramp step every pixel of the feature takes. A feature
    that lands on one pixel grows to two, because a lone pixel is an orphan (ART-5.4).
    Returns labels, the feature mask and the silhouette extended by edge features."""
    a = _load16(ss_p)
    h, w = mask.shape
    if a.shape[:2] != (h * k, w * k):
        raise ForgeError(f"{ss_p.name}: supersampled pass is {a.shape[1]}x{a.shape[0]}, expected {w * k}x{h * k}")
    sm = a[..., 3] > 0.5
    lab = ramps.classify(_linear_to_srgb8(a[..., :3]))
    n = len(ramps.names)
    cnt = np.stack([((lab == i) & sm).reshape(h, k, w, k).sum(axis=(1, 3)) for i in range(n)])
    cover = sm.reshape(h, k, w, k).sum(axis=(1, 3))
    fids = {ramps.slots.index(sl): spec_ for sl, spec_ in features.items()}
    plain = cnt.copy()
    plain[list(fids)] = -1
    labels = plain.argmax(axis=0)
    has = plain.max(axis=0) > 0
    if has.any() and not has.all():  # only feature samples: take the nearest ordinary pixel's label
        _, (iy, ix) = ndimage.distance_transform_edt(~has, return_indices=True)
        labels = labels[iy, ix]
    best = np.zeros((h, w), dtype=np.int64)
    win = np.full((h, w), -1, dtype=np.int64)
    edge = cover < 0.75 * k * k
    for fid, f in fids.items():
        hosts = [ramps.slots.index(x) for x in f.get("on", []) if x in ramps.slots]
        on = (np.isin(labels, hosts) & mask) | (edge if "edge" in f.get("on", []) else False)
        if facing is not None and facing not in f.get("facings", FEATURE_FACINGS):
            continue
        if track is not None:
            on &= _near(track, f.get("near", ["Socket_Head", "Socket_Mouth"]), f.get("radiusPx", 4), h, w)
        if f.get("enclosed"):
            host = np.isin(labels, hosts) & mask
            on &= ndimage.binary_erosion(host, structure=np.ones((3, 3)), border_value=0)
        ok = (cnt[fid] >= f.get("minSamples", 2)) & on & (cnt[fid] > best)
        cap = f.get("maxPx", 4)
        if ok.sum() > cap:
            order = np.argsort(-np.where(ok, cnt[fid], -1), axis=None, kind="stable")[:cap]
            ok = np.zeros_like(ok)
            ok.flat[order] = True
        win[ok], best[ok] = fid, cnt[fid][ok]
    feat = win >= 0
    for fid in fids:  # grow single-pixel features along their strongest neighbour
        cc, num = ndimage.label(win == fid)
        for i in range(1, num + 1):
            ys, xs = np.nonzero(cc == i)
            if len(ys) > 1:
                continue
            y, x = ys[0], xs[0]
            nbs = [(y + dy, x + dx) for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0))
                   if 0 <= y + dy < h and 0 <= x + dx < w and (mask[y + dy, x + dx] or cover[y + dy, x + dx]) and not feat[y + dy, x + dx]]
            if nbs:
                yy, xx = max(nbs, key=lambda q: (cnt[fid][q], cover[q]))
                win[yy, xx] = fid
                feat[yy, xx] = True
    labels = np.where(feat, win, labels)
    return labels, feat, mask | feat


def pixelize_frame(albedo_p: Path, normal_p: Path, depth_p: Path, ramps: RampSet,
                   detail: set[int] | None = None, ss: dict | None = None) -> tuple[np.ndarray, dict]:
    """`ss` (C26, opt-in): {"path": supersampled albedo, "k": K, "features": {slot: {...}}}."""
    rs = spec("render_spec")
    alb = _load16(albedo_p)
    nrm = _load16(normal_p)
    dep = _load16(depth_p)
    mask = alb[..., 3] > 0.5
    h, w = mask.shape
    feat = np.zeros_like(mask)
    if ss:
        body = mask
        labels, feat, mask = _ss_labels(ss["path"], ss["k"], ramps, mask, ss.get("features", {}),
                                         ss.get("track"), ss.get("facing"))
        if (mask & ~body).any():  # edge features borrow normal and depth from the nearest body pixel
            _, (iy, ix) = ndimage.distance_transform_edt(~body, return_indices=True)
            nrm = np.where((mask & ~body)[..., None], nrm[iy, ix], nrm)
            dep = np.where((mask & ~body)[..., None], dep[iy, ix], dep)
        fixed = labels.copy()
        detail = (detail or set()) | {ramps.slots.index(sl) for sl in ss.get("features", {})}
    else:
        labels = ramps.classify(_linear_to_srgb8(alb[..., :3]))
    labels = _majority(labels, mask, len(ramps.names))
    frac = rs.get("pixelize", {}).get("minRegionFraction", 0.0)
    if frac:
        labels = _min_regions(labels, mask, len(ramps.names), max(4, int(round(frac * mask.sum()))), detail or set())
    if ss:  # feature slots belong to feature pixels only: the votes above must not spread them
        fslots = [ramps.slots.index(sl) for sl in ss.get("features", {})]
        labels = np.where(feat | ~np.isin(labels, fslots), labels, fixed)
        labels = np.where(feat, fixed, labels)

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
    if ramps.shift.any():
        step = np.clip(step + ramps.shift[labels], 1, 3)
    gloss = ramps.glossy[labels] & (ndl >= b["highlightAbove"])
    step = np.where(gloss, 4, step)
    if ss:  # one colour per feature so a 2-pixel fang or eye is never an orphan (ART-5.4)
        fstep = np.full(len(ramps.slots), 3)
        for sl, f in ss.get("features", {}).items():
            st = f.get("step", "light")
            if st not in STEPS[1:]:
                raise ForgeError(f"feature {sl}: step is one of {', '.join(STEPS[1:])} (deep is for outlines, ART-5)")
            fstep[ramps.slots.index(sl)] = STEPS.index(st)
        step = np.where(feat, fstep[labels], step)

    depth = dep[..., 0] * 2 * DEPTH_RANGE + (CAM_DIST - DEPTH_RANGE)
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., :3] = ramps.rgb[labels, step]
    out[..., 3] = np.where(mask, 255, 0)

    # interior lines where depth jumps: the farther pixel takes its ramp's deep step (ART-5.3)
    thr = rs["outline"]["interiorDepthJumpWorldUnits"]
    interior = np.zeros_like(mask)
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nb_depth = _shift(depth, dy, dx)
        nb_mask = _shift(mask, dy, dx)
        interior |= mask & nb_mask & (depth - nb_depth > thr)
    interior &= ~feat
    out[interior, :3] = ramps.rgb[labels[interior], 0]

    # orphan cleanup: a body pixel unlike all 8 neighbours takes the most common neighbour colour
    flat = (out[..., 0].astype(np.int64) << 16) | (out[..., 1].astype(np.int64) << 8) | out[..., 2]
    for y, x in zip(*np.nonzero(mask & ~feat)):
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
        src_mask = _shift(mask, dy, dx)
        src_lab = _shift(labels, dy, dx)
        cand = ~mask & src_mask & (outline[..., 3] == 0)
        stepi = 1 if lit and rs["outline"].get("topLitExteriorStep") == "shadow" else 0
        outline[cand, :3] = ramps.rgb[src_lab[cand], stepi]
        outline[cand, 3] = 255
    # pixel-perfect pass: drop L-corner outline pixels (ART-5.4)
    om = outline[..., 3] > 0
    up, dn = _shift(om, 1, 0), _shift(om, -1, 0)
    lf, rt = _shift(om, 0, 1), _shift(om, 0, -1)
    corner = om & (((up & rt) | (rt & dn) | (dn & lf) | (lf & up)) & ((up.astype(int) + dn + lf + rt) == 2))
    body_diag = np.zeros_like(om)
    for dy, dx in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        body_diag |= _shift(mask, dy, dx)
    body_orth = _shift(mask, 1, 0) | _shift(mask, -1, 0) | _shift(mask, 0, 1) | _shift(mask, 0, -1)
    outline[corner & body_diag & ~body_orth] = 0
    final = _clean_orphans(np.where(outline[..., 3:] > 0, outline, out), protect=feat)

    info = {
        "labels": {ramps.slots[k]: int(((labels == k) & mask).sum()) for k in range(len(ramps.names))},
        "interiorLinePx": int(interior.sum()),
    }
    if ss:
        info["featurePx"] = {sl: int(((labels == ramps.slots.index(sl)) & feat).sum()) for sl in ss.get("features", {})}
    return final, info


def _clean_orphans(img: np.ndarray, passes: int = 4, protect: np.ndarray | None = None) -> np.ndarray:
    """Final pass with QA's exact definition (ART-5.4): an interior pixel (all four neighbours
    opaque) whose colour matches none of its 8 neighbours takes their most common colour.
    Runs on the composited frame, because the outline turns former edge pixels into interior."""
    img = img.copy()
    for _ in range(passes):
        a = img[..., 3] > 0
        interior = a & _shift(a, 1, 0) & _shift(a, -1, 0) & _shift(a, 0, 1) & _shift(a, 0, -1)
        flat = (img[..., 0].astype(np.int64) << 16) | (img[..., 1].astype(np.int64) << 8) | img[..., 2]
        same = np.zeros_like(a)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    same |= (_shift(flat, dy, dx) == flat) & _shift(a, dy, dx)
        bad = interior & ~same
        if protect is not None:
            bad &= ~protect
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


def run_dir(bake_dir: Path, out_dir: Path, ramps_map: dict[str, str], detail_slots: list[str] | None = None,
            ramp_shift: dict[str, int] | None = None, supersample: int = 1, features: dict | None = None) -> dict:
    ramps = RampSet(ramps_map, ramp_shift)
    if set(features or {}) - set(ramps.slots):
        raise ForgeError("features name recipe material slots (C26)")
    detail = {ramps.slots.index(sl) for sl in (detail_slots or []) if sl in ramps.slots}
    tracks = json.loads((bake_dir / "tracks.json").read_text())
    summary = {}
    for clip, facings in tracks["clips"].items():
        (out_dir / clip).mkdir(parents=True, exist_ok=True)
        (out_dir / "export" / clip).mkdir(parents=True, exist_ok=True)
        for facing, frames in facings.items():
            for i in range(len(frames)):
                base = bake_dir / clip / f"{facing}_{i}_"
                ss = {"path": Path(f"{base}albedo_ss.png"), "k": supersample, "features": features or {},
                      "track": frames[i], "facing": facing} if supersample > 1 else None
                img, info = pixelize_frame(Path(f"{base}albedo.png"), Path(f"{base}normal.png"), Path(f"{base}depth.png"), ramps, detail, ss)
                Image.fromarray(img).save(out_dir / clip / f"{facing}_{i}.png")
                Image.fromarray(upscale2(img)).save(out_dir / "export" / clip / f"{facing}_{i}.png")
                summary[f"{clip}/{facing}_{i}"] = info
    (out_dir / "pixelize.json").write_text(json.dumps(summary, indent=1))
    return summary
