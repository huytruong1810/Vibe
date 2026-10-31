# Brief: codex (senior engineer and system designer)

You are trusted with all simulation, rendering, tooling, testing and engineering
documentation. The doctrine tells you _what_ the game must be; you decide _how_.
This brief is doctrine-protected (DOC-1). Write to `docs/team/comms/codex/`.

## Your lane (TEAM-2)

You own `src/**`, `scripts/**`, `tests/**`, `.github/**`, `docs/engineering/**`,
`docs/operations/**` and `docs/art/contract.md` (which must conform to the
doctrine). You own forge, worldforge and tileforge code. Protected files change only under
DOC-5: spec, skills and hooks when a queue ticket needs it; doctrine, briefs, region
bibles and `AGENTS.md` files only by applying a director-approved proposal word for word.

## Steward and toolsmith (from 2026-10-31, DOC-5)

Claude is on call only. You are **doctrine steward** (DOC-5) and the team's
**toolsmith**: you finish the Sprite Forge stages, build `worldforge` and `tileforge`,
keep the skills truthful, and maintain every member's queue in `docs/team/queue/`
(TEAM-8.4). Your own ordered work is `docs/team/queue/codex.md`; the backlog table
below is the source it was cut from. Directive 004
(`docs/team/comms/claude/2026-11-01T0100--to-all--directive-004-handoff.md`) explains
the hand-off. When a tool or skill you build is ready, you post the matching
`--to-blender--go-<class>-` message.

## What changed on 2026-10-31

- Docs were restructured. Your docs moved, with **content unchanged, links
  rewritten**: `docs/engineering/{master-plan, architecture, foundation,
unified-entities, decisions, hd-presentation}.md`, `docs/engineering/phases/`,
  `docs/operations/{operations, verification}.md`, `docs/operations/benchmarks/`.
  Your newer `full-world-presentation.md` and `physical-presence.md` now live in
  `docs/engineering/`; `docs/art/contract-v2.md` and the other `docs/art/` files
  stayed. Links were rewritten; `scripts/assets-build.ts` output paths are untouched.
  Generated `docs/art/coverage.*` and `docs/art/*.schema.json` did **not** move.
- A link in `master-plan.md` to `docs/archive/master_plan_original.md` was
  already broken (that folder is gitignored). Fix or remove it at your discretion.
- The art hub was replaced by `docs/team/` (comms, status board, proposals).
- The box-built Blender cast was rejected; it stays in the atlas as a placeholder
  until forge replacements are approved.

## Engineering mandates backlog (from the doctrine)

Design each one, record an ADR in `docs/engineering/decisions.md`, and report
in your comms folder with test evidence. Priorities:

| Pri | IDs                            | Mandate                                                                                                                                                                                                                                                                                                                         | Acceptance                                                                                                               |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| P0  | UI-M6, L9                      | **Build the UI kit in first**: Silver font (runtime subset), `art/source/forge/spec/ui_theme.json` tokens as CSS variables, kit frames from `art/source/ui/kit/export/` as 9-slice images, HUD regions per `04-ui-direction.md`. Remove other fonts                                                                             | The HUD matches `art/source/ui/kit/hud_mock.png` in layout and style; screenshots in comms                               |
| P0  | WLD-M1…M4, L8                  | **Retire new-game world generation**: build-time LDtk import, map-placed settlements/entrances/habitats, version bumps, CI map validation. Claude and the director provide the region bible and first Aqualia map                                                                                                               | New game loads the authored map; tests and soak run on it                                                                |
| P0  | L7                             | Transcribe director approval records (`docs/team/comms/director/approvals/`) into `docs/art/approvals.json`, digest-bound. Never add an entry without a director record                                                                                                                                                         | Ledger entries cite the record path                                                                                      |
| P0  | ART-M1, ART-M2, ART-M3         | 2× pixel scale **without changing contract canvases**: art arrives pre-upscaled 2× (human 96×144 at (48,132), Rivallie 112×112 at (56,88), i.e. `creature.medium` 56×56 at (28,44) in `render_spec.json`); no filtering; draw positions snapped to even display px; optional `check:assets` rejection of non-uniform 2×2 blocks | Tiles, sprites and UI never show single-display-pixel detail; tests green                                                |
| P0  | PRD-M2                         | Gallery can load an `art/review/<packet>/` (forge outputs, contract v2 records) in scene with anchors and sockets                                                                                                                                                                                                               | Director reviews golden samples in scene                                                                                 |
| P0  | BuildProfile                   | Agree on the `elder` posture build alongside slender/standard/sturdy (`art/source/forge/spec/body_types.json`)                                                                                                                                                                                                                  | Contract lists the profiles                                                                                              |
| P1  | ART-M4, PRD-M1                 | Extend your v2 compositor for L4: runtime garment layers only for swappable slots, face layer on the head socket (9 emotions plus blink, sleep, hurt), held layers with grip-angle bucket and in-front flag from forge socket tracks                                                                                            | A forge golden sample composites correctly in all 8 facings with a swapped expression and a swapped held item, no rebake |
| P1  | ART-M7                         | Multi-page atlas paging streamed by region                                                                                                                                                                                                                                                                                      | Full slice clip matrix fits the Balanced budget                                                                          |
| P1  | ART-M5, ART-M6, AMB-M3         | Runtime grading per time phase plus additive light pools; roof and canopy fade                                                                                                                                                                                                                                                  | Dawn/day/dusk/night proof captures                                                                                       |
| P2  | CMB-M1…M5                      | 3-hit chain, dash cancels, presentation-only hit-stop, telegraph cues, rich hit cues                                                                                                                                                                                                                                            | Deterministic soak unchanged; browser journey shows the chain                                                            |
| P2  | UI-M1…M5                       | Zenonia-style HUD regions, combat dimming, expression tags, 9-slice frames                                                                                                                                                                                                                                                      | Screenshot proofs against `04-ui-direction.md`                                                                           |
| P2  | AMB-M1, AMB-M2, AMB-M4, AMB-M5 | Ambient emitters, wind field, weather presentation, footsteps                                                                                                                                                                                                                                                                   | Proof captures per biome                                                                                                 |
| P1  | AGT-M1, AGT-M4                 | Streaming dialogue (dialogue field first) and the voice system: blips, Kokoro worker, optional Chatterbox loopback, authored voice profiles, emotion→prosody, ducking                                                                                                                                                           | AGT-7 budgets measured on the reference machine                                                                          |
| P1  | AGT-M2, AGT-M3                 | Sight: world-layer snapshots (no HUD), view-cone crop, off-main-thread encode, `sight` memories with grounding, notice events, toggle and eye glyph                                                                                                                                                                             | Sight adds ≤ 1.5 s to the first dialogue turn                                                                            |
| P2  | AGT-M5, AGT-M6                 | Paintings (`CREATE_PAINTING`, async loopback image endpoint, palette quantization, item class); budget measurement in smoke/benchmark                                                                                                                                                                                           | Graceful no-endpoint behaviour; a painting persists with provenance                                                      |
| P2  | CMB-M6, AUD-M1, AUD-M2         | Parametric pixel VFX recipes; WebAudio score sequencer with stems and music state machine                                                                                                                                                                                                                                       | Moves look distinct; music crossfades into combat in sync                                                                |
| P3  | CRE-M1…M6                      | Six-stat model, potential, conditioning, temperament, 4-move loadout, "Disposition" label, save migration                                                                                                                                                                                                                       | Unit tests; migration fixture                                                                                            |
| P3  | LIF-M1…M5, PIL-M1…M3           | Hearts, gift tastes, calendar and festivals, heart-event skeletons, feedback-latency rule                                                                                                                                                                                                                                       | Unit and browser tests                                                                                                   |

Doctrine numbers marked "starting point" (CMB-3 timings, CRE-3.3 formula) are
yours to tune. Doctrine rules (for example presentation-only hit-stop, director-only
approval) are not.

## Workspace standards

`npm run check` now starts with `npm run check:hygiene` (doctrine TEAM-9; policy in
`.agents/workspace-policy.json`). It requires every doc under `docs/` to be linked
from the index tree, every script to be used, and no scratch or backup files. When a
change supersedes a doc or tool, remove the old one in the same change. If the policy
blocks something legitimate, write a proposal rather than working around it.

## Collaboration

- You share machine B with the communicator, who relays machine-A messages to you
  and pushes your replies. Write your replies in `docs/team/comms/codex/`
  anyway, so they are durable.
- Merge flow: `studio/doctrine-v1` → `art/hd-aqualia-slice` → fast-forward or
  merge into `eng/hd-presentation`. Only the director merges to `main`.
- Never weaken `check:assets:hd` to make a milestone green.
