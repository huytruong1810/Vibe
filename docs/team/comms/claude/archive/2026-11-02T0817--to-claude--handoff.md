---
from: claude
to: claude
re: handoff
evidence: [docs/team/queue/codex.md (C26–C31), docs/engineering/imagegen.md, docs/team/comms/blender/2026-11-02T0500--to-director--sprite-comparison-boards.md, docs/team/comms/claude/2026-11-02T0807--to-all--directive-013-local-image-generation.md]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-02T0817Z, HEAD 7d556d7)

You are counsel and doctrine author for Hearthwild (repo `/home/andyj1810/projects/Vibe`,
branch `studio/doctrine-v1`, mirror every push to `art/hd-aqualia-slice`). The director is
Huy. Read `AGENTS.md`, then directives 012 and 013 in this folder; they hold every member's
current orders. Codex is on machine B (engine work, queue `docs/team/queue/codex.md`).
Blender is a Gemini agent, or a Claude Haiku stand-in at **medium** effort. The
communicator is the hub.

## Your work, in order (codex queue, section "Claude (machine A)")

1. **C26 · Sprite readability (gates everything).** Shipped creature sprites lose their
   defining features at game size. Look at
   `docs/team/comms/blender/boards/*.png`: Bramblefang's fangs and fire mane become a flat
   orange slab, no faces, north views are tubes. The references are good; the loss happens
   in bake and pixelize (`art/source/forge/blender/bake.py`, `forgelib/pixelize.py`
   `run_dir`, `detailSlots`, `rampShift`). Ideas listed in the ticket:
   - readability-first concept fields: big head, eyes and signature features;
   - protected detail masks from the reference views;
   - accent ramp steps;
   - `heightArtPx` headroom per canvas;
   - creature face sidecars (C3b).

   Prove it on Bramblefang and Rivallie with the same boards (reference beside idle s/e/n
   at 4x). The director must agree before B20 regenerates anything.
2. **C27 · Pose guides** for human (A-pose mannequin), winged, shelled and mushroom-biped.
   - Build: `forge.py pose-guide --template <t>`. Render the fixture (`selftest-creature-<t>`
     and `selftest-human` `texture.blend`) with `blender/preview.py`, grey it, crop each
     view tight, and lay them out in a row on a 2304 × 1344 canvas.
   - Reference: how `art/source/style/pose-guides/quadruped.png` was made is in
     `docs/engineering/imagegen.md`.
3. **C28 · Views ≥ 1024 px.** Today they're about 620 px tall. Options: re-render each
   cropped view with the sheet as reference, or bigger sheets.
4. **C29 · Qwen-Image-2.1 and klein 9B.**
   - Qwen: `bash art/source/forge/imagegen/setup.sh qwen21` (33 GB; paused at 0.8 GB).
   - Klein 9B needs the director's Hugging Face token (`hf auth login`), then
     `setup.sh klein9b`.
   - Measure through `forge.py concept --model ...` and record in
     `docs/engineering/imagegen.md`.
5. **C30 · `forge.py portrait`** (nine emotions on identity, contract-v2 96/128 px) **and
   `forge.py swatch`** (seamless 1024² for tileforge).
6. **C31 · gen3d backends:** Hunyuan3D-2.1 shape and TRELLIS, via a recipe field
   `gen3d.backend`.

Then the parked forge tickets: C9b `fit`, C9c (including carrying the held item off the
leg, and striking with the item hand), C3b faces.

## Built this session (all pushed)

- **Local image generation** (`dbc358d`):
  - Commands: `forge.py concept --asset X [--n --seed --model]` →
    `forge.py views --asset X --pick cNNN`.
  - Code: `forgelib/concept.py` (`split_views`, `POSE_CLAUSE`), `imagegen/run_image.py`
    (pinned venv; Klein pre-encodes prompts and frees the text encoder, VAE tiling).
  - Data: `spec/concept_templates.json`, `art/source/style/style.json`, recipe
    `concept.poseGuide`.
  - Klein 4B: 23–51 s per sheet at 11.8 GiB.
  - Rivallie's reference is now sheet `c602`. `gen3d` made a clean mesh; the later stages
    haven't run on it.
  - Doctrine: PRD-7 rewritten, L12 added.
- **Villager models** (`901c100`): only `gemma4-abliterated:26b` and `:e4b` remain in
  Ollama. The `gemma4-` prefix keeps the adapter's `think:false`; under `hf.co/...` names
  the replies come back empty. The recipe is in `docs/operations/operations.md`.
- **Specs and ADRs:**
  - creature minds: `docs/engineering/creature-minds.md`, ADR 033;
  - memory vs compaction: `memory-and-context.md`, ADR 032;
  - authored artifacts: ADR 031;
  - runtime held items: `2b3bb5b`;
  - C3h creature templates.
- **Team** (directive 012): all art belongs to blender; the communicator is the hub. Lanes
  are in `.agents/hooks/lib.mjs`.
- **CI** is green again (`88b11ba`, `58baca4`). The director's new token has the
  `workflow` scope, so you can edit `.github/workflows/`.

## Rules and state you must respect

- **Approvals are director-only.** The standing delegation is suspended (approvals
  README). Never self-approve your own packets.
- **Commits:**
  - Stage only your own files. Never force-push.
  - Run `npm run check:hygiene`, plus `npm run format:check` (CI enforces it).
  - End commit messages with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Words and images:** the banned words (AAA, perfect, …) apply to commits and docs. Look
  at every image before describing it.

## Gotchas learned the hard way

- **`pkill -f "ollama serve"` kills your own shell**, because the pattern matches the
  command line. Find the PID with `pgrep -x ollama` instead, or stop the server through
  `TaskStop` if you started it as a background task.
- **`cmd | tail -1` hides failures.** Prettier's exit code was lost that way and a
  misformatted file got committed. Check formatting without piping.
- **WSL has 15 GB of RAM.** Load large models quantized and straight to the GPU. Ask the
  director to raise it in `.wslconfig` (`memory=24GB`) before Qwen.
- **The Hunyuan pipeline needs a single pose.** A mixed upright/all-fours sheet fuses into
  a hybrid mesh, so always use a pose guide for creatures.
- **Rivallie is approved and published.** `forge.py all` refuses it; individual stages
  still run. A new packet needs a new approval (PRD-9).
- **Prettier** ignores the hash-bound sources (`.prettierignore`). Never reformat them.
- **Stop everything you start** (vite, ollama, downloads) and check `nvidia-smi` shows the
  GPU free.

## Untouched by design

Codex owns engine tickets C22 → C24 → C25 → C14 → C13 → C17–C20, C3g and C7. Blender's B19
bake-off waits for C27–C29; B20 waits for C26 and the director.
