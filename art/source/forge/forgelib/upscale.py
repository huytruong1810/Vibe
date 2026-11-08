"""Per-view upscale pass for reference views below 1024 px tall (C28, PRD-3.1).

  forge.py upscale --asset <id> [--n 2] [--seed S]     re-render every view of the asset's reference sheet at 1100+ px
  forge.py upscale --asset <id> --keep <seed>          replace the reference views with the candidates of that seed

Each view in art/source/references/<asset>/ is enlarged (Lanczos) onto a flat canvas in its own background colour and handed
to the registered edit model as the only reference: "redraw this exact image sharper". The result is cropped to its subject,
chroma-matched to the original, padded like `views`, and compared with the original (silhouette IoU after aligning the subject boxes, mean colour drift).
The contact sheet shows original and candidates side by side (PRD-5: open it). --keep writes the candidates over the
reference views (the sheet.png the views were cut from stays, so the originals can be cut again with `views`) and
records `upscale` in sheet.json. Views already 1024 px tall are left alone.
"""
from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import concept as C
from .color import rgb8_to_oklab
from .core import REPO, ForgeError, gpu_window, reference_dir, slug, work_dir
from .portrait import _bbox, cutout

TARGET_PX = 1100           # subject height after the pass; the padded view is then above the 1024 px floor
FLOOR_PX = 1024
MAX_SIDE = 2304            # one canvas side; larger would not fit the 16 GB GPU with the 4-bit model
PROMPT = ("The reference image is a character reference view. Redraw this exact same image at higher resolution and "
          "sharper: the same creature or character, pose, proportions, markings, colours, shading, camera angle, framing "
          "and plain flat background. Only add fine surface detail and crisp clean edges; change nothing else. "
          "No text, no border, no extra objects.")


def _bg(img: Image.Image) -> tuple[int, int, int]:
    a = np.asarray(img.convert("RGB"))
    return tuple(int(v) for v in np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0))


def _subject(img: Image.Image) -> tuple[int, int, int, int]:
    return _bbox(cutout(img))


def plan(asset: str) -> list[dict]:
    sheet = json.loads((reference_dir(asset) / "sheet.json").read_text())
    out = []
    for view, name in sheet["views"].items():
        img = Image.open(reference_dir(asset) / name).convert("RGB")
        x0, y0, x1, y1 = _subject(img)
        h = y1 - y0 + 1
        k = max(1.0, TARGET_PX / h)
        k = min(k, MAX_SIDE / max(img.size))
        out.append({"view": view, "file": name, "size": img.size, "subjectH": h, "scale": round(k, 3), "skip": img.height >= FLOOR_PX})
    return out


def identity(new: Image.Image, old: Image.Image) -> dict:
    """Silhouette IoU after aligning the subject boxes at 256 px, and mean colour drift over the overlap."""
    def prep(im):
        rgba = cutout(im)
        b = _bbox(rgba)
        return rgba.crop(b)
    a, b = prep(old), prep(new)
    sz = (256, round(256 * a.height / a.width)) if a.width >= a.height else (round(256 * a.width / a.height), 256)
    a, b = a.resize(sz, Image.LANCZOS), b.resize(sz, Image.LANCZOS)
    am, bm = np.asarray(a.split()[3]) > 127, np.asarray(b.split()[3]) > 127
    iou = float((am & bm).sum() / max(1, (am | bm).sum()))
    both = am & bm
    drift = float(np.abs(np.asarray(a.convert("RGB")).astype(np.float32)[both].mean(0)
                         - np.asarray(b.convert("RGB")).astype(np.float32)[both].mean(0)).max()) if both.sum() > 50 else None
    return {"silhouetteIoU": round(iou, 3), "colourDrift": None if drift is None else round(drift, 1)}


