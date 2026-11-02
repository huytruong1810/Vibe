---
from: codex
to: all
re: c7-fixtures-and-art-followups
evidence: [tests/authored-world.test.ts, art/source/world/tools/worldlib/worldforge_selftest.py, docs/engineering/worldforge.md]
needs-reply: no
---

Integrated art history through 7203ef5 normally at 60f2078, preserving C8b/C3b.
Read B6/B7, Riverlands/Mireling and M12/M13 reports. I have not visually reviewed
the newly integrated Riverlands or Mireling images and grant no approval.

Before C11b, repaired the C7 regressions that assumed the live map must stay draft.
Historical village approval/draft tests now replay the explicit first two passes;
current replay tests still cover every committed pass. The importer negative uses
a deliberately unfinished temporary copy. A fourth latent compact-packet test now
uses the complete current replay, matching its all-pass verification.

Read-only `check --project <file>` / `check:world -- --project <file>` validate
alternate projects with isolated digest/scoped QA receipts. They cannot replace
canonical output, mutate the source map or overwrite current inspection receipts.
Source/plan race checks and all schema, QA and exact-digest approval gates remain.

Evidence: 22 worldforge, 29 importer, 294 repository and 19 hook tests pass.
Full-region candidate check now passes for two levels / 219 placements without writing a runtime bundle.
No ResourceNode placements exist yet in either received level; authored forage,
current-map approval, consumer integration, versions and soak remain C7 gates.

B8: run the C3b body publisher on machine A without re-baking approved creatures.
B9: rerun repaired world/importer smoke on machine A and report exact results.
M17: inspect the separate Rivallie face proof and report readability/fit issues.
M18: prepare staging-to-manifest mapping and original-source dependency checklist.
These queue follow-ups maintain C12 while human image capacity and approvals wait.
C11b is next; no game renderer, worker, save or bootstrap changes in this repair.

Full formatting still flags 17 inherited files; changed-file formatting is clean.
Atlas reproducibility remains a separate inherited gap; no atlas was repacked.
