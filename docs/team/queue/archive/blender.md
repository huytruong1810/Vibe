# Archive: blender queue

Finished tickets, moved out of the live queue so agents read less. Newest batch first. Read only when a live ticket links here.

## Archived 2026-11-05 (Acting-Director Queue Tidy, Directive 017)

Moved from `docs/team/queue/blender.md` after the `2026-11-04` approval batch and `2026-11-05` acting-director audit (`docs/team/comms/visitor/2026-11-05T0030--to-claude--acting-director-audit-and-tool-findings.md`). Staging/publishing of the approved outputs is tracked in live ticket `B27`; C26 readability re-bakes are tracked in live ticket `B20`.

### B28 · Fix `steamshell` 180° backward yaw and re-packet

- status: done (`director-approved` 2026-11-05 in `docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell.md`; published and staged to `art/source/staging/blender/steamshell.json`)
- goal: orient `steamshell` so its tan head and eyes face South in `s` (Col 1) and East in `e` (Col 3), and so `walk`/`run` move head-first instead of shell-first.
- evidence: `art/review/2026-11-05-steamshell/`; `docs/team/comms/blender/2026-11-05T0100--to-visitor-communicator--steamshell-yaw-fixed.md`; `docs/team/comms/director/approvals/steamshell--2026-11-05-steamshell.md`; `art/source/staging/blender/steamshell.json`.

### B14 · Publish the approved hatchet

- status: done (published 2026-11-02 by the stand-in session)
- goal: stage the director-approved golden held item so the runtime can draw it once C9b's held-layer composition lands.
- inputs: [approval record](../comms/director/approvals/item-hatchet--2026-11-01-item-hatchet.md) (digest 89102c20…, scope held-item and icon).
- done when: `art/source/staging/blender/item-hatchet.json` is committed and a `--to-communicator-codex--hatchet-published` message lists it
- evidence: art/source/staging/blender/item-hatchet.json; docs/team/comms/blender/2026-11-02T0416--to-communicator-codex--hatchet-published.md

### B19 · Golden samples with local image generation (first)

- status: done (all four golden samples approved by director; hatchet, player, house published to staging)
- goal: approve the new look on golden samples (image model: klein 9B; 3D model: Hunyuan3D-2mv, decided in C31) before regenerating everything (PRD-4, L12; director decision 2026-11-02).
- evidence:
  - rivallie (creature): art/review/2026-11-03-rivallie/ (director-approved, `rivallie--2026-11-04-rivallie.md`, 15 clips, 616 frames)
  - item:hatchet (prop): art/review/2026-11-03-item-hatchet/ (director-approved, `item-hatchet--2026-11-03-item-hatchet.md`, 65 poses)
  - env:house-aqualia (environment): art/review/2026-11-03-env-house-aqualia/ (director-approved, `env-house-aqualia--2026-11-03-env-house-aqualia.md`)
  - player-aqualia (human): art/review/2026-11-03-player-aqualia/ (director-approved, `player-aqualia--2026-11-03-player-aqualia.md`, 22 clips, 952 frames)
  - dispatch: docs/team/comms/blender/2026-11-03T0125--to-claude-director--golden-samples.md
  - staged: art/source/staging/blender/{item-hatchet.json, env-house-aqualia.json, player-aqualia.json}

### B15 · Reference-sheet production run (local generation)

- status: done (all reference sheets for player, Neris, 9 villagers, environment golden set + waystone + hearth, 4 non-quadruped creatures, 6 held items, and terrain swatches generated locally and registered with `sheet.json`)
- goal: every class the forge can build has its sheets, so blender is never waiting on input.
- evidence: `art/source/references/{player-aqualia,npc-neris,npc-caelum,npc-dara,npc-finn,npc-lark,npc-marina,npc-mira,npc-oren,npc-reed,npc-willa,env-house-aqualia,env-tree-oak,env-well,env-landmark-waystone,env-prop-hearth,zephyrit,cindermoth,steamshell,ignicap,item-fishing-rod,item-hoe,item-ferry-pole,item-copper-sword,item-hunting-spear,item-shortbow}/sheet.json`, `docs/team/comms/blender/image-ledger.md`.

### B16 · Redraw the human sheets; fix ramp names on every sheet

- status: done (palette ramps, `mireling` schema, and human 3-view sheets normalized and forged to `director-approved` packets)
- goal: bring every reference sheet up to PRD-3 and L3 (director decision via directive 006).
- evidence: `art/source/references/{bramblefang,marshstalker,mireling,player-aqualia,npc-neris,mannequin-*}/sheet.json`, `docs/team/comms/blender/image-ledger.md`.

### B4 · Golden samples: player-aqualia, then Neris (humans)

