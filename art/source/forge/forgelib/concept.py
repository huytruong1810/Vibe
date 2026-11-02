"""Local reference-art generation for the forge (PRD-3, PRD-7, PRD-8; 2026-11-02).

`concept`: the recipe's `concept` block + a spec template + the project style become one
prompt; imagegen renders N candidate sheets (all views side by side in one image, so the
views share one identity) and a contact sheet to look at (PRD-5).
`views`: the picked candidate is split into its views on the flat background and written
to art/source/references/<asset>/ with sheet.json provenance (model, revision, seed,
prompt, references), then prep takes over as before.

Recipe:
  "concept": {"template": "creature-v1", "fields": {"species": "...", ...},
              "poseGuide": "art/source/style/pose-guides/quadruped.png",
              "references": ["art/source/masters/..."], "model": "klein9b"}
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from .core import FORGE, REPO, SPEC_DIR, ForgeError, load_recipe, reference_dir, slug, work_dir

IMAGEGEN = FORGE / "imagegen"
IMAGEGEN_PY = IMAGEGEN / ".venv" / "bin" / "python"
STYLE = REPO / "art/source/style/style.json"
LEDGER = REPO / "docs/team/comms/blender/image-ledger.md"


POSE_CLAUSE = ("THE FIRST REFERENCE IMAGE IS A GREY CLAY POSE GUIDE: MATCH ITS POSE, VIEW ANGLES, VIEW ORDER AND "
               "LAYOUT EXACTLY, BUT TAKE NO COLOURS, SURFACE DETAIL OR SPECIES DESIGN FROM IT.")


class _Fields(dict):
    def __missing__(self, key):  # a template field the recipe forgot: fail loudly
        raise ForgeError(f"concept.fields lacks '{key}' (template placeholder)")


def plan(asset: str, model: str | None = None) -> dict:
    r = load_recipe(asset)
    c = r.get("concept")
    if not isinstance(c, dict) or "template" not in c:
        raise ForgeError(f"Recipe {slug(asset)}.json needs a `concept` block: template, fields, references (recipes/README.md).")
    templates = json.loads((SPEC_DIR / "concept_templates.json").read_text())["templates"]
    t = templates.get(c["template"]) or (_ for _ in ()).throw(ForgeError(f"Unknown concept template {c['template']}"))
    style = json.loads(STYLE.read_text())
    prompt = t["text"].format_map(_Fields(c.get("fields", {}))) + " " + style["styleBlock"]
    refs = []
    if c.get("poseGuide"):  # a grey clay render of the target pose (art/source/style/pose-guides/)
        refs.append(str(REPO / c["poseGuide"]))
        prompt = (POSE_CLAUSE + " " + prompt)
    refs += [str(REPO / p) for p in c.get("references", [])]
    refs += [str(REPO / p) for p in style.get("anchors", [])[: style.get("anchorsPerCall", 2)]]
    for p in refs:
        if not Path(p).exists():
            raise ForgeError(f"Concept reference missing: {Path(p).relative_to(REPO)}")
    return {"asset": asset, "template": c["template"], "views": t["views"], "size": t["size"], "prompt": prompt,
            "negative": style.get("negative", ""), "references": refs, "model": model or c.get("model") or style["model"],
            "styleSha256": hashlib.sha256(STYLE.read_bytes()).hexdigest()}


def concept(asset: str, n: int = 4, seed: int | None = None, model: str | None = None) -> str:
    if not IMAGEGEN_PY.exists():
        raise ForgeError("Local image generation isn't set up: bash art/source/forge/imagegen/setup.sh")
    p = plan(asset, model)
    wd = work_dir(asset)
    out = wd / "concept"
    out.mkdir(parents=True, exist_ok=True)
    base = seed if seed is not None else int(time.time()) % 100000
    job = {"model": p["model"], "outDir": str(out), "width": p["size"][0], "height": p["size"][1],
           "items": [{"id": f"c{base + k}", "prompt": p["prompt"], "negative": p["negative"], "seed": base + k,
                      "references": p["references"]} for k in range(n)]}
    jf = out / f"job-{base}.json"
    jf.write_text(json.dumps(job, indent=1))
    log = wd / "logs" / "concept.log"
    log.parent.mkdir(parents=True, exist_ok=True)
    with open(log, "w") as f:
        rc = subprocess.run([str(IMAGEGEN_PY), str(IMAGEGEN / "run_image.py"), str(jf)], stdout=f, stderr=subprocess.STDOUT).returncode
    lines = [l for l in log.read_text(errors="replace").splitlines() if l.startswith("IMAGEGEN ")]
    if rc != 0 or not lines:
        tail = "\n".join(log.read_text(errors="replace").splitlines()[-20:])
        raise ForgeError(f"imagegen failed (exit {rc}); log {log.relative_to(REPO)}\n{tail}")
    info = json.loads(lines[-1][9:])
    record = {**p, "imagegen": info}
    (out / f"concept-{base}.json").write_text(json.dumps(record, indent=1))
    contact = out / "contact.png"
    _contact([Path(i["file"]) for i in info["items"]], [i["id"] for i in info["items"]], contact)
    secs = [i["seconds"] for i in info["items"]]
    return (f"{len(secs)} candidates with {info['model']} (load {info['loadSeconds']} s, {min(secs)}-{max(secs)} s each, "
            f"peak {info['peakVramGiB']} GiB); LOOK at {contact.relative_to(REPO)}, then "
            f"forge.py views --asset {asset} --pick <id> (e.g. {info['items'][0]['id']})")


def _contact(files: list[Path], labels: list[str], out: Path, thumb: int = 640) -> None:
    ims = []
    for f in files:
        im = Image.open(f).convert("RGB")
        im.thumbnail((thumb, thumb))
        ims.append(im)
    w = sum(i.width for i in ims) + 8 * (len(ims) + 1)
    h = max(i.height for i in ims) + 34
    sheet = Image.new("RGB", (w, h), (30, 32, 40))
    d = ImageDraw.Draw(sheet)
    x = 8
    for im, label in zip(ims, labels):
        sheet.paste(im, (x, 28))
        d.text((x + 4, 8), label, fill=(230, 230, 230))
        x += im.width + 8
    sheet.save(out)


def split_views(image: Image.Image, count: int, gap_fraction: float = 0.01) -> list[tuple[int, int, int, int]]:
    """Subject boxes left to right on a flat background: columns whose pixels differ from the
    border colour, split at background gaps, small fragments merged into their neighbour."""
    a = np.asarray(image.convert("RGB")).astype(np.int16)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    mask = np.abs(a - bg).max(axis=2) > 24
    cols = mask.sum(axis=0) > max(2, 0.004 * h)
    segs, start = [], None
    min_gap = max(4, int(gap_fraction * w))
    run = 0
    for x in range(w):
        if cols[x]:
            if start is None:
                start = x
            run = 0
        elif start is not None:
            run += 1
            if run >= min_gap:
                segs.append([start, x - run])
                start, run = None, 0
    if start is not None:
        segs.append([start, w - 1 - run])
    segs = [s for s in segs if s[1] - s[0] >= 0.03 * w]  # drop specks
    while len(segs) > count:  # merge the narrowest gap
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        i = int(np.argmin(gaps))
        segs[i:i + 2] = [[segs[i][0], segs[i + 1][1]]]
    if len(segs) != count:
        raise ForgeError(f"Found {len(segs)} separate subjects, the template needs {count}: pick another candidate or regenerate")
    boxes = []
    for x0, x1 in segs:
        rows = np.nonzero(mask[:, x0:x1 + 1].any(axis=1))[0]
        boxes.append((x0, int(rows.min()), x1, int(rows.max())))
    return boxes


def views(asset: str, pick: str) -> str:
    out = work_dir(asset) / "concept"
    records = sorted(out.glob("concept-*.json"))
    rec = next((json.loads(r.read_text()) for r in reversed(records)
                if any(i["id"] == pick for i in json.loads(r.read_text())["imagegen"]["items"])), None)
    if not rec:
        raise ForgeError(f"No concept candidate {pick} in {out.relative_to(REPO)} (run concept first)")
    item = next(i for i in rec["imagegen"]["items"] if i["id"] == pick)
    image = Image.open(item["file"]).convert("RGB")
    boxes = split_views(image, len(rec["views"]))
    ref = reference_dir(asset)
    ref.mkdir(parents=True, exist_ok=True)
    bg = tuple(int(v) for v in np.median(np.concatenate([np.asarray(image)[0], np.asarray(image)[-1]]), axis=0))
    names, heights = {}, []
    for view, (x0, y0, x1, y1) in zip(rec["views"], boxes):
        crop = image.crop((x0, y0, x1 + 1, y1 + 1))
        pad = max(16, int(0.08 * max(crop.size)))  # the subject must not touch the edge (prep)
        canvas = Image.new("RGB", (crop.width + 2 * pad, crop.height + 2 * pad), bg)
        canvas.paste(crop, (pad, pad))
        canvas.save(ref / f"{view}.png")
        names[view] = f"{view}.png"
        heights.append(crop.height)
    image.save(ref / "sheet.png")
    sheet_path = ref / "sheet.json"
    sheet = json.loads(sheet_path.read_text()) if sheet_path.exists() else {"asset": asset}
    sheet.update({"views": names, "generations": int(sheet.get("generations", 0)) + 1,
                  "ledger": f"{LEDGER.relative_to(REPO)}#{slug(asset)}",
                  "generator": {"model": rec["imagegen"]["model"], "repo": rec["imagegen"]["repo"],
                                "revision": rec["imagegen"]["revision"], "licence": rec["imagegen"]["licence"],
                                "seed": item["seed"], "template": rec["template"], "prompt": rec["prompt"],
                                "references": [str(Path(p).relative_to(REPO)) for p in rec["references"]],
                                "styleSha256": rec["styleSha256"], "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}})
    if "identitySources" not in sheet:
        sheet["identitySources"] = [str(Path(p).relative_to(REPO)) for p in rec["references"]]
    sheet_path.write_text(json.dumps(sheet, indent=2) + "\n")
    _ledger(asset, rec, item)
    low = [v for v, hgt in zip(rec["views"], heights) if hgt < 1024]
    warn = f"; note: {', '.join(low)} below 1024 px tall (PRD-3.1), consider a larger template size" if low else ""
    return (f"wrote {len(names)} views ({', '.join(f'{v} {h}px' for v, h in zip(rec['views'], heights))}) and sheet.json to "
            f"{ref.relative_to(REPO)}{warn}; LOOK at each view, set `ramps` in sheet.json if new, then forge.py next --asset {asset}")


def _ledger(asset: str, rec: dict, item: dict) -> None:
    LEDGER.parent.mkdir(parents=True, exist_ok=True)
    if not LEDGER.exists():
        LEDGER.write_text("# Image ledger (blender, local generation)\n\nOne row per kept reference sheet. "
                          "Candidates and full prompts are in each asset's `work/<asset>/concept/concept-*.json`.\n")
    text = LEDGER.read_text()
    head = f"\n## {slug(asset)}\n\n| date (UTC) | model | seed | template | kept file |\n| --- | --- | --- | --- | --- |\n"
    row = (f"| {time.strftime('%Y-%m-%d %H:%M', time.gmtime())} | {rec['imagegen']['model']} | {item['seed']} | "
           f"{rec['template']} | art/source/references/{slug(asset)}/sheet.png |\n")
    if f"\n## {slug(asset)}\n" not in text:
        text += head
        text += row
    else:
        i = text.index(f"\n## {slug(asset)}\n")
        j = text.find("\n## ", i + 4)
        j = len(text) if j < 0 else j
        text = text[:j].rstrip("\n") + "\n" + row + text[j:]
    LEDGER.write_text(text)
