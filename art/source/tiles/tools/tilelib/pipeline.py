"""build and qa stages for a tile set."""

from __future__ import annotations

import json

import numpy as np
from PIL import Image

from .core import (N4, SETS, SPEC_DIR, WORK, TileError, colour, oklab_l, read, ref_l, rel, sha,
                   shift, spec, write)
from .dualgrid import INSIDE_CLASS, MATERIAL_CLASS, build_overlay
from .material import build_material, edge_distance, rgba


def set_dir(name: str):
    d = SETS / name
    if not (d / "set.json").exists():
        raise TileError(f"no recipe at {rel(d / 'set.json')}; run: tileforge.py new {name}")
    return d


def load_recipe(name: str, folder=None) -> dict:
    import jsonschema

    folder = folder or set_dir(name)
    recipe = read(folder / "set.json")
    schema = read(SPEC_DIR / "tileset.schema.json")
    errors = sorted(jsonschema.Draft202012Validator(schema).iter_errors(recipe), key=lambda e: list(e.path))
    if errors:
        lines = [f"  {'/'.join(map(str, e.path)) or '(root)'}: {e.message}" for e in errors[:12]]
        raise TileError("set.json does not match art/source/tiles/spec/tileset.schema.json:\n" + "\n".join(lines))
    ids = [m["id"] for m in recipe["materials"]] + [o["id"] for o in recipe.get("overlays", [])]
    if len(ids) != len(set(ids)):
        raise TileError(f"material and overlay ids must be unique: {ids}")
    for m in recipe["materials"]:
        if m.get("wrap") == "x" and "heightPx" not in m:
            raise TileError(f"material {m['id']}: a strip (wrap x) needs heightPx (8 per elevation step)")
        if m.get("rows") and m.get("wrap") != "x":
            raise TileError(f"material {m['id']}: rows are for strips (wrap x) only")
    return recipe


def build(name: str, folder=None, work=None) -> dict:
    """Synthesise every tile into work/<set>/tiles at 1x art pixels and record build.json."""
    folder = folder or set_dir(name)
    work = work or WORK / name
    recipe = load_recipe(name, folder)
    n = spec()["tilePx"]
    out = work / "tiles"
    if out.exists():
        for p in out.glob("*.png"):
            p.unlink()
    out.mkdir(parents=True, exist_ok=True)
    materials, records = {}, []

    def save(arr, fname, **meta):
        path = out / fname
        Image.fromarray(arr, "RGBA").save(path, optimize=True)
        records.append({"file": f"tiles/{fname}", "sha256": sha(path.read_bytes()), **meta})

    for m in recipe["materials"]:
        mat = build_material(m, folder, n)
        materials[m["id"]] = mat
        rid = mat["runtimeId"]
        save(rgba(mat["base"], mat["colours"]), f"{m['id']}.png", role=mat["kind"], material=m["id"],
             variant=0, runtimeId=rid, refs=mat["refs"])
        for k, v in enumerate(mat["variants"], 1):
            save(rgba(v, mat["colours"]), f"{m['id']}_v{k}.png", role=mat["kind"], material=m["id"],
                 variant=k, runtimeId=f"{rid}_v{k}" if rid else None, refs=mat["refs"])
    overlays = {}
    for o in recipe.get("overlays", []):
        ov = build_overlay(o, materials, n)
        overlays[o["id"]] = ov
        for t in ov["tiles"]:
            if t["mask"] == 0 and not ov["under"]:
                continue
            save(t["rgba"], f"{o['id']}_mask_{t['mask']}.png", role="overlay", overlay=o["id"],
                 material=ov["material"], mask=t["mask"], runtimeId=t["runtimeId"], refs=ov["refs"])
            np.save(work / f"classes_{o['id']}_{t['mask']}.npy", t["classes"])
    np.savez_compressed(work / "materials.npz", **{
        f"{mid}__{i}": idx for mid, mat in materials.items()
        for i, idx in enumerate([mat["base"], *mat["variants"]])})
    record = {
        "schemaVersion": 1,
        "set": recipe["set"],
        "region": recipe["region"],
        "recipeDigest": sha((folder / "set.json").read_bytes()),
        "swatchDigests": {m["swatch"]: sha((folder / m["swatch"]).read_bytes()) for m in recipe["materials"]},
        "tilePx": n,
        "materials": {mid: {k: mat[k] for k in ("kind", "runtimeId", "refs", "proportions", "windows", "wrap", "notes")}
                      for mid, mat in materials.items()},
        "overlays": {oid: {k: ov[k] for k in ("material", "under", "refs", "bodyRefs", "bandRefs")}
                     for oid, ov in overlays.items()},
        "tiles": records,
    }
    write(work / "build.json", record)
    return record


# ------------------------------------------------------------------ QA
def _load(work, f):
    with Image.open(work / f) as im:
        return np.asarray(im.convert("RGBA"))


def _lum(arr):
    return oklab_l(arr[..., :3] / 255.0)


def _idx(arr, colours):
    pal = np.array(colours, np.int32)
    flat = arr[..., :3].reshape(-1, 3).astype(np.int32)
    eq = (flat[:, None, :] == pal[None, :, :]).all(-1)
    found = eq.any(1)
    idx = np.where(found, eq.argmax(1), -1).reshape(arr.shape[:2])
    return idx


