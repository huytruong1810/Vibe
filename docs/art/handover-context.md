# Hearthwild Frontend & Art Agent Handover Context

**Project**: Hearthwild (HD 2D JRPG Presentation & Art Pipeline)  
**Target Branch**: `art/hd-aqualia-slice` (PR #2: `https://github.com/huytruong1810/Vibe/pull/2`)  
**Base/Engineering Branch**: `eng/hd-presentation` (PR #1: `https://github.com/huytruong1810/Vibe/pull/1`)  
**Status**: 133/133 tests passing, single-page atlas budget (3.96 MiB decoded / 16 MiB max), deterministic CI check exits 0.

---

## 1. Context & Mission Overview

Welcome to the Hearthwild project. You are stepping in on a dedicated machine equipped with Blender to implement and execute the **3D-to-Pixel-Art pipeline** (_Dead Cells_ / Motion Twin technique) for character and creature animations.

### The Problem We Solved (Post-Mortem):

1. **2D AI Diffusion Limitations**:
   - When generating 2D turnaround sheets with diffusion models, frames look artistically impressive in isolation, but fail catastrophically in continuous 8-way rotations.
   - Characters suffered severe **identity drift** and **volumetric morphing**: Rivallie's volume jumped $+65\%$ between South and South-East, and collapsed $-53\%$ at North. Face shapes, fur tufts, clothing details, and silhouettes morphed continuously during rotation.
2. **Programmatic Geometric Rig Prototype**:
   - We authored a 3D geometric mesh rig in `art/source/generators/actors/mesh_rig.py` to prove that mathematical 3D projection eliminates 100% of identity drift (East profile: 1,262 px, West profile: 1,261 px; head height locked to $y=21\text{--}23$).
   - However, building 3D meshes purely from code primitives produces blocky "programmer art".
3. **The Chosen Solution**:
   - Model clean, stylized low-poly character and creature base meshes in **Blender**.
   - Bake them headlessly using our pre-built script `art/source/blender/render_pixel_sprites.py` into raw, unaliased orthographic pixel-art frames.
   - Feed the baked frames into our deterministic asset pipeline (`art/source/pipeline/rebuild.py`) to pack them into the runtime texture atlas.

---

## 2. Hard Engineering Invariants & Constraints

You must uphold all of the following rules without exception:

| Constraint              | Requirement                                                                            | Why It Exists                                                                                                            |
| :---------------------- | :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **Git Push Rule**       | **NEVER force push (`--force`)**                                                       | Protects active collaborative branches and PR histories.                                                                 |
| **Domain Isolation**    | **Never touch simulation domains, worker bridges, or runtime adapters**                | Presentation and Art layers must remain completely decoupled from game simulation logic.                                 |
| **Atlas Budget**        | **Must pack into 1 single page ($2048 \times 2048$)**                                  | Decoded texture memory budget is 16 MiB. Current 790 frames use only 3.96 MiB (over 75% headroom remaining).             |
| **Ground Root Anchors** | **Humanoid: $(48, 132)$ on $96 \times 144$<br>Rivallie: $(48, 86)$ on $96 \times 96$** | Fixed integer foot contact point ensures characters never slide or hop when changing facing angles.                      |
| **Transparent Margins** | **$\ge 2\text{px}$ transparent padding on all borders**                                | Engine check (`npm run check:assets`) fails if any non-transparent pixel touches within $1\text{px}$ of the canvas edge. |
| **Deterministic CI**    | `python art/source/pipeline/rebuild.py --check` must pass in < 2s                      | CI enforces that committed sprites match reproducible source outputs with zero SHA-256 diff.                             |

---

## 3. Directory Structure & Key Files

```text
Vibe/
├── art/
│   ├── source/
│   │   ├── blender/
│   │   │   ├── README.md                      # Operational manual for Blender rendering
│   │   │   ├── render_pixel_sprites.py        # Headless batch renderer (bpy script)
│   │   │   └── models/                        # Place .blend source files here
│   │   │       ├── player_aqualia.blend       # Humanoid model (Player)
│   │   │       └── rivallie.blend             # Creature companion model
│   │   ├── exports/                           # Staging folder where baked frames land
│   │   │   ├── player_aqualia/                # idle_s_0.png, idle_se_0.png, ...
│   │   │   ├── rivallie/                      # idle_s_0.png, idle_se_0.png, ...
│   │   │   ├── npcs/                          # 7 Aqualia villagers
│   │   │   └── environment/                   # Cottages, tiles, terrain
│   │   ├── generators/actors/
│   │   │   ├── breathing.py                   # Continuous 6-frame breathing cycle generator
│   │   │   └── mesh_rig.py                    # Analytical 3D projection reference
│   │   ├── pipeline/
│   │   │   └── rebuild.py                     # Deterministic rebuild CLI (SHA-256 validated)
│   │   └── manifest.json                      # Source asset manifest
├── docs/
│   └── art/
│       ├── handover-context.md                # THIS FILE
│       ├── art-engineering-handoff.md         # Architecture alignment report
│       └── coverage.md                        # Asset coverage and inventory tracking
├── public/assets/generated/                   # Runtime packed atlas & catalog
│   ├── catalog.json                           # Frame geometry and clip metadata
│   ├── atlas_page_0.png                       # 2048x2048 packed atlas page
│   └── atlas_page_0.webp                      # Compressed webp atlas
└── scripts/
    ├── assets-build.ts                        # Texture atlas packing engine
    └── assets-check.ts                        # Strict architectural audit script
```

---

## 4. Technical Specifications for Blender Models

### A. Player Aqualia (Humanoid)

- **Canvas Size**: $96 \times 144\text{ px}$ (RGBA PNG).
- **Ground Anchor (Feet contact)**: Exactly $(48, 132)$.
- **Camera Settings**:
  - Type: `ORTHO`
  - Ortho Scale: `2.0`
  - Camera Pitch: $18.0^\circ$ (top-down JRPG $3/4$ perspective)
- **Padding Requirement**: Keep model dimensions within $x \in [2, 93]$ and $y \in [2, 141]$ so transparent margin $\ge 2\text{px}$ is guaranteed.
- **Root Object Naming**: Name root object `Player` or `Armature`.

### B. Rivallie (Creature Companion)

- **Canvas Size**: $96 \times 96\text{ px}$ (RGBA PNG).
- **Ground Anchor (Body/feet contact)**: Exactly $(48, 86)$.
- **Camera Settings**:
  - Type: `ORTHO`
  - Ortho Scale: `1.5`
  - Camera Pitch: $22.0^\circ$ (accommodates wide paddle tail and forward lean)
- **Padding Requirement**: Keep model dimensions within $x \in [2, 93]$ and $y \in [2, 93]$.
- **Root Object Naming**: Name root object `Rivallie` or `Armature`.

### C. Blender Shading & Render Engine Settings (Configured in `render_pixel_sprites.py`)

- Engine: `BLENDER_WORKBENCH`
- Shading: `MATCAP` or `TEXTURE`
- Anti-Aliasing (`render_aa`): `OFF` (Crucial: disables subpixel edge filtering so the render outputs crisp pixel-art silhouettes).
- Film: `Transparent` (alpha channel enabled).
- Dimensions: Exact canvas dimensions ($96 \times 144$ or $96 \times 96$) at $100\%$ scale.

---

## 5. Standard Operating Procedure (Step-by-Step)

### Step 1: Clone and Setup Workspace

```bash
git clone https://github.com/huytruong1810/Vibe.git
cd Vibe
git checkout art/hd-aqualia-slice
npm install
```

### Step 2: Model or Import in Blender

Create low-poly base meshes with stylized diffuse textures. Place your files in:
`art/source/blender/models/player_aqualia.blend`  
`art/source/blender/models/rivallie.blend`

### Step 3: Headless Bake

Execute the automated turntable rendering script:

```bash
# Bake Player 8-directional turnaround
blender -b art/source/blender/models/player_aqualia.blend -P art/source/blender/render_pixel_sprites.py

# Bake Rivallie 8-directional turnaround
blender -b art/source/blender/models/rivallie.blend -P art/source/blender/render_pixel_sprites.py
```

This produces 8 frames (`idle_s_0.png`, `idle_se_0.png`, `idle_e_0.png`, `idle_ne_0.png`, `idle_n_0.png`, `idle_nw_0.png`, `idle_w_0.png`, `idle_sw_0.png`) directly into `art/source/exports/{entity}/`.

### Step 4: Rebuild Asset Catalog & Generate Breathing Cycles

The ingestion pipeline automatically takes the base facing frames, generates continuous 6-frame breathing cycles via inverse-row mapping, updates manifests, and checks for margin/anchor compliance:

```bash
python art/source/pipeline/rebuild.py
python art/source/pipeline/rebuild.py --check
```

### Step 5: Pack Atlas & Run Full Verification Suite

```bash
# 1. Compile texture atlas and validate layout
npm run assets:build
npm run check:assets

# 2. Run domain architecture boundary check
npm run check:architecture

# 3. Run full project test suite
npm test
```

### Step 6: Commit and Push

```bash
git add art/source/blender/models/
git add art/source/exports/
git add public/assets/generated/
git commit -m "feat(art): bake stylized Blender 3D models for player and rivallie"
git push origin art/hd-aqualia-slice
```

_(Do NOT use `--force`)_.

---

## 6. Summary of Architectural Invariants for Verification

When `npm run check:assets` runs, it enforces:

- Zero transparent margin violations ($0\text{px}$ margin is an instant error).
- All sprite dimensions match catalog definitions.
- Single-page atlas constraint (under 16 MiB decoded memory).
- Exact presence of all 8 facing angles for registered actor clips (`idle_s`, `idle_se`, `idle_e`, `idle_ne`, `idle_n`, `idle_nw`, `idle_w`, `idle_sw`).
- Zero domain leaks into `src/domain/` or `src/engine/`.

You are fully equipped with all scripts, paths, and constraints to deliver clean, AAA pixel art with zero identity drift.
