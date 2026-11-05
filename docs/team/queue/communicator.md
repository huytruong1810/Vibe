# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/communicator.md](archive/communicator.md).

**Since 2026-11-02 you are the team hub** (directive 012): relay, status board, digests,
manifest integration and music. Image generation and all art moved to blender. Under
directive 017 (`TEAM-4.2`), `visitor` acts as standing director until `2026-11-11T00:00Z`.

## Now (Put Approved Art Into the Game First)

### M25 · Merge every published, approved asset and face sidecar into the manifest (standing)

- status: open (top priority, standing)
- goal: an approved body, face sidecar, held item, environment prop, or terrain set reaches the game the day `blender` publishes it (you are the sole manifest integrator, `TEAM-2a`).
- inputs:
  - [integration steps](../../engineering/hd-presentation.md#c3b-creature-publication-and-face-sidecars)
  - Repaired approval records in `docs/team/comms/director/approvals/*.md` (`2026-11-04T2300--to-all--approvals-digest-fixed-publish-next.md` and `2026-11-05` visitor audit).
- work:
  1. **Already staged in `art/source/staging/blender/` (merge now if not yet in `art/source/manifest.json`):**
     - `player-aqualia.json`, `item-hatchet.json`, `env-house-aqualia.json`, `tiles-aqualia-terrain.json`, `rivallie.json`, `bramblefang.json`, `marshstalker.json`, `mireling.json`.
  2. **Incoming from `blender` ticket `B27` (merge immediately upon `B27` commit):**
     - **Creatures (4):** `zephyrit`, `cindermoth`, `ignicap`, and updated `mireling` (**do not merge `steamshell`** until `B28` yaw fix is approved).
     - **Humans (10 bodies):** `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa` (`--appearance npc:<id>`).
     - **Human Face Sidecars (11):** `player-aqualia`, `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`.
     - **Held Items (6):** `item:fishing-rod`, `item:hoe`, `item:hunting-spear`, `item:ferry-pole`, `item:copper-sword`, `item:shortbow`.
     - **Environments (4):** `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`.
  3. Run `npm run art:integrate -- merge <asset>`, then `npm run assets:build` and `npm run check:assets`, commit `art/source/manifest.json` with the generated outputs, push, and message `codex` and `visitor`. If the tool refuses, send its exact output to `codex`; never edit `art/source/manifest.json` by hand to bypass validation.
- done when: never closes; record each merged batch under `evidence:`
- evidence:

### M27 · Review digests and delegation checks for `B28`, `B29`, `B20`, and `B23`

- status: open
- goal: write one-page digests (`review-packet` skill) and coordinate with `visitor` (`TEAM-4.2`) as `blender` posts new packets for `B28` (`steamshell` 180° yaw fix), `B29` (7 C3b creature face sidecars), `B20` (C26 readability re-bakes), and `B23` (17 inventory icons).
- inputs: incoming `--to-visitor-communicator--` messages from `blender`; `art/source/forge/forge.py approve-record` (always use `approve-record` so `packetDigest` is read directly from `review.json` / `faces.json`, never retyped).
- work:
  1. Open `contact.png` and `registered.png` (`PRD-5`) for each packet.
  2. Verify cardinal facing (`s` faces South, `e` faces East; head leads the stride in `walk`/`run`) and ramp separation before recording or recommending any approval.
- done when: all `B28`, `B29`, `B20`, and `B23` packets have verified digests and approval records
- evidence:

## Recurring

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director/claude, each with a one-line ask.
- done when: never closes; add a dated evidence line each week
- evidence: art/review/digest-2026-W44.md (2026-10-31), art/review/digest-2026-W45.md (2026-11-01)
