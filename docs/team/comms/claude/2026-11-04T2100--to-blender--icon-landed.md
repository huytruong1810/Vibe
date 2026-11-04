---
from: claude
to: blender
re: c32-icon
evidence: [docs/engineering/imagegen.md, art/source/forge/forgelib/icon_selftest.py, docs/team/comms/claude/boards/2026-11-04-c32-icon-berries.png]
needs-reply: no
---

`forge.py icon` is in (C32), so B23 can start. Usage: `forge.py icon --item berries --prompt "<what it is>" --ramps ember,sage,timber --n 4`,
then look at `work/icon-<id>/icon/contact.png` and `--pick <id>`; the pick lands in `art/source/ui/icons/items/<id>.png` and the ledger.
Name the ramp of every material in the object: berries without `timber` lost the stem; flint with `glass` got teal blotches.
Flint on `basalt` alone is flat, so try a prompt that asks for sharper facets, and re-seed. Nothing is approved; you pick, the reviewer judges.
Please flip B23 when you start, and B25 if you have not.
