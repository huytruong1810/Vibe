"""Seamless terrain swatches for tileforge (C30a, ART-11.2, PRD-7).

  forge.py swatch --set <set> --material <id> --prompt "<feature clause>" [--n 4] [--seed S] [--pick <id>]

Without --pick: generates --n 1024x1024 candidates with the registered image model, makes each
seamless (half-offset cross-fade) and writes a contact sheet with a 2x2 tiling of each.
With --pick: copies that candidate to art/source/tiles/sets/<set>/swatches/<material>.png and logs it.
"""
from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .core import REPO, ForgeError, gpu_window, work_dir
from . import concept as C

SETS = REPO / "art/source/tiles/sets"
SIZE = 1024
PATTERN = ("Seamless top-down pixel-art ground texture, {material}, orthographic, flat even lighting with no shadows "
           "from objects, no vignette, no objects, no borders, no grid lines, no text; uniform small scale; {feature}; "
           "palette {palette}; 1024x1024.")


def make_seamless(img: Image.Image, ramp: float = 0.5) -> Image.Image:
    """Cross-fade the image with its half-rolled copy. Weight is 1 at the centre, 0 at the borders, so the
    borders come from the roll (whose edges are the original's continuous centre)."""
    a = np.asarray(img.convert("RGB"), dtype=np.float32)
    h, w = a.shape[:2]
    r = np.roll(a, (h // 2, w // 2), axis=(0, 1))

    def ramp1d(n: int) -> np.ndarray:
        x = (np.arange(n) + 0.5) / n
        d = np.minimum(x, 1 - x) / (0.5 * ramp)  # 0 at the border, 1 once ramp/2 of the length in
        t = np.clip(d, 0, 1)
        return 0.5 - 0.5 * np.cos(np.pi * t)

    wgt = np.outer(ramp1d(h), ramp1d(w))[..., None]
    wgt = np.sqrt(wgt)  # equal-power-ish: keeps contrast in the blended band
    out = a * wgt + r * (1 - wgt)
    return Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))


def seam_score(img: Image.Image) -> float:
    """Wrap-edge roughness over interior roughness (1.0 = the seam is as smooth as any line inside)."""
    a = np.asarray(img.convert("L"), dtype=np.float32)
    inner = (np.abs(np.diff(a, axis=0)).mean() + np.abs(np.diff(a, axis=1)).mean()) / 2
    wrap = (np.abs(a[0] - a[-1]).mean() + np.abs(a[:, 0] - a[:, -1]).mean()) / 2
    return float(wrap / max(inner, 1e-6))


def _tile2x2(img: Image.Image) -> Image.Image:
    out = Image.new("RGB", (img.width * 2, img.height * 2))
    for x in (0, img.width):
        for y in (0, img.height):
            out.paste(img, (x, y))
    return out


def _ramp_text(values: list[str]) -> str:
    ramps = json.loads((REPO / "art/source/forge/spec/palette.json").read_text())["ramps"]
    out = []
    for v in values:
        ramp, _, step = v.partition(".")
        hexv = ramps.get(ramp, {}).get("steps", {}).get(step)
        out.append(f"{hexv} ({v})" if hexv else v)
    return ", ".join(out)


