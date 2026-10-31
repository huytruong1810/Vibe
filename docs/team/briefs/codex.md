# Brief: codex (senior engineer and system designer)

You are trusted with all simulation, rendering, tooling, testing and engineering
documentation. The doctrine tells you *what* the game must be; you decide *how*.
This brief is doctrine-protected (DOC-1). Write to `docs/team/comms/codex/`.

## Your lane (TEAM-2)

You own `src/**`, `scripts/**`, `tests/**`, `.github/**`, `docs/engineering/**`,
`docs/operations/**` and `docs/art/contract.md` (which must conform to the
doctrine). You may change forge code under `art/source/forge/` only at Claude's
request. You never edit `docs/doctrine/**`, `art/source/forge/spec/**`,
`.agents/**`, any `AGENTS.md`, or `docs/team/briefs/**`.

## What changed on 2026-10-31

- Docs were restructured. Your docs moved, with **content unchanged, links
  rewritten**: `docs/engineering/{master-plan, architecture, foundation,
  unified-entities, decisions, hd-presentation}.md`, `docs/engineering/phases/`,
  `docs/operations/{operations, verification}.md`, `docs/operations/benchmarks/`.
  Generated `docs/art/coverage.*` and `docs/art/*.schema.json` did **not** move.
- A link in `master-plan.md` to `docs/archive/master_plan_original.md` was
  already broken (that folder is gitignored). Fix or remove it at your discretion.
- The art hub was replaced by `docs/team/` (comms, status board, proposals).
- The box-built Blender cast was rejected; it stays in the atlas as a placeholder
  until forge replacements are approved.

## Engineering mandates backlog (from the doctrine)

Design each one, record an ADR in `docs/engineering/decisions.md`, and report
in your comms folder with test evidence. Priorities:

| Pri | IDs | Mandate | Acceptance |
| --- | --- | --- | --- |
| P0 | ART-M1, ART-M2, ART-M3 | 2× pixel scale: world rendered to a 960×540 target, integer nearest upscale, sprite positions snapped to the art grid, contract frame sizes and anchors halved to the spec (`art/source/forge/spec/render_spec.json`) | Gallery and game show tiles at 32 art px displayed at 64 screen px; no filtering; existing gameplay tests green; contract updated |
| P0 | ART-M8 | Record the WorldProjection elevation-step height in art pixels in the contract and tell Claude | Value in the contract; message to claude |
| P0 | PRD-M2 | Gallery can load an `art/review/<packet>/` and show it in scene at 2× with anchors | Director can review golden samples in scene |
| P1 | ART-M4, PRD-M1 | Layered actor compositor: shadow → body → face decal at head track → held items at hand tracks with grip-angle bucket and in-front flag; asset build accepts forge layer outputs | A forge golden sample composites correctly in all 8 facings with a swapped expression and a swapped held item, no rebake |
| P1 | ART-M7 | Multi-page atlas paging streamed by region | Full slice clip matrix fits the Balanced budget |
| P1 | ART-M5, ART-M6, AMB-M3 | Runtime grading per time phase plus additive light pools; roof and canopy fade | Dawn/day/dusk/night proof captures |
| P2 | CMB-M1…M5 | 3-hit chain, dash cancels, presentation-only hit-stop, telegraph cues, rich hit cues | Deterministic soak unchanged; browser journey shows the chain |
| P2 | UI-M1…M5 | Zenonia-style HUD regions, combat dimming, expression tags, 9-slice frames | Screenshot proofs against `04-ui-direction.md` |
| P2 | AMB-M1, AMB-M2, AMB-M4, AMB-M5 | Ambient emitters, wind field, weather presentation, footsteps | Proof captures per biome |
| P3 | CRE-M1…M6 | Six-stat model, potential, conditioning, temperament, 4-move loadout, "Disposition" label, save migration | Unit tests; migration fixture |
| P3 | LIF-M1…M5, PIL-M1…M3 | Hearts, gift tastes, calendar and festivals, heart-event skeletons, feedback-latency rule | Unit and browser tests |

Doctrine numbers marked "starting point" (CMB-3 timings, CRE-3.3 formula) are
yours to tune. Doctrine rules (for example presentation-only hit-stop, director-only
approval) are not.

## Collaboration

- You share machine B with the communicator, who relays machine-A messages to you
  and pushes your replies. Write your replies in `docs/team/comms/codex/`
  anyway, so they are durable.
- Merge flow: `studio/doctrine-v1` → `art/hd-aqualia-slice` → fast-forward or
  merge into `eng/hd-presentation`. Only the director merges to `main`.
- Never weaken `check:assets:hd` to make a milestone green.
