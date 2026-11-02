"""C10 environment kind: buildings, large props and trees (ART-2.3, ART-11, AMB-3.2).

One static south view per layer. The base and its roof/canopy share one canvas and anchor
(the footprint's south-edge centre), so the engine stacks them exactly and draws actors
between them. The depth stretch (1/sin 30 deg on world Y) is a mesh transform passed to
bake.py's explicit pose path. Approval binds every layer PNG and the QA through
review.json's sourceDigest, as for bodies and items.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

from . import pixelize
from .color import ramp
from .core import ForgeError
from .items import canonical

SHADOW_RAMP, SHADOW_STEP, SHADOW_ALPHA = "outline-neutral", "deep", 96
RECIPE_FIELDS = {"footprint", "split", "lightPools", "contactShadow"}


def validate(recipe: dict) -> dict:
    env = recipe.get("environment")
    if not isinstance(env, dict) or set(env) - RECIPE_FIELDS or "footprint" not in env:
        raise ForgeError(f"Environment recipe needs environment: {{footprint: [w, d] tiles, split?, lightPools?, contactShadow?}} "
                         f"(fields {sorted(RECIPE_FIELDS)})")
    fp = env["footprint"]
    if not (isinstance(fp, list) and len(fp) == 2 and all(type(v) is int and 1 <= v <= 16 for v in fp)):
        raise ForgeError("footprint is [width, depth] in whole tiles, 1..16")
    split = env.get("split")
    if split is not None and not (isinstance(split, dict) and split.get("layer") in ("roof", "canopy")
                                  and type(split.get("aboveFraction")) in (int, float) and 0.2 <= split["aboveFraction"] <= 0.9):
        raise ForgeError("split is {layer: roof|canopy, aboveFraction: 0.2..0.9} (ART-11.1)")
    for pool in env.get("lightPools", []):
        if not (isinstance(pool, dict) and set(pool) == {"x", "y", "radiusTiles"}
                and all(type(pool[k]) in (int, float) for k in pool) and 0 < pool["radiusTiles"] <= 8):
            raise ForgeError("lightPools entries are {x, y, radiusTiles} in art px from the anchor (AMB-3.2)")
    return env


def bake_parameters(layout: dict, rs: dict, layer: str) -> dict:
    """Static south render; the explicit pose matrix carries the ART-2.3 depth stretch."""
    k = rs["camera"]["environmentDepthStretch"]
    root = layout["rootPivot"]
    canvas = layout["canvas"]
    pose = {"view": "environment", "rotation": [[1, 0, 0], [0, k, 0], [0, 0, 1]],
            "translation": [0.0, -k * root[1], 0.0], "sourcePivot": root}
    return {"canvas": canvas["size"], "anchor": canvas["anchor"], "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"],
            "elevationDeg": rs["camera"]["elevationDeg"], "facings": {"s": rs["facings"]["zRotationDeg"]["s"]},
            "clips": [{"name": layer, "frames": [1], "facings": ["s"], "canvas": canvas}],
            "sockets": [], "itemSocket": "none", "itemPoses": {f"{layer}/s": pose}}


def contact_shadow(layout: dict, rs: dict) -> np.ndarray:
    """ART-3.4: a short contact shadow under the footprint, one palette colour at fixed alpha."""
    (w, h), (ax, ay) = layout["canvas"]["size"], layout["canvas"]["anchor"]
    fw, fd = layout["footprint"]
    ppu = rs["camera"]["artPixelsPerWorldUnit"]
    k, e = rs["camera"]["environmentDepthStretch"], np.radians(rs["camera"]["elevationDeg"])
    rx, ry = fw * ppu / 2 + 1, fd * ppu * k * np.sin(e) / 2  # ground ellipse on screen
    cy = ay - ry
    yy, xx = np.mgrid[0:h, 0:w]
    inside = ((xx + 0.5 - ax) / rx) ** 2 + ((yy + 0.5 - cy) / max(ry, 1)) ** 2 <= 1
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[inside, :3] = ramp(SHADOW_RAMP)[SHADOW_STEP]
    out[inside, 3] = SHADOW_ALPHA
    return out


def qa(asset: str, pix: Path, layout: dict, rs: dict, palette: dict, layers: list[str]) -> dict:
    checks = []

    def check(name: str, rule: str, ok: bool, detail: str) -> None:
        checks.append({"check": name, "rule": rule, "hard": True, "pass": bool(ok), "detail": detail})

    allowed = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for r in palette["ramps"].values() for h in r["steps"].values()}
    colours, worst_margin, off, blocks = set(), 10 ** 6, 0, True
    (w, h) = layout["canvas"]["size"]
    for layer in layers:
        img = np.array(Image.open(pix / layer / "s_0.png").convert("RGBA"))
        exp = np.array(Image.open(pix / "export" / layer / "s_0.png").convert("RGBA"))
        if img.shape != (h, w, 4):
            raise ForgeError(f"Layer {layer} canvas {img.shape[1]}x{img.shape[0]} differs from layout {w}x{h}")
        blocks &= np.array_equal(exp, img.repeat(2, 0).repeat(2, 1))
        a = img[..., 3] > 0
        if not a.any():
            raise ForgeError(f"Layer {layer} rendered empty: check the split fraction")
        ys, xs = np.nonzero(a)
        worst_margin = min(worst_margin, xs.min(), ys.min(), w - 1 - xs.max(), h - 1 - ys.max())
        rgb = {tuple(v) for v in img[a, :3]}
        colours |= rgb
        off += len(rgb - allowed)
    fd, depth = layout["footprint"][1], layout["contactDepthTiles"]
    check("footprint", "ART-11.4", abs(depth - fd) <= 0.35,
          f"ground contact {depth:.2f} tiles deep vs declared {fd} (width is scaled to fit)")
    check("canvas", "render_spec canvases.environment", w % rs["canvases"]["environment"]["widthMultipleOf"] == 0,
          f"{w}x{h}, width multiple of {rs['canvases']['environment']['widthMultipleOf']}")
    check("margins", "render_spec marginsArtPixels", worst_margin >= rs["marginsArtPixels"]["min"],
          f"smallest transparent margin {worst_margin}px")
    check("paletteMembership", "ART-4.1", off == 0, f"{off} off-palette colours")
    check("colorCount", "ART-4.4", len(colours) <= 32, f"{len(colours)} colours (environment limit 32)")
    check("blocks", "L1", blocks, "exports are exact 2x blocks")
    return {"asset": asset, "status": "candidate" if all(c["pass"] for c in checks) else "draft", "checks": checks}


def contact_sheet(pix: Path, layers: list[str], out: Path, scale: int = 3) -> None:
    """Grey and grass backgrounds: composed sprite, then each layer alone."""
    images = [Image.open(pix / layer / "s_0.png").convert("RGBA") for layer in layers]
    w, h = images[0].size
    cells = []
    for bg in ((110, 114, 128, 255), (76, 140, 80, 255)):
        cell = Image.new("RGBA", (w, h), bg)
        for im in images:
            cell.alpha_composite(im)
        cells.append(cell)
    for im in images:
        cell = Image.new("RGBA", (w, h), (110, 114, 128, 255))
        cell.alpha_composite(im)
        cells.append(cell)
    sheet = Image.new("RGBA", (w * len(cells) + 4 * (len(cells) - 1), h), (30, 32, 40, 255))
    for i, cell in enumerate(cells):
        sheet.paste(cell, (i * (w + 4), 0))
    sheet.resize((sheet.width * scale, sheet.height * scale), Image.NEAREST).save(out)


def review(asset: str, pix: Path, layout: dict, report: dict, env: dict, layers: list[str]) -> dict:
    """Packet manifest; sourceDigest binds every layer file, the layout and QA (PRD-9)."""
    frames = []
    for layer in layers:
        p = pix / "export" / layer / "s_0.png"
        frames.append({"id": f"{asset.replace(':', '-')}-{layer}", "layer": layer, "file": f"frames/{layer}.png",
                       "sha256": hashlib.sha256(p.read_bytes()).hexdigest(),
                       "sourceSize": {"w": layout["canvas"]["size"][0] * 2, "h": layout["canvas"]["size"][1] * 2},
                       "anchorPx": {"x": layout["canvas"]["anchor"][0] * 2, "y": layout["canvas"]["anchor"][1] * 2}})
    body = {"schemaVersion": 1, "kind": "environment-review", "asset": asset, "status": report["status"],
            "scope": layers, "footprint": layout["footprint"], "lightPools": env.get("lightPools", []),
            "frames": frames, "qa": report["checks"]}
    body["sourceDigest"] = hashlib.sha256(canonical(body)).hexdigest()
    return body


def pixelize_layers(bake_root: Path, pix: Path, ramps: dict, shift: dict | None, layout: dict, rs: dict,
                    shadow: bool, detail: list | None) -> list[str]:
    layers = list(layout["layers"])
    for layer in layers:
        pixelize.run_dir(bake_root / layer, pix, ramps, detail, shift)
    if shadow:
        img = contact_shadow(layout, rs)
        (pix / "shadow").mkdir(parents=True, exist_ok=True)
        (pix / "export" / "shadow").mkdir(parents=True, exist_ok=True)
        Image.fromarray(img).save(pix / "shadow" / "s_0.png")
        Image.fromarray(pixelize.upscale2(img)).save(pix / "export" / "shadow" / "s_0.png")
        layers = ["shadow", *layers]
    return layers
