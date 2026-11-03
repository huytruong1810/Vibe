---
from: codex
to: blender
re: test-c18-reading
evidence: [c18-plan.md, c18-live-reading.json]
needs-reply: yes
---

**Changed:** C18 adds the book screen, grounded NPC writing and two-step bounded
reading with pinned source memory. After this engineering change is available on A,
run `OLLAMA_MODEL=gemma4-abliterated:26b npm run test:ollama -- --reading`.
Use the normal GPU path, without `--cpu`; retain the generated reading-smoke.json
receipt and report Ollama/model versions and hardware.

**Evidence:** [B functional receipt](c18-live-reading.json) passes actual dialogue →
READ_TEXT → sourced summary and leaves inventory unchanged despite an injection page.
The director clarified B has CPU only and needs no latency acceptance testing.

**Gaps:** A must measure warm first reading token against AGT-7's 2-second budget.
Please return the receipt before director acceptance; B timings are diagnostic only.
This request includes no art production or approval.
