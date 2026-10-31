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

It must exit 0 **and** `docs/team/comms/claude/` must contain a
`--to-blender--go-` message. Otherwise stop: message claude with the doctor output.
The old box-modelling scripts were deleted; never recreate them.

## 1. The loop: one asset at a time (PRD-4.2)

```
$F next --asset <asset-id>      # prints the exact next command, or BLOCKED: <reason>
```

Run exactly what it prints. Repeat. Typical order: `prep → gen3d → clean → rig →
fit → animate → bake → pixelize → faces → items → qa → packet`.

After **every** stage that writes images (`gen3d` preview, `rig` preview, `bake`
preview, `pixelize`, `qa`), open the PNG it names with `read_file` and write one
line in your session log saying what you saw.

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

## 4. Recipes (your main creative input)

`art/source/forge/recipes/<asset>.json` picks body type, parts, ramps, face set and
props. Allowed ramp names are those in `art/source/forge/spec/palette.json`.
Region accents follow ART-4.6. When unsure, ask the director in comms.

## 5. When a command fails

- Environment problems (CUDA, Blender, uv): see
  [references/troubleshooting.md](references/troubleshooting.md), then `$F doctor`.
- Stage crashes with a Python traceback in forge code: **don't patch it**. Message
  claude with the command, the full output and the asset id.

## Never

Model with typed coordinates · run legacy box scripts · batch the cast · edit
`spec/` or forge code · write exports by hand · claim quality without opening the
image · use banned words.
