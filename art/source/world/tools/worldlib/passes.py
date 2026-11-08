"""Strict, atomic authoring transactions; completion QA is intentionally separate."""

import copy
import math
import random
import re
from .project import (
    WorldError,
    atomic_write,
    blank,
    canonical,
    fields,
    iid,
    instance_field,
    layers,
    read,
    sha,
    spec,
    validate_structure,
    project_lock,
    entities,
)


def exact(value, required, optional=()):
    if (
        not isinstance(value, dict)
        or set(value) - set(required) - set(optional)
        or set(required) - set(value)
    ):
        raise WorldError(
            f"Expected fields {required}; got {list(value) if isinstance(value, dict) else type(value)}"
        )


def integer(value, low=0):
    if type(value) is not int or value < low:
        raise WorldError("Expected nonnegative integer")
    return value


def point(value):
    if (
        not isinstance(value, list)
        or len(value) != 2
        or any(type(x) not in (int, float) or not math.isfinite(x) for x in value)
    ):
        raise WorldError("Expected finite coordinate pair")
    return value


def inside(x, y, polygon):
    odd = False
    for a, b in zip(polygon, polygon[1:] + polygon[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (
            b[1] - a[1]
        ) + a[0]:
            odd = not odd
    return odd


def cells(shape, width, height):
    kind = shape.get("kind")
    if kind == "rect":
        exact(shape, ("kind", "rect"))
        rect = shape["rect"]
        if not isinstance(rect, list) or len(rect) != 4:
            raise WorldError("Invalid rectangle")
        x, y, w, h = rect
        for v in rect:
            integer(v)
        if not w or not h or x + w > width or y + h > height:
            raise WorldError("Rectangle outside level")
        return [(a, b) for b in range(y, y + h) for a in range(x, x + w)]
    if kind == "circle":
        exact(shape, ("kind", "center", "radius"))
        cx, cy = point(shape["center"])
        radius = shape["radius"]
        if (
            type(radius) not in (int, float)
            or not math.isfinite(radius)
            or radius <= 0
            or min(cx - radius, cy - radius) < 0
            or cx + radius > width
            or cy + radius > height
        ):
            raise WorldError("Circle outside level")
        predicate = lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= radius**2
    elif kind in ("polygon", "spline"):
        exact(shape, ("kind", "points"), ("width",) if kind == "spline" else ())
        ps = shape["points"]
        if not isinstance(ps, list) or len(ps) < (3 if kind == "polygon" else 2):
            raise WorldError("Insufficient shape points")
        for p in ps:
            x, y = point(p)
            if not 0 <= x <= width or not 0 <= y <= height:
                raise WorldError("Shape outside level")
        if kind == "polygon":
            predicate = lambda x, y: inside(x, y, ps)
        else:
            thickness = shape.get("width")
            if (
                type(thickness) not in (int, float)
                or not math.isfinite(thickness)
                or not 0 < thickness <= 32
            ):
                raise WorldError("Invalid spline width")

            def predicate(x, y):
                for a, b in zip(ps, ps[1:]):
                    dx, dy = b[0] - a[0], b[1] - a[1]
                    t = (
                        max(
                            0,
                            min(
                                1,
                                ((x - a[0]) * dx + (y - a[1]) * dy)
                                / (dx * dx + dy * dy),
                            ),
                        )
                        if dx or dy
                        else 0
                    )
                    if (x - a[0] - t * dx) ** 2 + (y - a[1] - t * dy) ** 2 <= (
                        thickness / 2
                    ) ** 2:
                        return True
                return False

    else:
        raise WorldError("Unknown paint shape")
    return [
        (x, y)
        for y in range(height)
        for x in range(width)
        if predicate(x + 0.5, y + 0.5)
    ]


def place(project, level, op):
    exact(op, ("op", "id", "entity", "at", "fields"), ("size", "replace"))
    if type(op.get("replace", False)) is not bool:
        raise WorldError("replace must be a boolean")
    if not isinstance(op["id"], str) or not re.fullmatch(
        r"[A-Za-z0-9:_/-]{1,160}", op["id"]
    ):
        raise WorldError("Invalid semantic placement ID")
    definition = next(
        (d for d in project["defs"]["entities"] if d["identifier"] == op["entity"]),
        None,
    )
    if not definition:
        raise WorldError("Unknown entity type")
    at = point(op["at"])
    for v in at:
        integer(v)
    size = point(op.get("size", [1, 1]))
    for v in size:
        integer(v, 1)
    if spec()["entities"][op["entity"]]["size"] == "point" and size != [1, 1]:
        raise WorldError("Point entity cannot have an area")
    e = blank("EntityInstance")
    identifier = iid(level["identifier"] + "/" + op["id"])
    e.update(
        __identifier=op["entity"],
        iid=identifier,
        __grid=at,
        px=[n * 32 for n in at],
        width=size[0] * 32,
        height=size[1] * 32,
        __pivot=[0, 0],
        __smartColor="#c9a044",
        defUid=definition["uid"],
    )
    definitions = {d["identifier"]: d for d in definition["fieldDefs"]}
    if set(op["fields"]) - set(definitions):
        raise WorldError("Unknown placement field")
    e["fieldInstances"] = [
        instance_field(definitions[k], v) for k, v in sorted(op["fields"].items())
    ]
    target = layers(level)["decoration" if op["entity"] == "Decor" else "entities"]
    previous = next(
        (
            row
            for layer in level["layerInstances"]
            for row in layer["entityInstances"]
            if row["iid"] == identifier
        ),
        None,
    )
    if previous:
        if not op.get("replace") or previous["__identifier"] != op["entity"]:
            raise WorldError(
                "Duplicate placement ID; explicit same-kind replacement required"
            )
        target["entityInstances"].remove(previous)
    elif op.get("replace"):
        raise WorldError("Cannot replace an absent entity")
    target["entityInstances"].append(e)


def apply_pass(project, edit):
    exact(edit, ("version", "id", "region", "level", "baseDigest", "operations"))
    if (
        edit["version"] != 1
        or not isinstance(edit["id"], str)
        or not re.fullmatch(r"[a-z0-9-]{1,100}", edit["id"])
    ):
        raise WorldError("Invalid pass version/ID")
    if edit["baseDigest"] != sha(project):
        raise WorldError("Stale pass base digest; regenerate against current project")
    if (
        not isinstance(edit["operations"], list)
        or not 1 <= len(edit["operations"]) <= 10000
    ):
        raise WorldError("Invalid operation budget")
    result = copy.deepcopy(project)
    level = next(
        (l for l in result["levels"] if l["identifier"] == edit["level"]), None
    )
    if not level or fields(level)["region"] != edit["region"]:
        raise WorldError("Unknown level/region")
    w, h = level["pxWid"] // 32, level["pxHei"] // 32
    for op in edit["operations"]:
        if not isinstance(op, dict):
            raise WorldError("Invalid operation")
        if op.get("op") == "paint":
            exact(op, ("op", "layer", "value", "shape"))
            layer = layers(level).get(op["layer"])
            if not layer or layer["__type"] != "IntGrid":
                raise WorldError("Paint requires an IntGrid layer")
            for x, y in cells(op["shape"], w, h):
                layer["intGridCsv"][y * w + x] = op["value"]
        elif op.get("op") == "place":
            place(result, level, op)
        elif op.get("op") == "scatter":
            exact(op, ("op", "id", "shape", "seed", "density", "spacing", "asset"))
            integer(op["seed"])
            density, spacing = op["density"], op["spacing"]
            if (
                type(density) not in (int, float)
                or not 0 <= density <= 1
                or type(spacing) not in (int, float)
                or not 1 <= spacing <= 64
            ):
                raise WorldError("Invalid scatter density/spacing")
            candidates = cells(op["shape"], w, h)
            rng = random.Random(op["seed"])
            rng.shuffle(candidates)
            grid = {}
            for e in entities(level):
                if e["__identifier"] == "Decor":
                    ex, ey = e["__grid"]
                    grid.setdefault(
                        (math.floor(ex / spacing), math.floor(ey / spacing)), []
                    ).append((ex, ey))
            reserved = {
                tuple(e["__grid"])
                for e in entities(level)
                if e["__identifier"] != "Decor"
            }
            target = math.floor(len(candidates) * density)
            count = 0
            for x, y in candidates:
                if count >= target:
                    break
                if (
                    (x, y) in reserved
                    or layers(level)["collision"]["intGridCsv"][y * w + x]
                    or layers(level)["paths"]["intGridCsv"][y * w + x]
                ):
                    continue
                gx, gy = math.floor(x / spacing), math.floor(y / spacing)
                if any(
                    (x - px) ** 2 + (y - py) ** 2 < spacing**2
                    for a in range(gx - 1, gx + 2)
                    for b in range(gy - 1, gy + 2)
                    for px, py in grid.get((a, b), [])
                ):
                    continue
                place(
                    result,
                    level,
                    {
                        "op": "place",
                        "id": f"{op['id']}/{count}",
                        "entity": "Decor",
                        "at": [x, y],
                        "fields": {"asset": op["asset"], "blocks": False},
                    },
                )
                grid.setdefault((gx, gy), []).append((x, y))
                count += 1
        else:
            raise WorldError("Unknown pass operation")
    validate_structure(result)
    # Semantic references may be authored later, but no supplied identifier may be invalid.
    for lv in result["levels"]:
        seen = set()
        for layer in lv["layerInstances"]:
            for e in layer["entityInstances"]:
                f = fields(e)
                key = (e["__identifier"], f.get("sceneId", f.get("id")))
                if key[1] and key in seen:
                    raise WorldError("Duplicate semantic entity identifier")
                seen.add(key)
    return result


def apply_file(path, edit_path):
    with project_lock(path):
        original = read(path)
        result = apply_pass(original, read(edit_path))
        atomic_write(path, result)
    return result
