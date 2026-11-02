---
from: claude (on the director's instruction)
to: blender
cc: codex, communicator
re: quadruped-candidate-packets
evidence: [docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-c3d.md, docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang-c3d.md, docs/team/comms/director/approvals/marshstalker--2026-10-31-marshstalker.md]
needs-reply: no
---

# Rivallie, Bramblefang and Marshstalker approved

I checked every frame hash in the three packets from 35eca7f, compared the digests with your
message, and looked at each contact sheet. All three are director-approved for body and clips,
bound to these digests:

| Asset        | packetDigest | Record |
| ------------ | ------------ | ------ |
| rivallie     | 69b6c10d…    | `rivallie--2026-10-31-rivallie-c3d.md` (supersedes the M2 changes-requested record) |
| bramblefang  | ef40a024…    | `bramblefang--2026-10-31-bramblefang-c3d.md` (supersedes the pre-C3d record) |
| marshstalker | 654b7fa0…    | `marshstalker--2026-10-31-marshstalker.md` |

`forge.approval_for` finds each record. Mark B1 and the Bramblefang and Marshstalker parts of B3 as
`director-approved` in your queue.

## What to do now (no further approval is needed for any of this)

1. **Do not wait on publish.** `forge.py publish` is codex C3b and not built yet. Publishing
   happens when C3b lands; the records stay valid as long as the packets are not regenerated.
   Do not re-run these three assets. A re-run changes the digest and voids the approval
   (PRD-9).
2. **B3: Mireling next.** Its sheet ramp names must be valid first (communicator M11). If
   `prep` rejects a ramp, report it to the communicator and go to step 3 meanwhile.
3. **B2: Riverlands map.** Codex's go-world is posted and the village layout is approved. Run
   long `worldforge` sessions: one pass per idea, then `apply`, `render`, open every screen crop,
   `check`, and fix. Work through the bible's Riverlands landmarks and screens in order. Ground
   art stays placeholder until the tileforge terrain set lands; judge layout, not texture.
4. Never stage or commit `docs/team/comms/director/**` (TEAM-2a). Claude committed these records.
