"""Canonical LDtk storage. Domain meanings come exclusively from world_schema.json."""

from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import tempfile
import uuid
from contextlib import contextmanager
from jsonschema import Draft7Validator

WORLD = Path(__file__).resolve().parents[2]
REPO = WORLD.parents[2]
SPEC = WORLD / "spec/world_schema.json"
PROJECT = WORLD / "hearthwild.ldtk"
WORK = WORLD / "work"


class WorldError(ValueError):
    pass


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def canonical(value):
    return (
        json.dumps(value, sort_keys=True, indent=2, ensure_ascii=False) + "\n"
    ).encode()


def sha(value):
    return hashlib.sha256(
        value if isinstance(value, bytes) else canonical(value)
    ).hexdigest()


def spec():
    return read(SPEC)


def official():
    s = spec()
    path = WORLD / "spec" / s["ldtk"]["jsonSchema"]
    if sha(path.read_bytes()) != s["ldtk"]["jsonSchemaSha256"]:
        raise WorldError("Pinned LDtk schema digest mismatch")
    return read(path)


def blank(name):
    """Fill official required fields, then callers assign semantic values."""
    document = official()

    def build(node):
        if "$ref" in node:
            ref = document
            for key in node["$ref"][2:].split("/"):
                ref = ref[key]
            return build(ref)
        if "enum" in node:
            return node["enum"][0]
        for key in ("oneOf", "anyOf"):
            if key in node:
                return build(node[key][0])
        kind = node.get("type", ["null"])
        kind = kind[0] if isinstance(kind, list) else kind
        if kind == "object":
            return {k: build(node["properties"][k]) for k in node.get("required", [])}
        return {
            "array": [],
            "string": "",
            "integer": 0,
            "number": 0,
            "boolean": False,
        }.get(kind)

    return build(
        document["LdtkJsonRoot"] if name == "root" else document["otherTypes"][name]
    )


def iid(value):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "hearthwild/world/" + value))


def field_type(definition):
    t = definition["type"]
    item = t[6:-1] if t.startswith("array<") else t
    base = {"int": "Int", "float": "Float", "bool": "Bool", "point": "Point"}.get(
        item, "String"
    )
    return (f"Array<{base}>" if t.startswith("array<") else base), "F_" + base


def new_project(plan):
    s = spec()
    uid = 0

    def number():
        nonlocal uid
        uid += 1
        return uid

    def field(name, definition):
        row = blank("FieldDef")
        kind, native = field_type(definition)
        row.update(
            identifier=name,
            uid=number(),
            __type=kind,
            type=native,
            isArray=definition["type"].startswith("array<"),
            canBeNull=not definition.get("required", False),
            editorDisplayMode="NameAndValue",
            editorDisplayPos="Above",
            editorDisplayScale=1,
        )
        return row

    project = blank("root")
    project.update(
        iid=iid("project"),
        dummyWorldIid=iid("world"),
        jsonVersion="1.5.3",
        bgColor="#1a243e",
        defaultLevelBgColor="#1a243e",
        defaultGridSize=32,
        defaultEntityWidth=32,
        defaultEntityHeight=32,
        worldLayout="Free",
        externalLevels=False,
    )
    defs = blank("Definitions")
    defs["levelFields"] = [field(k, d) for k, d in s["levelFields"].items()]
    for name, definition in s["entities"].items():
        row = blank("EntityDef")
        row.update(
            identifier=name,
            uid=number(),
            width=32,
            height=32,
            pivotX=0,
            pivotY=0,
            color="#c9a044",
            renderMode="Rectangle",
            resizableX=definition["size"] == "area",
            resizableY=definition["size"] == "area",
            fieldDefs=[field(k, d) for k, d in definition["fields"].items()],
        )
        defs["entities"].append(row)
    for layer in s["layers"]:
        row = blank("LayerDef")
        row.update(
            identifier=layer["id"],
            uid=number(),
            type=layer["type"],
            __type=layer["type"],
            gridSize=32,
            displayOpacity=1,
            parallaxFactorX=1,
            parallaxFactorY=1,
        )
        row["intGridValues"] = []
        for value in layer.get("values", []):
            v = blank("IntGridValueDef")
            v.update(value=value["value"], identifier=value["id"], color=value["color"])
            row["intGridValues"].append(v)
        defs["layers"].append(row)
    project["defs"] = defs
    for lv in plan["levels"]:
        w, h = lv["size"]
        level = blank("Level")
        level.update(
            identifier=lv["id"],
            iid=iid(lv["id"]),
            uid=number(),
            pxWid=w * 32,
            pxHei=h * 32,
            worldX=lv["world"][0] * 32,
            worldY=lv["world"][1] * 32,
            __bgColor="#1a243e",
            __smartColor="#1a243e",
        )
        level["fieldInstances"] = [
            instance_field(
                f,
                lv[f["identifier"]] if f["identifier"] != "region" else plan["region"],
            )
            for f in defs["levelFields"]
        ]
        level["layerInstances"] = []
        for name in s["layerOrder"]:
            definition = next(d for d in defs["layers"] if d["identifier"] == name)
            layer = blank("LayerInstance")
            layer.update(
                __identifier=name,
                __type=definition["type"],
                __gridSize=32,
                __cWid=w,
                __cHei=h,
                __opacity=1,
                iid=iid(lv["id"] + "/" + name),
                layerDefUid=definition["uid"],
                levelId=level["uid"],
                visible=True,
                intGridCsv=[0] * (w * h) if definition["type"] == "IntGrid" else [],
            )
            level["layerInstances"].append(layer)
        project["levels"].append(level)
    project["nextUid"] = uid + 1
    validate_structure(project)
    return project


