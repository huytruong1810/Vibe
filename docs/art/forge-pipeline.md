# Sprite Forge pipeline

The Sprite Forge (`art/source/forge/`) turns doctrine-standard reference sheets into
layered pixel-art sprites. Quality comes from fixed, spec-driven scripts. The
operator runs stages, looks at the output and fixes the inputs (PRD-1, PRD-6.3).

> Build status: the spec and palette are in place. Stages are being built by
> Claude in Phase 2. Until `forge.py doctor` passes, do not run production
> through the forge. The agent runbook is the `sprite-forge` skill in
> `.agents/skills/`.

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

| #   | Stage      | What it does                                                                                                                                       | Output                          |
| --- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | `prep`     | Validates a reference sheet against PRD-3                                                                                                          | `work/<asset>/prep.json`        |
| 2   | `gen3d`    | Runs Hunyuan3D-2mv or TRELLIS locally (RTX 5080, sm_120 build) on the sheet                                                                        | raw `.glb` plus seed and hash   |
| 3   | `clean`    | Scales to the spec height, sets feet origin, faces −Y, merges, decimates to 8–15k tris, keeps albedo only                                          | clean mesh                      |
| 4   | `rig`      | Fits the UAL skeleton by A-pose landmarks; computes weights on a voxel proxy and transfers them to the mesh; adds socket empties                   | rigged body                     |
| 5   | `fit`      | Fits parts onto a body type (Surface Deform / Shrinkwrap), transfers weights from the body, masks hidden body faces                                | dressed character               |
| 6   | `animate`  | Applies the shared clip library (constant interpolation, exact frame counts, windup/active/recovery partitions)                                    | actions                         |
| 7   | `bake`     | Cycles at 1 spp and 0.01 px filter. Per facing and frame: albedo, normal, depth, material ID, alpha passes, plus socket tracks (head, hands, root) | EXR passes plus `tracks.json`   |
| 8   | `pixelize` | Banded N·L mapped to palette ramps (OKLab), selective outline, orphan and jaggy cleanup, anchor assertion                                          | body frames (PNG)               |
| 9   | `faces`    | Renders the face grammar per facing and expression, recoloured from the recipe's ramps                                                             | face layer atlas                |
| 10  | `items`    | Renders each prop for 8 facings × 8 grip angles, plus its inventory icon from the same mesh                                                        | item layers and icon            |
| 11  | `qa`       | All spec QA checks; writes the report and a 4× contact sheet                                                                                       | `qa_report.json`, `contact.png` |
| 12  | `packet`   | Assembles the director review packet; requires that the contact sheet was viewed                                                                   | `art/review/<date>-<asset>/`    |
| 13  | `publish`  | Requires a director approval record; copies frames to `art/source/exports/`, runs `rebuild.py` and `npm run assets:build`                          | runtime source frames           |

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
