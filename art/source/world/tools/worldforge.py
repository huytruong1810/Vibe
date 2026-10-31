"""Hearthwild worldforge (doctrine WLD-4): the only way agents touch the authored world.

    uv run --project art/source/forge python art/source/world/tools/worldforge.py <command> ...

Commands (built):
  plan check <region>             validate art/source/world/regions/<region>.plan.json against
                                  the world schema and the composition rules (WLD-3, WLD-4.1)
  plan render <region> [--out P]  draw the plan sketch (screen grid, zones, routes, landmarks)

Built (codex C6): doctor, next, new, example, apply <pass.json>, render, check, packet.
See docs/engineering/worldforge.md for the authoring loop and scoped review gates.
Agents run this tool; they never hand-edit .ldtk JSON (WLD-4.3).
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

sys.dont_write_bytecode = True  # workspace hygiene (TEAM-9)

WORLD = Path(__file__).resolve().parents[1]
REPO = WORLD.parents[2]
SPEC = WORLD / "spec" / "world_schema.json"
REGIONS = WORLD / "regions"
WORK = WORLD / "work"
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
FONT_BOLD = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")

ROUTE_KINDS = {"river", "canal", "path", "ferry", "festival"}
ZONE_KINDS = {"village", "wild", "water"}
DENSITY = {"calm", "medium", "dense"}
DENSITY_FOR_KIND = {"village": {"medium", "dense"}, "wild": {"calm", "medium"}, "water": {"calm", "medium"}}
HABITAT_DENSITY = {"sparse", "common", "dense"}
PHASES = {"dawn", "day", "dusk", "night"}
STORY_HALF = (6, 3.5)  # 12x7-tile sight window (AGT-3.1)
VILLAGE_MIN_DEPTH = 3  # WLD-3.4


class WorldError(RuntimeError):
    """Something the operator can fix; the message says how."""


def schema() -> dict:
    return json.loads(SPEC.read_text())


def load_plan(region: str) -> dict:
    p = REGIONS / f"{region}.plan.json"
    if not p.exists():
        raise WorldError(f"No plan at {p.relative_to(REPO)}. Plans are written by the director/claude (WLD-4.1).")
    return json.loads(p.read_text())


# ---------------------------------------------------------------- geometry
def point_in_poly(x: float, y: float, poly: list) -> bool:
    inside = False
    for i in range(len(poly)):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % len(poly)]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def in_bounds(pt, size, edge_ok=True) -> bool:
    x, y = pt
    w, h = size
    return (0 <= x <= w and 0 <= y <= h) if edge_ok else (0 <= x < w and 0 <= y < h)


def cell_of(pt, screen) -> tuple[int, int]:
    return int(pt[0] // screen[0]), int(pt[1] // screen[1])


def grid_cells(size, screen) -> list[tuple[int, int]]:
    cols, rows = math.ceil(size[0] / screen[0]), math.ceil(size[1] / screen[1])
    return [(c, r) for r in range(rows) for c in range(cols)]


# ---------------------------------------------------------------- plan check
def check_plan(plan: dict) -> list[str]:
    """Return a list of problems; empty means the plan passes."""
    s = schema()
    screen = s["screen"]["tiles"]
    ent = s["entities"]
    enums = s["enums"]
    region = plan.get("region")
    npc_ids = set(enums["npcId"].get(region, []))
    species = set(enums["speciesId"])
    amb_sets = set(enums["ambienceSets"])
    amb_emitters = set(enums["ambienceEmitters"])
    music = set(enums["musicTracks"])
    biomes = set(s["levelFields"]["biome"]["values"])
    path_surfaces = {v["surface"] for v in next(l for l in s["layers"] if l["id"] == "paths")["values"]} | {
        v["id"].replace("_path", "") for v in next(l for l in s["layers"] if l["id"] == "paths")["values"]}
    building_kinds = set(ent["Building"]["fields"]["kind"]["values"])
    service_kinds = set(ent["Service"]["fields"]["kind"]["values"])
    scene_re = re.compile(ent["Building"]["fields"]["sceneId"]["pattern"])
    errs: list[str] = []

    def err(where: str, msg: str) -> None:
        errs.append(f"{where}: {msg}")

    if region not in s["levelFields"]["region"]["values"]:
        err("region", f"'{region}' is not in world_schema levelFields.region")
    levels = plan.get("levels") or []
    if not levels:
        err("levels", "plan has no levels")
    landmarks: dict[str, tuple[str, list]] = {}
    for lv in levels:
        for lm in lv.get("landmarks", []):
            if lm["id"] in landmarks:
                err(f"{lv['id']}.landmarks", f"duplicate landmark id '{lm['id']}'")
            landmarks[lm["id"]] = (lv["id"], lm["at"])

    spawns, scene_ids, seen_npcs = [], set(), {}
    rects = []
    for lv in levels:
        L = lv.get("id", "?")
        size = lv.get("size")
        if not (isinstance(size, list) and len(size) == 2 and all(isinstance(v, int) and v > 0 for v in size)):
            err(L, "size must be [w, h] in tiles")
            continue
        wx, wy = lv.get("world", [None, None])
        rects.append((L, wx, wy, size))
        if lv.get("biome") not in biomes:
            err(L, f"biome '{lv.get('biome')}' not in schema")
        if lv.get("ambience") not in amb_sets:
            err(L, f"ambience '{lv.get('ambience')}' not in schema enums.ambienceSets")
        if lv.get("music") not in music:
            err(L, f"music '{lv.get('music')}' not in schema enums.musicTracks")
        if "spawn" in lv:
            spawns.append(L)
            if not in_bounds(lv["spawn"]["at"], size, edge_ok=False):
                err(f"{L}.spawn", "outside the level")

        zones = lv.get("zones", [])
        for z in zones:
            w = f"{L}.zones.{z.get('id')}"
            if z.get("kind") not in ZONE_KINDS:
                err(w, f"kind must be one of {sorted(ZONE_KINDS)}")
            if z.get("density") not in DENSITY_FOR_KIND.get(z.get("kind"), DENSITY):
                err(w, f"density '{z.get('density')}' breaks the density gradient for a {z.get('kind')} zone (WLD-3.3)")
            poly = z.get("polygon", [])
            if len(poly) < 3:
                err(w, "polygon needs at least 3 points")
            for p in poly:
                if not in_bounds(p, size):
                    err(w, f"point {p} outside the level")
            if z.get("biome") and z["biome"] not in biomes:
                err(w, f"biome '{z['biome']}' not in schema")

        def zone_at(x, y):
            for z in zones:
                if point_in_poly(x, y, z.get("polygon", [])):
                    return z
            return None

        cells = grid_cells(size, screen)
        listed = {}
        for sc in lv.get("screens", []):
            c = tuple(sc.get("cell", []))
            if c in listed:
                err(f"{L}.screens", f"cell {list(c)} listed twice")
            listed[c] = sc
        for c in cells:
            w = f"{L}.screen{list(c)}"
            sc = listed.get(c)
            if not sc or not sc.get("subject"):
                err(w, "has no subject; every screen needs one (WLD-3.1)")
                continue
            subj = sc["subject"]
            if subj not in landmarks:
                err(w, f"subject '{subj}' is not a landmark")
                continue
            lvl, at = landmarks[subj]
            if lvl != L or cell_of(at, screen) != c:
                err(w, f"subject '{subj}' at {at} is not inside this screen")
            cx, cy = (c[0] + 0.5) * screen[0], (c[1] + 0.5) * screen[1]
            z = zone_at(min(cx, size[0] - 0.5), min(cy, size[1] - 0.5))
            if z is None:
                err(w, "screen centre lies in no zone")
            elif z["kind"] == "village" and sc.get("depth", 0) < VILLAGE_MIN_DEPTH:
                err(w, f"village screen needs depth >= {VILLAGE_MIN_DEPTH} (WLD-3.4)")
        for c in listed:
            if c not in cells:
                err(f"{L}.screens", f"cell {list(c)} is outside the level grid")

        for lm in lv.get("landmarks", []):
            if not in_bounds(lm["at"], size, edge_ok=False):
                err(f"{L}.landmarks.{lm['id']}", f"{lm['at']} outside the level")
            if not isinstance(lm.get("tolerance"), (int, float)) or lm["tolerance"] < 0:
                err(f"{L}.landmarks.{lm['id']}", "tolerance (tiles) is required")

        for r in lv.get("routes", []):
            w = f"{L}.routes.{r.get('id')}"
            if r.get("kind") not in ROUTE_KINDS:
                err(w, f"kind must be one of {sorted(ROUTE_KINDS)}")
            if len(r.get("points", [])) < 2:
                err(w, "needs at least 2 points")
            for p in r.get("points", []):
                if not in_bounds(p, size):
                    err(w, f"point {p} outside the level")
            if r.get("kind") == "path" and r.get("surface") not in path_surfaces:
                err(w, f"surface '{r.get('surface')}' not a schema path surface")
            if r.get("kind") in {"river", "canal"} and not r.get("width"):
                err(w, "water routes need a width")

        for st in lv.get("storySpots", []):
            w = f"{L}.storySpots.{st.get('id')}"
            subj = st.get("subject")
            if subj not in landmarks or landmarks[subj][0] != L:
                err(w, f"subject '{subj}' is not a landmark in this level")
                continue
            dx, dy = abs(landmarks[subj][1][0] - st["at"][0]), abs(landmarks[subj][1][1] - st["at"][1])
            if dx > STORY_HALF[0] or dy > STORY_HALF[1]:
                err(w, f"subject is {dx}x{dy} tiles away; it must sit in the 12x7 sight window (AGT-3.1)")

        foot = []
        for b in lv.get("buildings", []):
            w = f"{L}.buildings.{b.get('sceneId')}"
            if not scene_re.match(b.get("sceneId", "")):
                err(w, "sceneId does not match the schema pattern")
            if b.get("sceneId") in scene_ids:
                err(w, "duplicate sceneId")
            scene_ids.add(b.get("sceneId"))
            if b.get("kind") not in building_kinds:
                err(w, f"kind '{b.get('kind')}' not in schema")
            if b.get("owner") and b["owner"] not in npc_ids:
                err(w, f"owner '{b['owner']}' is not a {region} npc id")
            (x, y), (fw, fh) = b["at"], b["footprint"]
            if not (in_bounds((x, y), size, False) and in_bounds((x + fw, y + fh), size)):
                err(w, "footprint leaves the level")
            for o in foot:
                if x < o[0] + o[2] and o[0] < x + fw and y < o[1] + o[3] and o[1] < y + fh:
                    err(w, f"footprint overlaps {o[4]}")
            foot.append((x, y, fw, fh, b.get("sceneId")))

        for sv in lv.get("services", []):
            if sv.get("kind") not in service_kinds:
                err(f"{L}.services", f"kind '{sv.get('kind')}' not in schema")
        for v in lv.get("villagers", []):
            w = f"{L}.villagers.{v.get('npcId')}"
            if v.get("npcId") not in npc_ids:
                err(w, "not a known npc id for this region")
            if v.get("npcId") in seen_npcs:
                err(w, "listed twice")
            seen_npcs[v.get("npcId")] = L
            if v.get("home") not in scene_ids and v.get("home") not in {b.get("sceneId") for b in lv.get("buildings", [])}:
                err(w, f"home '{v.get('home')}' is not a building sceneId")
            if v.get("work") not in landmarks:
                err(w, f"work '{v.get('work')}' is not a landmark")
        for key in ("square", "shrine"):
            if key in lv and lv[key] not in landmarks:
                err(f"{L}.{key}", f"'{lv[key]}' is not a landmark")
        for h in lv.get("habitats", []):
            w = f"{L}.habitats"
            bad = [sp for sp in h.get("species", []) if sp not in species]
            if bad or not h.get("species"):
                err(w, f"unknown or missing species {bad}")
            if h.get("density") not in HABITAT_DENSITY:
                err(w, f"density must be one of {sorted(HABITAT_DENSITY)}")
            x, y, rw, rh = h["rect"]
            if not (in_bounds((x, y), size) and in_bounds((x + rw, y + rh), size)):
                err(w, f"rect {h['rect']} leaves the level")
            if any(p not in PHASES for p in h.get("phases", [])):
                err(w, "unknown phase")
        for a in lv.get("ambienceEmitters", []):
            if a.get("set") not in amb_emitters:
                err(f"{L}.ambience", f"'{a.get('set')}' not in schema enums.ambienceEmitters")

    if len(spawns) != 1:
        err("spawn", f"exactly one level needs a new-game spawn (found {len(spawns)})")
    missing = npc_ids - set(seen_npcs)
    if missing:
        err("villagers", f"no anchors for {sorted(missing)}")
    for i, (a, ax, ay, asz) in enumerate(rects):
        for b, bx, by, bsz in rects[i + 1:]:
            if ax < bx + bsz[0] and bx < ax + asz[0] and ay < by + bsz[1] and by < ay + asz[1]:
                err("levels", f"{a} and {b} overlap in world space")
    return errs


# ---------------------------------------------------------------- plan render
PX = 8  # sketch pixels per tile
ZONE_FILL = {("village", "dense"): (236, 222, 190), ("village", "medium"): (226, 222, 196),
             ("wild", "calm"): (205, 222, 182), ("wild", "medium"): (192, 214, 170),
             ("water", "calm"): (205, 225, 228), ("water", "medium"): (205, 225, 228)}
SURFACE_COL = {"dirt": (160, 120, 80), "stone": (130, 134, 136), "boardwalk": (140, 95, 55), "bridge": (110, 75, 40)}
WATER = (90, 160, 180)
DEEP = (50, 115, 150)
FESTIVAL = (235, 170, 40)
INK = (40, 44, 52)


def _font(size: int, bold: bool = False):
    from PIL import ImageFont
    p = FONT_BOLD if bold else FONT
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default()


def _dashed(draw, pts, fill, width, dash=10):
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(x2 - x1, y2 - y1) // dash))
        for i in range(0, n, 2):
            a, b = i / n, min(1, (i + 1) / n)
            draw.line([(x1 + (x2 - x1) * a, y1 + (y2 - y1) * a), (x1 + (x2 - x1) * b, y1 + (y2 - y1) * b)], fill=fill, width=width)


def render_plan(plan: dict, out: Path) -> Path:
    from PIL import Image, ImageDraw
    s = schema()
    screen = s["screen"]["tiles"]
    margin, legend_h = 24, 120
    minx = min(lv["world"][0] for lv in plan["levels"])
    miny = min(lv["world"][1] for lv in plan["levels"])
    maxx = max(lv["world"][0] + lv["size"][0] for lv in plan["levels"])
    maxy = max(lv["world"][1] + lv["size"][1] for lv in plan["levels"])
    W, H = (maxx - minx) * PX + 2 * margin, (maxy - miny) * PX + 2 * margin + 28 + legend_h
    img = Image.new("RGB", (W, H), (246, 244, 238))
    d = ImageDraw.Draw(img)
    f_s, f_m, f_b = _font(11), _font(13), _font(15, True)
    d.text((margin, 6), f"{plan['region']} region plan: {', '.join(l['id'] for l in plan['levels'])}  (1 tile = {PX} px; grid = 30x17-tile screens)", fill=INK, font=f_b)

    def T(lv, x, y):
        return (margin + (lv["world"][0] - minx + x) * PX, margin + 28 + (lv["world"][1] - miny + y) * PX)

    labels = []
    for lv in plan["levels"]:
        w, h = lv["size"]
        for z in lv.get("zones", []):
            d.polygon([T(lv, *p) for p in z["polygon"]], fill=ZONE_FILL.get((z["kind"], z["density"]), (220, 220, 220)))
        for hb in lv.get("habitats", []):
            x, y, rw, rh = hb["rect"]
            col = (70, 140, 90) if hb["density"] != "sparse" else (120, 160, 120)
            _dashed(d, [T(lv, x, y), T(lv, x + rw, y), T(lv, x + rw, y + rh), T(lv, x, y + rh), T(lv, x, y)], col, 1, 6)
            d.text((T(lv, x, y)[0] + 3, T(lv, x, y)[1] + 2), f"{'/'.join(hb['species'])} ({hb['density']})", fill=col, font=f_s)
        for r in lv.get("routes", []):
            pts = [T(lv, *p) for p in r["points"]]
            if r["kind"] in ("river", "canal"):
                d.line(pts, fill=WATER, width=int(r["width"] * PX), joint="curve")
                if r.get("deepWidth"):
                    d.line(pts, fill=DEEP, width=int(r["deepWidth"] * PX), joint="curve")
        for r in lv.get("routes", []):
            pts = [T(lv, *p) for p in r["points"]]
            if r["kind"] == "path":
                d.line(pts, fill=SURFACE_COL.get(r.get("surface"), (150, 120, 90)), width=PX if r.get("surface") != "bridge" else PX + 2, joint="curve")
            elif r["kind"] == "ferry":
                _dashed(d, pts, (60, 60, 70), 3)
        for r in lv.get("routes", []):
            if r["kind"] == "festival":
                _dashed(d, [T(lv, *p) for p in r["points"]], FESTIVAL, 3, 8)
        for b in lv.get("buildings", []):
            (x, y), (fw, fh) = b["at"], b["footprint"]
            d.rectangle([T(lv, x, y), T(lv, x + fw, y + fh)], fill=(150, 92, 70), outline=INK)
        for c in grid_cells(lv["size"], screen):
            x0, y0 = c[0] * screen[0], c[1] * screen[1]
            x1, y1 = min(w, x0 + screen[0]), min(h, y0 + screen[1])
            d.rectangle([T(lv, x0, y0), T(lv, x1, y1)], outline=(120, 120, 140), width=1)
        for sc in lv.get("screens", []):
            x0, y0 = sc["cell"][0] * screen[0], sc["cell"][1] * screen[1]
            d.text((T(lv, x0, y0)[0] + 3, T(lv, x0, y0)[1] + 2), f"{sc['cell'][0]},{sc['cell'][1]}", fill=(110, 110, 130), font=f_s)
        for st in lv.get("storySpots", []):
            x, y = T(lv, *st["at"])
            d.polygon([(x, y - 5), (x - 5, y + 4), (x + 5, y + 4)], outline=(150, 60, 140), fill=(230, 200, 230))
        subjects = {sc["subject"] for sc in lv.get("screens", [])}
        for lm in lv.get("landmarks", []):
            x, y = T(lv, *lm["at"])
            r = 6 if lm["id"] in subjects else 4
            d.ellipse([x - r, y - r, x + r, y + r], fill=(200, 60, 50) if lm["id"] in subjects else (240, 240, 240), outline=INK, width=2)
            labels.append((x, y, r, lm["name"], f_m if lm["id"] in subjects else f_s, lv))
        if "spawn" in lv:
            x, y = T(lv, *lv["spawn"]["at"])
            d.regular_polygon((x, y, 9), 5, fill=(250, 200, 40), outline=INK)
        lx, ly = T(lv, 0, 0)
        d.rectangle([T(lv, 0, 0), T(lv, w, h)], outline=INK, width=3)
        d.text((lx + 4, ly - 18), f"{lv['id']}  {w}x{h} tiles  biome={lv['biome']}", fill=INK, font=f_b)
    # labels last, so a neighbouring level never paints over them; flip left only at the image edge
    for x, y, r, text, font, lv in labels:
        tw = d.textlength(text, font=font)
        tx = x - r - 2 - tw if x + r + 2 + tw > W - margin else x + r + 2
        d.rectangle([tx - 1, y - 7, tx + tw + 1, y + 7], fill=(246, 244, 238))
        d.text((tx, y - 7), text, fill=INK, font=font)
    # legend
    y0 = H - legend_h + 8
    items = [((200, 60, 50), "screen subject (WLD-3.1)"), ((240, 240, 240), "landmark"), ((250, 200, 40), "new-game spawn"),
             ((230, 200, 230), "story spot (AGT-3.1)"), (WATER, "river / canal (dark = deep)"), (SURFACE_COL["boardwalk"], "boardwalk"),
             (SURFACE_COL["dirt"], "dirt path"), (SURFACE_COL["stone"], "stone path"), (FESTIVAL, "Reedlight Float (dashed)"),
             ((150, 92, 70), "building footprint"), ((236, 222, 190), "village zone (dense)"), ((205, 222, 182), "wild zone (calm)"),
             ((70, 140, 90), "habitat (dashed)")]
    for i, (col, label) in enumerate(items):
        x = margin + (i % 5) * 260
        y = y0 + (i // 5) * 24
        d.rectangle([x, y, x + 16, y + 14], fill=col, outline=INK)
        d.text((x + 22, y), label, fill=INK, font=f_m)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return out


# ---------------------------------------------------------------- cli
def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] != "plan":
        from worldlib.cli import main as commands
        return commands(sys.argv[1:])
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("plan", help="region plan commands")
    p.add_argument("action", choices=["check", "render"])
    p.add_argument("region")
    p.add_argument("--file", help="check this plan file instead of regions/<region>.plan.json")
    p.add_argument("--out", help="render target PNG (default art/source/world/work/<region>/plan_sketch.png)")
    a = ap.parse_args()
    try:
        plan = json.loads(Path(a.file).read_text()) if a.file else load_plan(a.region)
        if a.action == "check":
            errs = check_plan(plan)
            for e in errs:
                print(f"  FAIL {e}")
            print(f"plan check {a.region}: {'ok' if not errs else f'{len(errs)} problem(s)'}")
            return 1 if errs else 0
        out = Path(a.out) if a.out else WORK / a.region / "plan_sketch.png"
        render_plan(plan, out)
        print(f"wrote {out}; OPEN it and describe what you see (PRD-5)")
        return 0
    except WorldError as e:
        print(f"WORLDFORGE ERROR: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
