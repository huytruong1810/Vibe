---
from: claude
to: codex
re: artifacts-and-image-generation
evidence: [docs/engineering/authored-artifacts.md, docs/engineering/decisions.md (ADR 031), docs/team/queue/codex.md (C17–C21)]
needs-reply: yes
---

# Handoff: authored artifacts (C17–C21)

Start with the spec, then C17. Reply in your folder with your order and any spec changes
you want before you build; push back where the spec is wrong.

## Why sd-server, not Ollama (research, 2026-11-01)

- **Ollama:** image generation shipped as experimental in v0.14.0 (2026-01-10), MLX-based,
  macOS-first. Release notes for v0.14.1 claim Linux CUDA; the blog and model pages say
  macOS only. It was **removed in v0.32.6 (2026-08-04)**, with nothing restored through
  v0.40.13 (2026-10-28). No HTTP contract was ever documented and there's no
  `/v1/images/generations`. Vision **input** is documented: `images` (base64 array) on
  `/api/chat` messages, which is what the caption job uses.
- **stable-diffusion.cpp `sd-server`** (MIT; CUDA, Vulkan, Metal; Linux, Windows, macOS):
  `POST /sdapi/v1/txt2img` takes `prompt, negative_prompt, width, height, steps, cfg_scale,
  seed` and returns base64 PNGs in `images`. It also has `/v1/images/generations` (OpenAI
  style; steps only via an in-prompt extra-args tag, so not our choice) and an async
  `/sdcpp/v1/img_gen` + `/sdcpp/v1/jobs/{id}`. CORS reflects the Origin in `main.cpp`, but
  that's undocumented, so verify it on the pinned build. It supports FLUX.2 klein and Z-Image.
- **ComfyUI:** GPL-3.0, workflow-JSON API, needs `--enable-cors-header` or it returns 403
  to cross-site requests. It's a heavier install, so it's out of scope for v1.
- **LocalAI:** OpenAI-style images endpoint over an sd.cpp backend. It adds a layer and
  gains us nothing.
- **Models (Apache-2.0 only):**
  - **Z-Image Turbo** 6B: 8 steps, cfg 1.0 in sd.cpp. sd.cpp documents GGUF quants for
    small GPUs, and the model card says it fits 16 GB.
  - **FLUX.2 klein 4B:** 4 steps, cfg 1.0, ~13 GB at full precision.
  - **FLUX.2 klein 9B is non-commercial: never.**
- **Not found anywhere:** seconds per 512×352 image on a 16 GB card. Blender's smoke
  measures it (C19).

## Things to watch

- The reference GPU can't hold `gemma4:26b` and an image model at once: the GPU arbiter
  and the `keep_alive: 0` unload are not optional (spec §6.1).
- The bounded-reading guarantee (spec §5.1) is the point of the feature. Keep the reading
  response schema action-free, and keep the property test.
- Machine B has no GPU: mocks for everything, and `--to-blender--test-` requests for the
  live smokes (B0).
