"""Previews the operator must open (PRD-5): contact sheet, synthetic field and a real-map crop.

Composition mirrors the runtime: ground on the primary grid with the variant chosen by the
renderer's cell hash; overlays on the dual grid, half a tile up-left, mask 15 = the material.
"""

from __future__ import annotations

import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from .core import REPO, WORK, WORLD_PROJECT, WORLD_SCHEMA, TileError, read, spec
from .dualgrid import dual_mask

FONT = REPO / "art" / "source" / "ui" / "fonts" / "Silver.ttf"
BG = (32, 36, 46, 255)


def font(size=19):
    try:
        return ImageFont.truetype(str(FONT), size)
    except OSError:
        return ImageFont.load_default()


def cell_hash(x: int, y: int) -> int:
    """renderer.ts: (Math.imul(x + 13, 73856093) ^ Math.imul(y + 7, 19349663)) >>> 0"""
    return (((x + 13) * 73856093) & 0xFFFFFFFF) ^ (((y + 7) * 19349663) & 0xFFFFFFFF)


def fmix32(h: int) -> int:
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    return h ^ (h >> 16)


def variant_of(x: int, y: int, count: int) -> int:
    """tile_spec.json variantPick: the runtime must choose variants the same way."""
    return fmix32(cell_hash(x, y)) % count


