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
