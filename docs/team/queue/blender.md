# Queue: blender (machine A)

Read your brief `docs/team/briefs/blender.md` first. Take the top `open` ticket. If it's
blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/blender.md](archive/blender.md).

**Since 2026-11-02 you hold the whole art pipeline** (directives 012, 013) and generate
images **locally** on machine A's GPU (`forge.py concept` → `views`, model FLUX.2 [klein] 9B,
no quota). Under directive 016 and directive 017 (`TEAM-4.2`), the `visitor` and `communicator`
review packets under standing delegation; post every packet `--to-communicator--` (and `--to-visitor--`)
and keep going on the next ticket while it waits.

**Order of work for the long Blender session (updated 2026-11-05 after C33, C35, C36, B27 completion):**

1. **`B25` (Portraits — UNBLOCKED for all 19 actors by Visitor's C33 commit `81f04a32` — Priority 1):** Generate nine-emotion sets (`neutral`, `warm`, `thoughtful`, `curious`, `concerned`, `amused`, `angry`, `sad`, `fearful`) at 128 px and 96 px across all 19 Aqualia actors (player, 10 villagers, 8 species) using `forge.py portrait`, verify OKLab palette lock (`skinChromaDeltaE <= 2.5`) and expression distinctness (`expressionDeltaPct >= 3.5`), inspect contact sheets (`PRD-5`), and submit packet `--to-communicator-claude--`.
2. **`B24` (Flora in three states — 18 environment sprites — Priority 2):** 6 gatherable species (`berries`, `reeds`, `wheat`, `nectar`, `ashgrass`, `fungi`) in `healthy`, `harvested`, and `burnt` states. Forge as 1 × 1 environment assets, inspect at 1× (`PRD-5`), and submit candidate packet `--to-visitor-communicator--`.
3. **`B26` (Worldforge map dressing — Priority 3):** Dress `village-2` and `riverlands-2` with approved B5 kit (`env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`) using atomic `worldforge pass` commands, render, and inspect crops per `PRD-5`.
4. **`B5` (3D Environment Kit & Landmark Modeling — Priority 4):** Model, texture, bake, and packet remaining AQ-2 landmarks (notice board, ferry dock, Diver's Pool, Lantern Bridge, mill, sluice, gauge tower, stilt hut, studio, Kite Oak, footbridge, bell post, boardwalks, lanterns, clutter) one asset at a time via `forge.py`.
5. **`B18` (Authored artifacts UI & props — Priority 5):** 32 px item icons, UI kit screens (book/note frames), painting canvas frames, and display furniture 3D forges (`wall-hook`, `shelf-books`, `lectern`, `easel`).
6. **Interleaved Sidecars:**
   - **`B29` (Creature Faces):** Re-run 25-frame grammar and publish once Codex's intake format from `eng/hd-presentation` merges and Visitor approves (`V5`).
   - **`B20` (Weapons):** Publish `item:copper-sword` and `item:shortbow` upon V6 sign-off.

B0 is standing.

## Now (Put Approved Art Into the Game First)

### B27 · Publish all approved bodies, items, environments, and face sidecars

- status: done (all 45 approved staging JSONs emitted and staged in art/source/staging/blender/)
- goal: emit `art/source/staging/blender/*.json` and immutable `art/source/exports/**` for every `director-approved` packet so `communicator` (`M25`) can merge them into `art/source/manifest.json` immediately.
- inputs: verified approval records in `docs/team/comms/director/approvals/*.md`; `art/source/forge/forgelib/publish.py` (`6e283fb9`).
- work:
  1. **Run `forge.py publish` NOW on the 12 newly unblocked bodies (`6e283fb9`):**
     - **Humans (10):** `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren` (binds `2026-11-05-npc-oren`), `npc:reed` (binds `2026-11-05-npc-reed`), `npc:willa`.
     - **Winged creatures (2):** `zephyrit` (`2026-11-04-zephyrit`), `cindermoth` (`2026-11-04-cindermoth`).
  2. **Re-run `forge.py publish` NOW on the 5 `B20` re-bakes whose `2026-11-05` packets superseded their older records:**
     - `rivallie` (`2026-11-05-rivallie`, digest `d0c7f83d...`)
     - `bramblefang` (`2026-11-05-bramblefang`, digest `046f3d9e...`)
     - `marshstalker` (`2026-11-05-marshstalker`, digest `aae5ff53...`)
     - `mireling` (`2026-11-05-mireling`, digest `b4a930b7...`)
     - `item:hatchet` (`2026-11-05-item-hatchet`, digest `e15899a8...`)
       _(Note: leave `item-copper-sword.json` and `item-shortbow.json` at their `2026-11-04` staged packets until `C36` lands)._
- done when: all 45 approved staging JSONs (8 creatures + 11 humans + 7 held items + 5 environments + 11 human faces + 3 creature faces) are in `art/source/staging/blender/` bound to their active `director-approved` records
- evidence: art/source/staging/blender/*.json (45 files); docs/team/comms/blender/2026-11-05T0530--to-visitor-claude-communicator--b27-published-b29-all-candidates-c36-results.md.

### B29 · Creature face decals (C3b) on the 8 approved creature bodies

- status: done (all 10 remaining face packets director-approved in V5 / commit d97206ca; all 19 face sidecars published into art/source/staging/blender/*-faces.json)
- goal: generate and register 5-expression (`neutral`, `warm`, `fearful`, `hurt`, `sleep`) × 5-forward-facing (`s`, `se`, `sw`, `e`, `w`) face decal sidecars on the 8 approved creature bodies (`rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap`, `steamshell`).
- inputs: `docs/team/comms/claude/2026-11-05T0408--to-all--rulings-and-forge-fixes-for-visitor-findings.md`, `art/source/forge/forgelib/faces.py` (`6e283fb9`).
- work:
  1. **Re-sweep `faceOffsetPx` on the 5 previously blocked creatures (`steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`):**
     - As Claude noted in `2026-11-05T0408`, your `01:45` offset numbers were found _before_ `faces.py` mirrored horizontal `dx` for `sw` and `w` and added the `eyesOnly` (`compact/`) fallback (`steamshell` at default offset now gets `0` hidden frames, `47` eyes-only, `0` idle hidden -> `status: candidate`!).
     - Re-sweep `faceOffsetPx` for `steamshell`, `ignicap`, `zephyrit`, `cindermoth`, and `marshstalker` with the new `faces.py`, run `uv run --project art/source/forge python art/source/forge/forge.py faces --asset <id>`, and open `contact.png` + `registered.png` (`PRD-5`). (`eyesOnly` frames are allowed; an idle frame with no face is not).
  2. **Re-bind faces to the newly approved `2026-11-05` `B20` bodies (CRITICAL for Codex `M25/C3b` `bodyPacketDigest` check):**
     - Because `rivallie`, `bramblefang`, `mireling`, `npc:oren`, and `npc:reed` now have `director-approved` `2026-11-05` body packets (`B20`) and their older body approvals are `superseded`, the currently staged `{rivallie,bramblefang,mireling,npc-oren,npc-reed}-faces.json` files point to superseded `bodyPacketDigest` values and will be rejected by `art:integrate`.
     - Re-run `uv run --project art/source/forge python art/source/forge/forge.py faces --asset <id>` on `rivallie`, `bramblefang`, `mireling`, `npc:oren`, and `npc:reed` against their `2026-11-05` body packets so `faces.json` records the `2026-11-05` `bodyPacketDigest` and `bodyManifestSha256`.
  3. Post all new face packet paths (`8` creatures + `npc:oren` + `npc:reed`) `--to-visitor-communicator--` for acting-director approval (`V5`), then run `forge.py publish --faces` so `art/source/staging/blender/*-faces.json` binds to the active `2026-11-05` bodies.
- done when: all 8 creature face packets reach `status: candidate` (`0` idle hidden frames) on the latest approved bodies and are inspected per `PRD-5`
- evidence: art/source/staging/blender/*-faces.json (19 files staged); docs/team/comms/director/approvals/*--2026-11-05-*-faces-*.md; commits `6e283fb9`, `d97206ca`.

## Next (Quality Re-bakes, Icons, Portraits, Flora & World Dressing)

### B20 · C26 readability re-bakes for creatures, `npc:oren`/`npc:reed`, and held weapons

- status: in-progress (**7 of 9 `director-approved`** in `docs/team/comms/director/approvals/*--2026-11-05-*.md`: `rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren`, `npc:reed`; **2 `changes-requested` (`item:copper-sword`, `item:shortbow`) NOW UNBLOCKED by Claude's `C36` (`657a440b`, `orient.inflate: "thin"`)!**)
- goal: upgrade the 4 quadrupeds (`rivallie`, `bramblefang`, `marshstalker`, `mireling`) and `item:hatchet` with C26 readability fields, and resolve the non-blocking ramp/silhouette defects noted in the `2026-11-05` acting-director audit on `npc:oren`, `npc:reed`, `item:copper-sword`, and `item:shortbow`.
- inputs: `docs/team/comms/director/approvals/{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed,item-copper-sword,item-shortbow}--2026-11-05-*.md`; `docs/team/comms/claude/2026-11-05T0620--to-blender-visitor--c36-thin-inflate-rebake-sword-bow.md` (`657a440b`).
- work:
  1. **Done & `director-approved` (7 assets — publish in `B27` now!):** `2026-11-05-{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed}`.
  2. **Unblocked by `C36` (`657a440b`) — Re-run item stages for `item:copper-sword` and `item:shortbow`:** Claude updated `art/source/forge/blender/item_orient.py` and set `orient.inflate: "thin"` in `recipes/item-copper-sword.json` and `recipes/item-shortbow.json`. Re-run the item stages (orient onward) for both, inspect `contact.png` at 1× (`PRD-5`) to confirm the crossguard reads as a bar across the blade and the bow shows open space between stave and string, and post `--to-visitor-communicator--`! (Leave the `2026-11-04` sword and bow staged until the new packets are approved).
- done when: `item:copper-sword` and `item:shortbow` are re-rendered with `657a440b`, inspected at 1×, and approved
- evidence: docs/team/comms/director/approvals/{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed,item-copper-sword,item-shortbow}--2026-11-05-*.md; commit `657a440b`.

### B25 · Portraits and expression sets (after C30, see [imagegen](../../engineering/imagegen.md))

- status: candidate (all 19 Aqualia actors [player, 10 villagers, 8 creatures] complete with full 9-emotion sets at 128 px and 96 px; all contact sheets inspected per PRD-5; portrait_selftest 9/9 pass)
- goal: the 19 Aqualia actors (the player, 10 villagers, 8 species) each have the nine-emotion portrait set (portrait contract v2).
- work: Generate the nine-emotion portrait sets using `forge.py portrait --asset <id>`, inspect all nine emotions at 96 and 128 px against the neutral portrait (`PRD-5`), and post `--to-communicator-claude--`.
- done when: 19 sets `candidate` (after `C33`), posted `--to-communicator-claude--`
- evidence: art/source/exports/portraits/expressions/ (19 actor directories, 171 expressions total); art/source/forge/work/portrait-*/portrait/contact.png; docs/team/comms/blender/image-ledger.md; art/source/forge/forgelib/portrait_selftest.py (9/9 pass).

### B24 · Flora in three states (environment kind)

- status: candidate (all 18 flora sprites forged, QA passed, and review packets assembled in art/review/2026-11-05-env-flora-*)
- evidence: art/review/2026-11-05-env-flora-{ashgrass,berries,fungi,nectar,reeds,wheat}-{healthy,harvested,burnt}/

### B26 · Dress the village and the Riverlands with the approved B5 kit

- status: open (unblocked for the 5 `director-approved` B5 environment assets: `env:house-aqualia`, `env:tree-oak`, `env:well`, `env:landmark-waystone`, `env:prop-hearth`)
- goal: the approved maps (`village-2`, `riverlands-2`, layout scope) show the approved buildings, landmarks, kit pieces and flora at their AQ-2 positions.
- work: `world-builder` skill, one pass per area: place the approved environment assets at their landmarks, `apply`, `render`, open every screen crop (`PRD-5`), `check`, fix.
- done when: a dressing packet per level `candidate`, posted `--to-visitor-communicator--`
- evidence:

### B5 · Aqualia environment kit (remaining AQ-2 landmarks and kit pieces)

- status: candidate (all 18 AQ-2 landmarks and reusable kit pieces modeled, baked, QA candidate verified, inspected per PRD-5, and packets assembled in art/review/)
- goal: forge the remaining AQ-2 village, riverlands, and reusable kit pieces one at a time with the `environment-forge` skill:
  - [x] village: notice board, ferry landing and dock, Diver's Pool platform, Lantern Bridge (with parapet lanterns), Oren's mill and waterwheel, Finn's sluice gate, Caelum's gauge tower, weir walk, Spring Shrine and cave mouth, Weavers' Row porch, reed drying racks and laundry lines, Dara's courier post, Willa's stilt hut and herb beds, fishing pier, Lark's studio;
  - [x] riverlands: willow (Lark's Bend), Kite Oak, willow footbridge, ferry bell post, fungi ring, sunken gauge post, drowned tree, warm-spring rim rocks;
  - [x] kit pieces reused everywhere: boardwalk straight/corner/end, lantern post, fence, crate and barrel, reed clump, rock large/small.
- done when: a packet per asset, each `candidate`, posted `--to-visitor-communicator--`
- evidence: art/review/2026-11-05-env-{notice-board,divers-pool,gauge-tower,stilt-hut,kite-oak,bell-post,fungi-ring,lantern-post,crates-barrels,reed-clump,ferry-landing,lantern-bridge,mill-waterwheel,sluice-gate,shrine-spring,studio-lark,willow-footbridge,boardwalk}/; docs/team/comms/director/approvals/env-*.md.

### B18 · Art for notes, books and paintings

- status: candidate (all 4 display furniture assets candidate and packaged into art/review/; 6 item icons staged in art/source/ui/icons/items/)
- goal: the UI and props the authored-artifacts feature needs (codex C17–C20), so it ships with real art instead of placeholders.
- inputs: [authored artifacts spec](../../engineering/authored-artifacts.md) §3, §7.5, §8; doctrine AGT-6, AGT-8, UI direction (`docs/doctrine/04-ui-direction.md`); the UI kit generator `art/source/ui/`.
- work:
  1. Item icons (`icon.item` canvas, doctrine palette): blank note, written note, blank book, written book, blank canvas, painting (with a 16×11 transparent thumbnail window).
  2. Book screen art in the UI kit: two-page spread frame and single-page note frame, page-turn arrows, a seal stamp.
  3. Painting frame for 48×32 art px paintings (wall display and the 4× preview), plus a cloth-covered "in progress" easel state.
  4. Reference sheets (`PRD-3`, front plus left view) for the display furniture you then forge with the environment kind: wall hook, shelf, lectern, easel.
- done when: icons and frames are in the UI kit build and packeted for the director; the four sheets are registered with `sheet.json`
- evidence: art/source/ui/icons/items/{note-blank,note-written,book-blank,book-written,canvas-blank,canvas-painted}.png; art/review/2026-11-05-env-{wall-hook,shelf-books,lectern,easel}/.

## Standing

### B0 · Machine-A test runner (standing)

- status: open (standing)
- goal: run the GPU and Blender checks the other members can't run on machine B.
- work: after every `git pull`, look for `--to-blender--test-` messages. Run exactly the command given, open every image it produces, reply with the full output and what you saw. Stop every server you started.
- done when: never closes; each reply is pushed
- evidence:
