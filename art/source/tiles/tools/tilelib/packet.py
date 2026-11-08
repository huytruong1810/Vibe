"""Review packet (director gallery) and digest-bound publish (PRD-9)."""

from __future__ import annotations

import hashlib
import json
import shutil

from PIL import Image

from .core import (APPROVALS, EXPORTS, MANIFEST, REPO, REVIEW, STAGING, WORK, TileError, read, rel, sha,
                   spec, write)


def asset_name(name: str) -> str:
    return f"tiles-{name}"


def _x2(src, dst):
    with Image.open(src) as im:
        k = spec()["exportScale"]
        im.resize((im.width * k, im.height * k), Image.Resampling.NEAREST).save(dst, optimize=True)


def packet(name: str, work=None, review_root=None) -> dict:
    work = work or WORK / name
    review_root = review_root or REVIEW
    report = read(work / "qa_report.json") if (work / "qa_report.json").exists() else None
    if not report:
        raise TileError(f"no QA report; run: tileforge.py all --set {name}")
    build = read(work / "build.json")
    if report["buildDigest"] != sha((work / "build.json").read_bytes()):
        raise TileError("qa_report.json is older than build.json; run qa again")
    if report["status"] != "candidate":
        failed = [c["check"] for c in report["checks"] if c["hard"] and not c["pass"]]
        raise TileError(f"QA status is {report['status']} ({', '.join(failed)}); fix the recipe or swatch first")
    for p in ("contact.png", "field.png"):
        if not (work / p).exists():
            raise TileError(f"missing {p}; run: tileforge.py preview --set {name}")
    rev = 1
    while (review_root / f"{asset_name(name)}-{rev}").exists():
        rev += 1
    out = review_root / f"{asset_name(name)}-{rev}"
    (out / "tiles").mkdir(parents=True)
    digest = hashlib.sha256()
    for record in (build["recipeDigest"], build["swatchDigests"], report["checks"]):
        digest.update(json.dumps(record, sort_keys=True, separators=(",", ":")).encode())
    tiles = []
    for t in sorted(build["tiles"], key=lambda t: t["file"]):
        dst = out / t["file"]
        _x2(work / t["file"], dst)
        data = dst.read_bytes()
        digest.update(t["file"].encode())
        digest.update(data)
        tiles.append({k: v for k, v in t.items() if k != "sha256"} | {"sha256": sha(data), "scale": spec()["exportScale"]})
    for p in ("contact.png", "field.png", "level.png"):
        if (work / p).exists():
            shutil.copyfile(work / p, out / p)
    atlas(build, work, out)
    shutil.copyfile(work / "qa_report.json", out / "qa_report.json")
    review = {"schemaVersion": 1, "kind": "tileset", "status": "candidate", "asset": asset_name(name),
              "set": name, "region": build["region"], "sourceDigest": digest.hexdigest(),
              "tilePx": build["tilePx"], "exportScale": spec()["exportScale"], "tiles": tiles,
              "qa": report["checks"]}
    write(out / "review.json", review)
    soft = [c for c in report["checks"] if not c["pass"]]
    lines = [f"# Tile set {name}, revision {rev}", "",
             f"- status: candidate (QA); approval binds to `sourceDigest` {review['sourceDigest']} (PRD-9)",
             f"- recipe: `art/source/tiles/sets/{name}/set.json` (sha {build['recipeDigest'][:12]})",
             f"- tiles: {len(tiles)} at {spec()['exportScale']}x in `tiles/`; `atlas.png` + `atlas.json` for LDtk",
             "- look at: `contact.png` (singles at 4x, 3x3 repeat, variant field, masks over ground), "
             "`field.png` (in context at display scale)" + (", `level.png` (authored map crop)" if (out / "level.png").exists() else ""),
             "", "## Soft findings", ""]
    lines += [f"- {c['check']} ({c['rule']}): {c['detail']}" for c in soft] or ["- none"]
    lines += ["", "## Runtime ids", ""]
    lines += [f"- `{t['runtimeId']}` <- `{t['file']}`" for t in tiles if t.get("runtimeId")] or ["- none"]
    (out / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    return {"dir": out, "review": review}


def atlas(build, work, out):
    """Grid atlas at 1x (32-px cells, 16 per row) for the LDtk editor; atlas.json maps names to cells.
    Strips (cliff faces) sit at the top of their cell."""
    n, cols = build["tilePx"], 16
    tiles = sorted(build["tiles"], key=lambda t: t["file"])
    sheet = Image.new("RGBA", (cols * n, -(-len(tiles) // cols) * n))
    index = {}
    for i, t in enumerate(tiles):
        x, y = i % cols * n, i // cols * n
        with Image.open(work / t["file"]) as im:
            sheet.paste(im.convert("RGBA"), (x, y))
        index[t["file"].split("/")[-1][:-4]] = {"x": x, "y": y, "runtimeId": t.get("runtimeId"),
                                                 "mask": t.get("mask")}
    sheet.save(out / "atlas.png", optimize=True)
    write(out / "atlas.json", {"tilePx": n, "image": "atlas.png", "tiles": index})


def approval_for(name: str):
    """(record, packet dir) of a director-approved record whose packetDigest matches (PRD-9)."""
    asset = asset_name(name)
    for rec in sorted(APPROVALS.glob(f"{asset}--*.md")):
        text = rec.read_text(encoding="utf-8")
        if not text.startswith("---"):
            continue
        meta = {k.strip(): v.strip() for k, _, v in
                (l.partition(":") for l in text.split("---")[1].strip().splitlines()) if v}
        if meta.get("decision") != "director-approved":
            continue
        pdir = REPO / meta.get("packet", "").rstrip("/")
        review = pdir / "review.json"
        if review.exists() and read(review).get("sourceDigest") == meta.get("packetDigest"):
            return rec, pdir
    return None


def publish(name: str) -> dict:
    found = approval_for(name)
    if not found:
        raise TileError(
            f"no director-approved record {rel(APPROVALS)}/{asset_name(name)}--<packet>.md whose packetDigest "
            "matches its packet's review.json (L7, PRD-9). Wait for the director; never write approval records.")
    rec, pdir = found
    review = read(pdir / "review.json")
    manifest_ids = {a.get("contentId") for a in read(MANIFEST).get("appearances", [])}
    EXPORTS.mkdir(parents=True, exist_ok=True)
    written, needs_manifest = [], []
    for t in review["tiles"]:
        rid = t.get("runtimeId")
        if not rid:
            continue
        src = pdir / t["file"]
        if sha(src.read_bytes()) != t["sha256"]:
            raise TileError(f"{rel(src)} does not match review.json; the packet was edited after review")
        dst = EXPORTS / f"{rid}.png"
        shutil.copyfile(src, dst)
        written.append({"runtimeId": rid, "path": rel(dst), "sha256": t["sha256"]})
        if rid not in manifest_ids:
            needs_manifest.append(rid)
    staging = {"schemaVersion": 1, "set": name, "packet": rel(pdir), "packetDigest": review["sourceDigest"],
               "approval": rel(rec), "exports": written, "awaitingManifest": needs_manifest}
    write(STAGING / f"{name}.json", staging)
    return staging


def published_exports() -> set[str]:
    """Export paths owned by tileforge publishes; the legacy generator must not overwrite them."""
    owned = set()
    for p in STAGING.glob("*.json"):
        owned |= {e["path"] for e in read(p).get("exports", [])}
    return owned
