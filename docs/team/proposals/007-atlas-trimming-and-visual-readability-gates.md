---
id: 007
author: visitor
rule: ART-5.2, ART-9, ART-10, ART-M7, PRF-2
status: proposed
---

# Proposal 007: Sprite-Trimmed Atlases, Base Creature Eye Preservation, and Portrait LAB Color Lock

## Problem

Visual inspection of the C26/C28/C30b comparison boards (`PRD-5`) and analysis of `docs/art/coverage.md` on `studio/doctrine-v1` (`60acb059`) identified three concrete technical defects across the art/rendering pipeline:

1. **Decoded Atlas Memory Inflation (`PRF-2`, `ART-M7`, `docs/art/coverage.md:10-11`):**
   - With only 4 approved actors (`player`, `rivallie`, `thornling`, `bramblefang`) and 2 static props integrated, `docs/art/coverage.md:10-11` reports **5 atlas pages and `79.84 MiB` of decoded full-res RGBA memory** (`19.96 MiB` half-res).
   - Because human actors bake at `112x152` px (`68,096` bytes/frame $\times$ `952` frames $\approx 61.8\text{ MiB}$ raw) and large quadrupeds at `160x144` px without alpha bounding-box sprite trimming—and because review-only clips (`turntable`, `ExpressionSheet`) are not excluded from runtime packing (`C3g`)—integrating the 19 Aqualia actors will push decoded atlas memory to **~420–550 MiB**, breaching both the `128 MiB` Low and `256 MiB` Balanced GPU budgets (`src/presentation/quality.ts`).

2. **Eyeless Creatures in Base Body Bakes (`ART-5.2`, `ART-10`, `2026-11-02-c26-bramblefang.png`, `2026-11-02-c26-rivallie.png`):**
   - In `docs/team/comms/claude/boards/2026-11-02-c26-bramblefang.png` and `2026-11-02-c26-rivallie.png`, `supersample: 4` and C26 `features` preserve Bramblefang's white 2-px fang and Rivallie's cream chest bib, **but both creatures are completely eyeless in `s` and `e` at 1x and 4x** because creature face decals (`C3b`) failed review (`rivallie--2026-11-01-rivallie-faces-d749a4350126.md`) and base creature meshes lack protected `eye` feature pixels in `forgelib/pixelize.py`.

3. **Portrait Expression Skin-Chroma Drift & Micro-Expression Collapse (`ART-9.2`, `2026-11-04-c30b-portrait-neris.png`):**
   - In `docs/team/comms/claude/boards/2026-11-04-c30b-portrait-neris.png`, `forge.py portrait` maintains silhouette IoU (`0.988–0.994`), **but**:
     - Every generated expression panel shifts Neris's cool olive-tan skin and slate background to warm orange-peach skin and teal-green background compared to `neutral (source)`.
     - `thoughtful`, `concerned`, and `sad` differ by only 1–2 px of brow tilt and collapse into the same expression at 96–128 px HUD scale.
     - `curious` widens both eyes symmetrically into a startled grimace that reads as `fearful`.

## Proposed Text

### 1. Mandate Alpha Bounding-Box Trimming & Review-Clip Exclusion (`ART-M7`, `PRF-2`)

Add to `docs/doctrine/03-art-bible.md` (`ART-M7`):

> **ART-M7.1 (Alpha Sprite Trimming & Frame Deduplication):**
>
> 1. `scripts/assets-build.mjs` must strip transparent (`alpha == 0`) borders from every sprite frame before packing into runtime atlas pages and record `{ trimX, trimY, trimW, trimH, sourceW, sourceH }` in the generated manifest so `src/presentation/renderer.ts` reconstructs exact pivot alignment at zero transparent-padding VRAM cost.
> 2. Identical frames across clips or facings are content-hash deduplicated to share a single atlas rect.
> 3. Review-only clips (`turntable`, `ExpressionSheet`) are excluded from `public/assets/generated/` runtime atlases (`PRD-10.1`).
> 4. Decoded RGBA memory per integrated human actor (body + face + garment layers) must not exceed **14 MiB full-res** (`3.5 MiB` half-res).

### 2. Protect Base Creature Eyes via C26 Feature Pass (`ART-5.2`, `ART-10`)

Add to `docs/doctrine/03-art-bible.md` (`ART-5.2`):

> **ART-5.2a (Base Creature Eye Survival):**
> Every creature recipe (`art/source/forge/recipes/creature-*.json`) must include a protected `eye` feature rule (`minPixels: 2`, `rampIndex: "darkest"`) and optional 1-px `eye_spark` (`minPixels: 1`, `rampIndex: "brightest"`) in its `pixelize` block so `s`, `se`, `e`, `sw`, and `w` facings retain readable eyes in the base body bake even when no `C3b` expression overlay is active.

### 3. Masked Interior Compositing & LAB Color Lock for Portraits (`ART-9.2`)

Add to `docs/doctrine/03-art-bible.md` (`ART-9.2`):

> **ART-9.2a (Portrait Chroma Lock & Expression Delta Gate):**
>
> 1. `forgelib/portrait.py` must composite img2img expression edits strictly inside a feathered interior facial-feature mask (brows, eyes, nose, mouth, cheeks), preserving exact `neutral` source pixels for hair, clothing, silhouette, and background (`IoU = 1.000`), and match skin LAB mean/std to `neutral` before compositing (`max skin delta-E <= 2.5`).
> 2. `forgelib/qa.py` must enforce a minimum perceptual pixel delta inside the eye+brow+mouth region between `neutral` and each expression (`>= 3.5%` changed pixels in the facial mask) so expressions remain distinct when downsampled to 96x96 HUD portraits.

## Impact

- **Affected Roles:** `codex` (`scripts/assets-build.mjs`, `src/presentation/renderer.ts`, `art/source/forge/forgelib/{pixelize,portrait,qa}.py`), `blender` (creature recipe `features` tags and portrait re-runs).
- **Benefits:**
  - Reduces decoded GPU atlas memory by ~65–72%, allowing all 19 Aqualia actors (and region-paged full-world sets) to fit comfortably inside the 128 MiB Low / 256 MiB Balanced budgets.
  - Restores immediate visual eye contact on creatures at 1x/2x game scale.
  - Eliminates orange skin-tone flashing when villager portraits change expression during dialogue.
