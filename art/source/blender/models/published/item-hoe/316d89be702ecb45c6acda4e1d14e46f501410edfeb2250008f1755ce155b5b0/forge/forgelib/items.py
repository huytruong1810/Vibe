"""C9b held-item pose planning. Reads existing meshes; never creates anatomy or art."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import tempfile
from pathlib import Path

from .core import ForgeError, sha256_file as file_sha


def canonical(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False) + "\n").encode()


def point(value: object, name: str) -> tuple[float, float, float]:
    if (not isinstance(value, list) or len(value) != 3
            or any(type(v) not in (int, float) or not math.isfinite(v) for v in value)):
        raise ForgeError(f"{name} needs three finite model-space coordinates")
    return tuple(float(v) for v in value)


def transform_point(pose: dict, value: tuple[float, float, float]) -> tuple[float, float, float]:
    """Model-to-pose transform. Held poses are rigid (scale one); only the inventory icon
    may carry a uniform `scale` so it fills its slot. Rotation rows stay orthonormal."""
    scale = pose.get("scale", 1.0)
    return tuple(round(scale * sum(row[i] * value[i] for i in range(3)) + offset, 12)
                 for row, offset in zip(pose["rotation"], pose["translation"]))


def _pose(identifier: str, facing: str, yaw: float, bucket: int, buckets: int,
          grip: tuple, support: tuple | None, canvas: dict, view: str, elevation: float,
          scale: float = 1.0) -> dict:
    # Canonical model: Z up, -Y forward. Turn to its authored facing, then rotate
    # around the fixed camera view axis. Buckets are clockwise SCREEN angles from
    # up, identical across facings. Rotating around model Y instead would change
    # bucket meaning with yaw. These are mesh transforms, never bitmap rotations.
    y, g, e = math.radians(yaw), math.tau * bucket / buckets, math.radians(elevation)
    cy, sy, cg, sg = math.cos(y), math.sin(y), math.cos(g), math.sin(g)
    axis = (0, math.cos(e), -math.sin(e))
    cross = ((0, -axis[2], axis[1]), (axis[2], 0, -axis[0]), (-axis[1], axis[0], 0))
    roll = [[cg * (i == j) + (1 - cg) * axis[i] * axis[j] + sg * cross[i][j]
             for j in range(3)] for i in range(3)]
    turn = ((cy, -sy, 0), (sy, cy, 0), (0, 0, 1))
    rotation = [[sum(roll[i][k] * turn[k][j] for k in range(3)) for j in range(3)] for i in range(3)]
    rotation = [[0.0 if abs(v) < 1e-12 else round(v, 12) for v in row] for row in rotation]
    translation = [-scale * sum(row[i] * grip[i] for i in range(3)) for row in rotation]
    pose = {"id": identifier, "view": view, "facing": facing, "gripBucket": bucket,
            "gripDegrees": 360 * bucket / buckets, "rotation": rotation,
            "translation": translation, "canvas": canvas}
    if view == "icon":
        pose["scale"] = scale
    if support is not None:
        pose["supportGrip"] = list(transform_point(pose, support))
    return pose


def item_pose_plan(repo: Path, asset: str, config: dict, render_spec: dict) -> dict:
    """Validate all inputs before producing the deterministic 64-pose + icon plan."""
    if not re.fullmatch(r"item:[a-z][a-z0-9-]*", asset):
        raise ForgeError("Item asset must use item:<slug> identity")
    if not isinstance(config, dict) or set(config) - {"model", "grip", "supportGrip", "socket", "iconPivot", "iconScale"}:
        raise ForgeError("Unknown item field; expected model, grip, supportGrip, socket, iconPivot, iconScale")
    if not {"model", "grip", "socket", "iconPivot"} <= config.keys():
        raise ForgeError("Item needs model, grip, socket and an explicitly authored iconPivot")
    name = config["model"]
    if (not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9_./ -]+\.blend", name)
            or name.startswith("/") or ".." in name.split("/")):
        raise ForgeError("Item model must be a relative .blend under art/source")
    root = (repo / "art/source").resolve()
    model = (root / name).resolve()
    if not model.is_relative_to(root) or not model.is_file():
        raise ForgeError("Item source model missing or outside art/source; supply its existing mesh")
    if config["socket"] not in ("Socket_Hand.R", "Socket_Hand.L"):
        raise ForgeError("Held items attach only to an authored hand socket")
    grip = point(config["grip"], "grip")
    icon_pivot = point(config["iconPivot"], "iconPivot")
    support = point(config["supportGrip"], "supportGrip") if "supportGrip" in config else None
    icon_scale = config.get("iconScale", 1.0)
    if type(icon_scale) not in (int, float) or not math.isfinite(icon_scale) or not 1 <= icon_scale <= 4:
        raise ForgeError("iconScale must be a finite number from 1 to 4 (the icon fills its slot; held poses never scale)")
    held = render_spec["canvases"]["layer.heldItem"]
    icon = render_spec["canvases"]["icon.item"]
    buckets = held["gripAngleBuckets"]
    facings = render_spec["facings"]["order"]
    yaw = render_spec["facings"]["zRotationDeg"]
    if buckets != 8 or len(facings) != 8 or set(facings) != {"n", "ne", "e", "se", "s", "sw", "w", "nw"}:
        raise ForgeError("Item planning requires the doctrine eight facings and eight grip buckets")
    for canvas in (held, icon):
        if (len(canvas["size"]) != 2 or len(canvas["anchor"]) != 2
                or any(type(v) is not int or v <= 0 for v in canvas["size"])
                or any(type(a) is not int or a < 0 or a > size
                       for a, size in zip(canvas["anchor"], canvas["size"]))):
            raise ForgeError("Invalid integer item canvas or anchor")
    if any(type(yaw[f]) not in (int, float) or not math.isfinite(yaw[f]) for f in facings):
        raise ForgeError("Item facing rotations must be finite")
    elevation = render_spec["camera"]["elevationDeg"]
    if (render_spec["camera"]["type"] != "ORTHO" or type(elevation) not in (int, float)
            or not math.isfinite(elevation) or not 0 < elevation < 90):
        raise ForgeError("Item grip projection needs the finite orthographic elevation")
    slug = asset.replace(":", "-")
    poses = [_pose(f"{slug}-held-{f}-{b}", f, yaw[f], b, buckets, grip, support,
                   {"size": held["size"], "anchor": held["anchor"]}, "held", elevation)
             for f in facings for b in range(buckets)]
    # Inventory icon: same mesh, se facing, the classic 45-degree tilt (bucket 1), scaled to its slot.
    poses.append(_pose(f"{slug}-icon", "se", yaw["se"], 1, buckets, icon_pivot, None,
                       {"size": icon["size"], "anchor": icon["anchor"]}, "icon", elevation, float(icon_scale)))
    contract = {"camera": render_spec["camera"], "pixelScale": render_spec["pixelScale"],
                "facings": render_spec["facings"], "held": held, "icon": icon}
    return {"schemaVersion": 1, "kind": "item-pose-plan", "status": "draft", "asset": asset,
            "source": {"path": name, "sha256": file_sha(model)}, "settings": config,
            "contractDigest": hashlib.sha256(canonical(contract)).hexdigest(),
            "generatorDigest": file_sha(Path(__file__)), "socket": config["socket"],
            "gripConvention": "clockwise-screen-from-up-after-facing-yaw",
            "poses": poses, "notes": ["Transforms existing source mesh only; no scale or mirrored bitmap.",
            "Icon uses the same mesh and authored icon pivot, tilted 45 degrees, with its own uniform iconScale.",
            "Rendering, clipping/thin-feature QA, occlusion and approval remain separate gates."]}


def write_item_plan(repo: Path, asset: str, config: dict, render_spec: dict, destination: Path) -> dict:
    """Atomic draft write; malformed requests and changed source bytes keep the old plan."""
    plan = item_pose_plan(repo, asset, config, render_spec)
    payload = canonical(plan)
    destination.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=destination.parent, prefix=".item-plan-")
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(payload)
        root = (repo / "art/source").resolve()
        source = (root / plan["source"]["path"]).resolve()
        if not source.is_relative_to(root) or file_sha(source) != plan["source"]["sha256"]:
            raise ForgeError("Item model changed while planning; previous plan retained")
        os.replace(name, destination)
    finally:
        Path(name).unlink(missing_ok=True)
    return plan
