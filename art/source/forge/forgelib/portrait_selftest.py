"""Portrait helpers that need no GPU: flat-background cutout, framing alignment, identity report, prompt coverage.

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p portrait_selftest.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import portrait as P  # noqa: E402


def fake(size=128, head=(40, 20, 88, 70), body=(24, 80, 104, 128), skin=(220, 170, 140), cloth=(40, 60, 120), alpha=True):
    bg = (0, 0, 0, 0) if alpha else (*P.BG, 255)
    im = Image.new("RGBA", (size, size), bg)
    d = ImageDraw.Draw(im)
    d.ellipse(head, fill=(*skin, 255))
    d.rectangle(body, fill=(*cloth, 255))
    return im


class PortraitTest(unittest.TestCase):
    def test_emotions_are_the_contract_nine(self):
        self.assertEqual(P.EMOTIONS, ["neutral", "warm", "thoughtful", "curious", "concerned", "amused", "angry", "sad", "fearful"])
        self.assertEqual(sorted(P.FACE), sorted(e for e in P.EMOTIONS if e != "neutral"))

    def test_cutout_removes_background_keeps_subject_and_interior_grey(self):
        im = fake(alpha=False)
        ImageDraw.Draw(im).rectangle((60, 90, 70, 100), fill=(*P.BG, 255))  # grey inside the body must survive
        out = P.cutout(im.convert("RGB"))
        a = np.asarray(out.split()[3])
        self.assertEqual(a[2, 2], 0)
        self.assertEqual(a[50, 64], 255)
        self.assertEqual(a[95, 65], 255)

    def test_align_matches_neutral_bbox(self):
        neutral = fake()
        shifted = fake(head=(60, 40, 108, 90), body=(44, 100, 124, 128 + 0))  # moved, then re-framed
        smaller = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        smaller.paste(fake().resize((96, 96), Image.LANCZOS), (16, 24))
        out = P.align(smaller, neutral)
        nb, ob = P._bbox(neutral), P._bbox(out)
        self.assertLessEqual(abs(nb[3] - ob[3]), 2)
        self.assertLessEqual(abs((nb[0] + nb[2]) - (ob[0] + ob[2])), 3)
        self.assertIsNotNone(shifted)

    def test_identity_report_flags_drift_and_unchanged_face(self):
        n = fake()
        same = P.identity_report(n, n)
        self.assertEqual(same["silhouetteIoU"], 1.0)
        self.assertIn("nearly identical", " ".join(P._warnings(same, "sad")))
        self.assertEqual(P._warnings(same, "neutral"), [])
        changed = fake(cloth=(200, 40, 40))
        rep = P.identity_report(changed, n)
        self.assertTrue(any("clothing colour drift" in w for w in P._warnings(rep, "sad")))
        moved = fake(head=(0, 0, 40, 40), body=(0, 60, 60, 128))
        self.assertTrue(any("silhouette" in w for w in P._warnings(P.identity_report(moved, n), "sad")))

    def test_on_flat_is_opaque_grey_background(self):
        flat = P.on_flat(fake(), 256)
        self.assertEqual(flat.size, (256, 256))
        self.assertEqual(flat.getpixel((2, 2)), P.BG)

    def test_pick_rejects_wrong_emotion(self):
        with self.assertRaises(P.ForgeError):
            P._keep("npc:selftest-nobody", Path("/nonexistent"), fake(), "sad=warm-1")


if __name__ == "__main__":
    unittest.main()
