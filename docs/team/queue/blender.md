# Queue: blender (machine A)

Read your brief `docs/team/briefs/blender.md` first. Take the top `open` ticket. If it's
blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/blender.md](archive/blender.md).

**Since 2026-11-02 you hold the whole art pipeline** (directives 012, 013) and generate
images **locally** on machine A's GPU (`forge.py concept` → `views`, model FLUX.2 [klein] 9B,
no quota). Under directive 016 and directive 017 (`TEAM-4.2`), the `visitor` and `communicator`
review packets under standing delegation; post every packet `--to-communicator--` (and `--to-visitor--`)
and keep going on the next ticket while it waits.

**Order of work (triaged 2026-11-05 by `visitor` acting as director under `TEAM-4.2` to get approved art into the game first):**

1. **`B27` (Publish unblocked latest packets now):** Re-run `forge.py publish` for `rivallie`, `mireling`, and `item:hatchet`! (`visitor` just marked the 3 older `2026-10-31`/`2026-11-01` approval records as `superseded` so `approval_for` now resolves to the `2026-11-03-rivallie`, `2026-11-04-mireling`, and `2026-11-03-item-hatchet` packets that match your current `work/` directories!). The 10 NPC bodies and 2 winged creatures (`zephyrit`, `cindermoth`) wait on Claude/Codex's 2-line fix to `forgelib/publish.py`.
2. **`B28` (`steamshell` 180° yaw fix — OPEN NOW):** Fix `rig.yawDeg` (~180° offset) in `art/source/forge/recipes/steamshell.json` so the head faces South in `s` and leads the stride in `walk`/`run`, then re-packet.
3. **`B29` (C3b creature faces — OPEN NOW):** Run `forge.py faces --asset <creature>` on the 7 approved creature bodies (`rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap`) and submit packets. (`rivallie` and `mireling` now bind to their latest `2026-11-03`/`2026-11-04` packets!)
4. **`B20` (C26 readability re-bakes):** After `rivallie`, `mireling`, and `item:hatchet` are published in `B27`, re-bake the 4 quadrupeds + `item:hatchet` with C26 fields (`supersample: 4`, `features`, `rampShift`), restore `npc:oren` white beard/hair and `npc:reed` white shirt ramps, and refine `item:copper-sword` / `item:shortbow` silhouettes.
5. **`B25` (19 actor portrait sets) → `B24` (flora 3-states) → `B26` (worldforge map dressing) → `B5` (remaining AQ-2 landmarks) → `B18` (authored-artifact UI/props).** (`B23` 17 inventory icons is now `director-approved` and archived in `archive/blender.md`!)

B0 is standing.

## Now (Put Approved Art Into the Game First)

### B27 · Publish all approved bodies, items, environments, and human face sidecars

- status: in-progress (22 new staging JSONs published: all 11 human face sidecars, all 4 envs, all 6 held items, `ignicap`; **NOW UNBLOCKED:** `rivallie`, `mireling`, and `item:hatchet` after `visitor` marked their `2026-10-31`/`2026-11-01` records `superseded`; 10 NPC bodies and 2 winged creatures wait on Claude/Codex `publish.py` fix)
- goal: emit `art/source/staging/blender/*.json` and immutable `art/source/exports/**` for every `director-approved` packet so `communicator` (`M25`) can merge them into `art/source/manifest.json` immediately.
- inputs: repaired approval records in `docs/team/comms/director/approvals/*.md` (verified via `forge.py approve-record`).
- work:
  1. **Never re-run `pixelize`, `faces`, `qa`, or `packet` on these assets before publishing** (changing `sourceDigest` voids the approval record, `PRD-9`).
  2. **Run NOW (unblocked by `visitor` superseding the old Oct 31 / Nov 1 records):**
     - `uv run --project art/source/forge python art/source/forge/forge.py publish --asset rivallie` (updates staging from `2026-10-31-rivallie` to `2026-11-03-rivallie`, digest `00ef463a2f665c35...`)
     - `uv run --project art/source/forge python art/source/forge/forge.py publish --asset mireling` (updates staging from backward-walking `2026-11-01-mireling` to fixed `2026-11-04-mireling`, digest `16a58b960293833e...`)
     - `uv run --project art/source/forge python art/source/forge/forge.py publish --asset item:hatchet` (updates staging from `2026-11-01-item-hatchet` to `2026-11-03-item-hatchet`, digest `e293442d74928c96...`)
  3. **Waiting on Claude/Codex 2-line fix to `forgelib/publish.py` (`npc:` colon slug + winged `stride` fallback):**
     - **Creatures (2):** `zephyrit`, `cindermoth` (**skip `steamshell`** which is `changes-requested` under `B28`).
     - **Humans (10):** `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`.
  4. **Already published in `B27` Step 1 (done):**
     - **Creatures (1):** `ignicap` (plus `bramblefang`, `marshstalker`, `player-aqualia`).
     - **Held items (6):** `item:fishing-rod`, `item:hoe`, `item:hunting-spear`, `item:ferry-pole`, `item:copper-sword`, `item:shortbow`.
     - **Environments (4):** `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth` (plus `env:house-aqualia`).
     - **Human face sidecars (11):** `player-aqualia`, `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`.
