"""Nine-expression portrait sets from one neutral portrait (C30b, portrait contract v2, PRD-3/7/8).

  forge.py portrait --asset <kind:id> [--emotions warm,sad] [--n 2] [--seed S]     generate candidates
  forge.py portrait --asset <kind:id> --pick warm=p123,sad=p9                       keep the chosen candidates

The neutral portrait (art/source/exports/portraits/portrait_<kind>_<id>_128.png) is the identity source. It is
upscaled onto a flat background and given to the registered edit model as the reference; the prompt changes only
the expression. Each candidate is keyed back to alpha, aligned to the neutral's framing, and exported at 128 and 96
px. The contact sheet shows the neutral beside every candidate (PRD-5: open it). --pick writes
art/source/exports/portraits/expressions/<kind>_<id>/<emotion>_<96|128>.png and logs the seeds in the image ledger.
Manifest registration stays with the communicator (art:integrate).
"""
from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from . import concept as C
from .core import REPO, ForgeError, gpu_window, slug, work_dir

PORTRAITS = REPO / "art/source/exports/portraits"
EXPRESSIONS = PORTRAITS / "expressions"
EMOTIONS = ["neutral", "warm", "thoughtful", "curious", "concerned", "amused", "angry", "sad", "fearful"]
SIZES = (128, 96)
BG = (128, 128, 128)
WORK_PX = 1024

# What changes in the face, in words an edit model follows. Eyes, brows and mouth carry it; the head stays put.
FACE = {
    "warm": "a warm, kind smile with soft relaxed eyes and slightly raised cheeks",
    "thoughtful": "a thoughtful look: eyes glancing slightly aside and up, brows gently drawn together, lips closed and relaxed",
    "curious": "a curious look: one eyebrow raised, eyes wide and attentive, head tilted very slightly, lips parted a little",
    "concerned": "a concerned look: brows drawn up and together in the middle, eyes worried, mouth a small flat frown",
    "amused": "an amused look: a lopsided smirk, eyes bright and slightly narrowed, one brow raised",
    "angry": "an angry look: brows lowered and pulled together, eyes narrowed and hard, mouth tight with the corners down",
    "sad": "a sad look: brows tilted up in the middle, eyes lowered and glistening, mouth corners down",
    "fearful": "a fearful look: brows raised high, eyes wide open, mouth slightly open, tense",
}
PROMPT = ("The reference image is a character portrait. Redraw this exact same character: the same face shape, "
          "hair, skin, clothing, colours, framing, scale, camera angle and painterly pixel-art rendering, on the same "
          "flat grey background. Change only the facial expression to {face}. Keep the head, shoulders and "
          "outline in the same position. No text, no border.")


def neutral_path(asset: str, size: int = 128) -> Path:
    p = PORTRAITS / f"portrait_{slug(asset).replace('-', '_', 1)}_{size}.png"
    if not p.exists():
        raise ForgeError(f"No neutral portrait {p.relative_to(REPO)} for {asset}: the neutral is the identity source")
    return p


def on_flat(img: Image.Image, size: int = WORK_PX, bg=BG) -> Image.Image:
    """The neutral (RGBA) upscaled and composited on a flat background: the edit model's reference."""
    big = img.convert("RGBA").resize((size, size), Image.LANCZOS)
    base = Image.new("RGBA", big.size, (*bg, 255))
    base.alpha_composite(big)
    return base.convert("RGB")


def cutout(img: Image.Image, tol: int = 28) -> Image.Image:
    """Flat-background render to RGBA: pixels near the border colour that connect to the border become transparent,
    specks are dropped, the edge is feathered by one pixel."""
    a = np.asarray(img.convert("RGB")).astype(np.int16)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    near = np.abs(a - bg).max(axis=2) <= tol
    lab, _ = ndimage.label(near)
    edge_labels = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge_labels))
    subject = ~bgmask
    lab2, n = ndimage.label(subject)
    if n == 0:
        raise ForgeError("cutout found no subject (the render is all background)")
    sizes = ndimage.sum(subject, lab2, range(1, n + 1))
    keep = [i + 1 for i, v in enumerate(sizes) if v >= 0.03 * sizes.max()]  # drop specks, keep detached hair wisps
    subject = np.isin(lab2, keep)
    subject = ndimage.binary_fill_holes(subject)
    alpha = ndimage.gaussian_filter(subject.astype(np.float32), 0.8)
    alpha = np.where(subject, np.maximum(alpha, 0.0), alpha)
    rgba = np.dstack([a.clip(0, 255).astype(np.uint8), (alpha * 255).round().astype(np.uint8)])
    return Image.fromarray(rgba)


def _bbox(img: Image.Image, thr: int = 40) -> tuple[int, int, int, int]:
    box = Image.fromarray((np.asarray(img.split()[3]) > thr).astype(np.uint8) * 255).getbbox()
    if not box:
        raise ForgeError("empty alpha")
    return box


