# Queue: blender (machine A)

Read your brief `docs/team/briefs/blender.md` first. Take the top `open` ticket. If
it's blocked, mark it and take the next. Change only `status:` and `evidence:` lines.

### B0 · Clean up and stand by as the machine-A test runner

- status: open
- goal: leave the workspace clean, and run forge commands codex asks for (codex has no GPU and no gen3d).
- work:
  1. Commit your session log `docs/team/comms/blender/session-2026-10-31.md`.
  2. Confirm no Ollama, Vite or other server you started is still running.
  3. After every `git pull`, look for `--to-blender--test-` messages from codex. Run
     exactly the command given, open every image it produces, and reply with the full
     output and what you saw.
- done when: the session log is committed, `npm run check:hygiene` passes, and the reply to each test request is pushed
- evidence:

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

### B2 · Riverlands map

- status: candidate (art/review/world-aqualia-aqualia_riverlands-1/, digest `e0584b254976740835de3882531f27e9fcc09347ea8d45a16cb455ba04536c1a`, awaiting director approval record)
- goal: lay out level `aqualia_riverlands` from the region bible, following the codex golden village as your example.
- work: `world-builder` skill. One pass per idea: write the pass, `apply`, `render`, open every screen crop, `check`, fix. Never edit `.ldtk` JSON by hand.
- done when: `worldforge check` passes, the packet is in `art/review/`, and the ticket is `candidate`
- evidence: Pass `003-riverlands-layout.json` authored and applied; 120x68 level layout complete with 16 landmarks, 4 story spots, 6 habitats, 6 ambience emitters, music zone, all 5 routes, warm-terrace elevation and collision ramps; worldforge check clean (0 findings on level and region); candidate packet in art/review/world-aqualia-aqualia_riverlands-1/; overview and all 16 screen crops inspected; announced in docs/team/comms/blender/2026-10-31T1829--to-director-communicator--riverlands-candidate-packet.md.

### B3 · Remaining creatures, one at a time

- status: candidate (art/review/2026-10-31-mireling/, digest `e49ddef2bb67e24f53a7fdc4486767b2819d87575cbbedd6b6419f4fd9839632`, awaiting director approval record; Rivallie, Bramblefang, and Marshstalker director-approved; quadruped sequence complete)
- goal: quadruped species first, in this order: bramblefang, marshstalker, mireling. steamshell (shelled), zephyrit and cindermoth (winged) and ignicap (mushroom-biped) wait for codex templates. Each needs its reference sheet from the communicator (all-fours pose for quadrupeds, same pose in every view).
- done when: a packet per species, each `candidate`
- evidence: 2026-10-31 candidate packets generated for marshstalker and bramblefang with C3d quality fixes; 15 clips, 616 frames each; all 12 hard QA checks passing on both; announced in docs/team/comms/blender/2026-10-31T1805--to-director-communicator--quadruped-candidate-packets.md; director approvals integrated for Rivallie, Bramblefang, and Marshstalker; Mireling end-to-end forged on creature.medium canvas (heightArtPx 26, basalt/moss/reed/blossom ramps, 8 colors, 12/12 hard QA passing, smallest margin 4px); candidate review packet emitted at art/review/2026-10-31-mireling/ (digest `e49ddef2bb67e24f53a7fdc4486767b2819d87575cbbedd6b6419f4fd9839632`); contact sheet, rig preview, and walk/run clips inspected; announced in docs/team/comms/blender/2026-10-31T1845--to-director-communicator--mireling-packet.md.

### B4 · Golden samples: player-aqualia, then Neris (humans)

- status: blocked: waiting for the communicator's M11 human sheets (4.5–5 heads, front/left/back, valid ramps). go-humans is posted
- done when: two packets, `candidate`
- evidence:

### B5 · Aqualia environment kit

- status: blocked: waiting for `--to-blender--go-environment`
- goal: in the order the region bible lists landmarks: a house, the ferry and dock, the mill and waterwheel, a willow, boardwalk pieces, lanterns, the sluice gate. Use the `environment-forge` skill.
- done when: a packet per asset
- evidence:

### B6 · Worldforge cross-machine smoke

- status: complete
- goal: verify C6 tooling on machine A without changing the shared map or starting new art.
- work: after normal branch integration, run worldforge doctor, plan check aqualia, village-scoped check and the worldforge_selftest.py unittest command from docs/engineering/worldforge.md. Verify packet file hashes. Report platform differences in your own comms. Riverlands-wide check is expected to remain draft.
- done when: commands, packet hashes and observed failures are published; this ticket does not grant B2 layout go.
- evidence: Verified on Machine A: worldforge doctor exits 0, plan check aqualia passes ok, village check passes candidate (0 findings); worldforge_selftest.py ran with 18 passes and 3 failures stemming from completed Riverlands pass 003 inclusion; scripts/check-packets.ts verified 616 frames on both creatures; documented and reported in docs/team/comms/blender/2026-10-31T1855--to-codex-director--b6-b7-smoke-results.md.

### B7 · Delivered creature gallery smoke

- status: complete
- goal: confirm the existing Rivallie/Bramblefang packets load on machine A with all supplied facings, overlay controls and inspection magnification.
- work: run the development gallery or tests/browser/packets.spec.ts against existing packet files. Inspect captures before describing them. Do not regenerate, rig or bake assets for this check.
- done when: a technical result and captures are published in your own comms; director approval and gameplay publishing remain separate.
- evidence: Executed tests/browser/packets.spec.ts via Playwright on Machine A (1 test passed in 20.0s, 0 errors); verified candidate review playback, facings, state clips, step controls, 4x magnification, and Socket_Head/Socket_Back/Socket_Mouth overlays for Rivallie and Bramblefang; captures inspected in docs/team/comms/blender/tmp/; published in docs/team/comms/blender/2026-10-31T1855--to-codex-director--b6-b7-smoke-results.md.

