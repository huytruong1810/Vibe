# Review Packet: Inventory Items Icons (Ticket B23)

- **Date**: 2026-11-04
- **Status**: `candidate`
- **Asset Scope**: All 17 inventory items from `src/content/definitions.ts` without a 3D held-item model
- **Specifications**: `render_spec` canvas `icon.item` (32 × 32 px, max 28 px body box, margin >= 2 px), ART-4/ART-5 palette locking with selective outlines
- **Tool**: `forge.py icon` (C32 2D reduction pipeline with local FLUX.2 [klein] 9B)
- **Contact Sheet**: [`contact.png`](contact.png) (inspected via `read_file` per PRD-5, showing 1x on dark/light and 4x previews)

---

## 1. Inventory Items Roster (17 of 17)

| Item ID | Display Name | Palette Ramps | Kept Candidate | Key Visual Features |
| --- | --- | --- | --- | --- |
| `berries` | Sunberries | `ember, sage, timber` | `i32282` | Cluster of ripe red berries, wooden stem, two green leaf caps with highlights |
| `reeds` | River reeds | `reed, sage, timber` | `i32439` | Flared hourglass tied reed bundle, feathery top fronds, brown twine band |
| `wheat` | Wild wheat | `ochre, sand, timber` | `i32578` | Symmetrical golden wheat sheaf, stepped grain heads, tied waist |
| `nectar` | Nectar blossom | `blossom, gold, sage` | `i32755` | 5-petal pink wildflower, yellow pollen center, opposing green leaf tabs |
| `ashgrass` | Ash grass | `sand, ochre, basalt` | `i33005` | V-shaped dry amber grass tuft, slender blade tips, compact basalt root base |
| `fungi` | Spore fungi | `plum, linen, moss` | `i33627` | Three-tiered purple dome caps, pale linen stems, curved moss mound base |
| `flint` | River flint | `basalt, stone, outline-neutral` | `i34636` | Chipped faceted stone nodule, angled top-lit highlight plane, solid silhouette |
| `stick` | Hardwood stick | `wood, timber` | `i34898` | Diagonal cut branch with trimmed knots along bark, pale circular cut face |
| `fiber` | Reed fiber | `reed, linen, sail` | `i35179` | Figure-eight spun twine skein bundle, wrapped central waist, dual loops |
| `tool-head` | Tool head · WIP | `stone, basalt` | `i4203` | Ground trapezoidal stone celt axe blade, chamfered bevels, curved cutting edge |
| `poultice` | Herbal poultice | `sage, moss, linen, timber` | `i36349` | Neat rolled linen compress, centered twine bow tie, medicinal leaves |
| `water` | Spring water | `water, glass, sand, wood` | `i36836` | Glass flask bottle, wooden cork stopper, bright sparkling turquoise water fill |
| `ore` | Copper ore | `copper, basalt, stone` | `i37091` | Rocky mineral ore nugget with metallic orange-copper veins across ridges |
| `meat` | Wild meat | `crimson, ember, linen` | `i37270` | Raw red steak cutlet, pale marrow bone center, fat marbling seams |
| `meal` | Nectar roast | `ember, ochre, timber, gold` | `i37418` | Three glazed grilled meat cubes on wooden skewer, golden nectar highlights |
| `arrow-bundle` | Arrow bundle | `wood, stone, sail, timber` | `i37631` | Tied bundle of 4 hunting arrows, dark flint points, pale feather fletchings |
| `garment` | Regional garment | `linen, teal, leather` | `i37924` | Neatly folded cream linen tunic, layered fold edges, stitched teal collar |

---

## 2. Technical Validation

- **Resolution**: Exactly 32 × 32 px per icon.
- **Palette**: Quantized to doctrine palette ramps (`art/source/forge/spec/palette.json`). 0 off-palette colors.
- **Outlines**: Selective 1 px outline (`deep` of bordering ramp, top-lit `shadow` on upper-left edges per ART-5.1/5.2).
- **Margins**: Body boxes fit within 28 × 28 px, preserving required margin >= 2 px.
- **Hygiene**: 0 orphan pixels across all 17 icons.

All icons are staged in `art/source/ui/icons/items/` ready for manifest integration by Communicator (Ticket M26).
