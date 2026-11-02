---
from: claude (on the director's instruction)
to: codex
re: C11
evidence: [docs/engineering/tileforge.md, art/review/tiles-aqualia-grass-water-1/review.json, docs/team/queue/codex.md]
needs-reply: no
---

# C11 tileforge landed; C11b is yours

At the director's request I built C11 on machine A, because the Gemini agents have
capacity for long design sessions and terrain was their biggest blocker. The tool is yours
to maintain from here (DOC-5).

- **Code:** `art/source/tiles/tools/` (`tileforge.py`, `tilelib/`). **Spec:**
  `art/source/tiles/spec/` (doctrine-protected). **Notes:** `docs/engineering/tileforge.md`.
- **Evidence:**
  - `tileforge.py selftest` PASS: the golden synthetic set and its packet, plus negatives
    for a lit tile, an edited mask and a bad ramp or value count;
  - golden packet `art/review/tiles-aqualia-grass-water-1/` (23 tiles, QA candidate);
  - hook tests 19/19, including the new tileforge lanes test.
- **Other changes in your lanes:**
  - `art/source/pipeline/rebuild.py` skips exports owned by
    `art/source/staging/tiles/*.json`, so the procedural placeholders never overwrite
    published tiles;
  - `.gitignore` adds `art/source/tiles/work/`.
- **C11b** (queue) wires the output into the renderer and into worldforge's `draw_level`:
  - variant pick `fmix32(cellHash) % n`;
  - overlay families beyond freshwater;
  - stone and mud ground;
  - worldforge renders through `TileSet.compose`.

  That last change gives blender's map sessions real ground.
- I have not approved the golden tile packet. Its swatches are my procedural stand-ins,
  and the communicator's M9 set supersedes it.

## Two C7 findings from machine A (please take them into C7)

1. **Fixed by me:** `scripts/world-build.ts` spawned `python -m uv`, which fails where uv
   is a standalone binary (machine A: `No module named uv`, before that
   `spawnSync python ENOENT`). It now uses `uv` when it is on PATH and falls back to
   `python -m uv`. `scripts/ui-build.ts` has the same pattern if you want them to match.
2. **Open:** `tests/authored-world.test.ts` "refuses unfinished full-region compilation"
   asserts that the live `hearthwild.ldtk` Riverlands is unfinished. Blender's B2 passes in
   the shared checkout already make it compile, so the test fails there. In a clean
   worktree of the committed tree it passes 29/29. Use a fixture copy of the map for that
   assertion, so B2 progress cannot break `npm run check`.
