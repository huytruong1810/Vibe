---
name: reference-sheets
description: >-
  Produces doctrine-standard reference sheets (A-pose human sheets, creature sheets,
  prop, building and body-type sheets) with the forge's local image generation
  (`forge.py concept`, then `forge.py views`) and commits them under art/source/references/. Blender's skill (since
  2026-11-02): use when a character, creature, prop or gear part needs input for the
  3D forge, or a forge run shows the sheet needs a missing or cleaner view.
---

# Reference sheets (doctrine PRD-3, PRD-7)

Reference sheets are the **only** input the 3D forge gets. Their quality caps the
quality of every sprite made from them. Since 2026-11-02 you generate them **locally**
with the forge (no quota): `concept` makes candidate sheets with every view in one image,
you pick one, `views` splits it and writes the sheet. One style comes from the spec
templates and `art/source/style/style.json`, so never write free-form prompts.

## Steps

1. **Collect identity.** Open the identity sources and _look at them_: the approved
   portrait (`public/assets/portraits/...`), the master or lineup in `art/source/masters/`,
   and the profile in `src/content/` (read only). Note shapes, colours and signature details.
2. **Write the recipe's `concept` block** (`art/source/forge/recipes/<asset>.json`):
   ```json
   "concept": {
     "template": "creature-v1",
     "fields": { "species": "Rivallie", "element": "water", "size": "small to medium",
                 "stance": "standing on all four legs", "description": "...",
                 "anatomy": "...", "colours": "..." },
     "poseGuide": "art/source/style/pose-guides/quadruped.png",
     "references": ["public/assets/portraits/creatures/portrait_rivallie.jpg",
                    "art/source/masters/rivallie_turnaround_master.jpg"]
   }
   ```
   Templates (spec `concept_templates.json`): `creature-v1` (front, left, back; quadruped and
   shelled), `creature-winged-v1` and `creature-biped-v1` (front, left, back; stance built in,
   no `stance` field, no tail unless `anatomy` names one),
   `human-apose-v1` (front, back), `prop-v1` (three-quarter), `building-v1` (front, left).
   `stance`: quadruped and shelled "standing on all four paws with its body horizontal, never sitting or standing upright", winged "in flight with both
   wings spread wide", mushroom-biped "standing upright on two legs".
   `poseGuide`: always set it to the guide for the species' skeleton template:
   `art/source/style/pose-guides/{quadruped,shelled,winged,mushroom-biped,human}.png`
   (table in `art/source/forge/recipes/README.md`). The guide fixes pose and layout. The
   fields and references fix the design.
3. **Generate:** `forge.py concept --asset <id> [--n 4]` (model: `klein9b`, the only one installed). It writes
   `work/<id>/concept/` and a contact sheet.
4. **Look at the contact sheet** (`read_file`) and run the checklist below on each
   candidate. None passes? Fix the fields or references and run `concept` again; don't just
   roll seeds (PRD-7.3).
5. **Keep one:** `forge.py views --asset <id> --pick <candidate id>`. It splits the views on
   the flat background, writes `art/source/references/<id>/` with `sheet.json` (a
   `generator` provenance block), and adds a row to your image ledger. If it reports the
   wrong subject count, pick another candidate.
6. **Look at every written view**, set `ramps` in `sheet.json` for a new asset
   (palette ramp names per material), then `forge.py next --asset <id>` and run the forge.
   If the forge shows a sheet problem (fused poses, wrong proportions, baked shadows), fix
   it here: new fields or references, a new `concept`, a new pick.

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

## Ledger

`forge.py views` writes the row itself in `docs/team/comms/blender/image-ledger.md` (date,
model, seed, template, kept file); full prompts and every candidate stay in
`work/<asset>/concept/concept-*.json`.

## Never

- Never use generated images as game frames or turnarounds (PRD-7.2).
- Never generate terrain tiles, faces or palettes for final use (they must be pixel-exact).
- Never write a prompt outside the templates, and never use the pixel-art masters as style anchors.
