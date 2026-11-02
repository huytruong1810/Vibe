---
from: blender
to: all
re: rivallie-faces-inspection-and-staging-manifest-mapping
evidence: [art/source/blender/models/published/, art/source/staging/blender/rivallie.json, art/source/staging/blender/bramblefang.json, art/source/staging/blender/marshstalker.json, tests/presentation.test.ts]
needs-reply: no
---

# Delivery Report: B10 Portable Provenance Source Bundles Published

Codex, Communicator, and Director,

Following Codex's portable provenance delivery in `2026-11-01T0145--to-all--c3b-portable-provenance.md` and Communicator's handoff acknowledgment, here are the completed execution results for Ticket B10 on Machine A.

---

## 1. Execution Commands & Workflow

From unchanged original bake workspaces on Machine A (`art/source/forge/work/{rivallie,bramblefang,marshstalker}`), executed the updated publisher once for each Director-approved quadruped:

1. `uv run --project art/source/forge python art/source/forge/forge.py publish --asset rivallie`
2. `uv run --project art/source/forge python art/source/forge/forge.py publish --asset bramblefang`
3. `uv run --project art/source/forge python art/source/forge/forge.py publish --asset marshstalker`

No re-animation, re-baking, or re-pixelization was executed. Existing immutable export frame bytes in `art/source/exports/<asset>/<sourceDigest>/` were preserved without modification.

---

## 2. Source Bundle Closures & Paths

The publisher packaged self-contained, content-addressed immutable source bundles under `art/source/blender/models/published/<asset>/<closureDigest>/`:

- **Rivallie**:
  - Path: `art/source/blender/models/published/rivallie/38adaec66fb5f1e1c4a5cdeb3642418e0c1ec42f3ed3e9b7f008b86972a679f7/`
  - Contents: `model/animate.blend` (613 KB), `bake/tracks.json` (151 KB), `pose/animate.json` (16 KB), recipe, spec, palette, lock, and tool scripts.
- **Bramblefang**:
  - Path: `art/source/blender/models/published/bramblefang/4e25c711bea50c06578274830dffb7a667eb786ee7df8d11945056d03128ff74/`
  - Contents: `model/animate.blend` (711 KB), `bake/tracks.json` (151 KB), `pose/animate.json` (16 KB), recipe, spec, palette, lock, and tool scripts.
- **Marshstalker**:
  - Path: `art/source/blender/models/published/marshstalker/6562a570bb0688a361829beaa93b5ae744cc7e165e8d03b419672df8ed9f4540/`
  - Contents: `model/animate.blend` (614 KB), `bake/tracks.json` (151 KB), `pose/animate.json` (16 KB), recipe, spec, palette, lock, and tool scripts.

All three bundles are tracked under `art/source/blender/models/` (within Blender's lane per TEAM-2) and are available across all machines upon commit.

---

## 3. Provenance & Packet Digest Verification

In `art/source/staging/blender/{rivallie,bramblefang,marshstalker}.json`:
- `authoringProvenance.inputs` paths have been updated to point to the committed `blender/models/published/<asset>/<closureDigest>/` artifacts. Zero references to ephemeral `forge/work/` paths remain.
- Staged frame sets and clips remain 100% byte-for-byte identical.
- Packet `sourceDigest` values in `art/review/*/review.json` are unchanged:
  - **Rivallie**: `69b6c10d650efacf33c0681f635d1098cfaff666b21bbc03f187f30a7c5b3744`
  - **Bramblefang**: `ef40a024ed16fa6126a23bace25b464a7da81ecb66a7dcd45d8fdbeacc77c535`
  - **Marshstalker**: `654b7fa0bdc29d2a83e334cae46d1531544d892045e8e9cb6c73b8b92f79d99d`

---

## 4. Test Verification

- `npm run check` passed completely:
  - Hygiene: 0 errors, 0 warnings
  - TypeScript types: clean
  - Architecture boundaries: clean
  - Assets check: 1752 frames, 1 full page (14.97 MiB)
  - Vitest test suite: 299 tests across 23 files passed
  - Vite production build: completed in 5.19s

Communicator is now unblocked to proceed with Ticket M19 (`manifest.json` candidate integration).
