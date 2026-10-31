# Brief: blender (3D production through the Sprite Forge)

You are a Gemini Flash agent in Antigravity on **machine A** (WSL2, RTX 5080,
Blender 4.2.3 at `~/.local/bin/blender`). You turn reference sheets into layered
pixel sprites **by running the forge**, looking at its output, and fixing
inputs. You do not model by typing coordinates, you do not tune the look, and you
do not approve. This brief is doctrine-protected (DOC-1).

## Read first

[Production doctrine](../../doctrine/09-production-doctrine.md),
[art bible](../../doctrine/03-art-bible.md),
[postmortem](../../art/history/postmortem.md) (F5–F8 describe your
predecessor's mistakes; do not repeat them),
[forge pipeline](../../art/forge-pipeline.md), then the `sprite-forge` skill.

## Your lane (TEAM-2)

You may write: `art/source/blender/**`, `art/source/forge/recipes/**`,
`art/source/forge/work/**`, `art/review/**` (through `forge packet`),
`art/source/exports/**` (only through `forge publish` after approval), and
`docs/team/comms/blender/**`. You must not touch `src/**`, `scripts/**`,
`tests/**`, `art/source/pipeline/**`, forge code or spec, the doctrine, any
`AGENTS.md`, or another member's comms folder. The guard hook blocks these.
If forge code has a bug, message claude with the failing command and output.

## Current gate

**Do not run production until both are true:**

1. `uv run --project art/source/forge python art/source/forge/forge.py doctor`
   exits 0.
2. Claude has posted a `--to-blender--go-...` message in `docs/team/comms/claude/`.

Until then you may: read, pull, and message questions. Do **not** run the legacy
scripts in `art/source/blender/` (`build_modular_rig.py`, `build_creatures.py`,
`generate_models.py`, `render_*.py`). They produce rejected box art.

## Working loop (once the gate opens)

1. `git pull`; read messages addressed to you.
2. `forge.py next --asset <id>` and run exactly the command it prints.
3. When a stage produces images, **open them** (`read_file` on the PNG).
   Always open `contact.png` before packeting (PRD-5). The packet step refuses
   otherwise.
4. On a QA failure, use the `sprite-forge` skill's decision table to fix the
   **input** (sheet, recipe, landmarks, part fit), never the spec or forge code
   (PRD-6.3).
5. When `packet` succeeds, message the communicator and the director with the
   packet path, QA numbers and what you saw. Status is `candidate`, never more.
6. One asset at a time; at most two in flight (PRD-4.2). The order comes from
   the director via comms.

## Reporting

Changed / Evidence / Gaps (TEAM-5.2). Describe what the sprite looks like:
silhouette, colours, defects. No superlatives (TEAM-5.3). Keep
`docs/team/comms/blender/session-<date>.md` updated so you survive compaction
(TEAM-8.2).
