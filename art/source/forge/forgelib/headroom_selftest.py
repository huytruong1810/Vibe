"""heightArtPx headroom arithmetic that needs no asset: room, extents, limits, spec table.

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p headroom_selftest.py
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib import headroom as H  # noqa: E402

CV = {"size": [40, 44], "anchor": [20, 34]}


def frame(box, size=(40, 44)):
    im = np.zeros((size[1], size[0], 4), dtype=np.uint8)
    x0, y0, x1, y1 = box
    im[y0:y1 + 1, x0:x1 + 1, 3] = 255
    return im


class HeadroomTest(unittest.TestCase):
    def test_room_keeps_the_margin_on_every_side(self):
        self.assertEqual(H.room(CV, 2), {"up": 32, "down": 7, "left": 18, "right": 17})

    def test_a_frame_exactly_at_the_margin_has_scale_one(self):
        im = frame((2, 2, 37, 41))                       # last allowed rows and columns for a 2 px margin
        ext = H.extents([im], CV)
        self.assertEqual(ext, {"up": 32, "down": 7, "left": 18, "right": 17})
        self.assertEqual(H.limit(ext, H.room(CV, 2), 24), {"maxHeightArtPx": 24, "tightSide": "up", "scale": 1.0})

    def test_slack_gives_headroom_and_names_the_tight_side(self):
        ext = H.extents([frame((10, 14, 30, 36))], CV)   # reaches 20 up, 2 down, 10 left, 10 right
        self.assertEqual(ext, {"up": 20, "down": 2, "left": 10, "right": 10})
        lim = H.limit(ext, H.room(CV, 2), 20)
        self.assertEqual(lim["tightSide"], "up")         # the smallest room-to-extent ratio: 32/20 against 7/2, 18/10, 17/10
        self.assertEqual(lim["maxHeightArtPx"], 32)      # 1.6 x 20

    def test_extents_take_the_worst_frame_and_ignore_empty_ones(self):
        ext = H.extents([frame((15, 20, 25, 34)), np.zeros((44, 40, 4), np.uint8), frame((5, 28, 20, 38))], CV)
        self.assertEqual((ext["up"], ext["down"], ext["left"]), (14, 4, 15))

    def test_spec_table_lists_every_sized_canvas(self):
        names = {r["canvas"] for r in H.spec_table()}
        self.assertTrue({"human.locomotion", "creature.small", "creature.large", "icon.item"} <= names)
        small = next(r for r in H.spec_table() if r["canvas"] == "creature.small")
        self.assertEqual((small["up"], small["down"]), (32, 7))


if __name__ == "__main__":
    unittest.main()
