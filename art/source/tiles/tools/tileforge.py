"""Hearthwild tileforge (doctrine ART-11.2, WLD-4.2): concept swatch -> palette-locked 32-px tiles.

    uv run --project art/source/forge python art/source/tiles/tools/tileforge.py <command> ...

Commands:
  doctor                         check the tool, palette and spec
  new <set> [--region R]         scaffold art/source/tiles/sets/<set>/set.json and swatches/
  build   --set S                synthesise every tile into art/source/tiles/work/<S>/tiles (1x)
  qa      --set S                QA report (hard checks decide draft/candidate)
  preview --set S [--level L] [--rect x,y,w,h]
                                 contact.png, field.png and an authored-map crop (level.png)
  all     --set S [...]          build + qa + preview; prints what to LOOK at (PRD-5)
  packet  --set S                review packet art/review/tiles-<S>-<n>/ (QA candidate only)
  publish --set S                after a director approval record matches the packet digest:
                                 copy runtime tiles to art/source/exports/environment/
  next    --set S                say what to do next
  selftest                       synthetic end-to-end run, plus negative checks

The swatch gives structure; the recipe gives palette values and proportions. Fix the inputs
(swatch, values, proportions, flatten, cluster, edge bands), never the output PNGs.
See .agents/skills/tile-forge/SKILL.md and docs/engineering/tileforge.md.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # workspace hygiene (TEAM-9)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from tilelib.core import SETS, WORK, TileError, palette, rel, spec, write  # noqa: E402
from tilelib import packet as pk  # noqa: E402
from tilelib.pipeline import build, load_recipe, qa  # noqa: E402
from tilelib.preview import previews  # noqa: E402

TEMPLATE = {
    "set": "",
    "region": "aqualia",
    "notes": "What this set is for, which map layers it covers, and the look you are aiming at.",
    "materials": [
        {
            "id": "grass",
            "runtimeId": "ground_grass",
            "binds": {"layer": "ground", "values": ["grass"]},
            "swatch": "swatches/grass.png",
            "swatchTilePx": 128,
            "values": ["foliage.shadow", "foliage.mid", "reed.mid", "reed.light"],
            "proportions": [0.18, 0.42, 0.28, 0.12],
            "variants": 3,
        }
    ],
    "overlays": [],
    "pairs": [],
    "preview": {"level": "aqualia_village", "rect": [20, 20, 30, 17]},
}


def _rect(s):
    if not s:
        return None
    parts = [int(v) for v in s.split(",")]
    if len(parts) != 4:
        raise TileError("--rect is x,y,w,h in tiles")
    return parts


def cmd_doctor(_):
    s = spec()
    print(f"tileforge: tile {s['tilePx']} px, export x{s['exportScale']}, <= {s['maxValuesPerMaterial']} values per material")
    print(f"palette: {len(palette())} ramps")
    print(f"sets: {', '.join(p.parent.name for p in SETS.glob('*/set.json')) or 'none'}")
    import numpy, PIL, scipy, jsonschema  # noqa: F401,E401

    print("ok")


def cmd_new(a):
    folder = SETS / a.name
    if (folder / "set.json").exists():
        raise TileError(f"{rel(folder / 'set.json')} exists; edit it instead")
    (folder / "swatches").mkdir(parents=True, exist_ok=True)
    recipe = dict(TEMPLATE, set=a.name, region=a.region)
    write(folder / "set.json", recipe)
    print(f"created {rel(folder / 'set.json')}; put concept swatches in {rel(folder / 'swatches')}/")


def _all(a):
    recipe = load_recipe(a.set)
    b = build(a.set)
    report = qa(a.set, recipe=recipe)
    made = previews(a.set, recipe, level=getattr(a, "level", None), rect=_rect(getattr(a, "rect", None)))
    return b, report, made


def _print_report(report):
    print(f"[qa] status {report['status']}")
    for c in report["checks"]:
        if not c["pass"]:
            print(f"   - {'FAIL' if c['hard'] else 'soft'} {c['check']} ({c['rule']}): {c['detail']}")


def cmd_build(a):
    b = build(a.set)
    print(f"[build] {len(b['tiles'])} tiles in {rel(WORK / a.set / 'tiles')}")
    for mid, m in b["materials"].items():
        for note in m["notes"]:
            print(f"   note {mid}: {note}")


def cmd_qa(a):
    _print_report(qa(a.set, recipe=load_recipe(a.set)))


def cmd_preview(a):
    for p in previews(a.set, load_recipe(a.set), level=a.level, rect=_rect(a.rect)):
        print(f"LOOK at {rel(p)}")


def cmd_all(a):
    b, report, made = _all(a)
    print(f"[build] {len(b['tiles'])} tiles")
    _print_report(report)
    for p in made:
        print(f"LOOK at {rel(p)} and describe what you see before you claim anything (PRD-5)")
    print("next:", _next(a.set))


def cmd_packet(a):
    r = pk.packet(a.set)
    print(f"[packet] {rel(r['dir'])} sourceDigest {r['review']['sourceDigest']}")
    print("Write a DIGEST note and message the director; only the director approves (L7).")


def cmd_publish(a):
    s = pk.publish(a.set)
    print(f"[publish] {len(s['exports'])} tiles -> {rel(pk.EXPORTS)}; record {rel(pk.STAGING / (a.set + '.json'))}")
    if s["awaitingManifest"]:
        print(f"   not yet in manifest.json (communicator integrates): {', '.join(s['awaitingManifest'])}")
    print("   ask codex to run npm run assets:build (generated outputs are codex's)")


def _next(name):
    work = WORK / name
    if not (SETS / name / "set.json").exists():
        return f"tileforge.py new {name}"
    if not (work / "qa_report.json").exists():
        return f"tileforge.py all --set {name}"
    from tilelib.core import read

    report = read(work / "qa_report.json")
    if report["status"] != "candidate":
        return "fix the recipe or swatch for the failed hard checks, then tileforge.py all --set " + name
    if pk.approval_for(name):
        return f"tileforge.py publish --set {name}"
    packets = sorted(pk.REVIEW.glob(f"{pk.asset_name(name)}-*/review.json"), key=lambda p: p.stat().st_mtime)
    if packets and read(packets[-1]).get("qa") == report["checks"]:
        return f"{rel(packets[-1].parent)} is waiting for the director (L7); work on the next material meanwhile"
    return f"LOOK at the previews; if they read well: tileforge.py packet --set {name}, then wait for the director"


def cmd_next(a):
    print(_next(a.set))


def cmd_selftest(_):
    from tilelib.selftest import run

    run()


def main(argv=None):
    p = argparse.ArgumentParser(prog="tileforge", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor").set_defaults(fn=cmd_doctor)
    n = sub.add_parser("new")
    n.add_argument("name")
    n.add_argument("--region", default="aqualia")
    n.set_defaults(fn=cmd_new)
    for name, fn in (("build", cmd_build), ("qa", cmd_qa), ("preview", cmd_preview), ("all", cmd_all),
                     ("packet", cmd_packet), ("publish", cmd_publish), ("next", cmd_next)):
        c = sub.add_parser(name)
        c.add_argument("--set", required=True)
        if name in ("preview", "all"):
            c.add_argument("--level")
            c.add_argument("--rect")
        c.set_defaults(fn=fn)
    sub.add_parser("selftest").set_defaults(fn=cmd_selftest)
    a = p.parse_args(argv)
    try:
        a.fn(a)
    except TileError as e:
        print(f"tileforge: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