def align(img: Image.Image, neutral: Image.Image) -> Image.Image:
    """Scale and shift so the subject's alpha bbox matches the neutral's (same framing for every expression)."""
    nb = _bbox(neutral)
    sb = _bbox(img)
    s = (nb[3] - nb[1]) / max(1, sb[3] - sb[1])
    scaled = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)
    sb = _bbox(scaled)
    out = Image.new("RGBA", neutral.size, (0, 0, 0, 0))
    # Horizontal centres match, bottoms match (alpha_composite takes only non-negative offsets, so paste with the mask).
    dx = (nb[0] + nb[2]) // 2 - (sb[0] + sb[2]) // 2
    dy = nb[1] - sb[1]
    out.paste(scaled, (dx, dy), scaled)
    return out


def downscale(img: Image.Image, size: int) -> Image.Image:
    return img.resize((size, size), Image.LANCZOS)


def identity_report(candidate: Image.Image, neutral: Image.Image) -> dict:
    """Cheap identity checks on the aligned 128 px images: silhouette overlap and clothing/hair colour drift.
    These flag drift; they never prove an expression is right (look at the sheet)."""
    ca, na = np.asarray(candidate.split()[3]) > 127, np.asarray(neutral.split()[3]) > 127
    iou = float((ca & na).sum() / max(1, (ca | na).sum()))
    h = candidate.height
    lower = np.zeros_like(ca)
    lower[int(h * 0.62):] = True  # below the chin: clothing and shoulders
    both = ca & na & lower
    if both.sum() < 50:
        drift = None
    else:
        c = np.asarray(candidate.convert("RGB")).astype(np.float32)[both].mean(0)
        n = np.asarray(neutral.convert("RGB")).astype(np.float32)[both].mean(0)
        drift = float(np.abs(c - n).max())
    upper = ca & na & ~lower
    face_diff = None
    if upper.sum() >= 50:
        c = np.asarray(candidate.convert("RGB")).astype(np.float32)
        n = np.asarray(neutral.convert("RGB")).astype(np.float32)
        face_diff = float(np.abs(c - n)[upper].mean())
    return {"silhouetteIoU": round(iou, 3), "clothingColourDrift": None if drift is None else round(drift, 1),
            "faceMeanAbsDiff": None if face_diff is None else round(face_diff, 1)}


def _warnings(rep: dict, emotion: str) -> list[str]:
    w = []
    if rep["silhouetteIoU"] < 0.85:
        w.append(f"silhouette IoU {rep['silhouetteIoU']} < 0.85 (head or shoulders moved)")
    if rep["clothingColourDrift"] is not None and rep["clothingColourDrift"] > 30:
        w.append(f"clothing colour drift {rep['clothingColourDrift']} > 30")
    if emotion != "neutral" and rep["faceMeanAbsDiff"] is not None and rep["faceMeanAbsDiff"] < 1.5:
        w.append("face nearly identical to neutral (expression may not have changed)")
    return w


def portrait(asset: str, emotions: list[str] | None, n: int, seed: int | None, pick: str | None, model: str | None = None) -> str:
    wd = work_dir(f"portrait-{slug(asset)}")
    out = wd / "portrait"
    out.mkdir(parents=True, exist_ok=True)
    neutral = Image.open(neutral_path(asset)).convert("RGBA")
    if pick:
        return _keep(asset, out, neutral, pick)
    todo = emotions or [e for e in EMOTIONS if e != "neutral"]
    bad = [e for e in todo if e not in FACE]
    if bad:
        raise ForgeError(f"Unknown or non-generated emotion(s) {bad}; choose from {sorted(FACE)} (neutral is the source)")
    if not C.IMAGEGEN_PY.exists():
        raise ForgeError("Local image generation isn't set up: bash art/source/forge/imagegen/setup.sh")
    style = json.loads(C.STYLE.read_text())
    ref = out / "neutral-ref.png"
    on_flat(neutral).save(ref)
    base = seed if seed is not None else int(time.time()) % 100000
    items = []
    for e in todo:
        for k in range(n):
            items.append({"id": f"{e}-{base + k}", "prompt": PROMPT.format(face=FACE[e]), "negative": style.get("negative", ""),
                          "seed": base + k, "references": [str(ref)]})
    job = {"model": model or style["model"], "outDir": str(out / "raw"), "width": WORK_PX, "height": WORK_PX, "items": items}
    jf = out / f"job-{base}.json"
    jf.write_text(json.dumps(job, indent=1))
    log = wd / "logs" / "portrait.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with gpu_window(), open(log, "w") as f:
        rc = subprocess.run([str(C.IMAGEGEN_PY), str(C.IMAGEGEN / "run_image.py"), str(jf)], stdout=f, stderr=subprocess.STDOUT).returncode
    lines = [l for l in log.read_text(errors="replace").splitlines() if l.startswith("IMAGEGEN ")]
    if rc != 0 or not lines:
        raise ForgeError(f"imagegen failed (exit {rc}); log {log.relative_to(REPO)}")
    info = json.loads(lines[-1][9:])
    (out / f"portrait-{base}.json").write_text(json.dumps({"asset": asset, "imagegen": info}, indent=1))
    cells, warnings = [], []
    for it in info["items"]:
        emotion = it["id"].rsplit("-", 1)[0]
        keyed = align(cutout(Image.open(it["file"])).resize((neutral.width * 4, neutral.height * 4), Image.LANCZOS),
                      neutral.resize((neutral.width * 4, neutral.height * 4), Image.LANCZOS))
        p128 = downscale(keyed, 128)
        p128.save(out / f"{it['id']}_128.png")
        downscale(keyed, 96).save(out / f"{it['id']}_96.png")
        rep = identity_report(p128, neutral)
        w = _warnings(rep, emotion)
        warnings += [f"{it['id']}: {x}" for x in w]
        cells.append((it["id"], p128, rep, w))
    contact = _contact(out, neutral, cells)
    return (f"{len(cells)} candidates ({info['model']}, {len(warnings)} warnings); LOOK at {contact.relative_to(REPO)} (neutral top-left, "
            f"then every candidate; a red id has a drift warning). "
            + ("; ".join(warnings[:6]) + ". " if warnings else "")
            + f"Keep with: forge.py portrait --asset {asset} --pick " + ",".join(f"{e}=<id>" for e in todo))


