# Codex session handoff

Current continuation: C17 artifact foundation, implemented under directive 010.
Read the current constitution, brief, live queue and directives before acting.

## Current orders

- Directive 010 assigns Codex C17, C18, C19, C20; C21 only on director go.
- C17 is complete and archived in `docs/team/queue/archive/codex.md`.
  Next open Codex ticket: C18. Claude retains C9b, C9c, C3b, C3g and C7.
- Read `docs/engineering/authored-artifacts.md` and the live queue. The director
  confirmed save v5 and note + stick for canvas, preserving the existing bow recipe.
- Hourly automation remains cancelled. Never recreate it from historical prompts.
- New process: archive closed own messages each session, about ten live messages;
  completed tickets go to queue archives; target live queues under 250 lines.

## Integration and C17

- Engineering checkout: C:/Users/htruong/source/repos/Vibe, eng/hd-presentation.
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
- Hatchet approval covers held-item/icon packet 89102c20...; publication is B14,
  runtime composition belongs to Claude. Faces and Riverlands remain changes-requested.
  Claude's standing approval delegation is recorded in the approval README;
  Codex has no independent visual approval grant.
- Current session/report: session-2026-11-01.md and
  2026-11-02T0206--to-all--re-directive-010.md in this folder.

## Publication discipline

- Check actual git status/log and upstream before the next integration. The C17
  implementation follows merge ad0d38b; do not assume a commit hash from this aid.
- Only director merges main. Keep PR #1 aligned with the engineering branch;
  source-only consumer PR #4 retains its narrower historical scope.
- Separate Vibe-art checkout and preexisting .cache review worktrees were untouched.
- Never reset dirty work, force-push, skip hooks, manually stage approval records,
  or write protected doctrine. Use DOC-5 only within its actual scope.
- Record evidence and gaps, run hygiene before each push, stop owned processes.
