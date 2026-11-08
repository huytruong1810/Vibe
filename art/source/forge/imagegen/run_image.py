"""imagegen: batch local image generation for reference art (PRD-3, PRD-7, PRD-8).

  python run_image.py <job.json>
job: {"model": "z-image",
      "outDir": "<dir>", "width": 1024, "height": 1024, "steps": null, "guidance": null,
      "items": [{"id": "c0", "prompt": "...", "negative": "", "seed": 7,
                 "references": ["<png>", ...]}]}
Supports local Z-Image Turbo via sd-server (CUDA quantized Apache-2.0 model) and
FLUX.2-klein-9B via Diffusers fallback. Exits and frees the GPU completely when done.
"""
from __future__ import annotations

import base64
import gc
import inspect
import io
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
os.environ.setdefault("HF_HOME", str(HERE / "models" / "hf"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")

MODELS_SPEC = {
    "z-image": {
        "repo": "Tongyi-MAAS/Z-Image-Turbo",
        "rev": "local-q4k",
        "pipeline": "SdServerPipeline",
        "steps": 8,
        "guidance": 1.0,
        "licence": "Apache-2.0",
        "sdServerBin": str(Path.home() / ".local/src/stable-diffusion.cpp/build/bin/sd-server"),
        "diffusionModel": str(Path.home() / ".models/z-image/z_image_turbo-Q4_K.gguf"),
        "llmModel": str(Path.home() / ".models/z-image/qwen_3_4b.safetensors"),
        "vaeModel": str(Path.home() / ".models/z-image/ae.safetensors"),
        "port": 8080,
    },
    "klein9b": {
        "repo": "black-forest-labs/FLUX.2-klein-9B",
        "rev": "92196c8e11f7b6cf2b7493e037d8c5345c559216",
        "pipeline": "Flux2KleinPipeline",
        "quant": {"text_encoder": "8bit", "transformer": "4bit"},
        "steps": 4,
        "guidance": 1.0,
        "licence": "FLUX Non-Commercial v2.1",
    },
}


def _get_gpu_mem_used_gib() -> float:
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            text=True,
            timeout=3,
        )
        return round(float(out.strip().splitlines()[0]) / 1024.0, 2)
    except Exception:
        return 0.0


def _is_server_listening(port: int) -> bool:
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/")
        with urllib.request.urlopen(req, timeout=1.0) as resp:
            return resp.status in (200, 404, 405)
    except Exception:
        return False


def _run_z_image(job: dict, spec: dict, out: Path) -> int:
    port = int(spec.get("port", 8080))
    proc = None
    t0 = time.time()
    if not _is_server_listening(port):
        server_bin = spec["sdServerBin"]
        if not Path(server_bin).exists():
            raise SystemExit(f"sd-server binary not found at: {server_bin}")
        cmd = [
            server_bin,
            "--diffusion-model", spec["diffusionModel"],
            "--llm", spec["llmModel"],
            "--vae", spec["vaeModel"],
            "--flash-attn", "off",
            "--cfg-scale", "1.0",
            "--steps", str(job.get("steps") or spec["steps"]),
            "--sampling-method", "euler",
            "--listen-port", str(port),
            "-l", "127.0.0.1",
        ]
        proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.time() + 60.0
        while time.time() < deadline:
            if _is_server_listening(port):
                break
            time.sleep(0.5)
        else:
            if proc:
                proc.terminate()
            raise SystemExit(f"sd-server failed to start on port {port} within 60s")

    load_s = round(time.time() - t0, 1)
    results = []
    width = int(job.get("width", 1024))
    height = int(job.get("height", 1024))
    steps = int(job.get("steps") or spec["steps"])
    guidance = float(job.get("guidance") or spec["guidance"])

    try:
        for item in job["items"]:
            t_item = time.time()
            prompt = item["prompt"]
            negative = item.get("negative", "")
            seed = int(item["seed"])
            refs = [p for p in item.get("references", []) if Path(p).is_file()]

            endpoint = "txt2img"
            payload: dict = {
                "prompt": prompt,
                "negative_prompt": negative,
                "steps": steps,
                "cfg_scale": guidance,
                "seed": seed,
                "width": width,
                "height": height,
                "sampler_name": "euler",
            }

            if refs:
                endpoint = "img2img"
                primary = Image.open(refs[0]).convert("RGB")
                if primary.size != (width, height):
                    # Resize while preserving aspect ratio and letterbox on neutral grey/white
                    primary = primary.resize((width, height), Image.Resampling.LANCZOS)
                buf = io.BytesIO()
                primary.save(buf, format="PNG")
                b64_ref = base64.b64encode(buf.getvalue()).decode("ascii")
                payload["init_images"] = [f"data:image/png;base64,{b64_ref}"]
                payload["denoising_strength"] = float(item.get("denoising", 0.78))

            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                f"http://127.0.0.1:{port}/sdapi/v1/{endpoint}",
                data=req_data,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            images = data.get("images", [])
            if not images:
                raise SystemExit(f"sd-server returned no images for item {item['id']}")

            img_b64 = images[0]
            if "," in img_b64:
                img_b64 = img_b64.split(",", 1)[1]
            img_bytes = base64.b64decode(img_b64)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
            path = out / f"{item['id']}.png"
            img.save(path)

            elapsed = round(time.time() - t_item, 1)
            results.append({
                "id": item["id"],
                "file": str(path),
                "seed": seed,
                "seconds": elapsed,
                "references": item.get("references", []),
                "prompt": prompt,
            })
    finally:
        if proc is not None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()

    peak_vram = _get_gpu_mem_used_gib()
    print("IMAGEGEN", json.dumps({
        "model": "z-image",
        "repo": spec["repo"],
        "revision": spec["rev"],
        "licence": spec["licence"],
        "loadSeconds": load_s,
        "peakVramGiB": peak_vram,
        "items": results,
    }))
    return 0


def _run_diffusers(job: dict, spec: dict, out: Path) -> int:
    import torch
    import diffusers
    from diffusers import BitsAndBytesConfig as DiffusersBnb
    from diffusers.quantizers import PipelineQuantizationConfig
    from transformers import BitsAndBytesConfig as TransformersBnb

    torch.cuda.reset_peak_memory_stats()
    t0 = time.time()
    cls = getattr(diffusers, spec["pipeline"])
    per_component = {}
    for component, mode in spec.get("quant", {}).items():
        bnb = TransformersBnb if component == "text_encoder" else DiffusersBnb
        kw = (
            {"load_in_4bit": True, "bnb_4bit_quant_type": "nf4", "bnb_4bit_compute_dtype": torch.bfloat16}
            if mode == "4bit" else {"load_in_8bit": True}
        )
        per_component[component] = bnb(**kw)
    pipe = cls.from_pretrained(
        spec["repo"],
        revision=spec["rev"],
        torch_dtype=torch.bfloat16,
        quantization_config=PipelineQuantizationConfig(quant_mapping=per_component),
        low_cpu_mem_usage=True,
    )
    for component in ("transformer", "text_encoder", "vae"):
        module = getattr(pipe, component, None)
        if module is not None and component not in spec.get("quant", {}):
            module.to("cuda")
    load_s = round(time.time() - t0, 1)

    params = inspect.signature(pipe.__call__).parameters
    if getattr(pipe, "vae", None) is not None and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()

    embeds = {}
    if spec["pipeline"] == "Flux2KleinPipeline":
        with torch.no_grad():
            for item in job["items"]:
                embeds[item["id"]] = pipe.encode_prompt(prompt=item["prompt"], device="cuda")[0]
        pipe.text_encoder = None
        gc.collect()
        torch.cuda.empty_cache()

    results = []
    for item in job["items"]:
        kw = {
            "prompt": item["prompt"],
            "width": job.get("width", 1024),
            "height": job.get("height", 1024),
            "generator": torch.Generator("cuda").manual_seed(int(item["seed"])),
        }
        steps = job.get("steps") or spec["steps"]
        guidance = job.get("guidance") or spec["guidance"]
        if steps:
            kw["num_inference_steps"] = steps
        if guidance is not None and "guidance_scale" in params:
            kw["guidance_scale"] = guidance
        if item.get("negative") and "negative_prompt" in params and (guidance or 1.0) > 1.0:
            kw["negative_prompt"] = item["negative"]
        if item["id"] in embeds:
            kw["prompt"], kw["prompt_embeds"] = None, embeds[item["id"]]
        refs = [Image.open(p).convert("RGB") for p in item.get("references", [])]
        if refs:
            if "image" not in params:
                raise SystemExit(f"{job['model']} does not take reference images")
            kw["image"] = refs if len(refs) > 1 else refs[0]
        t = time.time()
        image = pipe(**kw).images[0]
        path = out / f"{item['id']}.png"
        image.save(path)
        results.append({
            "id": item["id"],
            "file": str(path),
            "seed": item["seed"],
            "seconds": round(time.time() - t, 1),
            "references": item.get("references", []),
            "prompt": item["prompt"],
        })
    print("IMAGEGEN", json.dumps({
        "model": job["model"],
        "repo": spec["repo"],
        "revision": spec["rev"],
        "licence": spec["licence"],
        "loadSeconds": load_s,
        "peakVramGiB": round(torch.cuda.max_memory_allocated() / 2**30, 2),
        "items": results,
    }))
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python run_image.py <job.json>")
        return 1
    job = json.loads(Path(sys.argv[1]).read_text())
    name = job.get("model", "z-image")
    spec = MODELS_SPEC.get(name) or MODELS_SPEC["z-image"]
    out = Path(job["outDir"])
    out.mkdir(parents=True, exist_ok=True)

    if spec.get("pipeline") == "SdServerPipeline" or name == "z-image":
        return _run_z_image(job, spec, out)
    else:
        return _run_diffusers(job, spec, out)


if __name__ == "__main__":
    raise SystemExit(main())
