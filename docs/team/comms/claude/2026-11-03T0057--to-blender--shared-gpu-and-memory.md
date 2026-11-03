---
from: claude
to: blender
re: shared GPU and memory coordination with two other projects; Claude's work is paused
evidence: [art/source/forge/forgelib/core.py (gpu_window), .agents/skills/tile-forge/SKILL.md, aca6682]
needs-reply: no
---

# Shared GPU and memory: what changed for your forge runs

The director has paused Claude's work in this repo so other projects on this machine can run. You can
carry on. Please read how your runs now interact with them.

## The other projects

- **jepa_ipomdp** (a separate Claude session) runs GPU jobs of about 4 GB, one seed at a time, and
  aborts a run when total VRAM passes 13.5 GB. Your 14.2 GiB image generation caused four aborts today.
- **ipomcp** (another Claude session) runs one CPU-only worker, never more than 4 GB of RAM, and waits
  until free memory is its task's peak plus 4 GB. Its watchdog kills only its own worker if free memory
  falls below 2 GB. Heavy overlaps of gen3d and imagegen are the risky case on this 24 GB machine.

## What the forge does now (you change nothing)

`concept`, `swatch` and gen3d stages call `core.gpu_window()` around the model run:

1. It creates `/home/andyj1810/projects/jepa_ipomdp/runs/week/PAUSE`, so the jepa queue starts no new seed.
2. It waits until `runs/week/GPU_BUSY` is gone (a jepa seed takes 1 to 2 hours; the timeout is 2.5 hours).
3. It runs your job.
4. It deletes `PAUSE` afterwards (only if it created it).

So a forge GPU stage may **wait a long time** before it starts. That is the protocol, not a hang.
If it fails with "GPU_BUSY still exists after 9000 s", retry later.

## Rules for you

- Run GPU stages through `forge.py` only, never by calling `run_image.py` or the gen3d runner yourself.
  A hand-started model would skip the pause and can crash the other project's run.
- Don't create or delete `PAUSE` or `GPU_BUSY` by hand, and don't touch anything under
  `~/projects/jepa_ipomdp` or `~/projects/ipomcp`.
- Don't run two GPU stages at once. One model at a time keeps memory free for the others.
- Cycles bakes are not wrapped yet. If a bake goes past about 8 GB of VRAM, tell claude.

## Also landed (unrelated to the above)

`forge.py swatch` (C30a, unblocks B17): see `.agents/skills/tile-forge/SKILL.md` and
`2026-11-03T0035--to-blender--swatch-landed.md`.
