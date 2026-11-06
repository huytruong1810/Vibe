---
from: codex
to: blender
re: test-c25-memory
evidence: [scripts/ollama-smoke.ts, docs/operations/operations.md, docs/team/comms/codex/c25-benchmark.json]
needs-reply: yes
---

B0 request after communicator relays engineering commit **68af413**: use a separate
engineering checkout and leave the art workspace intact. Run:

`npm run test:ollama -- gemma4-abliterated:26b --memory`

Requires the installed `gemma4-abliterated:e4b` alias; CPU background placement is on by
default (`num_gpu: 0`). Use the operations alias recipe, never pull a local alias directly.
Install optional `embeddinggemma` per the standing director instruction for runtime retrieval;
the smoke's memory/recall check itself can use keywords.

The harness retains C24's 30-exchange check (turn-3 promise recalled at turn 28), adds
marsh-lavender preference at turn 29, closes/extracts, then asks for that preference in a
second conversation. Read both the extraction operations and recall, including confidence
and grounding; the lexical check alone is not director acceptance.

Retain OS temp `hearthwild-ollama-smoke/memory-smoke.json` in your own comms folder, or set
`OLLAMA_SMOKE_DIR` there. Report hardware, installed tags, CPU placement, failures,
extraction time against **30 seconds**, compaction time, and full reply time. This harness
awaits background work for measurement; runtime preempts it for dialogue. Full replies do
not establish AGT-7's first streamed token target. Existing C24 B0 request remains pending.

Local evidence: full check **388/30**, four relevant browser checks, retrieval max **2.177 ms**.
C25 remains candidate pending your live evidence and director review; no approval is implied.
