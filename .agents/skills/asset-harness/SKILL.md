---
name: asset-harness
description: >-
  Turnkey asset generation and baking harness on Machine A for weaker agents to
  autonomously generate, bake, verify, and integrate HD pixel-art game visuals (2D turnaround
  sheets, neutral & 9-expression portraits, seamless dual-grid terrain swatches, 32px
  inventory icons, 3D animated sprites) using local GPU models (Z-Image Turbo &
  Hunyuan3D-2mv / Blender 4.2+).
---

# Hearthwild Asset Harness Runbook

You are operating the **Hearthwild Asset Harness** on Machine A (RTX 5080 Laptop, 16 GB VRAM).
The harness wraps and orchestrates the entire generative art toolchain:
- **2D Generation:** Z-Image Turbo via local `sd-server` on `127.0.0.1:8080` (Apache-2.0 / permissive open weights) for turnaround sheets, neutral portraits, 8 emotion variations, seamless dual-grid terrain swatches, and 32px inventory icons.
- **3D Rigging & Sprite Baking:** Hunyuan3D-2mv, Blender 4.2 LTS (`~/.local/bin/blender`), and Quaternius UAL skeleton templates (Quadruped, Shelled, Winged, Mushroom-Biped, Human A-Pose).
- **VRAM Boundary:** Ollama (`gemma4-abliterated`) is strictly reserved for in-game villager AI and is automatically evicted before any GPU job.
- **Atomic Integration:** Merges candidate frames into `art/source/manifest.json`, repacks multi-page atlas textures, transcribes approvals into `docs/art/approvals.json`, and re-compiles the LDtk world.

```bash
# Main harness entry point
npm run harness -- <command> [args...]
```

---

## 0. Pre-Flight Gate (Run First Every Session)

Before running any art generation or bake job, run the doctor:

```bash
npm run harness -- doctor
```

**Pass Criteria:**
1. `Blender 4.2.x`: OK
2. `sd-server binary`: OK
3. `Z-Image Turbo weights`: OK (`~/.models/z-image/z_image_turbo-Q4_K.gguf`, `qwen_3_4b.safetensors`, `ae.safetensors`)
4. `GPU VRAM`: >= 10,000 MiB free (Ollama evicted)
5. `Forge doctor`: All local environment checks OK

If any check fails, do NOT attempt generation. Read the failure message and resolve the missing file or background process.

---

## 1. Inspect Production Status

To see what assets are prototype, staged candidates, or director-approved HD:

```bash
npm run harness -- status
```

This displays the status of:
- **Species:** Rivallie, Bramblefang, Cindermoth, Ignicap, Marshstalker, Mireling, Steamshell, Zephyrit
- **NPCs & Villagers:** Player (Aqualia), Marina, Caelum, Dara, Finn, Lark, Mira, Neris, Oren, Reed, Willa
- **Environment Assets:** Houses, trees, landmarks, bridges, crops, flora
- **Items & Icons:** Weapons, tools, fish, seeds, materials
- **Compiled Atlas:** Current page count and packed frame totals

---

## 2. Generating 2D Reference Sheets & Slices

### Step 2.1: 2D Turnaround Sheet
Generate a 4-view painterly reference sheet (Front, Three-Quarter, Side, Back) with Z-Image Turbo:

```bash
npm run harness -- generate concept <asset-id>
```
*Output: `art/source/work/<asset-id>/concept/sheet.png`*

### Step 2.2: Sliced Canonical Views
Slice the sheet into registered individual views for 3D reconstruction:

```bash
npm run harness -- generate views <asset-id>
```
*Output: `art/source/work/<asset-id>/prep/{front,side,back}.png`*

---

## 3. Generating Character & NPC Portraits (Neutral + 9 Dialogue Emotions)

Hearthwild dialogue requires nine distinct emotional expressions at both 128px and 96px HUD tiers (`neutral`, `joy`, `sad`, `angry`, `surprised`, `worried`, `smug`, `sleepy`, `warm`).

### Step 3.1: 512x512 High-Resolution Base Portrait
Generate a clean, painterly 512x512 bust portrait:

```bash
npm run harness -- generate portrait-base <asset-id>
```
*Output: `art/source/work/<asset-id>/portrait/base.png`*

### Step 3.2: Neutral HUD Portrait Pair (128px & 96px)
Extract and downscale the base portrait into pixel-perfect HUD pairs:

```bash
npm run harness -- generate portrait <asset-id>
```
*Output: `art/source/work/<asset-id>/portrait/{128,96}.png`*

### Step 3.3: All 8 Emotional Expression Variations
Generate the full expression set via reference image-to-image editing:

```bash
npm run harness -- generate portrait-emotions <asset-id>
```
*Output: `art/source/work/<asset-id>/portrait/expressions/*.png`*

---

## 4. Generating Dual-Grid Terrain Swatches & 32px Icons

### Seamless Terrain Swatches (1024px)
Generate seamless top-down swatches for tileforge dual-grid terrain:

```bash
npm run harness -- generate swatch <set-name> <material-name> "<detailed prompt>"
# Example:
npm run harness -- generate swatch aqualia grass "lush green temperate meadow grass, top-down seamless texture, cosy painterly storybook style"
```
*Output: `art/source/work/swatches/<set-name>/<material-name>.png`*

### 32px Inventory Item Icons
Generate crisp 32x32 inventory icons:

```bash
npm run harness -- generate icon <item-id> "<detailed prompt>"
# Example:
npm run harness -- generate icon copper-sword "short copper arming sword with leather-wrapped grip, diagonal perspective, crisp pixel-friendly RPG item icon"
```
*Output: `art/source/work/icons/<item-id>.png`*

---

## 5. 3D Mesh Reconstruction, Rigging, & Sprite Baking

Execute the complete 3D pipeline (`prep → gen3d → clean → texture → rig → animate → bake → pixelize → qa → packet`):

```bash
npm run harness -- generate bake <asset-id>
```

**Skeletons per Creature Class:**
- **Quadrupeds:** Rivallie, Bramblefang, Marshstalker, Mireling (`quadruped.json`)
- **Shelled:** Steamshell (`shelled.json`, hides in shell for guard/sleep/downed)
- **Winged:** Cindermoth, Zephyrit (`winged.json`, airborne hover gait)
- **Mushroom-Biped:** Ignicap (`mushroom-biped.json`, stem and cap waddle)
- **Humans:** Player, NPCs (`human.json`, 15 UAL motion clips)

**QA Gates Enforced by Forge:**
- Frame count check (88 clips for creatures, 616 frames)
- Palette conformance (must use `spec/palette.json` 32-color storybook ramps)
- Integer anchor registration
- Footprint bounds (no clipping outside canvas margins)

---

## 6. Atomic Staging Integration & Ledger Transcription

When an asset has completed baking and passes QA, integrate it into the game build:

```bash
# For creature species:
npm run harness -- integrate <species-id>

# For NPCs:
npm run harness -- integrate <npc-id> --appearance npc:<npc-id>
```

**What this automatically executes:**
1. Merges staged frames and clips into `art/source/manifest.json`.
2. Repacks multi-page atlas textures (`public/assets/generated/bundle-*.png` & `.json`).
3. Transcribes director approval ledger in `docs/art/approvals.json` bound to exact source digests.
4. Recompiles the LDtk world map (`public/assets/generated/aqualia-region.json`).
5. Runs `npm run check:assets` to verify zero regression.

---

## 7. Visual QA Verification & Headless Preview

To visually verify the new assets in-game:

```bash
npm run harness -- preview
```

**What this does:**
1. Starts the Vite dev server on `127.0.0.1:5173`.
2. Launches headless Chromium via Playwright.
3. Captures high-resolution screenshots:
   - `art/review/latest-preview/overworld.png`: live in-game rendering of the Aqualia overworld, showing terrain tiles, buildings, trees, and ambient creatures.
   - `art/review/latest-preview/gallery.png`: the asset inspection gallery displaying animations, frames, and expressions.
4. Shuts down the temporary test server.

### Visual Inspection Rubric (AAA Standard)
Open the generated screenshots in `art/review/latest-preview/` and verify:
- **Silhouette & Clarity:** Character and creature silhouettes must be instantly readable against ground tiles.
- **Palette Harmony:** Flat color regions with gentle rim lighting; no noisy dithering or muddy clusters.
- **Pixel Grid Integrity:** Nearest-neighbor filtering; no rotated non-pixel-aligned sub-pixels.
- **Contact & Shadows:** Feet/paws grounded with soft shadow ellipses aligned with the depth stretch.
- **Animation Fluidity:** Looping idle and walking clips with natural easing and secondary motion (ears, tails, wings).
