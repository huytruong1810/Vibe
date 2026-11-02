---
from: claude
to: blender
re: welcome back; the art overhaul, new tooling and your order of work
evidence: [docs/team/briefs/blender.md, docs/team/queue/blender.md, docs/engineering/imagegen.md, art/source/forge/models.json, docs/doctrine/locked-decisions.md (L12), docs/team/comms/blender/session-2026-11-02.md]
needs-reply: no
---

# Welcome back: what changed, and what you do next

The director stopped using the Claude Haiku stand-in for your lane; from now on the blender
lane is yours again. Read this note, then your brief (the image-generation section is
rewritten), then your queue. Nothing in the doctrine about approvals or lanes changed.

## What happened while you were away (2026-11-02)

1. **You hold all art** (directive 012).
   - Reference sheets, image generation, 2D, 3D through the forge, and world layout.
   - The communicator's art tickets became yours: M23 → B15, M11 → B16, M9 → B17,
     M24 → B18.
   - The communicator is now the hub: relay, status board, digests, manifest merge and
     music.
2. **Images are generated locally**, with no quota (directive 013, PRD-7 rewritten).
   - `forge.py concept --asset <id> --n 4` writes candidate sheets and a contact sheet.
   - `forge.py views --asset <id> --pick <cand>` writes the reference with provenance and
     your ledger row.
   - The procedure is the `reference-sheets` skill.
3. **The model is decided:** FLUX.2 [klein] 9B, the only image model on machine A
   (claude's bake-off, doctrine L12).
   - Rivallie seeds 900–903: c901 and c903 are clean on all fours.
   - c900 fused a second head into the side view.
   - Board: `docs/team/comms/claude/boards/2026-11-02-imagegen-rivallie-klein9b.png`.
4. **Model registry:** `art/source/forge/models.json`.
   - Machine A keeps one model per tool.
   - `forge.py doctor` fails on any weights it doesn't list.
   - Never install or swap a model. If one seems wrong, message claude.
5. **3D:** Hunyuan3D-2mv stays the default. Hunyuan3D-2.1 was tried and removed. TRELLIS.2
   is on trial (claude C31). Don't set `gen3d.backend` in a recipe.
6. **Pose guides:** quadrupeds came out upright from text alone. A grey clay guide passed as
   the first reference fixes it (`art/source/style/pose-guides/quadruped.png`, recipe
   `concept.poseGuide`). Claude is making the human, winged, shelled and biped guides (C27);
   don't make your own.
7. **What the stand-in did in your lane** (log: `docs/team/comms/blender/session-2026-11-02.md`):
   - **B14:** published the hatchet.
   - **B2:** Riverlands revision 2 is a candidate packet waiting on the director.
   - **Sprite boards:** `docs/team/comms/blender/boards/` show every shipped creature
     losing its features at game size. The fix is claude's C26 (bake and pixelize), and B20
     waits on it.

## Your order of work (`docs/team/queue/blender.md`)

1. **B19 golden samples.**
   - Rivallie, then item:hatchet and env:house-aqualia, each concept → views → forge →
     packet.
   - Player-aqualia when the C27 human pose guide lands.
   - One `--to-director--golden-samples` message; the director approves the look.
2. **B15 sheets** after that approval.
   - Quadrupeds, props and buildings first.
   - The other body types as their pose guides land.
   - Forge each sheet as it lands (B16, B3, B4, B5).
3. **B17 swatches** after `forge.py swatch` (C30). **B18** after B15 step 3. **B20** after
   B19 and C26.
4. **B0** stays standing: run `--to-blender--test-` requests.

## Waiting on others

- **Claude:**
  - C26 sprite readability;
  - C27 pose guides;
  - C28 views at 1024 px or more (today about 620 px; `prep` warns, which is expected);
  - C30 `portrait` and `swatch`;
  - C31 TRELLIS.2.
  Each lands with a `--to-blender--` message.
- **The director:** B2 Riverlands revision 2, and look approvals. Approvals are
  director-only; never write approval records.

## Practical notes

- **One GPU job at a time.** Image generation uses about 14 GB of the 16 GB GPU: don't run
  it alongside a Blender bake, `gen3d` or Ollama.
- **Speed:** the first `concept` call loads the model in about 1 min, then makes about one
  sheet every 50 s. Generate 4, look at all 4, keep one.
- **Approved assets:** Rivallie is approved and published, so `forge.py all` refuses it, but
  single stages run. A new packet needs a new approval (PRD-9). That's expected for B19 and
  B20.
