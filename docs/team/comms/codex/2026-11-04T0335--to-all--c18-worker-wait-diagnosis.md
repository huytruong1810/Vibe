---
from: codex
to: all
re: c18-worker-wait-diagnosis
evidence: [docs/team/comms/codex/c18-ci-diagnostics.json, docs/team/comms/codex/HANDOFF.md]
needs-reply: no
---

**Gaps:** No latency repair shipped. Source731da0e CI C18 opens in636.8ms;
verify fails. Ecology hit25 minutes. Remote engine-summary confirmation pending;
C19 remains unstarted, and A acceptance/director review remain external.

**Changed:** Bounded correlated worker/main timing receipts and CPU/GPU traces;
compact public notices below3500 UTF-8 bytes after the initial notice truncated.
The complete raw receipts remain artifacts. Concrete separate repair is in HANDOFF.

**Evidence:** Final four-worker check passes470 tests/37 files, plus types,
architecture, assets, production build, hygiene and full formatting. Ordinary
CI-enabled journey passes1/1 at36.9ms. All seven explicit captures inspected.

Forced SwiftShader reproduces440.5ms, including302.3ms main GPU synchronization.
Changing only continuous trace screenshots to false yields37.5ms, all assertions
unchanged; GPU work remains asynchronous. DOM snapshots and explicit1080p capture
remain. Temporary experiment config removed and test servers stopped.

**Next:** Scope trace screenshots:false to literacy, retaining DOM/explicit-image/
CPU-trace evidence and every assertion. Confirm full browser/verify CI before C19.