def swatch(set_name: str, material: str, prompt: str | None, n: int, seed: int | None, pick: str | None, model: str | None = None) -> str:
    sdir = SETS / set_name
    if not (sdir / "set.json").exists():
        raise ForgeError(f"No set {set_name}; run tileforge.py new {set_name} first")
    recipe = json.loads((sdir / "set.json").read_text())
    mat = next((m for m in recipe["materials"] if m["id"] == material), None)
    if not mat:
        raise ForgeError(f"Set {set_name} has no material {material}")
    wd = work_dir(f"swatch-{set_name}-{material}")
    out = wd / "swatch"
    out.mkdir(parents=True, exist_ok=True)
    if pick:
        src = out / f"{pick}.png"
        if not src.exists():
            raise ForgeError(f"No candidate {pick} in {src.parent}")
        dest = sdir / mat["swatch"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        Image.open(src).save(dest)
        rec = json.loads(next(out.glob(f"swatch-*.json")).read_text()) if list(out.glob("swatch-*.json")) else {}
        item = next((i for i in rec.get("imagegen", {}).get("items", []) if i["id"] == pick), {"seed": "?"})
        _ledger(set_name, material, rec.get("imagegen", {}).get("model", "?"), item["seed"], dest)
        return f"kept {pick} as {dest.relative_to(REPO)} (seam {seam_score(Image.open(dest)):.2f}); logged in the image ledger"
    if not C.IMAGEGEN_PY.exists():
        raise ForgeError("Local image generation isn't set up: bash art/source/forge/imagegen/setup.sh")
    if not prompt:
        raise ForgeError("swatch needs --prompt (the feature clause, e.g. 'short upright grass blades with small clumps')")
    style = json.loads(C.STYLE.read_text())
    text = PATTERN.format(material=material, feature=prompt, palette=_ramp_text(mat["values"])) + " " + style["styleBlock"]
    base = seed if seed is not None else int(time.time()) % 100000
    job = {"model": model or style["model"], "outDir": str(out / "raw"), "width": SIZE, "height": SIZE,
           "items": [{"id": f"s{base + k}", "prompt": text, "negative": style.get("negative", ""), "seed": base + k,
                      "references": []} for k in range(n)]}
    jf = out / f"job-{base}.json"
    jf.write_text(json.dumps(job, indent=1))
    log = wd / "logs" / "swatch.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with gpu_window(), open(log, "w") as f:
        rc = subprocess.run([str(C.IMAGEGEN_PY), str(C.IMAGEGEN / "run_image.py"), str(jf)], stdout=f, stderr=subprocess.STDOUT).returncode
    lines = [l for l in log.read_text(errors="replace").splitlines() if l.startswith("IMAGEGEN ")]
    if rc != 0 or not lines:
        raise ForgeError(f"imagegen failed (exit {rc}); log {log.relative_to(REPO)}")
    info = json.loads(lines[-1][9:])
    (out / f"swatch-{base}.json").write_text(json.dumps({"prompt": text, "imagegen": info}, indent=1))
    thumbs, labels = [], []
    for i in info["items"]:
        seamless = make_seamless(Image.open(i["file"]))
        seamless.save(out / f"{i['id']}.png")
        thumbs.append(_tile2x2(seamless).resize((512, 512), Image.LANCZOS))
        labels.append(f"{i['id']} seam {seam_score(seamless):.2f} (raw {seam_score(Image.open(i['file'])):.2f})")
    cols = min(len(thumbs), 2)
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 512, rows * 532), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    for k, (t, l) in enumerate(zip(thumbs, labels)):
        x, y = (k % cols) * 512, (k // cols) * 532
        sheet.paste(t, (x, y + 20))
        d.text((x + 4, y + 4), l, fill=(255, 255, 255))
    contact = out / "contact.png"
    sheet.save(contact)
    return (f"{len(thumbs)} seamless candidates ({info['model']}); LOOK at {contact.relative_to(REPO)} (each is a 2x2 tiling), "
            f"then forge.py swatch --set {set_name} --material {material} --pick <id>")


def _ledger(set_name: str, material: str, model: str, seed, dest: Path) -> None:
    led = C.LEDGER
    led.parent.mkdir(parents=True, exist_ok=True)
    if not led.exists():
        led.write_text("# Image ledger (blender, local generation)\n")
    head = "\n## swatches\n\n| date (UTC) | model | seed | set/material | kept file |\n| --- | --- | --- | --- | --- |\n"
    text = led.read_text()
    row = f"| {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} | {model} | {seed} | {set_name}/{material} | {dest.relative_to(REPO)} |\n"
    if "\n## swatches\n" not in text:
        text = text.rstrip("\n") + "\n" + head + row
    else:
        i = text.index("\n## swatches\n")
        j = text.find("\n## ", i + 4)
        j = len(text) if j < 0 else j
        text = text[:j].rstrip("\n") + "\n" + row + text[j:]
    led.write_text(text)
