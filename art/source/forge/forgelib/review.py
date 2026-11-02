"""Export registered candidate frames for the development gallery, never gameplay."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image


HELD_BEHIND_UNITS = 0.05  # hand this far (world units, ~1.6 art px) behind the chest draws the item behind the body


def held_poses(track: dict, sockets: dict) -> dict:
    """C9b: runtime held pose per hand socket: grip bucket = nearest 45 degrees clockwise from up."""
    return {k: {"bucket": round(v["angleDeg"] / 45) % 8, "behind": v["depth"] > HELD_BEHIND_UNITS}
            for k, v in sorted(track.get("held", {}).items()) if k in sockets}


def export_packet(wd: Path, output: Path, asset: str, render_spec: dict, canvas: dict):
    tracks = json.loads((wd / "bake/tracks.json").read_text())
    frames, clips = [], []
    qa = json.loads((wd / "qa_report.json").read_text())["checks"]
    digest = hashlib.sha256()
    # Hash both records: image bytes alone do not bind registration or timing.
    for record in (tracks, render_spec, qa):
        digest.update(json.dumps(record, sort_keys=True, separators=(",", ":")).encode())
    for folder in sorted((wd / "pix/export").iterdir()):
        if not folder.is_dir():
            continue
        name = folder.name
        definition = render_spec["clips"][name]
        # humans bake combat and lying clips on their own canvases (C9a); bake records them per clip
        clip_canvas = tracks.get("canvases", {}).get(name, canvas)
        by_facing = {}
        for path in sorted(folder.glob("*.png"), key=lambda p: (p.stem.rsplit("_", 1)[0], int(p.stem.rsplit("_", 1)[1]))):
            facing, number = path.stem.rsplit("_", 1)
            with Image.open(path) as image:
                width, height = image.size
            if [width, height] != [v * 2 for v in clip_canvas["size"]]:
                raise ValueError(f"{path}: unexpected review canvas")
            anchor = [v * 2 for v in clip_canvas["anchor"]]
            track = tracks["clips"][name][facing][int(number)]
            sockets = {k: {"x": round(v[0]) * 2, "y": round(v[1]) * 2}
                       for k, v in track.items() if k.startswith("Socket_")}
            if any(min(p.values()) < 0 for p in sockets.values()):
                raise ValueError(f"{path}: negative socket requires an expanded canvas")
            held = held_poses(track, sockets)
            rel = f"frames/{name}/{path.name}"
            target = output / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
            data = path.read_bytes()
            file_digest = hashlib.sha256(data).hexdigest()
            digest.update(rel.encode())
            digest.update(data)
            frame_id = f"{asset}:{name}:{facing}:{number}"
            rect = {"x": 0, "y": 0, "w": width, "h": height}
            frames.append({"id": frame_id, "pageId": frame_id, "textureKey": frame_id,
                           "file": rel, "sha256": file_digest, "rect": rect, "trim": rect,
                           "sourceSize": {"w": width, "h": height},
                           "anchorPx": {"x": anchor[0], "y": anchor[1]},
                           "anchor": {"x": anchor[0] / width, "y": anchor[1] / height},
                           "sockets": sockets, **({"held": held} if held else {})})
            by_facing.setdefault(facing, []).append(frame_id)
        for facing, ids in sorted(by_facing.items()):
            clip = {"id": f"{asset}:{name}:{facing}", "appearanceId": asset,
                    **definition["runtime"], "facing": facing, "frameIds": ids,
                    "fps": definition.get("fps") or 12, "playback": definition["playback"]}
            if "phases" in definition:
                clip["phases"] = definition["phases"]
            if "strideTiles" in definition:
                clip["stride"] = definition["strideTiles"]
            clips.append(clip)
    if not frames:
        raise ValueError("Packet contains no exported frames")
    manifest = {"schemaVersion": 1, "status": "candidate", "asset": asset,
                "sourceDigest": digest.hexdigest(), "frames": frames, "clips": clips, "qa": qa}
    (output / "review.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest
