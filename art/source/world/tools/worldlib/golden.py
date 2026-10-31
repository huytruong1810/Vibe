"""Bring-up example: compile authored Aqualia choices into an inspectable pass.

This is an offline authoring example, not new-game procedural generation.
"""

from collections import deque
from .project import (
    layers,
    sha,
    spec,
    atomic_write,
    WORLD,
    fields,
    entities,
    WorldError,
)
from .passes import apply_pass
from .checks import can_step, reachable


def example(project, plan):
    original = project
    target = plan["levels"][0]
    name = target["id"]
    w, h = target["size"]
    operations = []

    def paint(layer, value, shape):
        return {"op": "paint", "layer": layer, "value": value, "shape": shape}

    def rect(layer, value, r):
        return paint(layer, value, {"kind": "rect", "rect": r})

    def line(layer, value, points, width=1.5):
        return paint(layer, value, {"kind": "spline", "points": points, "width": width})

    def place(key, kind, at, fs, size=None):
        result = {"op": "place", "id": key, "entity": kind, "at": at, "fields": fs}
        if size:
            result["size"] = size
        return result

    def stage(ops):
        nonlocal project
        operations.extend(ops)
        project = apply_pass(
            project,
            {
                "version": 1,
                "id": "example-stage",
                "region": "aqualia",
                "level": name,
                "baseDigest": sha(project),
                "operations": ops,
            },
        )

    initial = [
        rect("ground", 1, [0, 0, w, h]),
        rect("elevation", 1, [0, 0, 26, 17]),
        rect("elevation", 2, [0, 0, 26, 5]),
    ]
    for r in target["routes"]:
        if r["kind"] in ("river", "canal"):
            initial.append(line("water", 1, r["points"], r["width"]))
            if r.get("deepWidth"):
                initial.append(line("water", 2, r["points"], r["deepWidth"]))
    # The named Hearth Island and its four bridges are explicit in AQ-2/AQ-3.
    island = {"kind": "circle", "center": [44, 41], "radius": 5}
    initial += [paint("water", 0, island), paint("ground", 2, island)]
    for r in target["routes"]:
        if r["kind"] == "path":
            initial.append(
                line(
                    "paths",
                    {"dirt": 1, "stone": 2, "boardwalk": 3, "bridge": 4}[r["surface"]],
                    r["points"],
                    2,
                )
            )
    initial += [
        line("paths", 4, [[35, 41], [53, 41]], 2),
        line("paths", 4, [[44, 33], [44, 49]], 2),
    ]
    for xy in ([20, 16], [8, 5], [7, 5]):
        initial.append(rect("collision", 2, [*xy, 1, 1]))
    stage(initial)
    lv = next(l for l in project["levels"] if l["identifier"] == name)
    data = {
        k: v["intGridCsv"] for k, v in layers(lv).items() if v["__type"] == "IntGrid"
    }
    # Preserve water under walk surfaces; represent these crossings explicitly.
    bridges = [
        rect("paths", 4, [i % w, i // w, 1, 1])
        for i, water in enumerate(data["water"])
        if water and data["paths"][i] in (1, 2)
    ]
    stage(bridges or [rect("ground", 1, [0, 0, 1, 1])])
    spawn = target["spawn"]["at"]
    placements = [
        place(
            "settlement",
            "Settlement",
            [0, 0],
            {"id": "settlement:aqualia", "name": "Aqualia", "capital": True},
            [w, h],
        ),
        place("spawn", "PlayerSpawn", spawn, {"id": "new-game"}),
    ]
    doors = {}
    for b in target["buildings"]:
        x, y = b["at"]
        bw, bh = b["footprint"]
        door = [x + bw // 2, y + bh]
        doors[b["sceneId"]] = door
        placements += [
            rect("collision", 1, [x, y, bw, bh]),
            place(
                b["sceneId"],
                "Building",
                b["at"],
                {
                    "sceneId": b["sceneId"],
                    "kind": b["kind"],
                    "settlement": "settlement:aqualia",
                    "owner": b["owner"],
                    "door": {"cx": door[0], "cy": door[1]},
                    "asset": "env:house_aqualia",
                },
                [bw, bh],
            ),
            place(
                "entrance/" + b["sceneId"],
                "Entrance",
                door,
                {"sceneId": b["sceneId"], "kind": "interior"},
            ),
        ]
    for lm in target["landmarks"]:
        placements.append(
            place(
                "landmark/" + lm["id"],
                "Landmark",
                lm["at"],
                {"id": lm["id"], "name": lm["name"]},
            )
        )
    for st in target["storySpots"]:
        placements.append(
            place(
                "story/" + st["id"],
                "StorySpot",
                st["at"],
                {"id": st["id"], "subject": st["subject"]},
            )
        )
    stage(placements)
    lv = next(l for l in project["levels"] if l["identifier"] == name)
    data = {
        k: v["intGridCsv"] for k, v in layers(lv).items() if v["__type"] == "IntGrid"
    }
    reached = reachable(data, w, h, spawn)

    def approach(at):
        candidates = sorted(
            reached, key=lambda p: (abs(p[0] - at[0]) + abs(p[1] - at[1]), p[1], p[0])
        )
        if (
            not candidates
            or abs(candidates[0][0] - at[0]) + abs(candidates[0][1] - at[1]) > 6
        ):
            raise WorldError(f"Example needs a reviewed access correction near {at}")
        return list(candidates[0])

    landmarks = {lm["id"]: lm["at"] for lm in target["landmarks"]}
    anchors = []
    for n in target["villagers"]:
        role_points = {
            "home": doors[n["home"]],
            "work": approach(landmarks[n["work"]]),
            "square": approach(landmarks[target["square"]]),
            "shrine": approach(landmarks[target["shrine"]]),
            "outpost": approach(landmarks["courier-post"]),
        }
        for role, at in role_points.items():
            anchors.append(
                place(
                    n["npcId"] + "/" + role,
                    "VillagerAnchor",
                    at,
                    {"npcId": n["npcId"], "role": role},
                )
            )
    for i, sv in enumerate(target["services"]):
        anchors.append(
            place(f"service/{i}", "Service", approach(sv["at"]), {"kind": sv["kind"]})
        )
    for lm in target["landmarks"]:
        if lm.get("entrance"):
            anchors.append(
                place(
                    "cave/" + lm["id"],
                    "Entrance",
                    approach(lm["at"]),
                    {"sceneId": lm["entrance"], "kind": "cave"},
                )
            )
    for i, habitat in enumerate(target["habitats"]):
        x, y, hw, hh = habitat["rect"]
        anchors.append(
            place(
                f"habitat/{i}",
                "Habitat",
                [x, y],
                {
                    "species": habitat["species"],
                    "density": habitat["density"],
                    "phases": habitat.get("phases", []),
                },
                [hw, hh],
            )
        )
    for i, emitter in enumerate(target["ambienceEmitters"]):
        x, y, ew, eh = emitter["rect"]
        anchors.append(
            place(
                f"ambience/{i}",
                "AmbienceEmitter",
                [x, y],
                {"set": emitter["set"], "phases": emitter.get("phases", [])},
                [ew, eh],
            )
        )
    for sc in target["screens"]:
        # An explicit placeholder establishes the intended foreground layer until C10 art exists.
        x, y = sc["cell"][0] * 30 + 2, sc["cell"][1] * 17 + 2
        anchors.append(
            place(
                f"foreground/{x}/{y}",
                "Decor",
                [x, y],
                {"asset": "placeholder:foreground:canopy", "blocks": False},
            )
        )
    stage(anchors)
    edit = {
        "version": 1,
        "id": "aqualia-village-golden-001",
        "region": "aqualia",
        "level": name,
        "baseDigest": sha(original),
        "operations": operations,
    }
    path = WORLD / "passes/aqualia/001-village.json"
    if path.exists():
        raise WorldError("Example pass already exists; replay or revise it explicitly")
    atomic_write(path, edit, create=True)
    return path
