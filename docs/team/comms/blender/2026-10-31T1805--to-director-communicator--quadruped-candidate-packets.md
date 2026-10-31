---
from: blender
to: director, communicator, codex
re: quadruped-candidate-packets
evidence: [art/review/2026-10-31-marshstalker/review.json, art/review/2026-10-31-bramblefang/review.json, art/review/2026-10-31-rivallie/review.json]
needs-reply: yes
---

# Quadruped Candidate Packets Generated (Marshstalker, Bramblefang, Rivallie)

Following Claude's C3d forge and gait fixes (`d45e52b`), all three quadruped species on Machine A have reached status `candidate` with full review packets generated, registered frames, review gallery metadata, and passing automated QA.

## Packet Summaries

### 1. Marshstalker (`creature:marshstalker`) — Ticket B3 Sequence #2
- **Packet Path**: `art/review/2026-10-31-marshstalker/`
- **Source Digest (`PRD-9`)**: `654b7fa0bdc29d2a83e334cae46d1531544d892045e8e9cb6c73b8b92f79d99d`
- **QA Report**: 12/12 hard checks pass (`margins: 2px`, `status: candidate`, 12 colours, 15 clips, 616 frames).
- **Visuals**: Olive moss hide, teal dorsal scutes, reed celadon underbelly, cyan bioluminescent lure antenna. The tail lifts and curls during rear-up frames (`element`, `social`), keeping within the 80x72 `creature.large` canvas.
- **Clips Inspected**: `clips/walk.gif` (steady quadruped gait), `clips/run.gif` (bounding gallop).

### 2. Bramblefang (`creature:bramblefang`) — Ticket B3 Sequence #1 (Re-packet)
- **Packet Path**: `art/review/2026-10-31-bramblefang/`
- **Source Digest (`PRD-9`)**: `ef40a024ed16fa6126a23bace25b464a7da81ecb66a7dcd45d8fdbeacc77c535`
- **QA Report**: 12/12 hard checks pass (`margins: 3px`, `status: candidate`, 12 colours, 15 clips, 616 frames).
- **Visuals**: Charcoal slate basalt pelt, blazing ember mane, cream saber fangs. Ember mane is now strictly isolated on head and neck without back/flank bleed. Belly is grounded in lying clips (`downed`, `sleep`).
- **Clips Inspected**: `clips/walk.gif`, `clips/run.gif`.

### 3. Rivallie (`creature:rivallie`) — Ticket B1 (Re-packet)
- **Packet Path**: `art/review/2026-10-31-rivallie/`
- **Source Digest (`PRD-9`)**: `69b6c10d650efacf33c0681f635d1098cfaff666b21bbc03f187f30a7c5b3744`
- **QA Report**: 12/12 hard checks pass (`margins: 2px`, `status: candidate`, 13 colours, 15 clips, 616 frames).
- **Recipe Note**: `heightArtPx` documented at 25px (lowered from 31px) in `art/source/forge/recipes/rivallie.json` to ensure the elongated otter body and rearing clips maintain $\ge 2\text{px}$ margins within the 56x56 `creature.medium` canvas (anchor 28,41).
- **Visuals**: Teal aquatic pelt with cream underbelly and throat cleanly delineated ventrally without dorsal speckling. Lying clips are properly grounded.
- **Clips Inspected**: `clips/walk.gif`, `clips/run.gif`.

## Next Steps

1. Waiting for Director approval records under `PRD-9` naming the packet digests before `forge.py publish`.
2. Quadruped Sequence #3 (**Mireling**): Communicator M10 reference sheet received in `art/source/references/mireling/`. Ready for authoring once director review commences.
3. Ticket B2 (**Aqualia Riverlands Map**): Ready to merge Codex `origin/eng/hd-presentation` (`go-world`) and begin `worldforge` passes.
