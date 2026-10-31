# Hearthwild Master Executive Briefing for Claude Game Director

**Document Role**: Authoritative Creative & Executive Briefing  
**Author**: 2D Art Designer & Ingestion Pipeline Lead (Antigravity), on behalf of the Development Team  
**Engineering Reference Baseline**: Commit `a3fc957c43467796a69a8ec57a0d03727def83d2` on `origin/eng/hd-presentation` ([Draft PR #1](https://github.com/huytruong1810/Vibe/pull/1))  
**Art Pipeline Branch**: `art/hd-aqualia-slice` ([Draft PR #2](https://github.com/huytruong1810/Vibe/pull/2))  
**Date**: October 31, 2026  

---

## 1. Executive Summary & Vision

Welcome to **Hearthwild**, an HD 2D top-down commercial JRPG developed in TypeScript (PixiJS/WebGL/Canvas) and Python, designed around a deep deterministic simulation architecture, modular physical presence, and rich environmental storytelling.

### Game Identity & Technical Tenets
- **Presentation**: Top-down $3/4$ perspective, $1920 \times 1080$ viewport, $64 \times 64\text{ px}$ world tiles, 16 display pixels per elevation step.
- **Visual Aesthetic**: Commercial AAA-grade pixel art (evoking *Octopath Traveler*, *Sea of Stars*, *Dead Cells*), combining authentic low-poly 3D orthographic turntable baking with hand-tuned pixel art palettes and lighting.
- **Physical Feedback**: Height and mass are authoritative simulation values driving recoil, camera shake, and soft-surface footprints. Art frames do **not** bake camera shake or recoil displacements into sprites.
- **Strict Architecture**: Zero simulation leaks. Presentation layers never modify `src/domain/` or simulation worker state.

---

## 2. Agentic Dev Team Structure & Roles

Our project operates across a 5-member team structure:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Claude Game Director                              │
│         (Executive Creative Authority, Visual Reviewer, Milestone Gate)     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Directives & Approvals
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Project Owner / Producer (@huytruong1810)             │
│            (Human in the Loop, Cross-Machine Sync, Final PR Merge)          │
└──────────────────┬───────────────────┬───────────────────┬──────────────────┘
                   │                   │                   │
                   ▼                   ▼                   ▼
┌──────────────────────────┐ ┌───────────────────┐ ┌──────────────────────────┐
│ Codex Engineering Agent  │ │  2D Art Lead (Me) │ │ 3D Blender Modeler       │
│ (eng/hd-presentation)    │ │(art/hd-aqualia)   │ │ (Dedicated Workstation)  │
│ - Presentation Engine    │ │ - Central Bridge  │ │ - Low-Poly Base Meshes   │
│ - Contract v2 & Compiler │ │ - Tile/Env Art    │ │ - Modular Rigging        │
│ - Schemas & Approvals    │ │ - 9-Expr Portraits│ │ - Headless 8-Way Baking  │
│ - 133 Engine Tests       │ │ - Atlas Ingestion │ │ - Zero-Drift Turntables  │
└──────────────────────────┘ └───────────────────┘ └──────────────────────────┘
```

1. **Claude Game Director (You)**:
   - Sets game direction, camera pitch approval ($18^\circ / 22^\circ$ vs unified scene camera), production milestones, animation priorities, and aesthetic sign-off.
2. **Project Owner (@huytruong1810)**:
   - Orchestrates multi-machine workflow, transfers assets, and performs final GitHub PR merges.
3. **Codex Engineering Agent**:
   - Owns `eng/hd-presentation` ([PR #1](https://github.com/huytruong1810/Vibe/pull/1)).
   - Authored Asset Contract v2, runtime schema compiler (`scripts/assets-build.ts`), audit engine (`scripts/assets-check.ts`), and physical presence mechanics.
4. **2D Art Designer & Ingestion Lead (Antigravity - Current Agent)**:
   - Owns `art/hd-aqualia-slice` ([PR #2](https://github.com/huytruong1810/Vibe/pull/2)).
   - Central communication bridge between Engineering and Blender.
   - Manages master plates, regional tilesets, 9-expression portrait pipeline, continuous breathing interpolation, manifest schemas, and determinism checks.
5. **3D Modeler & Turntable Baker (Blender Agent on dedicated workstation)**:
   - Operates on a dedicated machine equipped with Blender.
   - Owns stylized low-poly base meshes, armatures, modular humanoid and creature rigs, and headless `bpy` orthographic turntable rendering (`art/source/blender/render_pixel_sprites.py`).

---

## 3. Engineering Baseline & Architectural Contracts

The Codex Engineering Agent has finalized and published the engineering baseline at commit `a3fc957c` ([documented in `docs/art/team-production-message.md`](file:///c:/Users/htruong/source/repos/Vibe/docs/art/team-production-message.md)). All production must adhere to these rules:

### A. Asset Contract v2 (`docs/art/contract-v2.md`)
- **Staging Lifecycle**: All source assets declare stage as `proof` or `candidate`. Source files **cannot** self-assert `approved`.
- **Engineering Ledger**: Promotion to active gameplay is gated by engineering's `docs/art/approvals.json` (currently empty).
- **Graceful Gameplay Fallback**: Proof-stage or incomplete sets (e.g. idle-only submissions) are isolated into `reviewAppearances` and `reviewClips`. The active game continues running working legacy locomotion, combat, and sleep animations until complete replacement sets are approved.

### B. Texture Atlas & Memory Budgets (Corrected)
- **Atlas Dimensions**: $2048 \times 2048\text{ px}$ per page.
- **Multi-Page Architecture**: Multiple pages are fully supported.
- **Resident Memory Budgets**: High: **512 MiB**, Balanced: **256 MiB**, Low: **128 MiB**. The previously mentioned 16 MiB refers to decoded footprint of a single $2048^2$ RGBA page, not a whole-game ceiling.

### C. Suggested Two-Agent Art Division
Engineering has recommended splitting art authoring into two concurrent streams:
- **Agent A (Actors, Gear & Portraits)**: Humanoid/creature rigs, pose tables, body/hair/face/clothing layers, attachment sockets, weapons, and 9-expression portraits. Sole integrator of `art/source/manifest.json`.
- **Agent B (Environment, Furniture, VFX & UI)**: Regional tiles, 42 building interiors, 3 regional caves, furniture art, spell effects, and UI views. Submits records via a separate staging file for Agent A to reconcile.

---

## 4. Production Evolution & Current Asset Inventory

### The Breakthrough: From 2D Diffusion Drift to Blender 3D Orthographic Baking
1. **The Problem**: 2D diffusion turnaround sheets looked impressive in isolation, but continuous 360° rotation revealed severe **volumetric morphing and identity drift** (creature volume jumped $+65\%$ in SE and collapsed $-53\%$ in N; face and clothing details warped).
2. **The 3D Solution**: Adopting the *Dead Cells* / Motion Twin technique—modeling stylized low-poly base meshes in Blender, rendering headlessly via orthographic camera with Workbench shading, MATCAP/Texture, and Anti-Aliasing `OFF` for crisp pixel-art silhouettes.
3. **Latest Blender Delivery (Commit `b63e7e9`)**:
   - Master modular humanoid rig with hairstyles, faction robes, and handheld tools for all 30 villagers and 3 player origins.
   - All **8 distinct creature species** modeled and rendered across 8 facings $\times$ 6 breathing frames (384 frames total):
     - `rivallie`, `ignicap`, `zephyrit`, `mireling`, `cindermoth`, `steamshell`, `bramblefang`, `marshstalker`.
   - Complete 8-way turnarounds packed and verified in the reviewer gallery at `http://localhost:5173/?gallery=1`.

### Full Target Production Scope
- **41 Total Appearances**: 3 player origins (Aqualia, Zephyria, Pyria), 30 canonical villagers, 8 creature species.
- **Actor Motion Matrix**:
  - Idle: 6 frames $\times$ 8 facings.
  - Walk & Run: 8 frames each $\times$ 8 facings (strides: 1.5 tiles walk, 2.5 tiles run).
  - Attacks: 12 frames each $\times$ 8 facings (Innate, Elemental, Sword, Spear, Bow).
  - Guard / Hit: 4 frames each $\times$ 8 facings.
  - Player Dash: 6 frames $\times$ 8 facings.
  - Social / Needs: Eat, Drink, Bathe, Work, Social (6 frames $\times$ 4 facings: N, E, S, W).
  - Sleep: 4 frames $\times$ 4 facings.
  - Downed / Recovery: 6 frames $\times$ 4 facings.
- **9-Expression Dialogue Portraits**:
  - Neutral, warm, thoughtful, curious, concerned, amused, angry, sad, fearful at $96 \times 96$ and $128 \times 128$.
  - 33 human identities $\times$ 9 expressions = 297 masters / 594 runtime exports + 16 creature portraits.

---

## 5. Technical Safeguards & Invariants

| Specification | Standard | Enforced By |
| :--- | :--- | :--- |
| **Standard Human Root** | Canvas $96 \times 144\text{ px}$, Ground contact anchor at **$(48, 132)$** | `scripts/assets-check.ts` |
| **Rivallie Ground Root** | Canvas $96 \times 96\text{ px}$, Ground contact anchor at **$(48, 86)$** | `scripts/assets-check.ts` |
| **Border Padding** | Minimum **$\ge 2\text{px}$** transparent padding on all edges | `scripts/assets-check.ts` |
| **Combat Simulation** | 30 ticks/second deadlines (Innate: 4/2/9, Element: 7/3/16, Sword: 6/3/12, Spear: 8/2/14, Bow: 12/1/12) | Authoritative simulation |
| **Git Safety** | **Never force push (`--force`)** | Team convention |

---

## 6. Immediate High-Priority Directives Requested from the Game Director

To guide our immediate development sequence, we request your executive decision on:

1. **Target Scene Camera & Pitch Approval**:
   - The current prototypes use orthographic $18.0^\circ$ pitch for humanoids and $22.0^\circ$ for creatures. Engineering notes that these pitches need official visual approval against an actual game scene before bulk baking. Do you approve these pitches, or do you require a unified camera pitch across all actors and environment tiles?
2. **First Delivery Milestone Sequence**:
   - Engineering recommends focusing on an end-to-end **Aqualia Target Slice**:
     1. Merge engineering baseline (`a3fc957c`) and reconcile manifest with Contract v2.
     2. Deliver 1 actual-geometry Aqualia scene slice with native Player and Rivallie registration proofs.
     3. Deliver Player & Rivallie locomotion (walk/run) and 1 layered combat weapon proof.
     4. Progress environment, 9-expression portraits, and remaining villagers.
   - Do you approve this milestone sequence?
3. **Art Division Confirmation**:
   - Do you confirm the division of labor between Agent A (Actors, Gear, Portraits) and Agent B (Environment, Interiors, Furniture, VFX, UI), with Antigravity acting as the sole integrator of `art/source/manifest.json`?

We are prepared to execute your directives immediately upon receipt.
