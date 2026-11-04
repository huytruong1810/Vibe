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
- `rampShift` (optional): `{"shell": -1}` moves a material's lit steps one notch darker
  (or `1` lighter) while keeping its lighting bands. Use it for a dark material whose
  sunlit top lands on a pale `light` step, for example a charcoal shell that reads lavender and
  fails `valueContrast` on grass. Values are -2, -1 or 1, on recipe material slots.
- `supersample` and `features` (optional, C26): keep body features that are smaller than one
  art pixel at game size (fangs, horns, a lure). `"supersample": 4` bakes an extra albedo pass at
  4 × 4 samples per art pixel. `features` names material slots that win a pixel when enough of
  its samples hit them, but only near a socket and on a host region:
  `"features": {"fangs": {"minSamples": 1, "on": ["pelt", "edge"], "near": ["Socket_Mouth"], "radiusPx": 4, "maxPx": 2}}`.
  - `on`: host slots. `"edge"` allows a fang that hangs past the silhouette.
  - `near`: one socket, or two sockets for a segment (default `Socket_Head` to `Socket_Mouth`).
  - `enclosed: true`: keep a feature only where all eight neighbours are host pixels.
  - `facings`: where the feature is visible. The default is s, se, sw, e and w.
  - `step`: the one ramp step the feature takes. The default is light; deep is for outlines.

  A feature is always at least 2 px, never an orphan (ART-5.4, ART-6.3). Eyes are not features:
  creature faces are runtime decals (ART-8.1, C3b). Without `supersample`, pixelize is unchanged.
- `gen3d.views`: which sheet views feed image-to-3D. Use every view **in the same pose**.
  A sheet that mixes poses (an upright front view and an all-fours side view) fuses into
  a hybrid mesh: drop the odd views here and ask the communicator for a single-pose sheet.
- `texture.views`: which views colour the mesh (default: every prep view). Keep it to
  the views used for gen3d.
- `rig.yawDeg`: quadrupeds are turned head-to-south automatically; shelled (steamshell),
  winged (zephyrit, cindermoth) and mushroom-biped (ignicap) keep the sheet's front view
  facing south (`rig_preview.png` shows the result). If the head points the wrong way, set
  the yaw in degrees.
- `heightArtPx` for winged species is the creature's own height; QA adds the template's
  `gait.hoverPx` (4) because it hovers in idle. Keep `heightArtPx + 4` under the anchor
  headroom (31 px on `creature.small`) or the hover clips lose their top margin. A wide
  wingspan is fitted to the canvas width first, so the height may come out lower than asked:
  the QA `height` detail shows what the span allows.
- `rig.landmarks`: override a misplaced landmark, `{"snout": [x, y, z]}`, in model units
  (the RIG line in `work/<asset>/logs/rig.log` lists every detected landmark). Use it
  when `rig_preview.png` shows a dot off the body, a leg bent the wrong way or a tail
  that doesn't follow the tail. Landmark names per template are in the template's
  `landmarks.note` (`spec/skeletons/<template>.json`): winged adds `wing_l/r_root/mid/tip`,
  `chest`, `hip`; mushroom-biped uses `hip`, `hip_l/r`, `knee_l/r`, `ankle_l/r`, `toe_l/r`,
  `stem_mid`, `cap_base`, `crown`, `face`, `back_top`.
- Changing a recipe re-runs only the stages it affects (`forge.py next` tells you).

## Reference art: `concept` (local image generation, PRD-7)

```json
"concept": {
  "template": "creature-v1",
  "fields": { "species": "...", "element": "...", "size": "...", "stance": "...",
              "description": "...", "anatomy": "...", "colours": "..." },
  "poseGuide": "art/source/style/pose-guides/quadruped.png",
  "references": ["public/assets/portraits/...", "art/source/masters/..."],
  "model": "klein9b"
}
```

- `template` and its fields: `art/source/forge/spec/concept_templates.json`; a missing field
  fails loudly. `references` are identity sources passed as reference images.
- `fields.signature` (optional, C26): the one or two features that must survive at game size, e.g. "two curved saber
  fangs, flaming ember mane". With it, creature and human templates get a readability clause: chunky silhouette, oversized
  head and eyes for creatures (humans keep 4.5-5 heads), signature features exaggerated and separated from the body.
  Without it nothing changes, so existing recipes and their digests hold. Check how much a bigger sprite can grow with
  `forge.py headroom --asset ID` (most assets sit at the 2 px margin on `downed` or a strike, so a larger body needs a
  larger canvas, a spec change under DOC-5).
- `poseGuide`: always set it to the guide for the species' skeleton template. It goes in as the
  first reference image with a fixed clause (match pose, views and layout; take no design).
  Without it the image model drifts to upright or cartoon poses (`docs/engineering/imagegen.md`).

  | skeleton template | `poseGuide` (`art/source/style/pose-guides/`) | concept template |
  | ----------------- | --------------------------------------------- | ---------------- |
  | quadruped         | `quadruped.png` (Rivallie rest pose)          | `creature-v1`    |
  | shelled           | `shelled.png`                                 | `creature-v1`    |
  | winged            | `winged.png` (hover clip, wings up)           | `creature-winged-v1` |
  | mushroom-biped    | `mushroom-biped.png`                          | `creature-biped-v1` |
  | humanoid          | `human.png` (A-pose mannequin, front and back) | `human-apose-v1` |

  Guides are made by `forge.py pose-guide --template <t>` (grey clay of the template fixture,
  laid out on the concept template's canvas; provenance in `<t>.json` beside each PNG).
  `forge.py pose-guide --template <t> --try` runs one test concept with the guide.
  `creature-winged-v1` and `creature-biped-v1` fix the stance themselves (no `stance`
  field) and drop creature-v1's tail clause, so name a tail in `anatomy` only if the species
  has one.
- `model` (optional) overrides `art/source/style/style.json`'s default.
- `forge.py concept --asset <id>` then `forge.py views --asset <id> --pick <cand>`
  (`reference-sheets` skill).

## Held-item recipes (C9b)

```json
{
  "asset": "item:hatchet",
  "kind": "item",
  "ramps": { "blade": "iron", "haft": "wood", "grip": "leather", "lashing": "reed" },
  "gen3d": { "seed": 1234, "steps": 50 },
  "orient": { "lengthArtPx": 13, "gripFraction": 0.15 },
  "item": {
    "model": "auto",
    "grip": "auto",
    "socket": "Socket_Hand.R",
    "iconPivot": "auto",
    "iconScale": "auto"
  }
}
```

- `orient.lengthArtPx`: butt-to-head length on screen. Size it against the body: the
  player is 58 px, so a 40 cm hatchet is about 13. The grip-to-tip reach must stay
  within the 32x32 held canvas (orient refuses more and says so).
- `orient.gripFraction` (default 0.15): where the hand sits, measured from the butt.
- `orient.flipHead` / `orient.flipForward`: the input levers when `orient_preview.png`
  shows the head down or the blade facing backward.
- `orient.minFeaturePx` (default 2, ART-6.3): thin hafts are inflated in the model to
  clear it; never lower it below 2.
- `item.*: "auto"` takes the model, grip, icon pivot and icon scale from `orient`; give
  explicit model-space values only to correct a bad automatic choice.
- `socket`: `Socket_Hand.R` for one-handed tools; add `supportGrip` for two-handed ones.

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
