# Local image generation for reference art (PRD-7, L12)

Status: built 2026-11-02 (claude). Replaces the quota-bound image subagent. Code:
`art/source/forge/imagegen/` (`setup.sh`, `run_image.py`), `art/source/forge/forgelib/concept.py`,
`forge.py concept|views`, spec `art/source/forge/spec/concept_templates.json`, style
`art/source/style/style.json`, pose guides `art/source/style/pose-guides/`. Procedure: the
`reference-sheets` skill.

## Pipeline

1. **`forge.py concept --asset <id> [--n 4] [--model m] [--seed s]`.** Builds the prompt
   from the recipe's `concept` block, a spec template and the style block. Renders N
   candidate sheets, with all views side by side in one image so they share one identity.
   Writes `work/<id>/concept/` and `contact.png`.
2. **`forge.py views --asset <id> --pick <cand>`.** Splits the sheet into views on its flat
   background (`split_views`). Writes `art/source/references/<id>/` with a `generator`
   provenance block (model, revision, licence, seed, template, prompt, references, style
   hash) and a ledger row.
3. From `prep` on, the forge is unchanged.

`run_image.py` runs in its own venv: torch 2.11 cu128, diffusers 0.41.0, transformers 5.19.0
and bitsandbytes 0.50.2, all pinned. It loads the model once per batch, then exits so the GPU
is free.

## Model (bake-off 2026-11-02)

Machine A keeps one image model: **FLUX.2 [klein] 9B**, transformer in 4-bit NF4 and text
encoder in 8-bit. The registry `art/source/forge/models.json` lists it, and `forge.py doctor`
fails on any other weights in the cache.

Rivallie (`creature-v1`, quadruped pose guide), seeds 900–903, `forge.py concept --n 4`.
Machine A: RTX 5080 Laptop (16 GB VRAM), WSL with 24 GB RAM.

| Model                        | Setting                                                | Load  | Per 2304 × 1344 sheet | Peak VRAM | Peak RAM | Result                                                                                                                           |
| ---------------------------- | ------------------------------------------------------ | ----- | --------------------- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **FLUX.2 [klein] 9B** (kept) | transformer 4-bit NF4, text encoder 8-bit, pre-encoded | 52 s  | 44–58 s               | 14.2 GiB  | 18.2 GB  | 2 of 4 clean (c901, c903): all views on all fours, crisp fin crest, paddle tail. c900 fused a second head; c902 splayed the tail |
| same                         | transformer 8-bit                                      | 108 s | none                  | ~15 GB    |          | spilled to system memory: step 1 of 4 never finished in 5 min                                                                    |
| FLUX.2 [klein] 4B (removed)  | text encoder 8-bit, pre-encoded                        | 29 s  | 23–33 s               | 11.8 GiB  | 10.2 GB  | 1 of 4 clean (c903); c902 stands upright and c900's back view half-upright despite the pose guide                                |
| Qwen-Image-2.1 (removed)     | transformer 4-bit, text encoder 4-bit                  |       | ~3.5 h (projected)    | ~15.9 GB  |          | 5 of 40 steps in 24 min (321 s/step). It scales the output and every reference to `output_resolution²` (over 5 MP at 2304 px)    |

Contact sheets: [klein 9B](../team/comms/claude/boards/2026-11-02-imagegen-rivallie-klein9b.png),
[klein 4B](../team/comms/claude/boards/2026-11-02-imagegen-rivallie-klein4b.png).

Not tried:

- **Qwen-Image-Edit-2511:** the Artificial Analysis open-weights editing board ranks
  klein 9B above it.
- **Z-Image:** Turbo takes no reference images, and the edit model hasn't shipped.

Licence: klein 9B is FLUX Non-Commercial. That's accepted under L12 while the project is
personal; a commercial release regenerates with a commercial-safe model. In-game paintings
(AGT-6.4) are a separate tool: stable-diffusion.cpp running an Apache-2.0 model on the
player's machine.

Earlier klein 4B measurements: the first attempt kept the text encoder resident and took
172–216 s per sheet at 18.6 GiB (spilled). Klein 4B to Hunyuan3D-2mv on Rivallie (sheet
`c602`) gave a clean single-body quadruped in 192 s (`work/rivallie/gen3d/preview.png`).

## Findings

- **Memory.** On 16 GB, the text encoder must not stay on the GPU while denoising a
  3-megapixel sheet. `run_image.py` encodes every prompt first, drops the encoder and tiles
  the VAE decode.