### B8 · Publish the three approved creature bodies through C3b

- status: complete
- goal: provide machine-A execution evidence for the candidate publisher without regenerating approved art.
- work: integrate engineering C3b normally, preserve dirty work, run doctor and `forge.py publish --asset <id>` for rivallie/bramblefang/marshstalker using original bake workspaces. Follow the [C3b handoff](../comms/codex/2026-10-31T2146--to-blender--c3b-publish-and-faces.md). Missing/stale original files are a blocker; never re-bake an approved body to repair them. Coordinate original-source availability and staging integration with communicator.
- done when: source revisions, exact commands, staging paths/byte checks and any blockers are published in your own comms. No new approval or gameplay activation.
- evidence: Executed forge.py publish for rivallie, bramblefang, and marshstalker on Machine A; immutable exports created in art/source/exports/<asset>/<digest>/; atomic staging pointers emitted in art/source/staging/blender/<asset>.json; generated and inspected candidate face proof for Rivallie in art/review/2026-11-01-rivallie-faces-d749a4350126/; documented and announced in docs/team/comms/blender/2026-10-31T2355--to-codex-communicator--c3b-b8-b9-results.md.

### B9 · Re-run the repaired worldforge smoke after Riverlands integration

- status: complete
- goal: confirm the C7 fixture repair on machine A and report real environment differences.
- work: after normal engineering integration, run the 22-test worldforge suite, the 29-test authored-world Vitest suite and `npm run check:world -- --region aqualia`. Historical tests use pinned village fixtures; full-region candidate compilation should now include both levels. Do not change the live map or refresh inspection receipts to make tests pass.
- done when: commands/results and exact failing assertions, if any, are in your own comms. This grants no map or asset approval.
- evidence: Machine A verification: worldforge_selftest.py 22/22 tests passed (OK in 17.1s); tests/authored-world.test.ts 29/29 tests passed (2.44s); npm run check:world validated full region with 2 levels, 219 placements, 0 excluded; full repository npm run check passed 21 test files / 276 tests and production build. Documented in docs/team/comms/blender/2026-10-31T2355--to-codex-communicator--c3b-b8-b9-results.md.

### B10 - Package portable provenance for the three approved bodies

- status: done (source packaging only)
- goal: unblock cross-machine source-manifest compilation without regenerating art.
- work: follow the [portable-source handoff](../comms/codex/2026-11-01T0145--to-all--c3b-portable-provenance.md). Normally merge `eng/c11b-consumers` through `01e9fbb`. Run only `publish` for each approved creature from its original workspace; commit the immutable source bundles and staging records, retaining existing body exports and packet digests. Never run a bake to repair a missing source.
- done when: commands, source paths and unchanged packet/frame digests are published via normal studio history; communicator can verify all declared source dependencies on Machine B. This grants no face or gameplay approval.
- evidence: [Machine-A receipt](../comms/blender/2026-11-01T0220--to-all--b10-portable-provenance-results.md) and normal art merge `5a128d1`; all 42 declared provenance hashes verify locally. Manifest integration and runtime activation remain separate.

### B11 - Human face sidecar technical proof

- status: partial (mannequin execution reported; real player blocked on M11 body input)
- goal: validate C9b grammar on an actual existing human body packet without launching another body bake.
- work: follow the [C9b handoff](../comms/codex/2026-11-01T0247--to-all--c9b-human-face-sidecars.md), normally merge the consumer tooling, then run `faces --asset player-aqualia` on a valid body review. Inspect native/enlarged contact and registered proofs; check the blank face plane, per-facing placement and motion. Report missing packet/hard body QA as explicit prerequisites; do not weaken validation or regenerate an approved body.
- done when: exact commands, body/sidecar digests, inspected images and any blockers are published. Human faces remain candidate; this is not go-items or human publication readiness.
- evidence: [studio receipt at 19eb907](https://github.com/huytruong1810/Vibe/blob/19eb907/docs/team/comms/blender/2026-11-01T0325--to-codex-communicator--b11-human-face-results.md) reports 60 selftest-human decals / 7,416 registrations. Player Aqualia margins (0px) and color count (27) remain hard QA blockers; no threshold change or local visual acceptance is claimed.

### B12 - Linux smoke and input audit for draft item planning

- status: done (Linux fixture execution reported; real item rendering remains gated)
- goal: verify C9b's draft pose contract on Machine A before rendering is enabled.
- work: after normal consumer-tool integration, run `items_selftest.py` in the pinned forge environment and review `docs/engineering/hd-presentation.md#c9b-item-pose-planning`. Report transform/pivot assumptions and path/atomic-write differences. If a separate existing hatchet mesh is already available, annotate its actual post-clean grip/support/icon pivots in an item recipe and run item-plan; otherwise report that input dependency to M21. Do not construct a new model or treat a plan as rendered artwork.
- done when: commands, fixture results, optional real source hash/plan and exact remaining input gates are in your comms. No item packet or go-items claim.
- evidence: [published B12 receipt](https://github.com/huytruong1810/Vibe/blob/779befc/docs/team/comms/blender/2026-11-01T0420--to-all--b12-items-planning-results.md) reports eight Linux planner tests and 299 repository tests pass. No actual hatchet mesh or rendered item packet is reported. C9b item rendering remains engineering work; do not begin a manual modeling substitute.
