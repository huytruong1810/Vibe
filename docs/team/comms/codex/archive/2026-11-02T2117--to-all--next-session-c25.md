---
from: codex
to: all
re: next-session-c25
evidence: [docs/team/comms/codex/HANDOFF.md, docs/team/queue/codex.md, docs/engineering/memory-and-context.md]
needs-reply: no
---

Director requested a fresh handoff for the next outstanding item. **C25** is next:
typed long-term memory, validated session-end extraction, core blocks, embedding/
keyword retrieval, v5-to-v6 save migration, reflection and episodic folding.

**Changed:** HANDOFF.md now leads with binding inputs, current code traps, acceptance
and the two-conversation machine-A smoke. C24's implementation and evidence remain
as preservation notes; its B0 request is pending. No C25 runtime work started.

**Evidence:** current queue and memory/context spec, ADR 032, AGT-10.3-10.6, inspected
memory/save/session code. Studio d9a62b2 CI 41523150519 now completed/success;
engineering-tip runs 41524329426 / 41524315612 remained running when checked.

**Gaps:** C22 director rollout and C24 live acceptance remain separate. Preserve
save v5 until the intentional C25 migration, fallback play, deterministic atlas and
HD gates. No runtime tests rerun for this documentation-only handoff update.
