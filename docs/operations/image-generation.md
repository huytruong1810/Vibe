# Local painting generation (C19)

## Status and scope

Machine-B validation uses mocked HTTP and a synthetic PNG. No real image model or
GPU acceptance was run there. Machine-A VRAM and the AGT-7 30-second player budget
(unload, generation, palette preview and subsequent LLM reload) remain unmeasured.
See [receipts and gaps](../team/comms/codex/c19-validation.json).

Settings → Paintings accepts an empty endpoint, sd-server, or the unavailable
Ollama image stub. An empty endpoint disables new generation; existing artifacts
remain usable. Test discovers the loaded model without generating an image.
Apply saves browser-local connection preferences separately from world saves.
The endpoint must be an exact loopback origin with no credentials, path or query.
ComfyUI and pixel editing are outside C19.

## Pinned server and models

Use [stable-diffusion.cpp master-1047-984eb06](https://github.com/leejet/stable-diffusion.cpp/releases/tag/master-1047-984eb06),
commit `984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82`, published November 3, 2026.
The [pinned build guide](https://github.com/leejet/stable-diffusion.cpp/blob/984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82/docs/build.md)
documents CUDA, Vulkan and Metal builds. Recheck compatibility before upgrading.

Windows NVIDIA: extract `sd-master-984eb06-bin-win-cuda12-x64.zip` from that release.
Its published SHA256 is
`d21008534fd7ec8d4bb0bde78c728530a819a510654ba9c04bd279dab40ac8ab`.
Check with `Get-FileHash -Algorithm SHA256`. Use the archive's CUDA/runtime
dependencies and a compatible NVIDIA driver. Locate `sd-server.exe` in the
extracted directory; the command below assumes the working directory contains it.
No binaries or model weights belong in this repository.

Linux CUDA source build, with Git, CMake, a C++ compiler and CUDA toolkit installed:

```sh
git clone --recursive https://github.com/leejet/stable-diffusion.cpp
cd stable-diffusion.cpp
git checkout 984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82
git submodule update --init --recursive
cmake -S . -B build -DSD_CUDA=ON
cmake --build build --config Release -j 4
```

Download these Apache-2.0 components to a separate model directory:

| Component               | Filename                  | Source                                                                                                                                                                       |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Z-Image Turbo diffusion | `z_image_turbo-Q4_K.gguf` | [GGUF publisher](https://huggingface.co/leejet/Z-Image-Turbo-GGUF), [original model/license](https://huggingface.co/Tongyi-MAI/Z-Image-Turbo)                                |
| Qwen3-4B text encoder   | `qwen_3_4b.safetensors`   | [split components and license](https://huggingface.co/Comfy-Org/z_image_turbo/tree/main/split_files/text_encoders), [original encoder](https://huggingface.co/Qwen/Qwen3-4B) |
| Autoencoder             | `ae.safetensors`          | [split VAE and license](https://huggingface.co/Comfy-Org/z_image_turbo/tree/main/split_files/vae)                                                                            |

The [pinned Z-Image instructions](https://github.com/leejet/stable-diffusion.cpp/blob/984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82/docs/z_image.md)
specify these component families. Record downloaded file hashes in the smoke
receipt; filenames alone do not identify weights. The allowed alternative is
[FLUX.2 klein 4B, Apache-2.0](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B).
Its encoder/VAE must follow its own upstream recipe; do not substitute the Z-Image
components. Klein 9B and non-commercial weights are excluded by AGT-6.4.

## Launch and browser test

These flags are checked against the pinned server documentation. They have not
been executed against a real GPU on machine B. Windows PowerShell:

```powershell
.\sd-server.exe --listen-ip 127.0.0.1 --listen-port 8080 --diffusion-model C:\models\z_image_turbo-Q4_K.gguf --llm C:\models\qwen_3_4b.safetensors --vae C:\models\ae.safetensors --offload-to-cpu --cfg-scale 1.0
```

Linux, from the source checkout (replace model paths):

```sh
./build/bin/sd-server --listen-ip 127.0.0.1 --listen-port 8080 --diffusion-model /data/models/z_image_turbo-Q4_K.gguf --llm /data/models/qwen_3_4b.safetensors --vae /data/models/ae.safetensors --offload-to-cpu --cfg-scale 1.0
```

The server's [launch guide](https://github.com/leejet/stable-diffusion.cpp/blob/984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82/examples/server/README.md)
describes CPU offloading and command-line model preloading. Start with 512×352,
8 steps and CFG1; these are functional defaults, not a demonstrated quality or
latency result. CPU offloading trades RAM and transfers for VRAM; measure the
reference machine before choosing a tier.

Set Image endpoint to `http://127.0.0.1:8080`, select sd-server, and click Test.
Keep “Unload the villagers’ model while painting” enabled unless measured VRAM
supports concurrent residency. The arbiter serializes generation with chat,
unloads the configured GPU dialogue/background models, and lets the next chat
reload naturally. CPU background jobs do not require unloading.

The probe uses `GET /sdapi/v1/sd-models`; the scoped SDAPI adapter supports
`POST /sdapi/v1/txt2img`. Managed painting jobs use the pinned native async API
for actual cancellation. This engineering extension preserves the provider ID,
loopback boundary and artifact schema. See
[native job API](https://github.com/leejet/stable-diffusion.cpp/blob/984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82/examples/server/api.md#sdcpp-api).
Cancel retains the scheduler lease until a terminal state is acknowledged. An
unacknowledged stop suspends chat dispatch and rejects queued images; stop/restart
sd-server before reconnecting local AI. Fetch abort is insufficient GPU evidence.
Generation has a 90-second deadline plus bounded cancellation cleanup. JSON responses
are capped at 8 MiB; decoded PNG dimensions are capped at 2048×2048 before allocation.

Pinned [CORS implementation](https://github.com/leejet/stable-diffusion.cpp/blob/984eb0686cbf5b7fc4f0063d9e0b1fb38d5c4f82/examples/server/main.cpp)
reflects the Origin and handles OPTIONS. Check it from the page's actual origin:

```sh
curl -i -X OPTIONS http://127.0.0.1:8080/sdcpp/v1/img_gen -H 'Origin: http://127.0.0.1:5173' -H 'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers: content-type'
```

Expect 204 and matching Access-Control-Allow-Origin. Browser local-network
permission is separate; allow this page to reach local services. Keep the server
bound to 127.0.0.1. No proxy is shipped because the pinned implementation supports
CORS; do not weaken browser protections to diagnose another build.

## Machine-A acceptance and troubleshooting

Run `npm run test:ollama -- --painting` on machine A after loading the reference
LLM and image server. `IMAGE_ENDPOINT`, `OLLAMA_URL`, `OLLAMA_MODEL` and
`OLLAMA_SMOKE_DIR` select loopback services, model and receipt directory. Record
`nvidia-smi` before/during/after, server version, model hashes and flags. Inspect
every raw/native/4x image before reporting. The smoke records unload, generation,
quantization and reload separately; its Node decode is functional evidence, while
the browser worker/preview path must also meet 30 seconds on the reference machine.

- Connection refused: confirm the bind address/port and loaded model before Test.
- CORS/local-network denial: check OPTIONS above and browser site permissions.
- No loaded model: check component paths and server startup output.
- Out of VRAM: keep unload and offload enabled; record peak allocation, reduce the
  supported model tier and rerun. Do not count a timeout as a pass.
- Cancellation recovery: stop/restart the server, then reconnect the game. Do not
  launch another model while the previous server's GPU state is unknown.
- Palette output: transparent pixels composite onto palette `cream.mid`; exact
  area filtering in linear light precedes OKLab nearest colours and 16-colour
  reduction. Outline steps are excluded; no dithering. Preparation cost is included
  in the mocked pipeline receipt, separate from the quantizer's measured work.

Paint/Keep/Hang workflows and their reference-machine overnight smoke are C20.

C20 world requests survive save/reload. The browser stores the last native job
endpoint/ID separately from world saves and cancels/polls it before submitting a
replacement. If the server cannot acknowledge terminal state, stop/restart it,
then use **Server restarted � reset painting recovery** in Settings. That control
is an explicit operator acknowledgement, not a retry of unknown GPU work. Use one
active game tab for local LLM/image work; Web Locks serialize native image flights,
while LLM scheduling is per game instance.

Player canvas: use a blank canvas or an easel, enter1�240 characters, choose mood
and composition, then Generate. Keep seals the palette result; Retry returns the
canvas and allocates a new identity/seed. Cancel/Discard retain the same carried
canvas instance. Existing paintings remain usable with an empty image endpoint.
NPC requests use shared rules,3�160 characters, memory grounding and home-hook
capacity. The unsealed home reservation stays covered until HANG_PAINTING at home.
Rates derive from retained authored records: artists1/day, other villagers1/7days.
A finished painting stores its caption once; subsequent prompts use caption text.
The caption worker encodes192�128 nearest PNGs; actual model image-token cost and
reference-machine latency/VRAM remain acceptance measurements, not mocked claims.
