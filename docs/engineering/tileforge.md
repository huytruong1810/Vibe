# tileforge

tileforge turns concept swatches into palette-locked 32-px terrain tiles (ART-11.2).
It was built by Claude under codex ticket C11; codex maintains it under DOC-5. The
operator procedure is the `tile-forge` skill (`.agents/skills/tile-forge/SKILL.md`).

```
uv run --project art/source/forge python art/source/tiles/tools/tileforge.py selftest
```

## Layout

| Path                                        | What                                                             | Owner              |
| ------------------------------------------- | ---------------------------------------------------------------- | ------------------ |
| `art/source/tiles/spec/tile_spec.json`      | tile size, export scale, dual-grid bits, QA limits, variant pick | doctrine-protected |
| `art/source/tiles/spec/tileset.schema.json` | recipe schema                                                    | doctrine-protected |
| `art/source/tiles/tools/`                   | `tileforge.py` CLI and `tilelib/`                                | codex              |
| `art/source/tiles/sets/<set>/`              | `set.json` recipe and `swatches/`                                | communicator       |
| `art/source/tiles/work/<set>/`              | build output, QA and previews (gitignored)                       | tool               |
| `art/review/tiles-<set>-<n>/`               | packet: 2× tiles, atlas, previews, `review.json`                 | tool               |
| `art/source/staging/tiles/<set>.json`       | publish record (approval, digest, exports)                       | tool               |

## Pipeline

1. **Material** (`tilelib/material.py`):
   - downscale the swatch to art px (box filter) and take Oklab L;
   - search the window, plus a 6-px overlap, whose overlap strips match best with the
     most even lighting;
   - cross-fade the overlap so column 0 continues column 31 as the swatch did;
   - zero the tile-length Fourier harmonics (the grid-forming lighting);
   - quantise by rank to the recipe proportions;
   - clear isolated pixels (wrap-aware).

   Variants come from other windows. They are mixed into the base with a
   variance-preserving fade, and their 2-px border band is the base's exactly.

2. **Overlay** (`tilelib/dualgrid.py`):
   - 16 masks (bits NW=1, NE=2, SW=4, SE=8);
   - the shoreline is the 0.5 contour of the autotiler's bilinear corner field, moved
     along its normal by a one-tile-period wobble;
   - distance uses the analytic gradient, so it agrees across tile borders;
   - bands are pixel distances from that contour; Bayer 2×2 dithering is optional;
   - specks under 10 px are removed unless they touch the tile edge.

   The material body is copied, so mask 15 equals the full material tile.

3. **Strip**: a material with `wrap: "x"`, `heightPx`, and `rows` overrides
   (the cliff lip and foot).
4. **QA** (`tilelib/pipeline.py`): hard checks decide `draft` or `candidate`; see the
   skill's table.
5. **Previews** (`tilelib/preview.py`) composite like `renderer.drawChunk`: ground on
   the primary grid, overlays half a tile up-left, mask 15 = the material. The map crop
   reads `art/source/world/hearthwild.ldtk` through the recipe's `binds`.
6. **Packet and publish** (`tilelib/packet.py`):
   - `sourceDigest` hashes the recipe, swatch digests, QA checks and every 2× tile;
   - publish requires `docs/team/comms/director/approvals/tiles-<set>--*.md` with
     `decision: director-approved` and a matching `packetDigest` (PRD-9);
   - it then copies runtime ids to `art/source/exports/environment/`.

   `art/source/pipeline/rebuild.py` skips any export a staging record owns.

## Runtime contract (for C11b)

- Ids the renderer draws today: `ground_grass`, `ground_dirt`, `ground_sand`,
  `ground_freshwater`, `cliff_grass`, `ramp_grass`, and `shore_freshwater_mask_{1..14}`.
  A published set that uses these ids changes the game after `npm run assets:build`.
- **Variants** are published as `<runtimeId>_v<k>`. The renderer must choose them with
  `fmix32(cellHash(x, y)) % (1 + variants)` (`tile_spec.json` `variantPick`). Raw
  `cellHash % 4` repeats diagonally.
- Other overlays (path edges, sand shores, reedbed) follow the same dual-grid
  convention under their `runtimeIdTemplate`. The renderer currently draws only the
  freshwater overlay with tiles, and road and other fluids with flat rectangles.
- Cliff strips are 32×8 art px per elevation step (64×16 exported). The renderer draws
  `cliff_grass` per step.

## C11b consumers and isolated proof

`TerrainArtIndex` selects native variants with the shared unsigned hash, indexes
only usable environment appearances, and caches mask lookups. A base plus contiguous
`_v1`, `_v2`, etc. forms a family; a gap does not silently substitute a differently
numbered variant. Selection uses global tile coordinates, including across render
cache regions. It consumes no simulation random stream.

Mask families resolve in this order: `path_<surface>` for path layers or
`shore_<surface>` for water/ground layers, then `ground_<surface>`, then `<surface>`.
Append `_mask_1` through `_mask_14`. Zero draws nothing; fifteen selects the full
material variant. Missing art retains the bounded rectangle fallback. Runtime fluid,
ice, dirt, stone and boardwalk overlays are separate. Optional sand/stone/mud/reedbed
ground transitions are drawn when their masks exist.

`TerrainView` accepts optional read-only `ground`/`surface` numeric presentation
channels and corresponding `groundNames`/`surfaceNames` legends. The primary ground
wins over the effective surface, retaining reedbeds and ground beneath boardwalks.
The authored loader already supplies these arrays and legends; C7 activation must
connect them alongside scene bounds/coverage. Current procedural worker output is
unchanged. These fields never determine traversal, collision or damage.

Worldforge uses `CatalogTileSet`, a catalog-backed adapter to `TileSet.compose`.
It restores packed trim before sampling at art resolution, respects the same variant
coordinates and mask-family precedence, composites water before paths, and labels
other preview objects through the existing review renderer. The compositor accepts
a global origin; full-mask tiles now vary by that coordinate instead of always
sampling material variant zero. World inspection dependency hashes include tileforge
code and specs. Rendering changes invalidate prior receipts; old inspection markers
must not be reused without opening the new images.

`npm run assets:coverage` refreshes the normal coverage report from the existing
catalog without rebuilding any atlas. Terrain page costs are reported once per
referenced page/resolution; pages shared with actors are not additional allocations.
The production catalog currently adds zero pages: its shared page costs 14.97 MiB
full / 7.95 MiB half. The existing quality-tier residency limits remain enforced.

For a non-production integration fixture, run `npm run terrain:proof`. It verifies
the golden packet PNG hashes, copies exact exports into isolated scratch space,
uses official AssetPack (2048 maximum, padding, preserved trim, no rotation), and
renders an authored-village proof. The browser journey routes its prototype catalog
only inside the test. It never publishes tiles, modifies a production catalog,
creates an approval or switches new-game maps. Golden swatches remain procedural
stand-ins. The live capture shows the current procedural village; the authored
worldforge proof is a separate scene, not evidence of C7 activation.
