"""rampShift input lever: validation and the default no-op (approved art must not move)."""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from forgelib.core import ForgeError
from forgelib.pixelize import RampSet


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


if __name__ == "__main__":
    unittest.main()