- done when: `rivallie`, `mireling`, and `item:hatchet` are re-published to their `2026-11-03`/`2026-11-04` digests (and the 10 NPCs + 2 winged creatures once `publish.py` lands)
- evidence: art/source/staging/blender/{env-landmark-waystone,env-prop-hearth,env-tree-oak,env-well,ignicap,item-copper-sword,item-ferry-pole,item-fishing-rod,item-hoe,item-hunting-spear,item-shortbow,player-aqualia-faces,npc-neris-faces,npc-caelum-faces,npc-dara-faces,npc-finn-faces,npc-lark-faces,npc-marina-faces,npc-mira-faces,npc-oren-faces,npc-reed-faces,npc-willa-faces}.json; docs/team/comms/blender/2026-11-04T1840--to-communicator-visitor--b27-published.md.

### B28 · Fix `steamshell` 180° backward yaw and re-packet

- status: done (director-approved in docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell.md; published and staged to art/source/staging/blender/steamshell.json)
- goal: orient `steamshell` so its tan head and eyes face South in `s` (Col 1) and East in `e` (Col 3), and so `walk`/`run` move head-first instead of shell-first.
- inputs: `docs/team/comms/director/approvals/steamshell--2026-11-03-steamshell.md`, `art/source/forge/recipes/steamshell.json`, `art/review/2026-11-03-steamshell/contact.png`.
- work:
  1. In `art/source/forge/recipes/steamshell.json`, adjust `rig.yawDeg` by ~`180` degrees (matching the `mireling` fix in `2026-11-04-mireling`).
  2. Run `uv run --project art/source/forge python art/source/forge/forge.py rig --asset steamshell` followed by `animate -> bake -> pixelize -> qa -> packet`.
  3. Open `art/source/forge/work/steamshell/contact.png` with `read_file` (`PRD-5`): verify that `idle` Col 1 (`s`) shows the tan head and eyes facing the viewer, Col 3 (`e`) faces right, and `walk`/`run` step forward head-first.
  4. Post `--to-visitor-communicator--steamshell-yaw-fixed` with the new packet path and digest.
- done when: new `art/review/<date>-steamshell/` packet passes 12/12 hard QA checks and visual orientation check (`PRD-5`)
- evidence: art/review/2026-11-05-steamshell/; docs/team/comms/blender/2026-11-05T0100--to-visitor-communicator--steamshell-yaw-fixed.md; art/source/staging/blender/steamshell.json

### B29 · Creature face decals (C3b) on the 7 approved creature bodies

