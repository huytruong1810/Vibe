# Prompt templates

The templates now live in the forge spec, where `forge.py concept` reads them:
`art/source/forge/spec/concept_templates.json` (fixed clauses in CAPS stay verbatim; fields
come from the recipe's `concept.fields`). The project style block and anchors are in
`art/source/style/style.json`. Write fields, never whole prompts (PRD-7.4).

Why "not pixel art" in the style block: image-to-3D reconstructs better from clean colour
regions. The forge produces the pixel look later.

Rivallie anatomy is canon from its portrait: rounded otter-like body and muzzle, cream
belly, aqua crest fins, paddle tail (ART-10).
