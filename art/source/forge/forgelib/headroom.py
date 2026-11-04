"""heightArtPx headroom per canvas (C26 open item 3).

  forge.py headroom                 the spec table: per canvas, the room above and below the anchor and to each side
  forge.py headroom --asset ID      measured: how far the asset's pixelized frames reach from the anchor, per clip, and
                                    the largest heightArtPx that keeps the 2 px margin (marginsArtPixels.min) on every side

Measured headroom scales the whole sprite: every extent grows with heightArtPx, so the limit is the tightest side
(rows or columns from the anchor to the last opaque pixel, against the room the canvas gives on that side). Features and the outline are inside the
measured frames, so nothing is added on top. A recipe may raise heightArtPx up to `maxHeightArtPx`; above it the
contract margin fails (QA `margins`) or the canvas needs to grow (spec change, DOC-5).
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

from .core import ForgeError, asset_kind, canvas_for, load_recipe, spec, work_dir
from .qa import _frames, clip_canvases

SIDES = ("up", "down", "left", "right")


def room(canvas: dict, margin: int) -> dict:
    """Pixels from the anchor to the last row/column that keeps the margin."""
    (W, H), (ax, ay) = canvas["size"], canvas["anchor"]
    return {"up": ay - margin, "down": H - 1 - ay - margin, "left": ax - margin, "right": W - 1 - ax - margin}


def extents(frames: list[np.ndarray], canvas: dict) -> dict:
    """Largest reach of any opaque pixel from the anchor on each side (0 when it never crosses)."""
    ax, ay = canvas["anchor"]
    out = {s: 0 for s in SIDES}
    for im in frames:
        ys, xs = np.nonzero(im[..., 3])
        if not len(ys):
            continue
        out["up"] = max(out["up"], ay - int(ys.min()))
        out["down"] = max(out["down"], int(ys.max()) - ay)
        out["left"] = max(out["left"], ax - int(xs.min()))
        out["right"] = max(out["right"], int(xs.max()) - ax)
    return out


def limit(ext: dict, rm: dict, height: int) -> dict:
    """The largest heightArtPx that fits, and the side that sets it."""
    ratios = {s: rm[s] / ext[s] for s in SIDES if ext[s] > 0}
    side = min(ratios, key=ratios.get)
    return {"maxHeightArtPx": math.floor(height * ratios[side]), "tightSide": side, "scale": round(ratios[side], 3)}


def spec_table() -> list[dict]:
    rs = spec("render_spec")
    m = rs["marginsArtPixels"]["min"]
    return [{"canvas": k, "size": v["size"], "anchor": v["anchor"], **room(v, m)}
            for k, v in rs["canvases"].items() if "size" in v]


def measure(asset: str) -> dict:
    rs = spec("render_spec")
    m = rs["marginsArtPixels"]["min"]
    pix = work_dir(asset) / "pix"
    if not pix.is_dir():
        raise ForgeError(f"No pixelized frames for {asset}; run the pixelize stage first")
    recipe = load_recipe(asset)
    height = recipe.get("heightArtPx")
    if not isinstance(height, int):
        raise ForgeError(f"{asset} has no heightArtPx (headroom applies to creatures and humans)")
    _, base = canvas_for(asset)
    cvs = clip_canvases(work_dir(asset) / "bake", {"size": base["size"], "anchor": base["anchor"]})
    per_clip, worst = {}, None
    for clip, facings in _frames(pix).items():
        cv = cvs.get(clip, cvs["_default"])
        ims = [np.array(Image.open(p)) for ps in facings.values() for p in ps]
        ext, rm = extents(ims, cv), room(cv, m)
        lim = limit(ext, rm, height)
        per_clip[clip] = {"canvas": cv["size"], "extent": ext, "room": rm, **lim}
        if worst is None or lim["scale"] < per_clip[worst]["scale"]:
            worst = clip
    return {"asset": asset, "heightArtPx": height, "limitingClip": worst, **{k: per_clip[worst][k] for k in ("maxHeightArtPx", "tightSide", "scale")},
            "clips": per_clip}


def report(asset: str | None) -> str:
    if not asset:
        rows = spec_table()
        w = max(len(r["canvas"]) for r in rows)
        return "room from the anchor to the 2 px margin, in art pixels:\n" + "\n".join(
            f"  {r['canvas']:<{w}}  canvas {r['size'][0]}x{r['size'][1]} anchor {r['anchor']}  up {r['up']}  down {r['down']}  left {r['left']}  right {r['right']}"
            for r in rows)
    r = measure(asset)
    lines = [f"{asset}: heightArtPx {r['heightArtPx']}, can grow to {r['maxHeightArtPx']} (x{r['scale']}, "
             f"{r['tightSide']} side of clip {r['limitingClip']}) before the 2 px margin fails"]
    for clip, c in sorted(r["clips"].items(), key=lambda kv: kv[1]["scale"]):
        e, rm = c["extent"], c["room"]
        lines.append(f"  {clip:<14} x{c['scale']:<6} max {c['maxHeightArtPx']:<3} tight {c['tightSide']:<5} "
                     + " ".join(f"{s} {e[s]}/{rm[s]}" for s in SIDES))
    return "\n".join(lines)
