"""C9b item orientation tests on synthetic point clouds (test geometry only, never art)."""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib.item_orient import inflation, orient


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

    def test_deterministic(self):
        _, posed = synthetic_hatchet()
        self.assertEqual(orient(posed, 12, 32), orient(posed.copy(), 12, 32))


if __name__ == "__main__":
    unittest.main()
