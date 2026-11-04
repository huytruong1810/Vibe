"""Deterministic review images and hash-bound inspection receipts, not approvals."""

import json
import re
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from .project import (
    REPO,
    SPEC,
    WORLD,
    WORK,
    canonical,
    entities,
    fields,
    layers,
    read,
    sha,
    spec,
    atomic_write,
    WorldError,
)


def dependencies():
    paths = [
        SPEC,
        WORLD / "spec" / spec()["ldtk"]["jsonSchema"],
        REPO / "art/source/forge/uv.lock",
        REPO / "art/source/ui/fonts/Silver.ttf",
        REPO / "public/assets/generated/catalog.json",
        REPO / "src/content/definitions.ts",
    ]
    paths += sorted((WORLD / "tools").rglob("*.py"))
    paths += sorted((REPO / "art/source/tiles/tools").rglob("*.py"))
    paths += sorted((REPO / "art/source/tiles/spec").glob("*.json"))
    # All atlas pages used for previews are bound, not just their JSON registration.
    catalog = read(REPO / "public/assets/generated/catalog.json")
    paths += [REPO / "public" / p["imageUrl"].lstrip("/") for p in catalog["pages"]]
    return sha({p.relative_to(REPO).as_posix(): sha(p.read_bytes()) for p in paths})


