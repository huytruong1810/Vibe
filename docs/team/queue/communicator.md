# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:`
lines.

### M1 · Relay the hand-off and reset the board

- status: open
- goal: make sure codex has read directive 004; point the status board at the queues.
- work:
  - Tell codex about `docs/team/comms/claude/2026-11-01T0100--to-all--directive-004-handoff.md`.
  - Commit codex's reply.
  - In `docs/team/status-board.md`, add a "Queues" line linking `docs/team/queue/`.
  - Change "Sprite Forge stages: claude" to codex (C2, C3, C9, C10).
  - Add rows for World pipeline (codex C4–C7) and tileforge (codex C11).
- done when: board updated and pushed, with codex's reply committed
- evidence:

### M2 · Rivallie reference sheet, single pose

- status: open
- goal: redo `art/source/references/rivallie/` as a creature sheet with one consistent standing pose in front, left side and back views. The current sheet mixes poses, and that produced a hybrid mesh (forge QA draft, 2026-10-31).
- inputs: the `reference-sheets` skill, the approved Rivallie portrait anatomy (ART-10: rounded otter body, cream belly, aqua crest fins, paddle tail)
- done when: `sheet.json` and the views are committed, the image ledger is updated, and you've messaged codex and blender
- evidence:

### M3 · Neris: A-pose sheet plus ferry-pole prop sheet

- status: open
- done when: the sheet (in `art/source/references/<asset-id>/`, per the `reference-sheets` skill) and the prop sheet are committed, the ledger is updated, and you've messaged codex and blender
- evidence:

### M4 · player-aqualia: A-pose sheet plus hatchet prop sheet

- status: open
- done when: same as M3
- evidence:

### M5 · Four body-type mannequin sheets (standard, sturdy, slender, elder)

- status: open
- done when: four sheets committed at doctrine proportions (4.5–5 heads)
- evidence:

### M6 · Voice casting sheet: draft for the 10 Aqualia villagers (AGT-4.2)

- status: open
- goal: write proposal `docs/team/proposals/002-aqualia-voice-casting.md`. For each villager in `src/content/villagers.ts`:
  - engine voice ID or blend;
  - pitch offset, rate and timbre notes;
  - blip settings;
  - one sample line.

  Base the casting on age, role and personality. **Never infer gender from pronouns or names** (AGT-4.2).

- done when: the proposal is pushed and the director has been messaged
- evidence:

### M7 · Aqualia day and night scores

- status: open
- goal: `art/source/audio/scores/aqualia-day.json` and `aqualia-night.json`, using the `music-score` skill: 6/8, harp and soft pulse, major with a raised 4th (AUD-3.2), quoting bars 1–2 of the motif, with four stems.
- done when: `render_score.py` exits 0 for both, and the report numbers are in a message to the director
- evidence:

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director, each with a one-line ask. The director decides them in one pass.
- done when: never closes; add a dated evidence line each week
- evidence:

### M9 · Aqualia terrain set through tileforge

- status: blocked: waiting for codex C11 (tileforge)
- goal: grass, dirt, sand, stone, mud, reedbed, boardwalk; freshwater with the 14 shore masks; cliff and ramp, all at 32-px tiles (ART-11.2). Use the `tile-forge` skill.
- done when: a packet per material set
- evidence:
