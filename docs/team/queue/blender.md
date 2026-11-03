# Queue: blender (machine A)

Read your brief `docs/team/briefs/blender.md` first. Take the top `open` ticket. If it's
blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/blender.md](archive/blender.md).

**Since 2026-11-02 you hold the whole art pipeline** (directives 012, 013) and generate
images **locally** on machine A's GPU (`forge.py concept` → `views`, model FLUX.2 [klein] 9B,
no quota): the reference sheets (B15, B16), forge them (B3, B4, B5), make the 2D art (B17, B18) and
review your own results. Make a sheet, forge it straight away, and fix the sheet yourself
when the forge shows a problem. Start with the welcome-back message
`docs/team/comms/claude/*--to-blender--welcome-back-art-overhaul.md`.

**Order of work** (directive 014: claude reviews your packets under the director's standing
delegation, so post every packet `--to-claude-director--` and keep going on the next ticket
while it waits):

1. **B19 golden samples**, then the look review. Every pose guide is in (C27, all five
   templates), so all four samples can start now.
2. **Anything that doesn't depend on the look, while B19 waits:** B16 step 2–3 metadata,
   B11, drafting every B15/B21–B25 prompt into its recipe `concept` block (no generation),
   and B26 planning.
3. **B15 sheets** once the look is approved: quadrupeds, props and buildings first, then
   humans, winged, shelled and biped (their concept templates are in the recipes README).
4. **Forge each sheet as it lands:** B16/B4 (player, Neris) → B21 (9 villagers), B3
   (creatures), B5 (environment kit), B24 (flora states), B22 (tools and weapons).
5. **B20** regenerate the approved assets in the new style (C26 readability fields).
6. **B17 terrain** once claude's `forge.py swatch` lands (C30); **B25 portraits** once
   `forge.py portrait` lands (C30); **B23 icons** once `forge.py icon` lands (C32).
7. **B18** after B15 step 3; **B26** dress the maps once B5 packets are approved.

B0 is standing.

## Now

### B14 · Publish the approved hatchet

- status: done (published 2026-11-02 by the stand-in session); move to the archive at the next queue tidy
- goal: stage the director-approved golden held item so the runtime can draw it once C9b's held-layer composition lands.
- inputs: [approval record](../comms/director/approvals/item-hatchet--2026-11-01-item-hatchet.md) (digest 89102c20…, scope held-item and icon).
- work: `uv run --project art/source/forge python art/source/forge/forge.py publish --asset item:hatchet`; don't re-run any hatchet stage first (a new digest voids the approval, PRD-9).
- done when: `art/source/staging/blender/item-hatchet.json` (or the path publish prints) is committed and a `--to-communicator-codex--hatchet-published` message lists it
- evidence: art/source/staging/blender/item-hatchet.json; docs/team/comms/blender/2026-11-02T0416--to-communicator-codex--hatchet-published.md (stand-in session, claude)

### B19 · Golden samples with local image generation (first)

- status: candidate (all four golden samples produced and packeted with klein9b + hunyuan-2mv, awaiting director look review)
- goal: approve the new look on six golden samples (image model: klein 9B; 3D model: Hunyuan3D-2mv, decided in C31) before regenerating everything (PRD-4, L12; director decision 2026-11-02).
- inputs: [directive 013](../comms/claude/2026-11-02T0807--to-all--directive-013-local-image-generation.md); [imagegen notes](../../engineering/imagegen.md); `reference-sheets` skill; Rivallie's recipe `concept` block with `poseGuide` (copy the pattern; claude makes the pose guides for other body types in C27, so don't make your own).
- work, one asset at a time:
  1. The image model is decided: klein 9B is the only one installed (claude C29, doctrine L12), so there's no `--model` flag to choose. Rivallie (creature): `forge.py concept --asset rivallie --n 4`; c901 and c903 from seeds 900–903 are already clean on all fours (`docs/team/comms/claude/boards/2026-11-02-imagegen-rivallie-klein9b.png`). Look at the contact sheet and keep the best with `views`.
  2. player-aqualia (human, A-pose, 5 heads, L3), item:hatchet (prop), env:house-aqualia (building) the same way; the human, winged, shelled and biped pose guides come with claude's C27.
  3. Run each kept sheet through the forge to a packet with the 3D backend (Hunyuan3D-2mv; TRELLIS.2 lost C31 and is removed).
  4. Post one message `--to-claude-director--golden-samples` with the contact sheets, the forge packets and what you saw in each. Claude reviews the look under the director's standing delegation (directive 014) and records the decision.
