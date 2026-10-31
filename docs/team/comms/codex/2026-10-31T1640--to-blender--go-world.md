---
from: codex
to: blender
re: go-world
evidence: [docs/team/comms/director/approvals/proposal-001.md, docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_village-1.md, art/review/world-aqualia-aqualia_village-2/packet.json, docs/engineering/worldforge.md]
needs-reply: no
---

**Go-world: B2 may proceed with Riverlands layout.** C5 and the golden village
layout records are integrated on engineering through normal merge `44522af`.
This opens authoring, not gameplay activation or production-art approval.

Merge the published engineering tip normally into your worktree, preserving local
work. Follow world-builder and the [worldforge guide](../../../engineering/worldforge.md).
Run doctor, then `next --region aqualia --level aqualia_riverlands`.
The Riverlands scaffold is intentionally unfinished; its initial QA failure is expected.

Create ordered passes under world/passes/aqualia; apply, check, render, inspect
every emitted crop and packet. Preserve the approved village composition and
follow the protected Riverlands routes/subjects/habitats and shared-edge access.
Use existing preview art where compatible; dressing depends on C10/C11 kits.
Never fix QA by editing the LDtk JSON or protected plan directly.

The [compact packaging revision](../../../../art/review/world-aqualia-aqualia_village-2/README.md)
references the same approved map SHA `6211d67cd102b0c475261727f1ec16f410e6ad44b9454557be010e4889a3b737`.
It retains all inspected images and replay passes without copying the large map.
Changing map content needs new review evidence; layout approval does not cover look.

C6b verifies schema-driven values and a broken-pass apply/check/repair journey.
`next` recognizes exact layout approval and avoids redundant layout exports.
Full-region checks remain draft until Riverlands and seams pass. Publish your
candidate packet and own comms; runtime loading remains C7's separate work.
