# Sprite Forge pipeline

The Sprite Forge (`art/source/forge/`) turns doctrine-standard reference sheets into
layered pixel-art sprites. Quality comes from fixed, spec-driven scripts. The
operator runs stages, looks at the output and fixes the inputs (PRD-1, PRD-6.3).

> **Build status (2026-11-01):** for **creatures** (quadruped template) the forge runs
> `prep → gen3d → clean → texture → rig → animate → bake → pixelize → qa → packet` on
> machine A: 15 clips, 616 frames. Rivallie takes about 15 minutes after gen3d.
> **Not built yet:** the humanoid rig (UAL2 fit, UAL1 bone map), `fit`, `faces`, `items`,
> `publish`, other creature templates and the `environment` kind; codex tickets C3 (rest),
> C9 and C10. `doctor` prints readiness per class. Production is gated per class until a
> `--to-blender--go-<class>-` message exists. The agent runbook is the `sprite-forge` skill.

## Why this design

Small models cannot model, light or animate by typing numbers (postmortem F5).
They can reliably run a command, read a report, look at an image and fix an
input. The forge moves every aesthetic decision into the spec (palette, light,
bands, outline, canvases, QA limits) and every geometric decision into
image-to-3D plus a shared skeleton. The operator is left with the jobs it can do
well.

## Data model

- **Body types** (`spec/body_types.json`): standard, sturdy, slender, elder. Each is
  one mesh rigged to the Quaternius UAL skeleton and approved once.
- **Parts:** hair, headwear, top, bottom, outerwear, footwear, prop. Each is a
  mesh from image-to-3D, fitted to every body type it supports.
- **Recipe** (`recipes/<asset>.json`): body type + skin ramp + part list +
  palette ramp per material slot + face set + default props. A character is a
  recipe. Reusable gear means reusing parts; variety comes from ramp swaps.

## Stages

| #   | Stage      | What it does                                                                                                                                                                                                                                                                                           | Output                          |
| --- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| 1   | `prep`     | Validates a reference sheet against PRD-3                                                                                                                                                                                                                                                              | `work/<asset>/prep.json`        |
| 2   | `gen3d`    | Runs Hunyuan3D-2mv or TRELLIS locally (RTX 5080, sm_120 build) on the sheet                                                                                                                                                                                                                            | raw `.glb` plus seed and hash   |
| 3   | `clean`    | Scales to the spec height, sets feet origin, faces −Y, merges, decimates to 8–15k tris, keeps albedo only                                                                                                                                                                                              | clean mesh                      |
| 4   | `rig`      | Orients creatures head-to-south, detects landmarks (leg columns, spine, head, tail by surface path), fits the template from `spec/skeletons/` with `Socket_*` bones and IK paw targets, weights on a voxel proxy and transfers them to the mesh; writes `rig_preview.png`. Humans: UAL2 fit (codex C9) | rigged body                     |
| 5   | `fit`      | Fits parts onto a body type (Surface Deform / Shrinkwrap), transfers weights from the body, masks hidden body faces                                                                                                                                                                                    | dressed character               |
| 6   | `animate`  | Creatures: parametric clips from the template gait (`blender/gaits.py`), every frame keyed with constant interpolation, exact frame counts, CMB-3 phases. Humans: UAL2 actions plus UAL1 through the bone map (codex C9)                                                                               | actions                         |
| 7   | `bake`     | Cycles at 1 spp and 0.01 px filter. Per facing and frame: albedo, normal, depth, material ID, alpha passes, plus socket tracks (head, hands, root)                                                                                                                                                     | EXR passes plus `tracks.json`   |
| 8   | `pixelize` | Banded N·L mapped to palette ramps (OKLab), selective outline, orphan and jaggy cleanup, anchor assertion                                                                                                                                                                                              | body frames (PNG)               |
| 9   | `faces`    | Renders the face grammar per facing and expression, recoloured from the recipe's ramps                                                                                                                                                                                                                 | face layer atlas                |
| 10  | `items`    | Renders each prop for 8 facings × 8 grip angles, plus its inventory icon from the same mesh                                                                                                                                                                                                            | item layers and icon            |
| 11  | `qa`       | All spec QA checks; writes the report and a 4× contact sheet                                                                                                                                                                                                                                           | `qa_report.json`, `contact.png` |
| 12  | `packet`   | Assembles the director review packet; requires that the contact sheet was viewed                                                                                                                                                                                                                       | `art/review/<date>-<asset>/`    |
| 13  | `publish`  | Requires a director approval record; copies frames to `art/source/exports/`, runs `rebuild.py` and `npm run assets:build`                                                                                                                                                                              | runtime source frames           |

`forge.py next --asset <id>` prints the exact next command for an asset, or the
reason it is blocked.

## Layered output (L4)

Runtime composition, back to front: contact shadow → body frame → face decal at
`tracks.head` → held items at `tracks.hand.{L,R}`, using the frame's grip-angle
bucket and in-front/behind flag. Codex implements the compositor (ART-M4); the
forge guarantees the tracks are exact integers in art pixels.

## Calibration

`forge.py selftest` renders a calibration scene (sphere, cube, cylinder in known
ramps) and checks bands, outline, anchor projection and determinism. A 1×1×1
calibration cube must match the 32×8 cliff strip once codex records the
elevation-step height (ART-M8).

## Design notes from bring-up

- **Colour comes from the reference, not from gen3d.** Hunyuan3D's texture painter needs
  custom CUDA extensions and invents detail. Projecting the sheet's front, side and back
  colours keeps identity exact (PRD-3.5). `pixelize` then classifies each pixel's ramp by
  hue and chroma, so painted shadows in the sheet don't become false regions.
- **Consistent sheets matter most.** A master that mixes poses across views (Rivallie
  standing upright in front and back, on four legs in the side view) produces a hybrid
  mesh. The PRD-3 standard exists for exactly this reason.
- **Creature canvases need room below the root.** At 30° a long body's front projects
  below the feet in the `s` and `n` facings. The spec's creature canvases reserve 10–16
  art px below the anchor.
- **Skeleton.** Humans use the Quaternius UAL2 rig (CC0, vendored by `gen3d/setup.sh`).
  UAL2 brings the 3-hit sword combo, block, knockback, consume, farming and tree chopping.
  UAL1's locomotion (walk, jog, sprint, idle) is retargeted onto it.
- **First GPU bake on a new machine** JIT-compiles Cycles kernels for Blackwell (about 7
  minutes, cached afterwards). Baked pixels are bit-identical across runs.
