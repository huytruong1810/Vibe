"""Local reference-art helpers that need no GPU: view splitting and prompt planning.

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p concept_selftest.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib.concept import split_views  # noqa: E402
from forgelib.core import ForgeError  # noqa: E402


def sheet(boxes, size=(1200, 500), bg=(200, 202, 205)):
    im = Image.new("RGB", size, bg)
    d = ImageDraw.Draw(im)
    for box in boxes:
        d.ellipse(box, fill=(40, 120, 130))
    return im


class SplitViews(unittest.TestCase):
    def test_three_subjects_left_to_right(self):
        im = sheet([(60, 80, 300, 460), (450, 100, 760, 450), (880, 70, 1120, 470)])
        boxes = split_views(im, 3)
        self.assertEqual(len(boxes), 3)
        self.assertTrue(boxes[0][0] < boxes[1][0] < boxes[2][0])
        x0, y0, x1, y1 = boxes[1]
        self.assertTrue(445 <= x0 <= 455 and 755 <= x1 <= 765 and 95 <= y0 <= 105 and 445 <= y1 <= 455)

    def test_detached_part_merges_into_its_subject(self):
        # a tail tip separated by a thin background gap still belongs to the middle subject
        im = sheet([(60, 80, 300, 460), (450, 100, 700, 450), (712, 300, 760, 340), (880, 70, 1120, 470)])
        self.assertEqual(len(split_views(im, 3)), 3)

    def test_wrong_subject_count_refuses(self):
        im = sheet([(60, 80, 500, 460), (700, 100, 1100, 450)])
        with self.assertRaises(ForgeError):
            split_views(im, 3)


if __name__ == "__main__":
    unittest.main()
