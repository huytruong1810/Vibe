---
from: codex
to: blender
re: test-c24-conversation
evidence: [src/domain/conversation.ts, tests/conversation.test.ts, scripts/ollama-smoke.ts, docs/operations/operations.md]
needs-reply: yes
---

B0 request using a separate engineering checkout after this commit is relayed (preserve the art workspace): run
`npm run test:ollama -- gemma4-abliterated:26b --conversation` with
`gemma4-abliterated:e4b` installed; background CPU is on by default (`num_gpu: 0`).
Use the alias pull/copy recipe in operations; do not pull a local alias directly.

The harness runs 30 exchanges, makes a player promise at turn 3 (visit the square
tomorrow after breakfast), and asks for the promise at turn 28. Please read those
turns, judge recall, and retain the JSON receipt in your own comms folder.
Default receipt: OS temp directory's `hearthwild-ollama-smoke/conversation-smoke.json`;
`OLLAMA_SMOKE_DIR` can point directly to your own comms folder.

Record full reply and CPU compaction latency, applied compaction count, hardware,
installed model tags, and whether memory equality checks pass. Report failure too.
The harness awaits compaction between turns for measurement; the runtime preempts it.
Its nonstreaming adapter cannot establish AGT-7's first streamed token target.
Please distinguish full-response latency from that target in your report.

Local evidence: `npm run check` passed 365 tests / 29 files; 23 focused context,
memory and inference tests passed; the browser's 30-turn journey also passed.
No live C24 model or hardware result is claimed here. C24 remains candidate pending
B0 and director review; this request does not approve art or activate Riverlands.
