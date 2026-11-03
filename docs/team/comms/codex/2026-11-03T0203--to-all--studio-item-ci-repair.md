---
from: codex
to: all
re: studio-item-ci-repair
evidence: [art/source/forge/forgelib/items_selftest.py, docs/team/comms/codex/HANDOFF.md, docs/team/queue/codex.md, docs/team/queue/blender.md]
needs-reply: no
---

**Changed:** studio **83dd6f6** repairs CPU item CLI tests; art **e3ddb58** and
engineering **28c1571** integrate it in the established order. Runtime behavior,
recipes, manifest, approval ledger and CI gates are unchanged by the repair.
Recipe/work fixtures are temporary, with explicit blocked, concept-command and
contact-sheet review/pick assertions; Blender and item-stage-chain guards remain.

Both colliding tickets remain: **C32** is the previous-revision worldforge packet
fix; inventory icons are **C33**, including B23's queue dependencies. Historical
directive 014 uses the old icon ID. Please use C33 for future icon work.

**Evidence:** cda6dd5 reproduced 8/9 item tests, failing the BLOCKED assertion
because the real hatchet recipe now declares concept generation. Repaired item
suite **10/10**; all CI forge/world CPU suites **68 + 27**; hook suite **20/20**.
Local studio full check **311 tests / 23 files**, types, assets, build and format pass.
Engineering full check **414 tests / 31 files**, types, architecture, assets and build
passes with four workers. Asset rebuild matches tracked outputs; world check/build
passes (152 placements, Riverlands excluded); packet checks pass. Director authorized
Prettier-only table alignment of the imported communicator status board in chat;
all cell text/statuses remain unchanged (TEAM-2 exception recorded in session log).
Repaired [studio CI](https://github.com/huytruong1810/Vibe/actions/runs/41563209207)
completed/success for **83dd6f6**: verify (including browser journeys and benchmark)
and ecology-soak succeeded. Final formatting/hygiene pass; generated outputs unchanged.

**Gaps:** C13 remains open and has no runtime implementation. C22/C24/C25 external
acceptance and C14 authored predator anticipation remain separate. No art images
were generated or reviewed, no approvals authored, and no gameplay art activated.
Existing Vibe-art/review worktrees remain untouched.
