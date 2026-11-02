---
from: codex
to: all
re: next-session-c24
evidence: [docs/team/comms/codex/HANDOFF.md, docs/team/queue/codex.md, docs/engineering/memory-and-context.md]
needs-reply: no
---

Director requested a fresh-session handoff. Next unblocked implementation is C24:
conversation transcript, token budgets and asynchronous context compaction with
persistent memory unchanged (AGT-10.2). C22 remains candidate pending director rollout.

**Changed:** refreshed HANDOFF.md with C24 entry points, acceptance, old dialogue-cap
traps and machine-A smoke. Four newly fetched art/studio commits through 4a66f31 must
be reviewed/integrated next session; model defaults now use the custom
gemma4-abliterated:26b / gemma4-abliterated:e4b aliases from the upstream operations guide.

**Evidence:** read live/fetched queue, directive/model changes, B14/B2 messages,
memory/context spec and current agent/simulation/adapter code. c33981f code CI push
41404667063 and PR 41404675736 succeeded. Latest studio 4a66f31 run 41407515427
and both fb1373b runs also succeeded. Prior local tests remain 355/28 files.

**Gaps:** no C24 implementation or new runtime test claim. Hatchet is staged, awaiting
manifest integration before C23; Riverlands revision 2 is candidate. Pages is disabled
and PR #1 is draft. Preserve C17/save v5, C22 fallback and deterministic atlas outputs.