def instance_field(definition, value):
    row = blank("FieldInstance")
    row.update(
        __identifier=definition["identifier"],
        __type=definition["__type"],
        __value=value,
        defUid=definition["uid"],
    )
    return row


def fields(entity):
    return {f["__identifier"]: f["__value"] for f in entity["fieldInstances"]}


def layers(level):
    return {layer["__identifier"]: layer for layer in level["layerInstances"]}


def entities(level):
    return [e for layer in level["layerInstances"] for e in layer["entityInstances"]]


def validate_fields(values, definitions, region):
    if set(values) - set(definitions):
        raise WorldError("Unknown entity field")
    s = spec()
    for name, d in definitions.items():
        if name not in values:
            if d.get("required"):
                raise WorldError(f"Missing field {name}")
            continue
        value = values[name]
        t = d["type"]
        allowed = d.get("values") or s["enums"].get(d.get("ref"), [])
        if isinstance(allowed, dict):
            allowed = allowed.get(region, [])
        if t.startswith("array<"):
            if not isinstance(value, list) or len(value) < d.get("minItems", 0):
                raise WorldError(f"Invalid array {name}")
            inner = {**d, "type": t[6:-1], "required": True}
            for item in value:
                validate_fields({name: item}, {name: inner}, region)
        elif t == "point":
            if (
                not isinstance(value, dict)
                or set(value) != {"cx", "cy"}
                or any(type(v) is not int or v < 0 for v in value.values())
            ):
                raise WorldError(f"Invalid point {name}")
        elif t in ("int", "float"):
            if type(value) not in ((int,) if t == "int" else (int, float)) or not d.get(
                "min", -1e9
            ) <= value <= d.get("max", 1e9):
                raise WorldError(f"Invalid number {name}")
        elif t == "bool":
            if type(value) is not bool:
                raise WorldError(f"Invalid boolean {name}")
        else:
            if not isinstance(value, str) or not value or len(value) > 500:
                raise WorldError(f"Invalid string {name}")
            import re

            if d.get("pattern") and not re.fullmatch(d["pattern"], value):
                raise WorldError(f"Invalid identifier {name}: {value}")
            if t in ("npcId", "itemId", "speciesId"):
                allowed = s["enums"].get(t, [])
                if t == "itemId":
                    # The world contract explicitly references this exported literal.
                    source = (REPO / "src/content/definitions.ts").read_text(
                        encoding="utf-8"
                    )
                    match = re.search(
                        r"export const itemIds\s*=\s*(\[.*?\])\s*as const", source, re.S
                    )
                    if not match:
                        raise WorldError("Cannot resolve canonical itemIds literal")
                    import ast

                    allowed = ast.literal_eval(match[1])
                if isinstance(allowed, dict):
                    allowed = allowed.get(region, [])
            if allowed and value not in allowed:
                raise WorldError(f"Unknown {name}: {value}")