class PreviewArt:
    def __init__(self):
        self.catalog = read(REPO / "public/assets/generated/catalog.json")
        self.pages = {}
        self.cache = {}
        self.appearances = {a['contentId']: a for a in self.catalog['appearances'] if a['kind'] == 'environment' and a.get('frameId') and a.get('stage') not in ('proof', 'candidate')}
        self.content_ids = frozenset(self.appearances)

    def asset(self, name):
        name = name.removeprefix("env:")
        if name in self.cache:
            return self.cache[name]
        a = self.appearances.get(name)
        if not a or not a.get("frameId"):
            return None
        f = next(f for f in self.catalog["frames"] if f["id"] == a["frameId"])
        if f["pageId"] not in self.pages:
            page = next(p for p in self.catalog["pages"] if p["id"] == f["pageId"])
            with Image.open(REPO / "public" / page["imageUrl"].lstrip("/")) as image:
                self.pages[f["pageId"]] = image.convert("RGBA")
        rect, trim = f["rect"], f["trim"]
        untrimmed = Image.new("RGBA", (f["sourceSize"]["w"], f["sourceSize"]["h"]))
        untrimmed.alpha_composite(
            self.pages[f["pageId"]].crop(
                (rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"])
            ),
            (trim["x"], trim["y"]),
        )
        image = untrimmed.resize(
            (max(1, untrimmed.width // 2), max(1, untrimmed.height // 2)),
            Image.Resampling.NEAREST,
        )
        self.cache[name] = image, f["anchor"]
        return self.cache[name]

    def close(self):
        for image in self.pages.values():
            image.close()
        for image, _ in self.cache.values():
            image.close()


def draw_level(level, art):
    s = spec()
    w, h = level["pxWid"] // 32, level["pxHei"] // 32
    from .terrain import compose_terrain
    canvas = compose_terrain(level, art)
    d = ImageDraw.Draw(canvas)
    ls = layers(level)
    font = ImageFont.truetype(str(REPO / "art/source/ui/fonts/Silver.ttf"), 19)
    for e in sorted(entities(level), key=lambda e: (e["__grid"][1], e["iid"])):
        x, y = [v * 32 for v in e["__grid"]]
        kind, fs = e["__identifier"], fields(e)
        visual = art.asset(
            fs.get("asset", "house_aqualia" if kind == "Building" else "")
        )
        if visual:
            image, anchor = visual
            foot_x, foot_y = (
                (x + e["width"] / 2, y + e["height"])
                if kind == "Building"
                else (x + 16, y + 24)
            )
            canvas.alpha_composite(
                image,
                (
                    round(foot_x - image.width * anchor["x"]),
                    round(foot_y - image.height * anchor["y"]),
                ),
            )
        elif kind == "Building":
            d.rectangle(
                (x, y, x + e["width"] - 1, y + e["height"] - 1),
                fill="#796045",
                outline="#c9a044",
                width=2,
            )
            d.rectangle((x, y - 12, x + e["width"] - 1, y + 8), fill="#3f6574")
        elif kind == "Decor":
            if fs["asset"].startswith("placeholder:foreground:"):
                d.rectangle(
                    (x - 16, y - 24, x + 48, y + 16), outline="#6f986c", width=4
                )
                d.text((x, y - 24), "FG*", font=font, fill="#f6deb2")
            else:
                d.rectangle((x + 8, y + 8, x + 24, y + 24), fill="#91a66c")
        elif kind in ("Landmark", "Entrance", "PlayerSpawn", "Service"):
            color = {
                "PlayerSpawn": "#eac45a",
                "Entrance": "#db8a9b",
                "Service": "#83c7cc",
            }.get(kind, "#f6deb2")
            d.ellipse((x + 10, y + 10, x + 22, y + 22), fill=color)
            label = fs.get("id", fs.get("kind", ""))
            d.text(
                (x + 18, y - 12),
                label,
                font=font,
                fill=color,
                stroke_width=1,
                stroke_fill="#1a243e",
            )
    # Authoritative overlays expose collision/elevation instead of hiding contradictions.
    for i, value in enumerate(ls["collision"]["intGridCsv"]):
        x, y = i % w * 32, i // w * 32
        if value:
            d.rectangle(
                (x, y, x + 31, y + 31),
                outline={1: "#e48c86", 2: "#eac45a", 3: "#83c7cc"}[value],
                width=2,
            )
    for i, value in enumerate(ls["elevation"]["intGridCsv"]):
        if value:
            d.text((i % w * 32, i // w * 32), str(value), font=font, fill="#eac45a")
    return canvas


def packet_path(plan, name, revision):
    return REPO / f"art/review/world-{plan['region']}-{name}-{revision}"


def next_revision(plan, name):
    prefix = f"world-{plan['region']}-{name}-"
    revisions = [
        int(p.name[len(prefix):])
        for p in (REPO / "art/review").glob(prefix + "*")
        if re.fullmatch(re.escape(prefix) + r"[1-9][0-9]*", p.name)
    ]
    return max(revisions, default=0) + 1


def comparison_source(plan, name, revision):
    """Resolve the exact predecessor, never fall back to a cached draft image."""
    if type(revision) is not int or revision < 1:
        raise WorldError("Revision must be positive")
    if packet_path(plan, name, revision).exists():
        raise WorldError("Refusing to overwrite a review packet; use a new revision")
    if revision == 1:
        from .project import new_project

        return {"kind": "initial-draft", "projectDigest": sha(new_project(plan))}
    previous = packet_path(plan, name, revision - 1)
    try:
        receipt = previous / "packet.json"
        data = receipt.read_bytes()
        recorded = json.loads(data)
        digest = recorded["files"]["overview.png"]
        if (
            recorded["level"] != name
            or recorded["status"] != "candidate"
            or not re.fullmatch(r"[0-9a-f]{64}", recorded["sourceDigest"])
            or sha((previous / "overview.png").read_bytes()) != digest
        ):
            raise WorldError("Previous packet identity or overview hash mismatch")
        return {
            "kind": "previous-packet",
            "revision": revision - 1,
            "packet": previous.relative_to(REPO).as_posix(),
            "packetSha256": sha(data),
            "sourceDigest": recorded["sourceDigest"],
            "overviewSha256": digest,
        }
    except (OSError, KeyError, TypeError, ValueError) as error:
        raise WorldError(f"Revision {revision} requires a valid previous packet: {error}") from error


def level_overview(canvas):
    overview = canvas.resize(
        (canvas.width // 4, canvas.height // 4), Image.Resampling.NEAREST
    )
    d = ImageDraw.Draw(overview)
    for x in range(0, canvas.width // 32, 30):
        d.line((x * 8, 0, x * 8, overview.height), fill="#c9a044", width=1)
    for y in range(0, canvas.height // 32, 17):
        d.line((0, y * 8, overview.width, y * 8), fill="#c9a044", width=1)
    return overview


def render(project, plan, name, output, revision=None):
    revision = next_revision(plan, name) if revision is None else revision
    comparison = comparison_source(plan, name, revision)
    lv = next(l for l in project["levels"] if l["identifier"] == name)
    output.mkdir(parents=True, exist_ok=True)
    art = PreviewArt()
    canvas = draw_level(lv, art)
    font = ImageFont.truetype(str(REPO / "art/source/ui/fonts/Silver.ttf"), 19)
    overview = level_overview(canvas)
    overview.save(output / "overview.png")
    before_path = output / "before-overview.png"
    if comparison["kind"] == "previous-packet":
        shutil.copyfile(REPO / comparison["packet"] / "overview.png", before_path)
        if sha(before_path.read_bytes()) != comparison["overviewSha256"]:
            raise WorldError("Previous overview changed during render; render again")
    else:
        from .project import new_project

        initial = next(l for l in new_project(plan)["levels"] if l["identifier"] == name)
        baseline = draw_level(initial, art)
        before = level_overview(baseline)
        before.save(before_path)
        before.close()
        baseline.close()
    art.close()
    images = ["overview.png", "before-overview.png"]
    for y in range(math_ceil(lv["pxHei"] / 544)):
        for x in range(math_ceil(lv["pxWid"] / 960)):
            crop = Image.new("RGBA", (960, 540), "#1a243e")
            crop.alpha_composite(
                canvas.crop((x * 960, y * 544, x * 960 + 960, y * 544 + 540))
            )
            d = ImageDraw.Draw(crop)
            d.rectangle((0, 0, 959, 24), fill="#1a243e")
            d.text(
                (8, 0),
                f"{name} [{x},{y}] | preview art; FG*=placeholder | collision + height overlay",
                font=font,
                fill="#f6deb2",
            )
            filename = f"screen-{x}-{y}.png"
            crop.save(output / filename)
            crop.close()
            images.append(filename)
    canvas.close()
    overview.close()
    manifest = {
        "level": name,
        "revision": revision,
        "comparison": comparison,
        "projectDigest": sha(project),
        "planDigest": sha(plan),
        "dependenciesDigest": dependencies(),
        "images": {f: sha((output / f).read_bytes()) for f in images},
        "screenPixels": [960, 540],
        "limitations": [
            "17 tiles are 544 art pixels; bottom four pixels are outside the 540-pixel viewport",
            "Draft Riverlands excluded",
            "Preview art and FG placeholders are not visual approval",
        ],
    }
    atomic_write(output / "render.json", manifest)
    return manifest


def math_ceil(value):
    import math

    return math.ceil(value)


def require_viewed(output, manifest):
    for name, digest in manifest["images"].items():
        p = output / name
        marker = Path(str(p) + ".viewed")
        if (
            not marker.exists()
            or marker.read_text().strip() != digest
            or sha(p.read_bytes()) != digest
        ):
            raise WorldError(
                f"Open and inspect {p}, then record its exact hash in {marker.name}"
            )


def packet(project, plan, name, work, destination, report, revision=None):
    if not destination.resolve().is_relative_to((REPO / "art/review").resolve()):
        raise WorldError("Packet output must remain under art/review")
    manifest = read(work / "render.json")
    if (
        report["status"] != "candidate"
        or report["projectDigest"] != sha(project)
        or report["planDigest"] != sha(plan)
    ):
        raise WorldError("Current map/plan QA must pass before packet")
    if report.get("dependenciesDigest") != dependencies():
        raise WorldError("QA dependencies changed; run check again")
    if (
        manifest["projectDigest"],
        manifest["planDigest"],
        manifest["dependenciesDigest"],
    ) != (sha(project), sha(plan), dependencies()):
        raise WorldError("Render receipt is stale; render and inspect again")
    revision = next_revision(plan, name) if revision is None else revision
    comparison = comparison_source(plan, name, revision)
    if (
        destination.resolve() != packet_path(plan, name, revision).resolve()
        or manifest.get("level") != name
        or manifest.get("revision") != revision
        or manifest.get("comparison") != comparison
        or "before-overview.png" not in manifest["images"]
        or (
            comparison["kind"] == "previous-packet"
            and manifest["images"]["before-overview.png"] != comparison["overviewSha256"]
        )
    ):
        raise WorldError("Before overview provenance is stale; render the requested revision and inspect again")
    require_viewed(work, manifest)
    from .project import new_project
    from .passes import apply_pass

    replay = new_project(plan)
    pass_paths = sorted((WORLD / "passes" / plan["region"]).glob("*.json"))
    for path in pass_paths:
        replay = apply_pass(replay, read(path))
    if sha(replay) != sha(project):
        raise WorldError("Committed passes do not replay to the current project")
    if destination.exists():
        raise WorldError("Refusing to overwrite a review packet; use a new revision")
    destination.mkdir(parents=True)
    source = {"path": spec()["ldtk"]["project"], "sha256": sha(project)}
    atomic_write(destination / "qa_report.json", report)
    atomic_write(destination / "render.json", manifest)
    for file in manifest["images"]:
        shutil.copyfile(work / file, destination / file)
    passes = WORLD / "passes" / plan["region"]
    shutil.copytree(passes, destination / "passes")
    (destination / "README.md").write_text(
        f"# {name}: candidate map packet, revision {revision}\n\nScope: {name}; other levels remain unfinished.\n\nBefore: {comparison.get('packet', 'initial draft from the current protected plan')}; after: current map. Exact comparison provenance is recorded in render.json and packet.json.\n\nMap source: `{source['path']}`; SHA: `{sha(project)}`. The map is referenced, not duplicated. Replay the included passes from worldforge new to reconstruct this digest.\n\nAll screen crops and before/after overviews inspected by the author; director approval is separate.\n\nPreview artwork and foreground placeholders are not approved final art. Density values are measurements, not aesthetic scores.\n",
        encoding="utf-8",
        newline="\n",
    )
    atomic_write(
        destination / "packet.json",
        {
            "schemaVersion": 2,
            "status": "candidate",
            "level": name,
            "revision": revision,
            "comparison": comparison,
            "sourceDigest": sha(project),
            "source": source,
            "dependenciesDigest": dependencies(),
            "files": {
                p.relative_to(destination).as_posix(): sha(p.read_bytes())
                for p in sorted(destination.rglob("*"))
                if p.is_file()
            },
        },
    )
    return destination
