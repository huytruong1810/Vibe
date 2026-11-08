"""C9b item render/QA transaction. Candidate artifacts never activate gameplay."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import shutil
import tempfile
import time
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from . import core, pixelize
from .color import all_palette_rgb
from .core import ForgeError
from .items import canonical, file_sha, item_pose_plan


def pose_key(pose: dict) -> tuple[str, str]:
    return (f"held_{pose['gripBucket']}" if pose["view"] == "held" else "icon", pose["facing"])


def bake_parameters(plan: dict, rs: dict) -> dict:
    """Reuse the body's calibrated camera and pass writer; replace only mesh poses."""
    first = plan["poses"][0]["canvas"]
    clips = []
    for bucket in range(8):
        clips.append({"name": f"held_{bucket}", "frames": [1], "facings": rs["facings"]["order"],
                      "canvas": first})
    icon = next(p for p in plan["poses"] if p["view"] == "icon")
    clips.append({"name": "icon", "frames": [1], "facings": [icon["facing"]], "canvas": icon["canvas"]})
    return {"canvas": first["size"], "anchor": first["anchor"],
            "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"],
            "elevationDeg": rs["camera"]["elevationDeg"], "facings": rs["facings"]["zRotationDeg"],
            "clips": clips, "sockets": [], "itemSocket": plan["socket"],
            "itemPoses": {f"{clip}/{facing}": {**pose, "sourcePivot": plan["settings"]["grip" if pose["view"] == "held" else "iconPivot"]} for pose in plan["poses"]
                          for clip, facing in [pose_key(pose)]}}


def thin_features(mask: np.ndarray) -> int:
    """Count unsupported runs before outlines can hide sub-2px source features.

    A 2x2 opaque block supports its four pixels. Connected unsupported runs of two
    or more pixels fail. A single cap pixel attached to a supported component is
    allowed; an entirely unsupported island is not. This raster diagnostic cannot
    replace inspection of the model and moving/facing previews (ART-6.3).
    """
    mask = np.asarray(mask, dtype=bool)
    if mask.ndim != 2:
        raise ForgeError("Thin-feature QA requires a two-dimensional silhouette")
    supported = np.zeros_like(mask)
    blocks = mask[:-1, :-1] & mask[1:, :-1] & mask[:-1, 1:] & mask[1:, 1:]
    for dy, dx in ((0, 0), (1, 0), (0, 1), (1, 1)):
        supported[dy:dy + blocks.shape[0], dx:dx + blocks.shape[1]] |= blocks
    labels, count = ndimage.label(mask & ~supported, structure=np.ones((3, 3), dtype=bool))
    sizes = np.bincount(labels.ravel(), minlength=count + 1)
    bad = int(sum(sizes[1:] >= 2))
    bodies, body_count = ndimage.label(mask, structure=np.ones((3, 3), dtype=bool))
    body_for_run = np.zeros(count + 1, dtype=np.int32)
    body_for_run[labels.ravel()] = bodies.ravel()
    has_core = np.zeros(body_count + 1, dtype=bool)
    has_core[bodies[supported]] = True
    bad += int(np.sum((sizes[1:] == 1) & ~has_core[body_for_run[1:]]))
    return bad


