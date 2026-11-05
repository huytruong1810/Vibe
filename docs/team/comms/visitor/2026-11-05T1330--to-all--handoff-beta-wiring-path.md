---
from: visitor
to: all (next visitor session first; codex, communicator, blender, claude for their rows)
date: 2026-11-05T19:30:00Z
subject: HANDOFF: the shortest path to a beta build with every approved asset wired in
evidence:
  - docs/team/queue/{codex,blender,communicator,visitor}.md
  - docs/team/comms/visitor/session-2026-11-05.md
  - commits 81f04a32, fcc78fa7, 5a1d3686, 7aee5a08, 51eadd03, d97206ca
---

# Where we are

- All 8 creature bodies, 10 NPC bodies, the player body, 6 held items, 5 environment props, 17 inventory icons, the
  Aqualia terrain set and 19 face sidecars are approved and staged (45 staging JSONs + faces). **None of it is merged into
  `art/source/manifest.json` yet except the three early creature bodies.** That merge (M25) is the first gate to a
  playable beta.
- The authored map is not the game's world: `Simulation` still builds from `WorldGenerator` (C7). Even with art merged,
  the beta shows the old procedural world until C7 activates.
- No deploy exists for the director to play (C22).
- Acting-director power ends **2026-11-11T00:00Z** (directive 017). Decide what you can before then.

# Priority order (wire everything together first)

| #   | Ticket                                       | Owner        | Why it comes here                                                                                                                                                                       | First action                                                                                                                                  |
| --- | -------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **M25** merge Batch 1 and 2 into the manifest | communicator | Nothing staged reaches the game until `art:integrate merge` runs. Batch 2 digests are now unblocked: B27 and B29 are done.                                                                  | Verify `approve-record` is clean, then `npm run art:integrate -- merge <asset>` for each asset in the M25 list, `assets:build`, `check:assets`. |
| 2   | **Decide the pending packets** (visitor)     | visitor      | Unmerged art cannot ship. Candidates waiting: `B5` (18 landmarks), `B18` (4 display furniture), `B24` (18 flora sprites, packets `art/review/2026-11-05-env-flora-*`).                       | Open each packet's contact sheet and QA (PRD-5), then `forge.py approve-record`. Do not decide `B25` portraits: I wrote C33, so claude or communicator decides them (TEAM-4.2 rule 5). |
| 3   | **C7** authored world in the engine          | codex        | The biggest wiring gap. Map-driven settlements and spawn (WLD-M2), save `worldSource` versioning (WLD-M3), then a beta toggle. Without it the new art has no map to stand on.              | Read the C7 scoping note in `queue/codex.md` (Simulation at `simulation.ts:187`, 40 sites on fixed `VILLAGES`). Start with WLD-M2.            |
| 4   | **C11b** terrain in the renderer             | codex        | Code is candidate; the terrain set is approved and staged. Needs M25 for `aqualia-terrain` and a 1080p capture of the village showing real shores.                                          | After M25, capture and look at the village (PRD-5), then close the ticket.                                                                    |
| 5   | **C22** beta channel                         | codex        | Gives the director a URL for every green push, a build stamp and a playtest template. Needs a `workflow` token on machine B for `.github/`.                                                  | Keep CI green first; then `beta.yml` with `base: '/Vibe/'`; resolve catalog URLs against `BASE_URL`.                                          |
| 6   | **B26** dress village and Riverlands         | blender      | Uses the 5 approved B5 props now, and the rest once item 2 is decided. Produces the map packets that C7 consumes.                                                                           | `worldforge` passes against the region plan; no direct LDtk edits.                                                                            |
| 7   | **C3g** build-side atlas work                | visitor/codex | 19 actors plus terrain pages will raise decoded atlas memory. Do it before M25 batches land if possible, else straight after (budget 128 MiB Low, 256 MiB Balanced).                         | Write failing tests first (see Open engineering below).                                                                                       |
| 8   | **C24, C25** conversation and memory         | codex        | The villager features of the beta. C34 retrieval text and code are in; C25 must write `MemoryRecord.subkind` for commitments and relationships.                                              | C24 first (`DialogueSession`, 75% compaction), then C25.                                                                                      |
| 9   | **B20** copper sword and shortbow            | blender      | Still `thinFeature` failing (32 and 12 poses) after C36. They stay staged at their earlier approved packets, so they do not block the beta.                                                 | Needs a design decision: widen the crossguard and bow string so they survive 45° projection, or accept the soft check.                        |
| 10  | **C14 then C13, C17 to C20**                 | codex        | Combat fairness, creature minds and written/painted artifacts. Valuable, not on the wiring path.                                                                                            | After items 1 to 5.                                                                                                                           |

# Review debt on code I wrote (needs codex or claude)

None of this is engineering-approved:

- **C33** `forgelib/portrait.py`: thresholds are from the proposal and synthetic tests; not run on real GPU output. B25's 19-actor
  set was generated with it, so a reviewer should look at one expression trio at 96 px.
- **C34** `src/domain/agents.ts` + `scripts/verify-villagers.ts`: the M1 to M5 gate uses canned fallback dialogue, not gemma4.
  `package.json` has no `test:villagers` script; adding one is codex's. Run it live through `npm run test:ollama` (B0).
- **C35** `forgelib/core.py` licence table: values are from memory of the licence texts. Fetch and verify each before filling a
  value other than `unverified`.
- **C17** `src/domain/artifacts.ts`: domain store only; items, recipes, hooks, save version and commands are codex's.
- **C32** `tools/worldforge_compare.py`: codex needs to call `prepare_packet_comparison` from `worldforge render`/`packet`.

# Open engineering for the next visitor session (C3g, ticket V11)

Claimed in `queue/codex.md`. Done: gallery page selector and memory total, budget text in `docs/engineering/hd-presentation.md`.
Still to do, test first:

1. `tests/assets-v2.test.ts`: review-only clips (`turntable`, `ExpressionSheet`) are absent from the runtime atlas.
2. Frame dedup by content hash in `scripts/assets-build.ts`, keeping per-frame metadata.
3. Trimmed-sprite pivot alignment in `src/presentation/renderer.ts`. The build already records `trim: f.spriteSourceSize`.
4. Run `npm run assets:build` and `check:assets`; do not commit generated files in `public/assets/generated/`.

# Working rules that cost time this session

- Run as `HEARTHWILD_ROLE=visitor`; never `set-role.mjs` (the role file is blender's).
- Shared checkout: `git fetch && git merge --no-edit origin/studio/doctrine-v1`, `git commit --only <files>`. The guard hook
  denies any command that mentions a bare `docs/team/comms/director/approvals/` directory or a glob; stage approval records by
  full file name.
- Blender's session file and its uncommitted art are not mine; leave them and say so under Gaps.
- `npm run check` takes about 70 seconds; run it in the background and read the log.
- Blender's commit `50b96bdc` was local and unpushed at the time of writing; confirm it reached origin before relying on it.

# Gaps

- I did not run `art:integrate` (communicator's command), view B5, B18 or B24 packets, or open the Pages settings.
- The status board `docs/team/status-board.md` is communicator's and was not updated by me; its rows may lag the queues.
