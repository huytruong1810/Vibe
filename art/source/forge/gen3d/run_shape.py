"""Run Hunyuan3D-2mv shape generation (runs inside gen3d/.venv, not the forge env).

Usage: python run_shape.py --views front=a.png left=b.png back=c.png --out mesh.glb --seed 1234 [--steps 50]
The model and code are vendored by gen3d/setup.sh into gitignored folders (doctrine L5, PRD-8.3).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "vendor" / "Hunyuan3D-2"))
os.environ.setdefault("HF_HOME", str(HERE / "models" / "hf"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")

import torch  # noqa: E402
from PIL import Image  # noqa: E402

MODEL = "tencent/Hunyuan3D-2mv"
SUBFOLDER = "hunyuan3d-dit-v2-mv"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--views", nargs="+", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--seed", type=int, default=1234)
    ap.add_argument("--steps", type=int, default=50)
    ap.add_argument("--octree", type=int, default=380)
    args = ap.parse_args()

    from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

    images = {}
    for kv in args.views:
        k, v = kv.split("=", 1)
        images[k] = Image.open(v).convert("RGBA")
    t0 = time.time()
    pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(MODEL, subfolder=SUBFOLDER, variant="fp16")
    mesh = pipe(
        image=images,
        num_inference_steps=args.steps,
        octree_resolution=args.octree,
        num_chunks=20000,
        generator=torch.manual_seed(args.seed),
        output_type="trimesh",
    )[0]
    mesh.export(args.out)
    print(json.dumps({"seconds": round(time.time() - t0, 1), "vertices": len(mesh.vertices), "faces": len(mesh.faces),
                      "torch": torch.__version__, "model": f"{MODEL}/{SUBFOLDER}", "seed": args.seed, "steps": args.steps}))


if __name__ == "__main__":
    main()