def _oklab_to_rgb8(lab: np.ndarray) -> np.ndarray:
    m2inv = np.array([[1.0, 0.3963377774, 0.2158037573], [1.0, -0.1055613458, -0.0638541728], [1.0, -0.0894841775, -1.2914855480]])
    m1inv = np.array([[4.0767416621, -3.3077115913, 0.2309699292], [-1.2684380046, 2.6097574011, -0.3413193965],
                      [-0.0041960863, -0.7034186147, 1.7076147010]])
    lin = np.clip((lab @ m2inv.T) ** 3 @ m1inv.T, 0, 1)
    srgb = np.where(lin <= 0.0031308, 12.92 * lin, 1.055 * np.power(lin, 1 / 2.4) - 0.055)
    return (np.clip(srgb, 0, 1) * 255 + 0.5).astype(np.uint8)


def match_chroma(new: Image.Image, old: Image.Image) -> Image.Image:
    """Shift the new render's mean OKLab a/b over the subject to the original's (lightness untouched): the edit model
    warms and reddens greens and greys; this removes that cast and keeps the added detail."""
    nm, om = np.asarray(cutout(new).split()[3]) > 127, np.asarray(cutout(old).split()[3]) > 127
    if nm.sum() < 100 or om.sum() < 100:
        return new
    na, oa = np.asarray(new.convert("RGB")), np.asarray(old.convert("RGB"))
    nl, ol = rgb8_to_oklab(na), rgb8_to_oklab(oa)
    shift = ol[om][:, 1:].mean(0) - nl[nm][:, 1:].mean(0)
    out = nl.copy()
    out[..., 1:] += shift * nm[..., None]
    rgb = _oklab_to_rgb8(out)
    return Image.fromarray(np.where(nm[..., None], rgb, na))


def finish(raw: Image.Image, bg: tuple[int, int, int] | None = None) -> Image.Image:
    """Crop the render to its subject and pad it like `views` (the subject must not touch the edge). The pad is the
    render's own background colour, so no lighter or darker frame shows."""
    bg = _bg(raw)
    x0, y0, x1, y1 = _subject(raw)
    crop = raw.crop((x0, y0, x1 + 1, y1 + 1))
    pad = max(16, int(0.08 * max(crop.size)))
    canvas = Image.new("RGB", (crop.width + 2 * pad, crop.height + 2 * pad), bg)
    canvas.paste(crop, (pad, pad))
    return canvas


