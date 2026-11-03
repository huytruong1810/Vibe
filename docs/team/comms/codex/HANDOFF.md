# Codex session handoff

## Current: C13 pushed; C18 implemented, final validation running

Branch `eng/hd-presentation`, workspace `C:/Users/htruong/source/repos/Vibe`.
C13 commits **9b229bd** and **de93730** are pushed. C18 is currently uncommitted;
follow [its plan](c18-plan.md), written before implementation. Codex reaches candidate
at most; only the director approves. C19 is next after C18 delivery, not started here.

Use [team-comms](../../../../.agents/skills/team-comms/SKILL.md), pull only with a clean
index, read new addressed messages and re-read `docs/team/briefs/codex.md` after compaction.
Keep the existing [session log](session-2026-11-02.md) current. Leave Vibe-art and other
review worktrees alone. No alarm or hourly automation was scheduled.

## C18 implementation

Strict worker edit/page/seal commands validate the complete replacement before changing
the carried item. BookScreen supports notes, two-page spreads, single-page editing,
500 ms debounce, serialized flush, rejected-draft retention, seal confirmation, focus
return, keyboard and gamepad navigation. Frames contain metadata; content is on demand
with authoritative reach validation. Only the current spread mounts.

LiteracyService owns NPC hands, reach, six daily reads, one daily note/page, and saved
continuation offsets. READ_TEXT replaces its response's other effects and starts a
second job: excerpt <=600 estimated tokens, complete prompt <=2000, JSON-quoted prose,
strict response with no action. Applying a result rechecks world session, NPC revision,
conversation, reach and artifact revision; memory pins the actual pages/line prefix.
New dialogue preempts reading. Readables are metadata only, nearest five/120 tokens,
and drop first from dialogue prompts. Grounded writing uses conservative vocabulary
and canonical content names; unsupported ordinary words can also be rejected.

Save v9 retains all older migrations, C13 motion, C14 director and C25 memory. Lark's
blank diary is seeded on new game or legacy migration when capacity permits, never
on v9 restore. Neris's ferry-keeper profile supplies the dock-master motivation.
No scripted model calls or prose, painting provider, training, art production or approval.

Actual `gemma4:e4b` CPU dialogue -> READ_TEXT -> sourced memory passed, including an
injection page and unchanged inventory: [receipt](c18-live-reading.json). Ollama 0.40.9
tuple transport compatibility was fixed without weakening domain validation. Model was
unloaded; installation remains authorized. The director clarified B needs functional
checks only. Do not repeat model latency testing here. Machine-A GPU acceptance is
requested in [the Blender test message](2026-11-03T1730--to-blender--test-c18-reading.md).
Buffered reading JSON transport is implemented; incremental HUD output remains C20.

Latest full unit-only run: **464 tests / 34 files passed**, four workers, 104.68 s.
Full browser suite passes **23/23** in8.9 minutes. Final book capture was copied and
inspected; full48-page opening47.3 ms mounts two pages. The combined check passed464
tests but failed the unchanged50ms artifact gate at61.4688ms with formatting overlap;
isolated artifact project then passed1/1. A clean combined rerun remains to record.
Types, architecture, assets, hygiene and formatting pass. Production root build and
beta2/2 pass; subpath build/beta running. See [validation](c18-validation.json).

## C13 evidence

[Candidate](2026-11-03T1420--to-all--c13-creature-minds-candidate.md),
[validation](c13-validation.json), [benchmark](c13-benchmark.json),
[failed timing history](c13-benchmark-history.json).
Scripted all-eight-species implementation, honest perception, 12 intents, reactions,
commitment, cap 48 full-rate/2 Hz fallback, flight, partner commands and save v8.
One loaded overworld scene remains; no new region streamer. Authored habitats still
use spawn/home 12-radius fallback. The 3,000-tick exact restored intent/motion hash is
`d0c664d43d5cdd3110d6d3105c376d719589d609e15b34034e281ae8a599f10e`.

Pre-C18 full check 444/32; full browser22/22 before final performance optimization,
focused C13 2/2 and C14 1/1 after it; beta 2/2 at each root and subpath. Standalone
i7-1365U benchmark p95 brain/movement/director **0.734/0.563/0.194 ms**, maxima
**3.154/6.094/15.876**. These are p95 assertions, not every-tick guarantees.
No unchanged overall-throughput or reference-machine acceptance claim.
All eight retained 1080p phase images were inspected; placeholder overlap remains.
[Missing behavior clips](2026-11-03T1417--to-blender--c13-behavior-clips.md) are external.

Run [41665593398](https://github.com/huytruong1810/Vibe/actions/runs/41665593398)
completed the full 28-day ecology soak successfully in **22m50s**, unchanged 25-minute
limit. Both beta jobs passed. Its verify job exceeded 20 minutes in browser journeys.
The current CI edit separates CPU checks and browser journeys into bounded 20-minute
jobs and preserves required `verify` as an aggregate requiring both. This repair
still needs remote verification; all tests, benchmark, HD/artifact gates remain.

Baseline run 41564371915 succeeded; 41564379329 failed its browser step. Public logs 403;
automatic review rejected stored-credential access, none read. Isolated unchanged
baseline passed 19 journeys plus terrain; exact remote failure remains unknown.
Do not bypass credential rejection. Fetch succeeded; compare remote parent before push.

## Standing boundaries

- C22/C24/C25/C14 remain candidates with external acceptance. Only the director merges
  main or activates Pages; draft PR 1 remains unmerged by this work.
- C15/C16 need director go after C13 playtests; C21 needs explicit go. C23/C12 stand.
- Hatchet B14 remains staged; item sidecars need real C12/M25 integration support,
  never fake NPC appearance overrides. Communicator owns manifest/status integration.
- Riverlands revision 2 approval is layout-only; placeholders are not approved art and
  C7 activation remains gated. C32 worldforge revision fix, C33 inventory icons and
  C31 Hunyuan3D-2mv-only backend direction remain integrated.
- B19/B11 relays do not replace digest-bound approvals. Normal assets 3908 frames,
  five pages 79.84/19.88 MiB; HD gaps 1515, approvals 4/41. Preserve all existing gates.
