# Codex session handoff

Prepared for a fresh session on the director's request. **Next item is C22, not C18:**
new upstream directives 011/012 supersede the earlier C17 continuation order.
Read the current constitution, brief, live queue and directives before acting.

## Current orders

- Directive 012: C22 -> C24 -> C25 -> C14 -> C13 -> C18 -> C19 -> C20,
  then C3g and C7; C23/C12 standing. C17 already shipped: do not repeat it even
  though the upstream queue still lists it open. C21 only on director go.
- Claude is away until about 2026-11-09. Nothing waits on Claude; keep the parked
  forge tickets C9b fit/C9c/C3b faces parked unless the director redirects them.
- Blender now owns all art: references/image generation, 2D, 3D and map layout.
  Communicator owns relay/status/digests, manifest integration and music. Read the
  upstream AGENTS.md, amended charter, briefs and skills before following old lanes.
- Approval delegation to Claude is suspended. New approvals are director-only.
- Read `docs/engineering/authored-artifacts.md` and the live queue. The director
  confirmed save v5 and note + stick for canvas, preserving the existing bow recipe.
- Hourly automation remains cancelled. Never recreate it from historical prompts.
- New process: archive closed own messages each session, about ten live messages;
  completed tickets go to queue archives; target live queues under 250 lines.

## Start the next session here

1. Read AGENTS.md, current Codex brief, team-comms and doctrine-lookup. Inspect
   git status, pull/fetch, and read current addressed messages. Preserve dirty work;
   never change Vibe-art or the preexisting review worktrees to simplify a merge.
2. **Integrate/review published art history before choosing work.** Fetched art and
   studio both point to 5d5dc64; eight commits are not integrated here. Local HEAD
   before this documentation handoff is 5693edb. Normal merge required, not reset.
3. Preserve C17's archived done status, save v5, canvas recipe correction, tests and
   serialized artifact-budget project while reconciling the upstream queue/spec.
   Validate the merged result; the local evidence below predates these eight commits.
4. Read upstream directive 012, archived directive 011, and the upstream Codex queue.
   Take C22 first. A red studio CI is the top task: check current Actions status;
   Claude's green-CI report is not independent current evidence.

### C22: beta channel

- Deliver a Pages build after each successful "Reference game checks" run on studio;
  support Vite base `/Vibe/` and `/`, resolving catalog URLs centrally at fetch time.
- Include a build stamp, title-screen changes, a playtest issue form, nightly CI and
  14-day browser/benchmark artifacts. Keep fallback play without Ollama; document
  allowed origin/local-network setup and show actionable setup errors.
- Acceptance: green studio push reaches Pages with its sha within 15 minutes, and
  CI browser coverage verifies `/Vibe/` asset loading. Workflow edits need a token
  with workflow scope; never print credentials. Director switches Pages to GitHub
  Actions once, after implementation is concrete and reviewable.
- C23 uses `npm run art:integrate -- ledger <asset>` after communicator integration;
  refusal is evidence to report, not a gate to bypass. Follow with asset build,
  structural validation and an inspected 1080p in-game capture.

### Other new upstream decisions

- `c92b031`: directive 012 and protected lane changes; `5d5dc64`: creature-minds
  spec/ADR 033 and revised C13-C16. C14 fair combat/telegraphs precedes C13; learned
  brain C15-C16 stays gated on playtesting. C13 no longer waits on C7 habitats.
- `671afcd`: directive 011 and art:integrate tooling; `2b3bb5b`: runtime held-item
  composition. Do not rebuild the held compositor from the old local pending list.
- `88b11ba` and `58baca4`: reported CI/format/gallery/browser fixes. Review actual
  changes and preserve test intent; they have not been independently run here.
- Read upstream `docs/engineering/memory-and-context.md` (ADR 032): C24 keeps the
  conversation transcript and compacts at 75% with CPU `gemma4:e4b`, preserving four
  recent turns, never deleting memory. C25 adds typed persistent memory/extraction,
  core blocks and embedding retrieval. It must migrate from actual save v5 (or the
  then-current version), not reuse C17's version. C18 reading depends on C25.

## Integration and C17

- Engineering checkout: C:/Users/htruong/source/repos/Vibe, eng/hd-presentation.
- Published implementation: 6c2b451; final atlas/test follow-up: 5693edb. Both pushed.
- Published art/studio 0d4a430 merged at ad0d38b; the only conflict was the
  communicator queue. Retained the upstream cleaned queue. Handoff docs preserved.
- Source work from C3f/M19, item/environment/template tooling and Mireling is
  integrated. Do not recreate those tasks from historical queue entries.
- C17 adds src/domain/artifacts.ts, bounded records/store, recipes, item references,
  identity-preserving display/take, home hooks/tables and Lark's easel, metadata
  snapshots, correlated worker content queries, and save v5 with older migrations.
- ArtifactPlacement retains its complete item instance; content remains out of
  frames. Authored ingredients cannot be crafted away. No writing/painting screen,
  villager action or generation provider is implemented in this increment.
- Save validation requires one reference per artifact, across inventory, equipment,
  all scene drops and placements, and rejects invalid furniture destinations.
- Existing NPC combat loadouts are not general storage; C18 must address NPC
  possession explicitly rather than bypass the existing restrictions.

## Evidence and gaps

- `npm run check` passes: hygiene, types, architecture, structural assets,
  345 TypeScript tests / 26 files and production build.
- `python -m uv run --project art/source/forge python -B -m unittest discover
  -s art/source/forge/forgelib -p '*selftest.py'`: 60 tests pass locally.
  uv is available through system Python's module entrypoint, not PATH or the venv.
- 512-artifact fixture: 1,195,812 bytes; isolated validation 23.29 ms. The final
  full check passes its unchanged <50 ms assertion in the artifact-budget project,
  run after the parallel unit project. Earlier concurrent runs exceeded the budget;
  the dataset and threshold were not reduced.
- Structural asset check: 3,908 frames, five full pages, 79.77 MiB full / 19.98 MiB half decoded;
  full-world approval coverage 4/41 and 1,515 slice gaps. Do not weaken HD gates.
- Asset rebuild and structural validation pass. All 3,908 full and 3,908 half
  decoded frame crops match their pre-repack pixels; only page/rect metadata
  changed. All ten atlas PNGs were opened. Draft PR descriptions #1/#4 refreshed.
- No new browser journey, GPU smoke, visual acceptance or Blender execution claimed.
  Machine B uses mocks; send live C18-C20 smokes to Blender through own comms.
- Hatchet approval covers held-item/icon packet 89102c20...; publication is B14.
  Runtime composition is delivered upstream at 2b3bb5b, not yet integrated here.
  Faces and Riverlands remain changes-requested in the records inspected. Historic
  Claude-delegated approvals remain scoped evidence, not a current approval grant;
  directive 011 suspends the delegation. Codex has no visual approval grant.
- Current session/report: session-2026-11-01.md and
  archive/2026-11-02T0206--to-all--re-directive-010.md in this folder.

## Publication discipline

- Check actual git status/log and upstream before the next integration. The C17
  implementation follows merge ad0d38b; do not assume a commit hash from this aid.
- Only director merges main. Keep PR #1 aligned with the engineering branch;
  source-only consumer PR #4 retains its narrower historical scope.
- Separate Vibe-art checkout and preexisting .cache review worktrees were untouched.
- Never reset dirty work, force-push, skip hooks, manually stage approval records,
  or write protected doctrine. Use DOC-5 only within its actual scope.
- Record evidence and gaps, run hygiene before each push, stop owned processes.
