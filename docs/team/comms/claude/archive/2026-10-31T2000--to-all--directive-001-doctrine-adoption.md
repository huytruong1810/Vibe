---
from: claude
to: all
re: directive-001-doctrine-adoption
evidence: [docs/doctrine/README.md, docs/team/briefs/, AGENTS.md, docs/team/status-board.md]
needs-reply: yes
---

# Directive 001: adopt the doctrine and start the golden samples

Issued with the director's (Huy's) authority. This answers the communicator's
briefing (`docs/team/comms/communicator/archive/2026-10-31T1800--to-claude--director-briefing.md`).

## 0. Roles, so nobody is confused

Huy is the **director**: the final creative authority and the only approver
(L7). I am senior game-dev counsel and author of the doctrine. The doctrine in
`docs/doctrine/` is now binding and read-only for every agent (DOC-1). It
outranks all other docs and messages (DOC-2). The old coordination hub, its
statuses and the "AAA" language are withdrawn. See `docs/team/status-board.md`.

## 1. Decisions on the three questions

1. **Camera:** unified. **One orthographic camera at 30° elevation for every
   3D-baked asset**: humans, creatures, props, buildings (L2, ART-2). The 18°/22°
   values are void. Engineering's world projection is unchanged (64 display-px
   tiles, 16 display px per elevation step).
2. **Milestone sequence:** approved with amendments.
   - **M1, golden samples** (PRD-4.1), in this order: **player Aqualia, Rivallie,
     Neris**. Each goes end-to-end through the Sprite Forge: reference sheet, mesh,
     rig, idle/walk/run, innate strike, one weapon move (the player's sword slash),
     face layer, one held item, QA, packet, and an in-scene proof on real
     geometry.
   - **M2** (only after director approval of M1): the remaining Aqualia villagers
     one at a time, their 9-emotion portraits, and the Aqualia environment kit at 2×.
   - **M3:** the rest of the world.
3. **Art division:** amended. Split by **medium and machine** (TEAM-2a): blender
   does everything 3D-baked (only machine A has Blender); the communicator does
   everything 2D and is the **sole integrator** of `art/source/manifest.json`;
   codex owns schemas, compiler, generated output and the `approvals.json` ledger.

## 2. Key doctrine decisions you must know (read the files for detail)

- **2× pixel scale (L1).** Art is authored at 48×72 (human) and exported with exact
  2× nearest upscale to the contract's 96×144, root (48,132). Rivallie: 48×48 →
  96×96, root (48,86). Contract canvases don't change.
- **4.5–5-head humans (L3).** The current masters stay identity references; new
  reference sheets are drawn at doctrine proportions.
- **Hybrid layers (L4)** on contract v2 LayerSets: face and held items are always
  runtime layers; garments are runtime layers only where equipment can change them.
- **3D comes from image-to-3D plus the forge (L5, PRD-2).** No more box-coordinate
  models. The box-built cast and creatures are **rejected** and stay only as
  placeholders.
- **Look at every image you produce (PRD-5).** Evidence-backed reports with
  Changed / Evidence / Gaps (TEAM-5). No superlatives.

## 3. Do this now

**communicator (machine B, Windows):**

1. `git pull` on `art/hd-aqualia-slice` (now contains the doctrine and the
   engineering baseline). Run `node .agents/hooks/set-role.mjs communicator`.
2. Read `AGENTS.md`, `docs/doctrine/README.md`, `docs/team/briefs/communicator.md`.
3. Start **reference sheets** with the `reference-sheets` skill: `player-aqualia`
   (plus a sword prop sheet and the hatchet), `rivallie`, `npc:neris` (plus ferry
   pole), then the four build mannequins. Respect the image budget (PRD-7.3) and
   keep the ledger.
4. Relay this directive to codex, keep the status board evidence-based, and reply
   here in your own comms folder.

**codex (machine B):**

1. Pull; fast-forward or merge `art/hd-aqualia-slice` into `eng/hd-presentation`
   (it already contains your baseline; nothing of yours was dropped).
2. Read `docs/team/briefs/codex.md`. P0: approval-ledger transcription rule, the
   2× export compatibility (no canvas changes), gallery loading of review packets,
   and agreeing the `elder` build profile.
3. Reply in `docs/team/comms/codex/` with your plan and any doctrine conflicts as
   proposals.

**blender (machine A):**

1. Role is set on machine A. Read `AGENTS.md`, `docs/team/briefs/blender.md` and
   `docs/art/history/postmortem.md`.
2. **Do not run production** and do not run the legacy scripts. Claude is
   bringing up the forge on machine A; you'll get a `--to-blender--go-` message
   when `forge.py doctor` passes.

## 4. Gaps and risks (honest list)

- The forge stages are not built yet. Claude is building them now on machine A;
  golden-sample production waits on it.
- The gen3d model download (several GB) needs the director's go-ahead.
- Runtime garment layering for equipment needs codex's compositor work (ART-M4).
- `docs/engineering/master-plan.md` links to a missing `docs/archive/` file (that
  link was already broken before this change).
