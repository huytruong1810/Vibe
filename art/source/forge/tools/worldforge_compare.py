"""Previous-revision comparison for worldforge review packets (C32).

Finds the packet of the same region and level with the highest earlier revision, copies its overview as
`before-overview.png` into the current packet and writes a side-by-side `comparison.png`.

  uv run --project art/source/forge python art/source/forge/tools/worldforge_compare.py <packet-dir> [--review-root DIR]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[4]
REVIEW = REPO / "art" / "review"


def _review(packet: Path) -> dict:
    f = packet / "world-review.json"
    if not f.exists():
        raise FileNotFoundError(f"{f} missing: not a worldforge packet")
    return json.loads(f.read_text())


def find_previous_packet(packet: Path, review_root: Path = REVIEW) -> Path | None:
    cur = _review(packet)
    best: tuple[int, Path] | None = None
    for d in review_root.iterdir():
        if not d.is_dir() or d.resolve() == packet.resolve() or not (d / "world-review.json").exists():
            continue
        r = _review(d)
        if r.get("region") != cur.get("region") or r.get("level") != cur.get("level"):
            continue
        rev = int(r.get("revision", 0))
        if rev < int(cur.get("revision", 0)) and (best is None or rev > best[0]):
            best = (rev, d)
    return best[1] if best else None


def prepare_packet_comparison(packet: Path, review_root: Path = REVIEW) -> dict:
    cur = _review(packet)
    prev = find_previous_packet(packet, review_root)
    if prev is None:
        raise LookupError("no earlier revision of this region and level; the before image stays the draft")
    prev_review = _review(prev)
    before = Image.open(prev / "overview.png").convert("RGB")
    after = Image.open(packet / "overview.png").convert("RGB")
    before.save(packet / "before-overview.png")
    label = 16
    sheet = Image.new("RGB", (before.width + after.width + 8, max(before.height, after.height) + label), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    d.text((2, 2), f"revision {prev_review.get('revision')} (before)", fill=(255, 255, 255))
    d.text((before.width + 10, 2), f"revision {cur.get('revision')} (after)", fill=(255, 255, 255))
    sheet.paste(before, (0, label))
    sheet.paste(after, (before.width + 8, label))
    sheet.save(packet / "comparison.png")
    return {
        "beforeSource": str(prev / "overview.png"),
        "previousRevision": int(prev_review.get("revision", 0)),
        "currentRevision": int(cur.get("revision", 0)),
        "placementDelta": int(cur.get("placements", 0)) - int(prev_review.get("placements", 0)),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("packet", type=Path)
    ap.add_argument("--review-root", type=Path, default=REVIEW)
    a = ap.parse_args()
    try:
        print(json.dumps(prepare_packet_comparison(a.packet, a.review_root), indent=2))
    except (LookupError, FileNotFoundError) as e:
        print(f"worldforge_compare: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
