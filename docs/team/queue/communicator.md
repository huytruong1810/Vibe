# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/communicator.md](archive/communicator.md).

### M23 · Reference-sheet production run (quota restored by the director)

- status: open (top priority; directive 009)
- goal: every class the forge can build has its sheets, so blender is never waiting on input.
- work:
  1. Retry image generation now; the director is raising the quota. Log every attempt in `image-ledger.md` (PRD-7.5); budgets per PRD-7.3.
  2. Order (stop and resume in this order; each sheet goes into `art/source/references/<asset>/` with `sheet.json`, per the `reference-sheets` skill):
     1. M11 redraw: `player-aqualia`, `npc-neris` (4.5–5 heads, front/left/back, A-pose, valid ramps).
     2. The other 9 Aqualia villagers (identity from their portraits and the voice/casting sheet).
     3. Environment golden set for C10: `env-house-aqualia`, `env-tree-oak`, `env-well`. Each needs a **front** view (the building's front faces south in game) plus a left side view, plain background, no ground; a three-quarter concept is optional.
     4. Non-quadruped creatures: `zephyrit` and `cindermoth` (winged: wings spread in front and side views), `steamshell` (shelled, head and legs out), `ignicap` (mushroom-biped, legs apart with a gap). Same pose in every view, and a **true front view**: these templates take south from it (`docs/team/comms/claude/2026-11-02T0123--to-blender-communicator--go-creature-templates.md`). The forge templates are built (C3h).
     5. Held items for the Aqualia cast: fishing rod, hoe, ferry pole (prop sheets, 2 generations each).
     6. M9 terrain swatches.
  3. Draft every prompt now, before generating, so each run is a single batch.
- done when: steps 1–3 are registered with `sheet.json` and announced `--to-blender--`. The rest follow in order.
- evidence:

### M11 · Redraw the human sheets; fix ramp names on every sheet

- status: in_progress (palette ramps and metadata schemas normalized; 3-view redraw paused on image model capacity limit)
- goal: bring every reference sheet up to PRD-3 and L3 (director decision via directive 006).
- work:
  1. **Human sheets: player-aqualia, npc-neris, and the four mannequins (standard, sturdy, slender, elder).**
     - Draw at 4.5–5 heads (L3): head 11–12 art px, crown per `body_types.json`. Today they are about 5.5–7 heads.
     - Use an A-pose with the arms about 45° from the body (mannequin-elder is at about 20°).
     - Provide front, **left** and back views.
     - Make `sheet.png` at least 1024 px tall (PRD-3.1).
     - Match `body_types.json` `aqualiaCast` for the player: build slender, skin-porcelain, hair-teal.
  2. **Ramp names on every sheet**, from `art/source/forge/spec/palette.json` only:
     - bramblefang: `charcoal`, `amber`, `ivory`;
     - marshstalker: `aqua`;
     - npc-neris: `charcoal`, `outline-dark`;
     - player-aqualia: `river-blue`, `charcoal`, `outline-dark`.

     Keep to at most 5 ramps per character (ART-4.4: 24 colours).

  3. **mireling `sheet.json`:** use the same schema as the other sheets (`asset`, `kind`, `identitySources`, `ramps`, `generations`, `ledger`).
- done when: every sheet passes these checks, the ledger is updated within quota (PRD-7), and you've messaged codex and blender
- evidence: art/source/references/{bramblefang,marshstalker,mireling,player-aqualia,npc-neris,mannequin-*}/sheet.json, docs/team/comms/communicator/image-ledger.md

### M9 · Aqualia terrain set through tileforge (long design session)

- status: in_progress (scaffolded aqualia-terrain; swatches paused awaiting image generation quota reset per PRD-7)
- goal: the whole Aqualia ground in palette-locked 32-px tiles (ART-11.2), designed by you, made exact by tileforge: grass, dirt, sand, stone, mud, reedbed, boardwalk; freshwater with its 14 shore masks; dirt-path and stone-path edges; cliff strip and ramp.
- inputs: `.agents/skills/tile-forge/SKILL.md` (read it fully first); region bible `docs/doctrine/regions/aqualia.md` and ART-13 (teal, sand, warm timber); the concept `art/source/masters/aqualia_canal_settlement_master.jpg` for mood only (its grid lines and props make it unusable as a swatch); the golden sample `art/source/tiles/sets/aqualia-grass-water/` and its packet `art/review/tiles-aqualia-grass-water-1/` (procedural stand-in swatches; beat them).
- work, one material at a time (PRD-4), each through the skill's loop (swatch, recipe, `all`, look at all three previews, fix inputs, repeat):
  1. Set `aqualia-terrain`: `tileforge.py new aqualia-terrain`; `preview.level` `aqualia_village`, `rect` one canal screen (30×17 tiles).
  2. Grass (`ground_grass`, binds ground grass) with 3 variants. Decide the actor-contrast trade-off (skill, design rules) and write it in `notes`.
  3. Freshwater body (`ground_freshwater`, 2 variants) and the shore overlay (`shore_freshwater_mask_{mask}`, binds water fresh_shallow and fresh_deep).
  4. Dirt (`ground_dirt`) and sand (`ground_sand`); pairs grass/dirt and grass/sand must pass.
  5. Stone, mud, reedbed, boardwalk (runtime ids `ground_stone`, `ground_mud`, `ground_reedbed`, `ground_boardwalk`; they go to the manifest at publish).
  6. Path edges: overlays for dirt_path and stone_path (`path_dirt_mask_{mask}`, `path_stone_mask_{mask}`, binds paths).
  7. Cliff strip (`cliff_grass`, `wrap` x, `heightPx` 8) and ramp (`ramp_grass`).
  8. Packet when the whole set is candidate and reads well on `level.png`. Write `DIGEST.md` in the packet with what you saw and the trade-offs. Message the director. One packet per set; a second set (for example `aqualia-water-deep`) is fine if the first grows too large.
- never: edit tile PNGs, exports or packets; write director records; change the tool or spec (ask codex).
- done when: an `art/review/tiles-aqualia-terrain-<n>/` packet is QA candidate with every material above, and the director is messaged
- evidence: art/source/tiles/sets/aqualia-terrain/set.json

### M24 · Art for notes, books and paintings (after M23 step 3)

- status: open (after M23 step 3)
- goal: the UI and props the authored-artifacts feature needs (codex C17–C20), so it ships with real art instead of placeholders.
- inputs: [authored artifacts spec](../../engineering/authored-artifacts.md) §3, §7.5, §8; doctrine AGT-6, AGT-8, UI direction (`docs/doctrine/04-ui-direction.md`); the UI kit generator `art/source/ui/`.
- work:
  1. Item icons (icon.item canvas, doctrine palette): blank note, written note, blank book, written book, blank canvas, painting (with a 16×11 transparent thumbnail window).
  2. Book screen art in the UI kit: two-page spread frame and single-page note frame, page-turn arrows, a seal stamp.
  3. Painting frame for 48×32 art px paintings (wall display and the 4× preview), plus a cloth-covered "in progress" easel state.
  4. Reference sheets (PRD-3, front plus left view, M23 rules) for the display furniture blender will forge with the environment kind: wall hook, shelf, lectern, easel.
- done when: icons and frames are in the UI kit build and packeted for the director; the four sheets are registered with `sheet.json`
- evidence:

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director, each with a one-line ask. The director decides them in one pass. First digest: the Rivallie golden sample `art/review/2026-10-31-rivallie/`, and codex C5 (the Aqualia region bible, `docs/doctrine/regions/aqualia.md`, awaiting composition review).
- done when: never closes; add a dated evidence line each week
- evidence: art/review/digest-2026-W44.md (2026-10-31)

### M25 · Merge every published, approved body into the manifest (standing)

- status: open (standing)
- goal: an approved body reaches the game the day blender publishes it (you are the sole manifest integrator, TEAM-2a).
- work: when blender messages that `art/source/staging/blender/<asset>.json` is published, run `npm run art:integrate -- merge <asset>` (`--appearance npc:<id>` for a flat human), then `npm run assets:build`, commit `art/source/manifest.json` with the generated outputs, push, and message codex (C23 adds the ledger entry). If the tool refuses, send its message to codex; never edit the manifest by hand to get past it.
- inputs: [integration steps](../../engineering/hd-presentation.md#c3b-creature-publication-and-face-sidecars)
- done when: never closes
- evidence:
