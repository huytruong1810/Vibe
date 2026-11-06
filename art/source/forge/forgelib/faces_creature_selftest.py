"""Creature face registration: per-frame offsets, hidden frames, coverage and distinctness (C3b).

uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p faces_creature_selftest.py
"""
from __future__ import annotations

import sys
import tempfile
import unittest
import json
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import forge  # noqa: E402
from forgelib import faces as F  # noqa: E402

CV = forge.spec("render_spec")["canvases"]["layer.face"]
PAL = forge.spec("palette")
ANCHOR = {"x": CV["anchor"][0] * 2, "y": CV["anchor"][1] * 2}
IMAGES = {(e, f): F.decal(e, f, PAL, CV) for e in F.EXPRESSIONS for f in F.FACINGS}


def packet(tmp: Path, boxes: dict) -> dict:
    """boxes: frame id -> opaque box (x0, y0, x1, y1) on a 112 px canvas with Socket_Head at (56, 40)."""
    frames = []
    for fid, box in boxes.items():
        name = fid.replace(":", "_") + ".png"
        im = Image.new("RGBA", (112, 112), (0, 0, 0, 0))
        im.paste((40, 160, 150, 255), box)
        im.save(tmp / name)
        frames.append({"id": fid, "file": name, "sourceSize": {"w": 112, "h": 112}, "sockets": {"Socket_Head": {"x": 56, "y": 40}}})
    return {"frames": frames}


class CreatureFaces(unittest.TestCase):
    def test_body_approval_lookup_skips_superseded_pointer(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            approvals = root / "approvals"
            approvals.mkdir()
            for name, extra in (("a", "superseded-by: newer.md\n"), ("b", "")):
                packet_dir = root / name
                packet_dir.mkdir()
                (packet_dir / "review.json").write_text(json.dumps({"sourceDigest": name * 64}))
                (approvals / f"c--{name}.md").write_text(
                    f"---\nasset: c\ndecision: director-approved\npacket: {name}\npacketDigest: {name * 64}\n{extra}---\n")
            with patch.object(forge, "REPO", root), patch.object(forge.core, "APPROVALS", approvals):
                self.assertEqual(forge.approval_for("c"), (approvals / "c--b.md", root / "b"))

    def reg(self, boxes, default=(0, 6)):
        with tempfile.TemporaryDirectory() as d:
            m = packet(Path(d), boxes)
            return F.register_frames(m, IMAGES, ANCHOR, F.EXPRESSIONS, Path(d), default)[0], m

    def test_a_head_under_the_socket_registers_at_the_default_offset(self):
        table, _ = self.reg({"c:idle:s:0": (30, 30, 82, 80)})
        self.assertEqual(table["c:idle:s:0"], [0, 6])

    def test_a_shifted_head_gets_a_nearer_valid_offset(self):
        # head box starts 2 frame px lower than the socket: the default 6 would put ink on the outline/outside
        table, _ = self.reg({"c:run:s:0": (30, 42, 82, 100)})
        self.assertIsNotNone(table["c:run:s:0"])
        self.assertGreater(table["c:run:s:0"][1], 6)

    def test_a_sliver_body_hides_the_face(self):
        table, _ = self.reg({"c:strike:s:0": (50, 36, 60, 44)})
        self.assertIsNone(table["c:strike:s:0"])

    def test_back_facings_are_not_registered(self):
        table, _ = self.reg({"c:idle:n:0": (30, 30, 82, 80)})
        self.assertEqual(table, {})

    def test_horizontal_recipe_offset_mirrors_west_and_southwest(self):
        table, _ = self.reg({f"c:idle:{f}:0": (15, 15, 100, 100) for f in F.FACINGS}, (-6, 8))
        for f in F.FACINGS:
            self.assertEqual(table[f"c:idle:{f}:0"], [6 if f in ("w", "sw") else -6, 8])

    def test_compact_profiles_fit_a_narrow_interior_without_changing_canvas(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            m = packet(root, {"c:idle:e:0": (55, 33, 61, 60), "c:idle:w:0": (55, 33, 61, 60)})
            original = dict(IMAGES)
            table = F.register_profiles(m, original, ANCHOR, F.EXPRESSIONS, root, (0, 6), PAL, CV)
            self.assertTrue(all(off is not None for off in table.values()))
            self.assertTrue(F.distinctness_check(original, F.EXPRESSIONS)["pass"])
            for f in ("e", "w"):
                self.assertEqual(original[("neutral", f)].size, IMAGES[("neutral", f)].size)
                for e in F.EXPRESSIONS:
                    self.assertLessEqual(original[(e, f)].getbbox()[2] - original[(e, f)].getbbox()[0], 4)

    def test_compact_profiles_do_not_replace_faces_that_already_fit(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            m = packet(root, {f"c:idle:{f}:0": (15, 15, 100, 100) for f in F.FACINGS})
            images = dict(IMAGES)
            F.register_profiles(m, images, ANCHOR, F.EXPRESSIONS, root, (0, 6), PAL, CV)
            self.assertEqual({k: v.tobytes() for k, v in images.items()},
                             {k: v.tobytes() for k, v in IMAGES.items()})

    def test_coverage_never_hides_idle_and_caps_the_rest(self):
        self.assertTrue(F.coverage_check({f"c:run:s:{i}": [0, 6] for i in range(9)} | {"c:run:s:9": None})["pass"])
        self.assertFalse(F.coverage_check({f"c:run:s:{i}": [0, 6] for i in range(8)} | {"c:run:s:8": None, "c:run:s:9": None})["pass"])
        self.assertFalse(F.coverage_check({"c:idle:s:0": None, **{f"c:run:s:{i}": [0, 6] for i in range(99)}})["pass"])

    def test_every_expression_differs_from_neutral_in_every_facing(self):
        self.assertTrue(F.distinctness_check(IMAGES, F.EXPRESSIONS)["pass"])
        same = dict(IMAGES)
        same[("hurt", "e")] = IMAGES[("neutral", "e")]
        self.assertFalse(F.distinctness_check(same, F.EXPRESSIONS)["pass"])

    def test_anchor_check_uses_the_per_frame_offset_and_skips_hidden(self):
        with tempfile.TemporaryDirectory() as d:
            m = packet(Path(d), {"c:idle:s:0": (30, 30, 82, 80), "c:hit:s:0": (50, 36, 60, 44)})
            check = F.registration_checks(m, IMAGES, ANCHOR, registration={"c:idle:s:0": [0, 6], "c:hit:s:0": None})[0]
            self.assertTrue(check["pass"], check["detail"])
            self.assertEqual(check["detail"].split(" ")[0], str(len(F.EXPRESSIONS)))


if __name__ == "__main__":
    unittest.main()
