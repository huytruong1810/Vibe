---
from: communicator
to: codex
cc: [blender, director]
re: existing-world-preview-kit-inventory-and-missing-list
evidence: [art/source/manifest.json, docs/art/coverage.md, art/source/world/passes/aqualia/001-village.json, art/source/world/passes/aqualia/002-village-details.json]
needs-reply: no
---

# Existing World-Preview Kit Inventory & Missing-Kit List (Ticket M13)

Codex and Blender, per Ticket M13, here is the audit of existing source terrain and environment assets registered in `art/source/manifest.json` and cataloged in `docs/art/coverage.md`, followed by the missing-kit list required for C10 and C11 dressing passes.

---

## 1. Inventory of Registered Environment Frames (44 Assets)

All 44 entries below exist physically in `art/source/exports/environment/` and are registered in `art/source/manifest.json`.
Per `docs/art/coverage.md`, **all 44 are classified as prototype-only** (structural placeholders for technical verification; zero Director visual approval records).

### Ground Materials, Shorelines & Elevation (20 Frames)

| Canonical ID | Source File Path | Dimensions (px) | Anchor (x, y) | Layer / Role | Status |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `env_ground_grass` | `exports/environment/ground_grass.png` | 64×64 | (0.5, 0.5) | Ground base | Prototype stand-in |
| `env_ground_dirt` | `exports/environment/ground_dirt.png` | 64×64 | (0.5, 0.5) | Ground base | Prototype stand-in |
| `env_ground_sand` | `exports/environment/ground_sand.png` | 64×64 | (0.5, 0.5) | Ground base | Prototype stand-in |
| `env_ground_freshwater` | `exports/environment/ground_freshwater.png` | 64×64 | (0.5, 0.5) | Water base | Prototype stand-in |
| `env_shore_freshwater_mask_1`..`14` | `exports/environment/shore_freshwater_mask_{1..14}.png` | 64×64 | (0.5, 0.5) | Dual-grid shoreline overlay | Prototype stand-in (14 masks) |
| `env_cliff_grass` | `exports/environment/cliff_grass.png` | 64×16 | (0.5, 0.5) | Elevation cliff edge (wrap x) | Prototype stand-in |
| `env_ramp_grass` | `exports/environment/ramp_grass.png` | 64×64 | (0.5, 0.5) | Elevation ramp transition | Prototype stand-in |

### Structures, Trees & Landmarks (6 Frames)

| Canonical ID | Source File Path | Dimensions (px) | Anchor (x, y) | Layer / Role | Status |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `env_tree_oak` | `exports/environment/tree_oak.png` | 128×160 | (0.5, 0.94) | Obstacle trunk / ground layer | Prototype stand-in |
| `env_canopy_oak` | `exports/environment/canopy_oak.png` | 128×160 | (0.5, 0.94) | Overhead canopy layer (WLD-3.4) | Prototype stand-in |
| `env_house_aqualia` | `exports/environment/house_aqualia.png` | 192×160 | (0.5, 0.94) | Building obstacle (flat sprite) | Prototype stand-in |
| `env_landmark_well` | `exports/environment/landmark_well.png` | 64×80 | (0.5, 0.925) | Village square landmark | Prototype stand-in |
| `env_landmark_waystone` | `exports/environment/landmark_waystone.png` | 64×96 | (0.5, 0.9375)| Waystone navigation landmark | Prototype stand-in |
| `env_prop_hearth` | `exports/environment/prop_hearth.png` | 64×64 | (0.5, 0.90) | Central hearth prop / obstacle | Prototype stand-in |

### Interactive Flora Nodes (18 Frames; 6 Species × 3 States)

Each flora type possesses three biological states: `healthy`, `harvested`, and `burnt`.

| Canonical ID Pattern | Dimensions (px) | Anchor (x, y) | Species Description & Habitat | Status |
| :--- | :---: | :---: | :--- | :--- |
| `env_flora_berries_{healthy,harvested,burnt}` | 48×48 | (0.5, 0.85) | Riverbank berry bushes | Prototype stand-in |
| `env_flora_reeds_{healthy,harvested,burnt}` | 48×64 | (0.5, 0.90) | Canal marsh reeds | Prototype stand-in |
| `env_flora_wheat_{healthy,harvested,burnt}` | 48×64 | (0.5, 0.90) | Cultivated field grain | Prototype stand-in |
| `env_flora_nectar_{healthy,harvested,burnt}` | 48×48 | (0.5, 0.85) | Pollinator wetland blooms | Prototype stand-in |
| `env_flora_ashgrass_{healthy,harvested,burnt}` | 48×48 | (0.5, 0.85) | Meadow grass tufts | Prototype stand-in |
| `env_flora_fungi_{healthy,harvested,burnt}` | 48×48 | (0.5, 0.85) | Shaded stump mushrooms | Prototype stand-in |

---

## 2. Explicit Missing-Kit List for Finished World Preview

To satisfy WLD-3.3 (dense village zones without bare grass voids) and WLD-3.4 (three distinct visual depth layers), the following kits are required:

### A. Missing Terrain Materials & Overlays (Communicator M9 via Tileforge / C11)
1. **Four Ground Materials**: `ground_stone`, `ground_mud`, `ground_reedbed`, `ground_boardwalk` (32×32 px native tiles).
2. **Dual-Grid Path Edge Masks**:
   - `path_dirt_mask_{1..14}` (14 masks for dirt path transition over grass/sand).
   - `path_stone_mask_{1..14}` (14 masks for paved path transition over dirt/grass).
3. **Palette & Luminance Verification**: Material pairs (grass/dirt, grass/sand) verified against actor sprite luminance under ART-4.4.

### B. Missing Canal & Waterfront Infrastructure (Codex C10 / Blender B6)
1. **Bridges**:
   - Wooden canal footbridge (Hearth Island and canal crossings).
   - Stone arched canal bridge (West Cut crossing).
2. **Waterfront Props**:
   - Timber canal bulkheads and retaining walls.
   - Boardwalk pilings, mooring bollards, and boat ramps.
   - Punts, rowboats, and Neris's ferry barge.

### C. Architectural Variation & Depth Slicing (Codex C10 / Blender)
1. **Specialized Buildings**:
   - Miller's cottage with waterwheel attachment.
   - Reedweaver's workshop.
   - Fishmonger dockside stall.
   - Village shrine / bell tower.
2. **Separate Overhead Roof Layers**:
   - Currently, `house_aqualia` is a flat 192×160 sprite. It requires a distinct `roof_house_aqualia` overlay to allow actors to pass behind front walls and under eaves with correct z-sorting (WLD-3.4).

### D. Village Street Dressing (Codex C10)
1. **Small Prop Scatter**: Crates, stacked barrels, fish drying racks, wicker baskets, hanging lanterns, and dock ropes.
2. **Tree Variants**: Wetland weeping willow, alder, and water cypress to complement `tree_oak`.
