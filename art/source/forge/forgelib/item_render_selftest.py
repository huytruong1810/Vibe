"""Item transaction/QA tests use a fake baker in OS temp, never production sprite art."""
import copy
import ast
import json
import math
import sys
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image
from scipy.spatial import ConvexHull

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import core
from forgelib.item_render import render_items, thin_features


class ItemRenderTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.wd = self.repo / "art/source/forge/work/item-test"
        self.model = self.repo / "art/source/blender/models/fixture.blend"
        self.model.parent.mkdir(parents=True)
        self.model.write_bytes(b"CPU test fixture; not a real Blender model")
        self.config = {"model": "blender/models/fixture.blend", "grip": [0, 0, 0],
                       "iconPivot": [0, 0, 0], "supportGrip": [0, 0, 0.125], "socket": "Socket_Hand.R"}
        self.rs = copy.deepcopy(core.spec("render_spec"))
        self.calls = 0
        self.mode = None

    def bake(self, script, args, log, timeout):
        self.calls += 1
        self.assertEqual(script, "bake.py")
        params = json.loads(Path(args[2]).read_text())
        self.assertEqual(len(params["itemPoses"]), 65)
        out = Path(args[1])
        tracks = {"clips": {}, "canvases": {}}
        for clip in params["clips"]:
            tracks["clips"][clip["name"]] = {}
            tracks["canvases"][clip["name"]] = clip["canvas"]
            folder = out / clip["name"]
            folder.mkdir()
            w, h = clip["canvas"]["size"]
            for facing in clip["facings"]:
                pose = params["itemPoses"][f"{clip['name']}/{facing}"]
                self.assertIn("sourcePivot", pose)
                alpha = np.zeros((h, w), dtype=np.uint8)
                alpha[h//2-4:h//2+4, w//2-3:w//2+3] = 255
                if self.mode == "thin":
                    alpha[1:h//2, w//2] = 255
                rgba = np.zeros((h, w, 4), dtype=np.uint8)
                rgba[:, :, :3] = (100, 70, 35)
                rgba[:, :, 3] = alpha
                Image.fromarray(rgba).save(folder / f"{facing}_0_albedo.png")
                normal = rgba.copy()
                normal[:, :, :3] = (128, 128, 255)
                Image.fromarray(normal).save(folder / f"{facing}_0_normal.png")
                depth = rgba.copy()
                depth[:, :, :3] = (128, 128, 128)
                Image.fromarray(depth).save(folder / f"{facing}_0_depth.png")
                anchor = clip["canvas"]["anchor"]
                row = {"frame": 1, "root": anchor[:]}
                if self.mode == "drift":
                    row["root"][0] += 1
                if pose["view"] == "held":
                    row[params["itemSocket"]] = row["root"][:]
                    x, y, z = pose["supportGrip"]
                    e = math.radians(params["elevationDeg"])
                    row["SupportGrip"] = [anchor[0] + 32 * x, anchor[1] - 32 * (math.sin(e)*y + math.cos(e)*z)]
                    if self.mode == "support":
                        row["SupportGrip"][0] = w + 1
                tracks["clips"][clip["name"]][facing] = [row]
        (out / "tracks.json").write_text(json.dumps(tracks))
        if self.mode == "missing":
            (out / "held_0/s_0_depth.png").unlink()

    def run_items(self, **kwargs):
        return render_items(self.repo, self.wd, "item:test", self.config, {"fixture": "wood"},
                            self.rs, "4.2.3", baker=self.bake, **kwargs)

    def test_full_generation_is_cached_and_registration_stays_integer(self):
        folder = self.run_items()
        before = (folder / "item-review.json").read_bytes()
        review = json.loads(before)
        self.assertEqual(review["status"], "candidate")
        self.assertEqual(len(review["frames"]), 65)
        self.assertTrue(all(row["pass"] for row in review["qa"]))
        pointer = (self.wd / "items.json").read_bytes()
        self.assertEqual(folder, self.run_items())
        self.assertEqual(self.calls, 1)
        self.assertEqual(before, (folder / "item-review.json").read_bytes())
        self.assertEqual(pointer, (self.wd / "items.json").read_bytes())
        for frame in review["frames"]:
            for socket in [frame["anchorPx"], *frame["sockets"].values()]:
                self.assertTrue(all(type(v) is int and v % 2 == 0 for v in socket.values()))
        self.assertEqual(sum(f["view"] == "held" for f in review["frames"]), 64)
        self.assertEqual(json.loads((self.wd / "items.json").read_text())["extra"]["status"], "candidate")

    def test_geometry_thickness_check_rejects_raw_thin_runs_before_outline(self):
        thick = np.zeros((16, 16), bool)
        thick[4:12, 6:10] = True
        self.assertEqual(thin_features(thick), 0)
        cap = thick.copy(); cap[3, 7] = True
        self.assertEqual(thin_features(cap), 0)
        whisker = thick.copy(); whisker[0:4, 7] = True
        self.assertGreater(thin_features(whisker), 0)
        isolated = thick.copy(); isolated[0, 0] = True
        self.assertGreater(thin_features(isolated), 0)
        self.mode = "thin"
        review = json.loads((self.run_items() / "item-review.json").read_text())
        self.assertEqual(review["status"], "draft")
        self.assertFalse(next(c for c in review["qa"] if c["check"] == "thinFeature")["pass"])

    def test_calibration_proxy_has_no_thin_features_across_all_planned_views(self):
        from forgelib.items import item_pose_plan, transform_point
        plan = item_pose_plan(self.repo, "item:test", self.config, self.rs)
        vertices = [(x, y, z) for x in (-0.125, 0.125) for y in (-0.09375, 0.09375) for z in (-0.25, 0.25)]
        e = math.radians(self.rs["camera"]["elevationDeg"])
        ys, xs = np.mgrid[:32, :32]
        centers = np.column_stack((xs.ravel() + 0.5, ys.ravel() + 0.5))
        for pose in plan["poses"]:
            projected = []
            for v in vertices:
                x, y, z = transform_point(pose, v)
                projected.append((16 + 32*x, 16 - 32*(math.sin(e)*y + math.cos(e)*z)))
            hull = ConvexHull(projected)
            mask = np.all(centers @ hull.equations[:, :2].T + hull.equations[:, 2] <= 1e-9, axis=1).reshape(32, 32)
            self.assertEqual(thin_features(mask), 0, pose["id"])

    def test_root_drift_and_invalid_support_grips_cannot_be_candidates(self):
        for mode in ("drift", "support"):
            self.mode = mode
            self.model.write_bytes(mode.encode())
            review = json.loads((self.run_items() / "item-review.json").read_text())
            self.assertEqual(review["status"], "draft")
            self.assertFalse(next(c for c in review["qa"] if c["check"] == "root")["pass"])

    def test_bake_failure_and_missing_pass_preserve_previous_pointer(self):
        self.run_items()
        before = (self.wd / "items.json").read_bytes()
        self.model.write_bytes(b"updated fixture")
        with patch.object(core, "run_blender", side_effect=core.ForgeError("render failed")):
            with self.assertRaises(core.ForgeError):
                render_items(self.repo, self.wd, "item:test", self.config, {"fixture": "wood"}, self.rs, "4.2.3")
        self.mode = "missing"
        with self.assertRaises(FileNotFoundError):
            self.run_items()
        self.assertEqual(before, (self.wd / "items.json").read_bytes())
        self.assertFalse(list(self.wd.glob("items-build-*")))

    def test_source_race_and_pointer_storage_failure_are_atomic(self):
        self.run_items()
        before = (self.wd / "items.json").read_bytes()
        self.model.write_bytes(b"new fixture")
        original = self.bake
        def changed(*args, **kwargs):
            original(*args, **kwargs)
            self.model.write_bytes(b"changed while rendering")
        with self.assertRaisesRegex(core.ForgeError, "changed while rendering"):
            render_items(self.repo, self.wd, "item:test", self.config, {"fixture": "wood"}, self.rs, "4.2.3", baker=changed)
        self.assertEqual(before, (self.wd / "items.json").read_bytes())
        from forgelib import item_render
        replace = item_render.os.replace
        def fail_pointer(src, dst):
            if Path(dst).name == "items.json":
                raise OSError("pointer storage failed")
            return replace(src, dst)
        with patch("forgelib.item_render.os.replace", side_effect=fail_pointer):
            with self.assertRaises(OSError):
                self.run_items()
        self.assertEqual(before, (self.wd / "items.json").read_bytes())
        self.assertFalse(list(self.wd.glob(".items-*")))

    def test_corrupted_bundle_is_not_silently_repaired(self):
        folder = self.run_items()
        before = (self.wd / "items.json").read_bytes()
        frame = json.loads((folder / "item-review.json").read_text())["frames"][0]
        (folder / frame["file"]).write_bytes(b"corrupt")
        with self.assertRaises(core.ForgeError):
            self.run_items()
        self.assertEqual(self.calls, 1)
        self.assertEqual(before, (self.wd / "items.json").read_bytes())

    def test_bad_pin_and_material_inputs_fail_before_render(self):
        with self.assertRaisesRegex(core.ForgeError, "4.2"):
            render_items(self.repo, self.wd, "item:test", self.config, {"fixture": "wood"}, self.rs, "4.3.0", baker=self.bake)
        for details in (["missing"], ["fixture", "fixture"], "fixture"):
            with self.assertRaises(core.ForgeError):
                self.run_items(detail_slots=details)
        self.assertEqual(self.calls, 0)
        self.assertFalse(self.wd.exists())

    def test_cli_routes_items_without_body_stage_invalidation(self):
        import forge
        recipe = {"kind": "item", "item": self.config, "ramps": {"fixture": "wood"}}
        with patch.object(forge, "REPO", self.repo), \
             patch.object(forge, "_recipe", return_value=recipe), \
             patch.object(forge, "work_dir", return_value=self.wd), \
             patch.object(forge, "_blender_version", return_value="4.2.3"), \
             patch.object(forge, "_rel", side_effect=str), \
             patch.object(forge, "_invalidate_after", side_effect=AssertionError("must not invalidate actors")), \
             patch("forgelib.item_render.render_items", side_effect=lambda *args, **kwargs: render_items(*args, baker=self.bake, **kwargs)):
            self.assertIn("candidate", forge.st_items("item:test"))
        for script in ("bake.py", "fixture_item.py"):
            ast.parse((core.BLENDER_SCRIPTS / script).read_text())

    def test_qa_policy_is_part_of_the_generation_fingerprint(self):
        first = self.run_items()
        self.rs["marginsArtPixels"]["min"] += 1
        second = self.run_items()
        self.assertNotEqual(first, second)

    def test_partial_source_snapshot_never_reaches_the_baker(self):
        self.run_items()
        before = (self.wd / "items.json").read_bytes()
        self.model.write_bytes(b"new snapshot fixture")
        original = shutil.copyfile
        def corrupt(src, dst):
            result = original(src, dst)
            Path(dst).write_bytes(b"partial snapshot")
            return result
        with patch("forgelib.item_render.shutil.copyfile", side_effect=corrupt):
            with self.assertRaisesRegex(core.ForgeError, "while snapshotting"):
                self.run_items()
        self.assertEqual(self.calls, 1)
        self.assertEqual(before, (self.wd / "items.json").read_bytes())


if __name__ == "__main__":
    unittest.main()
