"""qa: structural checks on pixelized frames plus the 4x contact sheet (doctrine PRD-6).

QA can only ever produce `candidate` (L7). Every failure names the doctrine rule it enforces;
fixes go to inputs, never to limits or code (PRD-6.3).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .color import all_palette_rgb, rgb8_to_oklab
from .core import REPO, WORK, spec
from .pixelize import RampSet

GROUND = ["ground_grass", "ground_dirt", "ground_sand", "ground_freshwater"]
ORDER = ["s", "se", "e", "ne", "n", "nw", "w", "sw"]


def _frames(pix_dir: Path) -> dict[str, dict[str, list[Path]]]:
    out: dict[str, dict[str, list[Path]]] = {}
    for clip_dir in sorted(p for p in pix_dir.iterdir() if p.is_dir() and p.name != "export"):
        for f in sorted(clip_dir.glob("*.png")):
            facing, idx = f.stem.rsplit("_", 1)
            out.setdefault(clip_dir.name, {}).setdefault(facing, []).append(f)
    for clip in out.values():
        for facing in clip:
            clip[facing].sort(key=lambda p: int(p.stem.rsplit("_", 1)[1]))
    return out


def _check(results: list, key: str, rule: str, ok: bool, detail: str, hard: bool = True) -> None:
    results.append({"check": key, "rule": rule, "pass": bool(ok), "hard": hard, "detail": detail})


def run(asset_id: str, pix_dir: Path, bake_dir: Path, ramps_map: dict, canvas: dict, kind: str,
        height_target: int, reference_cutout: Path | None) -> dict:
    rs = spec("render_spec")
    q = rs["qa"]
    frames = _frames(pix_dir)
    tracks = json.loads((bake_dir / "tracks.json").read_text())
    W, H = canvas["size"]
    AX, AY = canvas["anchor"]
    results: list = []
    imgs = {(c, f, i): np.array(Image.open(p)) for c, fs in frames.items() for f, ps in fs.items() for i, p in enumerate(ps)}
    ramps = RampSet(ramps_map)

    sizes = {im.shape[:2] for im in imgs.values()}
    _check(results, "canvas", "spec canvases", sizes == {(H, W)}, f"frame sizes {sorted(sizes)}, expected {(H, W)}")

    m = rs["marginsArtPixels"]["min"]
    worst = min(min(np.nonzero(im[..., 3])[1].min(), np.nonzero(im[..., 3])[0].min(),
                    W - 1 - np.nonzero(im[..., 3])[1].max(), H - 1 - np.nonzero(im[..., 3])[0].max())
                for im in imgs.values() if im[..., 3].any())
    _check(results, "margins", "contract margins", worst >= m, f"smallest transparent margin {worst}px (need >= {m})")

    drift = max(abs(e["root"][0] - AX) + abs(e["root"][1] - AY)
                for fs in tracks["clips"].values() for es in fs.values() for e in es)
    _check(results, "anchorDrift", "L2", drift <= q["anchorDriftMaxPx"] + 0.01, f"max root drift {drift:.3f}px")

    tops = [AY - np.nonzero(im[..., 3])[0].min() for im in imgs.values() if im[..., 3].any()]
    tall = max(tops)
    _check(results, "height", "ART-6.1", abs(tall - height_target) <= q["heightToleranceArtPx"] + 1,
           f"tallest extent above anchor {tall}px (target {height_target} +/- {q['heightToleranceArtPx']}, outline adds 1)")

    rest_clip = next(iter(frames))
    areas = {f: int((imgs[(rest_clip, f, 0)][..., 3] > 0).sum()) for f in frames[rest_clip]}
    med = float(np.median(list(areas.values())))
    ratio = {f: round(a / med, 2) for f, a in areas.items()}
    lo, hi = q["facingSilhouetteAreaRatio"]["min"], q["facingSilhouetteAreaRatio"]["max"]
    _check(results, "facingSilhouetteRatio", "ART-7", all(lo <= r <= hi for r in ratio.values()), f"area / median per facing {ratio}")

    pal = all_palette_rgb()
    colors = set()
    for im in imgs.values():
        colors |= {tuple(c) for c in im[im[..., 3] > 0][:, :3]}
    off = [c for c in colors if c not in pal]
    _check(results, "paletteMembership", "ART-4.1", not off, f"{len(off)} off-palette colours")
    limit = spec("palette")["rules"]["maxColorsCreature" if kind == "creature" else "maxColorsActor"]
    _check(results, "colorCount", "ART-4.4", len(colors) <= limit, f"{len(colors)} colours (limit {limit})")

    outline_cols = {tuple(c) for c in ramps.rgb[:, :2].reshape(-1, 3)}
    bad_edge = orphans = 0
    for im in imgs.values():
        a = im[..., 3] > 0
        edge = a & ~(np.roll(a, 1, 0) & np.roll(a, -1, 0) & np.roll(a, 1, 1) & np.roll(a, -1, 1))
        bad_edge += sum(tuple(c) not in outline_cols for c in im[edge][:, :3])
        flat = (im[..., 0].astype(np.int64) << 16) | (im[..., 1].astype(np.int64) << 8) | im[..., 2]
        interior = a & ~edge
        same = np.zeros_like(a)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    same |= np.roll(flat, (dy, dx), (0, 1)) == flat
        orphans += int((interior & ~same).sum())
    _check(results, "outlineContinuity", "ART-5.1", bad_edge == 0, f"{bad_edge} silhouette pixels not in an outline step")
    _check(results, "orphans", "ART-5.4", orphans <= q["orphanPixelsMax"], f"{orphans} orphan interior pixels")

    flick = []
    for c, fs in frames.items():
        for f, ps in fs.items():
            for i in range(1, len(ps)):
                a, b = imgs[(c, f, i - 1)], imgs[(c, f, i)]
                flick.append(float((np.any(a != b, axis=-1)).mean()))
    if flick:
        _check(results, "idleFlicker", "ART-9.3", max(flick) <= q["idleFlickerMaxChangedFraction"] or rest_clip != "idle",
               f"max changed fraction between frames {max(flick):.3f}", hard=False)

    south = imgs[(rest_clip, "s", 0)]
    body = south[south[..., 3] > 0][:, :3]
    actor_L = float(np.median(rgb8_to_oklab(body)[:, 0]))
    contrasts = {}
    for g in GROUND:
        p = REPO / "art/source/exports/environment" / f"{g}.png"
        if p.exists():
            contrasts[g] = round(abs(actor_L - float(np.median(rgb8_to_oklab(np.array(Image.open(p).convert("RGB")).reshape(-1, 3))[:, 0]))), 3)
    need = q["valueContrast"]["minDeltaLOk"]
    _check(results, "valueContrast", "ART-7.3", all(v >= need for v in contrasts.values()),
           f"median L delta vs ground {contrasts} (need >= {need})", hard=False)

    if reference_cutout and reference_cutout.exists():
        ref = np.array(Image.open(reference_cutout).convert("RGBA"))
        ref_px = ref[ref[..., 3] > 0][:, :3]
        da = np.abs(np.median(rgb8_to_oklab(ref_px)[:, 1:], axis=0) - np.median(rgb8_to_oklab(body)[:, 1:], axis=0))
        dist = float(np.linalg.norm(da))
        _check(results, "referenceFidelity", "PRD-3.5", dist <= q["referenceFidelity"]["maxDominantColorDeltaEOk"],
               f"hue/chroma distance to reference {dist:.3f}")

    # cast distinctness against every other asset with a QA signature (ART-7.1)
    sig_mask = south[..., 3] > 0
    signature = {"asset": asset_id, "kind": kind, "southMask": sig_mask.astype(int).tolist(),
                 "rampShares": _ramp_shares(south, ramps)}
    worst_pair = None
    for other in WORK.glob("*/qa_signature.json"):
        o = json.loads(other.read_text())
        if o["asset"] == asset_id or o["kind"] != kind:
            continue
        om = np.array(o["southMask"], dtype=bool)
        if om.shape != sig_mask.shape:
            continue
        iou = float((om & sig_mask).sum() / max((om | sig_mask).sum(), 1))
        keys = set(o["rampShares"]) | set(signature["rampShares"])
        hist = sum(abs(o["rampShares"].get(k, 0) - signature["rampShares"].get(k, 0)) for k in keys) / 2
        distinct = hist >= q["castDistinctness"]["minPaletteHistogramDistance"] or iou <= q["castDistinctness"]["maxSilhouetteIoU"]
        if not distinct:
            worst_pair = (o["asset"], round(iou, 2), round(hist, 2))
    _check(results, "castDistinctness", "ART-7.1", worst_pair is None,
           "distinct from all other assets" if worst_pair is None else f"too similar to {worst_pair[0]} (IoU {worst_pair[1]}, palette distance {worst_pair[2]})")

    hard_fail = [r for r in results if r["hard"] and not r["pass"]]
    report = {"asset": asset_id, "status": "candidate" if not hard_fail else "draft", "maxStatus": q["maxStatus"],
              "checks": results, "colors": len(colors), "frames": len(imgs)}
    return report, signature


def _ramp_shares(img: np.ndarray, ramps: RampSet) -> dict[str, float]:
    px = img[img[..., 3] > 0][:, :3]
    out: dict[str, float] = {}
    for k, name in enumerate(ramps.names):
        cols = {tuple(c) for c in ramps.rgb[k]}
        out[name] = round(sum(tuple(c) in cols for c in px) / max(len(px), 1), 3)
    return out


def contact_sheet(asset_id: str, pix_dir: Path, canvas: dict, report: dict, reference: Path | None, out: Path) -> None:
    """4x nearest contact sheet: every clip x facing x frame on grey and on grass, anchor marked,
    reference beside it (PRD-5, PRD-9)."""
    scale = spec("render_spec")["qa"]["contactSheetScale"]
    frames = _frames(pix_dir)
    W, H = canvas["size"]
    AX, AY = canvas["anchor"]
    grass_p = REPO / "art/source/exports/environment/ground_grass.png"
    grass = Image.open(grass_p).convert("RGBA").resize((32, 32), Image.NEAREST) if grass_p.exists() else None
    cols = max(len(ps) for fs in frames.values() for ps in fs.values()) * len(ORDER)
    rows = sum(2 for _ in frames)
    pad, head = 2, 14
    sheet_w = (W + pad) * cols + pad
    ref_w = 0
    ref_img = None
    if reference and reference.exists():
        ref_img = Image.open(reference).convert("RGBA")
        ref_img.thumbnail((10 ** 6, (H + pad) * 2 * scale), Image.LANCZOS)
        ref_w = ref_img.width // scale + pad
    sheet = Image.new("RGBA", (sheet_w + ref_w, head + rows * (H + pad) + pad), (40, 42, 52, 255))
    d = ImageDraw.Draw(sheet)
    d.text((pad, 1), f"{asset_id}  status={report['status']}  colours={report['colors']}", fill=(220, 220, 220, 255))
    y = head
    for clip, fs in frames.items():
        for row_kind in ("grey", "grass"):
            x = pad
            for facing in ORDER:
                for p in fs.get(facing, []):
                    tile = Image.new("RGBA", (W, H), (110, 114, 128, 255))
                    if row_kind == "grass" and grass:
                        for gy in range(0, H, 32):
                            for gx in range(0, W, 32):
                                tile.alpha_composite(grass, (gx, gy))
                    tile.alpha_composite(Image.open(p).convert("RGBA"))
                    if row_kind == "grey":
                        td = ImageDraw.Draw(tile)
                        td.point([(AX - 2, AY), (AX + 1, AY), (AX, AY + 1)], fill=(255, 40, 40, 255))
                    sheet.alpha_composite(tile, (x, y))
                    x += W + pad
            d.text((sheet_w - 40, y), f"{clip}", fill=(200, 200, 200, 255))
            y += H + pad
    big = sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST)
    if ref_img:
        big.alpha_composite(ref_img, (sheet_w * scale, head * scale))
    big.save(out)
