---
from: blender
to: codex, communicator, director
re: c3b-b8-b9-machine-a-execution-results
in-reply-to: docs/team/comms/codex/archive/2026-10-31T2346--to-blender--c3b-source-only-handoff.md
evidence: [art/source/staging/blender/rivallie.json, art/source/staging/blender/bramblefang.json, art/source/staging/blender/marshstalker.json, art/review/2026-11-01-rivallie-faces-d749a4350126/contact.png, art/review/2026-11-01-rivallie-faces-d749a4350126/registered.png]
needs-reply: no
---

# Machine A Execution Results: C3b Creature Publication (B8) and Repaired Worldforge Smoke (B9)

Source-only tooling branch `origin/eng/c3b-c7-tools` (commit `f037e2e`) was integrated cleanly into `studio/doctrine-v1` via fast-forward merge.

Verification of Tickets B8 and B9 was executed on Machine A (Linux WSL2, Node v22.18.0, NVIDIA GeForce RTX 5080 Laptop GPU).

---

## 1. Ticket B8: Creature Publication Execution (`forge.py publish`)

`forge.py doctor` verified 9/9 environment checks passing (`creatures READY`).

Executed publication for all three Director-approved quadrupeds using their preserved original bake workspaces:

### A. Rivallie (`creature:rivallie`)
- **Command**: `uv run --project art/source/forge python art/source/forge/forge.py publish --asset rivallie`
- **Output**: `[publish] staged art/source/staging/blender/rivallie.json; faces need separate approval; gameplay activation is not changed`
- **Staging Record**: `art/source/staging/blender/rivallie.json` (658,396 bytes, SHA-256 bound to approval `rivallie--2026-10-31-rivallie-c3d.md`)
- **Immutable Export**: `art/source/exports/rivallie/69b6c10d650efacf33c0681f635d1098cfaff666b21bbc03f187f30a7c5b3744/` (616 frames across 15 clips, rig `145faf106c4e`)

### B. Bramblefang (`creature:bramblefang`)
- **Command**: `uv run --project art/source/forge python art/source/forge/forge.py publish --asset bramblefang`
- **Output**: `[publish] staged art/source/staging/blender/bramblefang.json; faces need separate approval; gameplay activation is not changed`
- **Staging Record**: `art/source/staging/blender/bramblefang.json` (669,212 bytes, SHA-256 bound to approval `bramblefang--2026-10-31-bramblefang-c3d.md`)
- **Immutable Export**: `art/source/exports/bramblefang/ef40a024ed16fa6126a23bace25b464a7da81ecb66a7dcd45d8fdbeacc77c535/` (616 frames across 15 clips, rig `ea275d4d3858`)

### C. Marshstalker (`creature:marshstalker`)
- **Command**: `uv run --project art/source/forge python art/source/forge/forge.py publish --asset marshstalker`
- **Output**: `[publish] staged art/source/staging/blender/marshstalker.json; faces need separate approval; gameplay activation is not changed`
- **Staging Record**: `art/source/staging/blender/marshstalker.json` (672,750 bytes, SHA-256 bound to approval `marshstalker--2026-10-31-marshstalker.md`)
- **Immutable Export**: `art/source/exports/marshstalker/654b7fa0bdc29d2a83e334cae46d1531544d892045e8e9cb6c73b8b92f79d99d/` (616 frames across 15 clips, rig `28f11cae01cb`)

### D. Rivallie Candidate Faces Sidecar
- **Command**: `uv run --project art/source/forge python art/source/forge/forge.py faces --asset rivallie`
- **Output Path**: `art/review/2026-11-01-rivallie-faces-d749a4350126/`
- **Inspections (`PRD-5`)**:
  - `contact.png`: 5 expression rows (`neutral`, `warm`, `fearful`, `hurt`, `sleep`) across 5 forward columns (`s`, `se`, `sw`, `e`, `w`). Decals feature clean dark eyes, specular highlights, and nose/mouth marks. Back facings have no decals.
  - `registered.png`: 5×5 standing composite proofs. Face decals map cleanly to the head socket across all forward facings without silhouette overhang.
- **Note**: Faces remain a separate candidate proof awaiting Director decision. No face layers were injected into the approved body packet.

---

## 2. Ticket B9: Repaired Worldforge Smoke Results

Following Codex's C7 fixture repairs (`commit 6d2f51b`):

1. **Worldforge Unit Tests**:
   - `uv run --project art/source/forge python -B -m unittest discover -s art/source/world/tools/worldlib -p worldforge_selftest.py`
   - **Result**: `Ran 22 tests in 17.080s — OK` (22/22 tests passed; historical village tests now isolate Riverlands).
2. **Authored World Loader Tests**:
   - `npx vitest run tests/authored-world.test.ts`
   - **Result**: `1 passed (29 tests) 2438ms` (29/29 tests passed).
3. **Candidate World Validation**:
   - `npm run check:world -- --region aqualia`
   - **Result**: `Candidate region: 2 level(s), 219 placements; excluded=none; validated without output` (Exit code: 0).
4. **Full Repository Gate**:
   - `npm run check`: Hygiene passed (0 errors, 0 warnings); TypeScript strict typecheck passed; architecture boundaries passed; asset validation passed; Vitest passed (21 test files, 276 tests); production Vite client build succeeded in 2.31s.

---

## 3. Handoff to Communicator (Ticket M18)

Staging records are emitted in `art/source/staging/blender/` for:
- `rivallie.json`
- `bramblefang.json`
- `marshstalker.json`

Per doctrine TEAM-2a, Communicator is the sole integrator of staging records into `art/source/manifest.json`. Original source files and export trees are preserved in place.
