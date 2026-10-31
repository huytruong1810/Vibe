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
            "worldlib.cli.layout_approval", return_value=None
        ), patch(
            "worldlib.cli.dependencies", return_value=recorded["dependenciesDigest"]
        ):
            self.assertEqual(
                main(["next", "--region", "aqualia", "--level", "aqualia_village"]), 0
            )
        self.assertIn("director review", output.getvalue())

    def test_layout_approval_is_digest_and_scope_bound(self):
        from worldlib.cli import layout_approval, main
        from unittest.mock import patch
        from contextlib import redirect_stdout
        import io

        self.assertIsNotNone(layout_approval(self.authored, "aqualia_village"))
        modified = copy.deepcopy(self.authored)
        modified["nextUid"] += 1
        self.assertIsNone(layout_approval(modified, "aqualia_village"))
        self.assertIsNone(layout_approval(self.authored, "aqualia_riverlands"))
        output = io.StringIO()
        with redirect_stdout(output):
            self.assertEqual(
                main(["next", "--region", "aqualia", "--level", "aqualia_village"]), 0
            )
        self.assertIn("continue aqualia_riverlands", output.getvalue())
        self.assertIn("No repeat layout export", output.getvalue())

    def test_semantics_follow_renumbered_contract_values(self):
        from worldlib.semantics import TerrainSemantics
        from unittest.mock import patch

        document = copy.deepcopy(spec())
        for layer in document["layers"]:
            for v in layer.get("values", []):
                v["value"] += 40
        rules = TerrainSemantics(document)
        data = {k: [0] * 4 for k in ("collision", "paths", "water", "elevation")}
        data["water"][1] = rules.value("water", "fresh_shallow")
        data["paths"][1] = rules.value("paths", "bridge")
        with patch("worldlib.checks.TERRAIN", rules):
            self.assertTrue(can_step(data, 2, 2, (0, 0), (1, 0), False))
            data["paths"][1] = 0
            self.assertFalse(can_step(data, 2, 2, (0, 0), (1, 0), False))
            data["water"][1] = 0
            data["elevation"][1] = rules.value("elevation", "e1")
            data["collision"][1] = rules.ramp
            self.assertTrue(can_step(data, 2, 2, (0, 0), (1, 0), False))
            data["collision"][1] = rules.solid
            self.assertFalse(can_step(data, 2, 2, (0, 0), (1, 0), False))

    def test_named_example_reproduces_the_committed_first_pass(self):
        from worldlib.golden import example
        from unittest.mock import patch

        with tempfile.TemporaryDirectory() as tmp, patch(
            "worldlib.golden.WORLD", Path(tmp)
        ):
            path = example(copy.deepcopy(self.empty), self.plan)
            self.assertEqual(
                read(path), read(WORLD / "passes/aqualia/001-village.json")
            )

    def test_broken_pass_through_cli_apply_then_check_and_repair(self):
        from worldlib.cli import main
        from worldlib.semantics import TERRAIN
        from unittest.mock import patch
        from contextlib import redirect_stdout
        import io

        before = PROJECT.read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            project, edits = root / "hearthwild.ldtk", root / "passes/aqualia"
            atomic_write(project, self.authored)
            atomic_write(root / "regions/aqualia.plan.json", self.plan)
            building = next(
                e
                for e in entities(self.authored["levels"][0])
                if e["__identifier"] == "Building"
            )
            door = fields(building)["door"]
            x, y = door["cx"], door["cy"]
            original = layers(self.authored["levels"][0])["collision"]["intGridCsv"][
                y * 90 + x
            ]
            with patch.multiple(
                "worldlib.cli", PROJECT=project, WORLD=root, WORK=root / "work"
            ), redirect_stdout(io.StringIO()):
                for name, value, expected in [
                    ("block-door", TERRAIN.solid, 1),
                    ("repair-door", original, 0),
                ]:
                    path = edits / f"{name}.json"
                    edit = self.edit(
                        read(project),
                        [
                            {
                                "op": "paint",
                                "layer": "collision",
                                "value": value,
                                "shape": {"kind": "rect", "rect": [x, y, 1, 1]},
                            }
                        ],
                    )
                    edit["id"] = name
                    atomic_write(path, edit)
                    self.assertEqual(main(["apply", str(path)]), 0)
                    self.assertEqual(
                        main(
                            [
                                "check",
                                "--region",
                                "aqualia",
                                "--level",
                                "aqualia_village",
                            ]
                        ),
                        expected,
                    )
                    report = read(root / "work/aqualia/aqualia_village/qa_report.json")
                    if expected:
                        self.assertIn("door", {f["code"] for f in report["findings"]})
            self.assertEqual(sha(read(project)), sha(self.authored))
        self.assertEqual(PROJECT.read_bytes(), before)

    def test_compact_packet_references_map_without_copying_it(self):
        from worldlib.review import dependencies
        from unittest.mock import patch

        dependency = dependencies()
        report = check(self.authored, self.plan, "aqualia_village")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            work = root / "work"
            work.mkdir()
            # Synthetic receipt fixture, not a claimed visual inspection.
            for name in ("overview.png", "before-overview.png"):
                (work / name).write_bytes(b"receipt fixture")
                (work / (name + ".viewed")).write_text(sha(b"receipt fixture"))
            atomic_write(
                work / "render.json",
                {
                    "projectDigest": sha(self.authored),
                    "planDigest": sha(self.plan),
                    "dependenciesDigest": dependency,
                    "images": {"overview.png": sha(b"receipt fixture")},
                },
            )
            with patch("worldlib.review.REPO", root), patch(
                "worldlib.review.dependencies", return_value=dependency
            ):
                target = root / "art/review/selftest"
                packet(
                    self.authored, self.plan, "aqualia_village", work, target, report
                )
            manifest = read(target / "packet.json")
            self.assertEqual(manifest["schemaVersion"], 2)
            self.assertEqual(
                manifest["source"],
                {"path": spec()["ldtk"]["project"], "sha256": sha(self.authored)},
            )
            self.assertEqual(manifest["sourceDigest"], sha(self.authored))
            self.assertFalse((target / "hearthwild.ldtk").exists())
            for name, digest in manifest["files"].items():
                self.assertEqual(sha((target / name).read_bytes()), digest)

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