def _line_steps(a, b):
    return float(np.abs(a - b).mean())


def seam_ratio(L, wrap_x, wrap_y, right=None):
    """Wrap-seam step divided by the tile's roughest interior line step (1.0 = the seam looks
    like any other line in the tile). right: a second tile to place to the right instead."""
    ratios = []
    if wrap_x:
        interior = max(_line_steps(L[:, i], L[:, i + 1]) for i in range(L.shape[1] - 1))
        nxt = L if right is None else right
        ratios.append(_line_steps(L[:, -1], nxt[:, 0]) / max(interior, 1e-6))
    if wrap_y and right is None:
        interior = max(_line_steps(L[i], L[i + 1]) for i in range(L.shape[0] - 1))
        ratios.append(_line_steps(L[-1], L[0]) / max(interior, 1e-6))
    return max(ratios) if ratios else 0.0


def low_frequency(L):
    """Amplitude of the lowest tile-period lighting waves: what reads as a grid when tiled."""
    h, w = L.shape
    F = np.fft.fft2(L - L.mean())
    return float(max(abs(F[i, j]) for i, j in ((0, 1), (1, 0), (1, 1), (1, -1))) * 2 / (h * w))


def _adjacent(cat_a, cat_b, axis):
    """Disagreement across the shared edge vs the same tiles' own neighbouring lines."""
    if axis == 1:
        seam = int((cat_a[:, -1] != cat_b[:, 0]).sum())
        near = [int((c[:, i] != c[:, i + 1]).sum()) for c in (cat_a, cat_b) for i in range(c.shape[1] - 1)]
    else:
        seam = int((cat_a[-1] != cat_b[0]).sum())
        near = [int((c[i] != c[i + 1]).sum()) for c in (cat_a, cat_b) for i in range(c.shape[0] - 1)]
    return seam - max(near)


