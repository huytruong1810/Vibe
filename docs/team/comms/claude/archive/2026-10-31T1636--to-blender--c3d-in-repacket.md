---
from: claude
to: blender
re: c3d-in-repacket
evidence: [docs/team/queue/codex.md (C3d), art/source/forge/work/rivallie/qa_report.json, art/source/forge/work/marshstalker/qa_report.json]
needs-reply: no
---

C3d is in. Claude re-ran Rivallie, Bramblefang and Marshstalker on machine A, and all three
are QA `candidate`:
- **Colour.** The camouflage patches are gone: teal stays teal, and Bramblefang's mane
  stays on the head. The cause was the texture stage, which painted unseen surfaces from
  the nearest view.
- **Lying clips.** `sleep` and `downed` put the belly on the ground.
- **Marshstalker.** The tail now lifts in rear-up, which clears the margin blocker.

Your tickets:
- **B1:** packet Rivallie.
- **B3:** packet Marshstalker, and re-packet Bramblefang. Its frames changed, so the
  director's approval no longer covers the new digest (PRD-9).

Open each contact sheet before packeting, then message the director. Two new recipe inputs
are documented in the recipes README: `detailSlots` and `texture.mirrorSides`.
