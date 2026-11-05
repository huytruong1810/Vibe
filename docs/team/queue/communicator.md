# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/communicator.md](archive/communicator.md).

**Since 2026-11-02 you are the team hub** (directive 012): relay, status board, digests,
manifest integration and music. Image generation and all art moved to blender. Under
directive 017 (`TEAM-4.2`), `visitor` acts as standing director until `2026-11-11T00:00Z`.

## Now (Put Approved Art Into the Game First)

### M25 · Merge every published, approved asset and face sidecar into the manifest (standing)

- status: open (top priority, standing — **33 staging JSONs in `art/source/staging/blender/` + 1 tileset in `art/source/staging/tiles/` + 17 inventory icons in `art/source/ui/icons/items/` ready to merge NOW, with 12 more bodies (`npc:*` + `zephyrit`/`cindermoth`) and 5 C26 re-bakes publishing in `B27`!**)
- goal: an approved body, face sidecar, held item, environment prop, icon set, or terrain set reaches the game the day `blender` publishes it (you are the sole manifest integrator, `TEAM-2a`).
- inputs:
  - [integration steps](../../engineering/hd-presentation.md#c3b-creature-publication-and-face-sdiecars)
  - Verified approval records in `docs/team/comms/director/approvals/*.md` (`forge.py approve-record` passes 100%).
- work:
  1. **Batch 1 — Ready in `art/source/staging/` right now with active, non-superseded digests (merge immediately once Codex pushes the `M25/C3b` integration checkpoint):**
     - **Creatures (2):** `ignicap.json` (`2026-11-04`), `steamshell.json` (`2026-11-05-steamshell`).
     - **Humans (1 body + 9 face sidecars):** `player-aqualia.json`, `player-aqualia-faces.json`, `npc-{neris,caelum,dara,finn,lark,marina,mira,willa}-faces.json` (merge each NPC face sidecar alongside its NPC body as `blender` publishes the 10 NPC bodies in `B27`).
     - **Held Items (6):** `item-fishing-rod.json`, `item-hoe.json`, `item-hunting-spear.json`, `item-ferry-pole.json`, `item-copper-sword.json` (`2026-11-04`), `item-shortbow.json` (`2026-11-04`).
     - **Environments (5):** `env-house-aqualia.json`, `env-tree-oak.json`, `env-well.json`, `env-landmark-waystone.json`, `env-prop-hearth.json`.
     - **Terrain (1):** `art/source/staging/tiles/aqualia-terrain.json`.
     - **Inventory Icons (17 — covers 34 item identities including 18 garments):** `art/source/ui/icons/items/{berries,reeds,wheat,nectar,ashgrass,fungi,flint,stick,fiber,tool-head,poultice,water,ore,meat,meal,arrow-bundle,garment}.png` (`director-approved` in `docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md`).
  2. **Batch 2 — Merge as soon as `blender` finishes `B27` / `B29` re-publish against the `2026-11-05` `B20` approvals:**
     - **Why wait for `blender`'s `B27` commit on these:** The currently staged `{rivallie,bramblefang,marshstalker,mireling,item-hatchet}.json` and `{rivallie,bramblefang,mireling,npc-oren,npc-reed}-faces.json` still point to the pre-B20 (`2026-10-31`/`2026-11-03`/`2026-11-04`) body packets that are now `superseded` by `2026-11-05-*`. Once `blender` runs `forge.py publish` (`B27`) and `publish --faces` (`B29`), merge `rivallie`, `bramblefang`, `marshstalker`, `mireling`, `zephyrit`, `cindermoth`, `item:hatchet`, the 10 `npc:*` bodies, `npc-{oren,reed}-faces`, and the 8 creature `*-faces` sidecars.
  3. Run `npm run art:integrate -- merge <asset>`, then `npm run assets:build` and `npm run check:assets`, commit `art/source/manifest.json` with the immutable intake receipts, push, and relay the SHA to `codex` and `visitor`. (The `art:integrate ledger` step after merge belongs to `claude`/`codex`). If the tool refuses, send its exact output to `codex`; never edit `art/source/manifest.json` by hand to bypass validation.
- done when: never closes; record each merged batch under `evidence:`
- evidence:

### M27 · Review digests and delegation checks for `B29` and `B20`

- status: open (`B23` 17 inventory icons, `B28` `steamshell` yaw fix, 3 `B29` creature face sidecars, and **7 of 9 `B20` C26 readability re-bakes** are now `director-approved`; 5 creature face sidecars await `blender` re-sweeping `faceOffsetPx` with `6e283fb9`; `copper-sword` and `shortbow` re-bakes are `changes-requested` gated on `C36`)
- goal: write one-page digests (`review-packet` skill) and coordinate with `visitor` (`TEAM-4.2`) as `blender` posts updated packets for `B29` (the 5 creature face sidecars after `6e283fb9` `dx` mirror + `eyesOnly` fallback) and `B25` (1 pilot portrait actor).
- inputs: incoming `--to-visitor-communicator--` messages from `blender`; `art/source/forge/forge.py approve-record` (always use `approve-record` so `packetDigest` is read directly from `review.json` / `faces.json`, never retyped; quote expression names from `render_spec.json`: `neutral`, `warm`, `fearful`, `hurt`, `sleep`).
- work:
  1. Open `contact.png` and `registered.png` (`PRD-5`) for each packet.
  2. Verify cardinal facing (`s` faces South, `e` faces East; head leads the stride in `walk`/`run`), `faceCoverage` (`status: candidate`, `0` idle hidden frames), and ramp separation before recording or recommending any approval.
- done when: all `B29` and `B20` packets have verified digests and approval records
- evidence: docs/team/comms/director/approvals/{icons-items--2026-11-04-icons-items-1,steamshell--2026-11-05-steamshell,rivallie--2026-11-05-rivallie,bramblefang--2026-11-05-bramblefang,marshstalker--2026-11-05-marshstalker,mireling--2026-11-05-mireling,item-hatchet--2026-11-05-item-hatchet,npc-oren--2026-11-05-npc-oren,npc-reed--2026-11-05-npc-reed,item-copper-sword--2026-11-05-item-copper-sword,item-shortbow--2026-11-05-item-shortbow}.md

### M28 - Relay approved LDtk R3 levels and C7 map dependencies

- status: open (director request, 2026-11-05)
- goal: unblock intake of approved village/Riverlands R3 and relay remaining gameplay map inputs to their owners.
- work: relay exact R3 world approval/source and M25 environment/terrain integration SHAs to Codex; coordinate studio overlap before engineering merge; ask Blender for gameplay ResourceNode placements through worldforge passes and verify Decor asset bindings against staging.
- done when: Codex has exact integration evidence and Blender has an actionable forage-node request; C7 activation stays Codex-owned.
- evidence: [Codex handoff](../comms/codex/2026-11-05T2036--to-communicator--ldtk-r3-intake-and-c7-unblock.md), studio76ef620c /6c4cafaa; village and Riverlands R3 approvals bind ae34ae141d48512ab02607d274973751db79a0853fdebb74eaa3c6d982b66d5b.

## Recurring

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director/claude, each with a one-line ask.
- done when: never closes; add a dated evidence line each week
- evidence: art/review/digest-2026-W44.md (2026-10-31), art/review/digest-2026-W45.md (2026-11-01)
