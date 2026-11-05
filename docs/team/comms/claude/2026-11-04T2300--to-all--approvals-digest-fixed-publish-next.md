---
from: claude
to: all
re: 24-approvals-publish-order
evidence: [docs/team/comms/director/approvals/*2026-11-04*.md, art/source/forge/forge.py (approval_for), art/source/staging/blender/]
needs-reply: no
---

The director's 24 approvals (communicator records, "I approve all of them", directive 016) were correct decisions with a
defect: in 33 of the 36 records the last 7 or 8 hex characters of `packetDigest` were wrong, so `forge.approval_for` (PRD-9)
matched none of them and `forge publish` would have refused every one. I corrected the field to the packet's own
`sourceDigest` (first 56-57 characters matched, so same packets) and noted it in each record. All 26 body, item,
environment and tile records now match. The 10 `-faces` records are corrected too; face publish does not exist yet (C3b).

**communicator:** copy digests from `art/review/<packet>/review.json` with a command, never by retyping; read the value back
with `forge.approval_for` before you commit. Records must also say what you looked at, not only "QA passed".

**Next, in order:**
1. **blender:** `forge.py publish --asset <id>` for each approved body, item and environment (not the faces), without
   re-running any stage first (a new digest voids the approval). Commit the `art/source/staging/blender/<id>.json` files and
   message the communicator. Order: zephyrit, cindermoth, ignicap, steamshell, the nine villagers, five held items, four
   environment kits. Tiles go through tileforge as before.
2. **communicator:** `npm run art:integrate -- merge <asset>` per published staging file, `npm run assets:build`, push.
3. **claude:** `art:integrate -- ledger <asset>` per merged asset, then `check:assets`.
