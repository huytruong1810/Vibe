"""Creature decal grammar and registration QA (ART-8). Separate from approved bodies."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
from .core import ForgeError
from .publish import validate_packet

FACINGS = ("s", "se", "sw", "e", "w")
EXPRESSIONS = ("neutral", "warm", "fearful", "hurt", "sleep")


def decal(expression: str, facing: str, palette: dict, canvas: dict) -> Image.Image:
    if expression not in EXPRESSIONS or facing not in FACINGS:
        raise ForgeError("Unknown creature expression/facing; back facings have no decal")
    # Palette indices, never interpolated RGB or independently rotating anatomy.
    width, height = canvas["size"]
    image = Image.new("P", (width, height), 0)
    colors = ["#000000", palette["ramps"]["hair-ink"]["steps"]["deep"],
              palette["ramps"]["hair-ink"]["steps"]["highlight"],
              palette["ramps"]["outline-neutral"]["steps"]["deep"]]
    values = [int(color[i:i+2], 16) for color in colors for i in (1, 3, 5)]
    image.putpalette(values + [0] * (768 - len(values)))
    image.info["transparency"] = 0
    draw = ImageDraw.Draw(image)
    # Explicit facing pose tables. All coordinates are native art pixels.
    eyes, nose, mouth = {
        "s": ((5, 10), (8, 6), (7, 8, 9, 8)),
        "se": ((6, 10), (10, 6), (8, 8, 10, 8)),
        "sw": ((5, 9), (5, 6), (5, 8, 7, 8)),
        "e": ((9,), (12, 6), (10, 8, 12, 8)),
        "w": ((6,), (3, 6), (3, 8, 5, 8)),
    }[facing]
    for x in eyes:
        y = 4
        if expression in ("sleep", "hurt"):
            draw.line((x, y + 1, x + 1, y + 1), fill=1)
        else:
            draw.rectangle((x, y, x + 1, y + 1), fill=1)
            draw.point((x, y), fill=2)  # light-side highlight, ART-8.4
        if expression == "fearful":
            draw.line((x, y - 2, x + 1, y - 2), fill=1)
        elif expression == "hurt":
            draw.line((x, y - 1, x + 1, y - 2), fill=1)
    draw.point(nose, fill=3)
    draw.line(mouth, fill=3)
    if expression == "warm":
        draw.point((mouth[0], mouth[1] - 1), fill=3)
        draw.point((mouth[2], mouth[3] - 1), fill=3)
    elif expression == "fearful":
        draw.point((mouth[0] + 1, mouth[1] + 1), fill=3)
    return image.convert("RGBA").resize((width * 2, height * 2), Image.Resampling.NEAREST)


def registration_checks(manifest: dict, images: dict, anchor: dict) -> list:
    failures = []
    count = 0
    for frame in manifest["frames"]:
        facing = frame["id"].rsplit(":", 2)[-2]
        if facing not in FACINGS:
            continue
        head = frame.get("sockets", {}).get("Socket_Head")
        if not head or any(type(head.get(k)) is not int or head[k] % 2 for k in ("x", "y")):
            failures.append(frame["id"] + ": missing/off-grid Socket_Head")
            continue
        for expression in EXPRESSIONS:
            count += 1
            bounds = images[(expression, facing)].getbbox()
            x, y = head["x"] - anchor["x"], head["y"] - anchor["y"]
            if not bounds or x + bounds[0] < 0 or y + bounds[1] < 0 or x + bounds[2] > frame["sourceSize"]["w"] or y + bounds[3] > frame["sourceSize"]["h"]:
                failures.append(frame["id"] + ": decal ink leaves body canvas")
    return [{"check": "faceAnchor", "rule": "ART-8.1/ART-8.2", "hard": True,
             "pass": not failures and count > 0, "detail": f"{count} registrations; " + "; ".join(failures[:12])}]


def build_faces(packet: Path, output: Path, asset: str, render_spec: dict, palette: dict) -> dict:
    manifest = validate_packet(packet, asset)
    canvas = render_spec["canvases"]["layer.face"]
    if tuple(render_spec["expressions"]["creature"]) != EXPRESSIONS:
        raise ForgeError("Creature expression spec differs from implemented grammar")
    images = {(e, f): decal(e, f, palette, canvas) for e in EXPRESSIONS for f in FACINGS}
    anchor = dict(zip(("x", "y"), [v * 2 for v in canvas["anchor"]]))
    checks = registration_checks(manifest, images, anchor)
    output.mkdir(parents=True, exist_ok=True)
    frames = []
    for (expression, facing), image in images.items():
        name = f"{expression}/{facing}.png"
        path = output / name
        path.parent.mkdir(exist_ok=True)
        image.save(path)
        frames.append({"expression": expression, "facing": facing, "file": name,
                       "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                       "sourceSize": {"w": image.width, "h": image.height}, "anchorPx": anchor,
                       "socket": "Socket_Head"})
    # Readable grammar proof, not an anatomy/visual-approval claim.
    sheet = Image.new("RGBA", (5 * 32, 5 * 24), (28, 34, 50, 255))
    for row, expression in enumerate(EXPRESSIONS):
        for col, facing in enumerate(FACINGS):
            sheet.alpha_composite(images[(expression, facing)], (col * 32, row * 24))
    sheet.save(output / "contact.png")
    # Composite one standing frame per facing so anatomical placement can be reviewed.
    samples = []
    for facing in FACINGS:
        sample = next((f for f in manifest["frames"] if f["id"].endswith(f":idle:{facing}:0")), None)
        if sample is not None:
            samples.append((facing, sample))
    if samples:
        cell_w = max(f["sourceSize"]["w"] for _, f in samples)
        cell_h = max(f["sourceSize"]["h"] for _, f in samples)
        preview = Image.new("RGBA", (cell_w * len(samples), cell_h * len(EXPRESSIONS)), (28, 34, 50, 255))
        for row, expression in enumerate(EXPRESSIONS):
            for col, (facing, frame) in enumerate(samples):
                body = Image.open(packet / frame["file"]).convert("RGBA")
                preview.alpha_composite(body, (col * cell_w, row * cell_h))
                head = frame.get("sockets", {}).get("Socket_Head")
                if head:
                    preview.alpha_composite(images[(expression, facing)],
                        (col * cell_w + head["x"] - anchor["x"], row * cell_h + head["y"] - anchor["y"]))
        preview.save(output / "registered.png")
    result = {"schemaVersion": 1, "asset": asset, "scope": ["faces"],
              "status": "candidate" if all(c["pass"] for c in checks) else "draft",
              "bodyPacketDigest": manifest["sourceDigest"],
              "bodyManifestSha256": hashlib.sha256((packet / "review.json").read_bytes()).hexdigest(),
              "frames": frames, "qa": checks}
    result["sourceDigest"] = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()
    (output / "faces.json").write_text(json.dumps(result, indent=2) + "\n")
    return result
