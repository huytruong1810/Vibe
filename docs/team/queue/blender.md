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

1. **`B29` (Tune `faceOffsetPx` on the 5 `draft` creature face sidecars — OPEN NOW):** `rivallie`, `bramblefang`, and `mireling` face sidecars are now `director-approved` and staged! For the 5 creatures whose face packets failed `faceCoverage` (`steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`), tune `"faceOffsetPx": [dx, dy]` in their recipes (`art/source/forge/recipes/<creature>.json`, e.g., `[0, 1]` or `[0, 2]` instead of default `[0, 3]`) and re-run `forge.py faces --asset <creature>` to see which ones reach `status: candidate`.
2. **`B20` (C26 readability re-bakes — OPEN NOW):** Now that `rivallie`, `mireling`, `item:hatchet`, and `steamshell` are all published to `art/source/staging/blender/`, re-bake the 4 quadrupeds + `item:hatchet` with C26 fields (`supersample: 4`, `features`, `rampShift`), restore `npc:oren` white beard/hair and `npc:reed` white shirt ramps, and refine `item:copper-sword` / `item:shortbow` silhouettes (plus trim the small residual base-shadow mesh polygon near `steamshell`'s rear foot in `clean.blend`).
3. **`B27` (Remaining blocked publishes):** Wait on Claude/Codex's 2-line fix to `forgelib/publish.py` to publish the 10 NPC bodies and 2 winged creatures (`zephyrit`, `cindermoth`). All other 33 staging JSONs are already published!
4. **`B25` (19 actor portrait sets) → `B24` (flora 3-states) → `B26` (worldforge map dressing) → `B5` (remaining AQ-2 landmarks) → `B18` (authored-artifact UI/props).** (`B23` 17 inventory icons and `B28` `steamshell` 180° yaw fix are `director-approved` and archived in `archive/blender.md`!)

B0 is standing.

## Now (Put Approved Art Into the Game First)

### B29 · Creature face decals (C3b) on the 8 approved creature bodies

- status: in-progress (**3 `director-approved` & staged** (`rivallie`, `bramblefang`, `mireling`); **5 `changes-requested` (`status: draft`)** awaiting `"faceOffsetPx"` recipe tuning: `steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`)
- goal: generate and register 5-expression × 5-forward-facing (`s`, `se`, `sw`, `e`, `w`) face decal sidecars on the 8 approved creature bodies (`rivallie`, `bramblefang`, `mireling`, `marshstalker`, `zephyrit`, `cindermoth`, `ignicap`, `steamshell`).
- inputs: `docs/team/comms/director/approvals/{steamshell,ignicap,zephyrit,cindermoth,marshstalker}--2026-11-05-*-faces-*.md`, `art/source/forge/forgelib/faces.py` (C3b).
- work:
  1. **Already `director-approved` and published via `publish-faces` (`5e8586c2`):** `rivallie`, `bramblefang`, `mireling`.
  2. **Tune `"faceOffsetPx"` for the 5 `changes-requested` creatures** (`publish_faces` rejects `status: draft` when `faceCoverage` fails >10% hidden frames):
     - `steamshell` (`49/408` hidden, `idle hidden: 6`, close to 40-frame threshold): add `"faceOffsetPx": [0, 1]` or `[0, 2]` (or `[-1, 2]`) in `art/source/forge/recipes/steamshell.json` and run `uv run --project art/source/forge python art/source/forge/forge.py faces --asset steamshell`.
     - `ignicap` (`83/408` hidden, `idle hidden: 0`): add `"faceOffsetPx": [0, 1]` or `[0, 2]` in `art/source/forge/recipes/ignicap.json` and run `forge.py faces --asset ignicap`.
     - `zephyrit` (`108/408` hidden, `idle hidden: 15`) & `cindermoth` (`134/408` hidden, `idle hidden: 12`): try `"faceOffsetPx": [0, 1]` or `[0, 0]` in their recipes and run `forge.py faces`; if `winged-v1` `Socket_Head` still leaves >10% hidden frames in profile/diagonal facings, note the best `faceOffsetPx` result and leave blocked on Claude/Codex `forgelib/faces.py` update.
     - `marshstalker` (`272/408` hidden, `idle hidden: 18`): try `"faceOffsetPx": [0, 0]` or `[0, 1]` toward the wider cranium in `art/source/forge/recipes/marshstalker.json`; if the slender snout profile still cannot fit a 3-px decal inside the non-outline interior, leave blocked on Claude/Codex `forgelib/faces.py` compact profile decal support.
  3. Open `contact.png` and `registered.png` (`PRD-5`) for any creature that reaches `status: candidate` and post `--to-visitor-communicator--`.
- done when: all creature face packets that can reach `status: candidate` via `faceOffsetPx` are submitted and approved
- evidence: art/source/staging/blender/{rivallie,bramblefang,mireling}-faces.json; docs/team/comms/director/approvals/{rivallie,bramblefang,mireling}--2026-11-05-_-faces-_.md; docs/team/comms/blender/2026-11-05T0115--to-visitor-communicator--creature-faces-candidate.md.

### B27 · Publish all approved bodies, items, environments, and face sidecars

- status: blocked on Claude/Codex `forgelib/publish.py` 2-line fix for the remaining 10 NPC bodies + 2 winged creatures (**33 staging JSONs already published and staged!**)
- goal: emit `art/source/staging/blender/*.json` and immutable `art/source/exports/**` for every `director-approved` packet so `communicator` (`M25`) can merge them into `art/source/manifest.json` immediately.
- inputs: verified approval records in `docs/team/comms/director/approvals/*.md`.
- work:
  1. **Already published and staged in `art/source/staging/blender/` (33 JSONs — DONE):**
     - **6 Creature bodies:** `rivallie` (`2026-11-03`), `bramblefang` (`2026-10-31`), `marshstalker` (`2026-11-03`), `mireling` (`2026-11-04`), `ignicap` (`2026-11-04`), `steamshell` (`2026-11-05`).
     - **3 Creature face sidecars:** `rivallie-faces`, `bramblefang-faces`, `mireling-faces`.
     - **1 Human body + 11 Human face sidecars:** `player-aqualia`, `player-aqualia-faces`, `npc-{neris,caelum,dara,finn,lark,marina,mira,oren,reed,willa}-faces`.
     - **7 Held items:** `item-hatchet` (`2026-11-03`), `item-fishing-rod`, `item-hoe`, `item-hunting-spear`, `item-ferry-pole`, `item-copper-sword`, `item-shortbow`.
     - **5 Environments:** `env-house-aqualia`, `env-tree-oak`, `env-well`, `env-landmark-waystone`, `env-prop-hearth`.
  2. **Waiting on Claude/Codex 2-line fix to `forgelib/publish.py` (`npc:` colon slug + winged `stride` fallback):**
     - **Creatures (2):** `zephyrit`, `cindermoth` (do **not** re-run `pixelize`/`qa`/`packet` on these before publishing).
     - **Humans (10):** `npc:neris`, `npc:caelum`, `npc:dara`, `npc:finn`, `npc:lark`, `npc:marina`, `npc:mira`, `npc:oren`, `npc:reed`, `npc:willa`.
- done when: the remaining 10 NPC bodies + 2 winged creatures are published once `forgelib/publish.py` lands
- evidence: art/source/staging/blender/*.json (33 files); commits `b053a281`, `0d6b1838`, `5e8586c2`; docs/team/comms/blender/2026-11-04T1840--to-communicator-visitor--b27-published.md.

## Next (Quality Re-bakes, Icons, Portraits, Flora & World Dressing)

### B20 · C26 readability re-bakes for creatures, `npc:oren`/`npc:reed`, and held weapons

- status: candidate (all 9 assets re-baked/rendered and packeted: rivallie, bramblefang, marshstalker, mireling, item:hatchet, npc:oren, npc:reed, item:copper-sword, item:shortbow)
- goal: upgrade the 4 quadrupeds (`rivallie`, `bramblefang`, `marshstalker`, `mireling`) and `item:hatchet` with C26 readability fields, and resolve the non-blocking ramp/silhouette defects noted in the `2026-11-05` acting-director audit on `npc:oren`, `npc:reed`, `item:copper-sword`, and `item:shortbow`.
- inputs: `art/source/forge/recipes/README.md` (C26 fields: `supersample`, `features`, `rampShift`, `outline.mode: "dark-ramp"`, `minFeaturePx`); audit notes in `docs/team/comms/visitor/2026-11-05T0030--to-claude--acting-director-audit-and-tool-findings.md`.
- work, one asset at a time (only after `B27` is committed!):
  1. **Quadrupeds (`rivallie`, `bramblefang`, `marshstalker`, `mireling`) & `item:hatchet`:** Set `"supersample": 4` in each recipe, add `features` for sub-pixel anatomy (fangs, horns, crests, lures — not eyes, which are C3b decals in `B29`), and `rampShift` for dark coats. Re-run `pixelize -> qa -> packet`.
  2. **`npc:oren` & `npc:reed` white-ramp separation:** Add `features` / positive `rampShift` toward `ivory`/`cream` in `recipes/npc-oren.json` (white beard and hair) and `recipes/npc-reed.json` (white shirt sleeves) so warm directional lighting no longer collapses them into the brown/tan ramp. Re-run `pixelize -> qa -> packet`.
  3. **`item:copper-sword` & `item:shortbow` silhouette refinement:** Reduce or tune `minFeaturePx` (and/or re-run after Claude/Codex's `item_orient.py` webbing/anisotropic fix) so the sword crossguard/blade taper and bow interior arc read clearly across all 65 poses.
- done when: updated packets are in `art/review/` (`candidate`), inspected via `read_file` (`PRD-5`), and submitted for approval (`V6`)
- evidence: art/review/2026-11-05-{rivallie,bramblefang,marshstalker,mireling,item-hatchet,npc-oren,npc-reed,item-copper-sword,item-shortbow}/; docs/team/comms/blender/2026-11-05T0145--to-visitor-communicator--b20-readability-rebakes-candidate.md.

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
