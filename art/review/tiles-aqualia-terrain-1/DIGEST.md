# Director Digest: Tile Set aqualia-terrain, Revision 1

- **Asset**: `aqualia-terrain` (Region: Aqualia)
- **Status**: `candidate` (All QA hard checks passed; 71 tiles synthesized at 2× export)
- **Source Digest**: `aba7b781aa3271661bb7cc425f3d43201166ba86289f170ac3d99aef1e7edf0e`
- **Recipe**: `art/source/tiles/sets/aqualia-terrain/set.json` (sha `88525be5b65e`)
- **Review Packet**: `art/review/tiles-aqualia-terrain-1/`

---

## 1. Materials & Scope

1. **`ground_grass`** (3 variants):
   - Swatch: `swatches/grass.png` (FLUX.2 [klein] 9B seed 102, seam score 1.18).
   - Parameters: `swatchTilePx: 256`, `flatten: 2`, `cluster: 0.6`.
   - Palette: `foliage-deep.shadow`, `foliage-deep.mid` (68% dominant), `moss.mid`, `reed.mid`.
2. **`ground_freshwater`** (2 variants):
   - Swatch: `swatches/water.png` (caustic network).
   - Palette: `water.shadow`, `water.mid` (50% dominant), `water.light`, `water.highlight`.
3. **`ground_dirt`** (2 variants):
   - Palette: `timber.deep`, `timber.shadow`, `sand.shadow`, `sand.mid`.
4. **`ground_sand`** (2 variants):
   - Palette: `sand.deep`, `sand.shadow`, `sand.mid`, `sand.light`.
5. **`ground_stone`** (2 variants):
   - Palette: `stone.deep`, `stone.shadow`, `stone.mid`, `stone.light`.
6. **`ground_mud`** (2 variants):
   - Palette: `basalt.deep`, `timber.deep`, `timber.shadow`, `leather.shadow`.
7. **`ground_reedbed`** (2 variants):
   - Palette: `foliage-deep.shadow`, `moss.shadow`, `reed.mid`, `reed.light`.
8. **`ground_boardwalk`** (2 variants):
   - Palette: `wood.deep`, `wood.shadow`, `wood.mid`, `wood.light`.
9. **`cliff_grass`** (strip):
   - Height: 8px vertical face with `moss.mid` top lip and `stone.deep` foot.
10. **Overlays (42 dual-grid masks total)**:
    - `shore_freshwater_mask_{1..14}`: highlight foam (1px) + dithered shallow water (2px, 0.5) over `timber.deep` bank edge.
    - `path_dirt_mask_{1..14}`: packed dirt path edge with `sand.shadow` lip.
    - `path_stone_mask_{1..14}`: flagstone path edge with `stone.light` lip over `stone.deep`.

---

## 2. Visual Inspection (PRD-5)

- **`contact.png`**:
  - Singles at 4× and 3×3 repeats show calm, natural texture distribution.
  - Grass at `swatchTilePx: 256` resolves the 1-clump-per-tile artifact from smaller swatch scales; variants blend across border bands with 0 seam mismatch.
  - Dual-grid shore masks render consistent bilinear contours matching `autotiler.ts`.
- **`field.png`**:
  - Tested contiguous terrain strips: water canal cuts cleanly across grass, sand, mud, reedbed, and boardwalk with crisp transition bands.
- **`level.png`**:
  - Authored canal screen of `aqualia_village` (`rect: [20, 20, 30, 17]`) and full-level overview (`[0, 0, 90, 68]`) display clear navigation lanes:
    - Diver's Pool and Mill Canal basin read distinctly with organic water caustics.
    - Dirt paths and stone walkways stand out against surrounding foliage.

---

## 3. Readability & Contrast Trade-Offs (ART-7.3, WLD-3.3)

- **Grass median lightness**: calibrated to Oklab L ~0.48.
  - Lightness gap to teal creatures (`teal.mid`): **0.152** (exceeds minimum 0.12).
  - Lightness gap to human warm skin (`skin-warm.mid`): **0.257** (exceeds minimum 0.12).
  - Dark actors (`basalt.mid`, `timber.mid`) rely on dark outlines as doctrine dictates.
- **Pair differences**: All defined material pairs (`grass-freshwater`, `grass-dirt`, `grass-sand`, `dirt-sand`) pass contrast requirements.
