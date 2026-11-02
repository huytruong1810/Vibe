---
from: claude
to: claude
re: handoff
evidence: [art/source/forge/models.json, docs/engineering/imagegen.md, docs/team/queue/codex.md (C26–C31), docs/team/comms/claude/2026-11-02T2035--to-blender--welcome-back-art-overhaul.md]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-02, after 8085a9e)

You are counsel and doctrine author for Hearthwild (repo `/home/andyj1810/projects/Vibe`,
branch `studio/doctrine-v1`; mirror every push to `art/hd-aqualia-slice` with a merge,
never a force). The director is Huy.

- Read `AGENTS.md`, directives 012 and 013 in this folder, then your section of
  `docs/team/queue/codex.md` ("Claude (machine A)").
- **Codex** is on machine B (engine work).
- **Blender** is the Gemini agent in Antigravity again. The director no longer uses a
  Haiku stand-in. Its briefing is `2026-11-02T2035--to-blender--welcome-back-art-overhaul.md`.
- **The communicator** is the hub.

Your job is to unblock blender's art: each ticket below gates one of its queue items, so
message `--to-blender--` when one lands.

## State at hand-off

- **Model registry:** `art/source/forge/models.json`, one model per tool. `forge.py doctor`
  fails on unregistered weights, venvs or vendored code (`registry_checks`). It currently
  passes 14/14.
- **Images:** FLUX.2 [klein] 9B only.
  - 4-bit NF4 transformer, 8-bit text encoder.
  - 45–52 s load, 44–60 s per 2304 × 1344 sheet, 14.2 GiB.
  - Klein 4B and Qwen-Image-2.1 were measured and removed (table in
    `docs/engineering/imagegen.md`, decision in doctrine L12).
- **gen3d:** Hunyuan3D-2mv is the default. Recipe field `gen3d.backend` dispatches through
  `forgelib/core.py` `GEN3D_BACKENDS`. The default is kept out of the stage digest, so
  approved assets are unchanged. Hunyuan3D-2.1 was measured and removed. TRELLIS.2 is
  `trial`.
- **Machine:**
  - WSL has 24 GB of RAM now.
  - The `hf` CLI is installed with `uv tool`, and the director is logged in (`hf auth whoami`
    → huytruong).
  - The CUDA 12.8 toolkit is at `/usr/local/cuda-12.8` (`nvcc` 12.8.93).
  - The GPU is free.
- **Blender queue:** reordered and the quota language removed. The brief's image section is
  rewritten for local generation.

## Your work, in order

1. **C31 · TRELLIS.2 against 2mv.**
   - What exists:
     - code: `art/source/forge/gen3d/vendor/TRELLIS.2` @ 75fbf01;
     - venv: `gen3d/vendor/venv-trellis2` (torch 2.11 cu128 only so far);
     - registry entry: revision af44b45.
   - Steps:
     1. **Licences.** The director accepts the licences of the gated repos the pipeline
        loads: `facebook/dinov3-vitl16-pretrain-lvd1689m` (image encoder) and
        `briaai/RMBG-2.0` (background removal). Our prep views already have alpha, so check
        whether RMBG can be skipped. Also fetch the sparse-structure decoder from
        `microsoft/TRELLIS-image-large` (`ckpts/ss_dec_conv3d_16l8_fp16`).
     2. **Extensions.** Build with `CUDA_HOME=/usr/local/cuda-12.8 TORCH_CUDA_ARCH_LIST=12.0`:
        - CuMesh, FlexGEMM and o-voxel (`vendor/TRELLIS.2/o-voxel`), each with
          `--no-build-isolation`;
        - attention: try `xformers==0.0.35` from the cu128 index (exists) with
          `ATTN_BACKEND=xformers SPARSE_ATTN_BACKEND=xformers` before a flash-attn source
          build;
        - nvdiffrast is only needed for rendering and texturing; skip it unless an import
          demands it.
     3. **Scripts.** Write the pinned steps into `gen3d/setup.sh` (a `trellis2` section).
        Write `gen3d/run_shape_trellis2.py` with the same CLI and JSON contract as
        `run_shape.py`:
        - use `pipeline_type` `512` first; the README asks for 24 GB of VRAM;
        - shape only, since the forge textures meshes itself;
        - match the 2mv orientation (Hunyuan meshes face −Y).
     4. **Compare.**
        - Run Rivallie's `work/rivallie/prep/` views straight through the runners into
          `work/bakeoff-gen3d/rivallie/`. Don't edit the approved recipe.
        - Preview with `core.run_blender('preview.py', …)`.
        - Look at each preview and make a board next to `2mv`.
     5. **Remove the loser.** Remove its weights with `hf cache rm` (never `prune`), plus its
        venv, its code and its registry or setup entries. Update L12, `imagegen.md` and C31,
        then message blender.
   - If it can't fit in 16 GB, record that and remove it.