- **Pose needs a pose guide.** Klein 4B ignores pose text when "otter" pulls toward the
  cartoon upright pose, and upright identity references make it worse. Every quadruped
  front view came out upright, and one candidate mixed upright and all-fours views (a hybrid
  mesh risk). A **grey clay pose guide** passed as the first reference image (`poseGuide` in
  the recipe, fixed `POSE_CLAUSE`) fixed it: all three views on all fours, design taken from
  the text. `pose-guides/quadruped.png` is a grey render of the approved Rivallie mesh's rest
  pose. Make one guide per skeleton template from a fixture or an approved mesh
  (`blender/preview.py`, then grey it and crop each view tight).
- **One guide per skeleton template (C27).** `forge.py pose-guide --template <t>` renders
  the template fixture as grey clay (`blender/pose_guide.py`, Workbench single colour,
  one shared ortho scale) and lays the views out on the concept template's canvas. The
  guides are in `art/source/style/pose-guides/` with provenance JSON. Trials (`--try`,
  board `docs/team/comms/claude/boards/2026-11-02-c27-pose-guides.png`): human 4/4 in
  A-pose front and back; shelled 4/4 on all fours (one front view at three-quarter). With
  `creature-v1`, winged hung its body vertically and turned side and back views to
  three-quarter or top-down, and mushroom-biped grew tails from the fixed tail clause.
  Two templates fix this, `creature-winged-v1` and `creature-biped-v1`: 4/4 winged level
  in flight with the back seen at eye level, and 4/4 bipeds upright with no tail (one side
  view leans three-quarter). The winged guide uses the hover clip's wings-up frame, because
  flat rest wings read as needles from the front.
- **Upright masters are poor identity references for quadrupeds.** Use the text fields and
  the pose guide; add a portrait only if identity drifts.
- **View size.** With the pose guide, views land about 620 px tall on a 2304 × 1344 sheet
  (the long side view limits the scale). `prep` warns under 1024 px, and `gen3d` still made
  a clean mesh. Raising the sheet size, or adding an upscale pass, is open.

## Approval records

`forge.py approve-record --asset ID --packet art/review/<dir>/ --scope body,clips --recorded-by "claude under directive 016" --note "..." [--decision D] [--suffix -faces]`
writes `docs/team/comms/director/approvals/<asset>--<packet dir>.md` with `packetDigest` copied from the packet's `review.json`
`sourceDigest`, so nobody retypes a digest (33 of 36 records written by hand on 2026-11-04 had a wrong tail). It records a decision
someone with authority already made (TEAM-4.1) and refuses to overwrite. Without `--asset` it checks every `director-approved`
record that has no `superseded-by`: exit 1 on a digest that no longer matches (the frames changed, PRD-9), and a count of records
whose packet has no `review.json` here. Selftest: `approval_record_selftest.py`.

## Open

- **Views at 1024 px or more** (C28).
- **Portraits (C30b, built).** `forge.py portrait --asset npc:neris [--emotions a,b] [--n 2] [--seed S]`
  upscales the neutral portrait (`exports/portraits/portrait_<kind>_<id>_128.png`) onto a flat grey
  background, passes it to klein 9B as the reference, and asks for the same character with only the
  expression changed. Each result is keyed back to alpha, aligned to the neutral's framing, and written at
  128 and 96 px, with a contact sheet and drift warnings (silhouette IoU, clothing colour). `--pick
warm=warm-4100,...` copies the kept ones to `exports/portraits/expressions/<kind>_<id>/` and logs the
  seeds in the image ledger. Trial on Neris (seeds 4100-4101, all eight, 16 candidates, 0 warnings, IoU
  0.988-0.994; board `docs/team/comms/claude/boards/2026-11-04-c30b-portrait-neris.png`): identity held in
  all 16. Limits seen: skin comes out warmer and brighter than the neutral's muted tone; thoughtful,
  concerned and sad sit close together; one curious candidate reads as fearful. Pick by eye, generate
  more seeds for the weak ones. The drift numbers do not judge the expression.
