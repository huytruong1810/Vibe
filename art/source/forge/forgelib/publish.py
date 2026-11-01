"""Digest-bound body publication. Never generates art or changes an approval ledger."""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import shutil
import tempfile
from pathlib import Path

from PIL import Image
from .core import ForgeError
from .review import export_packet


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def within(root: Path, name: str) -> Path:
    path = (root / name).resolve()
    if Path(name).is_absolute() or not path.is_relative_to(root.resolve()):
        raise ForgeError(f"Path escapes its source root: {name}")
    return path


def approval_metadata(record: Path) -> dict:
    text = record.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ForgeError("Approval needs front matter")
    rows = text.split("---", 2)[1].splitlines()
    return {k.strip(): v.strip() for k, v in (row.split(":", 1) for row in rows if ":" in row)}


def source_bundle(repo: Path, wd: Path, asset: str, inputs: list[tuple[Path, str]]) -> tuple[Path, list[dict], list[tuple[Path, str, str]]]:
    """Plan a self-contained immutable closure; no scratch paths reach the compiler.

    Keep exact model, tracks, stage record and tool bytes, rather than replacing
    the model with a reference or binding old publications to mutable live tools.
    The source filename participates in the digest to prevent role/path aliasing.
    """
    rows = []
    scratch_names = {wd / "animate.blend": "model/animate.blend",
                     wd / "bake/tracks.json": "bake/tracks.json",
                     wd / "animate.json": "pose/animate.json"}
    for path, role in inputs:
        if not path.is_file() or not path.resolve().is_relative_to(repo / "art/source"):
            raise ForgeError(f"Missing source artifact: {path}")
        name = scratch_names.get(path, path.relative_to(repo / "art/source").as_posix())
        rows.append((path, name, sha(path), role))
    rows.sort(key=lambda row: row[1])
    if len({row[1] for row in rows}) != len(rows):
        raise ForgeError("Duplicate publication source path")
    digest = hashlib.sha256(json.dumps(
        [{"path": name, "sha256": digest, "role": role} for _, name, digest, role in rows],
        sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    target = repo / "art/source/blender/models/published" / asset / digest
    provenance = [{"path": (target / name).relative_to(repo / "art/source").as_posix(),
                   "sha256": digest, "role": role} for _, name, digest, role in rows]
    return target, provenance, [(path, name, digest) for path, name, digest, _ in rows]


def install_sources(target: Path, rows: list[tuple[Path, str, str]]) -> None:
    """Copy once, verify on every retry, never repair mutated immutable sources."""
    if target.exists():
        for _, name, digest in rows:
            path = within(target, name)
            if not path.is_file() or sha(path) != digest:
                raise ForgeError("Existing immutable source bundle has changed")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=target.parent, prefix="publish-sources-") as tmp:
        candidate = Path(tmp) / "sources"
        for source, name, digest in rows:
            destination = within(candidate, name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, destination)
            if sha(destination) != digest:
                raise ForgeError("Source changed while copying; publication cancelled")
        os.replace(candidate, target)


def validate_packet(packet: Path, asset: str) -> dict:
    manifest = json.loads((packet / "review.json").read_text())
    if manifest.get("asset") != asset or manifest.get("status") != "candidate":
        raise ForgeError("Wrong packet asset or status")
    if not re.fullmatch(r"[0-9a-f]{64}", manifest.get("sourceDigest", "")):
        raise ForgeError("Invalid packet source digest")
    if not isinstance(manifest.get("qa"), list):
        raise ForgeError("Packet QA must be present")
    ids, files = set(), set()
    for frame in manifest["frames"]:
        path = within(packet, frame["file"])
        if frame["id"] in ids or frame["file"] in files or sha(path) != frame["sha256"]:
            raise ForgeError("Duplicate frame/file or changed frame bytes")
        ids.add(frame["id"])
        files.add(frame["file"])
        with Image.open(path) as im:
            if im.mode != "RGBA" or im.size != (frame["sourceSize"]["w"], frame["sourceSize"]["h"]):
                raise ForgeError("Frame dimensions or RGBA mode changed")
        for point in [frame["anchorPx"], *frame.get("sockets", {}).values()]:
            if set(point) != {"x", "y"} or any(type(v) is not int or v < 0 for v in point.values()):
                raise ForgeError("Registration must use nonnegative integer pixels")
    if not ids or not manifest["clips"]:
        raise ForgeError("Empty packet")
    clip_ids, referenced = set(), set()
    for clip in manifest["clips"]:
        if clip["id"] in clip_ids or not clip["frameIds"] or not set(clip["frameIds"]) <= ids:
            raise ForgeError("Invalid clip identity/frame references")
        clip_ids.add(clip["id"])
        referenced.update(clip["frameIds"])
    if referenced != ids or any(c.get("hard", True) and not c["pass"] for c in manifest["qa"]):
        raise ForgeError("Unreferenced frames or failed hard QA")
    return manifest


def publish_body(repo: Path, wd: Path, packet: Path, approval: Path, asset: str,
                 render_spec: dict, canvas: dict, blender_version: str) -> Path:
    """Validate everything first; immutable exports precede the atomic staging pointer.

    Reconstructing the review from the original bake binds metadata as well as PNGs.
    Machine-A source artifacts must be available: an approval is not a source substitute.
    """
    repo = repo.resolve()
    if not re.fullmatch(r"[a-z][a-z0-9-]*", asset):
        raise ForgeError("Creature asset must use its canonical filesystem ID")
    packet, approval = packet.resolve(), approval.resolve()
    if not approval.is_relative_to(repo / "docs/team/comms/director/approvals"):
        raise ForgeError("Approval must come from the director records directory")
    meta = approval_metadata(approval)
    manifest = validate_packet(packet, asset)
    if (meta.get("asset") != asset or meta.get("decision") != "director-approved"
            or within(repo, meta.get("packet", "")) != packet
            or meta.get("packetDigest") != manifest["sourceDigest"]
            or not {"body", "clips"} <= set(meta.get("scope", "").strip("[]").replace(" ", "").split(","))):
        raise ForgeError("Approval asset, scope, packet or digest does not match")
    if not re.fullmatch(r"4\.2\.\d+", blender_version):
        raise ForgeError("Publication requires the pinned Blender 4.2.x version")
    with tempfile.TemporaryDirectory(dir=wd, prefix="publish-check-") as tmp:
        reconstructed = export_packet(wd, Path(tmp), asset, render_spec, canvas)
        if reconstructed != manifest:
            raise ForgeError("Packet metadata/bytes differ from the original bake; do not regenerate approved packets")
    animate = json.loads((wd / "animate.json").read_text())
    rig = json.loads((wd / "rig.json").read_text())["extra"]["rigId"]
    if rig != animate["extra"]["rigId"]:
        raise ForgeError("Rig identity differs from the animate record")
    clips = json.loads(json.dumps(manifest["clips"]))
    strides = animate["extra"]["strideTiles"]
    for clip in clips:
        if clip["playback"] == "distance":
            stride = strides.get(clip["state"])
            if type(stride) not in (int, float) or not math.isfinite(stride) or stride <= 0:
                raise ForgeError("Distance clip needs its actual animate-record stride")
            clip["stride"] = stride
    model = wd / "animate.blend"
    model_key = model.relative_to(repo).as_posix()
    if animate.get("outputs", {}).get(model_key) != sha(model):
        raise ForgeError("Animated model no longer matches its stage record")
    inputs = [(model, "model"), (repo / "art/source/forge/forge.py", "script"),
              (repo / "art/source/forge/forgelib/publish.py", "script"),
              (repo / "art/source/forge/forgelib/review.py", "script"),
              (wd / "bake/tracks.json", "bake"), (wd / "animate.json", "pose-config"),
              (repo / "art/source/forge/spec/render_spec.json", "pose-config")]
    inputs.extend((repo / "art/source/forge" / name, "script") for name in
                  ("blender/bake.py", "blender/animate.py", "blender/gaits.py", "forgelib/pixelize.py"))
    inputs.extend([(repo / "art/source/forge/spec/palette.json", "palette"),
                   (repo / f"art/source/forge/recipes/{asset}.json", "pose-config"),
                   (repo / "art/source/forge/uv.lock", "dependency-lock")])
    bundle, provenance_inputs, bundle_rows = source_bundle(repo, wd, asset, inputs)
    provenance = {"id": f"forge-{asset}", "method": "blender-bake",
                  "inputs": provenance_inputs,
                  "toolchain": [{"name": "blender", "version": blender_version}],
                  "command": f"uv run --project art/source/forge python art/source/forge/forge.py publish --asset {asset}"}
    # Use the generated shared TypeScript contract, not an independently invented shape.
    from jsonschema import Draft202012Validator
    schema = json.loads((repo / "docs/art/source-manifest.schema.json").read_text())
    definition = schema["oneOf"][1]["properties"]["authoringProvenance"]["items"]
    Draft202012Validator(definition).validate(provenance)
    export = repo / "art/source/exports" / asset / manifest["sourceDigest"]
    frames = json.loads(json.dumps(manifest["frames"]))
    for frame in frames:
        frame["file"] = (export / frame["file"]).relative_to(repo / "art/source").as_posix()
        frame["rigId"] = rig
    record = {"schemaVersion": 1, "asset": asset, "scope": ["body", "clips"],
              "packet": packet.relative_to(repo).as_posix(), "packetDigest": manifest["sourceDigest"],
              "packetSha256": sha(packet / "review.json"), "approvalRecord": approval.relative_to(repo).as_posix(),
              "approvalSha256": sha(approval), "rigId": rig, "frames": frames, "clips": clips,
              "authoringProvenance": provenance}
    staging = repo / "art/source/staging/blender" / f"{asset}.json"
    payload = json.dumps(record, sort_keys=True, indent=2) + "\n"
    install_sources(bundle, bundle_rows)
    # A content-addressed destination must never silently overwrite earlier exports.
    if export.exists():
        for frame in manifest["frames"]:
            if sha(within(export, frame["file"])) != frame["sha256"]:
                raise ForgeError("Existing immutable export has changed")
    else:
        export.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=export.parent, prefix="publish-") as tmp:
            candidate = Path(tmp) / "frameset"
            for frame in manifest["frames"]:
                target = within(candidate, frame["file"])
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(within(packet, frame["file"]), target)
                if sha(target) != frame["sha256"]:
                    raise ForgeError("Frame changed while copying; publication cancelled")
            os.replace(candidate, export)
    guards = [(approval, record["approvalSha256"]), (packet / "review.json", record["packetSha256"])]
    guards.extend((path, digest) for path, _, digest in bundle_rows)
    guards.extend((repo / "art/source" / p["path"], p["sha256"]) for p in provenance["inputs"])
    if any(sha(path) != digest for path, digest in guards):
        raise ForgeError("Publication inputs changed before commit; previous staging retained")
    staging.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=staging.parent, prefix=".publish-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(payload)
        os.replace(temp, staging)
    finally:
        Path(temp).unlink(missing_ok=True)
    return staging