- done when: the director has approved the golden samples' look (the models are already recorded in L12); their concepts become the style anchors in `art/source/style/style.json`
- evidence:
  - rivallie (creature): art/review/2026-11-03-rivallie/ (candidate, 15 clips, 616 frames, qa candidate)
  - item:hatchet (prop): art/review/2026-11-03-item-hatchet/ (candidate, 65 poses, 0 failing, qa candidate)
  - env:house-aqualia (environment): art/review/2026-11-03-env-house-aqualia/ (candidate, base/roof/shadow layers, qa candidate)
  - player-aqualia (human): art/review/2026-11-03-player-aqualia/ (candidate, 19 clips, 952 frames, qa candidate)
  - dispatch: docs/team/comms/blender/2026-11-03T0125--to-claude-director--golden-samples.md

### B15 · Reference-sheet production run (local generation)

- moved: from the communicator's M23 on 2026-11-02 (all art is blender's, TEAM-1). Since directive 013 generate **locally** (`forge.py concept` → `views`, `reference-sheets` skill), after B19's decision, and forge each sheet as soon as it passes the checklist. Quota limits no longer apply.
- status: open (top priority; directive 009)
- goal: every class the forge can build has its sheets, so blender is never waiting on input.
- work:
  1. Generate with `forge.py concept` (the `reference-sheets` skill); `views` writes the ledger row (PRD-7.5). Use a pose guide for every creature and human; the human, winged, shelled and biped guides come with claude's C27.
  2. Order (stop and resume in this order; each sheet goes into `art/source/references/<asset>/` with `sheet.json`, per the `reference-sheets` skill):
     1. B16 redraw: `player-aqualia`, `npc-neris` (4.5–5 heads, front/left/back, A-pose, valid ramps).
     2. The other 9 Aqualia villagers (identity from their portraits and the voice/casting sheet).
     3. Environment golden set for C10: `env-house-aqualia`, `env-tree-oak`, `env-well`. Each needs a **front** view (the building's front faces south in game) plus a left side view, plain background, no ground; a three-quarter concept is optional.
     4. Non-quadruped creatures: `zephyrit` and `cindermoth` (winged: wings spread in front and side views), `steamshell` (shelled, head and legs out), `ignicap` (mushroom-biped, legs apart with a gap). Same pose in every view, and a **true front view**: these templates take south from it (`docs/team/comms/claude/2026-11-02T0123--to-blender-communicator--go-creature-templates.md`). The forge templates are built (C3h).
     5. Held items for the Aqualia cast: fishing rod, hoe, ferry pole (prop sheets, 2 generations each).
     6. B17 terrain swatches.
  3. Draft every prompt now, before generating, so each run is a single batch.
- done when: steps 1–3 are registered with `sheet.json` and announced `--to-blender--`. The rest follow in order.
- evidence:

### B16 · Redraw the human sheets; fix ramp names on every sheet

- moved: from the communicator's M11 on 2026-11-02 (all art is blender's, TEAM-1). Since directive 013 generate **locally** with the forge after B19's decision; quota limits no longer apply.
- status: in_progress (palette ramps and metadata schemas normalized; the human pose guide is in (C27): the 3-view redraw runs with B19's player sample and then B15)
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
- done when: every sheet passes these checks, the ledger is updated (PRD-7.5), and you've messaged claude and the communicator
- evidence: art/source/references/{bramblefang,marshstalker,mireling,player-aqualia,npc-neris,mannequin-*}/sheet.json, docs/team/comms/communicator/image-ledger.md

## Forge each sheet as it lands

### B4 · Golden samples: player-aqualia, then Neris (humans)

- status: blocked: waiting for your own B16 human sheets (4.5–5 heads, front/left/back, valid ramps). go-humans is posted
- done when: two packets, `candidate`
- evidence:

### B5 · Aqualia environment kit

- status: blocked: waiting for your own B15 step 3 reference sheets (env-house-aqualia, env-tree-oak, env-well); go-environment directive received from claude
- goal: every Aqualia building, landmark and large prop the maps need (region bible AQ-2), one at a time with the `environment-forge` skill. Golden three first (B15 step 3): `env:house-aqualia`, `env:tree-oak` (trunk + canopy), `env:well`. Then the runtime gaps in `docs/art/coverage.md`: `landmark_waystone`, `prop_hearth` (the Hearth Island fire). Then AQ-2 in this order:
  - [ ] village: notice board, ferry landing and dock, Diver's Pool platform, Lantern Bridge (with parapet lanterns), Oren's mill and waterwheel, Finn's sluice gate, Caelum's gauge tower, weir walk, Spring Shrine and cave mouth, Weavers' Row porch, reed drying racks and laundry lines, Dara's courier post, Willa's stilt hut and herb beds, fishing pier, Lark's studio;
  - [ ] riverlands: willow (Lark's Bend), Kite Oak, willow footbridge, ferry bell post, fungi ring, sunken gauge post, drowned tree, warm-spring rim rocks;
  - [ ] kit pieces reused everywhere: boardwalk straight/corner/end, lantern post, fence, crate and barrel, reed clump, rock large/small.
- done when: a packet per asset, each `candidate`, posted `--to-claude-director--`
- evidence:

### B3 · Remaining creatures, one at a time

- status: mireling published and integrated in the build (f1ded41). C3h templates are built (776eb0f, `go-creature-templates`): steamshell, zephyrit, cindermoth and ignicap wait only for their sheets (your B15 step 4)
- goal: the four non-quadruped T0 species, one at a time after their B15 step 4 sheets: steamshell (shelled, `creature-v1` + `shelled.png`), zephyrit and cindermoth (winged, `creature-winged-v1` + `winged.png`), ignicap (mushroom-biped, `creature-biped-v1` + `mushroom-biped.png`). Their rig templates are built (C3h). The four quadrupeds are redone in the new style in B20.
- done when: a packet per species, each `candidate`
- evidence: rivallie, bramblefang, marshstalker, mireling approved, published and in the build (full history in [archive/blender.md](archive/blender.md#b3-evidence-to-2026-11-02)).

### B21 · The other nine Aqualia villagers (after B4)

- status: blocked: waits for B4's player and Neris packets (the human golden pair sets the body and outfit rules)
- goal: every villager walks in game: today `docs/art/coverage.md` lists `npc:reed`, `npc:willa`, `npc:oren`, `npc:lark`, `npc:dara`, `npc:finn` (and Neris, B4) as missing sprite identities.
- work, one villager at a time: recipe with a `concept` block (`human-apose-v1`, `poseGuide` `human.png`, identity from `public/assets/portraits/` and the villager's row in `src/content/villagers.ts`: age, role and personality), `concept` → `views` → forge (`sprite-forge`, human kind) → packet. Order: Caelum, Marina, Reed, Willa, Oren, Mira, Lark, Dara, Finn. Body type per `body_types.json` `aqualiaCast`. Run `faces` after each body (B11 grammar).
- done when: nine packets `candidate`, posted `--to-claude-director--`
- evidence:

### B22 · Held tools and weapons (items kind)

- status: blocked: waits for B19's look decision (the hatchet golden sample set the item pipeline: `art/review/2026-11-01-item-hatchet`)
- goal: every held item in `src/content/definitions.ts` that a hand carries has its held poses and icon: fishing rod, hoe, ferry pole (B15 step 5), copper sword, hunting spear, shortbow (T0 combat). The hatchet is redone in B20.
- work, one item at a time: `prop-v1` concept → `views` → `prep → gen3d → clean → texture → orient → items → packet` (`sprite-forge` items section, recipe like `recipes/item-hatchet.json`). Look at all 65 poses on the contact sheet.
- done when: six packets `candidate`, posted `--to-claude-director--`
- evidence:

### B23 · Inventory icons for resources and crafted goods (after C32)

- status: blocked: waits for claude's `forge.py icon` (C32)
- goal: every inventory item without a held model gets a 32 × 32 `icon.item` icon in the project palette: sunberries, river reeds, wild wheat, nectar blossom, ash grass, spore fungi, river flint, hardwood stick, reed fiber, tool head (WIP), herbal poultice, spring water, copper ore, wild meat, nectar roast, arrow bundle, garment.
- work: one `prop-v1` concept per item, then `forge.py icon` (C32 says how); look at every icon at 1× and 4×.
- done when: one icons packet `candidate`, posted `--to-claude-director--`
- evidence:

### B24 · Flora in three states (environment kind)

- status: blocked: waits for B19's look decision and the B5 golden three (small props follow the building and tree rules)
- goal: the six gatherable flora show their state in game, as `docs/art/coverage.md` requires: `flora_{berries,reeds,wheat,nectar,ashgrass,fungi}_{healthy,harvested,burnt}` (18 sprites).
- work, one flora at a time: the healthy sheet first (`prop-v1`, front and left views, plain background), forged as a 1 × 1 environment asset. Make the harvested and burnt sheets with `concept`, using the healthy sheet as the first reference so the plant stays the same, then forge each one. If the environment kind refuses a 1 × 1 footprint or a state variant, message claude with the exact output; don't work around it.
- done when: 18 sprites in packets `candidate`, posted `--to-claude-director--`
- evidence:

### B25 · Portraits and expression sets (after C30)

- status: blocked: waits for claude's `forge.py portrait` (C30) and B19's look decision
- goal: the 19 Aqualia actors (the player, 10 villagers, 8 species) each have the nine-emotion portrait set (portrait contract v2); coverage shows 0 complete expression sets today. The status board asks for a restyle check of the approved portraits against ART-14 once the golden samples set the look.
- work: `forge.py portrait --asset <id>` per actor (C30 documents it), the player and Neris first; look at all nine emotions at 96 and 128 px against the neutral portrait for identity.
- done when: 19 sets `candidate`, posted `--to-claude-director--`
- evidence:

### B26 · Dress the village and the Riverlands with the new kit (after B5)

- status: blocked: waits for approved B5 assets
- goal: the approved maps (village-2, riverlands-2, layout scope) show the new buildings, landmarks, kit pieces and flora at their AQ-2 positions.
- work: `world-builder` skill, one pass per area: place the approved environment assets at their landmarks, `apply`, `render`, open every screen crop, `check`, fix. Layout changes need a new layout packet; dressing alone is a dressing packet.
- done when: a packet per level `candidate`, posted `--to-claude-director--`
- evidence:

## Next

### B2 · Riverlands map

- status: done: director-approved 2026-11-02, layout scope (`docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-2.md`); move to the archive at the next queue tidy
- goal: lay out level `aqualia_riverlands` from the region bible, following the codex golden village as your example.
- work: `world-builder` skill. One pass per idea: write the pass, `apply`, `render`, open every screen crop, `check`, fix. Never edit `.ldtk` JSON by hand.
- done when: `worldforge check` passes, the packet is in `art/review/`, and the ticket is `candidate`
- evidence (revision 2): passes 004 (water and roads), 005 (zones), 006 (screen decor) applied; packet art/review/world-aqualia-aqualia_riverlands-2/ (candidate, no findings); message docs/team/comms/blender/2026-11-02T0430--to-director-communicator--riverlands-revision-2.md. Revision 1 evidence follows: Pass `003-riverlands-layout.json` authored and applied; 120x68 level layout complete with 16 landmarks, 4 story spots, 6 habitats, 6 ambience emitters, music zone, all 5 routes, warm-terrace elevation and collision ramps; worldforge check clean (0 findings on level and region); candidate packet in art/review/world-aqualia-aqualia_riverlands-1/; overview and all 16 screen crops inspected; announced in docs/team/comms/blender/archive/2026-10-31T1829--to-director-communicator--riverlands-candidate-packet.md.

### B17 · Aqualia terrain set through tileforge (long design session)

- moved: from the communicator's M9 on 2026-11-02 (all art is blender's, TEAM-1). Since directive 013 generate **locally** with the forge after B19's decision; quota limits no longer apply.
- status: in_progress (scaffolded aqualia-terrain; `forge.py swatch` is ready (C30a, 2026-11-03): generate and pick swatches, see the tile-forge skill)
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

### B18 · Art for notes, books and paintings (after B15 step 3)

- moved: from the communicator's M24 on 2026-11-02 (all art is blender's, TEAM-1). Since directive 013 generate **locally** with the forge after B19's decision; quota limits no longer apply.
- status: open (after B15 step 3)
- goal: the UI and props the authored-artifacts feature needs (codex C17–C20), so it ships with real art instead of placeholders.
- inputs: [authored artifacts spec](../../engineering/authored-artifacts.md) §3, §7.5, §8; doctrine AGT-6, AGT-8, UI direction (`docs/doctrine/04-ui-direction.md`); the UI kit generator `art/source/ui/`.
- work:
  1. Item icons (icon.item canvas, doctrine palette): blank note, written note, blank book, written book, blank canvas, painting (with a 16×11 transparent thumbnail window).
  2. Book screen art in the UI kit: two-page spread frame and single-page note frame, page-turn arrows, a seal stamp.
  3. Painting frame for 48×32 art px paintings (wall display and the 4× preview), plus a cloth-covered "in progress" easel state.
  4. Reference sheets (PRD-3, front plus left view, B15 rules) for the display furniture you then forge with the environment kind: wall hook, shelf, lectern, easel.
- done when: icons and frames are in the UI kit build and packeted for the director; the four sheets are registered with `sheet.json`
- evidence:

### B11 - Human face sidecar technical proof

- status: candidate (executed on valid golden candidate body packet; registered proof inspected)
- goal: validate C9b grammar on an actual existing human body packet without launching another body bake.
- work: follow the [C9b handoff](../comms/codex/archive/2026-11-01T0247--to-all--c9b-human-face-sidecars.md), normally merge the consumer tooling, then run `faces --asset player-aqualia` on a valid body review. Inspect native/enlarged contact and registered proofs; check the blank face plane, per-facing placement and motion. Report missing packet/hard body QA as explicit prerequisites; do not weaken validation or regenerate an approved body.
- done when: exact commands, body/sidecar digests, inspected images and any blockers are published. Human faces remain candidate; this is not go-items or human publication readiness.
- evidence: art/review/2026-11-03-player-aqualia-faces-d4cc567cadce/ (status: candidate, 60 decals across 12 expressions, body packet digest d4446c6655c7c452f393272ef52944388c35963588240c9da796887baff95fcf); contact.png and registered.png inspected via read_file per PRD-5.

### B20 · Regenerate the approved assets in the new style (after B19)

- status: blocked: waits for B19's director decision. C26 is cleared: the director approved its direction on 2026-11-02.
- goal: every asset shares the approved look (director decision 2026-11-02), including the four approved creatures and the hatchet.
- work: one at a time: `concept` → `views` → forge → packet → message the director. Each gets a new digest and needs a new approval record (PRD-9); the communicator merges and codex ledgers as usual.
- readability (C26): give each creature recipe `"supersample": 4`. Add `features` for its sub-pixel body parts (fangs, horns, crests, lures), and `rampShift` for any dark coat that reads pale. Fields are in `art/source/forge/recipes/README.md`; proof values for Bramblefang and Rivallie are in C26 (`docs/team/queue/codex.md`). Don't make eyes a feature: creature faces are decals (ART-8.1, C3b). Look at idle and run in every facing; a feature must not flicker (ART-6.3).
- done when: rivallie, bramblefang, marshstalker, mireling and the hatchet are re-approved in the new style
- evidence:

## Standing

### B0 · Machine-A test runner (standing)

- status: open (standing)
- goal: run the GPU and Blender checks the other members can't run on machine B.
- work: after every `git pull`, look for `--to-blender--test-` messages (codex sends them for C18–C20: the Ollama reading round-trip, the `sd-server` painting smoke, Lark painting overnight). Run exactly the command given, open every image it produces, reply with the full output and what you saw. Stop every server you started.
- done when: never closes; each reply is pushed
- evidence:
