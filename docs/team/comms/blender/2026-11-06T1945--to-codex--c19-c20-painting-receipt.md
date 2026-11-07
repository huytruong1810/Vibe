---
from: blender
to: codex
re: c19-c20-painting-receipt
evidence: [docs/team/comms/blender/tmp/c19/painting-smoke.json, docs/team/comms/blender/tmp/c19/painting-raw.png, docs/team/comms/blender/tmp/c19/painting-native.png, docs/team/comms/blender/tmp/c19/painting-preview.png]
needs-reply: no
---

Executed the live Machine-A GPU painting generation smoke test under standing ticket `B0` per `test-c19-painting.md` and `docs/operations/image-generation.md`.

## 1. Pinned Environment & Weights Provenance

- **Server Release**: `stable-diffusion.cpp master-1047-984eb06` (commit `984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82`), built natively on Machine A with CUDA 12.8 targeting Blackwell architecture (`120a-real`).
- **Server Flags**:
  ```sh
  ./build/bin/sd-server --listen-ip 127.0.0.1 --listen-port 8080 \
    --diffusion-model ~/.models/z-image/z_image_turbo-Q4_K.gguf \
    --llm ~/.models/z-image/qwen_3_4b.safetensors \
    --vae ~/.models/z-image/ae.safetensors \
    --offload-to-cpu --cfg-scale 1.0
  ```
- **Model Checksums (SHA256)**:
  - `ae.safetensors`: `afc8e28272cd15db3919bacdb6918ce9c1ed22e96cb12c4d5ed0fba823529e38`
  - `qwen_3_4b.safetensors`: `6c671498573ac2f7a5501502ccce8d2b08ea6ca2f661c458e708f36b36edfc5a`
  - `z_image_turbo-Q4_K.gguf`: `14b375ab4f226bc5378f68f37e899ef3c2242b8541e61e2bc1aff40976086fbd`
- **CORS Verification**:
  `OPTIONS /sdcpp/v1/img_gen` from origin `http://127.0.0.1:5173` returned HTTP `204 No Content` with `Access-Control-Allow-Origin: http://127.0.0.1:5173`.
  `GET /sdapi/v1/sd-models` returned `[{"model_name":"z_image_turbo-Q4_K",...}]`.

## 2. Quantitative Receipts & Latency Breakdown

Command executed:
```sh
OLLAMA_SMOKE_DIR=docs/team/comms/blender/tmp/c19 \
IMAGE_ENDPOINT=http://127.0.0.1:8080 \
OLLAMA_MODEL=gemma4-abliterated:26b \
npm run test:ollama -- --painting
```

- **Transport Result**: `transportPassed: true`
- **30-Second Budget Gate (`AGT-7`)**: `within30Seconds: false` (exceeded; total: 121,384.7 ms)
- **Detailed Timings**:
  - `unloadMs`: **67.9 ms** (Ollama API successfully unloads dialogue model from VRAM)
  - `generationMs`: **50,758.1 ms** (Text condition encoding: 30.73 s, Euler 8-step sampling: 18.74 s @ 6.23 it/s, VAE latent decode: 0.63 s)
  - `nodeDecodeMs`: **44.1 ms**
  - `coldNodeQuantizeMs`: **23.6 ms** (Linear light area + OKLab nearest 16-color reduction)
  - `reloadMs`: **70,481.9 ms** (Reloading `gemma4-abliterated:26b` after image generation)
  - `pipelineIncludingReloadMs`: **121,384.7 ms** (~121.4 s)
- **VRAM Utilization Profile**:
  - Baseline (idle): 0 MiB / 16,303 MiB
  - During `sd-server` text conditioning & diffusion: 7,682 MiB / 16,303 MiB
  - During `26b` reload capability check: peak reached 14,703 MiB / 16,303 MiB

## 3. Visual Inspections (PRD-5)

Inspected all emitted images in `docs/team/comms/blender/tmp/c19/`:
1. `painting-raw.png` (512×352, SHA256: `b4d06ed4...`):
   - Landscape composition of a quiet wetland ferry among reeds at dusk.
   - Foreground is composed of dense dry tawny reed banks occupying bottom 45% of frame.
   - Pale blue/grey ferry vessel sits on horizon among reeds with wheelhouse and antenna superstructure.
   - Dusky lavender-grey gradient sky.
   - Zero text, logos, or human characters present.
2. `painting-native.png` (48×32 art pixels, SHA256: `f4cf5dec...`):
   - Quantized into exactly 16 palette colors: `#191928`, `#786f86`, `#bcb1c1`, `#d4baa8`, `#4e515a`, `#82858f`, `#b5b9c6`, `#432622`, `#c6bfcb`, `#9b9ea9`, `#482826`, `#3b404a`, `#646670`, `#8f8b85`, `#b3afa7`, `#9295a0`.
   - Dark reddish brown and ink shadow reed base (`#432622`, `#191928`).
   - Ferry silhouette reads as a compact 7×3 cluster of slate pixels (`#4e515a`, `#646670`) with a single cream highlight pixel (`#d4baa8`).
   - Clean, ditherless stepped lavender sky bands.
3. `painting-preview.png` (192×128, 4× nearest scale, SHA256: `2a8a6b04...`):
   - Confirms crisp nearest-neighbor scaling with zero blurring across the 48×32 canvas grid.

## 4. Key Gaps & Observations

1. **30-Second Player Budget**:
   - Both image generation (50.8 s) and 26B model reload (70.5 s) individually exceed the 30-second budget.
   - With CPU offload enabled, transferring weights to/from system RAM and running Qwen3-4B text conditioning accounts for over 30 s of the generation time.
2. **GPU Concurrency**:
   - The RTX 5080 Laptop GPU (16 GiB VRAM) cannot concurrently hold `gemma4-abliterated:26b` (~14.4 GiB) and `sd-server` (~7.7 GiB). Sequential unload-generate-reload is strictly necessary.
3. **Daemons Teardown**:
   - `sd-server` and `ollama serve` terminated cleanly; `nvidia-smi` confirms 0 active compute processes and 0 MiB allocated.
