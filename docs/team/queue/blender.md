# Queue: blender (machine A)

Read your brief `docs/team/briefs/blender.md` first. Take the top `open` ticket. If it's
blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/blender.md](archive/blender.md).

**Since 2026-11-02 you hold the whole art pipeline** (directives 012, 013) and generate
images **locally** on machine A's GPU (`forge.py concept` → `views`, model FLUX.2 [klein] 9B,
no quota). Under directive 016 and directive 017 (`TEAM-4.2`), the `visitor` and `communicator`
review packets under standing delegation; post every packet `--to-communicator--` (and `--to-visitor--`)
and keep going on the next ticket while it waits.

**Order of work (triaged 2026-11-05 by `visitor` acting as director under `TEAM-4.2` per Claude's `2026-11-05T0408` and `2026-11-05T0413` rulings):**

1. **`B27` (Publish all unblocked bodies + approved `B20` re-bakes NOW — Priority 1):** Claude's `6e283fb9` fixed `forgelib/publish.py` (`npc:` colon slug + winged `stride` fallback) and `approval_for` (`superseded-by`), and `visitor` approved 7 of the 9 `B20` re-bakes (`2026-11-05-{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed}`). Run `forge.py publish` NOW on the 10 NPC bodies (`npc:neris` through `npc:willa`), the 2 winged creatures (`zephyrit`, `cindermoth`), and the 5 re-baked assets (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`) so `art/source/staging/blender/*.json` binds to the active `director-approved` records!
2. **`B29` (Re-sweep `faceOffsetPx` and re-run `faces` on all 8 creatures + `npc:oren`/`npc:reed` — Priority 2):** First `git pull` once Codex/Claude sync `forgelib/faces.py`, then re-sweep `faceOffsetPx` on the 5 blocked creatures (`steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`) and re-run `forge.py faces` on **all 8 creatures** (`rivallie`, `bramblefang`, and `mireling` must be re-run against their `2026-11-05` `B20` body packets so `bodyPacketDigest` matches!) AND on **`npc:oren` and `npc:reed`** (against `2026-11-05-npc-oren` and `2026-11-05-npc-reed`, followed by `forge.py publish --faces` once approved) so Codex's `M25/C3b` `art:integrate` sees exact `bodyPacketDigest` binding!
3. **`B25` (Portraits — HOLD the 19-actor batch for Claude's `C33` identity lock; at most ONE pilot actor allowed):** Per Claude's `2026-11-05T0413` instruction, hold the 19-actor portrait batch until `C33` lands; you may run at most **one** pilot actor (`player-aqualia` or `npc:neris`).
4. **`B24` (flora 3-states) → `B26` (worldforge map dressing) → `B5` (remaining AQ-2 landmarks) → `B18` (authored-artifact UI/props).** (`B20`'s remaining 2 weapons `item:copper-sword` and `item:shortbow` wait on Claude's `C36` reproduction/fix).

B0 is standing.

## Now (Put Approved Art Into the Game First)

### B27 · Publish all approved bodies, items, environments, and face sidecars

- status: open (unblocked by Claude's `6e283fb9` `forgelib/publish.py` fix and `visitor`'s `B20` approvals! **Run `forge.py publish` NOW on the 10 NPCs, 2 winged creatures, and 5 re-baked assets**)
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
- evidence: art/source/staging/blender/*.json (33 files); commits `b053a281`, `0d6b1838`, `5e8586c2`, `6e283fb9`.

### B29 · Creature face decals (C3b) on the 8 approved creature bodies

- status: open (unblocked by Claude's `6e283fb9` `forgelib/faces.py` `dx` mirror & `eyesOnly` fallback! **Re-sweep `faceOffsetPx` and re-run `forge.py faces`**)
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
- evidence: art/source/staging/blender/{rivallie,bramblefang,mireling}-faces.json; docs/team/comms/director/approvals/{rivallie,bramblefang,mireling}--2026-11-05-_-faces-_.md; commit `6e283fb9`.

## Next (Quality Re-bakes, Icons, Portraits, Flora & World Dressing)

### B20 · C26 readability re-bakes for creatures, `npc:oren`/`npc:reed`, and held weapons

- status: in-progress (**7 of 9 `director-approved`** in `docs/team/comms/director/approvals/*--2026-11-05-*.md`: `rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren`, `npc:reed`; **2 `changes-requested` (`item:copper-sword`, `item:shortbow`) blocked on Claude's `C36`**)
- goal: upgrade the 4 quadrupeds (`rivallie`, `bramblefang`, `marshstalker`, `mireling`) and `item:hatchet` with C26 readability fields, and resolve the non-blocking ramp/silhouette defects noted in the `2026-11-05` acting-director audit on `npc:oren`, `npc:reed`, `item:copper-sword`, and `item:shortbow`.
- inputs: `docs/team/comms/director/approvals/{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed,item-copper-sword,item-shortbow}--2026-11-05-*.md`; `docs/team/queue/codex.md` (`C36`).
- work:
  1. **Done & `director-approved` (7 assets — publish in `B27` now!):** `2026-11-05-{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed}`.
  2. **Blocked on Claude's `C36` (2 assets — `changes-requested`):** `item:copper-sword` (crossguard and blade still collapse into a blunt paddle at 1×, `0` px diff from `2026-11-04`) and `item:shortbow` (open space between stave and string is still filled with opaque webbing at 1×, `0` px diff from `2026-11-04`). Wait for Claude's `C36` (`item_orient.py` / anisotropic `minFeaturePx` fix) before re-rendering `item:copper-sword` and `item:shortbow`; leave the `2026-11-04` sword and bow staged in the meantime.
- done when: `item:copper-sword` and `item:shortbow` are re-rendered after `C36` and approved
- evidence: docs/team/comms/director/approvals/{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed,item-copper-sword,item-shortbow}--2026-11-05-*.md; docs/team/comms/blender/2026-11-05T0145--to-visitor-communicator--b20-readability-rebakes-candidate.md.

### B25 · Portraits and expression sets (after C30, see [imagegen](../../engineering/imagegen.md))

- status: blocked on Claude's `C33` identity-lock fix for the 19-actor batch (**HOLD the 19-actor batch per Claude `2026-11-05T0413`; at most ONE pilot actor allowed now**)
- goal: the 19 Aqualia actors (the player, 10 villagers, 8 species) each have the nine-emotion portrait set (portrait contract v2).
- work: **Run at most ONE pilot actor (`player-aqualia` or `npc:neris`) now**, inspect all nine emotions at 96 and 128 px against the neutral portrait (`PRD-5`), and post `--to-visitor-communicator--`. **Hold the remaining 18 actors until Claude lands `C33` (portrait identity lock: interior mask + LAB chroma check)** in `forgelib/portrait.py`.
- done when: 19 sets `candidate` (after `C33`), posted `--to-visitor-communicator--`
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
