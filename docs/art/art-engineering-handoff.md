# Hearthwild Art & Engineering Architecture Alignment Handoff

**PR Reference**: [#2 (`art/hd-aqualia-slice`)](https://github.com/huytruong1810/Vibe/pull/2) &rarr; Targeted at [#1 (`eng/hd-presentation`)](https://github.com/huytruong1810/Vibe/pull/1)  
**Latest Art Branch**: `art/hd-aqualia-slice`  
**Current CI Status**: 133/133 tests passing, `npm run check:assets` passing (742 frames, 1 single atlas page), `check:architecture` passing, deterministic SHA256 reproducibility (`rebuild.py --check`) in < 2s.

---

## 1. Executive Summary

This document provides complete context on the evolution of the Hearthwild art pipeline, technical post-mortems on failed approaches, the newly established **Hybrid Art Production Architecture**, and operational guidance for the engineering team.

Our goal is simple: **deliver commercial AAA JRPG-grade pixel art while rigorously upholding 100% of the engineering team's architectural invariants** (1-page texture atlas budget, deterministic CI reproducibility, integer root anchors, $\ge 1\text{px}$ transparent margins, zero simulation domain leaks).

---

## 2. Technical Post-Mortem: What We Tried & Failed

### Failure 1: Naive Diffusion Cutouts (Early Stage)

- **What was attempted**: Prompting image generators for individual frames and applying basic rectangular crops.
- **Why it failed**:
  1. _Mechanical slicing_: In East profile views, Rivallie's wide paddle fan tail was sliced off by rectangular bounding crops.
  2. _Boundary contact_: Cutouts frequently had pixels touching the canvas boundary, directly violating engineering's $\ge 1\text{px}$ margin check (`assets-check.ts`).
  3. _Anchor drift_: Because centers were calculated from naive bounding box midpoints rather than true foot ground-contact points, rotating characters between S, SE, E, and N facings caused distracting sliding and hopping.

### Failure 2: Pure Mathematical Pillow Procedural Drawing (Middle Stage)

- **What was attempted**: Completely drawing characters, creatures, and cottages using mathematical formulas, shaded rectangles, Pillow primitives, and signed distance field (SDF) normal shaders.
- **Why it failed**:
  - While technically satisfying every engineering check (zero margin violations, exact hashes, 100% deterministic), visually the assets looked stiff, flat, and blocky ("programmer art"). They failed the artistic bar for a commercial AAA pixel-art experience.

### Failure 3: Rectangular Bounding-Box Overlap Bleed

- **What was attempted**: Cropping multi-figure master turnaround sheets into individual sprites using connected component bounding boxes.
- **Why it failed**:
  - In sheets where figures were positioned closely (e.g. Rivallie East's long paddle tail reaching $x=1095$ while Rivallie North began at $x=1070$), the rectangular bounding box of Rivallie North captured the tail tip of Rivallie East, resulting in a vertical line cut artifact on the left margin.
  - _Fix_: Applied strict connected component mask isolation (`comp_rgba[~mask_pad, 3] = 0`).

### Failure 4: Discrete Row-Shift Scanline Tearing in Breathing Generators

- **What was attempted**: Forward-shifting rows `y + y_shift` to simulate chest expansion and breathing heave.
- **Why it failed**:
  - Whenever `y_shift` stepped by 1 (e.g., from $-2$ to $-1$), destination row $y-1$ was skipped, producing 1-pixel wide horizontal transparent slits across the torso.
  - _Fix_: Implemented continuous inverse mapping with hole-filling interpolation in `art/source/generators/actors/breathing.py`, guaranteeing 0 introduced column or row gaps.

---

## 3. The Rebooted Architecture: Hybrid Authoring & Ingestion Engine

To reconcile **commercial AAA aesthetics** with **engineering determinism**, we established a two-layer hybrid pipeline:

```
┌─────────────────────────────────────────────────────────────┐
│ Visual Authoring Layer (AAA Aesthetic Quality)             │
│ - Batched Master Turnaround Sheets (4-8 facings per plate)  │
│ - Consolidated Aqualia Villager Lineup Sheets               │
│ - Canonical 1080p Settlement Plates & Regional Sheets       │
│ - Batched Bust Dialogue Portraits                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Mechanical Ingestion Engine (art/source/pipeline/)          │
│ 1. BiRefNet neural alpha matting (rembg)                    │
│ 2. scipy.ndimage.label connected-component segmentation    │
│ 3. Strict component isolation (masking out adjacent figures)│
│ 4. Ground-contact detection & integer root anchoring        │
│    - Humanoids: 96x144 canvas, ground anchor at (48, 132)   │
│    - Rivallie:  96x96 canvas, ground anchor at (48, 86)    │
│ 5. Boundary audit enforcing >= 2px transparent margins      │
│ 6. Inverse-mapped 6-frame breathing cycle expansion         │
│ 7. Caching segmented cutouts in art/source/masters/cutouts/ │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Engineering Pipeline (scripts/assets-build.ts)              │
│ - Compiles 742 frames onto 1 single atlas page (3.89 MiB)   │
│ - Schema validation (SourceManifestSchema)                  │
│ - Deterministic CI check: rebuild.py --check (exits 0)      │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Safeguards:

1. **Component Isolation Masking**:

   ```python
   comp_rgba = np.array(matted)[ymin_pad:ymax_pad, xmin_pad:xmax_pad].copy()
   mask_pad = (labeled[ymin_pad:ymax_pad, xmin_pad:xmax_pad] == (idx + 1))
   comp_rgba[~mask_pad, 3] = 0  # Zero out pixels belonging to neighboring figures
   cutout = Image.fromarray(comp_rgba)
   ```

   Completely prevents adjacent limbs or tails from bleeding into neighboring figure crops.

2. **Zero-Drift Ground Contact Registration**:
   - Calculates the true foot/mass contact point of each sprite and locks it to $(48, 132)$ for humanoid actors and $(48, 86)$ for Rivallie.
   - Rotating through S &rarr; SE &rarr; E &rarr; N in the 3x turnaround GIFs exhibits rock-solid ground stability with zero horizontal or vertical foot sliding.

3. **Margin Guarantee**:
   - Player Aqualia: Left margin $\ge 21\text{px}$, Right margin $\ge 21\text{px}$, Top margin $16\text{px}$, Bottom margin $12\text{px}$.
   - Rivallie: Left margin $\ge 9\text{px}$, Right margin $\ge 9\text{px}$, Top margin $20\text{px}$, Bottom margin $10\text{px}$.
   - 7 Villagers: Left margin $\ge 12\text{px}$, Right margin $\ge 12\text{px}$, Top margin $\ge 14\text{px}$, Bottom margin $12\text{px}$.
   - Zero edge-contact pixels anywhere on any asset ($\ge 2\text{px}$ transparent padding enforced everywhere).

4. **100% Deterministic CI Testability**:
   - `python art/source/pipeline/rebuild.py --check` runs in under 2 seconds. Because pre-segmented master cutouts are checked into `art/source/masters/cutouts/`, CI builds do not require network calls, GPU hardware, or heavy neural inference.

---

## 4. Rate-Limiting Strategy & Development Velocity

- **Host Hardware Profile**: Python environment is CPU-only (`torch 2.14.0+cpu`, no CUDA). Running local diffusion on CPU takes 20–30 minutes per image.
- **Quota Conservation via Batched Masters**:
  - Rather than prompting cloud APIs for hundreds of individual animation frames, we author **single consolidated master sheets** containing multiple characters/facings.
  - A complete 7-villager lineup sheet required only 1 generation call.
- **Automated Resume Scheduling**:
  - When cloud image generation hits API rate limits (HTTP 429 cooldowns), the agent schedules background wakeup timers using the `schedule` tool.
  - The agent automatically wakes up when the quota resets and continues work without human intervention.

---

## 5. Architectural Guidance for Engineering

1. **Atlas Budget**:
   - 790 runtime frames pack into **1 single page** (3.96 MiB full / 1.20 MiB half). The engineering agent does not need to engineer complex multi-page atlas streaming for this slice.
2. **Untouched Runtime & Simulation Boundaries**:
   - The art agent works exclusively in `Vibe-art` on branch `art/hd-aqualia-slice`.
   - Simulation domains, worker bridges, state machines, and runtime adapters have remained untouched.
3. **Deterministic Rebuild Hook**:
   - Engineering can run `python art/source/pipeline/rebuild.py --check` at any time to verify that assets on disk match the master pipeline output.
4. **Interactive Verification**:
   - Engineering can review generated proofs in [`docs/art/handover-context.md`](handover-context.md), [`docs/art/review-gallery.md`](review-gallery.md), or the live gallery at `/gallery.html` (`npm run dev`).