def inspect_items(plan: dict, folder: Path, rs: dict) -> tuple[list, list]:
    tracks = json.loads((folder / "bake/tracks.json").read_text())
    frames, errors = [], {k: [] for k in ("canvas", "root", "margins", "thinFeature", "palette", "blocks")}
    colors = set()
    palette = all_palette_rgb()
    for pose in plan["poses"]:
        clip, facing = pose_key(pose)
        native_path = folder / "pix" / clip / f"{facing}_0.png"
        export_path = folder / "pix/export" / clip / f"{facing}_0.png"
        raw_path = folder / "bake" / clip / f"{facing}_0_albedo.png"
        with Image.open(native_path) as image:
            native = np.array(image.convert("RGBA"))
        with Image.open(export_path) as image:
            export = np.array(image.convert("RGBA"))
        with Image.open(raw_path) as image:
            raw = np.array(image.convert("RGBA"))
        w, h = pose["canvas"]["size"]
        if native.shape != (h, w, 4) or export.shape != (h * 2, w * 2, 4) or raw.shape != (h, w, 4):
            errors["canvas"].append(pose["id"])
        if not np.array_equal(export, native.repeat(2, 0).repeat(2, 1)):
            errors["blocks"].append(pose["id"])
        alpha = native[..., 3] > 0
        ys, xs = np.nonzero(alpha)
        margin = min(xs.min(), ys.min(), w - 1 - xs.max(), h - 1 - ys.max()) if len(xs) else -1
        if margin < rs["marginsArtPixels"]["min"]:
            errors["margins"].append(pose["id"])
        raw_alpha = raw[..., 3] > 127
        if not raw_alpha.any() or thin_features(raw_alpha):
            errors["thinFeature"].append(pose["id"])
        points = tracks["clips"][clip][facing][0]
        anchor = pose["canvas"]["anchor"]
        if (len(points["root"]) != 2 or any(type(v) not in (int, float) or not math.isfinite(v)
                or abs(v - expected) > rs["qa"]["anchorDriftMaxPx"] + 0.01
                for v, expected in zip(points["root"], anchor))):
            errors["root"].append(pose["id"])
        if pose["view"] == "held" and points.get(plan["socket"]) != points["root"]:
            errors["root"].append(pose["id"] + ": missing hand registration")
        sockets = {}
        if pose["view"] == "held":
            sockets[plan["socket"]] = {"x": anchor[0] * 2, "y": anchor[1] * 2}
            if "supportGrip" in pose:
                support = points.get("SupportGrip")
                if (not isinstance(support, list) or len(support) != 2
                        or any(type(v) not in (int, float) or not math.isfinite(v)
                               or v < 0 or v > size for v, size in zip(support, (w, h)))):
                    errors["root"].append(pose["id"] + ": invalid support grip")
                else:
                    sockets["SupportGrip"] = {"x": round(support[0]) * 2, "y": round(support[1]) * 2}
        colors.update(tuple(v) for v in native[alpha, :3])
        if any(tuple(v) not in palette for v in native[alpha, :3]):
            errors["palette"].append(pose["id"])
        frames.append({"id": pose["id"], "file": export_path.relative_to(folder).as_posix(),
                       "sha256": file_sha(export_path), "view": pose["view"], "facing": facing,
                       "gripBucket": pose["gripBucket"], "gripDegrees": pose["gripDegrees"],
                       "sourceSize": {"w": w * 2, "h": h * 2},
                       "anchorPx": {"x": anchor[0] * 2, "y": anchor[1] * 2},
                       "sockets": sockets,
                       "socket": plan["socket"] if pose["view"] == "held" else None})
    rules = {"canvas": "render_spec item canvases", "root": "L2/contract registration",
             "margins": "render_spec marginsArtPixels", "thinFeature": "ART-6.3",
             "palette": "ART-4.1", "blocks": "L1"}
    checks = [{"check": key, "rule": rules[key],
               "hard": True, "pass": not bad, "detail": f"{len(bad)} failing poses; " + "; ".join(bad[:8])}
              for key, bad in errors.items()]
    limit = core.spec("palette")["rules"]["maxColorsActor"]
    checks.append({"check": "colorCount", "rule": "ART-4.4", "hard": True,
                   "pass": len(colors) <= limit, "detail": f"{len(colors)} colors (limit {limit})"})
    return frames, checks


def _atomic_json(path: Path, value: dict) -> None:
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".items-")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(canonical(value))
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def _validate_bundle(folder: Path, digest: str) -> dict:
    review = json.loads((folder / "item-review.json").read_text())
    if review["inputsDigest"] != digest:
        raise ForgeError("Item render input digest changed")
    for row in review["files"]:
        path = (folder / row["path"]).resolve()
        if not path.is_relative_to(folder.resolve()) or file_sha(path) != row["sha256"]:
            raise ForgeError("Immutable item render bundle has changed")
    payload = {k: v for k, v in review.items() if k != "sourceDigest"}
    if hashlib.sha256(canonical(payload)).hexdigest() != review["sourceDigest"]:
        raise ForgeError("Item review metadata changed")
    return review


def render_items(repo: Path, wd: Path, asset: str, config: dict, ramps: dict, rs: dict,
                 blender_version: str, baker=None, detail_slots: list[str] | None = None) -> Path:
    """Install an immutable candidate generation, then atomically update items.json."""
    if not re.fullmatch(r"4\.2\.\d+", blender_version):
        raise ForgeError("Items need the pinned Blender 4.2.x")
    if rs["pixelScale"]["exportScale"] != 2:
        raise ForgeError("Item exports require the doctrine exact 2x scale")
    pixelize.RampSet(ramps)  # validate material names before any render/output write
    detail_slots = [] if detail_slots is None else detail_slots
    if (not isinstance(detail_slots, list) or any(not isinstance(s, str) or s not in ramps for s in detail_slots)
            or len(set(detail_slots)) != len(detail_slots)):
        raise ForgeError("Item detail slots must uniquely name declared material slots")
    tools = [Path(__file__), core.FORGE / "forgelib/items.py", core.BLENDER_SCRIPTS / "bake.py",
             core.FORGE / "forgelib/pixelize.py", core.FORGE / "forgelib/core.py",
             core.FORGE / "forgelib/color.py", core.SPEC_DIR / "palette.json", core.FORGE / "uv.lock"]
    def inputs():
        plan = item_pose_plan(repo, asset, config, rs)
        payload = {"plan": plan, "ramps": ramps, "blender": blender_version, "renderSpec": rs, "detailSlots": detail_slots,
                   "tools": [{"path": p.relative_to(core.FORGE).as_posix(), "sha256": file_sha(p)} for p in tools]}
        return plan, hashlib.sha256(canonical(payload)).hexdigest()
    plan, digest = inputs()
    wd.mkdir(parents=True, exist_ok=True)
    destination = wd / "item-renders" / digest
    previous = None
    if destination.exists():
        review = _validate_bundle(destination, digest)
        pointer = wd / "items.json"
        if pointer.exists():
            previous = json.loads(pointer.read_text())
            key = (destination / "item-review.json").relative_to(repo).as_posix()
            if previous.get("inputsDigest") == digest and previous.get("outputs", {}).get(key) != file_sha(destination / "item-review.json"):
                raise ForgeError("Item review differs from its committed stage pointer")
    else:
        with tempfile.TemporaryDirectory(dir=wd, prefix="items-build-") as temporary:
            folder = Path(temporary) / "generation"
            folder.mkdir()
            (folder / "plan.json").write_bytes(canonical(plan))
            params = folder / "bake-params.json"
            params.write_bytes(canonical(bake_parameters(plan, rs)))
            model = repo / "art/source" / plan["source"]["path"]
            snapshot = folder / "source.blend"
            shutil.copyfile(model, snapshot)
            if file_sha(snapshot) != plan["source"]["sha256"]:
                raise ForgeError("Item model changed while snapshotting; previous pointer retained")
            bake_dir = folder / "bake"
            bake_dir.mkdir()
            (baker or core.run_blender)("bake.py", [str(snapshot),
                       str(bake_dir), str(params)], wd / "logs" / f"items-{digest[:12]}.log", timeout=1800)
            pixelize.run_dir(bake_dir, folder / "pix", ramps, detail_slots)
            frames, checks = inspect_items(plan, folder, rs)
            cell_w = max(f["sourceSize"]["w"] for f in frames)
            cell_h = max(f["sourceSize"]["h"] for f in frames)
            sheet = Image.new("RGBA", (8 * cell_w, 9 * cell_h), (28, 34, 50, 255))
            for frame in frames:
                # Eight bucket rows; columns follow the spec's facing order.
                row = frame["gripBucket"] if frame["view"] == "held" else 8
                col = rs["facings"]["order"].index(frame["facing"]) if frame["view"] == "held" else 0
                with Image.open(folder / frame["file"]) as image:
                    sheet.alpha_composite(image.convert("RGBA"), (col * cell_w, row * cell_h))
            sheet.save(folder / "contact.png")
            (folder / "qa_report.json").write_bytes(canonical({"asset": asset, "frames": len(frames),
                "status": "candidate" if all(c["pass"] for c in checks) else "draft", "checks": checks}))
            files = [{"path": p.relative_to(folder).as_posix(), "sha256": file_sha(p)}
                     for p in sorted(folder.rglob("*")) if p.is_file()]
            review = {"schemaVersion": 1, "kind": "item-review", "asset": asset, "inputsDigest": digest,
                      "status": "candidate" if all(c["pass"] for c in checks) else "draft",
                      "scope": ["held-item", "icon"], "frames": frames, "qa": checks, "files": files}
            review["sourceDigest"] = hashlib.sha256(canonical(review)).hexdigest()
            (folder / "item-review.json").write_bytes(canonical(review))
            if inputs()[1] != digest:
                raise ForgeError("Item inputs changed while rendering; previous pointer retained")
            destination.parent.mkdir(parents=True, exist_ok=True)
            os.replace(folder, destination)
    if inputs()[1] != digest:
        raise ForgeError("Item inputs changed before commit; previous pointer retained")
    if previous and previous.get("inputsDigest") == digest:
        return destination  # preserve its timestamp/bytes on a verified cache hit
    record = {"stage": "items", "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "inputsDigest": digest, "outputs": {(destination / "item-review.json").relative_to(repo).as_posix(): file_sha(destination / "item-review.json")},
              "extra": {"status": review["status"], "directory": destination.relative_to(repo).as_posix(),
                        "sourceDigest": review["sourceDigest"], "frames": len(review["frames"])}}
    _atomic_json(wd / "items.json", record)
    return destination
