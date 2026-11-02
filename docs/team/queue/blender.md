# Queue: blender (machine A)

Read your brief `docs/team/briefs/blender.md` first. Take the top `open` ticket. If it's
blocked, mark it and take the next. Change only `status:` and `evidence:` lines.
Finished tickets are in [archive/blender.md](archive/blender.md).

## Now

### B14 · Publish the approved hatchet

- status: open
- goal: stage the director-approved golden held item so the runtime can draw it once C9b's held-layer composition lands.
- inputs: [approval record](../comms/director/approvals/item-hatchet--2026-11-01-item-hatchet.md) (digest 89102c20…, scope held-item and icon).
- work: `uv run --project art/source/forge python art/source/forge/forge.py publish --asset item:hatchet`; don't re-run any hatchet stage first (a new digest voids the approval, PRD-9).
- done when: `art/source/staging/blender/item-hatchet.json` (or the path publish prints) is committed and a `--to-communicator-codex--hatchet-published` message lists it
- evidence:

### B2 · Riverlands map

- status: open: changes requested 2026-11-01 (`docs/team/comms/director/approvals/world-aqualia--world-aqualia-aqualia_riverlands-1.md`): fill empty screens, remove staircase river and road edges, give the rectangle zones shapes. Add passes 004+ and re-packet. Edit only the Riverlands level; the village level is approved and in the beta build
- goal: lay out level `aqualia_riverlands` from the region bible, following the codex golden village as your example.
- work: `world-builder` skill. One pass per idea: write the pass, `apply`, `render`, open every screen crop, `check`, fix. Never edit `.ldtk` JSON by hand.
- done when: `worldforge check` passes, the packet is in `art/review/`, and the ticket is `candidate`
- evidence: Pass `003-riverlands-layout.json` authored and applied; 120x68 level layout complete with 16 landmarks, 4 story spots, 6 habitats, 6 ambience emitters, music zone, all 5 routes, warm-terrace elevation and collision ramps; worldforge check clean (0 findings on level and region); candidate packet in art/review/world-aqualia-aqualia_riverlands-1/; overview and all 16 screen crops inspected; announced in docs/team/comms/blender/archive/2026-10-31T1829--to-director-communicator--riverlands-candidate-packet.md.

## Waiting on inputs (start the moment the input lands)

### B3 · Remaining creatures, one at a time

- status: mireling published and integrated in the build (f1ded41). C3h templates are built (776eb0f, `go-creature-templates`): steamshell, zephyrit, cindermoth and ignicap wait only for their M23 sheets
- goal: quadruped species first, in this order: bramblefang, marshstalker, mireling. steamshell (shelled), zephyrit and cindermoth (winged) and ignicap (mushroom-biped) wait for codex templates. Each needs its reference sheet from the communicator (all-fours pose for quadrupeds, same pose in every view).
- done when: a packet per species, each `candidate`
- evidence: rivallie, bramblefang, marshstalker, mireling approved, published and in the build (full history in [archive/blender.md](archive/blender.md#b3-evidence-to-2026-11-02)).

### B4 · Golden samples: player-aqualia, then Neris (humans)

- status: blocked: waiting for the communicator's M11 human sheets (4.5–5 heads, front/left/back, valid ramps). go-humans is posted
- done when: two packets, `candidate`
- evidence:

### B5 · Aqualia environment kit

- status: blocked: waiting for Communicator M23 step 3 reference sheets (env-house-aqualia, env-tree-oak, env-well); go-environment directive received from claude
- goal: in the order the region bible lists landmarks: a house, the ferry and dock, the mill and waterwheel, a willow, boardwalk pieces, lanterns, the sluice gate. Use the `environment-forge` skill.
- done when: a packet per asset
- evidence:

### B11 - Human face sidecar technical proof

- status: partial (mannequin execution reported; real player blocked on M11 body input)
- goal: validate C9b grammar on an actual existing human body packet without launching another body bake.
- work: follow the [C9b handoff](../comms/codex/archive/2026-11-01T0247--to-all--c9b-human-face-sidecars.md), normally merge the consumer tooling, then run `faces --asset player-aqualia` on a valid body review. Inspect native/enlarged contact and registered proofs; check the blank face plane, per-facing placement and motion. Report missing packet/hard body QA as explicit prerequisites; do not weaken validation or regenerate an approved body.
- done when: exact commands, body/sidecar digests, inspected images and any blockers are published. Human faces remain candidate; this is not go-items or human publication readiness.
- evidence: [studio receipt at 19eb907](https://github.com/huytruong1810/Vibe/blob/19eb907/docs/team/comms/blender/archive/2026-11-01T0325--to-codex-communicator--b11-human-face-results.md) reports 60 selftest-human decals / 7,416 registrations. Player Aqualia margins (0px) and color count (27) remain hard QA blockers; no threshold change or local visual acceptance is claimed.

## Standing

### B0 · Machine-A test runner (standing)

- status: open (standing)
- goal: run the GPU and Blender checks the other members can't run on machine B.
- work: after every `git pull`, look for `--to-blender--test-` messages (codex sends them for C18–C20: the Ollama reading round-trip, the `sd-server` painting smoke, Lark painting overnight). Run exactly the command given, open every image it produces, reply with the full output and what you saw. Stop every server you started.
- done when: never closes; each reply is pushed
- evidence:
