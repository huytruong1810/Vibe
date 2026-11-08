"""C9b human grammar boundaries; all body images/approvals are temporary fixtures."""
import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import core, finish_selftest
from forgelib.faces import HUMAN_EXPRESSIONS, FACINGS, human_decal, build_faces, registration_checks
from forgelib.review import export_packet


class HumanFacesTest(unittest.TestCase):
    def setUp(self):
        self.fixture = finish_selftest.FinishingTest()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.palette = core.spec("palette")
        self.canvas = {"size": [16, 12], "anchor": [8, 6]}
        self.rs = {**self.fixture.rs, "canvases": {"layer.face": self.canvas},
                   "expressions": {"human": list(HUMAN_EXPRESSIONS)}}
        tracks = {"clips": {}, "canvases": {}}
        # Both moving head sockets and varying body canvases must be honored.
        for clip, size in (("idle", (112, 152)), ("walk", (192, 176))):
            folder = self.fixture.wd / "pix/export" / clip
            for old in folder.glob("*.png"):
                old.unlink()
            tracks["clips"][clip] = {}
            tracks["canvases"][clip] = {"size": [v // 2 for v in size], "anchor": [28, 66]}
            for facing in ("n", "ne", "e", "se", "s", "sw", "w", "nw"):
                tracks["clips"][clip][facing] = []
                for number in range(2):
                    Image.new("RGBA", size, (30, 40, 50, 255)).save(folder / f"{facing}_{number}.png")
                    tracks["clips"][clip][facing].append({"Socket_Head": [28 + number, 20]})
        self.fixture.write(self.fixture.wd / "bake/tracks.json", tracks)
        self.manifest = export_packet(self.fixture.wd, self.fixture.packet, "player-aqualia",
                                      self.rs, self.fixture.cv)
        self.output = self.fixture.repo / "faces"

    def build(self, **kwargs):
        return build_faces(self.fixture.packet, self.output, "player-aqualia", self.rs,
                           self.palette, kind="human", **kwargs)

    def test_full_matrix_repeatable_unique_and_uniform_blocks(self):
        before = (self.fixture.packet / "review.json").read_bytes()
        report = self.build()
        self.assertEqual(report["status"], "candidate")
        self.assertEqual(len(report["frames"]), 60)
        self.assertEqual(report, self.build())
        self.assertEqual(before, (self.fixture.packet / "review.json").read_bytes())
        for facing in FACINGS:
            rows = [f for f in report["frames"] if f["facing"] == facing]
            self.assertEqual(len({f["sha256"] for f in rows}), 12)
        for row in report["frames"]:
            with Image.open(self.output / row["file"]) as image:
                self.assertEqual(image.size, (32, 24))
                for x in range(0, 32, 2):
                    for y in range(0, 24, 2):
                        self.assertEqual(len(set(image.crop((x, y, x + 2, y + 2)).getdata())), 1)
        with Image.open(self.output / "contact.png") as sheet:
            self.assertEqual(sheet.size, (160, 288))

    def test_registration_covers_every_expression_and_moving_head(self):
        report = self.build()
        self.assertIn("240 registrations", report["qa"][0]["detail"])
        self.assertEqual(report["bodyPacketDigest"], self.manifest["sourceDigest"])
        self.assertEqual(report["bodyManifestSha256"], hashlib.sha256(
            (self.fixture.packet / "review.json").read_bytes()).hexdigest())

    def test_recoloring_changes_only_palette_and_unknown_ramps_fail(self):
        normal = human_decal("curious", "s", self.palette, self.canvas)
        other = human_decal("curious", "s", self.palette, self.canvas,
                            {"eyeRamp": "hair-teal", "inkRamp": "skin-warm"})
        self.assertEqual(normal.getchannel("A").tobytes(), other.getchannel("A").tobytes())
        self.assertNotEqual(normal.tobytes(), other.tobytes())
        for face in ({"eyeRamp": "not-a-ramp"}, {"anything": "hair-ink"}, {"eyeRamp": []}):
            with self.assertRaises(core.ForgeError):
                human_decal("neutral", "s", self.palette, self.canvas, face)

    def test_unsupported_directions_expressions_and_canvas_fail(self):
        for facing in ("n", "ne", "nw", "rotated"):
            with self.assertRaises(core.ForgeError):
                human_decal("neutral", facing, self.palette, self.canvas)
        with self.assertRaises(core.ForgeError):
            human_decal("invented", "s", self.palette, self.canvas)
        with self.assertRaises(core.ForgeError):
            human_decal("neutral", "s", self.palette, {"size": [15, 12], "anchor": [8, 6]})
        self.rs["expressions"]["human"].pop()
        with self.assertRaises(core.ForgeError):
            self.build()

    def test_missing_off_grid_or_outside_socket_fails(self):
        images = {(e, f): human_decal(e, f, self.palette, self.canvas)
                  for e in HUMAN_EXPRESSIONS for f in FACINGS}
        for socket in (None, {"x": 55, "y": 40}, {"x": 0, "y": 0}):
            manifest = copy.deepcopy(self.manifest)
            target = next(f for f in manifest["frames"] if ":idle:s:0" in f["id"])
            target["sockets"] = {"Socket_Head": socket} if socket else {}
            checks = registration_checks(manifest, images, {"x": 16, "y": 12}, HUMAN_EXPRESSIONS)
            self.assertFalse(checks[0]["pass"])

    def test_palette_changes_sidecar_digest_without_body_mutation(self):
        first = self.build()
        second = self.build(face={"eyeRamp": "hair-teal"})
        self.assertNotEqual(first["sourceDigest"], second["sourceDigest"])
        self.assertEqual(first["bodyPacketDigest"], second["bodyPacketDigest"])

    def test_cli_selects_human_sidecar_without_body_stage(self):
        import forge
        with patch.object(forge, "asset_kind", return_value="human"), \
             patch.object(forge, "approval_for", return_value=(self.fixture.approval, self.fixture.packet)), \
             patch.object(forge, "_recipe", return_value={"face": {"eyeRamp": "hair-teal"}}), \
             patch.object(forge, "spec", side_effect=lambda name: self.rs if name == "render_spec" else self.palette), \
             patch.object(forge.core, "REVIEW", self.fixture.repo), \
             patch.object(forge, "record") as record, \
             patch.object(forge, "_rel", side_effect=str), \
             patch.object(forge.core, "run_blender", side_effect=AssertionError("must not rebake")):
            message = forge.st_faces("player-aqualia")
            self.assertIn("candidate", message)
            self.assertIn("registered.png", [p.name for p in record.call_args.args[3]])


if __name__ == "__main__":
    unittest.main()
