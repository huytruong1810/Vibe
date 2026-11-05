"""Palette-indexed face grammar and registration QA (ART-8), separate from bodies."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw
from .core import ForgeError
from .publish import validate_packet

FACINGS = ("s", "se", "sw", "e", "w")
WEST = ("sw", "w")  # facings that look left: horizontal offsets mirror there
EXPRESSIONS = ("neutral", "warm", "fearful", "hurt", "sleep")
HUMAN_EXPRESSIONS = ("neutral", "warm", "thoughtful", "curious", "concerned", "amused",
                     "angry", "sad", "fearful", "blink", "sleep", "hurt")
FACE_POSES = {
    "s": ((5, 10), (8, 6), (7, 8, 9, 8)),
    "se": ((6, 10), (10, 6), (8, 8, 10, 8)),
    "sw": ((5, 9), (5, 6), (5, 8, 7, 8)),
    "e": ((9,), (12, 6), (10, 8, 12, 8)),
    "w": ((6,), (3, 6), (3, 8, 5, 8)),
}


def human_decal(expression: str, facing: str, palette: dict, canvas: dict,
                face: dict | None = None) -> Image.Image:
    """Authored native-pixel features; no body bitmap rotation or mirroring."""
    if expression not in HUMAN_EXPRESSIONS or facing not in FACINGS:
        raise ForgeError("Unknown human expression/facing; back facings have no decal")
    if canvas["size"] != [16, 12] or canvas["anchor"] != [8, 6]:
        raise ForgeError("Human grammar needs the registered 16x12 face canvas")
    if face is not None and not isinstance(face, dict):
        raise ForgeError("Face palette configuration must be an object")
    face = face or {}
    if set(face) - {"eyeRamp", "inkRamp", "highlightRamp"}:
        raise ForgeError("Unknown face palette field")
    ramps = {key: face.get(key, default) for key, default in
             (("eyeRamp", "hair-ink"), ("inkRamp", "outline-neutral"), ("highlightRamp", "hair-ink"))}
    if any(not isinstance(name, str) or name not in palette["ramps"] for name in ramps.values()):
        raise ForgeError("Unknown face palette ramp")
    colors = ["#000000", palette["ramps"][ramps["eyeRamp"]]["steps"]["deep"],
              palette["ramps"][ramps["highlightRamp"]]["steps"]["highlight"],
              palette["ramps"][ramps["inkRamp"]]["steps"]["deep"]]
    image = Image.new("P", tuple(canvas["size"]), 0)
    values = [int(color[i:i+2], 16) for color in colors for i in (1, 3, 5)]
    image.putpalette(values + [0] * (768 - len(values)))
    image.info["transparency"] = 0
    draw = ImageDraw.Draw(image)
    eyes, nose, mouth = FACE_POSES[facing]
    for index, x in enumerate(eyes):
        if expression in ("blink", "sleep"):
            draw.line((x, 5, x + 1, 5), fill=1)
        elif expression == "hurt":
            draw.line((x, 4, x + 1, 5), fill=1)
            draw.point((x, 6), fill=1)
        else:
            draw.rectangle((x, 4, x + 1, 5), fill=1)
            draw.point((x + (expression == "thoughtful"), 4), fill=2)
        if expression == "curious":
            draw.line((x, 1 + index, x + 1, 1 + index), fill=1)
        elif expression in ("concerned", "angry", "sad"):
            slope = 1 if expression == "angry" else -1
            # Front and three-quarter brows lean inward; profiles are authored above.
            if facing == "w" or index == 1:
                slope *= -1
            draw.line((x, 2, x + 1, 2 + slope), fill=1)
            if expression == "sad":
                draw.point((x, 6), fill=3)
        elif expression in ("warm", "amused"):
            draw.line((x, 2 if expression == "warm" else 3, x + 1, 2), fill=1)
        elif expression == "fearful":
            draw.line((x, 1, x + 1, 1), fill=1)
    draw.point(nose, fill=3)
    mx, my = mouth[:2]
    if expression == "fearful":
        draw.rectangle((mx, my, mx + 1, my + 1), fill=3)
    elif expression in ("warm", "amused"):
        draw.line((mx, my, mx + 1, my - 1), fill=3)
        if expression == "amused":
            draw.point((mx + 1, my), fill=3)
    elif expression in ("concerned", "sad", "hurt"):
        draw.line((mx, my, mx + 1, my + 1), fill=3)
    elif expression == "sleep":
        draw.point((mx + 1, my), fill=3)
    elif expression == "thoughtful":
        draw.line((mx + 1, my, mx + 2, my), fill=3)
    elif expression == "angry":
        draw.line((mx, my - 1, mx + 1, my - 1), fill=3)
    else:
        draw.line((mx, my, mx + 1, my), fill=3)
    return image.convert("RGBA").resize((32, 24), Image.Resampling.NEAREST)


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
    eyes, nose, mouth = FACE_POSES[facing]
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


def compact_decal(expression: str, facing: str, palette: dict, canvas: dict) -> Image.Image:
    """Eyes-only fallback for frames whose head leaves no room for the full decal (a narrow profile,
    a lunge): at most two 2x1/2x2 eyes with a brow, no nose or mouth. Each expression still differs."""
    if expression not in EXPRESSIONS or facing not in FACINGS:
        raise ForgeError("Unknown creature expression/facing; back facings have no decal")
    width, height = canvas["size"]
    image = Image.new("P", (width, height), 0)
    image.putpalette(_palette_values(palette))
    image.info["transparency"] = 0
    draw = ImageDraw.Draw(image)
    for x in FACE_POSES[facing][0]:
        y = 4
        if expression == "sleep":
            draw.line((x, y + 1, x + 1, y + 1), fill=1)
        elif expression == "hurt":
            draw.line((x, y + 1, x + 1, y + 1), fill=1)
            draw.line((x, y - 1, x + 1, y - 2), fill=1)
        elif expression == "warm":
            draw.line((x, y + 1, x + 1, y + 1), fill=1)
            draw.point((x + 1, y), fill=1)  # a closed, smiling eye
        else:
            draw.rectangle((x, y, x + 1, y + 1), fill=1)
            draw.point((x, y), fill=2)
            if expression == "fearful":
                draw.line((x, y - 2, x + 1, y - 2), fill=1)
    return image.convert("RGBA").resize((width * 2, height * 2), Image.Resampling.NEAREST)


def _palette_values(palette: dict) -> list:
    colors = ["#000000", palette["ramps"]["hair-ink"]["steps"]["deep"],
              palette["ramps"]["hair-ink"]["steps"]["highlight"],
              palette["ramps"]["outline-neutral"]["steps"]["deep"]]
    values = [int(color[i:i + 2], 16) for color in colors for i in (1, 3, 5)]
    return values + [0] * (768 - len(values))


def register_frames(manifest: dict, images: dict, anchor: dict, expressions: tuple, packet: Path,
                    default: tuple, search: int = 4, compact: dict | None = None) -> tuple[dict, dict, list]:
    """Per-frame decal registration for creatures (ART-8.1/8.2).

    A head deforms in motion, so one fixed offset from Socket_Head cannot sit on the head in every
    clip. `default` is (dx, dy) in frame px for east-leaning facings (e, se); west-leaning facings
    (w, sw) mirror dx, so a positive dx always moves toward the snout. For each forward frame this
    picks, among offsets within `search` art px vertically and 2 horizontally of the default, the
    nearest one at which every ink pixel of every expression lands on the body interior (opaque, four
    neighbours opaque: inside the silhouette and off the outline row). With `compact` images (eyes only)
    a frame the full decal does not fit is tried again with them. A frame with neither gets None: the
    runtime hides the face there.
    Returns (full: {frame id: [dx, dy] or None}, eyes_only: {frame id: [dx, dy]}, socket failures).
    """
    def ink_of(imgs):
        return {f: sorted({(x, y) for e in expressions
                           for y in range(imgs[(e, f)].height) for x in range(imgs[(e, f)].width)
                           if imgs[(e, f)].getchannel("A").getpixel((x, y))}) for f in FACINGS}
    ink, ink_small = ink_of(images), ink_of(compact) if compact else None

    def candidates(facing):
        dx = -default[0] if facing in WEST else default[0]
        return sorted(((dx + 2 * i, default[1] + 2 * j) for i in range(-2, 3) for j in range(-search, search + 1)),
                      key=lambda o: (abs(o[0] - dx) + abs(o[1] - default[1]), abs(o[0] - dx), o))

    def fit(body, head, pixels, facing):
        for off in candidates(facing):
            x, y = head["x"] + off[0] - anchor["x"], head["y"] + off[1] - anchor["y"]
            if all(_interior(body, x + px, y + py) for px, py in pixels):
                return list(off)
        return None

    table, eyes_only, failures = {}, {}, []
    for frame in manifest["frames"]:
        facing = frame["id"].rsplit(":", 2)[-2]
        if facing not in FACINGS:
            continue
        head = frame.get("sockets", {}).get("Socket_Head")
        if not head or any(type(head.get(k)) is not int or head[k] % 2 for k in ("x", "y")):
            failures.append(frame["id"] + ": missing/off-grid Socket_Head")
            continue
        body = Image.open(packet / frame["file"]).convert("RGBA").getchannel("A")
        table[frame["id"]] = fit(body, head, ink[facing], facing)
        if table[frame["id"]] is None and ink_small is not None:
            small = fit(body, head, ink_small[facing], facing)
            if small is not None:
                eyes_only[frame["id"]] = small
    return table, eyes_only, failures


def registration_checks(manifest: dict, images: dict, anchor: dict,
                        expressions: tuple = EXPRESSIONS, offset: tuple = (0, 0),
                        registration: dict | None = None, eyes_only: dict | None = None,
                        compact: dict | None = None) -> list:
    """faceAnchor: Socket_Head integer registration and canvas bounds (ART-8.1/8.2).

    With a registration table (creatures) the offset is per frame and a hidden frame (None) is skipped
    here; faceCoverage judges how many are hidden."""
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
        off, source = (offset if registration is None else registration.get(frame["id"])), images
        if off is None and eyes_only and frame["id"] in eyes_only:
            off, source = eyes_only[frame["id"]], compact
        if off is None:
            continue
        for expression in expressions:
            count += 1
            bounds = source[(expression, facing)].getbbox()
            x, y = head["x"] + off[0] - anchor["x"], head["y"] + off[1] - anchor["y"]
            if not bounds or x + bounds[0] < 0 or y + bounds[1] < 0 or x + bounds[2] > frame["sourceSize"]["w"] or y + bounds[3] > frame["sourceSize"]["h"]:
                failures.append(frame["id"] + ": decal ink leaves body canvas")
    return [{"check": "faceAnchor", "rule": "ART-8.1/ART-8.2", "hard": True,
             "pass": not failures and count > 0, "detail": f"{count} registrations; " + "; ".join(failures[:12])}]


def coverage_check(registration: dict, eyes_only: dict | None = None, max_hidden: float = 0.10) -> dict:
    """The face may be hidden on a few extreme frames (a lunge, a downed head) but never at rest:
    every idle frame shows at least the eyes-only decal and at most max_hidden of all forward frames
    show nothing."""
    eyes_only = eyes_only or {}
    hidden = [k for k, v in registration.items() if v is None and k not in eyes_only]
    idle_hidden = [k for k in hidden if ":idle:" in k]
    ok = not idle_hidden and len(hidden) <= max_hidden * max(len(registration), 1)
    return {"check": "faceCoverage", "rule": "ART-8.2", "hard": True, "pass": ok,
            "detail": f"{len(hidden)} of {len(registration)} forward frames hide the face (limit {max_hidden:.0%}), "
                      f"{len(eyes_only)} show eyes only; idle hidden: {len(idle_hidden)}"}


def _interior(alpha: Image.Image, x: int, y: int) -> bool:
    """Opaque with all four neighbours opaque: inside the silhouette and off its outline row."""
    w, h = alpha.size
    return all(0 <= x + dx < w and 0 <= y + dy < h and alpha.getpixel((x + dx, y + dy))
               for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)))


def distinctness_check(images: dict, expressions: tuple, reference: str = "neutral") -> dict:
    """Each expression differs from neutral by at least one pixel in every facing (e and w included)."""
    same = [f"{e}/{f}" for e in expressions if e != reference for f in FACINGS
            if images[(e, f)].tobytes() == images[(reference, f)].tobytes()]
    return {"check": "faceDistinct", "rule": "ART-8.3", "hard": True, "pass": not same,
            "detail": "identical to neutral: " + ", ".join(same[:12]) if same else "every expression differs from neutral in every facing"}


def build_faces(packet: Path, output: Path, asset: str, render_spec: dict, palette: dict,
                kind: str = "creature", face: dict | None = None,
                offset_px: tuple = (0, 3)) -> dict:
    if kind not in ("human", "creature"):
        raise ForgeError("Face kind must be human or creature")
    manifest = validate_packet(packet, asset)
    canvas = render_spec["canvases"]["layer.face"]
    expressions = HUMAN_EXPRESSIONS if kind == "human" else EXPRESSIONS
    if tuple(render_spec["expressions"][kind]) != expressions:
        raise ForgeError(f"{kind} expression spec differs from implemented grammar")
    images = {(e, f): human_decal(e, f, palette, canvas, face) if kind == "human"
              else decal(e, f, palette, canvas) for e in expressions for f in FACINGS}
    anchor = dict(zip(("x", "y"), [v * 2 for v in canvas["anchor"]]))
    registration, eyes_only, compact = None, None, None
    if kind == "creature":
        # Default decal origin: offset_px art px from Socket_Head (3 below, C3b review 2026-11-01), refined per frame.
        if len(offset_px) != 2 or any(abs(v) > 8 for v in offset_px):
            raise ForgeError("faceOffsetPx must stay within 8 art px of Socket_Head")
        compact = {(e, f): compact_decal(e, f, palette, canvas) for e in expressions for f in FACINGS}
        registration, eyes_only, _ = register_frames(manifest, images, anchor, expressions, packet,
                                                     (offset_px[0] * 2, offset_px[1] * 2), compact=compact)
    checks = registration_checks(manifest, images, anchor, expressions, registration=registration,
                                 eyes_only=eyes_only, compact=compact)
    if kind == "creature":
        checks += [coverage_check(registration, eyes_only), distinctness_check(images, expressions),
                   {**distinctness_check(compact, expressions), "check": "faceDistinctCompact"}]
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
    for (expression, facing), image in (compact or {}).items():
        name = f"compact/{expression}/{facing}.png"
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        image.save(path)
        frames.append({"expression": expression, "facing": facing, "file": name, "variant": "compact",
                       "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                       "sourceSize": {"w": image.width, "h": image.height}, "anchorPx": anchor,
                       "socket": "Socket_Head"})
    # Readable grammar proof, not an anatomy/visual-approval claim.
    sheet = Image.new("RGBA", (len(FACINGS) * 32, len(expressions) * 24), (28, 34, 50, 255))
    sheet_draw = ImageDraw.Draw(sheet)
    for row, expression in enumerate(expressions):
        for col, facing in enumerate(FACINGS):
            if kind == "human":
                # Review matte only: exported decals remain transparent. This is
                # not a rendered head or a claim that a particular skin is authored.
                sheet_draw.rectangle((col * 32, row * 24, col * 32 + 29, row * 24 + 21),
                                     fill=palette["ramps"]["skin-warm"]["steps"]["mid"])
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
        preview = Image.new("RGBA", (cell_w * len(samples), cell_h * len(expressions)), (28, 34, 50, 255))
        for row, expression in enumerate(expressions):
            for col, (facing, frame) in enumerate(samples):
                body = Image.open(packet / frame["file"]).convert("RGBA")
                preview.alpha_composite(body, (col * cell_w, row * cell_h))
                head = frame.get("sockets", {}).get("Socket_Head")
                off, source = (0, 0) if registration is None else registration.get(frame["id"]), images
                if off is None and eyes_only and frame["id"] in eyes_only:
                    off, source = eyes_only[frame["id"]], compact
                if head and off is not None:
                    preview.alpha_composite(source[(expression, facing)],
                        (col * cell_w + head["x"] + off[0] - anchor["x"], row * cell_h + head["y"] + off[1] - anchor["y"]))
        preview.save(output / "registered.png")
    result = {"schemaVersion": 1, "asset": asset, "scope": ["faces"],
              "status": "candidate" if all(c["pass"] for c in checks) else "draft",
              "bodyPacketDigest": manifest["sourceDigest"],
              "bodyManifestSha256": hashlib.sha256((packet / "review.json").read_bytes()).hexdigest(),
              "frames": frames, "qa": checks}
    if registration is not None:
        result["registration"] = {
            "unit": "frame px from Socket_Head, added to the decal anchor. Horizontal offsets are per facing, already mirrored.",
            "rule": "a frame listed in eyesOnly uses the compact/ decals at that offset; otherwise frames[id] is the full-decal offset, null hides the face",
            "frames": registration, "eyesOnly": eyes_only}
    result["sourceDigest"] = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()
    (output / "faces.json").write_text(json.dumps(result, indent=2) + "\n")
    return result
