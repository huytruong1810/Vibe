# Tile set aqualia-grass-water, revision 1

- status: candidate (QA); approval binds to `sourceDigest` 24e5df184266c285cf040b627a849348f59da222875405575906fd78dda37043 (PRD-9)
- recipe: `art/source/tiles/sets/aqualia-grass-water/set.json` (sha 60637d39bd14)
- tiles: 23 at 2x in `tiles/`; `atlas.png` + `atlas.json` for LDtk
- look at: `contact.png` (singles at 4x, 3x3 repeat, variant field, masks over ground), `field.png` (in context at display scale), `level.png` (authored map crop)

## Soft findings

- grass.actorContrast (ART-7.3): lightness gap to actor body tones {'teal.mid': 0.152, 'foliage.mid': 0.114, 'basalt.mid': 0.02, 'skin-warm.mid': 0.257, 'timber.mid': 0.035}; below 0.12: ['basalt.mid', 'foliage.mid', 'timber.mid']

## Runtime ids

- `cliff_grass` <- `tiles/cliff.png`
- `ground_freshwater` <- `tiles/freshwater.png`
- `shore_freshwater_mask_1` <- `tiles/freshwater_shore_mask_1.png`
- `shore_freshwater_mask_10` <- `tiles/freshwater_shore_mask_10.png`
- `shore_freshwater_mask_11` <- `tiles/freshwater_shore_mask_11.png`
- `shore_freshwater_mask_12` <- `tiles/freshwater_shore_mask_12.png`
- `shore_freshwater_mask_13` <- `tiles/freshwater_shore_mask_13.png`
- `shore_freshwater_mask_14` <- `tiles/freshwater_shore_mask_14.png`
- `shore_freshwater_mask_2` <- `tiles/freshwater_shore_mask_2.png`
- `shore_freshwater_mask_3` <- `tiles/freshwater_shore_mask_3.png`
- `shore_freshwater_mask_4` <- `tiles/freshwater_shore_mask_4.png`
- `shore_freshwater_mask_5` <- `tiles/freshwater_shore_mask_5.png`
- `shore_freshwater_mask_6` <- `tiles/freshwater_shore_mask_6.png`
- `shore_freshwater_mask_7` <- `tiles/freshwater_shore_mask_7.png`
- `shore_freshwater_mask_8` <- `tiles/freshwater_shore_mask_8.png`
- `shore_freshwater_mask_9` <- `tiles/freshwater_shore_mask_9.png`
- `ground_freshwater_v1` <- `tiles/freshwater_v1.png`
- `ground_freshwater_v2` <- `tiles/freshwater_v2.png`
- `ground_grass` <- `tiles/grass.png`
- `ground_grass_v1` <- `tiles/grass_v1.png`
- `ground_grass_v2` <- `tiles/grass_v2.png`
- `ground_grass_v3` <- `tiles/grass_v3.png`