def qa(name: str, work=None, recipe=None) -> dict:
    work = work or WORK / name
    if not (work / "build.json").exists():
        raise TileError(f"nothing built for {name}; run: tileforge.py build --set {name}")
    b = json.loads((work / "build.json").read_text())
    q = spec()["qa"]
    checks = []

    def check(cid, rule, ok, hard, detail):
        checks.append({"check": cid, "rule": rule, "pass": bool(ok), "hard": hard, "detail": detail})

    by_mat = {}
    for t in b["tiles"]:
        by_mat.setdefault(t.get("overlay") or t["material"], []).append(t)
    ground_l = {}
    for mid, mat in b["materials"].items():
        tiles = [t for t in by_mat[mid]]
        colours = [colour(r) for r in mat["refs"]]
        wrap_x, wrap_y = True, mat["wrap"] == "xy"
        arrs = [_load(work, t["file"]) for t in sorted(tiles, key=lambda t: t["variant"])]
        idxs = [_idx(a, colours) for a in arrs]
        bad = sum(int((i < 0).sum()) for i in idxs)
        check(f"{mid}.palette", "ART-11.2", bad == 0, True, f"{bad} pixels outside {mat['refs']}")
        used = sorted({int(v) for i in idxs for v in np.unique(i) if v >= 0})
        check(f"{mid}.valueCount", "ART-11.2", len(used) <= spec()["maxValuesPerMaterial"], True,
              f"{len(used)} values (limit {spec()['maxValuesPerMaterial']})")
        Ls = [_lum(a) for a in arrs]
        worst = max(seam_ratio(L, wrap_x, wrap_y) for L in Ls)
        # every variant beside every other: seams across mixed pairs
        for La in Ls:
            for Lb in Ls:
                worst = max(worst, seam_ratio(La, True, False, right=Lb))
        check(f"{mid}.seamless", "ART-11.2", worst <= q["seamRatioMax"], True,
              f"worst seam step / roughest interior line {worst:.2f} (limit {q['seamRatioMax']}; every variant beside every other)")
        h, w = idxs[0].shape
        lock = edge_distance(h, w, wrap_x, wrap_y) < q["variantBorderPx"]
        diff = sum(int((i[lock] != idxs[0][lock]).sum()) for i in idxs[1:])
        check(f"{mid}.variantBorders", "ART-11.2", diff == 0, True,
              f"{len(idxs) - 1} variants; {diff} border pixels differ from the base")
        orphans = 0
        for i in idxs:
            same = sum((shift(i, dy, dx, wrap_x, wrap_y) == i) for dy, dx in N4)
            orphans = max(orphans, float((same == 0).mean()))
        check(f"{mid}.orphans", "ART-11.2", orphans <= q["orphanFractionMax"], True,
              f"worst isolated-pixel fraction {orphans:.3f} (limit {q['orphanFractionMax']})")
        if mat["kind"] == "material":
            amp = max(low_frequency(L) for L in Ls)
            check(f"{mid}.lowFrequency", "ART-11.2", amp <= q["lowFrequencyMax"], True,
                  f"largest tile-scale lighting wave {amp:.3f} (limit {q['lowFrequencyMax']}); a higher value shows "
                  "as a grid when tiled; raise flatten or use an evenly lit swatch")
            frac = np.bincount(idxs[0].ravel()[idxs[0].ravel() >= 0], minlength=len(colours))[: len(mat["proportions"])]
            frac = frac / frac.sum()
            dev = float(np.max(np.abs(frac - np.array(mat["proportions"]))))
            check(f"{mid}.proportions", "recipe", dev <= q["proportionTolerance"], False,
                  f"value shares {np.round(frac, 2).tolist()} vs recipe {np.round(mat['proportions'], 2).tolist()}")
            ground_l[mid] = float(np.median(Ls[0]))
    recipe = recipe or {}
    ground_ids = {m["id"] for m in recipe.get("materials", []) if (m.get("binds") or {}).get("layer") == "ground"}
    actor_refs = spec()["actorReferenceRamps"]
    for mid in sorted(ground_ids & set(ground_l)):
        deltas = {r: round(abs(ground_l[mid] - ref_l(r)), 3) for r in actor_refs}
        low = {r: d for r, d in deltas.items() if d < q["actorContrastMin"]}
        check(f"{mid}.actorContrast", "ART-7.3", not low, False,
              f"lightness gap to actor body tones {deltas}; below {q['actorContrastMin']}: {sorted(low) or 'none'}")
    for pa, pb in recipe.get("pairs", []):
        if pa in ground_l and pb in ground_l:
            d = abs(ground_l[pa] - ground_l[pb])
            check(f"pair.{pa}-{pb}", "WLD-3.3", d >= q["pairContrastMin"], False,
                  f"median lightness gap {d:.3f} (want >= {q['pairContrastMin']})")

    bits = spec()["dualGrid"]["bits"]
    for oid, ov in b["overlays"].items():
        colours = [colour(r) for r in ov["refs"]]
        tiles = {t["mask"]: t for t in by_mat[oid]}
        arr = {m: _load(work, t["file"]) for m, t in tiles.items()}
        cls = {m: np.load(work / f"classes_{oid}_{m}.npy") for m in tiles}
        bad = sum(int(((_idx(a, colours) < 0) & (a[..., 3] > 0)).sum()) for a in arr.values())
        check(f"{oid}.palette", "ART-11.2", bad == 0, True, f"{bad} opaque pixels outside {ov['refs']}")
        semi = sum(int(((a[..., 3] > 0) & (a[..., 3] < 255)).sum()) for a in arr.values())
        check(f"{oid}.hardAlpha", "ART-1", semi == 0, True, f"{semi} semi-transparent pixels")
        mat_arr = _load(work, f"tiles/{ov['material']}.png")
        mism = 0
        for m, c in cls.items():
            body = c == MATERIAL_CLASS
            mism += int((arr[m][body][:, :3] != mat_arr[body][:, :3]).any(-1).sum())
        check(f"{oid}.bodyMatch", "ART-11.2", mism == 0, True,
              f"{mism} body pixels differ from {ov['material']}.png (the full tile must match the body)")
        corner_bad = []
        for m, c in cls.items():
            for name, bit in bits.items():
                yy = 0 if name[0] == "N" else c.shape[0] - 1
                xx = 0 if name[1] == "W" else c.shape[1] - 1
                inside = c[yy, xx] >= INSIDE_CLASS
                if inside != bool(m & bit):
                    corner_bad.append(f"{m}:{name}")
        check(f"{oid}.cornerBits", "autotiler.ts", not corner_bad, True,
              f"corners disagreeing with their mask bit: {corner_bad[:8] or 'none'}")
        worst, where = -99, None
        cat = {m: np.select([c == 0, c >= INSIDE_CLASS], [0, 2], 1) for m, c in cls.items()}
        cat.setdefault(0, np.zeros_like(next(iter(cat.values()))))
        for a in cat:
            for bm in cat:
                if (a >> 1 & 1) == (bm & 1) and (a >> 3 & 1) == (bm >> 2 & 1):  # a.NE=b.NW, a.SE=b.SW
                    excess = _adjacent(cat[a], cat[bm], 1)
                    if excess > worst:
                        worst, where = excess, f"{a}|{bm}"
                if (a >> 2 & 1) == (bm & 1) and (a >> 3 & 1) == (bm >> 1 & 1):  # a.SW=b.NW, a.SE=b.NE
                    excess = _adjacent(cat[a], cat[bm], 0)
                    if excess > worst:
                        worst, where = excess, f"{a}/{bm}"
        limit = q["edgeContinuityRowsMax"]
        check(f"{oid}.edgeContinuity", "ART-11.2", worst <= limit, True,
              f"worst shared-edge excess {worst} px at {where} over the tiles' own neighbouring lines "
              f"(limit {limit}; every legal neighbour pair, transparent/edge band/inside compared)")
    hard_fail = [c["check"] for c in checks if c["hard"] and not c["pass"]]
    report = {"schemaVersion": 1, "set": b["set"], "status": "draft" if hard_fail else "candidate",
              "buildDigest": sha((work / "build.json").read_bytes()), "checks": checks}
    write(work / "qa_report.json", report)
    return report
