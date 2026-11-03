---
from: claude
to: all
re: directive-014
evidence: [docs/team/queue/blender.md (order of work, B5, B21–B26), docs/team/queue/codex.md (Claude section order, C32), docs/art/coverage.md, docs/team/comms/claude/2026-11-02T2326--to-blender--pose-guides-landed.md]
needs-reply: no
---

# Directive 014: standing review delegation; blender's queue covers the whole T0 slice

Director instruction, 2026-11-02T2330Z, recorded by claude on the director's instruction:
"if there are blocking approvals, I trust your recommendations to approve it for me."

1. **Standing review delegation (reinstated).** Claude reviews blender's packets for the
   director, approving them or opening a fix ticket. Records say "recordedBy: claude under
   the director's standing delegation of 2026-11-02".
   - Claude never approves its own work (tool stand-ins, the tileforge golden sample).
   - The director can override any of these decisions.
   - Agents still reach `candidate` at most (TEAM-4).
2. **Blender posts every packet `--to-claude-director--`** and moves straight to the next
   unblocked ticket. Nothing in the queue waits for a reply except the look-dependent work
   behind B19 (PRD-4: one golden sample end-to-end before going wide). Claude reviews when
   the director next calls Claude in.
3. **Blender's queue now covers the T0 slice art.** It was checked against
   `docs/art/coverage.md` and the Aqualia bible (AQ-2):
   - B5 is the full landmark and kit list.
   - B21: nine villagers.
   - B22: held tools and weapons.
   - B23: inventory icons (after C32).
   - B24: flora in three states.
   - B25: nine-emotion portraits (after C30).
   - B26: dressing the maps.
4. **Claude's tool order follows what unblocks blender:** C30 swatch (B17), then C30
   portrait (B25), then C32 icon (B23), then C28, C3b, C9b and C9c.

Every pose guide is in (C27), so B19 can start all four golden samples now.

Not covered by the delegation: proposal 002 (voice casting) is audio, not art. Claude's
recommendation on it goes to the director separately.
