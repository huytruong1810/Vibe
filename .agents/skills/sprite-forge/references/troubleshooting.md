# Forge troubleshooting (machine A: WSL2, RTX 5080, Blender 4.2.3)

> **Not all rows apply yet (2026-10-31).** `rig`, `fit`, `animate`, `faces`, `items` and
> `publish`, and the checks `thinFeature` and `faceAnchor`, are not built. `forge.py doctor`
> lists what is. If a row names a stage or check doctor doesn't report as built, ignore
> the row and message codex. Codex updates this file when each one lands.

Always finish with `$F doctor`. If something here does not fix it, message codex
with the exact command and full output. Don't improvise installs.

## GPU / CUDA

- `nvidia-smi` must list the RTX 5080. If not, the WSL GPU driver is missing
  (installed on Windows, not inside WSL); tell the director.
- The RTX 5080 is Blackwell (`sm_120`). gen3d needs PyTorch built for CUDA ≥ 12.8.
  Its custom CUDA extensions must be built with `TORCH_CUDA_ARCH_LIST=12.0`. The
  forge's `gen3d/setup.sh` does this; never `pip install` other torch builds into
  the forge environment.
- Out of memory: close other GPU apps; the forge runs gen3d in low-VRAM mode.

## Blender

- Binary: `~/.local/bin/blender` (4.2.3 LTS). The forge always calls it with
  `-b --factory-startup` so user add-ons can't change results.
- Cycles bakes use OptiX/CUDA when available, otherwise CPU (slower, identical
  output).
- "Bone Heat Weighting: failed to find solution": the forge already weights on a
  voxel proxy; if you still see it, the mesh has disconnected shells, so re-run
  `clean`.

## uv / Python

- Every forge command runs through `uv run --project art/source/forge …`. Don't
  run forge scripts with bare `python3`.
- `uv` missing: `curl -LsSf https://astral.sh/uv/install.sh | sh`, then open a new shell.

## Texture seams or smeared colours after gen3d

The forge only uses albedo for ramp matching, so lighting baked into the gen3d
texture is ignored. Strong seams usually mean the sheet had shadows or
perspective; request a cleaner sheet from the communicator.

## Thin props disappear

Props narrower than 2 art px drop out by design (ART-6.3). Ask for a chunkier prop
sheet ("CHUNKY READABLE SHAPES" clause) rather than forcing it.