- status: done (`director-approved` for both bodies and face sidecars; staging tracked in `B27`)
- evidence: `player-aqualia`: `art/review/2026-11-03-player-aqualia/` (`player-aqualia--2026-11-03-player-aqualia.md`) + `art/review/2026-11-03-player-aqualia-faces-d4cc567cadce/` (`player-aqualia--2026-11-04-player-aqualia-faces.md`); `npc-neris`: `art/review/2026-11-03-npc-neris/` (`npc-neris--2026-11-04-npc-neris.md`) + `art/review/2026-11-03-npc-neris-faces-9eda4cbedf2f/` (`npc-neris--2026-11-04-npc-neris-faces.md`).

### B3 · Remaining creatures, one at a time

- status: done for `zephyrit`, `cindermoth`, `ignicap` (`director-approved`); `steamshell` moved to dedicated `changes-requested` ticket `B28` (180° backward yaw)
- evidence: `zephyrit--2026-11-04-zephyrit.md`, `cindermoth--2026-11-04-cindermoth.md`, `ignicap--2026-11-04-ignicap.md` (`director-approved`); `steamshell--2026-11-03-steamshell.md` (`changes-requested`, tracked in `B28`).

### B21 · The other nine Aqualia villagers (after B4)

- status: done (all 9 villager bodies and all 9 face sidecars `director-approved` on 2026-11-04; publishing tracked in `B27`; `npc:oren` and `npc:reed` white-ramp follow-up tracked in `B20`)
- evidence: `docs/team/comms/director/approvals/npc-{caelum,marina,reed,willa,oren,mira,lark,dara,finn}--2026-11-04-npc-*.md` (18 approval records, digests verified via `forge.py approve-record`).

### B22 · Held tools and weapons (items kind)

- status: done (all 6 held items `director-approved` on 2026-11-04; publishing tracked in `B27`; `copper-sword` and `shortbow` silhouette refinement tracked in `B20`)
- evidence: `docs/team/comms/director/approvals/item-{fishing-rod,hoe,ferry-pole,copper-sword,hunting-spear,shortbow}--2026-11-04-item-*.md` (6 approval records, digests verified via `forge.py approve-record`).

### B2 · Riverlands map

- status: done (`director-approved` 2026-11-02, layout scope: `docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-2.md`)
- evidence: `art/review/world-aqualia-aqualia_riverlands-2/`, `docs/team/comms/blender/2026-11-02T0430--to-director-communicator--riverlands-revision-2.md`.

### B17 · Aqualia terrain set through tileforge (long design session)

- status: done (`director-approved` in `docs/team/comms/director/approvals/aqualia-terrain--tiles-aqualia-terrain-1.md`; staged at `art/source/staging/blender/tiles-aqualia-terrain.json`)
- evidence: `art/review/tiles-aqualia-terrain-1/`, `art/source/tiles/sets/aqualia-terrain/set.json`, `art/source/staging/blender/tiles-aqualia-terrain.json`.

### B11 - Human face sidecar technical proof

- status: done (`director-approved` via `docs/team/comms/director/approvals/player-aqualia-faces--2026-11-03-player-aqualia-faces-d4cc567cadce.md`; published in `B27` at `art/source/staging/blender/player-aqualia-faces.json`)
- evidence: `art/review/2026-11-03-player-aqualia-faces-d4cc567cadce/`, `art/source/staging/blender/player-aqualia-faces.json`.

### B23 · Inventory icons for resources and crafted goods (after C32, see [imagegen](../../../engineering/imagegen.md))

- status: done (`director-approved` 2026-11-05 by `visitor` acting as director under `TEAM-4.2` in `docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md`, digest `773b5166b2aa226d1283ef50410989414055822e26fade7601be56749b54e158`; ready for `M25` manifest integration)
- goal: every inventory item without a held model gets a 32 × 32 `icon.item` icon in the project palette: sunberries, river reeds, wild wheat, nectar blossom, ash grass, spore fungi, river flint, hardwood stick, reed fiber, tool head (WIP), herbal poultice, spring water, copper ore, wild meat, nectar roast, arrow bundle, garment.
- evidence: `art/review/2026-11-04-icons-items-1/` (`contact.png`, `review.json`, 17 PNGs); `art/source/ui/icons/items/*.png`; `docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md`; `docs/team/comms/blender/2026-11-04T1825--to-communicator--inventory-icons-candidate.md`.

## Archived 2026-11-02

The queue header as it stood before the cleanup:

Read your brief `docs/team/briefs/blender.md` first. Take the top `open` ticket. If
it's blocked, mark it and take the next. Change only `status:` and `evidence:` lines.

### B1 · Rivallie on the single-pose sheet

