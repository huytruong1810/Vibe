"""32 x 32 inventory icons for items without a held model (C32, render_spec canvas icon.item, ART-5, PRD-7).

  forge.py icon --item <id> --prompt "<what it is>" --ramps <ramp,ramp> [--n 4] [--seed S]   generate candidates
  forge.py icon --item <id> --pick <candidate-id>                                            keep one

Route (chosen by trial on berries and flint, docs/engineering/imagegen.md): the registered image model draws the
object on a flat grey ground, upper-left light, three-quarter view; the render is keyed to alpha, cropped, reduced to
the 26 px body box, quantised to the item's palette ramps (never `deep`, which is for outlines), cleaned of orphan
pixels, and given a 1 px selective outline (`deep` of the bordering ramp; `shadow` on the top-lit upper-left edge,
ART-5.1/5.2). The result is 28 px at most inside 32, so the margin is at least 2 (render_spec marginsArtPixels).
--pick writes art/source/ui/icons/items/<id>.png and logs the seed in the image ledger. Manifest registration stays
with the communicator (art:integrate).
"""
from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from . import concept as C
from .color import ramp as palette_ramp, rgb8_to_oklab
from .core import REPO, ForgeError, gpu_window, slug, work_dir
from .pixelize import _clean_orphans
from .portrait import cutout

ICONS = REPO / "art/source/ui/icons/items"
SIZE = 32
BODY_PX = 26          # body box; the outline adds one pixel each side, leaving a margin of 2
WORK_PX = 1024
STEPS = ["shadow", "mid", "light", "highlight"]   # `deep` is reserved for outlines (ART-5)
PROMPT = ("A single {what}, centred, drawn as a small game inventory icon: three-quarter view from slightly above, "
          "lit from the upper left, bold simple shapes, 3 to 4 flat tones per material, no texture noise, no cast "
          "shadow, no ground, no hands, no text, on a plain flat mid-grey background (#808080) with generous empty "
          "space around the object. Colour palette: {palette}.")


def _palette_text(ramps: list[str]) -> str:
    out = []
    for r in ramps:
        steps = palette_ramp(r)
        out.append(f"{r} " + ", ".join(f"#{c[0]:02x}{c[1]:02x}{c[2]:02x}" for c in (steps[s] for s in STEPS)))
    return "; ".join(out)


def _check_ramps(ramps: list[str]) -> list[str]:
    if not ramps:
        raise ForgeError("icon needs --ramps <ramp,ramp> (names from spec/palette.json, e.g. ember,sage)")
    for r in ramps:
        palette_ramp(r)  # raises with the valid list
    return ramps


def reduce(keyed: Image.Image, ramps: list[str]) -> Image.Image:
    """Keyed RGBA render of any size -> 32 x 32 palette-locked icon with a selective outline."""
    a = np.asarray(keyed.convert("RGBA"))
    ys, xs = np.nonzero(a[..., 3] > 40)
    if not len(ys):
        raise ForgeError("empty icon: nothing opaque after keying")
    crop = Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    k = BODY_PX / max(crop.size)
    w, h = max(1, round(crop.width * k)), max(1, round(crop.height * k))
    small = np.asarray(crop.resize((w, h), Image.BOX).convert("RGBA")).copy()
    mask = small[..., 3] >= 128
    # nearest palette colour (OKLab) among the allowed ramps' non-deep steps
    entries = [(r, s, palette_ramp(r)[s]) for r in ramps for s in STEPS]
    pal = rgb8_to_oklab(np.array([e[2] for e in entries], dtype=np.uint8))
    lab = rgb8_to_oklab(small[..., :3])
    idx = np.argmin(((lab[:, :, None, :] - pal[None, None]) ** 2).sum(-1), axis=2)
    canvas = np.zeros((SIZE, SIZE, 4), dtype=np.uint8)
    owner = np.full((SIZE, SIZE), -1, dtype=np.int64)       # ramp index per body pixel, for the outline
    ox, oy = (SIZE - w) // 2, (SIZE - h) // 2
    for y, x in zip(*np.nonzero(mask)):
        r, _, rgb = entries[idx[y, x]]
        canvas[oy + y, ox + x] = (*rgb, 255)
        owner[oy + y, ox + x] = ramps.index(r)
    canvas = _clean_orphans(canvas)
    body = canvas[..., 3] > 0
    out = canvas.copy()
    for y, x in zip(*np.nonzero(~body)):
        best = None
        for dy, dx, lit in ((1, 0, True), (0, 1, True), (-1, 0, False), (0, -1, False)):   # neighbour below/right = top-lit edge
            yy, xx = y + dy, x + dx
            if 0 <= yy < SIZE and 0 <= xx < SIZE and body[yy, xx]:
                best = (owner[yy, xx], lit) if best is None or lit else best
        if best:
            step = "shadow" if best[1] else "deep"
            out[y, x] = (*palette_ramp(ramps[best[0]])[step], 255)
    return Image.fromarray(out)


