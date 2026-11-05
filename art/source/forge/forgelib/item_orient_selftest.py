"""C9b item orientation tests on synthetic point clouds (test geometry only, never art)."""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib.item_orient import inflate, inflation, inflation_offsets, orient


def synthetic_hatchet(seed: int = 3) -> tuple[np.ndarray, np.ndarray]:
    """Haft along +Z (0..1), blade wider at the top reaching toward -Y; then a random pose."""
    rng = np.random.default_rng(seed)
    haft = np.column_stack([rng.uniform(-0.02, 0.02, 400), rng.uniform(-0.02, 0.02, 400), rng.uniform(0, 1, 400)])
    blade = np.column_stack([rng.uniform(-0.01, 0.01, 300), rng.uniform(-0.30, 0.0, 300), rng.uniform(0.8, 1.0, 300)])
    poll = np.column_stack([rng.uniform(-0.02, 0.02, 60), rng.uniform(0.0, 0.06, 60), rng.uniform(0.85, 0.95, 60)])
    canonical = np.vstack([haft, blade, poll])
    q, _ = np.linalg.qr(rng.normal(size=(3, 3)))
    if np.linalg.det(q) < 0:
        q[:, 0] = -q[:, 0]
    return canonical, canonical @ q.T * 3.7 + np.array([5.0, -2.0, 9.0])


def apply(result: dict, vertices: np.ndarray) -> np.ndarray:
    m = np.array(result["matrix"])
    return vertices @ m[:3, :3].T + m[:3, 3]


