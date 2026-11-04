"""Icon reduction and checks that need no GPU: size, margin, palette lock, selective outline, prompt palette text.

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p icon_selftest.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import icon as I  # noqa: E402
from forgelib.color import ramp  # noqa: E402
from forgelib.core import ForgeError  # noqa: E402


def blob(size=400, box=(60, 90, 340, 310), fill=(200, 80, 80, 255)):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(im).ellipse(box, fill=fill)
    return im


class IconTest(unittest.TestCase):
    def test_reduce_is_32px_palette_locked_with_margin(self):
        ic = I.reduce(blob(), ["ember", "sage"])
        self.assertEqual(ic.size, (32, 32))
        self.assertEqual(I.check(ic, ["ember", "sage"]), [])

    def test_outline_uses_deep_and_shadow_of_the_bordering_ramp(self):
        ic = np.asarray(I.reduce(blob(), ["ember"]))
        cols = {tuple(int(v) for v in p[:3]) for p in ic[ic[..., 3] > 0]}
        self.assertIn(ramp("ember")["deep"], cols)       # lower/right edge
        self.assertIn(ramp("ember")["shadow"], cols)
        # an outline pixel (deep) never sits inside the body: its 4 neighbours are not all opaque
        deep = ramp("ember")["deep"]
        for y, x in zip(*np.nonzero((ic[..., :3] == deep).all(-1) & (ic[..., 3] > 0))):
            nb = [ic[y + dy, x + dx, 3] for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < 32 and 0 <= x + dx < 32]
            self.assertFalse(len(nb) == 4 and all(v > 0 for v in nb), (y, x))

    def test_wide_and_tall_subjects_keep_margin_two(self):
        for box in ((0, 150, 399, 250), (150, 0, 250, 399)):
            ic = I.reduce(blob(box=box), ["ember"])
            self.assertEqual(I.check(ic, ["ember"]), [], box)

    def test_check_flags_bad_icons(self):
        off = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        off.putpixel((0, 5), (1, 2, 3, 255))
        probs = " ".join(I.check(off, ["ember"]))
        self.assertIn("margin", probs)
        self.assertIn("outside ramps", probs)
        self.assertEqual(I.check(Image.new("RGBA", (16, 16)), ["ember"]), ["size (16, 16) is not 32x32"])

    def test_empty_render_and_unknown_ramp_are_errors(self):
        with self.assertRaises(ForgeError):
            I.reduce(Image.new("RGBA", (64, 64), (0, 0, 0, 0)), ["ember"])
        with self.assertRaises(Exception):
            I._check_ramps(["not-a-ramp"])
        with self.assertRaises(ForgeError):
            I._check_ramps([])

    def test_prompt_palette_text_names_hex_steps_without_deep(self):
        t = I._palette_text(["ember"])
        self.assertIn("#", t)
        deep = ramp("ember")["deep"]
        self.assertNotIn(f"#{deep[0]:02x}{deep[1]:02x}{deep[2]:02x}", t)


if __name__ == "__main__":
    unittest.main()
