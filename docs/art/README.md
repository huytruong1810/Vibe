# Art: entry point

Start with the [doctrine](../doctrine/README.md), especially the
[art bible](../doctrine/03-art-bible.md), the
[production doctrine](../doctrine/09-production-doctrine.md) and the
[locked decisions](../doctrine/locked-decisions.md). They outrank everything in
this folder (DOC-2).

## What lives here

| File                                            | Owner                         | Purpose                                                                                                                                                                                                         |
| ----------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [contract.md](contract.md)                      | codex                         | Runtime art contract v1 plus [contract-v2.md](contract-v2.md) (layers, rigs, sockets, provenance, approvals ledger). Display canvases stay as published; doctrine 2× art is exported pre-upscaled to them (L1). |
| [forge-pipeline.md](forge-pipeline.md)          | claude                        | How the Sprite Forge turns reference sheets into layered pixel sprites, stage by stage.                                                                                                                         |
| [review-gallery.md](review-gallery.md)          | codex                         | The development gallery (`/?gallery=1`) for frame, facing and anchor review.                                                                                                                                    |
| [reviews/](reviews)                            | director, codex, communicator | Formal review records (first proofs, portraits, golden samples).                                                                                                                                                |
| [history/postmortem.md](history/postmortem.md)  | claude                        | Every failed approach so far and the lesson the doctrine took from it.                                                                                                                                          |
| `coverage.json`, `coverage.md`, `*.schema.json` | generated                     | Written by `npm run assets:build`. Never edit by hand; paths are fixed by scripts and CI.                                                                                                                       |

## Rules that bite most often

- Bind art to canonical IDs (`npc:neris`, `origin/aqualia`, `rivallie`), never
  filenames or village indices. Never substitute another named character for a
  missing one (contract).
- Approved source art goes in `art/source/`. The atlas in `public/assets/generated/`
  is compiler-owned. Run `npm run assets:build` and `npm run check:assets`.
- `npm run check:assets:hd` is meant to fail until the slice is actually
  approved. Never weaken it.
- A structural pass is not approval. Only the director approves (L7, TEAM-4).

## Where art lives on disk

```
art/source/references/<asset>/   reference sheets (PRD-3)       communicator
art/source/forge/                Sprite Forge (code, spec)       claude (spec = doctrine)
art/source/forge/recipes/        character/asset recipes         blender
art/source/forge/work/           scratch, gitignored             anyone
art/source/blender/              approved .blend sources, legacy blender
art/review/<date>-<asset>/       forge packets for the director  blender / communicator
art/source/exports/              runtime source frames           via forge publish after approval
art/source/masters/              2D identity masters (approved portraits and lineups)
```

## Current state (2026-10-31)

See [`docs/team/status-board.md`](../team/status-board.md). In short: the box-built
3D cast and creatures are **rejected** (method retired, PRD-2). The 2D portraits
are **director-approved for integration**. The environment is **candidate**.
The golden samples (Rivallie, Neris, player Aqualia) are next (PRD-4).
