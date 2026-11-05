"""Worldforge previous-revision comparison selftests (C32-worldforge / V12).

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p worldforge_compare_selftest.py
"""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools import worldforge_compare as WC  # noqa: E402


class WorldforgeCompareTest(unittest.TestCase):
    def test_resolves_previous_revision_overview_instead_of_blank_draft(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            rev1 = root / "2026-11-01-world-aqualia-aqualia_riverlands-1"
            rev2 = root / "2026-11-02-world-aqualia-aqualia_riverlands-2"
            rev3 = root / "2026-11-05-world-aqualia-aqualia_riverlands-3"
            for r, color, count in [(rev1, (40, 80, 40), 10), (rev2, (60, 120, 90), 25), (rev3, (80, 160, 140), 38)]:
                r.mkdir(parents=True)
                Image.new("RGB", (64, 48), color).save(r / "overview.png")
                (r / "world-review.json").write_text(
                    json.dumps(
                        {
                            "region": "aqualia",
                            "level": "Aqualia_Riverlands",
                            "revision": int(r.name.rsplit("-", 1)[1]),
                            "placements": count,
                            "qa": {"verdict": "pass", "errors": 0, "warnings": 0},
                        }
                    )
                )

            prev = WC.find_previous_packet(rev3, review_root=root)
            self.assertEqual(prev, rev2)

            report = WC.prepare_packet_comparison(rev3, review_root=root)
            self.assertEqual(report["beforeSource"], str(rev2 / "overview.png"))
            self.assertEqual(report["previousRevision"], 2)
            self.assertEqual(report["currentRevision"], 3)
            self.assertEqual(report["placementDelta"], 13)
            self.assertTrue((rev3 / "before-overview.png").exists())
            self.assertTrue((rev3 / "comparison.png").exists())
            # Verify before-overview.png matches rev2's overview colour, not a blank draft
            before_im = Image.open(rev3 / "before-overview.png").convert("RGB")
            self.assertEqual(before_im.getpixel((10, 10)), (60, 120, 90))


if __name__ == "__main__":
    unittest.main()
