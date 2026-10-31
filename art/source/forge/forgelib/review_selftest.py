"""Run with uv run --project art/source/forge python -m unittest discover -s art/source/forge/forgelib -p review_selftest.py."""
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
from review import export_packet


class PacketExportTest(unittest.TestCase):
    def test_registration_digest_and_repeatability(self):
        with tempfile.TemporaryDirectory() as tmp:
            wd = Path(tmp)
            (wd / "pix/export/idle").mkdir(parents=True)
            (wd / "bake").mkdir()
            (wd / "packet").mkdir()
            (wd / "qa_report.json").write_text('{"checks": []}')
            Image.new("RGBA", (112, 112)).save(wd / "pix/export/idle/s_0.png")
            tracks = {"clips": {"idle": {"s": [{"Socket_Head": [28, 16]}]}}}
            (wd / "bake/tracks.json").write_text(json.dumps(tracks))
            spec = {"clips": {"idle": {"runtime": {"state": "idle"}, "fps": 6, "playback": "loop"}}}
            args = (wd, wd / "packet", "rivallie", spec, {"size": [56, 56], "anchor": [28, 41]})
            first = export_packet(*args)
            self.assertEqual(first, export_packet(*args))
            frame = first["frames"][0]
            self.assertEqual(frame["anchorPx"], {"x": 56, "y": 82})
            self.assertEqual(frame["sockets"]["Socket_Head"], {"x": 56, "y": 32})
            tracks["clips"]["idle"]["s"][0]["Socket_Head"][0] = 29
            (wd / "bake/tracks.json").write_text(json.dumps(tracks))
            self.assertNotEqual(first["sourceDigest"], export_packet(*args)["sourceDigest"])