def _contact(out: Path, neutral: Image.Image, cells: list) -> Path:
    cols = 6
    cw, ch = 128 * 2 + 8, 128 * 2 + 24
    rows = (len(cells) + 1 + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cw, rows * ch), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    items = [("neutral (source)", neutral, False)] + [(i + f" iou {r['silhouetteIoU']}", im, bool(w)) for i, im, r, w in cells]
    for k, (label, im, warn) in enumerate(items):
        x, y = (k % cols) * cw, (k // cols) * ch
        checker = Image.new("RGB", (256, 256), (90, 90, 90))
        big = im.resize((256, 256), Image.NEAREST)
        checker.paste(big, (0, 0), big)
        sheet.paste(checker, (x + 4, y + 20))
        d.text((x + 4, y + 4), label, fill=(255, 90, 90) if warn else (255, 255, 255))
    path = out / "contact.png"
    sheet.save(path)
    return path


def _keep(asset: str, out: Path, neutral: Image.Image, pick: str) -> str:
    dest_dir = EXPRESSIONS / slug(asset).replace("-", "_", 1)
    dest_dir.mkdir(parents=True, exist_ok=True)
    records = [json.loads(r.read_text()) for r in sorted(out.glob("portrait-*.json"))]
    kept = []
    for pair in pick.split(","):
        emotion, _, cid = pair.partition("=")
        if emotion not in FACE or not cid:
            raise ForgeError(f"--pick wants emotion=candidate pairs (e.g. warm=warm-1234); got '{pair}'")
        if emotion != cid.rsplit("-", 1)[0]:
            raise ForgeError(f"Candidate {cid} was generated for {cid.rsplit('-', 1)[0]}, not {emotion}")
        for size in SIZES:
            src = out / f"{cid}_{size}.png"
            if not src.exists():
                raise ForgeError(f"No candidate {cid} at {size} px in {out.relative_to(REPO)}")
            img = Image.open(src)
            if img.size != (size, size) or img.mode != "RGBA":
                raise ForgeError(f"{src.name} must be a transparent {size}x{size} RGBA PNG")
            img.save(dest_dir / f"{emotion}_{size}.png")
        item = next((i for r in records for i in r["imagegen"]["items"] if i["id"] == cid), {"seed": "?"})
        model = next((r["imagegen"]["model"] for r in records if any(i["id"] == cid for i in r["imagegen"]["items"])), "?")
        _ledger(asset, emotion, model, item["seed"], dest_dir / f"{emotion}_128.png")
        kept.append(emotion)
    have = sorted(p.name.split("_")[0] for p in dest_dir.glob("*_128.png"))
    missing = [e for e in EMOTIONS if e != "neutral" and e not in have]
    return (f"kept {', '.join(kept)} in {dest_dir.relative_to(REPO)}; set has {len(have)} generated expressions "
            f"(+ the neutral); " + (f"still missing: {', '.join(missing)}" if missing else "all eight generated: ready for a review packet"))


def _ledger(asset: str, emotion: str, model: str, seed, dest: Path) -> None:
    led = C.LEDGER
    led.parent.mkdir(parents=True, exist_ok=True)
    if not led.exists():
        led.write_text("# Image ledger (blender, local generation)\n")
    head = "\n## portraits\n\n| date (UTC) | model | seed | asset/emotion | kept file |\n| --- | --- | --- | --- | --- |\n"
    text = led.read_text()
    row = f"| {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} | {model} | {seed} | {asset}/{emotion} | {dest.relative_to(REPO)} |\n"
    if "\n## portraits\n" not in text:
        text = text.rstrip("\n") + "\n" + head + row
    else:
        i = text.index("\n## portraits\n")
        j = text.find("\n## ", i + 4)
        j = len(text) if j < 0 else j
        text = text[:j].rstrip("\n") + "\n" + row + text[j:]
    led.write_text(text)
