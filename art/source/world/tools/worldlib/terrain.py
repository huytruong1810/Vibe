"""Catalog-backed TileSet adapter; uses the same compositor as tileforge previews."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

from .project import REPO, layers, spec

sys.path.insert(0, str(REPO / "art/source/tiles/tools"))
from tilelib.preview import TileSet, variant_of


def mask_families(material, layer):
    surface = material.removeprefix("ground_")
    return [f"{'path' if layer == 'paths' else 'shore'}_{surface}", material, surface]


class CatalogTileSet(TileSet):
    def __init__(self, art, colors, overlays):
        self.art, self.colors, self.n = art, colors, 32
        self.build = {"overlays": overlays}
        self.variants, self.cache = {}, {}

    def material(self, mid, x=0, y=0):
        if mid not in self.variants:
            ids = [mid]
            k = 1
            while mid in self.art.content_ids and f"{mid}_v{k}" in self.art.content_ids:
                ids.append(f"{mid}_v{k}")
                k += 1
            self.variants[mid] = ids
        ids = self.variants[mid]
        key = ids[variant_of(x, y, len(ids))]
        if key not in self.cache:
            found = self.art.asset(key)
            self.cache[key] = found[0].resize((32, 32), Image.Resampling.NEAREST) if found else Image.new("RGBA", (32, 32), self.colors.get(mid, "#1a243e"))
        return self.cache[key]

    def overlay(self, oid, mask):
        key = (oid, mask)
        if key not in self.cache:
            definition = self.build["overlays"][oid]
            for family in mask_families(definition["material"], definition["layer"]):
                found = self.art.asset(f"{family}_mask_{mask}")
                if found:
                    self.cache[key] = found[0].resize((32, 32), Image.Resampling.NEAREST)
                    break
            else:
                image = Image.new("RGBA", (32, 32))
                draw = ImageDraw.Draw(image)
                for y in range(0, 32, 4):
                    for x in range(0, 32, 4):
                        u, v = (x + 2) / 32, (y + 2) / 32
                        weight = ((1-u)*(1-v) if mask & 1 else 0) + (u*(1-v) if mask & 2 else 0) + ((1-u)*v if mask & 4 else 0) + (u*v if mask & 8 else 0)
                        if weight >= 0.5:
                            draw.rectangle((x, y, x+3, y+3), fill=self.colors.get(definition["material"], "#1a243e"))
                self.cache[key] = image
        return self.cache[key]

    def close(self):
        for image in self.cache.values():
            image.close()


def compose_terrain(level, art):
    document = spec()
    ls = layers(level)
    w, h = level["pxWid"] // 32, level["pxHei"] // 32
    values = {l["id"]: {v["value"]: v for v in l.get("values", [])} for l in document["layers"]}
    ground = np.empty((h, w), object)
    ground[:] = None
    colors, overlays, masks = {}, {}, []
    def material(info, layer):
        if layer == "water":
            return "ground_" + info.get("fluid", info["id"])
        if layer == "paths":
            return "ground_" + info["surface"]
        return "ground_" + info["id"]
    for layer in ("ground", "water", "paths"):
        grid = np.array(ls[layer]["intGridCsv"], int).reshape(h, w)
        groups = {}
        for value, info in values[layer].items():
            mid = material(info, layer)
            colors.setdefault(mid, info["color"])
            if layer == "ground":
                ground[grid == value] = mid
            groups.setdefault(mid, []).append(value)
        for mid, numbers in groups.items():
            if layer == "ground" and not any(f"{f}_mask_{m}" in art.content_ids for f in mask_families(mid, layer) for m in range(1,15)):
                continue
            cells = np.isin(grid, numbers)
            if not cells.any():
                continue
            oid = layer + ":" + mid
            overlays[oid] = {"material": mid, "layer": layer}
            masks.append((oid, cells))
    tiles = CatalogTileSet(art, colors, overlays)
    try:
        return tiles.compose(ground, masks, origin=(level.get("worldX", 0)//32, level.get("worldY", 0)//32))
    finally:
        tiles.close()
