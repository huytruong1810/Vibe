---
name: world-builder
description: Author and review Hearthwild LDtk maps through worldforge passes against the protected region plan. Use for settlement layout, roads, canals, habitats and map QA; never edit LDtk JSON directly.
---

# World builder (C6; WLD-4.3)

Run from the repository root through the forge uv environment:

```text
uv run --project art/source/forge python art/source/world/tools/worldforge.py doctor
uv run --project art/source/forge python art/source/world/tools/worldforge.py next --region aqualia --level aqualia_village
```

The canonical project is `art/source/world/hearthwild.ldtk`. Do not write it with
an editor, shell redirect or another script. The director may edit directly in
LDtk; agent authoring must use passes. Never change a protected plan to pass QA.

## Start or replay

`new aqualia` creates both plan levels as drafts and refuses overwrite.
The committed example pass lives under `art/source/world/passes/aqualia/`.
`example aqualia` writes the initial example pass only when that pass is absent;
it does not apply it. Replay committed passes in lexical order with `apply`.
Use an isolated checkout for a fresh replay; preserve the shared project.

## Authoring loop

1. Read the region bible, plan and `docs/engineering/worldforge.md`.
2. Write a version-1 JSON pass under `art/source/world/passes/<region>/`.
   Include the canonical current-project SHA, a unique ID and ordered operations.
3. Run `apply <pass.json>`. Structural failures leave the project unchanged.
   Full completion QA is separate; draft passes need not complete the whole map.
4. Run `check --region aqualia --level <level>`. Fix failures with another pass.
5. Run `render --region aqualia --level <level>`. Open the overview and every crop.
   Describe concrete observations. The render manifest lists each file's SHA.
6. `read_file` image inspection automatically records `<image>.viewed` through
   the track hook. If that hook is unavailable, record the exact image SHA in
   that sidecar only after actually opening the image. This records inspection,
   not director approval. Never pre-mark unseen images.
7. Run `packet --region aqualia --level <level> --revision <positive integer>`.
   It requires current checks, dependencies, viewed images and pass replay.
8. Send the candidate packet to the director through your own comms folder.

## Diagnostic remedies

| Code / failure                 | Remedy                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Stale base / authoring lock    | Reload current project; revise the pass digest. Inspect a lock's owner before removing an abandoned lock.    |
| Structure / reference          | Correct fields, identifiers, definitions, bounds or same-pass references. Do not relax schemas.              |
| Ground / crossing              | Fill ground; use a declared boardwalk/bridge over retained water.                                            |
| Footprint / door               | Paint solid footprints; place the approach adjacent and outside; connect it.                                 |
| Reachability / seam            | Repair the intended route, elevation or ramp; do not invent unrelated crossings.                             |
| Landmark / subject / story     | Return the object to its allowed plan position and framed window.                                            |
| Anchor                         | Add the missing canonical villager role at an appropriate reachable place.                                   |
| Depth                          | Add the intended foreground/middle/background evidence; label placeholders.                                  |
| Stale render / QA / viewed SHA | Render, inspect and check again after changes.                                                               |
| Density concern                | Review reported measurements and screen composition with the director; no numeric aesthetic gate is implied. |

Scope-specific success never certifies unfinished levels. The C6 village example
contains preview artwork and explicit foreground placeholders; Riverlands is draft.
Runtime loading is C7. Approval records and gameplay activation remain separate.

Region-bible checklist: [template](references/region-bible-template.md).
