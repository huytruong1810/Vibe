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

## Measured on machine A (RTX 5080 Laptop, 16 GB VRAM, WSL with 15 GB RAM)

| Model                      | Setting                                                       | Load    | Per 2304 × 1344 sheet | Peak VRAM                          |
| -------------------------- | ------------------------------------------------------------- | ------- | --------------------- | ---------------------------------- |
| FLUX.2 [klein] 4B, 4 steps | text encoder 8-bit kept resident (first attempt)              | 26 s    | 172–216 s             | 18.6 GiB: spilled to system memory |
| same                       | prompts pre-encoded, text encoder freed, VAE tiling (current) | 22–34 s | 23–51 s               | 11.8 GiB                           |

Klein 4B to Hunyuan3D-2mv (Rivallie, sheet `c602`): `gen3d` took 192 s for a clean
single-body quadruped (`work/rivallie/gen3d/preview.png`).

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
- **Upright masters are poor identity references for quadrupeds.** Use the text fields and
  the pose guide; add a portrait only if identity drifts.
- **View size.** With the pose guide, views land about 620 px tall on a 2304 × 1344 sheet
  (the long side view limits the scale). `prep` warns under 1024 px, and `gen3d` still made
  a clean mesh. Raising the sheet size, or adding an upscale pass, is open.

## Open (bake-off, B19)

- **Qwen-Image-2.1.** `setup.sh qwen21`, about 33 GB; the download was paused at about
  0.8 GB to make room for the villager models. It needs 4-bit text encoder and 8-bit
  transformer loading on 16 GB, which isn't measured yet.
- **FLUX.2 [klein] 9B.** Gated: run `hf auth login` (a Hugging Face token) first, then
  `setup.sh klein9b`.
- **More pose guides:** humans (A-pose mannequin), winged, shelled and biped.
- **Not built yet:** `portrait` (9 emotions by reference editing) and `swatch` (seamless
  tileforge swatches). The extra 3D backends (Hunyuan3D-2.1 shape, TRELLIS) are also still
  to come. They are tracked in directive 013 and blender B19.
