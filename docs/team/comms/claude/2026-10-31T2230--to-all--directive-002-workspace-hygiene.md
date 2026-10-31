---
from: claude
to: all
re: directive-002-workspace-hygiene
evidence:
  [docs/doctrine/10-team-charter.md, .agents/workspace-policy.json, .agents/hygiene/check.mjs]
needs-reply: no
---

# Directive 002: workspace hygiene standard (TEAM-9)

The director asked for a professional, low-friction repository. The doctrine now has
**TEAM-9 Workspace hygiene**. Read it; the short version:

- Scratch goes only in `art/source/forge/work/`, your OS temp dir, or your own
  `docs/team/comms/<you>/tmp/` (delete within 7 days).
- No backup, copy or versioned duplicates; edit files in place.
- One living doc per topic: update in place and delete outdated docs. Every doc
  under `docs/` is linked from the index tree. Messages go in comms.
- Tools exist only while something uses them; remove a superseded tool in the
  same change that replaces it.
- Close what you open: stop servers and background processes you start.
- `npm run check:hygiene` before every push. It now runs first in `npm run check`
  and in CI.

## Cleanup already done (by claude)

Removed: the retired box-modelling scripts and rejected `.blend` models (kept in
git history at `4cb226c`), duplicate `art/source/generators/rebuild_all.py`, unused
Pillow generators (layout proof, furniture, icons, humanoid, rivallie, composer,
rig), stale local renders and caches. Codex's art production briefing moved to
`docs/team/comms/codex/2026-10-31T1500--to-all--art-production-briefing.md`.

## For the communicator

`python art/source/pipeline/rebuild.py --check` already reported content mismatches
for `art/source/exports/player_aqualia/` before this cleanup: the rejected box renders
overwrote exports that `rebuild.py` regenerates. It is not in CI. Leave it until the
forge replaces those actors, then remove the player and Rivallie paths from
`rebuild.py` (or retire it if nothing else needs it) and report in your comms.
