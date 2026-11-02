---
name: tile-forge
description: >-
  Makes terrain tile sets (ground materials, shorelines and path edges as dual-grid
  masks, cliff strips, ramps) from concept swatches with tileforge: palette-locked
  32-px tiles, seamless, with QA, previews on the real map and a director packet.
  Use for blender's terrain ticket (formerly communicator M9) and any ground, water, path or cliff art (ART-11.2).
---

# Tile forge (doctrine ART-11.2, ART-11.3, ART-7.3, WLD-4.2, PRD-9)

Terrain is **2D**: you design it, tileforge makes it exact. You never hand-pixel tiles
and you never edit the output PNGs. The **swatch** gives structure (where it is light or
dark, the shape of blades, stones, ripples). The **recipe** gives the colours (at most
four palette values per material) and how much of each. tileforge does the rest:

- quantising to the palette;
- seamless wrapping and variants that fit every other tile;
- the 14 dual-grid shore or edge masks matching `src/presentation/autotiler.ts`;
- the 2× export.

```
uv run --project art/source/forge python art/source/tiles/tools/tileforge.py <command>
```

## Loop (one material or overlay at a time, PRD-4)

1. **Scaffold** once per set: `tileforge.py new <set>` writes
   `art/source/tiles/sets/<set>/set.json` and `swatches/`.
2. **Make a swatch** (image generation is allowed for 2D, PRD-7; log it in your
   `image-ledger.md`). The prompt pattern is below. Save it as
   `art/source/tiles/sets/<set>/swatches/<material>.png`.
3. **Write the recipe entry** (schema: `art/source/tiles/spec/tileset.schema.json`):
   - values come from `art/source/forge/spec/palette.json`, dark to light;
   - set proportions;
   - set `swatchTilePx` (how many swatch pixels make one 32-px tile, default 128);
   - set variants;
   - set `binds`, the map layer and values it covers, so the map preview uses it.
4. **Run** `tileforge.py all --set <set>`.
5. **LOOK at every preview** with `read_file` before you say anything about it (PRD-5):
   - `work/<set>/contact.png`: singles at 4×, a 3×3 repeat, a field of mixed variants,
     and every mask over ground;
   - `work/<set>/field.png`: everything in context at display scale;
   - `work/<set>/level.png`: the authored map (`preview.level` and `preview.rect`).
     Write what you see in your session log.
6. **Fix the input, never the output.** See the table below. Re-run `all`.
7. When QA is `candidate` and the previews read well:
   - run `tileforge.py packet --set <set>`;
   - write `art/review/tiles-<set>-<n>/DIGEST.md`, saying what you looked at and the
     soft findings;
   - message the director.
8. **Publish** only after the director's record exists: `tileforge.py publish --set <set>`
   (the record binds to the packet's `sourceDigest`; a rebuild needs a new record).
   Publish replaces the runtime tiles in `art/source/exports/environment/` and writes
   `art/source/staging/tiles/<set>.json`. Then:
   - add manifest entries for any ids it lists as `awaitingManifest` (you integrate
     `manifest.json`);
   - ask codex to run `npm run assets:build`.

## Swatch prompt pattern

> Seamless top-down pixel-art ground texture, **<material>**, orthographic, flat even
> lighting with no shadows from objects, no vignette, no objects, no borders, no grid
> lines, no text; uniform scale; <the feature: short upright grass blades with small
> clumps / packed earth with a few pebbles / rippled shallow water with thin bright
> caustic lines>; palette <the ramp names' colours>; 1024×1024.

What makes a good swatch:

- even lighting (tileforge removes tile-length lighting waves, but lit corners waste
  contrast);
- features small next to a tile (a tile is 1/8 of a 1024 px swatch at
  `swatchTilePx` 128);
- **no single distinctive feature**: a lone flower or rock repeats visibly on every tile;
- nothing but the material (no props, paths or grid).

## Design rules that keep the ground readable

- **One dominant value.** Give the mid value about 60–70% (`proportions`). Keep accents
  small (about 5–15%). Busy, high-contrast ground shows a grid when it repeats and
  hides actors.
- **Actors must read on the ground (ART-7.3).** QA's soft `actorContrast` lists actor
  body tones too close in lightness. The golden sample darkens grass to Oklab L 0.48 so
  teal and green creatures clear it by 0.12 or more. Dark actors (basalt, timber) then
  rely on their outlines. Write down the trade-off you choose.
- **Materials that meet must differ** (`pairs`, WLD-3.3): grass and dirt paths need a
  clear lightness gap so routes read.
- Variants: 2–3 for large ground areas, 0–2 for water. Every variant shares a 2-px
  border with the base so all of them fit together. Keep that border calm by choosing an
  even swatch.
- Overlays (shores, path edges): edge bands are listed from the contour inward
  (`inside`) and outward (`outside`). Use an outline (1 px, dark), a foam or lip (1 px),
  and a 2-px shallow band with `dither` 0.5. Dithering is for water and large surfaces
  only (ART-11.3). Keep `noise` (shore wobble, px) at about 1–2; more turns ragged.
- Cliffs are strips: `"wrap": "x"`, `"heightPx": 8` per elevation step, with `rows` for
  the grass lip (row 0) and the dark foot (row -1).

## QA: what fails and what to change

| Check                                                           | Means                                                                  | Change                                                          |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `palette`, `valueCount` (hard)                                  | colours outside the recipe, or more than 4                             | never edit PNGs; fix `values`                                   |
| `seamless` (hard)                                               | a seam is rougher than any line inside the tile                        | a more even swatch; larger `swatchTilePx` for larger features   |
| `lowFrequency` (hard)                                           | a tile-length light/dark wave that shows as a grid                     | an evenly lit swatch, or `flatten` 4–8                          |
| `orphans` (hard)                                                | isolated pixels (noise, not clusters)                                  | raise `cluster` (0.6–1.2)                                       |
| `variantBorders` (hard)                                         | a variant no longer fits the others                                    | never edit PNGs; rebuild                                        |
| `bodyMatch`, `cornerBits`, `edgeContinuity`, `hardAlpha` (hard) | a shore or edge mask no longer matches the autotiler or its neighbours | never edit PNGs; rebuild; report to codex if it persists        |
| `proportions` (soft)                                            | value shares drift from the recipe                                     | the swatch lacks that structure; adjust `cluster` or the swatch |
| `actorContrast`, `pair.*` (soft)                                | readability (ART-7.3, WLD-3.3)                                         | move the material's values                                      |

`tileforge.py next --set <set>` always says what to do next. `tileforge.py selftest`
proves the tool works on this machine. Run it first in a new session.

## Never

- Edit tiles, atlases, `art/source/exports/**` or packets by hand. Exports are written
  only by `publish`.
- Write or commit `docs/team/comms/director/**` (TEAM-2a).
- Change `art/source/tiles/spec/**` or the tool. Ask codex via your comms.