- **Item icons (C32, built).** `forge.py icon --item berries --prompt "cluster of five round red berries on a short
brown stem with two small green leaves" --ramps ember,sage,timber [--n 4] [--seed S]` has klein 9B draw the object
  on flat grey (three-quarter view, upper-left light), keys it, reduces it to a 26 px body, snaps every pixel to the
  named ramps' non-`deep` steps (OKLab nearest), cleans orphans, and adds the 1 px selective outline (`deep`, `shadow`
  on the top-lit edge; ART-5.1/5.2). Result: 32 x 32, margin at least 2, palette-locked; the contact sheet shows the
  raw render and the icon at 8x on dark and light grounds. `--pick <id>` checks it again and writes
  `art/source/ui/icons/items/<id>.png`, logging the seed in the image ledger. **Route chosen: the 2D reduction.**
  The 3D route (gen3d a prop, render the item stage's icon view) was not built: the 2D route read well enough on both
  trial items and needs one klein call (about 1 min) instead of a sheet, a model and a bake. Trials (seeds 100-103,
  200-203, 300-303, 400-403; boards `docs/team/comms/claude/boards/2026-11-04-c32-icon-*.png`): the `--ramps` list
  decides the result. Berries with `ember,sage` lose the brown stem to red and green pixels; with `ember,sage,timber`
  the stem, leaves and berries read at 1x. Flint with `basalt,glass` gets teal patches; with `basalt` alone it is a
  low-contrast grey slab with few facets. Name every material's ramp, and expect to re-seed. Not approved: B23 picks and
  the reviewer judges.
- **View upscale (C28, built).** `forge.py upscale --asset mireling [--n 2] [--seed S]` takes every reference view under
  1024 px tall, enlarges it (Lanczos, about 2.4x) onto a flat canvas in its own background colour and gives it to klein 9B
  as the only reference: redraw the same image sharper, change nothing else. One model load serves all views. Each result
  is cropped to the subject, shifted in OKLab a/b to the original's mean chroma (the model warms and reddens greens and
  greys; lightness stays), padded with its own background and compared with the original (silhouette IoU, colour drift).
  `--keep <seed>` writes the views over `art/source/references/<asset>/` and records `upscale` in `sheet.json`; the
  `sheet.png` they were cut from stays. Trial on Mireling (seeds 500, 501; board
  `docs/team/comms/claude/boards/2026-11-04-c28-upscale-mireling.png`): every view 1267-1304 px tall (from 489-493),
  silhouette IoU 0.98-0.99, colour drift 7-12 after the chroma step (13-16 before). Look: pose, plates, ferns and
  flowers hold; skin and shell stay browner than the olive-grey originals (seed 501 more so, its back legs go red),
  and fine detail (scutes, scales, claws) is added. Pick by eye. gen3d (Hunyuan3D-2mv, seed 1234, 50 steps) on Mireling's prepped views, original against seed-500 upscaled (board
  `docs/team/comms/claude/boards/2026-11-04-c28-gen3d-mireling.png`): 1.00 M against 1.02 M faces, both not watertight,
  silhouette IoU between the two meshes 0.88-0.94; the upscaled mesh has slightly crisper shell moss, fern clumps, toes and
  face, and nothing worse. Prep frames both to 1024 square, so the gain is detail, not resolution. One creature, one
  seed; the texture stage (where the colour shift would show) was not run. Second trial on Bramblefang, a wide quadruped (seeds 600, 601; board
  `docs/team/comms/claude/boards/2026-11-04-c28-upscale-bramblefang.png`): 528-545 px views became 1291-1393 px, IoU
  0.95-0.98, drift 6-13; mane, tusks, flames and fur keep their colours better than Mireling's skin did, seed 601 runs
  cooler and darker in the body. The side view's stray tail-flame fragment from the neighbouring sheet view (already in
  the original crop) is carried through; that is a `views` crop issue. **Rules:** run `--keep` only on an asset that is
  about to be re-forged, and never on a director-approved one without a new packet and a new approval (PRD-9 binds the
  approval to the packet digest). Nothing was kept over blender's references. Humans, NPCs, props and tall creatures
  are already above 1024 px; the low ones are wide quadrupeds and small creatures (Bramblefang, Mireling, Marshstalker,
  Rivallie, Zephyrit, Cindermoth).
- **Swatches (C30a, built):** `forge.py swatch`, see the tile-forge skill.
- **Shared GPU.** Every model stage runs inside `core.gpu_window`, which now serializes forge jobs: a live
  forge process holding `PAUSE` makes the next one wait (two klein jobs on 16 GB spilled to swap and took 51
  minutes to load).
- **gen3d:** Hunyuan3D-2mv stays the default. Hunyuan3D-2.1 was tried and removed:
  single-image only, so from the front it invents a spike tail, and from the side it gets the
  body right but faces sideways and drops the whiskers
  ([board](../team/comms/claude/boards/2026-11-02-gen3d-rivallie-hunyuan.png)). TRELLIS.2-4B
  was tried and removed (C31):
  - **Speed and memory:** shape only, 512 pipeline, side view, 118 s including a 38 s load,
    5.4 GiB peak (2mv takes 192 s).
  - **Shape:** from the front Rivallie is a narrow pillar instead of a round otter, and the
    surface is voxel-faceted.
  - **1024:** the cascade fails in the 1024 decode on 16 GB under WSL (`CUDA driver error:
device not ready`, twice).
  - **Board:** [2mv vs TRELLIS.2](../team/comms/claude/boards/2026-11-02-gen3d-rivallie-trellis2.png).
  - **Setup notes for a retry:**
    - o-voxel imports nvdiffrast at load;
    - transformers 5 moved DINOv3's layers, so pin 4.56.2;
    - o-voxel's unpinned git deps rebuild FlexGEMM and run out of memory at 24 GB, so use
      `--no-deps`.