- status: candidate (packets emitted for all 8 creatures; rivallie, bramblefang, mireling candidate; marshstalker, zephyrit, cindermoth, ignicap, steamshell draft; all contact.png and registered.png inspected per PRD-5)
- goal: generate and register 5-expression × 5-forward-facing (`s`, `se`, `sw`, `e`, `w`) face decal sidecars on the 7 approved creature bodies (`rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap`), plus `steamshell` once `B28` is approved.
- inputs: `docs/team/comms/claude/2026-11-04T2356--to-blender--go-c3b-faces-and-publish-faces.md`, `art/source/forge/forgelib/faces.py` (C3b).
- work, one creature at a time:
  1. Run `uv run --project art/source/forge python art/source/forge/forge.py faces --asset <creature>`.
  2. Open both `contact.png` and `registered.png` in the emitted `art/review/<date>-<creature>-faces-<hash>/` packet (`PRD-5`).
  3. Verify `faces.json` passes `faceCoverage` and `faceDistinct` (`status: candidate`, `0` overhang pixels) and that the eyes/mouth sit cleanly on the 3D head across all 5 forward facings.
  4. Post `--to-visitor-communicator--creature-faces-candidates` for acting-director approval (`V5`).
- done when: 7 creature face packets (8 after `steamshell`) are `candidate` in `art/review/` and inspected per `PRD-5`
- evidence: art/review/2026-11-05-{rivallie,bramblefang,mireling,marshstalker,zephyrit,cindermoth,ignicap,steamshell}-faces-*/; docs/team/comms/blender/2026-11-05T0115--to-visitor-communicator--creature-faces-candidate.md

## Next (Quality Re-bakes, Icons, Portraits, Flora & World Dressing)

### B20 · C26 readability re-bakes for creatures, `npc:oren`/`npc:reed`, and held weapons