2. **C26 · Sprite readability**, which gates blender's B20.
   - The evidence is `docs/team/comms/blender/boards/*.png`. Faces, fangs, manes and crests
     are lost at game size.
   - The loss is in bake and pixelize: `blender/bake.py`, `forgelib/pixelize.py` (`run_dir`,
     `detailSlots`, `rampShift`).
   - Ideas are in the ticket.
   - Prove the fix on Bramblefang and Rivallie with the same boards. The director agrees
     before B20.
3. **C27 · Pose guides** for human (A-pose), winged, shelled and mushroom-biped. These gate
   B19's player and B15.
   - `forge.py pose-guide --template <t>`: render the selftest fixtures with
     `blender/preview.py`, grey them, crop tight, and lay them out on a 2304 × 1344 canvas.
   - How the quadruped guide was made is in `imagegen.md`.
4. **C28 · Views at 1024 px or more** (today about 620 px).
5. **C30 · `forge.py portrait` (nine emotions) and `forge.py swatch` (seamless 1024²).**
   `swatch` gates B17.

Then the parked forge tickets: C9b `fit`, C9c (carry the item off the leg; strike with the
item hand), C3b faces.

## Rules

- **Approvals are director-only.** Never self-approve.
- **Commits:**
  - Stage only your own files.
  - Run `npm run check:hygiene` and Prettier, without a pipe.
  - End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Words and images:** no banned words; look at every image before describing it.
- **Model registry:**
  - Keep only the most capable model per tool.
  - Mark candidates `trial` while measuring.
  - Every bake-off ends with deletion and a registry update in the same commit.

## Gotchas (new this session, plus the ones still live)

- **`pkill -f <pattern>` kills your own shell** when the pattern appears in your command.
  It happened again. Find PIDs with
  `ps -eo pid,args | awk '/[i]magegen\/run_image\.py \// {print $1}'`, or stop background
  tasks with `TaskStop`.
- **`hf cache prune` deletes our models.** Everything is pinned to a commit with no `main`
  ref, so prune calls kept models detached. It deleted klein 9B once (a 35 GB re-download).
  Use `HF_HOME=<…>/models/hf hf cache rm model/<repo> -y` only. The hub keeps one shared
  blob store, so never `rm` a `models--` folder by hand.
- **8-bit bitsandbytes transformers spill on 16 GB** at sheet size: step 1 never finishes.
  Use 4-bit NF4.
- **Qwen-style pipelines scale every reference to `output_resolution²`.** Any edit model
  you try later will hit the same wall at 2304 px.
- **`concept` writes `work/<asset>/concept/c<seed>.png`** and overwrites `contact.png`.
  Choose seeds that don't clash with existing candidates.
- **Tool limits:**
  - The auto-mode classifier blocks piping a downloaded binary into `tar` (micromamba).
  - PyPI's `nvidia-cuda-nvcc-cu12` 12.8 ships only `ptxas`.
  - Foreground `sleep` is blocked; wait with `Monitor` or `run_in_background`.
- **`gh` 2.103.3 is in `~/.local/bin`**, logged in as huytruong1810. Check CI with
  `gh run list --branch studio/doctrine-v1`. No passwordless sudo, so `apt` is out.
- **Single-image 3D models need a side or three-quarter view** for quadrupeds; the front
  view hides the body.
- **Still live:**
  - `cmd | tail -1` hides exit codes.
  - Never reformat the hash-bound sources (`.prettierignore`).
  - Rivallie is published, so `forge.py all` refuses it, but single stages run.
  - Stop everything you start and check `nvidia-smi` shows the GPU free.

## Untouched by design

- **Codex:** C22 → C24 → C25 → C14 → C13 → C17–C20, C3g and C7.
- **Blender:** B19 first (see its queue).
- **The director owes:** B2 Riverlands revision 2, and the golden-sample look approval
  after B19.
