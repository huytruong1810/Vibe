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

    def test_composite_interior_face_locks_silhouette_and_clothing_and_skin_chroma(self):
        neutral = fake(size=96, head=(24, 12, 72, 60), body=(16, 60, 80, 96), skin=(212, 165, 138), cloth=(42, 68, 122))
        # Candidate with drifted clothing, drifted silhouette, warm-shifted skin, and an expression change in the face interior
        candidate = fake(size=96, head=(20, 10, 76, 62), body=(12, 58, 84, 96), skin=(235, 140, 95), cloth=(190, 50, 45))
        d = ImageDraw.Draw(candidate)
        # Draw expression features (brows/eyes/mouth) inside the face interior
        d.rectangle((36, 28, 44, 33), fill=(26, 28, 44, 255))
        d.rectangle((52, 28, 60, 33), fill=(26, 28, 44, 255))
        d.rectangle((40, 44, 56, 48), fill=(26, 28, 44, 255))

        locked = P.composite_interior_face(candidate, neutral)
        rep = P.identity_report(locked, neutral)
        self.assertEqual(rep["silhouetteIoU"], 1.0)
        self.assertEqual(rep["clothingColourDrift"], 0.0)
        self.assertLessEqual(rep["skinChromaDeltaE"], 2.5)
        self.assertGreaterEqual(rep["expressionDeltaPct"], 3.5)
        self.assertEqual(P._warnings(rep, "sad"), [])

    def test_identity_report_flags_skin_chroma_drift_and_low_expression_delta(self):
        neutral = fake(size=96, head=(24, 12, 72, 60), body=(16, 60, 80, 96), skin=(212, 165, 138), cloth=(42, 68, 122))
        warm_shifted = fake(size=96, head=(24, 12, 72, 60), body=(16, 60, 80, 96), skin=(240, 130, 80), cloth=(42, 68, 122))
        ImageDraw.Draw(warm_shifted).rectangle((36, 28, 58, 34), fill=(26, 28, 44, 255))
        rep = P.identity_report(warm_shifted, neutral)
        self.assertGreater(rep["skinChromaDeltaE"], 2.5)
        self.assertTrue(any("skin chroma drift" in w for w in P._warnings(rep, "warm")))

        tiny_change = neutral.copy()
        tiny_change.putpixel((48, 36), (26, 28, 44, 255))
        rep_tiny = P.identity_report(tiny_change, neutral)
        self.assertLess(rep_tiny["expressionDeltaPct"], 3.5)
        self.assertTrue(any("expression delta" in w or "nearly identical" in w for w in P._warnings(rep_tiny, "thoughtful")))

    def test_pairwise_expression_warnings_detects_identical_trio(self):
        neutral = fake(size=96, head=(24, 12, 72, 60), body=(16, 60, 80, 96))
        thoughtful = neutral.copy()
        ImageDraw.Draw(thoughtful).rectangle((36, 28, 60, 33), fill=(26, 28, 44, 255))
        concerned = thoughtful.copy()  # identical to thoughtful
        sad = neutral.copy()
        ImageDraw.Draw(sad).rectangle((36, 42, 60, 48), fill=(26, 28, 44, 255))

        warnings = P.pairwise_expression_warnings({"neutral": neutral, "thoughtful": thoughtful, "concerned": concerned, "sad": sad})
        self.assertTrue(any("thoughtful" in w and "concerned" in w for w in warnings))

        ImageDraw.Draw(concerned).rectangle((36, 35, 60, 41), fill=(26, 28, 44, 255))
        warnings_distinct = P.pairwise_expression_warnings({"neutral": neutral, "thoughtful": thoughtful, "concerned": concerned, "sad": sad})
        self.assertEqual(warnings_distinct, [])

    def test_fringe_inside_ellipse_preserved_and_lab_mean_std_reported(self):
        neutral = fake(size=96, head=(24, 12, 72, 60), body=(16, 60, 80, 96), skin=(212, 165, 138), cloth=(42, 68, 122))
        # Paint hair/fringe hanging inside the upper geometric ellipse (y=18..28, x=34..62)
        fringe_color = (45, 75, 115, 255)
        ImageDraw.Draw(neutral).rectangle((34, 18, 62, 28), fill=fringe_color)

        # Candidate overwrites the entire head ellipse with warm skin and new eyes/mouth
        candidate = fake(size=96, head=(24, 12, 72, 60), body=(16, 60, 80, 96), skin=(230, 150, 110), cloth=(42, 68, 122))
        d = ImageDraw.Draw(candidate)
        d.rectangle((36, 32, 44, 36), fill=(26, 28, 44, 255))
        d.rectangle((52, 32, 60, 36), fill=(26, 28, 44, 255))
        d.rectangle((40, 45, 56, 49), fill=(26, 28, 44, 255))

        locked = P.composite_interior_face(candidate, neutral)
        # Fringe pixels inside the upper ellipse must remain exact neutral hair pixels
        self.assertEqual(locked.getpixel((48, 22)), fringe_color)
        self.assertEqual(locked.getpixel((40, 25)), fringe_color)

        rep = P.identity_report(locked, neutral)
        self.assertIn("skinLabMeanDeltaE", rep)
        self.assertIn("skinLabStdDeltaE", rep)
        self.assertIsNotNone(rep["skinLabMeanDeltaE"])
        self.assertIsNotNone(rep["skinLabStdDeltaE"])
        self.assertLessEqual(rep["skinLabMeanDeltaE"], 2.5)

        # Also verify against a real neutral portrait on disk when present
        real_neutral_path = P.PORTRAITS / "portrait_npc_neris_128.png"
        if real_neutral_path.exists():
            real_neutral = Image.open(real_neutral_path).convert("RGBA")
            real_mask, (fx0, fy0, fx1, _) = P.face_interior_mask(real_neutral)
            # Crown and upper-forehead hair pixels inside horizontal bounds [fx0, fx1] must be masked out (0.0)
            na = np.asarray(real_neutral.split()[3]) > 127
            x0, y0, x1, y1 = P._bbox(real_neutral)
            bh = max(1, y1 - y0)
            upper_hair = na[: y0 + int(round(0.20 * bh)), fx0:fx1]
            if upper_hair.any():
                self.assertEqual(float(real_mask[: y0 + int(round(0.20 * bh)), fx0:fx1][upper_hair].max()), 0.0)


if __name__ == "__main__":
    unittest.main()
