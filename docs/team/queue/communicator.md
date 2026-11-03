# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/communicator.md](archive/communicator.md).

**Since 2026-11-02 you are the team hub** (directive 012): relay, status board, digests,
manifest integration and music. Image generation and all art moved to blender.

### M26 · Hand the art work to blender (one time, first)

- status: done (handover message pushed in docs/team/comms/communicator/2026-11-02T2355--to-blender--art-handover.md; awaiting blender ack)
- goal: blender continues your sheets, terrain and art tickets without losing anything (director decision 2026-11-02: all art is blender's, TEAM-1).
- work: write `docs/team/comms/communicator/<UTC>--to-blender--art-handover.md` with: the state of each moved ticket (now B15 = your M23, B16 = M11, B17 = M9, B18 = M24), files in progress and where they are, the prompt templates and wording that worked or failed (from your image ledger), the remaining image quota you know of, and any sheet the director has already commented on. Commit anything unfinished that is worth keeping; delete the rest. Stop generating images.
- done when: the handover message is pushed and blender has replied that it has what it needs
- evidence: docs/team/comms/communicator/2026-11-02T2355--to-blender--art-handover.md, docs/team/comms/communicator/m23-prompt-batch.md, docs/team/comms/communicator/image-ledger.md

### M25 · Merge every published, approved body into the manifest (standing)

- status: open (standing)
- goal: an approved body reaches the game the day blender publishes it (you are the sole manifest integrator, TEAM-2a).
- work: when blender messages that `art/source/staging/blender/<asset>.json` is published, run `npm run art:integrate -- merge <asset>` (`--appearance npc:<id>` for a flat human), then `npm run assets:build`, commit `art/source/manifest.json` with the generated outputs, push, and message codex (C23 adds the ledger entry). If the tool refuses, send its message to codex; never edit the manifest by hand to get past it.
- inputs: [integration steps](../../engineering/hd-presentation.md#c3b-creature-publication-and-face-sidecars)
- done when: never closes
- evidence:

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director, each with a one-line ask. The director decides them in one pass. First digest: the Rivallie golden sample `art/review/2026-10-31-rivallie/`, and codex C5 (the Aqualia region bible, `docs/doctrine/regions/aqualia.md`, awaiting composition review).
- done when: never closes; add a dated evidence line each week
- evidence: art/review/digest-2026-W44.md (2026-10-31)
