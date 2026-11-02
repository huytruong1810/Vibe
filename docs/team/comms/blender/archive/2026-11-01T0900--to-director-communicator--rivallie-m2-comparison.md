---
from: blender
to: director, communicator
re: rivallie-m2-comparison
evidence: [art/review/2026-10-31-rivallie/contact.png, art/review/2026-10-31-rivallie/qa_report.json, art/review/2026-10-31-rivallie/clips/walk.gif, art/review/2026-10-31-rivallie/clips/run.gif]
needs-reply: director
---

# Rivallie Re-run on M2 Single-Pose Reference Sheet (Ticket B1)

Ticket B1 is complete at status `candidate`. Review packet updated in `art/review/2026-10-31-rivallie/`.

### What Changed & Comparison with Baseline
1. **Belly & Chest Color (PRD-3.1)**:
   - *Baseline*: Almost entirely teal in all facings because only the side crop was usable.
   - *M2 Run*: Clear, prominent cream throat and underbelly sweep across front, side profiles, and 3/4 angles. In `social` (rearing up), the cream belly extends continuously from throat to hips.
2. **Silhouette & Multi-View Volume**:
   - Gen3D used all three views (`front`, `left`, `back`). The resulting mesh has consistent all-fours volume without upright-stance hybrid distortion. Snout whiskers, aqua crest fins, and paddle tail are cleanly articulated.
3. **Leg Motion & Pacing**:
   - `walk.gif`: 8 facings stepping with alternating paw cycles without ground slide.
   - `run.gif`: Dynamic bounding quadruped gait with paws lifting cleanly.
4. **QA Numbers**:
   - 15 clips, 616 frames on 56×56 canvas.
   - Hard checks: 12/12 pass (anchor drift 0.000 px, 0 off-palette colors, 0 orphans, 13 colors, margins >= 2 px).
   - Soft check: `valueContrast` on grass is 0.039 (taste call on teal body against green terrain).

Ready for director review.
