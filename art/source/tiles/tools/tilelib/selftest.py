"""tileforge selftest: synthetic swatches -> build -> qa -> previews -> packet, then negative checks.

The same generators make the tool's golden-sample swatches (`tileforge.py selftest --write-swatches`
is not offered; swatches are design inputs owned by the communicator, these are only stand-ins).
"""

from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, map_coordinates
from scipy.spatial import cKDTree

from .core import TileError, write


def _smooth(rng, size, sigma):
    z = gaussian_filter(rng.standard_normal((size, size)), sigma, mode="wrap")
    return (z - z.mean()) / (z.std() or 1)


def water_swatch(size=512, seed=3, cell=30):
    """Caustic network: bright Voronoi ridges over a gently varying teal."""
    rng = np.random.default_rng(seed)
    pts = rng.uniform(0, size, ((size // cell) ** 2, 2))
    yy, xx = np.mgrid[0:size, 0:size].astype(float)
    warp = 6.0
    wy = yy + warp * _smooth(rng, size, 18)
    wx = xx + warp * _smooth(rng, size, 18)
    d, _ = cKDTree(pts).query(np.stack([wy.ravel(), wx.ravel()], 1), k=2)
    ridge = (d[:, 1] - d[:, 0]).reshape(size, size)
    line = np.clip(1.0 - ridge / 3.5, 0, 1)
    base = 0.45 + 0.08 * _smooth(rng, size, 30)
    v = np.clip(base + 0.5 * line, 0, 1)
    rgb = np.stack([0.15 + 0.6 * v, 0.55 + 0.4 * v, 0.6 + 0.35 * v], -1)
    return Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), "RGB")


def grass_swatch(size=512, seed=5, blades=9000):
    """Clumped meadow: short upright blades, a lit tip and a shadowed root, over clump shading."""
    rng = np.random.default_rng(seed)
    clump = _smooth(rng, size, 12)
    v = 0.42 + 0.05 * clump
    img = Image.fromarray((np.clip(v, 0, 1) * 255).astype(np.uint8), "L")
    d = ImageDraw.Draw(img)
    for _ in range(blades):
        x, y = rng.uniform(0, size, 2)
        length = rng.uniform(5, 10)
        ang = np.deg2rad(-90 + rng.normal(0, 18))
        x2, y2 = x + length * np.cos(ang), y + length * np.sin(ang)
        shade = 0.5 + 0.1 * clump[int(y) % size, int(x) % size]
        d.line([(x + 1.5, y + 1.5), (x2 + 1.5, y2 + 1.5)], fill=int(255 * (shade - 0.22)), width=3)
        d.line([(x, y), (x2, y2)], fill=int(255 * (shade + 0.12)), width=2)
        d.point((x2, y2), fill=int(255 * min(1, shade + 0.3)))
    g = np.asarray(img, float) / 255
    rgb = np.stack([0.25 + 0.45 * g, 0.4 + 0.55 * g, 0.15 + 0.3 * g], -1)
    return Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8), "RGB")


def gradient_swatch(size=256):
    """Pools of light one tile apart, little structure: must fail lowFrequency without flatten."""
    yy, xx = np.mgrid[0:size, 0:size] / 128.0
    v = 0.5 + 0.25 * np.cos(2 * np.pi * xx) * np.cos(2 * np.pi * yy)
    v = v + 0.01 * np.random.default_rng(1).standard_normal((size, size))
    return Image.fromarray((np.stack([v, v, v], -1) * 255).astype(np.uint8), "RGB")


RECIPE = {
    "set": "selftest",
    "region": "aqualia",
    "materials": [
        {"id": "grass", "runtimeId": "ground_grass", "binds": {"layer": "ground", "values": ["grass", "reedbed"]},
         "swatch": "swatches/grass.png", "swatchTilePx": 128,
         "values": ["foliage-deep.shadow", "foliage-deep.mid", "moss.mid", "reed.mid"],
         "proportions": [0.12, 0.7, 0.13, 0.05], "cluster": 0.5, "variants": 3},
        {"id": "freshwater", "runtimeId": "ground_freshwater", "swatch": "swatches/water.png", "swatchTilePx": 128,
         "values": ["water.shadow", "water.mid", "water.light", "water.highlight"],
         "proportions": [0.22, 0.5, 0.2, 0.08], "variants": 2},
        {"id": "cliff", "runtimeId": "cliff_grass", "swatch": "swatches/grass.png", "swatchTilePx": 128,
         "wrap": "x", "heightPx": 8, "values": ["stone.deep", "stone.shadow", "stone.mid"],
         "rows": {"0": "moss.mid", "-1": "stone.deep"}},
    ],
    "overlays": [
        {"id": "freshwater_shore", "material": "freshwater", "binds": {"layer": "water", "values": ["fresh_shallow", "fresh_deep"]},
         "runtimeIdTemplate": "shore_freshwater_mask_{mask}",
         "edge": {"inside": [{"px": 1, "value": "water.highlight"}, {"px": 2, "value": "water.light", "dither": 0.5}],
                  "outside": [{"px": 1, "value": "timber.deep"}]}},
    ],
    "pairs": [["grass", "freshwater"]],
}


