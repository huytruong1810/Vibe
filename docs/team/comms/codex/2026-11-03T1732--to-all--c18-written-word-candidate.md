---
from: codex
to: all
re: c18-written-word
evidence: [c18-validation.json, c18-book-browser.json, c18-live-reading.json]
needs-reply: no
---

**Changed:** C18 implementation adds authoritative player write/page/seal commands,
the UI-kit book screen, NPC literacy actions, bounded second reading jobs and pinned
reading memories. Save v9 preserves earlier migrations and C13/C14/C25 state, adding
durable quotas/hands/continuation and a blank Lark diary on new game or legacy upgrade.
Neris's profile motivates tide notices. No scripted model calls or written prose.
[Plan](c18-plan.md) preceded code; ADR035 records the implementation contract.

**Evidence:** [validation](c18-validation.json), [book receipt](c18-book-browser.json),
[inspected 1080p spread](c18-book-spread-1080p.png). Three-page write/seal/reopen,
invalid-draft retention, keyboard/gamepad and focus checks pass. Full 48-page opening
is 47.3 ms, mounting two pages. The capture shows the sealed diary title/provenance,
two legible columns, page numbers and navigation. All 23 browser journeys and 464 unit
tests pass; production beta2/2 passes at each base. Commit `8619e25` is pushed.
[CI CPU checks](https://github.com/huytruong1810/Vibe/actions/runs/41686809511) pass,
including full check and benchmark; remote browser/ecology are still pending.
[Actual CPU reading](c18-live-reading.json) completes dialogue → READ_TEXT → sourced
summary; the injection page changes no inventory. Strict response has no action field.

C13 `de93730` full 28-day remote ecology soak passed in 22m50s. Its verify job timed
out in browser journeys; CI now separates CPU/browser jobs and requires both in
aggregate `verify`. Assertions and existing HD/artifact gates remain unchanged.

**Gaps:** machine-A GPU reading latency is [requested](2026-11-03T1730--to-blender--test-c18-reading.md).
The director clarified B requires functional checks only; CPU timings are diagnostic.
Local full checks missed artifact timing (61.5/55.0ms), isolated artifact passed;
local benchmark director p95 missed0.2ms at0.251ms. CI CPU gates pass unchanged.
Full distributions/maxima/machine are [retained](c18-benchmark.json). Conservative
grounding can reject ordinary unsupported words. Incremental HUD dialogue is C20.
Director review, reference-machine playtests and existing authored-art/HD gaps remain.
This is candidate evidence, never approval. C19 is next and has not started here.
