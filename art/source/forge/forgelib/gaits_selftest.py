"""C3h guard: every skeleton template's clip set covers the creature clip matrix with its own bones.

Pure Python (gaits.py has no bpy); runs in CI without Blender:
uv run --project art/source/forge python -B -m unittest discover -s art/source/forge/forgelib -p gaits_selftest.py
"""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

FORGE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(FORGE / "blender"))
import gaits  # noqa: E402

SPEC = FORGE / "spec"


def creature_clips() -> dict:
    clips = json.loads((SPEC / "render_spec.json").read_text())["clips"]
    return {k: v for k, v in clips.items() if not v.get("humansOnly") and not v.get("playerOnly")}


def templates() -> dict:
    out = {}
    for f in sorted((SPEC / "skeletons").glob("*.json")):
        t = json.loads(f.read_text())
        if t.get("kind") != "humanoid":
            out[f.stem] = t
    return out


class GaitTemplates(unittest.TestCase):
    def test_every_species_template_is_built(self):
        species = json.loads((SPEC / "skeletons" / "quadruped.json").read_text())["species"]
        names = {v for k, v in species.items() if k != "note"}
        self.assertEqual(names - set(templates()), set(), "species map names a template with no spec file")
        self.assertEqual(names - set(gaits.TEMPLATES), set(), "species map names a template with no clip set")

    def test_clip_sets_cover_the_matrix(self):
        clips = creature_clips()
        for name, t in templates().items():
            fns = gaits.clips_for(t)
            self.assertEqual(set(fns), set(clips), name)
            bones = {b["name"] for b in t["bones"]}
            ctx = gaits.Ctx(t["gait"], 1.0, 1.5, 0.4)
            for clip, spec in clips.items():
                n = spec["frames"]
                poses = fns[clip](ctx, n, spec["phases"]) if clip in gaits.PHASED else fns[clip](ctx, n)
                self.assertEqual(len(poses), n, f"{name}/{clip}")
                used = {b for p in poses for b in p}
                self.assertEqual(used - bones, set(), f"{name}/{clip} drives bones the template lacks")


if __name__ == "__main__":
    unittest.main()
