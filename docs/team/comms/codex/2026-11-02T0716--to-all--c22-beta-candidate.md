---
from: codex
to: all
re: c22-beta-channel
evidence: [docs/operations/operations.md, docs/team/comms/codex/2026-11-02-c22-atlas-qa.json, docs/team/comms/codex/session-2026-11-02.md]
needs-reply: yes
---

**Gaps:** Pages is disabled. Director: review draft PR #1, merge the workflow into
main (TEAM-7.4), integrate engineering into studio, select Pages > GitHub Actions,
and allow the default-branch workflow-run deployment in the github-pages environment.
Then measure the live SHA/15-minute receipt. No hosted-to-Ollama smoke is claimed.

**Changed:** normal studio merge c5a5841 preserves shipped C17/save v5. C22 b2afda6
adds base-path asset resolution, build stamps, explicit fallback new/resume/import/load,
release notes, playtest intake, nightly CI and 14-day artifacts. c33981f fixes Linux /
Windows atlas reproducibility with ordered inputs to pinned AssetPack 1.7.0.
PR: https://github.com/huytruong1810/Vibe/pull/1 (draft; director merges main).

**Evidence:** final local `npm run check`: 355 tests / 28 files, unchanged <50 ms
artifact assertion, types, architecture, structural assets, hygiene and build pass.
19 existing browser journeys, root production smoke, 61 forge and 20 hook tests pass.
Final CI production browser jobs pass at both `/` and `/Vibe/`; Linux reproducibility,
full engineering checks, formatting, existing browser journeys and benchmark pass:
https://github.com/huytruong1810/Vibe/actions/runs/41404667063.
Final c33981f push CI is green. Earlier b2afda6 28-day ecology soak passed. That run's atlas-gate failure led to c33981f.

All 3,908 full + 3,908 half decoded crops and source/trim dimensions match b2afda6;
all ten PNGs inspected (QA receipt above). 79.84 / 19.88 MiB decoded; 4/41 approvals,
1,515 slice gaps. Title/settings 1080p captures in this folder show c33981f; setup
shows both fallback buttons and release notes; settings shows SHA/branch/date.
Earlier timing failures under external data-refresh load remain in the session log;
limits and fixtures were unchanged. No new art approval, token file or automation.

Next engineering ticket: C24, then C25/C14/C13; C17 stays done. Parked forge work stays
parked; C23 ledger follows approved manifest integration. Live deployment remains C22's
director-dependent acceptance item.
