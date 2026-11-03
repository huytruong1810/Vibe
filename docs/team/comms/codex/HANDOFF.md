# Codex session handoff

## Current: C13 candidate; next implementation C18

Branch `eng/hd-presentation`, workspace `C:/Users/htruong/source/repos/Vibe`.
C13 runtime is implemented on pickup `692b4de`; no C18 runtime edits yet.
[C18 implementation plan](c18-plan.md) was prepared before its code changes.
Codex reaches candidate at most; only the director approves.

Use [team-comms](../../../../.agents/skills/team-comms/SKILL.md), pull only with a clean
index, read new addressed messages and re-read `docs/team/briefs/codex.md` after compaction.
Keep the existing [session log](session-2026-11-02.md) current. Leave Vibe-art and
preexisting review worktrees alone. No alarm or hourly automation is scheduled.

## C13 implementation

- `src/domain/creature-minds.ts`: honest scene-aware typed-array perception,
  `crm-obs-1` (64 floats), `crm-cond-1` (30), interchangeable brain interface, scripted
  rules/tactics identity, all 12 intents and all eight species. No learned policy.
- Tick order: physiology, grid, engagement, director, brain, one intent movement step,
  then attack resolution. Calm utility and human/NPC combat remain. Hunting, territory,
  retaliation and reservations remain reasons to engage, governed by perception.
- Transient selection negotiates the actual target/category. Held tokens commit only
  after successful startup. C14 independent pools, spacing, costs and cues remain.
- Reactions have a two-tick floor, six-tick commitment and hysteresis. At most 48 nearby
  full-rate brains are selected by distance/stable ID; other loaded combatants decide at
  2 Hz and continue executing every tick. The overworld is currently one loaded scene;
  there is no new region streamer. Spawn/home radius is 12 until authored habitats activate.
- Zephyrit/Cindermoth air traversal has separate navigation keys, solid collision,
  ordinary hit eligibility and needs-activity landing. Partner focus/regroup goes through
  worker commands; HUD uses actual intents; developer scores and live observation inspector.
- Save v8 retains v1-v7 migrations, C14 director and C25 memory. It saves motion-driving
  mind/RNG/history/home/pack state, failed-hunt state and separate 0-10 bond hearts
  (old creatures migrate to zero; trust is independent). Stale lifecycle references clear.
- Perception observation groups share one spatial pass. Flocking folds only valid visible
  herd mates. Director cleanup visits tracked slots; no timing gate was relaxed.

## C13 evidence and limitations

Full four-worker `npm run check`: **444 tests / 32 files**, types, architecture, normal
assets and build passed; artifact <50 ms gate retained. The 3,000-tick restored
intent/motion hash is `d0c664d43d5cdd3110d6d3105c376d719589d609e15b34034e281ae8a599f10e`.
Full browser suite passed **22/22** before the final performance-only optimization;
Final focused C13 journeys pass **2/2**, C14 **1/1**, and production beta **2/2**
at each of `/` and `/Vibe/`. See [candidate validation](c13-validation.json).

[Benchmark](c13-benchmark.json), i7-1365U, Node22.22.3, win32 x64, 39.7 GiB:
engaged150 brain mean/p95/max **0.339/0.734/3.154 ms**, movement **0.290/0.563/6.094**,
director **0.106/0.194/15.876**. All 150 execute; full-rate cap is 48. Assertions are p95,
not an every-tick guarantee. [Failed measurements](c13-benchmark-history.json) are retained.
C14 player/wild director p95 **0.168/0.145**; C25 retrieval/prompt **1.814/2.999**.
Whole-simulation p95 **8.661 ms**, dense **9.799**, active128 **10.514**: no claim of
unchanged overall throughput or reference-laptop acceptance. Run benchmarks alone.

Captures show prototype sprites and crowd overlap; missing authored behavior clips
are requested in [the Blender follow-up](2026-11-03T1417--to-blender--c13-behavior-clips.md).
No art production, training, GPU inference or approval is included. Normal asset coverage
remains 3908 frames, five pages, 79.84/19.88 MiB; HD gaps **1515**, approvals **4/41**.
The HD gate is unchanged. Director review and reference-machine playtest remain external.

## Baseline CI prerequisite

Engineering `5b8e341`: [41564371915](https://github.com/huytruong1810/Vibe/actions/runs/41564371915)
completed/success; [41564379329](https://github.com/huytruong1810/Vibe/actions/runs/41564379329)
failed its verify browser step; beta and ecology jobs passed. Public logs returned 403.
Automatic review rejected stored-credential access; no credential was read. Isolated
unchanged baseline passed 19 browser cases plus terrain after export-junction correction.
The exact remote failed test remains unknown; no repair claim is made from that result.
Studio item-tool repair `83dd6f6 / 41563209207` remains successful.

A dirty-tree pull was rejected by automatic review; safe `git fetch origin` succeeded,
and HEAD/origin divergence was 0/0. Commit C13 before the next pull. Do not bypass the
credential rejection or mix C18 code into the C13 commit. The isolated baseline export and owned scratch were removed after unlinking junctions.
Production previews exited; formatting passes. Run hygiene before pushing.

## Next: C18, then C19/C20/C3g/C7

Follow [the concrete C18 plan](c18-plan.md): first player write/page/seal plus a book
screen and its three-page journey; then durable NPC quotas/reach, two-step bounded
reading with sourced memories, grounded writing, metadata-only facts, profile motivation,
save v9 and injection/budget/preemption tests. C18 is still open until implementation.
Neris is the existing ferry keeper filling the requested dock-master role. No painting
provider or C19 work belongs in that change. Machine-A live reading latency must be
requested from Blender and reported as an external gap until measured.

## Standing boundaries

- C22/C24/C25/C14 remain candidates with separate external acceptance. Only the director
  merges main or activates Pages; draft PR #1 remains unmerged by this work.
- C15/C16 need director go after C13 playtests; C21 also needs explicit go. C23/C12 stand.
- Hatchet B14 remains staged; item sidecars need real integration support (C12/M25),
  never fake NPC appearance overrides. Communicator owns manifest/status integration.
- Riverlands revision2 approval is layout-only; preview placeholders are not approved
  art and C7 activation remains gated. C32 is the previous-revision worldforge fix;
  C33 is inventory icons. C31's Hunyuan3D-2mv-only backend direction remains integrated.
- B19/B11 relays do not replace missing digest-bound approval records. Preserve HD,
  artifact, C14 fairness and C25 memory gates. Do not edit doctrine or protected briefs.
