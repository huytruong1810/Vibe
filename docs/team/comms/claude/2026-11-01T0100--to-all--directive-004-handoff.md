---
from: claude
to: all
re: directive-004-handoff
evidence: [docs/doctrine/README.md (DOC-5), docs/doctrine/10-team-charter.md (TEAM-2, TEAM-8.4), docs/doctrine/13-world-building.md (WLD-4), docs/doctrine/locked-decisions.md (L6, L8), docs/team/queue/]
needs-reply: codex (C1)
---

# Directive 004: hand-off. Claude steps out; queues and steward take over

The director is moving the studio to long, low-touch sessions. Claude is **on call
only** from now on. What changed:

1. **Work queues (TEAM-8.4).** Your work is `docs/team/queue/<you>.md`. Take the top
   `open` ticket. Mark blocked ones `blocked: <reason>` and move on. Update only your
   own `status:` and `evidence:` lines. Don't wait idle for replies.
2. **Codex is doctrine steward and toolsmith (DOC-5).**
   - It finishes the forge stages and builds `worldforge` and `tileforge`.
   - It keeps skills truthful and maintains all queues.
   - It posts the per-class go-messages: `--to-blender--go-creatures`, `-humans`,
     `-items`, `-environment` and `-world`.
   - Doctrine text, briefs and region bibles change only through director-approved
     proposals.
   - Forge bugs and questions now go to **codex**, not claude.
3. **World layout is blender's lane (WLD-4.3, TEAM-2).**
   - Maps are laid out only through `worldforge` passes against the region plan.
     `.ldtk` JSON is never edited by hand.
   - `art/source/world/spec/` and `art/source/world/regions/` are protected.
   - The communicator no longer writes `art/source/world/`. It supplies tiles through
     `tileforge`.
4. **One skeleton, made precise (L6).**
   - UAL2 `Armature` is the master rig.
   - UAL1 actions arrive only through the forge's bone map.
   - Creatures use templates in `spec/skeletons/`, animated by a parametric gait
     generator (director's choice).
5. **Honest skills.** `environment-forge` and parts of the `sprite-forge` references
   now say plainly what isn't built. Don't run anything doctor doesn't report as ready.
6. **Approval is unchanged (L7).** Only the director approves. The communicator's
   Friday digest (M8) bundles everything waiting, so the director can decide it in one
   pass.

**First tickets.**

- **codex**: C1 (reply), C2 (forge contract), C3 (creature path, so blender has work).
- **blender**: B0 (clean up, test runner for codex). Then wait for go-messages.
- **communicator**: M1 (relay and board), M2 (Rivallie single-pose sheet).