class ItemOrientTest(unittest.TestCase):
    def test_recovers_head_up_blade_forward_grip_at_origin(self):
        canonical, posed = synthetic_hatchet()
        result = orient(posed, length_art_px=12, art_px_per_unit=32)
        out = apply(result, posed)
        self.assertAlmostEqual(out[:, 2].max() - out[:, 2].min(), 12 / 32, places=5)
        top = out[:, 2] > out[:, 2].max() - 0.2 * 12 / 32
        self.assertLess(out[top, 1].min(), -0.05)          # blade forward (-Y) at the head
        self.assertAlmostEqual(out[:, 2].min(), -0.15 * 12 / 32, delta=0.01)  # grip 15% from butt
        self.assertEqual(result["grip"], [0.0, 0.0, 0.0])
        m = np.array(result["matrix"])[:3, :3]
        self.assertGreater(np.linalg.det(m), 0)                       # never mirrored
        m = m / np.cbrt(np.linalg.det(m))
        self.assertTrue(np.allclose(m @ m.T, np.eye(3), atol=1e-4))  # rigid + uniform scale

    def test_flips_are_input_levers(self):
        _, posed = synthetic_hatchet()
        plain = apply(orient(posed, 12, 32), posed)
        flipped = apply(orient(posed, 12, 32, flip_head=True), posed)
        wide = lambda o: np.abs(o[:, 1]) > 0.05  # noqa: E731 - blade points
        self.assertGreater(np.median(plain[wide(plain), 2]), 0.2)     # blade at the top
        self.assertLess(np.median(flipped[wide(flipped), 2]), 0.0)    # head now down
        forward = apply(orient(posed, 12, 32, flip_forward=True), posed)
        top = forward[:, 2] > forward[:, 2].max() - 0.05
        self.assertGreater(forward[top, 1].max(), 0.05)

    def test_reach_limit_and_bad_input_fail_loudly(self):
        _, posed = synthetic_hatchet()
        with self.assertRaisesRegex(ValueError, "reaches"):
            orient(posed, 40, 32, max_reach_art_px=14)
        with self.assertRaises(ValueError):
            orient(np.zeros((20, 3)), 12, 32)
        with self.assertRaises(ValueError):
            orient(posed, 12, 32, grip_fraction=0.7)

    def test_measures_haft_and_inflates_only_thin_ones(self):
        _, posed = synthetic_hatchet()
        width = orient(posed, 12, 32)["haftWidthArtPx"]
        self.assertGreater(width, 0.2)
        self.assertLess(width, 1.0)              # a 0.04-wide haft at 12 px is under 1 px
        self.assertGreater(inflation(width, 2, 32), 0)
        self.assertEqual(inflation(3.0, 2, 32), 0.0)

    # C36 (visitor finding 3): the copper sword and shortbow read as a paddle and a sausage because one isotropic
    # offset, sized for the thin axis, also fattens the blade width and fills the stave-to-string gap.
    SWORD_DIMS = [0.032584, 0.146749, 0.4375]   # x thickness, y width, z length (world units), item-copper-sword orient.json
    BOW_DIMS = [0.042621, 0.105624, 0.53125]    # item-shortbow orient.json

    @staticmethod
    def box(x, y, z, cx=0.0, cy=0.0, cz=0.0):
        """Eight corner vertices of an axis-aligned box with the corner's outward normal."""
        pts, nrm = [], []
        for sx in (-1, 1):
            for sy in (-1, 1):
                for sz in (-1, 1):
                    pts.append([cx + sx * x / 2, cy + sy * y / 2, cz + sz * z / 2])
                    nrm.append([sx, sy, 0.0])
        return np.array(pts), np.array(nrm, dtype=float)

    def test_thin_axis_inflation_keeps_a_blade_as_wide_as_it_is(self):
        iso = inflation_offsets(self.SWORD_DIMS, 2.4, 32, "all", 1.367)
        thin = inflation_offsets(self.SWORD_DIMS, 2.4, 32, "thin")
        self.assertAlmostEqual(iso[1] * 32, 0.817, places=2)   # today's behaviour: width also grows 0.82 px a side
        self.assertEqual(thin[1], 0.0)                         # 4.7 px wide already clears 2.4 px
        self.assertGreater(thin[0] * 32, 0.0)                  # the 1.0 px thickness still thickens
        self.assertEqual(thin[2], 0.0)                         # length is never touched
        v, n = self.box(*self.SWORD_DIMS)
        out = inflate(v, n, thin)
        self.assertAlmostEqual(np.ptp(out[:, 1]), self.SWORD_DIMS[1], places=6)
        self.assertGreaterEqual(np.ptp(out[:, 0]) * 32, 1.25 * 2.4 - 1e-6)

    def test_thin_axis_inflation_keeps_the_bow_gap(self):
        gap = 0.07  # stave to string, about 2.2 px at 32 px per unit
        a, na = self.box(0.0426, 0.02, 0.5, cy=-gap / 2 - 0.01)
        b, nb = self.box(0.0426, 0.02, 0.5, cy=gap / 2 + 0.01)
        off = inflation_offsets(self.BOW_DIMS, 2.7, 32, "thin")
        ia, ib = inflate(a, na, off), inflate(b, nb, off)
        self.assertAlmostEqual(ib[:, 1].min() - ia[:, 1].max(), gap, places=6)
        wide = inflation_offsets(self.BOW_DIMS, 2.7, 32, "all", 1.387)
        self.assertLess(inflate(b, nb, wide)[:, 1].min() - inflate(a, na, wide)[:, 1].max(), gap - 0.02)  # the old fill

    def test_default_mode_is_the_old_isotropic_offset(self):
        self.assertEqual(inflation_offsets(self.SWORD_DIMS, 2.4, 32, haft_width_px=1.367), inflation_offsets(self.SWORD_DIMS, 2.4, 32, "all", 1.367))
        with self.assertRaisesRegex(ValueError, "inflate"):
            inflation_offsets(self.SWORD_DIMS, 2.4, 32, "bogus", 1.367)

    def test_deterministic(self):
        _, posed = synthetic_hatchet()
        self.assertEqual(orient(posed, 12, 32), orient(posed.copy(), 12, 32))


if __name__ == "__main__":
    unittest.main()
