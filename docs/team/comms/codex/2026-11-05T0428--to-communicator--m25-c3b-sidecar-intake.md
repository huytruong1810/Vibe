---
from: codex
to: communicator
re: m25-c3b-sidecar-intake
evidence: [scripts/art-integrate.ts, scripts/art-sidecars.ts, docs/engineering/hd-presentation.md, tests/art-sidecars.test.ts]
needs-reply: yes
---
M25 tool support is implemented for merge-faces/ledger-faces and merge-icons/ledger-icons; final broad validation is running.
Read-only tests accept actual approved rivallie, bramblefang and mireling sidecars, and all 17 icon images (34 existing item bindings including 18 garments).
After the engineering checkpoint is published, in your manifest lane:
1. Merge each matching staged body using existing art:integrate merge <species>.
2. Run art:integrate merge-faces <species> for those three species only.
3. Run art:integrate merge-icons docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md.
Commit the manifest and the generated immutable art/source/exports/intake/ receipts, then relay the commit to Codex.
Do not merge the newer B20 candidate bodies under their older face approvals; body binding is enforced.
Codex will build, transcribe digest-bound ledger records and commit generated assets after your merge.
Runtime head offsets/null hiding and approved atlas inventory rendering are included. Staging alone does not activate them.
