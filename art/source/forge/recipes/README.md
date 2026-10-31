# Forge recipes

One JSON file per asset, named by the asset slug (`npc:neris` → `npc-neris.json`).
Written by the blender lane; read by `forge.py`. Values must come from the doctrine
spec (`../spec/`); a recipe never overrides spec numbers.

```json
{
  "asset": "rivallie",
  "kind": "creature",
  "heightArtPx": 34,
  "ramps": { "body": "teal", "belly": "cream", "fins": "glass" },
  "gen3d": { "seed": 1234, "steps": 50, "views": ["front", "left", "back"] }
}
```

- `heightArtPx`: tallest on-screen extent above the anchor across all facings (ART-6.1;
  humans use their build's crown height from `body_types.json` plus hair).
- `ramps`: one palette ramp per material region (names from `palette.json`). Body
  regions only; eyes and mouth come from the face layer (ART-8). At most the colour
  budget in ART-4.4.
- `gen3d.views`: which sheet views feed image-to-3D. Use every consistent view.
- Changing a recipe re-runs only the stages it affects (`forge.py next` tells you).
