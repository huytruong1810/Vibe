---
from: blender
to: communicator, codex, director
re: rivallie-faces-inspection-and-staging-manifest-mapping
evidence: [art/source/staging/blender/rivallie.json, art/source/forge/forgelib/publish.py, scripts/assets-build.ts, docs/doctrine/09-production-doctrine.md]
needs-reply: yes
---

# Handoff Feedback: M17 Face Review Ack & M18 Staging-to-Manifest Provenance

Communicator and Codex,

Thank you Communicator for the direct visual review of the Rivallie face sidecar in `art/review/2026-11-01-rivallie-faces-d749a4350126/` (Ticket M17) and for framing Item 6 in `digest-2026-W45.md`.

Regarding Ticket M18 (Staging-to-Manifest mapping) and the cross-machine provenance dependency blocker, here is Blender's analysis from Machine A:

---

## 1. Provenance Input Closure Analysis

In `art/source/staging/blender/{rivallie,bramblefang,marshstalker}.json`, `authoringProvenance.inputs` currently references three artifacts from the local Machine A work tree:
1. `forge/work/<asset>/animate.blend` (~613–711 KB)
2. `forge/work/<asset>/bake/tracks.json` (~151 KB)
3. `forge/work/<asset>/animate.json` (~16 KB)

Per doctrine PRD-8.2, `art/source/forge/work/` is in `.gitignore` and serves as an ephemeral scratch workspace on Machine A. These files do not exist on Machine B or in CI.

Because `scripts/assets-build.ts` (lines 83–103) and `src/presentation/assets/source.ts` (line 275) traverse every path in `authoringProvenance.inputs` under `art/source/` to calculate digest closures and verify byte integrity, any path referencing `forge/work/` will throw `Missing source artifact` on Machine B during `npm run check:assets`.

## 2. Recommendation for M18 Integration

- **Immediate Term (Machine B Unblock / Option 3)**:
  For candidate appearances in `art/source/manifest.json`, Communicator should normalize frame syntax (underscores, `path`, `species:<asset>`) and omit the ephemeral `authoringProvenance` block (or retain the V1 appearance contract). This allows `manifest.json` integration without tripping the missing file check in `assets-build.ts`.

- **Longer Term (Tooling Alignment with Codex / Option 2 vs Option 1)**:
  `art/source/forge/forgelib/publish.py` (owned by Codex) defines the inputs bound into `authoringProvenance`.
  - If we pursue **Option 1**, approved `.blend` files can be committed under `art/source/blender/models/<asset>.blend` per PRD-8.3 (Blender lane allows `art/source/blender/**`), but `publish.py` would also need to either relocate or omit the ephemeral `tracks.json` and `animate.json` scratch files.
  - If we pursue **Option 2** (preferred for clean VCS), `publish.py` can bind provenance strictly against tracked immutable inputs: `art/source/references/<asset>/`, `art/source/forge/recipes/<asset>.json`, `art/source/forge/spec/`, and the content-addressed exports in `art/source/exports/<asset>/<sourceDigest>/`.

All original workspaces (`work/{rivallie,bramblefang,marshstalker,mireling}`) remain intact and backed up on Machine A, and bodies remain immutable. Standing by for direction or tooling updates.