def publish_item(repo: Path, wd: Path, packet: Path, approval: Path, asset: str,
                 config: dict, blender_version: str) -> Path:
    """C9b: digest-bound held-item publication (64 held poses + icon), same guarantees as bodies.

    The packet's review.json is the renderer's own item-review; its sourceDigest covers the
    frame metadata, QA and every file hash, so an approval binds exactly what was reviewed.
    """
    repo = repo.resolve()
    if not re.fullmatch(r"item:[a-z][a-z0-9-]*", asset):
        raise ForgeError("Item asset must use item:<slug>")
    slug = asset.replace(":", "-")
    packet, approval = packet.resolve(), approval.resolve()
    if not approval.is_relative_to(repo / "docs/team/comms/director/approvals"):
        raise ForgeError("Approval must come from the director records directory")
    meta = approval_metadata(approval)
    review = json.loads((packet / "review.json").read_text())
    payload = {k: v for k, v in review.items() if k != "sourceDigest"}
    from .items import canonical
    if hashlib.sha256(canonical(payload)).hexdigest() != review.get("sourceDigest"):
        raise ForgeError("Item review metadata changed after rendering")
    if review.get("asset") != asset or review.get("status") != "candidate" or any(not c["pass"] for c in review["qa"]):
        raise ForgeError("Wrong item packet asset, status or failed hard QA")
    scope = set(meta.get("scope", "").strip("[]").replace(" ", "").split(","))
    if (meta.get("asset") != asset or meta.get("decision") != "director-approved"
            or within(repo, meta.get("packet", "")) != packet
            or meta.get("packetDigest") != review["sourceDigest"] or not {"held-item", "icon"} <= scope):
        raise ForgeError("Approval asset, scope [held-item, icon], packet or digest does not match")
    if not re.fullmatch(r"4\.2\.\d+", blender_version):
        raise ForgeError("Publication requires the pinned Blender 4.2.x version")
    for frame in review["frames"]:
        if sha(within(packet, frame["file"])) != frame["sha256"]:
            raise ForgeError("Packet frame bytes changed")
    model = within(repo / "art/source", config["model"])
    inputs = [(model, "model"), (wd / "orient.json", "pose-config"), (wd / "orient_params.json", "pose-config"),
              (repo / f"art/source/forge/recipes/{slug}.json", "pose-config"),
              (repo / "art/source/forge/spec/render_spec.json", "pose-config"),
              (repo / "art/source/forge/spec/palette.json", "palette"),
              (repo / "art/source/forge/uv.lock", "dependency-lock")]
    inputs.extend((repo / "art/source/forge" / name, "script") for name in
                  ("forge.py", "forgelib/publish.py", "forgelib/items.py", "forgelib/item_render.py",
                   "forgelib/item_orient.py", "forgelib/pixelize.py", "blender/bake.py", "blender/item_orient.py"))
    bundle, provenance_inputs, bundle_rows = source_bundle(repo, wd, slug, inputs)
    provenance = {"id": f"forge-{slug}", "method": "blender-bake", "inputs": provenance_inputs,
                  "toolchain": [{"name": "blender", "version": blender_version}],
                  "command": f"uv run --project art/source/forge python art/source/forge/forge.py publish --asset {asset}"}
    from jsonschema import Draft202012Validator
    schema = json.loads((repo / "docs/art/source-manifest.schema.json").read_text())
    Draft202012Validator(schema["oneOf"][1]["properties"]["authoringProvenance"]["items"]).validate(provenance)
    export = repo / "art/source/exports" / slug / review["sourceDigest"]
    frames = json.loads(json.dumps(review["frames"]))
    for frame in frames:
        frame["file"] = (export / frame["file"]).relative_to(repo / "art/source").as_posix()
    record = {"schemaVersion": 1, "asset": asset, "scope": ["held-item", "icon"],
              "packet": packet.relative_to(repo).as_posix(), "packetDigest": review["sourceDigest"],
              "packetSha256": sha(packet / "review.json"), "approvalRecord": approval.relative_to(repo).as_posix(),
              "approvalSha256": sha(approval), "socket": config["socket"],
              "gripConvention": "clockwise-screen-from-up-after-facing-yaw", "frames": frames,
              "authoringProvenance": provenance}
    install_sources(bundle, bundle_rows)
    if export.exists():
        for frame in review["frames"]:
            if sha(within(export, frame["file"])) != frame["sha256"]:
                raise ForgeError("Existing immutable export has changed")
    else:
        export.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=export.parent, prefix="publish-") as tmp:
            candidate = Path(tmp) / "frameset"
            for frame in review["frames"]:
                target = within(candidate, frame["file"])
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(within(packet, frame["file"]), target)
                if sha(target) != frame["sha256"]:
                    raise ForgeError("Frame changed while copying; publication cancelled")
            os.replace(candidate, export)
    guards = [(approval, record["approvalSha256"]), (packet / "review.json", record["packetSha256"])]
    guards.extend((path, digest) for path, _, digest in bundle_rows)
    if any(sha(path) != digest for path, digest in guards):
        raise ForgeError("Publication inputs changed before commit; previous staging retained")
    staging = repo / "art/source/staging/blender" / f"{slug}.json"
    staging.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=staging.parent, prefix=".publish-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(record, sort_keys=True, indent=2) + "\n")
        os.replace(temp, staging)
    finally:
        Path(temp).unlink(missing_ok=True)
    return staging