class TileSet:
    def __init__(self, work):
        self.work = work
        self.build = json.loads((work / "build.json").read_text())
        self.img = {}
        for t in self.build["tiles"]:
            with Image.open(work / t["file"]) as im:
                self.img[t["file"]] = im.convert("RGBA")
        self.n = self.build["tilePx"]

    def material(self, mid, x=0, y=0):
        tiles = sorted((t for t in self.build["tiles"] if t.get("material") == mid and "overlay" not in t),
                       key=lambda t: t["variant"])
        return self.img[tiles[variant_of(x, y, len(tiles))]["file"]]

    def overlay(self, oid, mask):
        return self.img.get(f"tiles/{oid}_mask_{mask}.png")

    def compose(self, ground, overlays, fallback=None):
        """ground: 2-D array of material ids (or None); overlays: [(overlay id, bool cells)]."""
        h, w = ground.shape
        n = self.n
        canvas = Image.new("RGBA", (w * n + n, h * n + n), BG)
        for y in range(h):
            for x in range(w):
                mid = ground[y, x]
                if mid:
                    canvas.alpha_composite(self.material(mid, x, y), (x * n + n // 2, y * n + n // 2))
                elif fallback is not None and fallback[y][x]:
                    canvas.paste(fallback[y][x], (x * n + n // 2, y * n + n // 2, x * n + n + n // 2, y * n + n + n // 2))
        for oid, cells in overlays:
            mat = self.build["overlays"][oid]["material"]
            for y in range(h + 1):
                for x in range(w + 1):
                    mask = dual_mask(cells, x, y)
                    if not mask:
                        continue
                    tile = self.material(mat) if mask == 15 else self.overlay(oid, mask)
                    canvas.alpha_composite(tile, (x * n, y * n))
        return canvas.crop((n // 2, n // 2, n // 2 + w * n, n // 2 + h * n))


def _scale(im, k):
    return im.resize((im.width * k, im.height * k), Image.Resampling.NEAREST)


def contact(ts: TileSet, out, title):
    b = ts.build
    f = font()
    rows = []
    for mid, mat in b["materials"].items():
        tiles = [t for t in b["tiles"] if t.get("material") == mid and "overlay" not in t]
        tiles.sort(key=lambda t: t["variant"])
        singles = [_scale(ts.img[t["file"]], 4) for t in tiles]
        if mat["kind"] == "material":
            g = np.empty((4, 4), object)
            g[:] = mid
            field = _scale(ts.compose(g, []), 2)
            rep = Image.new("RGBA", (ts.n * 3, ts.n * 3))
            for yy in range(3):
                for xx in range(3):
                    rep.paste(ts.img[tiles[0]["file"]], (xx * ts.n, yy * ts.n))
            extras = [_scale(rep, 2), field]
        else:
            strip = Image.new("RGBA", (ts.n * 4, singles[0].height // 4))
            for xx in range(4):
                strip.paste(ts.img[tiles[0]["file"]], (xx * ts.n, 0))
            extras = [_scale(strip, 4)]
        rows.append((f"{mid}  {mat['kind']}  {', '.join(mat['refs'])}  windows {mat['windows']}", singles + extras))
    for oid, ov in b["overlays"].items():
        ground = next((m for m, v in b["materials"].items() if v["kind"] == "material" and m != ov["material"]), None)
        cells = []
        for mask in range(1, 16):
            tile = ts.overlay(oid, mask) or ts.material(ov["material"])
            base = Image.new("RGBA", tile.size, (60, 60, 70, 255))
            if ground:
                base = ts.material(ground).copy()
            base.alpha_composite(tile)
            cells.append(_scale(base, 3))
        rows.append((f"{oid}  overlay of {ov['material']} (masks 1-15, over {ground or 'grey'})", cells))
    width = max(sum(i.width + 8 for i in imgs) for _, imgs in rows) + 16
    height = sum(max(i.height for i in imgs) + 34 for _, imgs in rows) + 40
    sheet = Image.new("RGBA", (max(width, 640), height), BG)
    d = ImageDraw.Draw(sheet)
    d.text((8, 6), title, fill=(230, 230, 230, 255), font=f)
    y = 34
    for label, imgs in rows:
        d.text((8, y), label, fill=(200, 200, 210, 255), font=f)
        y += 24
        x = 8
        for im in imgs:
            sheet.alpha_composite(im, (x, y))
            x += im.width + 8
        y += max(i.height for i in imgs) + 10
    sheet.save(out)
    return out


def synthetic_field(ts: TileSet, recipe, w=24, h=14):
    """Ground materials in bands, the first overlay as a winding river with a pond, the others as
    paths; shows every mask in context at 2x (display pixels)."""
    b = ts.build
    mats = [m for m, v in b["materials"].items() if v["kind"] == "material"
            and m not in {o["material"] for o in b["overlays"].values()}]
    if not mats:
        mats = [next(m for m, v in b["materials"].items() if v["kind"] == "material")]
    ground = np.empty((h, w), object)
    for x in range(w):
        ground[:, x] = mats[min(len(mats) - 1, x * len(mats) // w)]
    overlays = []
    yy, xx = np.mgrid[0:h, 0:w]
    for i, oid in enumerate(b["overlays"]):
        if i == 0:
            centre = h * 0.55 + 2.2 * np.sin(xx / 3.1)
            cells = (np.abs(yy - centre) < 1.6) | ((xx - w * 0.75) ** 2 / 9 + (yy - h * 0.25) ** 2 / 4 < 1.0)
        else:
            centre = w * (0.3 + 0.2 * i) + 1.5 * np.sin(yy / 2.3)
            cells = np.abs(xx - centre) < 0.9
        overlays.append((oid, cells))
    return _scale(ts.compose(ground, overlays), 2)


def level_crop(ts: TileSet, recipe, level_id, rect):
    """Render a crop of the authored map with this set (bindings from the recipe)."""
    project = read(WORLD_PROJECT)
    level = next((l for l in project["levels"] if l["identifier"] == level_id), None)
    if level is None:
        raise TileError(f"no level '{level_id}' in {WORLD_PROJECT.name}")
    schema = read(WORLD_SCHEMA)
    layer_values = {l["id"]: {v["value"]: v for v in l.get("values", [])} for l in schema["layers"]}
    layers = {li["__identifier"]: li for li in level["layerInstances"]}
    W, H = level["pxWid"] // 32, level["pxHei"] // 32
    x0, y0, w, h = rect if rect else (0, 0, W, H)
    w, h = min(w, W - x0), min(h, H - y0)

    def grid(name):
        return np.array(layers[name]["intGridCsv"], int).reshape(H, W)[y0:y0 + h, x0:x0 + w]

    ground_ids = np.vectorize(lambda v: layer_values["ground"].get(v, {}).get("id"), otypes=[object])(grid("ground"))
    ground = np.empty((h, w), object)
    for m in recipe["materials"]:
        bind = m.get("binds")
        if bind and bind["layer"] == "ground":
            for vid in bind["values"]:
                ground[ground_ids == vid] = m["id"]
    fallback = [[None] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if ground[y, x] is None and ground_ids[y, x]:
                fallback[y][x] = layer_values["ground"][grid("ground")[y, x]]["color"]
    overlays = []
    for o in recipe.get("overlays", []):
        bind = o.get("binds")
        if not bind:
            continue
        ids = np.vectorize(lambda v: layer_values[bind["layer"]].get(v, {}).get("id"), otypes=[object])(grid(bind["layer"]))
        overlays.append((o["id"], np.isin(ids, bind["values"])))
    return ts.compose(ground, overlays, fallback)


def previews(name, recipe, work=None, level=None, rect=None):
    work = work or WORK / name
    ts = TileSet(work)
    made = [contact(ts, work / "contact.png", f"tileset {name} (1 art px = 4 px on singles)")]
    field = synthetic_field(ts, recipe)
    field.save(work / "field.png")
    made.append(work / "field.png")
    level = level or (recipe.get("preview") or {}).get("level")
    rect = rect or (recipe.get("preview") or {}).get("rect")
    if level:
        crop = level_crop(ts, recipe, level, rect)
        k = 2 if crop.width * crop.height <= (40 * 32) * (24 * 32) else 1  # a few screens at display scale
        _scale(crop, k).save(work / "level.png")
        made.append(work / "level.png")
    return made
