# Forge recipes

One JSON file per asset, named by the asset slug (`npc:neris` → `npc-neris.json`).
Written by the blender lane; read by `forge.py`. Values must come from the doctrine
spec (`../spec/`); a recipe never overrides spec numbers.

```json
{
  "asset": "rivallie",
  "kind": "creature",
  "heightArtPx": 31,
  "ramps": { "body": "teal", "belly": "cream", "fins": "glass" },
  "gen3d": { "seed": 1234, "steps": 50, "views": ["left"] },
  "texture": { "views": ["left"] },
  "rig": { "yawDeg": null, "landmarks": {} }
}
```

- `heightArtPx`: tallest on-screen extent above the anchor across all facings (ART-6.1;
  humans use their build's crown height from `body_types.json` plus hair). If QA
  `margins` fails because a long tail or a lying clip leaves the canvas, lower it by
  1–3 px; never ask for a bigger canvas.
- `ramps`: one palette ramp per material region (names from `palette.json`). Body
  regions only; eyes and mouth come from the face layer (ART-8). At most the colour
  budget in ART-4.4.
- `gen3d.views`: which sheet views feed image-to-3D. Use every view **in the same pose**.
  A sheet that mixes poses (an upright front view and an all-fours side view) fuses into
  a hybrid mesh: drop the odd views here and ask the communicator for a single-pose sheet.
- `texture.views`: which views colour the mesh (default: every prep view). Keep it to
  the views used for gen3d.
- `rig.yawDeg`: creatures are turned head-to-south automatically (`rig_preview.png`
  shows the result). If the head points the wrong way, set the yaw in degrees.
- `rig.landmarks`: override a misplaced landmark, `{"snout": [x, y, z]}`, in model units
  (the RIG line in `work/<asset>/logs/rig.log` lists every detected landmark). Use it
  when `rig_preview.png` shows a dot off the body, a leg bent the wrong way or a tail
  that doesn't follow the tail.
- Changing a recipe re-runs only the stages it affects (`forge.py next` tells you).

## Human recipes

```json
{
  "asset": "player-aqualia",
  "kind": "human",
  "heightArtPx": 58,
  "ramps": { "skin": "skin-warm", "hair": "hair-teal", "tunic": "teal" },
  "gen3d": { "views": ["front", "back"] },
  "rig": { "landmarks": { "wrist_l": [0.42, 0.05, 0.71] } },
  "clips": { "work": { "segments": [{ "lib": "ual2", "action": "TreeChopping_Loop" }] } }
}
```

- Human landmarks you can override: `crown`, `head_base`, `neck_base`, `pelvis`,
  `spine_01..03`, `clavicle_l/r`, `shoulder_l/r`, `elbow_l/r`, `wrist_l/r`,
  `hand_end_l/r`, `palm_l/r`, `hip_l/r`, `knee_l/r`, `ankle_l/r`, `ball_l/r`,
  `toe_l/r`, `face`, `back`. The RIG line in `work/<asset>/logs/rig.log` lists what was
  detected.
- `clips.<name>.segments` swaps a clip's source animation for this character (names in
  `spec/clips/humanoid.json`; libraries `ual1` and `ual2`). Use it for a villager's own
  work, for example `TreeChopping_Loop` for anyone carrying the hatchet.

## Colour inputs (C3d)

- `detailSlots`: ramp slots that are small on purpose (fangs, eyes, a lure). Pixelize
  merges material regions smaller than 2% of the silhouette into their surroundings, to
  remove highlight speckles; listed slots are exempt. Example: `"detailSlots": ["fangs"]`.
- `texture.mirrorSides` (default `true` for creatures, `false` for humans): the left view
  also paints the right flank. Set it to `false` for an asymmetric creature and provide a
  `right` view instead.
- Surfaces no view sees head-on (the top of a back, the underside) take colour from their
  neighbours, not from the nearest view. Bring in a view that shows a surface if its colour
  matters.
