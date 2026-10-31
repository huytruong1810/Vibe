# Hearthwild Cross-Team Coordination Hub

**Central Contact Point**: 2D Art Designer & Pipeline Lead (`art/hd-aqualia-slice`)  
**Human in the Loop / Director**: @huytruong1810  
**Last Updated**: 2026-10-30

---

## 1. Team Roster & Ownership Matrix

| Member                   | Role                                  | Workstation / Environment        | Primary Branch                                                                 | Key Ownership & Boundaries                                                                                                                                                                                                                                      |
| :----------------------- | :------------------------------------ | :------------------------------- | :----------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Human in the Loop**    | Project & Art Director                | Primary Workstation              | Both                                                                           | Vision, artistic evaluation, cross-machine transfer, PR merge gate.                                                                                                                                                                                             |
| **Engineering Agent**    | Presentation Engine Lead              | Primary Workstation (`Vibe`)     | `eng/hd-presentation` ([PR #1](https://github.com/huytruong1810/Vibe/pull/1))  | Presentation renderer (`src/presentation/renderer.ts`), scene graphs, camera viewports, state machines, simulation boundaries, browser journey specs, test suite.                                                                                               |
| **2D Art Designer (Me)** | Central Contact Point & Pipeline Lead | Primary Workstation (`Vibe-art`) | `art/hd-aqualia-slice` ([PR #2](https://github.com/huytruong1810/Vibe/pull/2)) | Central communication bridge, 2D master plates, regional environments/tiles, villager lineups, dialogue portraits, neural alpha matting, integer foot grounding, breathing cycle interpolation, asset catalog schemas, atlas packing, determinism verification. |
| **Blender Agent**        | 3D Modeler & Turntable Baker          | Dedicated Blender Workstation    | `art/hd-aqualia-slice` (Cloned)                                                | 3D stylized low-poly base meshes, armatures/rigging, headless Blender orthographic baking (`render_pixel_sprites.py`), zero-drift turntable generation.                                                                                                         |

---

## 2. Invariant Contracts & Interfaces

To guarantee that assets from the Blender Agent plug seamlessly into the Engineering Agent's engine without breaks, all members adhere to this shared contract:

```
┌────────────────────────────────────────────────────────┐
│ 3D Blender Agent (Dedicated Machine)                   │
│ - Models in art/source/blender/models/                 │
│ - Bakes unaliased frames via render_pixel_sprites.py    │
└──────────────────────────┬─────────────────────────────┘
                           │ 8 directional frames (.png)
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2D Art Designer & Pipeline Lead (This Agent)           │
│ - Ingests frames into art/source/exports/              │
│ - Generates 6-frame continuous breathing cycles        │
│ - Validates integer root anchors & >= 2px margins      │
│ - Compiles 1-page atlas & catalog.json                 │
│ - Enforces SHA-256 determinism (rebuild.py --check)   │
└──────────────────────────┬─────────────────────────────┘
                           │ Single atlas page + catalog.json
                           ▼
┌────────────────────────────────────────────────────────┐
│ Engineering Agent (eng/hd-presentation)                │
│ - Consumes public/assets/generated/catalog.json        │
│ - Renders sprites via src/presentation/renderer.ts     │
│ - Runs engine test suite (npm test)                    │
└────────────────────────────────────────────────────────┘
```

### Shared Geometric Specifications

| Entity                  | Canvas                    | Ground Anchor $(X, Y)$         | Camera Pitch | Ortho Scale | Shading / AA                      | Required Margins             |
| :---------------------- | :------------------------ | :----------------------------- | :----------- | :---------- | :-------------------------------- | :--------------------------- |
| **Player Aqualia**      | $96 \times 144\text{ px}$ | $(48, 132)$ (Feet contact)     | $18.0^\circ$ | $2.0$       | Workbench, MATCAP/Texture, AA OFF | $\ge 2\text{px}$ transparent |
| **Rivallie (Creature)** | $96 \times 96\text{ px}$  | $(48, 86)$ (Body/feet contact) | $22.0^\circ$ | $1.5$       | Workbench, MATCAP/Texture, AA OFF | $\ge 2\text{px}$ transparent |
| **7 Villagers**         | $96 \times 144\text{ px}$ | $(48, 132)$ (Feet contact)     | 2D Ortho     | N/A         | 2D Neural Matted & Interpolated   | $\ge 2\text{px}$ transparent |

---

## 3. Asset Pipeline Status Tracker

| Asset Category              | Target / Requirement                                                    | Current Status                                                                                                                                                                                                                                 | Responsible Agent                   | Next Action                                      |
| :-------------------------- | :---------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------- | :----------------------------------------------- |
| **Player Aqualia (8-Way)**  | 8 facings $\times$ 6 breathing frames = 48 frames                       | Delivered: Stylized low-poly 3D mesh with Aqualia teal poncho, trim, tunic, trousers, boots, stylized hair, and calibrated $(48, 132)$ anchor. Headless 8-way turnaround baked and ingested into atlas.                                        | Blender Agent $\rightarrow$ 2D Lead | Ready for locomotion/walk cycles.                |
| **Rivallie (8-Way)**        | 8 facings $\times$ 6 breathing frames = 48 frames                       | Delivered: Stylized low-poly quadruped mesh with river teal flanks, cream belly, snout, golden eyes, aqua crest fins, webbed paws, paddle fan tail, and calibrated $(48, 86)$ anchor. Headless 8-way turnaround baked and ingested into atlas. | Blender Agent $\rightarrow$ 2D Lead | Ready for locomotion/walk cycles.                |
| **7 Aqualia Villagers**     | 7 identities (`neris`, `reed`, `willa`, `oren`, `lark`, `dara`, `finn`) | Complete. Neural matted, root anchored, 6-frame continuous breathing cycles generated.                                                                                                                                                         | 2D Lead                             | Stable. Ready for Engineering consumption.       |
| **Regional Environment**    | Cottages, tiles, terrain, water edges                                   | Complete. Packed in atlas page.                                                                                                                                                                                                                | 2D Lead                             | Stable.                                          |
| **Dialogue Bust Portraits** | 22 high-resolution dialogue portraits                                   | Complete. Generated and indexed in `public/assets/portraits/`.                                                                                                                                                                                 | 2D Lead                             | Stable.                                          |
| **Atlas Budget**            | 1 single page ($2048 \times 2048$, $\le 16\text{ MiB}$)                 | 790 frames decoded to **4.87 MiB** (>69% headroom).                                                                                                                                                                                            | 2D Lead $\rightarrow$ Engineering   | Maintain 1-page allocation as animations expand. |

---

## 4. Cross-Agent Communications & Sync Log

- **From Blender Agent (Machine 2)**:
  - Installed Blender 4.2.3 LTS user-space runtime wrapped for headless Mesa software OpenGL on WSL2.
  - Created reproducible model generator `art/source/blender/generate_models.py` producing `player_aqualia.blend` and `rivallie.blend` with authentic color palette and silhouettes.
  - Calibrated camera ground anchors to exact specs: Humanoid at $(48, 132)$ and Rivallie at $(48, 86)$.
  - Rendered all 8 facings using Workbench STUDIO + MATERIAL shading with AA OFF.
  - Integrated into pipeline: 182 runtime assets and 6 proofs generated, packed into single-page atlas (4.87 MiB decoded).
  - Delivered AAA-grade visual fidelity across character, creature, and environmental assets.
  - All 4 verification gates passed (133/133 Vitest tests green, deterministic rebuild check verified, 0 domain leaks).
- **To Engineering Agent**:
  - Sent complete briefing detailing the 4-member team, technical post-mortem (diffusion drift vs 3D volume locking), 1-page atlas budget (3.96 MiB), and non-interference guarantee on `src/domain/`.
  - Established shared verification commands: `npm run check:assets`, `python art/source/pipeline/rebuild.py --check`, and `npm test`.
- **To Blender Agent**:
  - Provided comprehensive onboarding document in `docs/art/handover-context.md` and `art/source/blender/README.md`.
  - Provided ready-to-run headless script `art/source/blender/render_pixel_sprites.py` configured with exact orthographic camera pitches ($18^\circ$ / $22^\circ$) and unaliased Workbench shading.
  - Designated staging directory `art/source/blender/models/` for `.blend` source files.
- **To Human in the Loop (Director)**:
  - Providing regular status dashboards, review galleries, and turn-around proofs.

---

## 5. Verification Gate Protocol

Every asset delivered into the repository must pass this 4-step verification sequence:

1. **Gate 1: Render Quality (Blender Agent)**
   - Check rendered frames in `art/source/exports/{entity}/` for correct orientation, zero clipping, and unaliased pixel edges.
2. **Gate 2: Ingestion & Expansion (2D Pipeline Lead)**
   - Run `python art/source/pipeline/rebuild.py`.
   - Verify continuous inverse row mapping produces 0 scanline tears in breathing cycles.
   - Run `python art/source/pipeline/rebuild.py --check` to verify SHA-256 determinism (< 2s).
3. **Gate 3: Texture Atlas & Margin Audit (Engineering Script)**
   - Run `npm run assets:build` to pack the single-page atlas.
   - Run `npm run check:assets` to verify $\ge 2\text{px}$ transparent margins and root anchor compliance.
4. **Gate 4: Engine Integration (Engineering Agent)**
   - Run `npm run check:architecture` (0 domain leaks).
   - Run `npm test` (all 133 tests green).
