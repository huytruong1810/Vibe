"""Behavior tests: python -B -m unittest discover -s art/source/world/tools/worldlib -p worldforge_selftest.py."""

import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from worldlib.project import *
from worldlib.passes import apply_pass, apply_file, cells
from worldlib.checks import check, can_step, reachable
from worldlib.review import require_viewed, packet


class Authoring(unittest.TestCase):
    def test_review_packet_file_hashes_are_portable(self):
        folder = REPO / "art/review/world-aqualia-aqualia_village-1"
        manifest = read(folder / "packet.json")
        for name, digest in manifest["files"].items():
            data = (folder / name).read_bytes()
            self.assertEqual(sha(data), digest, name)
            if name.endswith((".md", ".json", ".ldtk")):
                self.assertNotIn(b"\r\n", data, name)

    def test_next_recognizes_published_packet(self):
        from worldlib.cli import main
        from contextlib import redirect_stdout
        from unittest.mock import patch
        import io

        output = io.StringIO()
        recorded = read(REPO / "art/review/world-aqualia-aqualia_village-1/packet.json")
        # Isolate recognition from unrelated atlas rebuilds; stale dependency
        # rejection is tested separately by the packet receipt tests.
        with redirect_stdout(output), patch(
            "worldlib.cli.dependencies", return_value=recorded["dependenciesDigest"]
        ):
            self.assertEqual(
                main(["next", "--region", "aqualia", "--level", "aqualia_village"]), 0
            )
        self.assertIn("director review", output.getvalue())

    @classmethod
    def setUpClass(cls):
        cls.plan = read(WORLD / "regions/aqualia.plan.json")
        cls.empty = new_project(cls.plan)
        p = cls.empty
        for path in sorted((WORLD / "passes/aqualia").glob("*.json")):
            p = apply_pass(p, read(path))
        cls.authored = p

    def edit(self, p, operations):
        return {
            "version": 1,
            "id": "test-case",
            "region": "aqualia",
            "level": "aqualia_village",
            "baseDigest": sha(p),
            "operations": operations,
        }

    def test_repeatable_native_schema_and_roundtrip(self):
        self.assertEqual(canonical(self.empty), canonical(new_project(self.plan)))
        validate_structure(read(PROJECT))
        self.assertEqual(sha(self.authored), sha(read(PROJECT)))
        validate_structure(json.loads(canonical(self.empty)))

    def test_complete_village_does_not_certify_riverlands(self):
        report = check(self.authored, self.plan, "aqualia_village")
        self.assertEqual(report["findings"], [])
        self.assertEqual(report["unfinishedLevels"], ["aqualia_riverlands"])
        self.assertEqual(check(self.authored, self.plan)["status"], "draft")

    def test_failed_pass_leaves_file_identical(self):
        with tempfile.TemporaryDirectory() as tmp:
            project, edit = Path(tmp) / "map.ldtk", Path(tmp) / "pass.json"
            atomic_write(project, self.empty)
            before = project.read_bytes()
            for change in [
                self.edit(
                    self.empty,
                    [
                        {
                            "op": "paint",
                            "layer": "ground",
                            "value": 99,
                            "shape": {"kind": "rect", "rect": [0, 0, 1, 1]},
                        }
                    ],
                ),
                {**self.edit(self.empty, []), "baseDigest": "stale"},
                {**self.edit(self.empty, []), "unknown": True},
            ]:
                atomic_write(edit, change)
                with self.assertRaises(WorldError):
                    apply_file(project, edit)
                self.assertEqual(project.read_bytes(), before)

    def test_project_lock_rejects_concurrent_writer(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "map.ldtk"
            with project_lock(p):
                with self.assertRaises(WorldError):
                    with project_lock(p):
                        pass

    def test_shapes_and_out_of_bounds(self):
        self.assertEqual(
            cells({"kind": "rect", "rect": [1, 2, 2, 1]}, 8, 8), [(1, 2), (2, 2)]
        )
        self.assertTrue(cells({"kind": "circle", "center": [4, 4], "radius": 2}, 8, 8))
        self.assertTrue(
            cells({"kind": "polygon", "points": [[1, 1], [5, 1], [3, 5]]}, 8, 8)
        )
        self.assertTrue(
            cells({"kind": "spline", "points": [[1, 1], [5, 5]], "width": 2}, 8, 8)
        )
        with self.assertRaises(WorldError):
            cells({"kind": "rect", "rect": [7, 7, 2, 2]}, 8, 8)

    def test_scatter_is_seeded_and_spaced(self):
        op = {
            "op": "scatter",
            "id": "trees",
            "shape": {"kind": "rect", "rect": [0, 0, 15, 15]},
            "seed": 42,
            "density": 0.2,
            "spacing": 3,
            "asset": "env:tree_oak",
        }
        a = apply_pass(self.empty, self.edit(self.empty, [op]))
        b = apply_pass(self.empty, self.edit(self.empty, [op]))
        self.assertEqual(a, b)
        points = [e["__grid"] for e in entities(a["levels"][0])]
        for i, p in enumerate(points):
            for q in points[i + 1 :]:
                self.assertGreaterEqual((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2, 9)

    def test_missing_subject_and_off_plan_landmark(self):
        p = copy.deepcopy(self.authored)
        mark = next(
            e for e in entities(p["levels"][0]) if e["__identifier"] == "Landmark"
        )
        mark["__grid"] = [89, 67]
        mark["px"] = [89 * 32, 67 * 32]
        self.assertIn(
            "landmark",
            {f["code"] for f in check(p, self.plan, "aqualia_village")["findings"]},
        )
        for layer in p["levels"][0]["layerInstances"]:
            layer["entityInstances"] = [
                e
                for e in layer["entityInstances"]
                if e["__identifier"] not in ("Landmark", "StorySpot")
            ]
        self.assertIn(
            "subject",
            {f["code"] for f in check(p, self.plan, "aqualia_village")["findings"]},
        )

    def test_blocked_door(self):
        p = copy.deepcopy(self.authored)
        door = next(
            e for e in entities(p["levels"][0]) if e["__identifier"] == "Entrance"
        )["__grid"]
        layers(p["levels"][0])["collision"]["intGridCsv"][door[1] * 90 + door[0]] = 1
        self.assertIn(
            "door",
            {f["code"] for f in check(p, self.plan, "aqualia_village")["findings"]},
        )

    def test_disconnected_bridge_and_missing_ramp(self):
        for layer in ("paths", "collision"):
            p = copy.deepcopy(self.authored)
            data = layers(p["levels"][0])[layer]["intGridCsv"]
            data[:] = [0 if layer == "paths" or v == 2 else v for v in data]
            self.assertNotEqual(
                check(p, self.plan, "aqualia_village")["status"], "candidate"
            )

    def test_unknown_references_rejected(self):
        op = {
            "op": "place",
            "id": "bad",
            "entity": "Entrance",
            "at": [2, 2],
            "fields": {"sceneId": "missing", "kind": "interior"},
        }
        with self.assertRaises(WorldError):
            apply_pass(self.empty, self.edit(self.empty, [op]))

    def test_explicit_replacement_preserves_identity(self):
        op = {
            "op": "place",
            "id": "landmark/spring-shrine",
            "entity": "Landmark",
            "at": [16, 9],
            "fields": {"id": "spring-shrine", "name": "Spring Shrine"},
            "replace": True,
        }
        result = apply_pass(self.authored, self.edit(self.authored, [op]))
        entity = next(
            e
            for e in entities(result["levels"][0])
            if e["__identifier"] == "Landmark" and fields(e)["id"] == "spring-shrine"
        )
        self.assertEqual(entity["iid"], iid("aqualia_village/landmark/spring-shrine"))
        self.assertEqual(entity["__grid"], [16, 9])
        del op["replace"]
        with self.assertRaises(WorldError):
            apply_pass(self.authored, self.edit(self.authored, [op]))

    def test_shared_traversal_cases(self):
        for case in read(REPO / "tests/fixtures/world-traversal.json"):
            data = {k: [0] * 1024 for k in ("collision", "paths", "water", "elevation")}
            for key, kind, value in [
                ("solid", "collision", 1),
                ("ramps", "collision", 2),
                ("fluid", "water", 1),
                ("bridges", "paths", 4),
            ]:
                for x, y in case.get(key, []):
                    data[kind][y * 32 + x] = value
            for x, y, z in case.get("heights", []):
                data["elevation"][y * 32 + x] = z
            self.assertEqual(
                can_step(data, 32, 32, case["from"], case["to"], case["water"]),
                case["expected"],
                case["name"],
            )
        data = {k: [0] * 4 for k in ("collision", "paths", "water", "elevation")}
        data["collision"] = [0, 1, 1, 0]
        self.assertNotIn((1, 1), reachable(data, 2, 2, (0, 0)))

    def test_inspection_receipts_expire_with_image(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "overview.png").write_bytes(b"first")
            manifest = {"images": {"overview.png": sha(b"first")}}
            with self.assertRaises(WorldError):
                require_viewed(root, manifest)
            (root / "overview.png.viewed").write_text(sha(b"first"))
            require_viewed(root, manifest)
            (root / "overview.png").write_bytes(b"changed")
            with self.assertRaises(WorldError):
                require_viewed(root, manifest)

    def test_packet_rejects_changed_map_or_qa_dependencies(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp)
            atomic_write(work / "render.json", {})
            report = check(self.authored, self.plan, "aqualia_village")
            target = REPO / "art/review/world-selftest-not-created"
            stale = {**report, "dependenciesDigest": "obsolete"}
            with self.assertRaisesRegex(WorldError, "QA dependencies"):
                packet(self.authored, self.plan, "aqualia_village", work, target, stale)
            altered = copy.deepcopy(self.authored)
            altered["nextUid"] += 1
            with self.assertRaisesRegex(WorldError, "Current map/plan QA"):
                packet(altered, self.plan, "aqualia_village", work, target, report)
