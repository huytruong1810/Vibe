# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/communicator.md](archive/communicator.md).

**Since 2026-11-02 you are the team hub** (directive 012): relay, status board, digests,
manifest integration and music. Image generation and all art moved to blender. Under
directive 017 (`TEAM-4.2`), `visitor` acts as standing director until `2026-11-11T00:00Z`.

## Now (Put Approved Art Into the Game First)

### M25 · Merge every published, approved asset and face sidecar into the manifest (standing)

- status: open (top priority, standing — **33 staging JSONs in `art/source/staging/blender/` + 1 tileset in `art/source/staging/tiles/` + 17 inventory icons in `art/source/ui/icons/items/` ready to merge NOW!**)
- goal: an approved body, face sidecar, held item, environment prop, icon set, or terrain set reaches the game the day `blender` publishes it (you are the sole manifest integrator, `TEAM-2a`).
- inputs:
  - [integration steps](../../engineering/hd-presentation.md#c3b-creature-publication-and-face-sdiecars)
  - Verified approval records in `docs/team/comms/director/approvals/*.md` (`forge.py approve-record` passes 100%).
- work:
  1. **Already staged in `art/source/staging/blender/` & `art/source/staging/tiles/` (33 staging JSONs + 1 tileset JSON — merge now if not yet in `art/source/manifest.json`):**
     - **Creatures (6 bodies + 3 face sidecars):** `rivallie.json` (updated to `2026-11-03-rivallie`), `rivallie-faces.json`, `bramblefang.json`, `bramblefang-faces.json`, `marshstalker.json`, `mireling.json` (updated to `2026-11-04-mireling` walk fix), `mireling-faces.json`, `ignicap.json`, `steamshell.json` (updated to `2026-11-05-steamshell` 180° yaw fix, `director-approved` in `steamshell--2026-11-05-steamshell.md`).
     - **Humans (1 body + 11 face sidecars):** `player-aqualia.json`, `player-aqualia-faces.json`, `npc-neris-faces.json`, `npc-caelum-faces.json`, `npc-dara-faces.json`, `npc-finn-faces.json`, `npc-lark-faces.json`, `npc-marina-faces.json`, `npc-mira-faces.json`, `npc-oren-faces.json`, `npc-reed-faces.json`, `npc-willa-faces.json` (the 10 NPC bodies wait on Claude/Codex's 2-line `forgelib/publish.py` colon-slug fix).
     - **Held Items (7):** `item-fishing-rod.json`, `item-hoe.json`, `item-hunting-spear.json`, `item-ferry-pole.json`, `item-copper-sword.json`, `item-shortbow.json`, `item-hatchet.json` (updated to `2026-11-03-item-hatchet`).
     - **Environments (5):** `env-house-aqualia.json`, `env-tree-oak.json`, `env-well.json`, `env-landmark-waystone.json`, `env-prop-hearth.json`.
     - **Terrain (1):** `art/source/staging/tiles/aqualia-terrain.json`.
     - **Inventory Icons (17):** `art/source/ui/icons/items/{berries,reeds,wheat,nectar,ashgrass,fungi,flint,stick,fiber,tool-head,poultice,water,ore,meat,meal,arrow-bundle,garment}.png` (`director-approved` in `docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md`).
  2. Run `npm run art:integrate -- merge <asset>`, then `npm run assets:build` and `npm run check:assets`, commit `art/source/manifest.json` with the generated outputs, push, and message `codex` and `visitor`. If the tool refuses, send its exact output to `codex`; never edit `art/source/manifest.json` by hand to bypass validation.
- done when: never closes; record each merged batch under `evidence:`
- evidence:

### M27 · Review digests and delegation checks for `B29` and `B20`

- status: open (`B23` 17 inventory icons, `B28` `steamshell` yaw fix, and 3 `B29` creature face sidecars `rivallie`/`bramblefang`/`mireling` are now `director-approved`; 5 creature face sidecars are `changes-requested` awaiting `faceOffsetPx` tuning)
- goal: write one-page digests (`review-packet` skill) and coordinate with `visitor` (`TEAM-4.2`) as `blender` posts updated packets for `B29` (the 5 `faceOffsetPx`-tuned creature face sidecars) and `B20` (C26 readability re-bakes).
- inputs: incoming `--to-visitor-communicator--` messages from `blender`; `art/source/forge/forge.py approve-record` (always use `approve-record` so `packetDigest` is read directly from `review.json` / `faces.json`, never retyped).
- work:
  1. Open `contact.png` and `registered.png` (`PRD-5`) for each packet.
  2. Verify cardinal facing (`s` faces South, `e` faces East; head leads the stride in `walk`/`run`), `faceCoverage` (`status: candidate`), and ramp separation before recording or recommending any approval.
- done when: all `B29` and `B20` packets have verified digests and approval records
- evidence: docs/team/comms/director/approvals/{icons-items--2026-11-04-icons-items-1,steamshell--2026-11-05-steamshell,rivallie--2026-11-05-rivallie-faces-26d6823a60de,bramblefang--2026-11-05-bramblefang-faces-e4615567901f,mireling--2026-11-05-mireling-faces-dd867942c9f2}.md

## Recurring

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director/claude, each with a one-line ask.
- done when: never closes; add a dated evidence line each week
- evidence: art/review/digest-2026-W44.md (2026-10-31), art/review/digest-2026-W45.md (2026-11-01)
