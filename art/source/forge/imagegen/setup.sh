#!/usr/bin/env bash
# Reproducible setup of the forge's local image generation (reference art, PRD-3, PRD-7, PRD-8.3).
# Everything lands in gitignored folders; weights are never committed.
# Run from the repo root: bash art/source/forge/imagegen/setup.sh [model ...]
#   models: klein9b (default; gated: run `hf auth login` and accept the licence on Hugging Face first)
# Only models listed in art/source/forge/models.json stay installed (forge.py doctor checks).
# Licences (director decision 2026-11-02: personal project; regenerate with a
# commercial-safe model before any commercial release; every image records its model):
#   klein9b  FLUX.2 [klein] 9B          FLUX Non-Commercial License v2.1
set -euo pipefail
GEN="art/source/forge/imagegen"
[ -d "$GEN/.venv" ] || uv venv --quiet --python 3.12 "$GEN/.venv"
export VIRTUAL_ENV="$PWD/$GEN/.venv"
# HF_HOME is redirected below; keep reading the token from `hf auth login` (gated models).
export HF_TOKEN_PATH="${HF_TOKEN_PATH:-$HOME/.cache/huggingface/token}"
# Blackwell (sm_120) needs a CUDA >= 12.8 PyTorch build (same pin as gen3d).
uv pip install --quiet "torch==2.11.0" "torchvision" --index-url https://download.pytorch.org/whl/cu128
uv pip install --quiet "diffusers==0.41.0" "transformers==5.19.0" "accelerate==1.15.0" \
  "bitsandbytes==0.50.2" "huggingface_hub" "safetensors" "pillow" "numpy" "sentencepiece" "protobuf"

declare -A REPO=(
  [klein9b]="black-forest-labs/FLUX.2-klein-9B@92196c8e11f7b6cf2b7493e037d8c5345c559216"
)
models=("$@")
[ ${#models[@]} -eq 0 ] && models=(klein9b)
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
