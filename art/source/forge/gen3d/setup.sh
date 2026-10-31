#!/usr/bin/env bash
# Reproducible setup of the forge's machine-A dependencies (doctrine L5, L6, PRD-8.3).
# Everything lands in gitignored folders; model weights are never committed.
# Run from the repo root: bash art/source/forge/gen3d/setup.sh
set -euo pipefail

FORGE="art/source/forge"
GEN="$FORGE/gen3d"
HUNYUAN_COMMIT="f8db63096c8282cb27354314d896feba5ba6ff8a"
WEIGHTS_REVISION="3a761b539b29fe4ff64714813aa9560fd66f5de0"

# 1. Hunyuan3D-2 code (Tencent Hunyuan Community Licence; territory excludes EU, UK, South Korea)
if [ ! -d "$GEN/vendor/Hunyuan3D-2" ]; then
  git clone --quiet https://github.com/Tencent-Hunyuan/Hunyuan3D-2.git "$GEN/vendor/Hunyuan3D-2"
fi
git -C "$GEN/vendor/Hunyuan3D-2" checkout --quiet "$HUNYUAN_COMMIT"

# 2. Python env: Blackwell (sm_120) needs a CUDA >= 12.8 PyTorch build.
[ -d "$GEN/.venv" ] || uv venv --quiet --python 3.12 "$GEN/.venv"
export VIRTUAL_ENV="$PWD/$GEN/.venv"
uv pip install --quiet "torch==2.11.0" "torchvision" --index-url https://download.pytorch.org/whl/cu128
# hy3dgen predates transformers 5 (DINOv2 weight names) and newer diffusers
uv pip install --quiet "transformers==4.46.3" "diffusers==0.31.0" "huggingface_hub==0.26.5" \
  "trimesh==5.2.0" "scikit-image==0.26.0" accelerate einops omegaconf tqdm opencv-python-headless \
  pymeshlab safetensors pyyaml pillow numpy

# 3. Shape model weights (about 9 GB)
HF_HOME="$PWD/$GEN/models/hf" "$GEN/.venv/bin/python" - <<EOF
from huggingface_hub import snapshot_download
print(snapshot_download('tencent/Hunyuan3D-2mv', revision='$WEIGHTS_REVISION', allow_patterns=['hunyuan3d-dit-v2-mv/*']))
EOF

# 4. Quaternius Universal Animation Library 1 + 2, Standard (CC0), pinned by checksum
mkdir -p "$FORGE/vendor/ual"
fetch() {
  local name="$1" sum="$2" dest="$FORGE/vendor/ual/$1.zip"
  [ -f "$dest" ] || curl -sL --max-time 600 -o "$dest" "https://opengameart.org/sites/default/files/$1.zip"
  echo "$sum  $dest" | sha256sum -c --quiet
}
fetch universal_animation_librarystandard 18ff1a7215f4852b320203e8aaf02a1578b5c8eef9027fbaedfcedc7b85a3ac2
fetch universal_animation_library_2standard ec0e40d6d78fe9aaad59e322f40865a8675c22f0745e291622e54520391a9217
unzip -oq "$FORGE/vendor/ual/universal_animation_librarystandard.zip" -d "$FORGE/vendor/ual/ual1"
unzip -oq "$FORGE/vendor/ual/universal_animation_library_2standard.zip" -d "$FORGE/vendor/ual/ual2"

echo "setup done; now run: uv run --project $FORGE python $FORGE/forge.py doctor"
echo "note: the first GPU bake JIT-compiles Blender's Cycles kernels for sm_120 (about 7 minutes, cached afterwards)."