def check(icon: Image.Image, ramps: list[str]) -> list[str]:
    """Icon QA that needs no model: size, margin, palette lock, outline pixels present. Returns the problems."""
    problems = []
    a = np.asarray(icon.convert("RGBA"))
    if icon.size != (SIZE, SIZE):
        return [f"size {icon.size} is not {SIZE}x{SIZE}"]
    op = a[..., 3] > 0
    if not op.any():
        return ["empty"]
    ys, xs = np.nonzero(op)
    margin = min(ys.min(), xs.min(), SIZE - 1 - ys.max(), SIZE - 1 - xs.max())
    if margin < 2:
        problems.append(f"margin {margin} < 2")
    allowed = {palette_ramp(r)[s] for r in ramps for s in [*STEPS, "deep"]}
    bad = {tuple(int(v) for v in p[:3]) for p in a[op]} - allowed
    if bad:
        problems.append(f"{len(bad)} colour(s) outside ramps {ramps}")
    if (a[op][:, 3] != 255).any():
        problems.append("partial alpha")
    return problems


def icon(item: str, prompt: str | None, ramps_arg: str | None, n: int, seed: int | None, pick: str | None, model: str | None = None) -> str:
    item = slug(item)
    wd = work_dir(f"icon-{item}")
    out = wd / "icon"
    out.mkdir(parents=True, exist_ok=True)
    if pick:
        return _keep(item, out, pick)
    ramps = _check_ramps([r for r in (ramps_arg or "").split(",") if r])
    if not prompt:
        raise ForgeError("icon needs --prompt (what the object is, e.g. 'cluster of three red berries on a short green stem')")
    if not C.IMAGEGEN_PY.exists():
        raise ForgeError("Local image generation isn't set up: bash art/source/forge/imagegen/setup.sh")
    style = json.loads(C.STYLE.read_text())
    text = PROMPT.format(what=prompt, palette=_palette_text(ramps)) + " " + style["styleBlock"]
    base = seed if seed is not None else int(time.time()) % 100000
    job = {"model": model or style["model"], "outDir": str(out / "raw"), "width": WORK_PX, "height": WORK_PX,
           "items": [{"id": f"i{base + k}", "prompt": text, "negative": style.get("negative", ""), "seed": base + k,
                      "references": []} for k in range(n)]}
    jf = out / f"job-{base}.json"
    jf.write_text(json.dumps(job, indent=1))
    log = wd / "logs" / "icon.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with gpu_window(), open(log, "w") as f:
        rc = subprocess.run([str(C.IMAGEGEN_PY), str(C.IMAGEGEN / "run_image.py"), str(jf)], stdout=f, stderr=subprocess.STDOUT).returncode
    lines = [l for l in log.read_text(errors="replace").splitlines() if l.startswith("IMAGEGEN ")]
    if rc != 0 or not lines:
        raise ForgeError(f"imagegen failed (exit {rc}); log {log.relative_to(REPO)}")
    info = json.loads(lines[-1][9:])
    (out / f"icon-{base}.json").write_text(json.dumps({"item": item, "ramps": ramps, "prompt": text, "imagegen": info}, indent=1))
    cells = []
    for it in info["items"]:
        ic = reduce(cutout(Image.open(it["file"])), ramps)
        ic.save(out / f"{it['id']}.png")
        cells.append((it["id"], Image.open(it["file"]).convert("RGB"), ic, check(ic, ramps)))
    contact = _contact(out, cells)
    probs = [f"{i}: {'; '.join(p)}" for i, _, _, p in cells if p]
    return (f"{len(cells)} candidates ({info['model']}, {len(probs)} with problems); LOOK at {contact.relative_to(REPO)} "
            f"(raw render, then the 32 px icon at 1x and 8x on dark and light grounds). " + ("; ".join(probs) + ". " if probs else "")
            + f"Keep with: forge.py icon --item {item} --pick <id>")


