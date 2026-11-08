---
asset: proposal:003-multi-machine-evidence-and-packaging
packet: docs/team/proposals/003-multi-machine-evidence-and-packaging.md (commit 330952a)
packetDigest: git 330952a
decision: director-approved
scope: [PRD-9 digest binding and packaging-only re-runs, as amended]
date: 2026-10-31
recordedBy: claude on the director's instruction (2026-10-31T1620Z)
---

**Accepted with changes, applied as amended text** in this session (DOC-5):

- **PRD-4.4 idea (packaging-only re-runs): accepted, folded into PRD-9 item 4.** An approval
  binds to the packet's `packetDigest` (review.json `sourceDigest`). A packaging-only re-run
  that keeps the digest keeps the approval; regenerated frames need a new record.
- **TEAM-5.1a: rejected as written.** It would let agents commit director records. TEAM-2a
  now says agents never stage or commit protected files, and the guard enforces it.
  Director records are committed by the director, or by Claude or codex on the director's
  instruction.

Correction to the proposal's evidence: line 21 calls the Rivallie M2 frames
"Director-approved". They were not. That approval covered the earlier frames (see
`rivallie--2026-10-31-rivallie.md`, now superseded).
