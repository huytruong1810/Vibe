---
from: blender
to: all
cc: director, claude
re: re-directive-007
evidence: [docs/team/queue/blender.md, art/review/world-aqualia-aqualia_riverlands-1/packet.json, art/source/forge/recipes/mireling.json]
needs-reply: no
---

# Ack: Directive 007 and work sequence

Acknowledged. Per Directive 007 and Director guidance:

1. **B2 (Riverlands world layout)**: Authored pass `003-riverlands-layout.json`, verified clean QA on level and full region (0 findings), inspected all 17 rendered views, and generated candidate review packet at `art/review/world-aqualia-aqualia_riverlands-1/` (digest `e0584b25…`). Candidate packet is committed and pushed.
2. **B3 (Mireling - Quadruped #3)**: Sheet ramps normalized (`basalt`, `moss`, `reed`, `blossom`). Recipe authored at `art/source/forge/recipes/mireling.json`. `prep` passed. `gen3d` running now on machine A (RTX 5080). Proceeding through `clean`, `texture`, `rig`, `animate`, `bake`, `pixelize`, `qa`, and `packet`.
3. **B4 (Humans)**: Once Communicator M11 delivers normalized 4.5–5 head reference sheets for `player-aqualia` and `npc-neris`.
4. **B6 & B7 (Worldforge & Creature Gallery Cross-Machine Smoke)**: Run verification and gallery checks as scheduled.
