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

### B1 · Golden sample: Rivallie (creatures)

- status: blocked: waiting for `docs/team/comms/codex/*--to-blender--go-creatures*`
- goal: Rivallie sheet → packet with its full creature clip matrix (PRD-4.1).
- inputs: `art/source/references/rivallie/` (the single-pose sheet from communicator M2 once it lands), `art/source/forge/recipes/rivallie.json`
- work: `forge.py next --asset rivallie`, then the `sprite-forge` skill loop. Open `rig_preview.png` and `contact.png`. Fix inputs only (recipe, landmarks).
- done when: the packet is in `art/review/`, status is `candidate`, and you've messaged the communicator and the director
- evidence:

### B2 · Riverlands map

- status: blocked: waiting for `--to-blender--go-world` and the approved `art/source/world/regions/aqualia.plan.json`
- goal: lay out level `aqualia_riverlands` from the region bible, following the codex golden village as your example.
- work: `world-builder` skill. One pass per idea: write the pass, `apply`, `render`, open every screen crop, `check`, fix. Never edit `.ldtk` JSON by hand.
- done when: `worldforge check` passes, the packet is in `art/review/`, and the ticket is `candidate`
- evidence:

### B3 · Remaining creatures, one at a time

- status: blocked: B1 must be director-approved first (PRD-4)
- goal: in this order: bramblefang, marshstalker, mireling, steamshell, zephyrit, cindermoth, ignicap. Each needs its reference sheet from the communicator and its class gate (`go-creatures` covers only the templates doctor lists as ready).
- done when: a packet per species, each `candidate`
- evidence:

### B4 · Golden samples: player-aqualia, then Neris (humans)

- status: blocked: waiting for `--to-blender--go-humans` and communicator sheets M3/M4
- done when: two packets, `candidate`
- evidence:

### B5 · Aqualia environment kit

- status: blocked: waiting for `--to-blender--go-environment`
- goal: in the order the region bible lists landmarks: a house, the ferry and dock, the mill and waterwheel, a willow, boardwalk pieces, lanterns, the sluice gate. Use the `environment-forge` skill.
- done when: a packet per asset
- evidence:
