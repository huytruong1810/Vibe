# 09 — Production doctrine

How art gets made. This doc exists because the first production attempt failed:
assets were built from typed box coordinates, nobody looked at the renders, the
whole cast was attempted at once, and the result was labelled "AAA". See
[`docs/art/history/postmortem.md`](../art/history/postmortem.md).

## PRD-1 The pipeline (Sprite Forge)

All 3D-baked art goes through the forge (`art/source/forge/`), in order:

```
reference sheet (PRD-3) → gen3d → clean → rig → fit (parts onto body types)
→ animate → bake → pixelize → faces / items layers → qa → packet → director review
→ publish (only after approval)
```

The forge CLI tells you the next step: `python art/source/forge/forge.py next
--asset <id>`. Every stage writes a JSON record; skipping a stage is impossible
by design.

## PRD-2 Allowed and forbidden methods

| Allowed | Forbidden |
| --- | --- |
| Image-to-3D from doctrine-standard reference sheets (L5) | Building meshes from typed vertex or box coordinates (`add_box_bmesh`, `primitive_cube_add` chains) for production assets |
| Calibration and proxy primitives inside forge scripts (selftest cube, voxel proxies for weighting) | Hand-tuning palette, light or outline per asset outside the spec |
| Kit recombination of approved parts and palette ramps | Upscaling prototype or 1× frames and calling them native |
| 2D painting for the ART-15 classes (terrain, UI, VFX, portraits) | Image-generated sprite frames or turnarounds used as game frames (they drift between views) |
| Image generation for reference sheets, portraits, concept and mood art (PRD-7) | Editing forge code or spec to make QA pass |

## PRD-3 Reference-sheet standard

Image-to-3D quality is decided by the input. A reference sheet must have:

- **PRD-3.1** Full body, orthographic-looking **front** view, **A-pose** (arms
  about 45° from the body, palms in, legs slightly apart), neutral expression,
  plain flat light-grey background, character filling at least 80% of the image
  height, image at least 1024 px tall.
- **PRD-3.2** Doctrine proportions (L3: 4.5–5 heads) and doctrine palette
  intent (the character's ramps from `palette.json`).
- **PRD-3.3** **No held props, no fused accessories.** Props, bags, weapons and
  tools are separate prop sheets (single object, three-quarter view, plain
  background).
- **PRD-3.4** A matching **back** view when the back carries identity (capes,
  hair, packs). Side views are optional.
- **PRD-3.5** Identity is taken from the approved masters and portraits: hair
  shape and colour, costume layers, signature item, skin tone. The master is the
  identity source; the sheet is the proportion- and pose-corrected version.
- **PRD-3.6** Part sheets (hair, headwear, tops, bottoms, outerwear, footwear)
  show the item alone, or worn by the neutral body-type mannequin, front and
  back, A-pose.
- Sheets live in `art/source/references/<asset-id>/` with a `sheet.json`
  listing the files, the source master, and the prompts and seeds used.

## PRD-4 Golden samples first, then vertical, then wide

- **PRD-4.1** No batch production until the director approves the three
  golden samples end-to-end: **Rivallie**, **Neris**, **player Aqualia**.
  "End-to-end" means reference sheet, mesh, rig, idle, walk and one strike clip,
  all 8 facings, face layer, one held item, a QA report, a packet, and an
  in-scene proof.
- **PRD-4.2** After approval, produce **one asset at a time** through the full
  clip matrix before starting the next. Never have more than two assets in flight
  per agent.
- **PRD-4.3** Breadth requests ("do all 30 villagers") are answered with a
  schedule, not a batch: the asset order, the per-asset packet cadence, and the
  next director review point.

## PRD-5 Look at your work

- **PRD-5.1** Before describing, reporting, committing or messaging about any
  image you produced, **open it and look at it** (for Antigravity agents:
  `read_file` on the PNG). For sprite work, open the 4× contact sheet the forge
  produces.
- **PRD-5.2** In every report, describe what you saw in concrete visual terms
  (silhouette, palette, defects), then cite the QA numbers. "Looks great" is not
  a description.
- **PRD-5.3** Compare against the reference sheet and the approved neighbours in
  the contact sheet, not against your memory of the request.

## PRD-6 What QA can and cannot do

- **PRD-6.1** Forge QA checks structure: canvas, margins, anchors, heights,
  palette membership, colour counts, outline continuity, orphans, flicker,
  cast distinctness, reference fidelity and value contrast. A QA pass makes an
  asset a `candidate`.
- **PRD-6.2** QA cannot judge appeal, anatomy, charm or style. Only the director
  approves (L7).
- **PRD-6.3** A QA failure is fixed by changing the **input** (reference sheet,
  part fit, rig landmarks, recipe), never by editing forge code, the spec or QA
  limits. If you believe a limit is wrong, write a proposal (DOC-3).

## PRD-7 Image-generation subagents (quota-bound)

Antigravity agents can spin up image-generation subagents. They are valuable and
**rationed**: the quota is shared and slow to refill.

- **PRD-7.1 Use for:** reference sheets (PRD-3), back and side views, part
  and prop sheets, body-type mannequin sheets, portraits (ART-14), concept and
  mood paintings for new locations, UI frame and icon concepts, VFX concept
  frames, festival decoration concepts.
- **PRD-7.2 Never use for:** final sprite frames, turnarounds used as frames,
  terrain tiles used as-is (they don't tile), anything that must be
  pixel-exact (faces, outlines, palettes).
- **PRD-7.3 Budget:** at most **4 generations per reference sheet** and **2
  per prop or part sheet** before asking the director. Batch related requests
  into one prompt where possible (for example front and back in one sheet).
- **PRD-7.4 Prompt discipline:** use the prompt templates in the
  `reference-sheets` skill. Always include the identity source, the doctrine
  proportions, the A-pose clause, "no props in hands", "plain light-grey
  background", "full body", "orthographic front view". Record prompt, seed and
  outcome.
- **PRD-7.5 Ledger:** every generation is logged in your comms folder file
  `image-ledger.md` (date, asset, purpose, prompt ID, kept or rejected and why).
- **PRD-7.6** Look at every generated image before using it (PRD-5).

## PRD-8 Determinism and hygiene

- **PRD-8.1** Forge stages are deterministic given their inputs. A
  non-deterministic step (image generation, gen3d) records its seed and output
  hash, and downstream stages key off the hash.
- **PRD-8.2** Scratch output goes to gitignored work folders
  (`art/source/forge/work/`). Commit only sources (references, recipes,
  approved models), packets and approved exports.
- **PRD-8.3** Large binaries (`.blend`, `.glb`, weights) are committed only when
  they are approved sources. Model weights are never committed.

## PRD-9 Definition of done for an asset

1. Reference sheet committed (PRD-3).
2. Forge stages complete; QA pass (`candidate`).
3. Packet in `art/review/<date>-<asset>/` with contact sheet, turntable GIF, QA
   report and an in-scene proof; packet viewed by its author (PRD-5).
4. Director approval record in `docs/team/comms/director/approvals/`.
5. `forge publish` run; `npm run assets:build` and `npm run check:assets` pass.
6. Status board updated with evidence links.

## Engineering mandates

| ID | Mandate |
| --- | --- |
| PRD-M1 | The asset build accepts the forge's layered outputs (body clips, face atlas, item angle sets, socket-track metadata) once the art contract is updated for L4. |
| PRD-M2 | The gallery can show packet assets in scene at 2× (L1) for director review. |
