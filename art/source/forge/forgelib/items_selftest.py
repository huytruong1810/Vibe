"""C9b item pose contract tests; temporary fake model bytes never become artwork."""
import copy
import json
import math
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import core
from forgelib.items import item_pose_plan, write_item_plan, transform_point, file_sha


class ItemPlanTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.model = self.repo / "art/source/blender/models/hatchet.blend"
        self.model.parent.mkdir(parents=True)
        self.model.write_bytes(b"test fixture model, not Blender art")
        self.config = {"model": "blender/models/hatchet.blend", "grip": [1, -2, 3],
                       "supportGrip": [1, -2, 4], "socket": "Socket_Hand.R", "iconPivot": [0, 0, 2]}
        self.rs = copy.deepcopy(core.spec("render_spec"))
        self.out = self.repo / "plan/item_plan.json"

    def plan(self, config=None):
        return item_pose_plan(self.repo, "item:hatchet", self.config if config is None else config, self.rs)

    def test_complete_matrix_and_same_mesh_icon(self):
        plan = self.plan()
        self.assertEqual(plan["status"], "draft")
        self.assertEqual(len(plan["poses"]), 65)
        self.assertEqual(len({p["id"] for p in plan["poses"]}), 65)
        held = [p for p in plan["poses"] if p["view"] == "held"]
        self.assertEqual(len({(p["facing"], p["gripBucket"]) for p in held}), 64)
        self.assertEqual(plan["source"]["sha256"], file_sha(self.model))
        self.assertEqual(plan["poses"][-1]["view"], "icon")
        self.assertEqual(len({p["gripDegrees"] for p in held}), 8)
        self.assertEqual(plan, self.plan())

    def test_grip_maps_to_origin_without_scaling_or_reflection(self):
        for pose in self.plan()["poses"]:
            pivot = self.config["grip"] if pose["view"] == "held" else self.config["iconPivot"]
            for value in transform_point(pose, pivot):
                self.assertAlmostEqual(value, 0, places=10)
            rows = pose["rotation"]
            for i in range(3):
                for j in range(3):
                    dot = sum(a * b for a, b in zip(rows[i], rows[j]))
                    self.assertAlmostEqual(dot, float(i == j), places=10)
            determinant = sum(rows[0][i] * (rows[1][(i+1) % 3] * rows[2][(i+2) % 3]
                              - rows[1][(i+2) % 3] * rows[2][(i+1) % 3]) for i in range(3))
            self.assertAlmostEqual(determinant, 1, places=10)
            if pose["view"] == "held":
                self.assertAlmostEqual(math.dist(pose["supportGrip"], (0, 0, 0)), 1, places=10)

    def test_explicit_rotation_order_and_handedness(self):
        e = math.radians(self.rs["camera"]["elevationDeg"])
        for pose in self.plan()["poses"][:-1]:
            x, y, z = pose["supportGrip"]
            screen_up = math.sin(e) * y + math.cos(e) * z
            angle = math.radians(pose["gripDegrees"])
            self.assertAlmostEqual(x, math.cos(e) * math.sin(angle), places=10)
            self.assertAlmostEqual(screen_up, math.cos(e) * math.cos(angle), places=10)
        config = {**self.config, "socket": "Socket_Hand.L"}
        left = self.plan(config)
        self.assertEqual(left["socket"], "Socket_Hand.L")
        self.assertEqual(left["poses"], self.plan()["poses"])

    def test_reordering_config_and_repeated_writes_keep_bytes(self):
        first = write_item_plan(self.repo, "item:hatchet", self.config, self.rs, self.out)
        before = self.out.read_bytes()
        config = dict(reversed(list(self.config.items())))
        self.assertEqual(first, write_item_plan(self.repo, "item:hatchet", config, self.rs, self.out))
        self.assertEqual(before, self.out.read_bytes())
        self.assertEqual(json.loads(before), first)
        self.assertFalse(list(self.out.parent.glob(".item-plan-*")))

    def test_invalid_config_never_replaces_output(self):
        write_item_plan(self.repo, "item:hatchet", self.config, self.rs, self.out)
        before = self.out.read_bytes()
        for update in ({"unknown": 1}, {"grip": [True, 0, 0]}, {"grip": [math.inf, 0, 0]},
                       {"grip": [0, 0]}, {"supportGrip": None}, {"socket": "Socket_Back"},
                       {"model": "../outside.blend"}, {"model": "/absolute.blend"},
                       {"model": "blender/models/missing.blend"}):
            with self.subTest(update=update), self.assertRaises(core.ForgeError):
                write_item_plan(self.repo, "item:hatchet", {**self.config, **update}, self.rs, self.out)
            self.assertEqual(self.out.read_bytes(), before)
        for key in ("grip", "iconPivot", "model", "socket"):
            config = {k: v for k, v in self.config.items() if k != key}
            with self.assertRaises(core.ForgeError):
                self.plan(config)
        for asset in ("hatchet", "item:../escape", "npc:neris"):
            with self.assertRaises(core.ForgeError):
                item_pose_plan(self.repo, asset, self.config, self.rs)

    def test_contract_and_source_changes_change_pins(self):
        first = self.plan()
        self.model.write_bytes(b"changed source fixture")
        second = self.plan()
        self.assertNotEqual(first["source"], second["source"])
        self.rs["camera"]["elevationDeg"] = 31
        self.assertNotEqual(second["contractDigest"], self.plan()["contractDigest"])
        self.rs["canvases"]["layer.heldItem"]["gripAngleBuckets"] = 7
        with self.assertRaises(core.ForgeError):
            self.plan()

    def test_storage_failure_and_source_race_keep_previous_plan(self):
        write_item_plan(self.repo, "item:hatchet", self.config, self.rs, self.out)
        before = self.out.read_bytes()
        with patch("forgelib.items.os.replace", side_effect=OSError("storage failed")):
            with self.assertRaises(OSError):
                write_item_plan(self.repo, "item:hatchet", self.config, self.rs, self.out)
        calls = 0
        def changed(path):
            nonlocal calls
            if path == self.model:
                calls += 1
                if calls == 2:
                    path.write_bytes(b"model changed while planning")
            return file_sha(path)
        with patch("forgelib.items.file_sha", side_effect=changed):
            with self.assertRaisesRegex(core.ForgeError, "changed while planning"):
                write_item_plan(self.repo, "item:hatchet", self.config, self.rs, self.out)
        self.assertEqual(before, self.out.read_bytes())
        self.assertFalse(list(self.out.parent.glob(".item-plan-*")))

    def test_icon_scale_is_uniform_and_icon_only(self):
        config = {**self.config, "iconScale": 2}
        plan = item_pose_plan(self.repo, "item:hatchet", config, self.rs)
        icon = plan["poses"][-1]
        self.assertEqual((icon["view"], icon["scale"], icon["gripBucket"]), ("icon", 2.0, 1))
        for value in transform_point(icon, config["iconPivot"]):
            self.assertAlmostEqual(value, 0, places=10)
        self.assertTrue(all("scale" not in p for p in plan["poses"][:-1]))
        for bad in (0.5, 5, float("nan"), True):
            with self.assertRaises(core.ForgeError):
                item_pose_plan(self.repo, "item:hatchet", {**self.config, "iconScale": bad}, self.rs)

    def test_cli_writes_draft_and_never_runs_blender(self):
        import forge
        with patch.object(forge, "REPO", self.repo), \
             patch.object(forge, "_recipe", return_value={"kind": "item", "item": self.config}), \
             patch.object(forge, "work_dir", return_value=self.out.parent), \
             patch.object(forge, "_rel", side_effect=str), \
             patch.object(core, "run_blender", side_effect=AssertionError("plan cannot render")):
            self.assertIn("65 mesh poses", forge.st_item_plan("item:hatchet"))
        self.assertEqual(core.asset_kind("item:hatchet"), "item")
        self.assertEqual(core.canvas_for("item:hatchet")[0], "layer.heldItem")
        with patch.object(core, "load_sheet", side_effect=core.ForgeError("no prop sheet")):
            self.assertIn("BLOCKED", forge.next_step("item:hatchet"))
            ran = []
            with patch.object(sys, "argv", ["forge.py", "all", "--asset", "item:hatchet"]), \
                 patch.object(forge, "approval_for", return_value=None), \
                 patch.object(forge, "_run", side_effect=lambda asset, st: ran.append(st) or "ok"):
                self.assertEqual(forge.main(), 0)
        # Items run their own source chain through render; never a body stage.
        self.assertEqual(ran, ["prep", "gen3d", "clean", "texture", "orient", "items"])
        self.assertFalse({"rig", "animate", "bake", "pixelize", "qa"} & set(ran))


if __name__ == "__main__":
    unittest.main()