def upscale(asset: str, n: int, seed: int | None, keep: str | None, model: str | None = None) -> str:
    ref = reference_dir(asset)
    if not (ref / "sheet.json").exists():
        raise ForgeError(f"No reference sheet for {asset}; run concept and views first")
    wd = work_dir(f"upscale-{slug(asset)}")
    out = wd / "upscale"
    out.mkdir(parents=True, exist_ok=True)
    if keep:
        return _keep(asset, ref, out, keep)
    todo = [p for p in plan(asset) if not p["skip"]]
    if not todo:
        return "every view is already 1024 px tall or more; nothing to do"
    if not C.IMAGEGEN_PY.exists():
        raise ForgeError("Local image generation isn't set up: bash art/source/forge/imagegen/setup.sh")
    # One shared canvas so a single model load serves every view.
    sizes = [(round(p["size"][0] * p["scale"]), round(p["size"][1] * p["scale"])) for p in todo]
    W, H = (max(s[0] for s in sizes) + 15) // 16 * 16, (max(s[1] for s in sizes) + 15) // 16 * 16
    base = seed if seed is not None else int(time.time()) % 100000
    items = []
    for p, (w, h) in zip(todo, sizes):
        img = Image.open(ref / p["file"]).convert("RGB")
        canvas = Image.new("RGB", (W, H), _bg(img))
        canvas.paste(img.resize((w, h), Image.LANCZOS), ((W - w) // 2, (H - h) // 2))
        rp = out / f"in-{p['view']}.png"
        canvas.save(rp)
        for k in range(n):
            items.append({"id": f"{p['view']}-{base + k}", "prompt": PROMPT, "negative": json.loads(C.STYLE.read_text()).get("negative", ""),
                          "seed": base + k, "references": [str(rp)]})
    style = json.loads(C.STYLE.read_text())
    job = {"model": model or style["model"], "outDir": str(out / "raw"), "width": W, "height": H, "items": items}
    jf = out / f"job-{base}.json"
    jf.write_text(json.dumps(job, indent=1))
    log = wd / "logs" / "upscale.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with gpu_window(), open(log, "w") as f:
        rc = subprocess.run([str(C.IMAGEGEN_PY), str(C.IMAGEGEN / "run_image.py"), str(jf)], stdout=f, stderr=subprocess.STDOUT).returncode
    lines = [l for l in log.read_text(errors="replace").splitlines() if l.startswith("IMAGEGEN ")]
    if rc != 0 or not lines:
        raise ForgeError(f"imagegen failed (exit {rc}); log {log.relative_to(REPO)}")
    info = json.loads(lines[-1][9:])
    (out / f"upscale-{base}.json").write_text(json.dumps({"asset": asset, "imagegen": info, "views": [p["view"] for p in todo]}, indent=1))
    cells, notes = [], []
    for it in info["items"]:
        view = it["id"].rsplit("-", 1)[0]
        orig = Image.open(ref / next(p["file"] for p in todo if p["view"] == view)).convert("RGB")
        new = finish(match_chroma(Image.open(it["file"]).convert("RGB"), orig))
        new.save(out / f"{it['id']}.png")
        rep = identity(new, orig)
        warn = rep["silhouetteIoU"] < 0.9 or (rep["colourDrift"] or 0) > 25
        cells.append((it["id"], orig, new, rep, warn))
        notes.append(f"{it['id']} {new.height}px iou {rep['silhouetteIoU']} drift {rep['colourDrift']}" + (" WARN" if warn else ""))
    contact = _contact(out, cells)
    return (f"{len(cells)} candidates ({info['model']}); " + "; ".join(notes) + f". LOOK at {contact.relative_to(REPO)} "
            f"(original left, candidates right; red = drift warning). Keep with: forge.py upscale --asset {asset} --keep <seed>")


def _contact(out: Path, cells: list, th: int = 420) -> Path:
    views = sorted({c[0].rsplit("-", 1)[0] for c in cells}, key=[c[0].rsplit("-", 1)[0] for c in cells].index)
    rows = []
    for v in views:
        mine = [c for c in cells if c[0].rsplit("-", 1)[0] == v]
        tiles = [("original", mine[0][1], False)] + [(f"{c[0]} iou {c[3]['silhouetteIoU']}", c[2], c[4]) for c in mine]
        rows.append(tiles)
    cw = max(int(t[1].width * th / t[1].height) for r in rows for t in r) + 8
    sheet = Image.new("RGB", (cw * max(len(r) for r in rows), (th + 24) * len(rows)), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    for ry, r in enumerate(rows):
        for rx, (label, im, warn) in enumerate(r):
            t = im.resize((int(im.width * th / im.height), th), Image.LANCZOS)
            sheet.paste(t, (rx * cw + 4, ry * (th + 24) + 20))
            d.text((rx * cw + 4, ry * (th + 24) + 4), f"{label} {im.height}px", fill=(255, 90, 90) if warn else (255, 255, 255))
    p = out / "contact.png"
    sheet.save(p)
    return p


def _keep(asset: str, ref: Path, out: Path, keep: str) -> str:
    meta = next(iter(sorted(out.glob("upscale-*.json"), reverse=True)), None)
    if not meta:
        raise ForgeError("No upscale candidates; run forge.py upscale --asset first")
    rec = json.loads(meta.read_text())
    sheet = json.loads((ref / "sheet.json").read_text())
    done = []
    for view in rec["views"]:
        src = out / f"{view}-{keep}.png"
        if not src.exists():
            raise ForgeError(f"No candidate {src.name} (seeds run base..base+n-1); nothing was written")
    for view in rec["views"]:
        im = Image.open(out / f"{view}-{keep}.png")
        im.save(ref / sheet["views"][view])
        done.append(f"{view} {im.height}px")
    sheet["upscale"] = {"seed": int(keep), "views": rec["views"], "model": rec["imagegen"]["model"],
                        "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    (ref / "sheet.json").write_text(json.dumps(sheet, indent=2) + "\n")
    return f"replaced {', '.join(done)} in {ref.relative_to(REPO)}; sheet.json records the upscale. Re-run prep (forge.py next --asset {asset})"
