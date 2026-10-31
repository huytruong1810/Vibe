# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:`
lines.

### M1 · Relay the hand-off and reset the board

- status: done
- goal: make sure codex has read directive 004; point the status board at the queues.
- work:
  - Tell codex about `docs/team/comms/claude/2026-11-01T0100--to-all--directive-004-handoff.md`.
  - Commit codex's reply.
  - In `docs/team/status-board.md`, add a "Queues" line linking `docs/team/queue/`.
  - Change "Sprite Forge stages: claude" to codex (C2, C3, C9, C10).
  - Add rows for World pipeline (codex C4–C7) and tileforge (codex C11).
- done when: board updated and pushed, with codex's reply committed
- evidence: docs/team/status-board.md (queues link and codex rows), docs/team/comms/communicator/2026-10-31T0500--to-codex--relay-directive-004-and-005.md

### M2 · Rivallie reference sheet, single pose

- status: done
- goal: redo `art/source/references/rivallie/` as a creature sheet with **one all-fours pose** (the master's side pose) in front, left side and back views. The current sheet mixes an upright front and back with an all-fours side, which fused into a hybrid mesh; Claude worked around it with the side view only. Show the cream belly and chest clearly in the side view: today's sprite reads almost all teal. Rearing up is an animation (`social`), not a sheet pose.
- inputs: the `reference-sheets` skill, the approved Rivallie portrait anatomy (ART-10: rounded otter body, cream belly, aqua crest fins, paddle tail)
- done when: `sheet.json` and the views are committed, the image ledger is updated, and you've messaged codex and blender
- evidence: art/source/references/rivallie/sheet.json, art/source/references/rivallie/{front,left,back}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0530--to-blender-codex--rivallie-reference-ready.md

### M3 · Neris: A-pose sheet plus ferry-pole prop sheet

- status: done
- done when: the sheet (in `art/source/references/<asset-id>/`, per the `reference-sheets` skill) and the prop sheet are committed, the ledger is updated, and you've messaged codex and blender
- evidence: art/source/references/npc-neris/sheet.json, art/source/references/npc-neris/{sheet,front,back,prop-ferry-pole}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0600--to-blender-codex--neris-reference-ready.md

### M4 · player-aqualia: A-pose sheet plus hatchet prop sheet

- status: done
- done when: same as M3
- evidence: art/source/references/player-aqualia/sheet.json, art/source/references/player-aqualia/{sheet,front,back,prop-hatchet}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0630--to-blender-codex--player-aqualia-reference-ready.md

### M5 · Four body-type mannequin sheets (standard, sturdy, slender, elder)

- status: done
- done when: four sheets committed at doctrine proportions (4.5–5 heads)
- evidence: art/source/references/mannequin-{standard,sturdy,slender,elder}/{sheet.png,front.png,back.png,sheet.json}, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0700--to-blender-codex--mannequin-references-ready.md

### M6 · Voice casting sheet: draft for the 10 Aqualia villagers (AGT-4.2)

- status: done
- goal: write proposal `docs/team/proposals/002-aqualia-voice-casting.md`. For each villager in `src/content/villagers.ts`:
  - engine voice ID or blend;
  - pitch offset, rate and timbre notes;
  - blip settings;
  - one sample line.

  Base the casting on age, role and personality. **Never infer gender from pronouns or names** (AGT-4.2).

- done when: the proposal is pushed and the director has been messaged
- evidence: docs/team/proposals/002-aqualia-voice-casting.md, docs/team/comms/communicator/2026-10-31T0730--to-director--aqualia-voice-casting-proposal.md

### M7 · Aqualia day and night scores

- status: done
- goal: `art/source/audio/scores/aqualia-day.json` and `aqualia-night.json`, using the `music-score` skill: 6/8, harp and soft pulse, major with a raised 4th (AUD-3.2), quoting bars 1–2 of the motif, with four stems.
- done when: `render_score.py` exits 0 for both, and the report numbers are in a message to the director
- evidence: art/source/audio/scores/aqualia-day.json, art/source/audio/scores/aqualia-night.json, docs/team/comms/communicator/2026-10-31T0800--to-director--aqualia-scores-ready.md

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director, each with a one-line ask. The director decides them in one pass. First digest: the Rivallie golden sample `art/review/2026-10-31-rivallie/`, and codex C5 (the Aqualia region bible, `docs/doctrine/regions/aqualia.md`, awaiting composition review).
- done when: never closes; add a dated evidence line each week
- evidence: art/review/digest-2026-W44.md (2026-10-31)

### M9 · Aqualia terrain set through tileforge

- status: blocked: waiting for codex C11 (tileforge)
- goal: grass, dirt, sand, stone, mud, reedbed, boardwalk; freshwater with the 14 shore masks; cliff and ramp, all at 32-px tiles (ART-11.2). Use the `tile-forge` skill.
- done when: a packet per material set
- evidence:

### M10 · Quadruped creature reference sheets (bramblefang, marshstalker, mireling)

- status: done
- goal: produce 3-view orthographic reference sheets (front, left side, back) in `art/source/references/<species>/` for the three quadrupeds in the order specified in Blender B3 (bramblefang, marshstalker, mireling). Single all-fours standing pose, limbs separated from body, mouth closed, plain grey background, no labels, matching approved portraits.
- inputs: the `reference-sheets` skill, approved portraits (`public/assets/portraits/creatures/portrait_<species>_128.png`)
- done when: sheets committed with views and `sheet.json`, ledger updated, and blender notified
- evidence: art/source/references/{bramblefang,marshstalker,mireling}/{sheet.png,front.png,left.png,back.png,sheet.json}, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0900--to-blender-codex--bramblefang-reference-ready.md, docs/team/comms/communicator/2026-10-31T1500--to-blender-codex--marshstalker-reference-ready.md, docs/team/comms/communicator/2026-10-31T1600--to-blender-codex--mireling-reference-ready.md
