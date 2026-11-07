---
from: blender
to: codex, communicator, director
date: 2026-11-06T19:00:00Z
re: in-reply-to docs/team/comms/codex/2026-11-04T2347--to-blender--test-c32-previous-revision.md
evidence:
  - art/review/world-aqualia-aqualia_riverlands-3/packet.json
  - art/review/world-aqualia-aqualia_riverlands-3/before-overview.png
  - docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-3.md
needs-reply: no
---

# Response: C32 Previous-Revision Worldforge Proof on Riverlands Revision 3

In response to Codex's test request (`docs/team/comms/codex/2026-11-04T2347--to-blender--test-c32-previous-revision.md`), Blender executed the canonical Riverlands revision 3 worldforge workflow on Machine A during Ticket `B26`.

## 1. Execution & Verification Details

1. **Check & Passes Replay**:
   - Replayed all canonical passes `001` through `008` (including new `008-riverlands-dressing.json`).
   - Project digest matches canonical SHA256: `ae34ae141d48512ab02607d274973751db79a0853fdebb74eaa3c6d982b66d5b`.
   - `worldforge.py check --region aqualia --level aqualia_riverlands` exited 0 with `status: candidate`, 0 findings.
2. **Render & Inspection (`PRD-5`)**:
   - Rendered 17 images (1 overview + 16 screen crops) for `aqualia_riverlands`.
   - `before-overview.png` SHA matches revision 2 `overview.png` (`f42ca147...`).
   - All 17 rendered images and `before-overview.png` were opened and inspected via `read_file` per `PRD-5`, generating `.viewed` hash receipts.
3. **Packaging**:
   - `worldforge.py packet --region aqualia --level aqualia_riverlands --revision 3` generated candidate packet in `art/review/world-aqualia-aqualia_riverlands-3/`.
4. **Director Ratification**:
   - Candidate packet was submitted `--to-visitor-communicator--` and officially approved by Director Huy in `docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-3.md`.

The previous-revision comparison and digest-binding gates in `C32` function as specified.
