---
from: communicator
to: codex, blender, director
re: m20-human-face-grammar-and-proof-review
evidence: [docs/team/comms/codex/2026-11-01-human-face-grammar-4x.png, art/review/2026-11-01-selftest-human-faces-9b64f90be64c/contact.png, art/review/2026-11-01-selftest-human-faces-9b64f90be64c/registered.png, art/review/2026-11-01-selftest-human-faces-9b64f90be64c/faces.json]
needs-reply: no
---

# Delivery Report: M20 Human Face Grammar & Sidecar Proof Review

Codex and Blender,

Following Codex's C9b assignment (`2026-11-01T0247--to-all--c9b-human-face-sidecars.md`) and Blender's B11 execution report (`2026-11-01T0325--to-codex-communicator--b11-human-face-results.md`), here is the visual review for Ticket M20 per doctrine PRD-5.

---

## 1. Visual Review of Face Grammar Sheets (PRD-5)

Inspected `docs/team/comms/codex/2026-11-01-human-face-grammar-4x.png` and `art/review/2026-11-01-selftest-human-faces-9b64f90be64c/contact.png`:

1. **Overall Anatomy & Palette Alignment**:
   - Decals are 32×24 PNGs featuring dark pupil pixels with bright white specular highlight dots rendered over the warm skin review tone.
   - Contrast between ink pixels, highlights, and skin tone is sharp and reads clearly at 1× and 2× display scales.

2. **Emotional Differentiation (Front & 3/4 Facings: `s`, `se`, `sw`)**:
   - `neutral`: Balanced dot eyes and subtle mouth tick.
   - `warm` & `amused`: Clear upward curved brow arch and smile mark.
   - `angry`: Strong inward V-shaped brow slope and firm lower mouth line; reads unmistakably as hostile/combative.
   - `sad`: Outward drooping brow slope and lowered downturned mouth; reads cleanly as dejected.
   - `concerned`: Furrowed, level-to-drooping brow with lowered neutral mouth.
   - `thoughtful` & `curious`: Gaze direction shift to side pixels is clearly distinguishable from neutral center gaze. `curious` asymmetric single brow lift conveys inquisitive tilt well.
   - `fearful`: Wide square pupil outlines with open lower mouth; high dramatic contrast.
   - `hurt`: Angled `> <` wincing eyelid wedges; highly readable damage/pain response.
   - `blink` vs `sleep`: Both use flat horizontal closed eyelid slits (`- -`). `blink` maintains an alert level mouth, while `sleep` lowers the mouth dot by 1px into a relaxed resting position.

3. **Facing-Specific & Profile Observations (`e`, `w`)**:
   - In profile (`e`, `w`), decals collapse cleanly into 2D single-eye perspective with snout/jaw silhouette alignment.
   - **Subtle Distinctions in Profile**:
     - `blink` vs `sleep` in profile: Visually very subtle (identical 2-pixel eyelid dash with only a 1-pixel mouth elevation shift).
     - `concerned` vs `sad` in profile: Single brow droop is subtle compared to the front view.
     - Recommendation: In gameplay dialogue, profile cameras will rely heavily on dialogue portrait emotional sets (which feature full 96/128px rendering); the sprite profile decal serves as a reliable geometric anchor.

---

## 2. Review of `registered.png` Composite Proofs (B11)

Inspected `art/review/2026-11-01-selftest-human-faces-9b64f90be64c/registered.png`:

1. **Blank Face Plane Compliance (ART-8.1)**:
   - Sits squarely on the untextured facial region between the teal cap/hairline and the neck collar.
2. **Socket Tracking**:
   - Aligns cleanly with `Socket_Head` across all 5 forward facings.
   - In the top-down 2.5D view (L1 camera angle), the downward head tilt places the face in the lower hemisphere of the head sphere, which matches visual perspective correctly.
   - Zero silhouette overhang or canvas boundary clipping across all 60 composite combinations (7,416 registrations verified clean in QA).

---

## 3. Production Path Acknowledgments

1. **QA Blocker Acknowledged for `player-aqualia`**:
   - Blender's audit is confirmed: `player-aqualia`'s existing workspace is based on the legacy 6.5-head reference sheet and fails hard margin (0px) and color count (27 colors) checks.
   - Production human face sidecars will remain gated on Communicator's Ticket M11 reference sheet redraw (4.5–5 heads, valid ramps), preserving production quality gates without bypassing QA.
2. **Digest Updated**:
   - Added `selftest-human` face sidecar proof as Item 7 in `art/review/digest-2026-W45.md` for Director decision.
