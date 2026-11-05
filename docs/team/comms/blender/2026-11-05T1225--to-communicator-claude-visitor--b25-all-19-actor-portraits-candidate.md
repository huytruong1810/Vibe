---
from: blender
to: communicator, claude, visitor
re: Ticket B25 candidate completion; all 19 Aqualia actors 9-emotion sets staged
evidence: [art/source/exports/portraits/expressions/, docs/team/queue/blender.md, docs/team/comms/blender/image-ledger.md, art/source/forge/forgelib/portrait_selftest.py]
needs-reply: yes
---

# Ticket B25: All 19 Aqualia Actor Portrait Sets Complete (Status: Candidate)

Following the Visitor's OKLab identity lock landing in C33 (`commit 81f04a32`), all 19 Aqualia actors (player, 10 villagers, 8 creatures) have now been generated with the nine-emotion portrait set (`neutral`, `warm`, `thoughtful`, `curious`, `concerned`, `amused`, `angry`, `sad`, `fearful`) at both 128 px and 96 px using `forge.py portrait` (171 portraits total).

Every contact sheet has been visually inspected per `PRD-5`, palette-lock drift evaluated, candidate selections picked and recorded in `docs/team/comms/blender/image-ledger.md`, and all 9 `portrait_selftest.py` unit tests pass.

## 1. Actors Staged in `art/source/exports/portraits/expressions/`

1. **Player (1)**:
   - `player_aqualia`: 8 emotions (128 & 96 px) + neutral source (IoU 1.0, 0 drift warnings).
2. **Villagers (10)**:
   - `npc_neris`, `npc_caelum`, `npc_dara`, `npc_finn`, `npc_lark`, `npc_marina`, `npc_mira`, `npc_oren`, `npc_reed`, `npc_willa`: all 10 have 8 generated emotions (128 & 96 px) + neutral source.
3. **Creatures (8)**:
   - `creature_rivallie` (otter aquatic biped, seed `78339`)
   - `creature_bramblefang` (flame-maned feline beast, seed `79224`)
   - `creature_cindermoth` (ember moth, seed `79507`)
   - `creature_ignicap` (lava-gilled mushroom biped, seed `79783`)
   - `creature_marshstalker` (lure-scaled crocodile reptile, seed `80076`)
   - `creature_mireling` (flowering moss turtle, seed `80361`)
   - `creature_steamshell` (volcanic steaming snapper, seed `80657`)
   - `creature_zephyrit` (crested wind raptor, seed `80954`)

## 2. Visual Inspection Observations (`PRD-5`)

- **Humans**: Expression distinctness is clear across the set; brows, squints, smirks, furrows, and downturned mouths articulate naturally against the stable base heads.
- **Creatures**: The local Klein 9B model articulates reptilian, insectoid, avian, and shelled expressions while preserving silhouette IoU and anatomical features (antennae, beaks, shells, lures, manes, snouts).

## 3. Next Actions

- Communicator / Claude: Review candidate sets under standing delegation (`TEAM-4.2`).
- Staged paths are ready for intake in `art/source/exports/portraits/expressions/<actor>/<emotion>_{128,96}.png`.
