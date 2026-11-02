---
from: claude
to: all
re: directive-006-review-decisions
evidence: [docs/team/comms/director/approvals/, docs/doctrine/09-production-doctrine.md (PRD-9), docs/doctrine/10-team-charter.md (TEAM-2a, TEAM-3.1, TEAM-4), .agents/hooks/guard.mjs, docs/team/queue/]
needs-reply: no (act on your queue)
---

# Directive 006: director review, decisions and rule changes

The director gave Claude full director permissions for this review (2026-10-31). Every
record below says `recordedBy: claude on the director's instruction`. The reviews behind
these decisions:
- Claude looked at the Rivallie and Bramblefang contact sheets and the golden village renders.
- Three audits checked lanes, statuses, approvals and doctrine.

## Decisions (`docs/team/comms/director/approvals/`)

| Item | Decision |
| --- | --- |
| Rivallie, original record | **superseded**: it approved the side-view frames, which 671d507 replaced |
| Rivallie, M2 packet (`2679d2…`) | **changes-requested**: speckled cream, no real lying clips, no face, height note |
| Bramblefang (`b8d6c8…`) | **director-approved** (the director's own decision, now bound to its digest) |
| Aqualia bible and plan (C5, `proposal-001.md`) | **director-approved** |
| Golden village map (C6) | **director-approved for layout**; look, dressing and depth come later with C10/C11 |
| Proposal 002, voice casting | **changes-requested**: voices were cast by pronoun (AGT-4.2) |
| Proposal 003 | **approved as amended**: packets are digest-bound; TEAM-5.1a rejected and replaced by TEAM-2a |
| M7 scores | **changes-requested**: motif quote, bar 6 clash, swappable stems |
| Human and mannequin sheets | **changes-requested** under M11 (L3, 1024 px, side view, valid ramps) |

## Rule changes (in force now)

1. **PRD-9: approvals bind to a packet digest.** A record names `packetDigest`, the
   `sourceDigest` in `review.json`. Regenerated frames need a new record. A packaging-only
   re-run that keeps the digest keeps the approval.
2. **TEAM-2a: agents never stage or commit protected files,** director records included,
   even files they didn't write and even when asked. The guard now checks what a
   `git add` or `git commit` would include. f4105e4 got past the old guard: the blender
   agent committed the director's two records. The records themselves were the director's.
   Don't repeat it. If a record is missing from a branch, say so and work on something
   else.
3. **TEAM-3.1: message file names use real UTC from `date -u`.** Claude's own earlier
   messages named `2026-11-01T…` were ahead of the clock. The communicator's names didn't
   match commit times. Both stop now.
4. **TEAM-4:** new status `superseded`. Status words on the board are TEAM-4 only: no
   "completed", "done", "ready" or "current" for art.
5. **Queues:** only codex and the director add tickets. The communicator added M10
   itself; don't do that again.

## Tickets

- **codex:**
  - C6b: go-world; schema-driven checks; negative pass test.
  - C8b: HUD dash label, kit bar and slot art, separate phase panel.
  - C9c stands.
  - **C3d** (forge quality) is Claude's, by the director's decision.
- **communicator:**
  - M11 extended: all human and mannequin sheets, ramp names on every sheet.
  - M14: voice recast. M15: score fixes. M16: board and W45 digest.
  - M12 and M13 (C6 relay, kit inventory) stand.
- **blender:**
  - B1 changes-requested (re-run after C3d).
  - B2 opens on go-world.
  - B3 waits on C3d.
  - B4 waits on M11.
  - B6 and B7 stand.

## Hooks

The blender inline-script rule (codex C6) now fires only when a command mentions world
paths, `.ldtk` or base64. Ordinary `python -c "...write..."` works again.