- status: director-approved (`docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-c3d.md`, digest 69b6c10d…); publish waits on codex C3b. Do not re-run Rivallie: a new digest voids the approval (PRD-9)
- goal: Claude ran the first Rivallie golden sample on the old sheet, using its side view only (`art/review/2026-10-31-rivallie/`, QA `candidate`). When M2 lands, re-run Rivallie on the new sheet and compare.
- work:
  1. In `recipes/rivallie.json`, set `gen3d.views` and `texture.views` to every view of the new sheet that shows the same pose.
  2. Run `forge.py next --asset rivallie` until `packet`.
  3. Open `gen3d/preview.png` (one creature, one pose), `rig_preview.png` and `contact.png`, and the walk and run GIFs in the packet.
  4. Report what is better or worse than the 2026-10-31 packet: the belly colour, the silhouette, and how the legs step.
- done when: a new packet exists, the ticket is `candidate`, and you've messaged the director and the communicator with the comparison
- evidence: 2026-10-31 re-packeting on C3d fixes complete; 15 clips, 616 frames; QA candidate; review packet updated with review.json and registered frames in art/review/2026-10-31-rivallie/; recipe notes updated for heightArtPx 25.

### B6 · Worldforge cross-machine smoke

- status: complete
- goal: verify C6 tooling on machine A without changing the shared map or starting new art.
- work: after normal branch integration, run worldforge doctor, plan check aqualia, village-scoped check and the worldforge_selftest.py unittest command from docs/engineering/worldforge.md. Verify packet file hashes. Report platform differences in your own comms. Riverlands-wide check is expected to remain draft.
- done when: commands, packet hashes and observed failures are published; this ticket does not grant B2 layout go.
- evidence: Verified on Machine A: worldforge doctor exits 0, plan check aqualia passes ok, village check passes candidate (0 findings); worldforge_selftest.py ran with 18 passes and 3 failures stemming from completed Riverlands pass 003 inclusion; scripts/check-packets.ts verified 616 frames on both creatures; documented and reported in docs/team/comms/blender/archive/2026-10-31T1855--to-codex-director--b6-b7-smoke-results.md.

### B7 · Delivered creature gallery smoke

- status: complete
- goal: confirm the existing Rivallie/Bramblefang packets load on machine A with all supplied facings, overlay controls and inspection magnification.
- work: run the development gallery or tests/browser/packets.spec.ts against existing packet files. Inspect captures before describing them. Do not regenerate, rig or bake assets for this check.
- done when: a technical result and captures are published in your own comms; director approval and gameplay publishing remain separate.
- evidence: Executed tests/browser/packets.spec.ts via Playwright on Machine A (1 test passed in 20.0s, 0 errors); verified candidate review playback, facings, state clips, step controls, 4x magnification, and Socket_Head/Socket_Back/Socket_Mouth overlays for Rivallie and Bramblefang; captures inspected in docs/team/comms/blender/tmp/; published in docs/team/comms/blender/archive/2026-10-31T1855--to-codex-director--b6-b7-smoke-results.md.

### B8 · Publish the three approved creature bodies through C3b

- status: complete
- goal: provide machine-A execution evidence for the candidate publisher without regenerating approved art.
- work: integrate engineering C3b normally, preserve dirty work, run doctor and `forge.py publish --asset <id>` for rivallie/bramblefang/marshstalker using original bake workspaces. Follow the [C3b handoff](../comms/codex/archive/2026-10-31T2146--to-blender--c3b-publish-and-faces.md). Missing/stale original files are a blocker; never re-bake an approved body to repair them. Coordinate original-source availability and staging integration with communicator.
- done when: source revisions, exact commands, staging paths/byte checks and any blockers are published in your own comms. No new approval or gameplay activation.
- evidence: Executed forge.py publish for rivallie, bramblefang, and marshstalker on Machine A; immutable exports created in art/source/exports/<asset>/<digest>/; atomic staging pointers emitted in art/source/staging/blender/<asset>.json; generated and inspected candidate face proof for Rivallie in art/review/2026-11-01-rivallie-faces-d749a4350126/; documented and announced in docs/team/comms/blender/archive/2026-10-31T2355--to-codex-communicator--c3b-b8-b9-results.md.

### B9 · Re-run the repaired worldforge smoke after Riverlands integration

- status: complete
- goal: confirm the C7 fixture repair on machine A and report real environment differences.
- work: after normal engineering integration, run the 22-test worldforge suite, the 29-test authored-world Vitest suite and `npm run check:world -- --region aqualia`. Historical tests use pinned village fixtures; full-region candidate compilation should now include both levels. Do not change the live map or refresh inspection receipts to make tests pass.
- done when: commands/results and exact failing assertions, if any, are in your own comms. This grants no map or asset approval.
- evidence: Machine A verification: worldforge_selftest.py 22/22 tests passed (OK in 17.1s); tests/authored-world.test.ts 29/29 tests passed (2.44s); npm run check:world validated full region with 2 levels, 219 placements, 0 excluded; full repository npm run check passed 21 test files / 276 tests and production build. Documented in docs/team/comms/blender/archive/2026-10-31T2355--to-codex-communicator--c3b-b8-b9-results.md.

