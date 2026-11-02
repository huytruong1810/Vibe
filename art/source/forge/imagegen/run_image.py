"""imagegen: batch local image generation for reference art (PRD-3, PRD-7, PRD-8).

  python run_image.py <job.json>
job: {"model": "klein4b" | "klein9b" | "qwen21" | "qwen21turbo",
      "outDir": "<dir>", "width": 1024, "height": 1024, "steps": null, "guidance": null,
      "items": [{"id": "c0", "prompt": "...", "negative": "", "seed": 7,
                 "references": ["<png>", ...]}]}
Loads the model once, writes <outDir>/<id>.png per item and prints
IMAGEGEN {json} with the model, weights revision, seeds, seconds and peak VRAM, so
every kept image carries its provenance. Fits a 16 GB GPU and ~15 GB RAM: large
components are quantized as they load (bitsandbytes) and go straight to the GPU.
Exits when done, so the GPU is free for gen3d, Blender or Ollama.
"""
from __future__ import annotations

import gc
import inspect
import json
import os
import sys
import time
from pathlib import Path

import torch
from PIL import Image

HERE = Path(__file__).resolve().parent
os.environ.setdefault("HF_HOME", str(HERE / "models" / "hf"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")  # weights come from setup.sh, never at generation time

# repo, revision, pipeline class, components to quantize, defaults
MODELS = {
    "klein4b": {"repo": "black-forest-labs/FLUX.2-klein-4B", "rev": "e7b7dc27f91deacad38e78976d1f2b499d76a294",
                "pipeline": "Flux2KleinPipeline", "quant": {"text_encoder": "8bit"}, "steps": 4, "guidance": 1.0,
                "licence": "Apache-2.0"},
    "klein9b": {"repo": "black-forest-labs/FLUX.2-klein-9B", "rev": "main", "pipeline": "Flux2KleinPipeline",
                "quant": {"text_encoder": "8bit", "transformer": "8bit"}, "steps": 4, "guidance": 1.0,
                "licence": "FLUX Non-Commercial v2.1"},
    "qwen21": {"repo": "Qwen/Qwen-Image-2.1", "rev": "d26bb61231c349cf6b7896fa83353113880e1ba3",
               "pipeline": "QwenImage21Pipeline", "quant": {"text_encoder": "4bit", "transformer": "8bit"},
               "steps": 40, "guidance": None, "licence": "Qwen Research License"},
    "qwen21turbo": {"repo": "Qwen/Qwen-Image-2.1-Turbo", "rev": "fc13ba1986fcb905854dc8de2f52eee395f49b5b",
                    "pipeline": "QwenImage21Pipeline", "quant": {"text_encoder": "4bit", "transformer": "8bit"},
                    "steps": None, "guidance": None, "licence": "Qwen Research License"},
}


def load(name: str):
    import diffusers
    from diffusers import BitsAndBytesConfig as DiffusersBnb
    from diffusers.quantizers import PipelineQuantizationConfig
    from transformers import BitsAndBytesConfig as TransformersBnb

    spec = MODELS[name]
    cls = getattr(diffusers, spec["pipeline"])
    per_component = {}
    for component, mode in spec["quant"].items():
        bnb = TransformersBnb if component == "text_encoder" else DiffusersBnb
        kw = ({"load_in_4bit": True, "bnb_4bit_quant_type": "nf4", "bnb_4bit_compute_dtype": torch.bfloat16}
              if mode == "4bit" else {"load_in_8bit": True})
        per_component[component] = bnb(**kw)
    pipe = cls.from_pretrained(spec["repo"], revision=spec["rev"], torch_dtype=torch.bfloat16,
                               quantization_config=PipelineQuantizationConfig(quant_mapping=per_component),
                               low_cpu_mem_usage=True)
    for component in ("transformer", "text_encoder", "vae"):
        module = getattr(pipe, component, None)
        if module is not None and component not in spec["quant"]:
            module.to("cuda")  # quantized components are already placed on the GPU by bitsandbytes
    return pipe, spec


def main() -> int:
    job = json.loads(Path(sys.argv[1]).read_text())
    name = job["model"]
    out = Path(job["outDir"])
    out.mkdir(parents=True, exist_ok=True)
    torch.cuda.reset_peak_memory_stats()
    t0 = time.time()
    pipe, spec = load(name)
    load_s = round(time.time() - t0, 1)
    params = inspect.signature(pipe.__call__).parameters
    if getattr(pipe, "vae", None) is not None and hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()  # decoding a 3 MP sheet in one pass doesn't fit 16 GB
    embeds = {}
    if spec["pipeline"] == "Flux2KleinPipeline":
        # Encode every prompt first, then free the text encoder: denoising never needs it
        # and keeping it resident pushed a 3 MP sheet past 16 GB (driver spill, ~200 s/image).
        with torch.no_grad():
            for item in job["items"]:
                embeds[item["id"]] = pipe.encode_prompt(prompt=item["prompt"], device="cuda")[0]
        pipe.text_encoder = None
        gc.collect()
        torch.cuda.empty_cache()
    results = []
    for item in job["items"]:
        kw = {"prompt": item["prompt"], "width": job.get("width", 1024), "height": job.get("height", 1024),
              "generator": torch.Generator("cuda").manual_seed(int(item["seed"]))}
        steps = job.get("steps") or spec["steps"]
        guidance = job.get("guidance") or spec["guidance"]
        if steps:
            kw["num_inference_steps"] = steps
        if guidance is not None and "guidance_scale" in params:
            kw["guidance_scale"] = guidance
        if guidance is not None and "true_cfg_scale" in params:  # Qwen 2.1: CFG only with a negative prompt
            kw["true_cfg_scale"] = guidance
        if item.get("negative") and "negative_prompt" in params and (guidance or 1.0) > 1.0:
            kw["negative_prompt"] = item["negative"]
        if "output_resolution" in params:  # Qwen 2.1 derives size and resizes references from this
            kw["output_resolution"] = max(kw["width"], kw["height"])
        if item["id"] in embeds:
            kw["prompt"], kw["prompt_embeds"] = None, embeds[item["id"]]
        refs = [Image.open(p).convert("RGB") for p in item.get("references", [])]
        if refs:
            if "image" not in params:
                raise SystemExit(f"{name} does not take reference images")
            kw["image"] = refs if len(refs) > 1 else refs[0]
        t = time.time()
        image = pipe(**kw).images[0]
        path = out / f"{item['id']}.png"
        image.save(path)
        results.append({"id": item["id"], "file": str(path), "seed": item["seed"], "seconds": round(time.time() - t, 1),
                        "references": item.get("references", []), "prompt": item["prompt"]})
    print("IMAGEGEN", json.dumps({"model": name, "repo": spec["repo"], "revision": spec["rev"], "licence": spec["licence"],
                                  "loadSeconds": load_s, "peakVramGiB": round(torch.cuda.max_memory_allocated() / 2**30, 2),
                                  "items": results}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
