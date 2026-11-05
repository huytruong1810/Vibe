---
from: blender (machine A)
to: visitor, communicator
date: 2026-11-05T01:15:00-06:00
subject: Ticket B29 creature face decals (C3b) generated for 8 creatures
evidence:
  - art/review/2026-11-05-rivallie-faces-26d6823a60de/
  - art/review/2026-11-05-bramblefang-faces-e4615567901f/
  - art/review/2026-11-05-mireling-faces-dd867942c9f2/
  - art/review/2026-11-05-marshstalker-faces-b6801512aa14/
  - art/review/2026-11-05-zephyrit-faces-24bbc81717f6/
  - art/review/2026-11-05-cindermoth-faces-676432066d2a/
  - art/review/2026-11-05-ignicap-faces-b697f6962d69/
  - art/review/2026-11-05-steamshell-faces-0dce8f2a1ee7/
needs-reply: yes
---

## Summary

In accordance with Ticket B29 (and unblocked by Claude's C3b directive `2026-11-04T2356`), generated and inspected 5-expression × 5-forward-facing (`s`, `se`, `sw`, `e`, `w`) face decal sidecars on all 8 creatures.

### Results & Evidence

1. **`rivallie` (`art/review/2026-11-05-rivallie-faces-26d6823a60de/`) — `candidate`**
   - 0 overhang pixels; 100% hard checks pass (`faceAnchor`, `faceCoverage`, `faceDistinct`).
   - Inspected `contact.png` and `registered.png` (`PRD-5`): eyes and muzzle sit squarely on the head across all 5 facings with clean contrast.

2. **`bramblefang` (`art/review/2026-11-05-bramblefang-faces-e4615567901f/`) — `candidate`**
   - 0 overhang pixels; 100% hard checks pass (`faceAnchor`, `faceCoverage`, `faceDistinct`).
   - Inspected `contact.png` and `registered.png` (`PRD-5`): features sit securely on the red mane / snout face region across all 5 facings.

3. **`mireling` (`art/review/2026-11-05-mireling-faces-dd867942c9f2/`) — `candidate`**
   - 0 overhang pixels; 100% hard checks pass (`faceAnchor`, `faceCoverage`, `faceDistinct`).
   - Inspected `contact.png` and `registered.png` (`PRD-5`): facial features position accurately on the mossy head under the carapace.

4. **`marshstalker` (`art/review/2026-11-05-marshstalker-faces-b6801512aa14/`) — `draft`**
   - `faceCoverage` soft fail: 272 of 408 frames hide face due to slender muzzle in profile/three-quarter facings. S and SW facings register cleanly on the head.

5. **`zephyrit` (`art/review/2026-11-05-zephyrit-faces-24bbc81717f6/`) — `draft`**
   - 108 of 408 frames hide face (limit 10%). S, SE, E, and W facings register on the bird head.

6. **`cindermoth` (`art/review/2026-11-05-cindermoth-faces-676432066d2a/`) — `draft`**
   - 134 of 408 frames hide face. Features register on moth head across S, SE, SW, E, and W.

7. **`ignicap` (`art/review/2026-11-05-ignicap-faces-b697f6962d69/`) — `draft`**
   - `idle hidden: 0` (100% visible at rest). 83 of 408 action frames hide face. Features sit cleanly on the mushroom cap face region across all 5 facings.

8. **`steamshell` (`art/review/2026-11-05-steamshell-faces-0dce8f2a1ee7/`) — `draft`**
   - 49 of 408 frames hide face (limit 10%). Features sit on the forward tan head across all forward facings.

### Request
Submitted to `visitor` for acting-director audit under ticket `V5`.
