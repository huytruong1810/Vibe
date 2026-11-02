# Codex session handoff

## Continue here

C22 implementation is published on `eng/hd-presentation`: b2afda6, followed by
cross-platform atlas reproducibility fix c33981f. Draft PR #1 is the review surface.
C22 remains candidate until the director enables Pages and the live SHA/15-minute
receipt is verified. Next unblocked engineering work is C24, then C25/C14/C13.

- Read the current brief, charter, skills, addressed comms and live queue after
  compaction. Use team-comms and doctrine-lookup. Only the director approves art.
- Current order: C22 -> C24 -> C25 -> C14 -> C13 -> C18 -> C19 -> C20, then C3g/C7;
  C23/C12 standing. C21 needs director go. C17 is already shipped: do not repeat it.
- Studio 5d5dc64 integrated normally at c5a5841. Save v5, note + stick canvas recipe,
  bow recipe and serialized artifact-budget project are preserved. C25 starts from
  actual save v5 or later, never the stale upstream assumption that C17 is open.
- Claude away until about November 9; parked forge work stays parked. Blender owns
  all art; communicator handles relay/status/digests/manifest integration/music.
  Hourly automation remains cancelled. Other worktrees were untouched.

## C22 implementation

Shared transport URL resolver supports `/` and `/Vibe/`, retaining canonical catalog
URLs. Settings and exports carry SHA/branch/date; export metadata is validated and
removed before strict save-v5 validation. Explicit fallback new/resume works with
import/load, using bounded failure receipts and no Ollama requests. Connect retains
its capability check, with concrete origin/local-network setup guidance.

Release notes and the playtest issue form support feedback. Nightly checks retain
browser/benchmark artifacts for 14 days. Pages builds only the exact successful
studio push SHA, skips obsolete runs and verifies a public receipt within 15 minutes.
See docs/operations/operations.md and ADR 034. No personal credential is stored.

## CI reproducibility fix

The first C22 CI run found AssetPack's folder wrapper passing unsorted glob results
into an order-sensitive packer. c33981f supplies binary-descending input order to the
same AssetPack 1.7.0 packing/trim/resize engine through a narrow, version-pinned adapter.
Shuffled-input multi-page tests cover full and half resolutions. Gates are unchanged.

All 7,816 decoded crops and source/trim dimensions match b2afda6; all ten repacked
PNGs inspected. Receipt: 2026-11-02-c22-atlas-qa.json in this folder. Decoded memory
79.84 MiB full / 19.88 MiB half; 3,908 frames, five full pages. Existing approval
coverage 4/41 and 1,515 slice gaps remain. No new artwork approval is claimed.

## Evidence

- Final local `npm run check`: 355 tests / 28 files, unchanged <50 ms artifact
  assertion, types, architecture, structural assets, hygiene and build pass.
- Existing browser suite: 19 pass. Final repacked root production smoke: 2 pass.
  Committed-SHA subpath smoke also passed before repack; c33981f CI covers both bases.
- Forge: 61 tests pass; hooks: 20 pass; formatting passes. Final root title/settings
  captures inspected and retained as 2026-11-02-c22-{title,settings}-1080.png.
- c33981f push CI: https://github.com/huytruong1810/Vibe/actions/runs/41404667063;
  PR CI: https://github.com/huytruong1810/Vibe/actions/runs/41404675736.
  Push run 41404667063 is completed/success, including reproducibility, engineering
  checks, formatting, both beta-browser bases, existing browser journeys and benchmark.
- b2afda6 28-day ecology soak passed in run 41402677972. Its verify job failed at
  atlas reproducibility; c33981f fixes that. Later local timing failures under
  external data-refresh CPU load remain recorded in session-2026-11-02.md. No
  unrelated process was stopped; unchanged limits pass in the final check.
- Local benchmark: 1,000 creatures / 30 villagers; simulation p95 3.416 ms,
  active combat p95 10.844 ms. CPU-only evidence, not live-model/GPU qualification.

## Director rollout / final housekeeping

GitHub default branch is main; Pages is disabled. Director merges reviewed PR #1
into main (TEAM-7.4), integrates engineering into studio, selects Pages > GitHub
Actions, and permits the default-branch workflow-run deployment in github-pages.
No live deployment or hosted-to-Ollama smoke is claimed. Cached Git credentials
already have repo/workflow scopes; no supplied token was saved or echoed.

Candidate report: 2026-11-02T0716--to-all--c22-beta-candidate.md. Own fresh-session
message was archived. Final evidence update includes the queue, session log, QA receipt,
inspected captures and report. PR #1's description now cites the green code run and
explicit director rollout gate. Temporary comparison/PR-body tools and test captures
were removed after retaining evidence. Automatic cleanup review initially questioned
capture provenance; test-source paths and UTC creation times established task ownership,
and review approved the cleanup. No local Node process remains.
