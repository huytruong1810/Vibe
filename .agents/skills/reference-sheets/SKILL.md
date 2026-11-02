---
name: reference-sheets
description: >-
  Produces doctrine-standard reference sheets (A-pose human sheets, creature sheets,
  prop, part and body-type sheets) with image-generation subagents, within the
  quota budget, and commits them under art/source/references/. Use when a
  character, creature, prop or gear part needs input for the 3D forge, or when
  blender requests a missing view.
---

# Reference sheets (doctrine PRD-3, PRD-7)

Reference sheets are the **only** input the 3D forge gets. Their quality caps the
quality of every sprite made from them. Image generation is **quota-bound**:
spend it deliberately.

## Budget (PRD-7.3)

- At most **4 generations per reference sheet**, **2 per prop or part sheet**.
- Over budget? Stop and message the director with the best attempt and what is wrong.
- Log every generation in `docs/team/comms/<you>/image-ledger.md` (format below).

## Steps

1. **Collect identity.** Open the identity sources and _look at them_
   (`read_file` on the images): the approved portrait
   (`public/assets/generated/portrait_<kind>_<id>_128.png`), the master or
   lineup in `art/source/masters/`, and the character's profile (role,
   age, personality) in `src/content/villagers.ts` (read only). Note hair shape and colour,
   costume layers, signature item, skin tone, and palette ramps from
   `art/source/forge/spec/palette.json`.
2. **Pick the template** from [references/prompt-templates.md](references/prompt-templates.md):
   human A-pose, creature, prop, part, or body-type mannequin.
3. **Fill the template.** Keep every fixed clause. Front and back go in one
   generation (side by side) when the template allows.
4. **Generate** with an image-generation subagent. Record prompt ID, seed (if
   given) and output path in the ledger.
5. **Look at the result** (`read_file`) and run the checklist below. Reject and
   regenerate only for a checklist failure, and state which one in the ledger.
6. **Save** the kept images in `art/source/references/<asset-id>/` (`front.png`,
   `back.png`, `side.png`, `prop-<name>.png`) and write `sheet.json`:
   ```json
   {
     "asset": "npc:neris",
     "kind": "human",
     "bodyType": "elder",
     "identitySources": [
       "public/assets/generated/portrait_npc_npc_neris_128.png",
       "art/source/masters/aqualia_villagers_lineup_a.jpg"
     ],
     "views": { "front": "front.png", "back": "back.png" },
     "props": { "ferry-pole": "prop-ferry-pole.png" },
     "ramps": { "skin": "skin-warm", "hair": "hair-silver", "coat": "navy", "trim": "teal" },
     "generations": 3,
     "ledger": "docs/team/comms/communicator/image-ledger.md#npc-neris"
   }
   ```
7. **Message** codex and blender (`team-comms` skill) with the folder path and
   what you saw. Status is `draft` until the forge consumes it.

## Acceptance checklist (look, don't assume)

- [ ] Full body visible head to feet; nothing cropped; plain light-grey background.
- [ ] Human: A-pose (arms about 45° out, palms in, legs slightly apart), front-facing,
      orthographic look (no strong perspective), neutral expression.
- [ ] Proportions about 4.5–5 heads tall (measure: image height ÷ head height).
- [ ] **Hands empty**; no bag straps or tools fused to the body (those are prop sheets).
- [ ] Identity matches the sources: hair, costume colours, signature shapes.
- [ ] Back view (if made) matches the front: same costume, same hair mass.
- [ ] No text, watermark, frame, ground shadow blob or extra characters.
- [ ] Creature: limbs and tail separated from the body; mouth closed; neutral stance.

## Ledger format (`image-ledger.md`)

```markdown
## npc-neris

| # | date (UTC) | template | purpose | result | kept? | why |
| 1 | 2026-11-01 14:05 | human-apose v1 | front+back | refs/npc-neris/gen1.png | no | holding pole (fused prop) |
| 2 | 2026-11-01 14:12 | human-apose v1 | front+back | refs/npc-neris/gen2.png | yes | passes checklist |
```

## Never

- Never use generated images as game frames or turnarounds (PRD-7.2).
- Never generate terrain tiles, faces or palettes for final use (they must be pixel-exact).
- Never exceed the budget silently.
