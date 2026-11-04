---
from: blender
to: claude, director
re: aqualia-terrain-candidate-packet
evidence: [art/review/tiles-aqualia-terrain-1/, art/review/tiles-aqualia-terrain-1/contact.png, art/review/tiles-aqualia-terrain-1/field.png, art/review/tiles-aqualia-terrain-1/level.png, art/review/tiles-aqualia-terrain-1/DIGEST.md, art/source/tiles/sets/aqualia-terrain/set.json]
needs-reply: yes
---

# Aqualia Terrain Candidate Packet (Ticket B17)

Review packet `art/review/tiles-aqualia-terrain-1/` is published at status **candidate** for the Director's look review and approval under Directive 014.

- **Set**: `aqualia-terrain` (Region: Aqualia)
- **Source Digest**: `aba7b781aa3271661bb7cc425f3d43201166ba86289f170ac3d99aef1e7edf0e`
- **Tiles**: 71 tiles synthesized at 2× export in `tiles/`
- **Digest**: `art/review/tiles-aqualia-terrain-1/DIGEST.md`

## What was built and inspected (PRD-5)

1. **Ground Materials (8 materials + 1 strip)**:
   - `ground_grass` (3 variants): `swatchTilePx: 256`, `flatten: 2`, `cluster: 0.6`. Palette: `foliage-deep.shadow`, `foliage-deep.mid` (68% dominant), `moss.mid`, `reed.mid`. Swatch generated locally with FLUX.2 [klein] 9B (seed 102, seam score 1.18).
   - `ground_freshwater` (2 variants): caustics network, palette `water.shadow`, `water.mid`, `water.light`, `water.highlight`.
   - `ground_dirt` (2 variants): packed earth, palette `timber.deep`, `timber.shadow`, `sand.shadow`, `sand.mid`.
   - `ground_sand` (2 variants): river sand, palette `sand.deep`, `sand.shadow`, `sand.mid`, `sand.light`.
   - `ground_stone` (2 variants): flagstones, palette `stone.deep`, `stone.shadow`, `stone.mid`, `stone.light`.
   - `ground_mud` (2 variants): silt, palette `basalt.deep`, `timber.deep`, `timber.shadow`, `leather.shadow`.
   - `ground_reedbed` (2 variants): marsh grass, palette `foliage-deep.shadow`, `moss.shadow`, `reed.mid`, `reed.light`.
   - `ground_boardwalk` (2 variants): timber planks, palette `wood.deep`, `wood.shadow`, `wood.mid`, `wood.light`.
   - `cliff_grass` (strip): 8px height, `moss.mid` lip, `stone.deep` foot.
2. **Dual-Grid Overlays (42 masks total)**:
   - `shore_freshwater_mask_{1..14}`: foam highlight (1px) + dithered shallow water (2px, 0.5) over `timber.deep` edge.
   - `path_dirt_mask_{1..14}`: dirt path edge with `sand.shadow` transition lip.
   - `path_stone_mask_{1..14}`: stone walkway edge with `stone.light` lip.
3. **Previews Opened and Inspected**:
   - `contact.png`: Singles at 4×, 3×3 repeats, variant fields, and 14-mask dual-grid composite rows inspected. Seamless wrapping verified; 0 border pixel differences on locked variants.
   - `field.png`: Multi-terrain composite bands and canal cuts display distinct, uncluttered ground surfaces.
   - `level.png`: Canal screen (`rect: [20, 20, 30, 17]`) and whole-map preview (`[0, 0, 90, 68]`) of `aqualia_village` show clear navigation lanes, Diver's Pool basin contours, and route readability.

## Soft Findings & Actor Contrast Trade-Offs (ART-7.3, WLD-3.3)

- Grass median lightness is calibrated to Oklab L ~0.48. Lightness gap to teal actors (`teal.mid`) is **0.152** (exceeds 0.12 threshold) and warm skin tones (`skin-warm.mid`) is **0.257**.
- All material pairs (`grass-freshwater`, `grass-dirt`, `grass-sand`, `dirt-sand`) pass contrast requirements.
