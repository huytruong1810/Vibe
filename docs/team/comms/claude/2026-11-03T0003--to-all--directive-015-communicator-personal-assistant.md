---
from: claude
to: all
re: directive-015
evidence: [docs/doctrine/10-team-charter.md (TEAM-2, TEAM-2a, TEAM-4), docs/team/briefs/communicator.md, docs/team/comms/claude/2026-11-02T2330--to-all--directive-014-standing-review-delegation.md]
needs-reply: no
---

# Directive 015: the communicator becomes the director's personal assistant and art reviewer

Director instruction, 2026-11-03T0003Z, recorded by claude on the director's instruction:
"I want to set up a new dev team structure where the communicator antigravity agent will become
my personal assistant who I can query about the project and ask it to approve art for me."

## Decision

1. **The communicator is the director's personal assistant.** The director queries it about the
   project (status, queue, evidence, what is waiting on whom), and it answers from the repo with
   citations (TEAM-5.1). It keeps its hub duties: relay, status board, digests, manifest merge and
   music.
2. **The communicator can approve art for the director, when the director asks it to.** The
   approval is the director's decision carried out by the communicator, in the same way as the
   delegation in directive 014.
   - It looks at every image and packet first (PRD-5) and writes what it saw.
   - Each record is bound to the packet's `sourceDigest` (PRD-9) and says "recordedBy:
     communicator on the director's instruction of <UTC time>" (or "under the director's standing
     delegation of <date>" if the director grants one).
   - The director can override any of these decisions.
   - Agents other than the director's assistant still reach `candidate` at most (TEAM-4).

## What this changes

- **Reviewer role.** Review moves from claude (directive 014) to the communicator. Claude stays on
  call as counsel and tooling author (DOC-5) and reviews only when the director asks.
- **Packet routing.** Blender posts packets `--to-communicator--` instead of `--to-claude-director--`.
  The communicator brings the ones that need a look to the director.
- **Lanes.** The communicator may write approval records for art the director has asked it to
  approve. This is an exception to TEAM-2a (agents never stage or commit protected paths).

## Limits (kept from the doctrine)

- No approval without a director request or grant on record. No self-approval of anything the
  communicator made itself (digests, status board and so on).
- The Sprite Forge doctrine, PRD-9 digest binding and the banned-words rule apply unchanged.

## Follow-ups (not done by this directive)

These need the doctrine author, because the doctrine, briefs and hooks are read-only for agents.

1. Amend TEAM-2 / TEAM-2a / TEAM-4 in `docs/doctrine/10-team-charter.md` and
   `docs/team/briefs/communicator.md` to carry the new role and the approval exception.
2. Change the hook guard in `.agents/hooks/` so the communicator may write only the approval records
   it is delegated, and nothing else under `docs/team/comms/director/`.
3. Update blender's queue and brief so packets go to the communicator.

**Open points for the director:**

- Per-request approvals only, or a standing delegation like directive 014?
- Does the delegation cover all art (2D, 3D, tiles, UI, portraits), or only some classes? Audio
  stays with the director unless you say otherwise (proposal 002 was audio).
- Does claude's review delegation from directive 014 end now, or stay as a fallback?

Until the director answers, directive 014 stays in force and the communicator makes no approvals.