def _contact(out: Path, cells: list) -> Path:
    cw, ch = 256 + 4 * 80, 18 + 2 * (SIZE * 5 + 6) + 4
    sheet = Image.new("RGB", (2 * cw, ((len(cells) + 1) // 2) * ch), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    for k, (cid, raw, ic, probs) in enumerate(cells):
        x, y = (k % 2) * cw, (k // 2) * ch
        d.text((x + 4, y + 4), cid + ("  " + "; ".join(probs) if probs else ""), fill=(255, 120, 120) if probs else (255, 255, 255))
        sheet.paste(raw.resize((256, 256)), (x, y + 18))
        for j, bg in enumerate(((40, 44, 52), (214, 208, 190))):
            tile = Image.new("RGBA", (SIZE, SIZE), (*bg, 255))
            tile.alpha_composite(ic)
            sheet.paste(tile.convert("RGB").resize((SIZE * 5, SIZE * 5), Image.NEAREST), (x + 264, y + 18 + j * (SIZE * 5 + 6)))
        sheet.paste(Image.alpha_composite(Image.new("RGBA", (SIZE, SIZE), (40, 44, 52, 255)), ic).convert("RGB"),
                    (x + 264 + SIZE * 5 + 8, y + 18))
    p = out / "contact.png"
    sheet.save(p)
    return p


def _keep(item: str, out: Path, pick: str) -> str:
    src = out / f"{pick}.png"
    if not src.exists():
        raise ForgeError(f"No candidate {pick} in {src.parent}")
    meta = next(iter(sorted(out.glob("icon-*.json"), reverse=True)), None)
    rec = json.loads(meta.read_text()) if meta else {}
    problems = check(Image.open(src), rec.get("ramps", []))
    if problems:
        raise ForgeError(f"{pick} fails icon checks: {'; '.join(problems)}")
    ICONS.mkdir(parents=True, exist_ok=True)
    dest = ICONS / f"{item}.png"
    Image.open(src).save(dest)
    info = next((i for i in rec.get("imagegen", {}).get("items", []) if i["id"] == pick), {"seed": "?"})
    _ledger(item, rec.get("imagegen", {}).get("model", "?"), info["seed"], dest)
    return f"kept {pick} as {dest.relative_to(REPO)}; logged in the image ledger"


def _ledger(item: str, model: str, seed, dest: Path) -> None:
    led = C.LEDGER
    led.parent.mkdir(parents=True, exist_ok=True)
    if not led.exists():
        led.write_text("# Image ledger (blender, local generation)\n")
    head = "\n## icons\n\n| date (UTC) | model | seed | item | kept file |\n| --- | --- | --- | --- | --- |\n"
    text = led.read_text()
    row = f"| {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} | {model} | {seed} | {item} | {dest.relative_to(REPO)} |\n"
    if "\n## icons\n" not in text:
        text = text.rstrip("\n") + "\n" + head + row
    else:
        i = text.index("\n## icons\n")
        j = text.find("\n## ", i + 4)
        j = len(text) if j < 0 else j
        text = text[:j].rstrip("\n") + "\n" + row + text[j:]
    led.write_text(text)
