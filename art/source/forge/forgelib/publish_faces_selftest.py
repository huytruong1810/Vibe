"""Face sidecar publication on a scratch repo: digest binding, immutability, refusal paths (C3b).

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p publish_faces_selftest.py
"""
from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import approval_record as A  # noqa: E402
from forgelib import publish as P  # noqa: E402
from forgelib.core import ForgeError  # noqa: E402


class PublishFaces(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name).resolve()
        (self.repo / "art/source/forge/forgelib").mkdir(parents=True)
        (self.repo / "art/source/forge/forgelib/faces.py").write_text("# stand-in\n")
        self.apr = self.repo / "docs/team/comms/director/approvals"
        self.apr.mkdir(parents=True)
        self.packet = self.repo / "art/review/2026-11-04-rivallie-faces-abc"
        (self.packet / "neutral").mkdir(parents=True)
        Image.new("RGBA", (32, 24), (10, 20, 30, 255)).save(self.packet / "neutral/s.png")
        sha = hashlib.sha256((self.packet / "neutral/s.png").read_bytes()).hexdigest()
        faces = {"schemaVersion": 1, "asset": "rivallie", "scope": ["faces"], "status": "candidate",
                 "bodyPacketDigest": "b" * 64, "bodyManifestSha256": "c" * 64,
                 "frames": [{"expression": "neutral", "facing": "s", "file": "neutral/s.png", "sha256": sha}],
                 "qa": [{"check": "faceAnchor", "pass": True, "hard": True}],
                 "registration": {"unit": "frame px", "frames": {"rivallie:idle:s:0": [0, 6]}}}
        faces["sourceDigest"] = hashlib.sha256(json.dumps(faces, sort_keys=True).encode()).hexdigest()
        self.faces = faces
        (self.packet / "faces.json").write_text(json.dumps(faces))

    def tearDown(self):
        self.tmp.cleanup()

    def record(self, **kw):
        args = dict(asset="rivallie", packet="art/review/2026-11-04-rivallie-faces-abc/", decision="director-approved",
                    scope=["faces"], recorded_by="test", note="n", date="2026-11-04")
        args.update(kw)
        return A.write(self.repo, self.apr, **args)

    def test_publishes_exact_bytes_and_a_staging_record(self):
        rec = self.record()
        found = P.faces_approval_for(self.repo, self.apr, "rivallie")
        self.assertEqual(found, (rec, self.packet.resolve()))
        staging = P.publish_faces(self.repo, found[1], found[0], "rivallie")
        data = json.loads(staging.read_text())
        self.assertEqual(data["packetDigest"], self.faces["sourceDigest"])
        self.assertEqual(data["registration"]["frames"]["rivallie:idle:s:0"], [0, 6])
        exported = self.repo / "art/source" / data["frames"][0]["file"]
        self.assertEqual(exported.read_bytes(), (self.packet / "neutral/s.png").read_bytes())
        P.publish_faces(self.repo, found[1], found[0], "rivallie")  # idempotent

    def test_no_approval_for_a_body_only_or_stale_record(self):
        self.record(scope=["body", "clips"])
        self.assertIsNone(P.faces_approval_for(self.repo, self.apr, "rivallie"))

    def test_changed_decal_bytes_refuse(self):
        rec = self.record()
        Image.new("RGBA", (32, 24), (99, 99, 99, 255)).save(self.packet / "neutral/s.png")
        with self.assertRaises(ForgeError):
            P.publish_faces(self.repo, self.packet.resolve(), rec, "rivallie")

    def test_changed_faces_json_refuses_and_unmatched_digest_finds_nothing(self):
        rec = self.record()
        data = json.loads((self.packet / "faces.json").read_text())
        data["bodyPacketDigest"] = "d" * 64  # edited without re-digesting
        (self.packet / "faces.json").write_text(json.dumps(data))
        with self.assertRaises(ForgeError):
            P.publish_faces(self.repo, self.packet.resolve(), rec, "rivallie")
        data["sourceDigest"] = "e" * 64  # regenerated packet: the old approval matches nothing
        (self.packet / "faces.json").write_text(json.dumps(data))
        self.assertIsNone(P.faces_approval_for(self.repo, self.apr, "rivallie"))

    def test_failed_qa_refuses(self):
        data = json.loads((self.packet / "faces.json").read_text())
        data["qa"][0]["pass"] = False
        payload = {k: v for k, v in data.items() if k != "sourceDigest"}
        data["sourceDigest"] = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        (self.packet / "faces.json").write_text(json.dumps(data))
        rec = self.record()
        with self.assertRaises(ForgeError):
            P.publish_faces(self.repo, self.packet.resolve(), rec, "rivallie")


if __name__ == "__main__":
    unittest.main()
