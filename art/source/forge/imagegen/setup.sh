#!/usr/bin/env bash
# Reproducible setup of the forge's local image generation (reference art, PRD-3, PRD-7, PRD-8.3).
# Everything lands in gitignored folders; weights are never committed.
# Run from the repo root: bash art/source/forge/imagegen/setup.sh [model ...]
#   models: klein4b (default), qwen21, qwen21turbo, klein9b (gated: needs `hf auth login`)
# Licences (director decision 2026-11-02: personal project; regenerate with a
# commercial-safe model before any commercial release; every image records its model):
#   klein4b  FLUX.2 [klein] 4B          Apache-2.0
#   klein9b  FLUX.2 [klein] 9B          FLUX Non-Commercial License v2.1
#   qwen21*  Qwen-Image-2.1 (+Turbo)    Qwen Research License (non-commercial)
set -euo pipefail
GEN="art/source/forge/imagegen"
[ -d "$GEN/.venv" ] || uv venv --quiet --python 3.12 "$GEN/.venv"
export VIRTUAL_ENV="$PWD/$GEN/.venv"
# Blackwell (sm_120) needs a CUDA >= 12.8 PyTorch build (same pin as gen3d).
uv pip install --quiet "torch==2.11.0" "torchvision" --index-url https://download.pytorch.org/whl/cu128
uv pip install --quiet "diffusers==0.41.0" "transformers==5.19.0" "accelerate==1.15.0" \
  "bitsandbytes==0.50.2" "huggingface_hub" "safetensors" "pillow" "numpy" "sentencepiece" "protobuf"

declare -A REPO=(
  [klein4b]="black-forest-labs/FLUX.2-klein-4B@e7b7dc27f91deacad38e78976d1f2b499d76a294"
  [klein9b]="black-forest-labs/FLUX.2-klein-9B@main"
  [qwen21]="Qwen/Qwen-Image-2.1@d26bb61231c349cf6b7896fa83353113880e1ba3"
  [qwen21turbo]="Qwen/Qwen-Image-2.1-Turbo@fc13ba1986fcb905854dc8de2f52eee395f49b5b"
)
models=("$@")
[ ${#models[@]} -eq 0 ] && models=(klein4b)
for m in "${models[@]}"; do
  spec="${REPO[$m]:?unknown model $m}"
  HF_HOME="$PWD/$GEN/models/hf" "$GEN/.venv/bin/python" - "$spec" <<'EOF'
import sys
from huggingface_hub import snapshot_download
repo, rev = sys.argv[1].split("@")
# diffusers folders only (skip single-file duplicates and sample images)
path = snapshot_download(repo, revision=rev, allow_patterns=["model_index.json", "*/*.json", "*/*.txt",
                         "*/*.jinja", "*/*.safetensors", "*/*.model", "LICENSE*"])
print("weights:", path)
EOF
done
echo "imagegen setup done: uv run --project art/source/forge python art/source/forge/forge.py doctor"
