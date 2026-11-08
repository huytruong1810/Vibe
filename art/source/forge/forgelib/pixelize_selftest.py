"""pixelize input levers: rampShift validation and default no-op (approved art must not move);
C26 supersampled features (a sub-pixel fang near the mouth survives as 2 px, elsewhere it doesn't)."""
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib.core import ForgeError
from forgelib.color import ramp
from forgelib.pixelize import RampSet, _ss_labels


class RampShiftTest(unittest.TestCase):
    ramps = {"shell": "basalt", "moss": "moss"}

    def test_default_is_zero(self):
        self.assertFalse(RampSet(self.ramps).shift.any())
        self.assertFalse(RampSet(self.ramps, {}).shift.any())

    def test_shift_per_slot(self):
        self.assertEqual(RampSet(self.ramps, {"shell": -1}).shift.tolist(), [-1, 0])

    def test_rejects_unknown_slots_and_values(self):
        for bad in ({"hull": -1}, {"shell": 0}, {"shell": -3}, {"shell": 2}, {"shell": 1.0}, {"shell": True}):
            with self.assertRaises(ForgeError):
                RampSet(self.ramps, bad)



def _linear8(rgb) -> np.ndarray:
    c = np.asarray(rgb, dtype=np.float64) / 255
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return np.round(lin * 255).astype(np.uint8)


class FeatureTest(unittest.TestCase):
    """12 x 12 art px of pelt, K = 4. Two 2 x 2-sample cream specks: one at the mouth socket,
    one far from it. Only the first becomes a fang, grown to 2 px so it is never an orphan."""
    K, N = 4, 12
    ramps = RampSet({"pelt": "basalt", "fangs": "cream"})
    feats = {"fangs": {"minSamples": 2, "on": ["pelt"], "near": ["Socket_Mouth"], "radiusPx": 2, "maxPx": 2}}
    track = {"Socket_Mouth": [6.5, 6.5]}

    def setUp(self):
        k = self.K
        img = np.zeros((self.N * k, self.N * k, 4), dtype=np.uint8)
        img[..., :3] = _linear8(ramp("basalt")["mid"])
        img[..., 3] = 255
        for py, px in ((6, 6), (1, 10)):
            img[py * k + 1:py * k + 3, px * k + 1:px * k + 3, :3] = _linear8(ramp("cream")["light"])
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / "e_0_albedo_ss.png"
        Image.fromarray(img).save(self.path)
        self.mask = np.ones((self.N, self.N), dtype=bool)

    def tearDown(self):
        self.tmp.cleanup()

    def test_fang_near_mouth_survives_as_two_pixels(self):
        labels, feat, mask = _ss_labels(self.path, self.K, self.ramps, self.mask, self.feats, self.track, "e")
        self.assertEqual(int(feat.sum()), 2)
        self.assertTrue(feat[6, 6])
        self.assertFalse(feat[1, 10])
        self.assertEqual(int((labels == 1).sum()), 2)  # the far speck is pelt, not a stray fang

    def test_back_facings_show_no_feature(self):
        _, feat, _ = _ss_labels(self.path, self.K, self.ramps, self.mask, self.feats, self.track, "n")
        self.assertFalse(feat.any())

    def test_wrong_supersample_size_is_refused(self):
        with self.assertRaises(ForgeError):
            _ss_labels(self.path, 2, self.ramps, self.mask, self.feats, self.track, "e")


if __name__ == "__main__":
    unittest.main()