def validate_structure(project):
    errors = sorted(
        Draft7Validator(official()).iter_errors(project), key=lambda e: str(e.path)
    )
    if errors:
        raise WorldError(f"LDtk schema: {list(errors[0].path)}: {errors[0].message}")
    s = spec()
    ids = set()
    level_ids = set()
    semantic_ids = set()
    if (
        project["jsonVersion"] != "1.5.3"
        or project.get("worldLayout") != "Free"
        or project["externalLevels"]
        or project["defaultGridSize"] != 32
    ):
        raise WorldError("Unexpected LDtk project settings")
    if {d["identifier"] for d in project["defs"]["layers"]} != {
        d["id"] for d in s["layers"]
    } or {d["identifier"] for d in project["defs"]["entities"]} != set(s["entities"]):
        raise WorldError("Definitions differ from world contract")
    buildings = {
        fields(e).get("sceneId")
        for lv in project["levels"]
        for e in entities(lv)
        if e["__identifier"] == "Building"
    }
    settlements = {
        fields(e).get("id")
        for lv in project["levels"]
        for e in entities(lv)
        if e["__identifier"] == "Settlement"
    }
    for level in project["levels"]:
        if (
            level["identifier"] in level_ids
            or level["pxWid"] <= 0
            or level["pxHei"] <= 0
            or any(level[k] % 32 for k in ("pxWid", "pxHei", "worldX", "worldY"))
        ):
            raise WorldError("Duplicate level or non-grid level geometry")
        level_ids.add(level["identifier"])
        region = fields(level)["region"]
        validate_fields(fields(level), s["levelFields"], region)
        w, h = level["pxWid"] // 32, level["pxHei"] // 32
        actual = layers(level)
        required = {d["id"] for d in s["layers"] if d.get("required")}
        if (
            not required.issubset(actual)
            or list(actual) != [k for k in s["layerOrder"] if k in actual]
            or len(actual) != len(level["layerInstances"])
        ):
            raise WorldError("Required layer order mismatch")
        for definition in s["layers"]:
            if definition["id"] not in actual:
                continue
            layer = actual[definition["id"]]
            if (
                layer["__cWid"],
                layer["__cHei"],
                layer["__gridSize"],
                layer["__type"],
            ) != (w, h, 32, definition["type"]):
                raise WorldError("Layer dimensions/type mismatch")
            if definition["type"] == "IntGrid":
                allowed = {0} | {v["value"] for v in definition["values"]}
                if len(layer["intGridCsv"]) != w * h or any(
                    type(v) is not int or v not in allowed for v in layer["intGridCsv"]
                ):
                    raise WorldError(f"Invalid IntGrid {definition['id']}")
            for e in layer["entityInstances"]:
                if e["iid"] in ids:
                    raise WorldError("Duplicate entity identity")
                ids.add(e["iid"])
                kind = e["__identifier"]
                if kind not in definition.get("entities", []):
                    raise WorldError(f"Entity {kind} on wrong layer")
                validate_fields(fields(e), s["entities"][kind]["fields"], region)
                d = next(
                    d for d in project["defs"]["entities"] if d["identifier"] == kind
                )
                expected_fields = {f["identifier"]: f for f in d["fieldDefs"]}
                if (
                    e["defUid"] != d["uid"]
                    or len(fields(e)) != len(e["fieldInstances"])
                    or any(
                        f["defUid"]
                        != expected_fields.get(f["__identifier"], {}).get("uid")
                        or f["__type"] != expected_fields[f["__identifier"]]["__type"]
                        for f in e["fieldInstances"]
                    )
                ):
                    raise WorldError("Entity definition/field registration mismatch")
                f = fields(e)
                key = (
                    kind,
                    f.get(
                        "sceneId",
                        f.get(
                            "id",
                            (
                                (f.get("npcId"), f.get("role"))
                                if kind == "VillagerAnchor"
                                else None
                            ),
                        ),
                    ),
                )
                if key[1] is not None and key in semantic_ids:
                    raise WorldError("Duplicate semantic identifier")
                semantic_ids.add(key)
                if kind == "Building" and f["settlement"] not in settlements:
                    raise WorldError("Building references absent settlement")
                if (
                    kind == "Entrance"
                    and f["kind"] == "interior"
                    and f["sceneId"] not in buildings
                ):
                    raise WorldError("Entrance references absent building")
                if kind == "Entrance" and f["kind"] == "cave":
                    plan = read(WORLD / f"regions/{region}.plan.json")
                    allowed_caves = {
                        m.get("entrance")
                        for l in plan["levels"]
                        for m in l["landmarks"]
                        if m.get("entrance")
                    }
                    if f["sceneId"] not in allowed_caves:
                        raise WorldError(
                            "Cave entrance references an unknown planned scene"
                        )
                if kind == "StorySpot" and f["subject"] not in {
                    fields(o)["id"]
                    for o in entities(level)
                    if o["__identifier"] == "Landmark"
                }:
                    raise WorldError("StorySpot references absent subject")
                x, y = e["__grid"]
                if (
                    min(x, y) < 0
                    or min(e["width"], e["height"]) <= 0
                    or e["width"] % 32
                    or e["height"] % 32
                    or x + e["width"] / 32 > w
                    or y + e["height"] / 32 > h
                    or e["px"] != [x * 32, y * 32]
                ):
                    raise WorldError(
                        "Entity outside level or grid registration mismatch"
                    )


def atomic_write(path, value, create=False):
    path = Path(path)
    if create and path.exists():
        raise WorldError(f"Refusing overwrite: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as f:
        temporary = Path(f.name)
        f.write(canonical(value))
        f.flush()
        os.fsync(f.fileno())
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def project_lock(path):
    lock = (
        WORK / "project.lock"
        if Path(path).resolve() == PROJECT.resolve()
        else Path(str(path) + ".lock")
    )
    lock.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        raise WorldError(
            f"Project authoring lock exists: {lock}; inspect the owner before removing a stale lock"
        ) from None
    try:
        os.write(fd, str(os.getpid()).encode())
        os.close(fd)
        yield
    finally:
        lock.unlink(missing_ok=True)