def _run_set(folder: Path, work: Path, recipe: dict):
    from .pipeline import build, load_recipe, qa
    from .preview import previews

    write(folder / "set.json", recipe)
    rec = load_recipe(recipe["set"], folder)
    build(recipe["set"], folder, work)
    report = qa(recipe["set"], work, rec)
    previews(recipe["set"], rec, work)
    return report


def run():
    from .packet import packet

    tmp = Path(tempfile.mkdtemp(prefix="tileforge-selftest-"))
    try:
        folder, work = tmp / "set", tmp / "work"
        (folder / "swatches").mkdir(parents=True)
        grass_swatch().save(folder / "swatches/grass.png")
        water_swatch().save(folder / "swatches/water.png")
        report = _run_set(folder, work, RECIPE)
        failed = [c for c in report["checks"] if c["hard"] and not c["pass"]]
        assert report["status"] == "candidate", f"golden synthetic set should pass: {failed}"
        tiles = json.loads((work / "build.json").read_text())["tiles"]
        masks = sorted(t["mask"] for t in tiles if t.get("overlay") == "freshwater_shore")
        assert masks == list(range(1, 16)), masks
        assert sum(1 for t in tiles if t.get("material") == "grass" and "overlay" not in t) == 4
        print(f"[selftest] golden synthetic set: candidate, {len(tiles)} tiles")
        out = packet("selftest", work, tmp / "review")
        assert (out["dir"] / "review.json").exists() and (out["dir"] / "atlas.png").exists()
        with Image.open(out["dir"] / "tiles/grass.png") as im:
            assert im.size == (64, 64), im.size
        print(f"[selftest] packet ok: {len(out['review']['tiles'])} tiles at 2x, digest {out['review']['sourceDigest'][:12]}")

        # lighting in the swatch is removed by the tool; a hand-lit tile is caught
        neg = json.loads(json.dumps(RECIPE))
        gradient_swatch().save(folder / "swatches/gradient.png")
        neg["materials"][0].update(swatch="swatches/gradient.png", variants=0)
        r = _run_set(folder, tmp / "work-neg1", neg)
        assert any(c["check"] == "grass.lowFrequency" and c["pass"] for c in r["checks"]), "lit swatch not evened"
        lit = tmp / "work-neg1" / "tiles/grass.png"
        arr = np.asarray(Image.open(lit).convert("RGBA")).copy()
        light = arr[..., :3].reshape(-1, 3)[np.argmax(arr[..., :3].sum(-1))]
        arr[:16, :16, :3] = light
        Image.fromarray(arr, "RGBA").save(lit)
        from .pipeline import qa as rerun

        r = rerun("selftest", tmp / "work-neg1", neg)
        assert any(c["check"] == "grass.lowFrequency" and not c["pass"] for c in r["checks"]), "lit tile not caught"
        print("[selftest] lit swatch evened by the tool; hand-lit tile -> lowFrequency fails")

        # negative 2: a hand-edited mask tile breaks continuity and body match
        mask_png = work / "tiles/freshwater_shore_mask_3.png"
        arr = np.asarray(Image.open(mask_png).convert("RGBA")).copy()
        arr[:, -3:, 3] = 0
        arr[10:20, 10:20, :3] = [255, 0, 255]
        Image.fromarray(arr, "RGBA").save(mask_png)
        from .pipeline import qa

        r = qa("selftest", work, RECIPE)
        bad = {c["check"] for c in r["checks"] if not c["pass"]}
        assert {"freshwater_shore.palette", "freshwater_shore.bodyMatch"} <= bad, bad
        print("[selftest] negative: edited mask -> palette and bodyMatch fail")

        # negative 3: bad ramp name and too many values are refused with a clear message
        bad_recipe = json.loads(json.dumps(RECIPE))
        bad_recipe["materials"][0]["values"] = ["charcoal.mid", "foliage.mid"]
        try:
            _run_set(folder, tmp / "work-neg3", bad_recipe)
            raise AssertionError("unknown ramp accepted")
        except TileError as e:
            assert "unknown ramp 'charcoal'" in str(e), e
        bad_recipe["materials"][0]["values"] = ["foliage.deep", "foliage.shadow", "foliage.mid", "foliage.light", "foliage.highlight"]
        try:
            _run_set(folder, tmp / "work-neg3", bad_recipe)
            raise AssertionError("five values accepted")
        except TileError as e:
            assert "schema" in str(e), e
        print("[selftest] negative: unknown ramp and 5 values refused")
        print("[selftest] PASS")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
