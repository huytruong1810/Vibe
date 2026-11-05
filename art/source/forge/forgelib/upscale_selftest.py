"""Upscale pass helpers that need no GPU: padding, chroma match, identity numbers, OKLab round trip.

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p upscale_selftest.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import upscale as U  # noqa: E402
from forgelib.color import rgb8_to_oklab  # noqa: E402

BG = (200, 200, 205)


def sheet(fill, size=(300, 400), box=(60, 60, 240, 340), bg=BG):
    im = Image.new("RGB", size, bg)
    ImageDraw.Draw(im).ellipse(box, fill=fill)
    return im


class UpscaleTest(unittest.TestCase):
    def test_oklab_round_trip(self):
        rgb = np.array([[[10, 200, 40], [250, 250, 250], [90, 60, 30]]], dtype=np.uint8)
        back = U._oklab_to_rgb8(rgb8_to_oklab(rgb))
        self.assertLessEqual(int(np.abs(back.astype(int) - rgb.astype(int)).max()), 1)

    def test_finish_pads_with_its_own_background_and_keeps_subject_off_the_edge(self):
        out = U.finish(sheet((60, 120, 60), bg=(190, 192, 196)))
        a = np.asarray(out)
        self.assertEqual(tuple(a[0, 0]), (190, 192, 196))
        self.assertEqual(tuple(a[-1, -1]), (190, 192, 196))
        self.assertGreaterEqual(min(a[0].min(), 0), 0)
        sub = np.abs(a.astype(int) - np.array((190, 192, 196))).max(2) > 24
        ys, xs = np.nonzero(sub)
        self.assertGreaterEqual(min(ys.min(), xs.min(), out.height - 1 - ys.max(), out.width - 1 - xs.max()), 16)

    def test_chroma_match_removes_a_warm_cast_and_keeps_lightness(self):
        old, new = sheet((90, 110, 80)), sheet((120, 100, 80))
        fixed = U.match_chroma(new, old)
        before = U.identity(new, old)["colourDrift"]
        after = U.identity(fixed, old)["colourDrift"]
        self.assertLess(after, before)
        lo, lf = rgb8_to_oklab(np.asarray(new))[150, 150, 0], rgb8_to_oklab(np.asarray(fixed))[150, 150, 0]
        self.assertAlmostEqual(float(lo), float(lf), places=1)
        self.assertEqual(tuple(np.asarray(fixed)[0, 0]), BG)    # background untouched

    def test_identity_of_a_scaled_copy_is_one(self):
        old = sheet((90, 110, 80))
        r = U.identity(old.resize((600, 800), Image.LANCZOS), old)
        self.assertGreater(r["silhouetteIoU"], 0.98)
        self.assertLess(r["colourDrift"], 3)

    def test_identity_flags_a_changed_silhouette(self):
        old = sheet((90, 110, 80))
        other = Image.new("RGB", (300, 400), BG)
        d = ImageDraw.Draw(other)
        d.rectangle((60, 60, 240, 120), fill=(90, 110, 80))   # a different shape: bar on top, thin stem below
        d.rectangle((140, 120, 160, 340), fill=(90, 110, 80))
        self.assertLess(U.identity(other, old)["silhouetteIoU"], 0.8)


if __name__ == "__main__":
    unittest.main()