- status: open (unblocked: B19 and C26 are approved; **run only after `B27` finishes publishing the current approved digests**)
- goal: upgrade the 4 quadrupeds (`rivallie`, `bramblefang`, `marshstalker`, `mireling`) and `item:hatchet` with C26 readability fields, and resolve the non-blocking ramp/silhouette defects noted in the `2026-11-05` acting-director audit on `npc:oren`, `npc:reed`, `item:copper-sword`, and `item:shortbow`.
- inputs: `art/source/forge/recipes/README.md` (C26 fields: `supersample`, `features`, `rampShift`, `outline.mode: "dark-ramp"`, `minFeaturePx`); audit notes in `docs/team/comms/visitor/2026-11-05T0030--to-claude--acting-director-audit-and-tool-findings.md`.
- work, one asset at a time (only after `B27` is committed!):
  1. **Quadrupeds (`rivallie`, `bramblefang`, `marshstalker`, `mireling`) & `item:hatchet`:** Set `"supersample": 4` in each recipe, add `features` for sub-pixel anatomy (fangs, horns, crests, lures — not eyes, which are C3b decals in `B29`), and `rampShift` for dark coats. Re-run `pixelize -> qa -> packet`.
  2. **`npc:oren` & `npc:reed` white-ramp separation:** Add `features` / positive `rampShift` toward `ivory`/`cream` in `recipes/npc-oren.json` (white beard and hair) and `recipes/npc-reed.json` (white shirt sleeves) so warm directional lighting no longer collapses them into the brown/tan ramp. Re-run `pixelize -> qa -> packet`.
  3. **`item:copper-sword` & `item:shortbow` silhouette refinement:** Reduce or tune `minFeaturePx` (and/or re-run after Claude/Codex's `item_orient.py` webbing/anisotropic fix) so the sword crossguard/blade taper and bow interior arc read clearly across all 65 poses.
- done when: updated packets are in `art/review/` (`candidate`), inspected via `read_file` (`PRD-5`), and submitted for approval (`V6`)
- evidence:

### B25 · Portraits and expression sets (after C30, see [imagegen](../../engineering/imagegen.md))

- status: open (`forge.py portrait` landed in C30b; 19 actors; check if Claude's `portrait.py` LAB color-lock & interior-mask update has landed before batching all 19)
- goal: the 19 Aqualia actors (the player, 10 villagers, 8 species) each have the nine-emotion portrait set (portrait contract v2).
- work: `forge.py portrait --asset <id>` per actor, the player and Neris first; inspect all nine emotions at 96 and 128 px against the neutral portrait (`PRD-5`) to verify hair/skin/coat colours and the 2-px border do not drift across expressions.
- done when: 19 sets `candidate`, posted `--to-visitor-communicator--`
- evidence:

### B24 · Flora in three states (environment kind)

- status: open (unblocked: B19 and the B5 golden core are `director-approved`)
- goal: the six gatherable flora show their state in game (`docs/art/coverage.md`): `flora_{berries,reeds,wheat,nectar,ashgrass,fungi}_{healthy,harvested,burnt}` (18 sprites).
- work, one flora at a time: the healthy sheet first (`prop-v1`, front and left views, plain background), forged as a 1 × 1 environment asset. Make the harvested and burnt sheets with `concept`, using the healthy sheet as the first reference so the plant stays the same, then forge each one.
- done when: 18 sprites in packets `candidate`, posted `--to-visitor-communicator--`
- evidence:

### B26 · Dress the village and the Riverlands with the approved B5 kit

- status: open (unblocked for the 5 `director-approved` B5 environment assets: `env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`)
- goal: the approved maps (`village-2`, `riverlands-2`, layout scope) show the approved buildings, landmarks, kit pieces and flora at their AQ-2 positions.
- work: `world-builder` skill, one pass per area: place the approved environment assets at their landmarks, `apply`, `render`, open every screen crop (`PRD-5`), `check`, fix.
- done when: a dressing packet per level `candidate`, posted `--to-visitor-communicator--`
- evidence:

### B5 · Aqualia environment kit (remaining AQ-2 landmarks and kit pieces)

- status: in-progress (golden core of 5 assets `director-approved` and queued for publishing in `B27`: `env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`)
- goal: forge the remaining AQ-2 village, riverlands, and reusable kit pieces one at a time with the `environment-forge` skill:
  - [ ] village: notice board, ferry landing and dock, Diver's Pool platform, Lantern Bridge (with parapet lanterns), Oren's mill and waterwheel, Finn's sluice gate, Caelum's gauge tower, weir walk, Spring Shrine and cave mouth, Weavers' Row porch, reed drying racks and laundry lines, Dara's courier post, Willa's stilt hut and herb beds, fishing pier, Lark's studio;
  - [ ] riverlands: willow (Lark's Bend), Kite Oak, willow footbridge, ferry bell post, fungi ring, sunken gauge post, drowned tree, warm-spring rim rocks;
  - [ ] kit pieces reused everywhere: boardwalk straight/corner/end, lantern post, fence, crate and barrel, reed clump, rock large/small.
- done when: a packet per asset, each `candidate`, posted `--to-visitor-communicator--`
- evidence: `env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth` (`director-approved` in `docs/team/comms/director/approvals/env-*.md`).

### B18 · Art for notes, books and paintings

- status: open (unblocked: B15 step 3 is complete)
- goal: the UI and props the authored-artifacts feature needs (codex C17–C20), so it ships with real art instead of placeholders.
- inputs: [authored artifacts spec](../../engineering/authored-artifacts.md) §3, §7.5, §8; doctrine AGT-6, AGT-8, UI direction (`docs/doctrine/04-ui-direction.md`); the UI kit generator `art/source/ui/`.
- work:
  1. Item icons (`icon.item` canvas, doctrine palette): blank note, written note, blank book, written book, blank canvas, painting (with a 16×11 transparent thumbnail window).
  2. Book screen art in the UI kit: two-page spread frame and single-page note frame, page-turn arrows, a seal stamp.
  3. Painting frame for 48×32 art px paintings (wall display and the 4× preview), plus a cloth-covered "in progress" easel state.
  4. Reference sheets (`PRD-3`, front plus left view) for the display furniture you then forge with the environment kind: wall hook, shelf, lectern, easel.
- done when: icons and frames are in the UI kit build and packeted for the director; the four sheets are registered with `sheet.json`
- evidence:

## Standing

### B0 · Machine-A test runner (standing)

- status: open (standing)
- goal: run the GPU and Blender checks the other members can't run on machine B.
- work: after every `git pull`, look for `--to-blender--test-` messages. Run exactly the command given, open every image it produces, reply with the full output and what you saw. Stop every server you started.
- done when: never closes; each reply is pushed
- evidence:
