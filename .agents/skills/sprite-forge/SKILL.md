---
name: sprite-forge
description: >-
  Runs the Hearthwild Sprite Forge on machine A to turn a reference sheet into
  layered pixel-art sprites (body clips, face layer, held-item layers), checks QA,
  looks at the contact sheet and produces a director review packet. Use for any
  character, creature or prop sprite work, any 3D/Blender request, or any QA failure
  from the forge.
---

# Sprite Forge runbook (doctrine PRD-1…PRD-9)

You operate the forge; the forge makes the art. Your jobs: run the next command,
**look at the output**, fix **inputs** when QA fails, report honestly.

```
F="uv run --project art/source/forge python art/source/forge/forge.py"
```

## 0. Gate (check every session)

```
$F doctor
```

It must report your asset's class ready **and** `docs/team/comms/codex/` or
`docs/team/comms/claude/` must contain a `--to-blender--go-<class>-` message naming
that class. Otherwise stop: message codex with the doctor output, mark the ticket
`blocked:` and take the next one.
The old box-modelling scripts were deleted; never recreate them.

## 1. The loop: one asset at a time (PRD-4.2)

```
$F next --asset <asset-id>      # prints the exact next command, or BLOCKED: <reason>
```

Run exactly what it prints. Repeat. Built order for creatures and humans: `prep → gen3d → clean →
texture → rig → animate → bake → pixelize → qa → packet`. (`fit`, human `faces` and `items`
remain C9b; creature faces use the separate sidecar command below.) Humans need an **A-pose** sheet
(PRD-3.1) at 4.5–5 heads (L3); their clips come from the UAL animation libraries.

After **every** stage that writes images, open the PNG it names with `read_file` and
write one line in your session log saying what you saw:

- `gen3d/preview.png`: one creature in **one pose**. Two bodies fused together means a
  mixed-pose sheet (recipes README, `gen3d.views`).
- `texture_preview.png`: colours sit on the right parts.
- `rig_preview.png`: red dots on the body (head, spine, legs), yellow dots along the
  tail; in the stride, rear-up and head-turn test poses nothing tears, stretches into
  spikes or leaves parts behind.
  Humans: red dots on the joints (crown, neck, shoulders, elbows, wrists, hips, knees,
  ankles), blue dots on the face and back; in the arms-up, stride and bend test poses
  the arms lift from the shoulders and the legs bend at the knees.
- `contact.png` (after `qa`): rest pose in 8 facings on grey and grass, then one row
  per clip. Also open `art/review/<packet>/clips/<clip>.gif` for walk, run and idle
  after `packet`: legs should step, not slide or swim.

## 1b. Is the forge itself healthy?

```
$F selftest
```

Runs the forge on built-in fixtures (a human mannequin and a copy of Rivallie) and
checks rig weights, landmarks, clip matrix, canvases, margins and anchors. `PASS` means
the forge works; `FAIL` means message codex with the output. Run it when a stage
behaves strangely before you change any input.

## 2. QA and the contact sheet

`qa` writes `art/source/forge/work/<asset>/qa_report.json` and `contact.png`.

1. Open `contact.png` (`read_file`). The packet step refuses until you have
   opened the current version.
2. Read the report. Every failed check names a doctrine ID.
3. Fix the input with the table in [references/qa-fixes.md](references/qa-fixes.md).
   Never edit the spec, QA limits or forge code (PRD-6.3).
4. Re-run from the stage the table names (`next` tells you).

## 3. Packet and handoff

```
$F packet --asset <asset-id>
```

Writes `art/review/<date>-<asset>/`. Then message the communicator and director
(`team-comms` skill) with the packet path, QA summary and a concrete description
of the sprite. Status: `candidate`. **Wait** for an approval record in
`docs/team/comms/director/approvals/` before `publish`.

```
$F publish --asset <asset-id>   # refuses without a director-approved record
```

## 3b. Approved creature bodies and separate faces (C3b)

Do not re-run an approved body to add faces (PRD-9). On machine A, with its
original bake workspace available:

```
$F publish --asset rivallie
$F faces --asset rivallie
```

`publish` verifies the body/clip approval scope, every PNG and reconstructed bake
metadata before writing immutable exports and an atomic staging record. It needs
the original `animate.blend`, tracks and stage records, plus Blender 4.2.x. Missing
sources are a blocker, never a reason to regenerate an approved packet.

`faces` writes a **separate candidate** in `art/review/*-faces-*/`: `faces.json`,
`contact.png` and `registered.png`. Open both images. Five expressions in order:
neutral, warm, fearful, hurt, sleep. Columns: s, se, sw, e, w. No back-face decal.
Face-anchor bounds QA does not approve anatomical fit or emotion readability.
Request a separate director decision for faces; body approval does not cover them.

The communicator alone integrates staging into `manifest.json` (TEAM-2a), including
canonical identity mapping. Codex owns compilation and approval-ledger transcription.
No CLI publication changes gameplay or grants a face approval.

## 4. Recipes (your main creative input)

`art/source/forge/recipes/<asset>.json` picks body type, parts, ramps, face set and
props. Allowed ramp names are those in `art/source/forge/spec/palette.json`.
Region accents follow ART-4.6. When unsure, ask the director in comms.

## 5. When a command fails

- Environment problems (CUDA, Blender, uv): see
  [references/troubleshooting.md](references/troubleshooting.md), then `$F doctor`.
- Stage crashes with a Python traceback in forge code: **don't patch it**. Message
  codex with the command, the full output and the asset id.

## Never

Model with typed coordinates · run legacy box scripts · batch the cast · edit
`spec/` or forge code · write exports by hand · claim quality without opening the
image · use banned words.
