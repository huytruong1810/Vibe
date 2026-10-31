"""Map QA: objective constraints are gates; composition measurements are evidence."""

from collections import deque
import math
from .project import entities, fields, layers, sha, spec, validate_structure, WorldError
from .passes import inside


def can_step(data, width, height, start, end, water=True, lava=False):
    x, y = end
    ax, ay = start
    if not 0 <= x < width or not 0 <= y < height:
        return False
    a, b = ay * width + ax, y * width + x
    if data["collision"][b] == 1:
        return False
    # Boardwalk/bridge are walk surfaces above the stored water layer.
    if data["water"][b] and data["paths"][b] not in (3, 4) and not water:
        return False
    delta = abs(data["elevation"][b] - data["elevation"][a])
    return (
        delta == 0
        or delta == 1
        and (data["collision"][a] == 2 or data["collision"][b] == 2)
    )


def reachable(data, width, height, start, water=False):
    if not can_step(data, width, height, start, start, water):
        return set()
    visited = {tuple(start)}
    queue = deque(visited)
    while queue:
        a = queue.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            b = a[0] + dx, a[1] + dy
            if b not in visited and can_step(data, width, height, a, b, water):
                visited.add(b)
                queue.append(b)
    return visited


def check(project, plan, selected=None):
    findings = []
    measurements = []

    def error(code, level, detail, at=None):
        findings.append(
            {"code": code, "level": level, "detail": detail, "at": at, "hard": True}
        )

    try:
        validate_structure(project)
    except WorldError as e:
        error("structure", "project", str(e))
        return {
            "status": "draft",
            "findings": findings,
            "measurements": [],
            "projectDigest": sha(project),
        }
    expected = {l["id"]: l for l in plan["levels"]}
    actual = {l["identifier"]: l for l in project["levels"]}
    if set(actual) != set(expected):
        error("levels", "project", "Project levels differ from protected plan")
    if selected and selected not in expected:
        error("level", "project", "Unknown selected level")
    if (
        sum(
            e["__identifier"] == "PlayerSpawn" and fields(e)["id"] == "new-game"
            for lv in project["levels"]
            for e in entities(lv)
        )
        != 1
    ):
        error("spawn", "project", "Exactly one new-game spawn is required")
    buildings_all = {
        fields(e)["sceneId"]
        for lv in project["levels"]
        for e in entities(lv)
        if e["__identifier"] == "Building"
    }
    for name, lv in actual.items():
        if selected and name != selected:
            continue
        if name not in expected:
            continue
        target = expected[name]
        w, h = lv["pxWid"] // 32, lv["pxHei"] // 32
        if [w, h] != target["size"] or [
            lv["worldX"] // 32,
            lv["worldY"] // 32,
        ] != target["world"]:
            error("geometry", name, "Level size/offset differs from plan")
        ls = layers(lv)
        data = {k: v["intGridCsv"] for k, v in ls.items() if v["__type"] == "IntGrid"}
        actors = entities(lv)
        by_kind = lambda kind: [e for e in actors if e["__identifier"] == kind]
        marks = {fields(e)["id"]: e for e in by_kind("Landmark")}
        if not any(data["ground"]) or any(v == 0 for v in data["ground"]):
            error("ground", name, "Every tile needs ground")
        for lm in target["landmarks"]:
            entity = marks.get(lm["id"])
            if not entity or math.dist(entity["__grid"], lm["at"]) > lm["tolerance"]:
                error(
                    "landmark", name, f"Missing/off-plan landmark {lm['id']}", lm["at"]
                )
        for sc in target["screens"]:
            subject = marks.get(sc["subject"])
            if (
                not subject
                or [subject["__grid"][0] // 30, subject["__grid"][1] // 17]
                != sc["cell"]
            ):
                error(
                    "subject",
                    name,
                    f"Screen {sc['cell']} lacks placed subject {sc['subject']}",
                )
            x0, y0 = sc["cell"][0] * 30, sc["cell"][1] * 17
            objects = [
                e
                for e in actors
                if x0 <= e["__grid"][0] < x0 + 30 and y0 <= e["__grid"][1] < y0 + 17
            ]
            middle = any(
                e["__identifier"] in ("Building", "Landmark", "Decor") for e in objects
            )
            foreground = any(
                e["__identifier"] == "Building"
                or (
                    e["__identifier"] == "Decor"
                    and fields(e)["asset"].startswith("placeholder:foreground:")
                )
                for e in objects
            )
            depth = 1 + int(middle) + int(foreground)
            if depth < sc["depth"]:
                error(
                    "depth",
                    name,
                    f"Screen {sc['cell']} provides {depth}/{sc['depth']} presentation layers",
                )
            measurements.append(
                {
                    "level": name,
                    "screen": sc["cell"],
                    "layers": depth,
                    "objects": len(objects),
                    "decorPer100Tiles": round(
                        100
                        * sum(e["__identifier"] == "Decor" for e in objects)
                        / (30 * 17),
                        3,
                    ),
                    "solidFraction": sum(
                        data["collision"][y * w + x] == 1
                        for y in range(y0, min(y0 + 17, h))
                        for x in range(x0, min(x0 + 30, w))
                    )
                    / (30 * 17),
                    "walkableFraction": sum(
                        can_step(data, w, h, (x, y), (x, y), False)
                        for y in range(y0, min(y0 + 17, h))
                        for x in range(x0, min(x0 + 30, w))
                    )
                    / (30 * 17),
                }
            )
        stories = {fields(e)["id"]: e for e in by_kind("StorySpot")}
        for story in target["storySpots"]:
            entity, subject = stories.get(story["id"]), marks.get(story["subject"])
            if (
                not entity
                or not subject
                or abs(entity["__grid"][0] - subject["__grid"][0]) > 6
                or abs(entity["__grid"][1] - subject["__grid"][1]) > 3.5
            ):
                error("story", name, f"Story window misses {story['id']}")
        starts = by_kind("PlayerSpawn")
        start = (
            starts[0]["__grid"]
            if starts
            else next((e["__grid"] for e in by_kind("Waystone")), None)
        )
        if target.get("spawn") and (
            len(starts) != 1
            or fields(starts[0])["id"] != target["spawn"]["id"]
            or starts[0]["__grid"] != target["spawn"]["at"]
        ):
            error("spawn", name, "Missing or changed authored spawn")
        reached = reachable(data, w, h, start) if start else set()
        occupied = set()
        buildings = {fields(e)["sceneId"]: e for e in by_kind("Building")}
        for b in target.get("buildings", []):
            e = buildings.get(b["sceneId"])
            if (
                not e
                or e["__grid"] != b["at"]
                or [e["width"] // 32, e["height"] // 32] != b["footprint"]
            ):
                error("building", name, f"Missing or altered building {b['sceneId']}")
        for e in by_kind("Building"):
            x, y = e["__grid"]
            ew, eh = e["width"] // 32, e["height"] // 32
            footprint = {(a, b) for a in range(x, x + ew) for b in range(y, y + eh)}
            if occupied & footprint or any(
                data["collision"][b * w + a] != 1 for a, b in footprint
            ):
                error(
                    "footprint",
                    name,
                    "Building collision overlap or missing solid footprint",
                    [x, y],
                )
            occupied |= footprint
            door = fields(e)["door"]
            pt = door["cx"], door["cy"]
            if (
                pt in footprint
                or min(abs(pt[0] - a) + abs(pt[1] - b) for a, b in footprint) != 1
                or pt not in reached
            ):
                error(
                    "door",
                    name,
                    "Door approach must be adjacent, outside footprint, and reachable",
                    list(pt),
                )
        for e in (
            by_kind("Entrance")
            + by_kind("Service")
            + by_kind("VillagerAnchor")
            + by_kind("Waystone")
        ):
            if tuple(e["__grid"]) not in reached:
                error(
                    "reachability",
                    name,
                    f"Unreachable {e['__identifier']}",
                    e["__grid"],
                )
            if (
                e["__identifier"] == "Entrance"
                and fields(e)["kind"] == "interior"
                and fields(e)["sceneId"] not in buildings_all
            ):
                error("reference", name, "Entrance references absent building")
        anchors = {
            (fields(e)["npcId"], fields(e)["role"]): e
            for e in by_kind("VillagerAnchor")
        }
        for npc in target.get("villagers", []):
            for role in ("home", "work", "square", "shrine", "outpost"):
                if (npc["npcId"], role) not in anchors:
                    error("anchor", name, f"Missing {npc['npcId']}:{role}")
        for e in by_kind("Decor"):
            if (
                fields(e)["blocks"]
                and data["collision"][e["__grid"][1] * w + e["__grid"][0]] != 1
            ):
                error(
                    "collision",
                    name,
                    "Blocking decoration lacks solid collision",
                    e["__grid"],
                )
        for e in by_kind("FestivalRoute"):
            for p in fields(e)["points"]:
                x, y = p["cx"], p["cy"]
                if (
                    x >= w
                    or y >= h
                    or not (data["water"][y * w + x] or data["paths"][y * w + x])
                ):
                    error(
                        "festival",
                        name,
                        "Festival waypoint is not on water or path",
                        [x, y],
                    )
        for i, water in enumerate(data["water"]):
            if water and data["paths"][i] not in (0, 3, 4):
                error(
                    "crossing",
                    name,
                    "Water crossing lacks bridge/boardwalk",
                    [i % w, i // w],
                )
        for zone in target["zones"]:
            tiles = [
                (x, y)
                for y in range(h)
                for x in range(w)
                if inside(x + 0.5, y + 0.5, zone["polygon"])
            ]
            decor = sum(
                1 for e in by_kind("Decor") if inside(*e["__grid"], zone["polygon"])
            )
            measurements.append(
                {
                    "level": name,
                    "zone": zone["id"],
                    "plannedDensity": zone["density"],
                    "decorPer100Tiles": round(100 * decor / max(1, len(tiles)), 3),
                    "solidFraction": sum(
                        data["collision"][y * w + x] == 1 for x, y in tiles
                    )
                    / max(1, len(tiles)),
                    "walkableFraction": sum(
                        can_step(data, w, h, (x, y), (x, y), False) for x, y in tiles
                    )
                    / max(1, len(tiles)),
                }
            )
    if not selected:
        for left in project["levels"]:
            for right in project["levels"]:
                if left["worldX"] + left["pxWid"] != right["worldX"]:
                    continue
                lo, hi = (
                    max(left["worldY"], right["worldY"]) // 32,
                    min(
                        left["worldY"] + left["pxHei"], right["worldY"] + right["pxHei"]
                    )
                    // 32,
                )
                a, b = layers(left), layers(right)
                aw, bw = left["pxWid"] // 32, right["pxWid"] // 32
                for y in range(lo, hi):
                    ai = (y - left["worldY"] // 32) * aw + aw - 1
                    bi = (y - right["worldY"] // 32) * bw
                    if a["paths"]["intGridCsv"][ai] or b["paths"]["intGridCsv"][bi]:
                        delta = abs(
                            a["elevation"]["intGridCsv"][ai]
                            - b["elevation"]["intGridCsv"][bi]
                        )
                        if (
                            not (
                                a["paths"]["intGridCsv"][ai]
                                and b["paths"]["intGridCsv"][bi]
                            )
                            or not (
                                delta == 0
                                or delta == 1
                                and 2
                                in (
                                    a["collision"]["intGridCsv"][ai],
                                    b["collision"]["intGridCsv"][bi],
                                )
                            )
                            or a["collision"]["intGridCsv"][ai] == 1
                            or b["collision"]["intGridCsv"][bi] == 1
                        ):
                            error(
                                "seam",
                                left["identifier"],
                                "Adjacent level path ends do not connect",
                                [aw - 1, y - left["worldY"] // 32],
                            )
    from .review import dependencies

    return {
        "schemaVersion": 1,
        "dependenciesDigest": dependencies(),
        "status": "candidate" if not findings else "draft",
        "scope": selected or "region",
        "unfinishedLevels": [name for name in actual if selected and name != selected],
        "projectDigest": sha(project),
        "planDigest": sha(plan),
        "findings": findings,
        "measurements": measurements,
        "limitations": [
            "Composition and density require director review",
            "Foreground placeholders are not approved art",
        ],
    }