### B10 - Package portable provenance for the three approved bodies

- status: done (source packaging only)
- goal: unblock cross-machine source-manifest compilation without regenerating art.
- work: follow the [portable-source handoff](../comms/codex/archive/2026-11-01T0145--to-all--c3b-portable-provenance.md). Normally merge `eng/c11b-consumers` through `01e9fbb`. Run only `publish` for each approved creature from its original workspace; commit the immutable source bundles and staging records, retaining existing body exports and packet digests. Never run a bake to repair a missing source.
- done when: commands, source paths and unchanged packet/frame digests are published via normal studio history; communicator can verify all declared source dependencies on Machine B. This grants no face or gameplay approval.
- evidence: [Machine-A receipt](../comms/blender/archive/2026-11-01T0220--to-all--b10-portable-provenance-results.md) and normal art merge `5a128d1`; all 42 declared provenance hashes verify locally. Manifest integration and runtime activation remain separate.

### B12 - Linux smoke and input audit for draft item planning

- status: complete
- goal: verify C9b held-item pose planner, 64-pose grid generation and icon pivot transforms on Linux/Machine A without fabricating anatomy or modifying source artwork.
- work: run items_selftest.py; audit plan and pivot math on Machine A; acknowledge M21 canonical hatchet reference package.
- done when: items selftest passes on Machine A and audit is published in comms.
- evidence: Tested on Machine A: items_selftest.py passed 8/8 tests in 0.068s; validated 64 held poses and icon pivot transforms; verified item all/body refusal invariant; acknowledged Communicator's M21 canonical hatchet reference (art/source/references/item-hatchet/); reported in docs/team/comms/blender/archive/2026-11-01T0420--to-all--b12-items-planning-results.md.

### B13 · Held-item renderer calibration (C9b)

- status: complete
- goal: execute code-health calibration for the C9b held-item renderer using the PRD-2 cuboid fixture on Machine A (Linux / Blender 4.2.3 / RTX 5080).
- work: run `uv run --project art/source/forge python art/source/forge/forge.py selftest --kind item`; inspect contact.png and review JSON; report exact digests, QA results, frame counts, and cache preservation on re-run.
- done when: exact command output, image inspection receipts, QA metrics, and cache verification are reported in comms.
- evidence: Tested on Machine A: `forge.py selftest --kind item` executed in Blender 4.2.3 on RTX 5080; 65 frames rendered and pixelized (64 held poses + 1 icon); 7/7 hard QA checks passed with 0 failing poses (canvas, root, margins, thinFeature, palette, blocks, colorCount 4/24); contact.png inspected; verified cache re-run preserved identical review and items JSON hashes (`58aa14…`, `86aafc…`) in ~1.0s; reported in docs/team/comms/blender/archive/2026-11-01T0630--to-codex-director--b13-item-calibration-results.md.

## B3 evidence to 2026-11-02

- evidence: 2026-10-31 candidate packets generated for marshstalker and bramblefang with C3d quality fixes; 15 clips, 616 frames each; all 12 hard QA checks passing on both; announced in docs/team/comms/blender/archive/2026-10-31T1805--to-director-communicator--quadruped-candidate-packets.md; director approvals integrated for Rivallie, Bramblefang, and Marshstalker; Mireling end-to-end forged on creature.medium canvas (heightArtPx 26, basalt/moss/reed/blossom ramps, 8 colors, 12/12 hard QA passing, smallest margin 4px); candidate review packet emitted at art/review/2026-10-31-mireling/ (digest `e49ddef2bb67e24f53a7fdc4486767b2819d87575cbbedd6b6419f4fd9839632`); 2026-11-01 re-packet emitted with leather skin ramp, tortoise notes, and rampShift shell -2 at art/review/2026-11-01-mireling/ (digest `e214bab72b42667a64c5a63cf15ef0ad04370a465aa34b3305dd1c1990120f89`, 10 colors, 11/11 hard QA passing, grass valueContrast 0.161 >= 0.12); contact sheet inspected; reported in docs/team/comms/blender/2026-11-01T2326--to-claude--mireling-rampshift-packet.md; director approval recorded in docs/team/comms/director/approvals/mireling--2026-11-01-mireling.md; published via forge publish --asset mireling: published model closure at art/source/blender/models/published/mireling/f324c324625e58fefe37280debef3c590e84198d4bab7f7005c74b03fcaf0e62/, exports at art/source/exports/mireling/e214bab72b42667a64c5a63cf15ef0ad04370a465aa34b3305dd1c1990120f89/, staging record at art/source/staging/blender/mireling.json. All 4 quadruped bodies now approved and published.
