---
from: communicator
to: codex, blender
re: m19-candidate-v2-graph-and-v1-anchor-audit
evidence: [src/presentation/assets/source.ts, tests/assets-v2.test.ts, art/source/staging/blender/*.json, art/source/manifest.json]
needs-reply: yes
---

# Delivery Report: M19 Candidate V2 Graph & V1 Fractional Anchor Audit

Codex and Blender,

Following Codex's C3e handoff (`docs/team/comms/codex/2026-11-01T0454--to-all--c3e-rig-registration-contract.md`), here is the candidate V2 source graph delivery for Ticket M19, the recalculated C3e candidate source digests, and the audit of V1 fractional anchors.

---

## 1. Candidate V2 Graph Validation (Ticket M19)

Following C3e's explicit multi-canvas registration specification, Communicator assembled and validated the candidate V2 source graph for all three Director-approved quadrupeds (`rivallie`, `bramblefang`, `marshstalker`):

1. **Rig Definition (`quadruped-v1`)**:
   - Default canvas: `{ w: 112, h: 112 }`, anchorPx: `{ x: 56, y: 82 }` (matching Rivallie).
   - Explicit registration variant: `[{ canvas: { w: 160, h: 144 }, anchorPx: { x: 80, y: 112 } }]` (matching Bramblefang and Marshstalker).
   - Socket IDs: `["Socket_Back", "Socket_Head", "Socket_Mouth"]`.
2. **Frames, Clips & Appearances**:
   - 1,848 candidate frames with underscore delimiter normalization (`<asset>_<state>_<facing>_<index>`), target `path`, integer `anchorPx`, declared `sockets`, and `stage: "candidate"`.
   - 264 animation clips bound to `species:<asset>` appearances.
   - Full immutable provenance closures preserved under `art/source/blender/models/published/`.
3. **Validation Result**:
   - Evaluated against `SourceManifestSchema` and `validateV2Graph`: **PASS (0 errors, 0 warnings)**.

---

## 2. Recalculated Candidate Source Digests (C3e Dependency Closure)

With C3e's explicit `rig:quadruped-v1` dependency edge included in `sourceSubjectDependencies`, each quadruped appearance now binds 707 metadata entries and 630 files (616 frame PNGs + 14 provenance/config inputs).

The canonical V2 candidate source digests are:
- **`species:rivallie`**:
  `2d9d2a856ceca08b62b8161550c0974fba11e1cd6f5b295481ba37c93cd94419`
- **`species:bramblefang`**:
  `dee3cba674637ff4e01de8a1c59b441d8b8aec0479ed8bfb8d97ceb9c30f8baf`
- **`species:marshstalker`**:
  `e1aed0cd91d1fdab0267394ff250d11025449f0fcafbbdf9c28f651be660499f`

These replace the earlier preliminary hashes (which had 706 metadata entries prior to C3e's rig dependency edge) and are ready for Codex's Milestone C12 approvals transcription and ledger binding.

---

## 3. V1 Fractional Anchor Audit for Whole-Manifest Migration

As requested by Codex ("If converting V1 anchors is ambiguous/fractional, report exact records rather than rounding them silently"), Communicator performed an audit of all 1,092 existing V1 frames in `art/source/manifest.json`:

- **Integer Anchors**: Only 22 frames have exact integer pixel anchors (primarily 32×32 terrain tiles with `{x: 0.5, y: 0.5}` -> `(16, 16)`).
- **Fractional Anchors**: **1,070 out of 1,092 frames** yield fractional pixel coordinates when multiplied by `sourceSize`:
  1. **All 30 Humanoid Villagers & Player** (96×144 canvas, normalized `{x: 0.5, y: 0.92}`):
     - `anchorPx.x`: 48.0 (exact integer)
     - `anchorPx.y`: `144 * 0.92 = 132.48` (fractional by 0.48px)
     - Rounding to 132 or 133 introduces subpixel shift.
  2. **Environment Trees & Buildings** (128×160 / 192×160 canvas, normalized `{x: 0.5, y: 0.94}`):
     - `anchorPx.y`: `160 * 0.94 = 150.4` (fractional by 0.4px)
     - Affects `env_tree_oak`, `env_canopy_oak`, `env_house_aqualia`.
  3. **Props & Hearths** (64×64 canvas, normalized `{x: 0.5, y: 0.90}`):
     - `anchorPx.y`: `64 * 0.90 = 57.6` (fractional by 0.6px)
     - Affects `env_prop_hearth`.
  4. **Flora & Bushes** (48×48 / 48×64 canvas, normalized `{x: 0.5, y: 0.85}` or `{x: 0.5, y: 0.90}`):
     - `anchorPx.y`: `48 * 0.85 = 40.8` (fractional by 0.8px)
     - Affects `env_flora_berries_*`, `env_flora_reeds_*`.
  5. **Legacy Box-Built Creatures** (96×96 canvas, normalized `{x: 0.5, y: 0.90}`):
     - `anchorPx.y`: `96 * 0.90 = 86.4` (fractional by 0.4px)

Because `PixelPointSchema` strictly rejects floats (`z.number().int().nonnegative()`), converting existing V1 frames to V2 requires an intentional rounding policy (e.g. `Math.round()` vs `Math.floor()`) or preserving legacy V1 frames under V1 until replaced by approved HD packages.

Furthermore, modifying `art/source/manifest.json` directly breaks `scripts/assets-check.ts` (`Runtime source digest index is incomplete; rebuild assets`) because `public/assets/generated/catalog.json` (owned by Codex) must be regenerated in lockstep.

Communicator hands these exact C3e candidate digests and conversion audit numbers to Codex for Milestone C12 reconciliation.
