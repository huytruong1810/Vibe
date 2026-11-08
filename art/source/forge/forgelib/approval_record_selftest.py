"""Approval record writer and checker, on a scratch repo.

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p approval_record_selftest.py
"""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import approval_record as A  # noqa: E402

DIGEST = "ab" * 32


class ApprovalRecordTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo = Path(self.tmp.name)
        self.apr = self.repo / "approvals"
        self.apr.mkdir()
        self.packet = self.repo / "art/review/2026-11-04-neris"
        self.packet.mkdir(parents=True)
        (self.packet / "review.json").write_text(json.dumps({"sourceDigest": DIGEST}))

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, **kw):
        args = dict(asset="neris", packet="art/review/2026-11-04-neris/", decision="director-approved", scope=["body", "clips"],
                    recorded_by="claude under directive 016", note="Looks right.", date="2026-11-04")
        args.update(kw)
        return A.write(self.repo, self.apr, **args)

    def test_digest_comes_from_review_json(self):
        rec = self.write()
        self.assertEqual(rec.name, "neris--2026-11-04-neris.md")
        meta = A.parse_meta(rec.read_text())
        self.assertEqual(meta["packetDigest"], DIGEST)
        self.assertEqual(meta["scope"], "[body, clips]")
        self.assertEqual(A.check(self.repo, self.apr), ([], []))

    def test_recorded_by_is_required(self):
        with self.assertRaises(A.RecordError):
            self.write(recorded_by=" ")

    def test_refuses_overwrite_and_bad_decision(self):
        self.write()
        with self.assertRaises(A.RecordError):
            self.write()
        with self.assertRaises(A.RecordError):
            self.write(decision="maybe", suffix="-x")

    def test_suffix_for_faces(self):
        self.assertEqual(self.write(suffix="-faces").name, "neris--2026-11-04-neris-faces.md")

    def test_check_flags_a_stale_digest_and_missing_packet(self):
        self.write()
        (self.packet / "review.json").write_text(json.dumps({"sourceDigest": "cd" * 32}))
        self.assertIn("neris--2026-11-04-neris.md", A.check(self.repo, self.apr)[0][0])
        (self.packet / "review.json").unlink()
        self.assertEqual(A.check(self.repo, self.apr), ([], ["neris--2026-11-04-neris.md"]))

    def test_check_skips_unbound_decisions(self):
        self.write(decision="changes-requested")
        (self.packet / "review.json").write_text(json.dumps({"sourceDigest": "cd" * 32}))
        self.assertEqual(A.check(self.repo, self.apr), ([], []))

    def test_check_skips_superseded_by(self):
        rec = self.write()
        rec.write_text(rec.read_text().replace("recordedBy:", "superseded-by: x.md\nrecordedBy:"))
        (self.packet / "review.json").write_text(json.dumps({"sourceDigest": "cd" * 32}))
        self.assertEqual(A.check(self.repo, self.apr), ([], []))


if __name__ == "__main__":
    unittest.main()
