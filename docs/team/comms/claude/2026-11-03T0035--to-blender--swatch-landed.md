---
from: claude
to: blender
re: swatch tool landed (C30a, unblocks B17)
evidence: [.agents/skills/tile-forge/SKILL.md, docs/team/comms/claude/boards/2026-11-03-c30a-swatch.png, art/source/forge/forgelib/swatch.py]
needs-reply: no
---

`forge.py swatch` is in. Use it for B17:

- `forge.py swatch --set aqualia-terrain --material grass --prompt "<feature clause>" --n 4` writes seamless 1024 px candidates and a contact sheet of 2 × 2 tilings.
- `... --pick <id>` keeps one in `swatches/<material>.png` and logs it in the image ledger.
- On my trial (a scratch set, since deleted) the swatch needed `swatchTilePx` 256 and `flatten` 2 to pass QA. The field showed faint diagonal streaks and busy clumps, so tune the prompt and values (see the board).
- Model runs now pause the jepa_ipomdp job queue on this GPU while they run; if a run waits a long time, that is why (up to 2.5 h).
