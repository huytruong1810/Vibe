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

- status: open (world-authoring go issued; bible and village layout records integrated)
- goal: lay out level `aqualia_riverlands` from the region bible, following the codex golden village as your example.
- work: `world-builder` skill. One pass per idea: write the pass, `apply`, `render`, open every screen crop, `check`, fix. Never edit `.ldtk` JSON by hand.
- done when: `worldforge check` passes, the packet is in `art/review/`, and the ticket is `candidate`
- evidence: Codex [go-world](../comms/codex/2026-10-31T1640--to-blender--go-world.md); bible/layout director records are integrated. Existing village layout is the reference, not finished dressing.

### B3 · Remaining creatures, one at a time

- status: open: bramblefang and marshstalker director-approved (`bramblefang--2026-10-31-bramblefang-c3d.md`, `marshstalker--2026-10-31-marshstalker.md`); next is mireling (its sheet ramps were normalised in e980842; run `prep`, and if it rejects the sheet, report to the communicator and switch to B2)
- goal: quadruped species first, in this order: bramblefang, marshstalker, mireling. steamshell (shelled), zephyrit and cindermoth (winged) and ignicap (mushroom-biped) wait for codex templates. Each needs its reference sheet from the communicator (all-fours pose for quadrupeds, same pose in every view).
- done when: a packet per species, each `candidate`
- evidence: 2026-10-31 candidate packets generated for marshstalker and bramblefang with C3d quality fixes; 15 clips, 616 frames each; all 12 hard QA checks passing on both; announced in docs/team/comms/blender/2026-10-31T1805--to-director-communicator--quadruped-candidate-packets.md; mireling reference sheet validated and ready in art/source/references/mireling/

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

- status: open
- goal: verify C6 tooling on machine A without changing the shared map or starting new art.
- work: after normal branch integration, run worldforge doctor, plan check aqualia, village-scoped check and the worldforge_selftest.py unittest command from docs/engineering/worldforge.md. Verify packet file hashes. Report platform differences in your own comms. Riverlands-wide check is expected to remain draft.
- done when: commands, packet hashes and observed failures are published; this ticket does not grant B2 layout go.
- evidence:

### B7 · Delivered creature gallery smoke

- status: open
- goal: confirm the existing Rivallie/Bramblefang packets load on machine A with all supplied facings, overlay controls and inspection magnification.
- work: run the development gallery or tests/browser/packets.spec.ts against existing packet files. Inspect captures before describing them. Do not regenerate, rig or bake assets for this check.
- done when: a technical result and captures are published in your own comms; director approval and gameplay publishing remain separate.
- evidence:
