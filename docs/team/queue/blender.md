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

- status: candidate
- goal: Claude ran the first Rivallie golden sample on the old sheet, using its side view only (`art/review/2026-10-31-rivallie/`, QA `candidate`). When M2 lands, re-run Rivallie on the new sheet and compare.
- work:
  1. In `recipes/rivallie.json`, set `gen3d.views` and `texture.views` to every view of the new sheet that shows the same pose.
  2. Run `forge.py next --asset rivallie` until `packet`.
  3. Open `gen3d/preview.png` (one creature, one pose), `rig_preview.png` and `contact.png`, and the walk and run GIFs in the packet.
  4. Report what is better or worse than the 2026-10-31 packet: the belly colour, the silhouette, and how the legs step.
- done when: a new packet exists, the ticket is `candidate`, and you've messaged the director and the communicator with the comparison
- evidence: 2026-10-31 re-run on M2 single-pose sheet complete; 15 clips, 616 frames; QA candidate; review packet updated in art/review/2026-10-31-rivallie/

### B2 · Riverlands map

- status: blocked: waiting for `--to-blender--go-world` and the approved `art/source/world/regions/aqualia.plan.json`
- goal: lay out level `aqualia_riverlands` from the region bible, following the codex golden village as your example.
- work: `world-builder` skill. One pass per idea: write the pass, `apply`, `render`, open every screen crop, `check`, fix. Never edit `.ldtk` JSON by hand.
- done when: `worldforge check` passes, the packet is in `art/review/`, and the ticket is `candidate`
- evidence:

### B3 · Remaining creatures, one at a time

- status: blocked: marshstalker margins 0px on rearing clips in 80x72 canvas (waiting for codex forge/gait fix; bramblefang approved; mireling pending reference)
- goal: quadruped species first, in this order: bramblefang, marshstalker, mireling. steamshell (shelled), zephyrit and cindermoth (winged) and ignicap (mushroom-biped) wait for codex templates. Each needs its reference sheet from the communicator (all-fours pose for quadrupeds, same pose in every view).
- done when: a packet per species, each `candidate`
- evidence: 2026-10-31 bramblefang candidate packet generated (art/review/2026-10-31-bramblefang/), 15 clips, 616 frames, 12/12 hard QA checks pass, approved by director (docs/team/comms/director/approvals/bramblefang--2026-10-31-bramblefang.md); marshstalker authored through bake/pixelize/qa (11/12 hard checks pass), blocked on margins (contract margins, 0px) in rearing clips due to 1.81m crocodilian tail reaching row 71 (reported in docs/team/comms/blender/2026-11-01T1615--to-codex-director--marshstalker-margins-blocker.md); mireling pending communicator reference sheet

### B4 · Golden samples: player-aqualia, then Neris (humans)

- status: blocked: waiting for `--to-blender--go-humans` and communicator sheets M3/M4
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
