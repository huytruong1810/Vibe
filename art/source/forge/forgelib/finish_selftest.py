"""C3b boundary tests; fake approvals exist only inside an OS temporary repository."""
import copy
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import core
from forgelib.faces import build_faces, decal, registration_checks, EXPRESSIONS, FACINGS
from forgelib.publish import publish_body, sha, validate_packet
from forgelib.review import export_packet


class FinishingTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name).resolve()
        self.wd = self.repo / "art/source/forge/work/rivallie"
        self.packet = self.repo / "art/review/body"
        self.wd.mkdir(parents=True)
        self.packet.mkdir(parents=True)
        self.cv = {"size": [56, 56], "anchor": [28, 41]}
        self.rs = {"clips": {"idle": {"runtime": {"state": "idle"}, "fps": 6, "playback": "loop"},
                              "walk": {"runtime": {"state": "walk"}, "fps": 12, "playback": "distance", "strideTiles": 1.5}}}
        for clip in ("idle", "walk"):
            for facing in ("s", "n"):
                path = self.wd / f"pix/export/{clip}/{facing}_0.png"
                path.parent.mkdir(parents=True, exist_ok=True)
                Image.new("RGBA", (112, 112), (20, 30, 40, 255)).save(path)
        tracks = {"clips": {c: {f: [{"Socket_Head": [28, 20]}] for f in ("s", "n")} for c in ("idle", "walk")}}
        self.write(self.wd / "bake/tracks.json", tracks)
        self.write(self.wd / "qa_report.json", {"checks": [{"check": "canvas", "pass": True, "hard": True}]})
        self.model = self.wd / "animate.blend"
        self.model.write_bytes(b"synthetic test model, never a production source")
        self.write(self.wd / "animate.json", {"extra": {"strideTiles": {"walk": 2.25}, "rigId": "quadruped-v1"},
                    "outputs": {self.model.relative_to(self.repo).as_posix(): sha(self.model)}})
        self.write(self.wd / "rig.json", {"extra": {"rigId": "quadruped-v1"}})
        for path in ("forge.py", "forgelib/publish.py", "forgelib/review.py", "forgelib/pixelize.py",
                     "blender/bake.py", "blender/animate.py", "blender/gaits.py", "uv.lock"):
            p = self.repo / "art/source/forge" / path
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("# synthetic source\n")
        self.write(self.repo / "art/source/forge/spec/render_spec.json", self.rs)
        self.write(self.repo / "art/source/forge/spec/palette.json", core.spec("palette"))
        self.write(self.repo / "art/source/forge/recipes/rivallie.json", {"asset": "rivallie"})
        schema_source = core.REPO / "docs/art/source-manifest.schema.json"
        self.write(self.repo / "docs/art/source-manifest.schema.json", json.loads(schema_source.read_text()))
        self.manifest = export_packet(self.wd, self.packet, "rivallie", self.rs, self.cv)
        self.approval = self.repo / "docs/team/comms/director/approvals/test.md"
        self.approval.parent.mkdir(parents=True)
        self.approval.write_text("---\nasset: rivallie\npacket: art/review/body/\npacketDigest: " + self.manifest["sourceDigest"] + "\ndecision: director-approved\nscope: [body, clips]\n---\n")

    def write(self, path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value))

    def publish(self):
        return publish_body(self.repo, self.wd, self.packet, self.approval, "rivallie", self.rs, self.cv, "4.2.3")

    def test_repeatable_publication_exact_bytes_and_stride(self):
        path = self.publish()
        before = path.read_bytes()
        self.assertEqual(path, self.publish())
        self.assertEqual(before, path.read_bytes())
        record = json.loads(before)
        self.assertEqual(record["scope"], ["body", "clips"])
        self.assertEqual(record["clips"][2]["stride"], 2.25)
        self.assertEqual(record["authoringProvenance"]["method"], "blender-bake")
        for frame in record["frames"]:
            self.assertEqual(sha(self.repo / "art/source" / frame["file"]), frame["sha256"])
            self.assertEqual(frame["rigId"], "quadruped-v1")

    def test_provenance_closure_survives_missing_machine_a_workspace(self):
        record = json.loads(self.publish().read_text())
        provenance = record["authoringProvenance"]
        shutil.rmtree(self.wd)
        self.assertFalse(self.wd.exists())
        for dependency in provenance["inputs"]:
            self.assertTrue(dependency["path"].startswith("blender/models/published/rivallie/"))
            self.assertNotIn("/work/", dependency["path"])
            self.assertEqual(sha(self.repo / "art/source" / dependency["path"]), dependency["sha256"])
        model = next(p for p in provenance["inputs"] if p["role"] == "model")
        self.assertEqual((self.repo / "art/source" / model["path"]).read_bytes(),
                         b"synthetic test model, never a production source")
        from jsonschema import Draft202012Validator
        schema = json.loads((self.repo / "docs/art/source-manifest.schema.json").read_text())
        Draft202012Validator(schema["oneOf"][1]["properties"]["authoringProvenance"]["items"]).validate(provenance)

    def test_live_tool_edit_does_not_invalidate_published_source_bytes(self):
        path = self.publish()
        old = json.loads(path.read_text())
        tool = self.repo / "art/source/forge/forgelib/publish.py"
        tool.write_text("# changed publisher, same packet bytes\n")
        new = json.loads(self.publish().read_text())
        self.assertEqual(old["packetDigest"], new["packetDigest"])
        self.assertEqual(old["frames"], new["frames"])
        self.assertNotEqual(old["authoringProvenance"], new["authoringProvenance"])
        for dependency in old["authoringProvenance"]["inputs"]:
            self.assertEqual(sha(self.repo / "art/source" / dependency["path"]), dependency["sha256"])

    def test_mutated_source_bundle_refuses_republication_without_repair(self):
        path = self.publish()
        before = path.read_bytes()
        dependency = json.loads(before)["authoringProvenance"]["inputs"][0]
        source = self.repo / "art/source" / dependency["path"]
        source.write_bytes(b"mutated published source")
        with self.assertRaisesRegex(core.ForgeError, "immutable source bundle"):
            self.publish()
        self.assertEqual(before, path.read_bytes())
        self.assertEqual(source.read_bytes(), b"mutated published source")

    def test_source_copy_corruption_does_not_publish_pointer(self):
        original = shutil.copyfile
        def corrupt(src, dst):
            result = original(src, dst)
            if "sources" in Path(dst).parts:
                Path(dst).write_bytes(b"corrupted source copy")
            return result
        with patch("forgelib.publish.shutil.copyfile", side_effect=corrupt):
            with self.assertRaisesRegex(core.ForgeError, "Source changed while copying"):
                self.publish()
        self.assertFalse((self.repo / "art/source/staging").exists())
        self.assertFalse((self.repo / "art/source/exports").exists())

    def test_source_bundle_install_failure_preserves_previous_pointer(self):
        path = self.publish()
        before = path.read_bytes()
        (self.repo / "art/source/forge/forgelib/publish.py").write_text("# new tool bytes\n")
        with patch("forgelib.publish.os.replace", side_effect=OSError("source storage failure")):
            with self.assertRaises(OSError):
                self.publish()
        self.assertEqual(path.read_bytes(), before)
        self.assertFalse(list((self.repo / "art/source/blender/models/published/rivallie").glob("publish-sources-*")))

    def test_rejects_approval_scope_asset_and_digest_without_changes(self):
        original = self.approval.read_text()
        for a, b in (("[body, clips]", "[faces]"), ("asset: rivallie", "asset: other"),
                     (self.manifest["sourceDigest"], "0" * 64), ("director-approved", "candidate")):
            with self.subTest(a=a):
                self.approval.write_text(original.replace(a, b))
                with self.assertRaises(core.ForgeError):
                    self.publish()
                self.assertFalse((self.repo / "art/source/exports").exists())

    def test_rejects_tampered_metadata_even_when_digest_label_is_unchanged(self):
        m = copy.deepcopy(self.manifest)
        m["frames"][0]["anchorPx"]["x"] += 2
        self.write(self.packet / "review.json", m)
        with self.assertRaisesRegex(core.ForgeError, "metadata/bytes"):
            self.publish()

    def test_rejects_tampered_frame_and_path_escape(self):
        frame = self.manifest["frames"][0]
        target = self.packet / frame["file"]
        original = target.read_bytes()
        target.write_bytes(b"corrupt")
        with self.assertRaises(core.ForgeError):
            self.publish()
        target.write_bytes(original)
        self.manifest["frames"][0]["file"] = "../outside.png"
        self.write(self.packet / "review.json", self.manifest)
        with self.assertRaisesRegex(core.ForgeError, "escapes"):
            self.publish()

    def test_failure_preserves_old_pointer_and_exports(self):
        path = self.publish()
        before = path.read_bytes()
        self.model.write_bytes(b"changed")
        with self.assertRaisesRegex(core.ForgeError, "stage record"):
            self.publish()
        self.assertEqual(before, path.read_bytes())
        frame = json.loads(before)["frames"][0]
        self.assertEqual(sha(self.repo / "art/source" / frame["file"]), frame["sha256"])

    def test_missing_sources_refuse_publication(self):
        (self.wd / "bake/tracks.json").unlink()
        with self.assertRaises(FileNotFoundError):
            self.publish()
        self.assertFalse((self.repo / "art/source/staging").exists())

    def test_faces_are_separate_and_two_pixel_blocks(self):
        rs = {**self.rs, "expressions": {"creature": list(EXPRESSIONS)},
              "canvases": {"layer.face": {"size": [16, 12], "anchor": [8, 6]}}}
        before = (self.packet / "review.json").read_bytes()
        report = build_faces(self.packet, self.wd / "faces", "rivallie", rs, core.spec("palette"))
        self.assertEqual(report["status"], "candidate")
        self.assertEqual(len(report["frames"]), 25)
        self.assertEqual(before, (self.packet / "review.json").read_bytes())
        for f in report["frames"]:
            with Image.open(self.wd / "faces" / f["file"]) as image:
                self.assertEqual(image.size, (32, 24))
                for y in range(0, 24, 2):
                    for x in range(0, 32, 2):
                        self.assertEqual(len(set(image.crop((x, y, x+2, y+2)).getdata())), 1)
        self.assertEqual(report, build_faces(self.packet, self.wd / "faces", "rivallie", rs, core.spec("palette")))

    def test_face_anchor_rejects_missing_offgrid_and_outside(self):
        images = {(e, f): decal(e, f, core.spec("palette"), {"size": [16, 12]}) for e in EXPRESSIONS for f in FACINGS}
        for socket in (None, {"x": 55, "y": 40}, {"x": 0, "y": 0}):
            m = copy.deepcopy(self.manifest)
            if socket is None:
                m["frames"][0]["sockets"] = {}
            else:
                m["frames"][0]["sockets"]["Socket_Head"] = socket
            # sorted frames start with n; select the first forward-facing frame explicitly.
            m["frames"][0]["id"] = "rivallie:idle:s:0"
            self.assertFalse(registration_checks(m, images, {"x": 16, "y": 12})[0]["pass"])

    def test_back_face_is_not_generated(self):
        with self.assertRaises(core.ForgeError):
            decal("neutral", "n", core.spec("palette"), {"size": [16, 12]})

    def test_invalid_blender_pin_is_rejected(self):
        with self.assertRaisesRegex(core.ForgeError, "4.2"):
            publish_body(self.repo, self.wd, self.packet, self.approval, "rivallie", self.rs, self.cv, "4.3.0")

    def test_pointer_replace_failure_keeps_previous_record(self):
        path = self.publish()
        before = path.read_bytes()
        with patch("forgelib.publish.os.replace", side_effect=OSError("simulated storage failure")):
            with self.assertRaises(OSError):
                self.publish()
        self.assertEqual(path.read_bytes(), before)
        self.assertFalse(list(path.parent.glob(".publish-*")))

    def test_rejects_unresolved_and_duplicate_frames(self):
        for mutation in ("duplicate", "reference"):
            m = copy.deepcopy(self.manifest)
            if mutation == "duplicate":
                m["frames"].append(copy.deepcopy(m["frames"][0]))
            else:
                m["clips"][0]["frameIds"] = ["missing"]
            self.write(self.packet / "review.json", m)
            with self.assertRaises(core.ForgeError):
                validate_packet(self.packet, "rivallie")

    def test_approved_next_never_requests_a_new_body_bake(self):
        import forge
        with patch.object(forge, "approval_for", return_value=(self.approval, self.packet)), \
             patch.object(core, "stage_record", return_value=None), \
             patch.object(core, "load_sheet", side_effect=AssertionError("must not request prep")):
            self.assertEqual(forge.next_step("rivallie"), forge.CMD + " publish --asset rivallie")

    def test_cli_all_refuses_approved_body_rerun(self):
        import forge
        with patch.object(forge, "approval_for", return_value=(self.approval, self.packet)), \
             patch.object(forge, "_run", side_effect=AssertionError("must not rerun")), \
             patch.object(sys, "argv", ["forge.py", "all", "--asset", "rivallie"]):
            self.assertEqual(forge.main(), 2)

    def test_corrupt_copy_does_not_publish(self):
        import shutil
        original = shutil.copyfile
        def corrupt(src, dst):
            result = original(src, dst)
            if "frameset" in Path(dst).parts:
                Path(dst).write_bytes(b"corrupted during copy")
            return result
        with patch("forgelib.publish.shutil.copyfile", side_effect=corrupt):
            with self.assertRaisesRegex(core.ForgeError, "while copying"):
                self.publish()
        self.assertFalse((self.repo / "art/source/staging").exists())

    def test_source_change_before_commit_keeps_previous_pointer(self):
        path = self.publish()
        before = path.read_bytes()
        from forgelib import publish as module
        original = module.sha
        count = 0
        def changed(source):
            nonlocal count
            if source == self.approval:
                count += 1
                if count == 2:
                    self.approval.write_text(self.approval.read_text() + "changed while publishing\n")
            return original(source)
        with patch("forgelib.publish.sha", side_effect=changed):
            with self.assertRaisesRegex(core.ForgeError, "before commit"):
                self.publish()
        self.assertEqual(path.read_bytes(), before)
