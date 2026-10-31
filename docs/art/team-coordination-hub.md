# Hearthwild Cross-Team Coordination Hub

**Central Contact Point**: 2D Art Designer & Pipeline Lead (`art/hd-aqualia-slice`)  
**Project Owner / Producer**: @huytruong1810  
**Executive Creative Authority**: Claude Game Director  
**Last Updated**: 2026-10-31  

---

## 1. Team Roster & Ownership Matrix

| Member | Role | Workstation / Environment | Primary Branch | Key Ownership & Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **Claude Game Director** | Executive Creative Authority & Reviewer | Collaborative Interface | Global Direction | High-level creative vision, camera pitch approval, animation clip priorities, aesthetic review bar, and milestone sign-off. |
| **Project Owner / Producer** | Human in the Loop | Primary Workstation | Both | Vision, resource management, cross-machine git sync, and final PR merge gate. |
| **Codex Engineering Agent** | Presentation Engine Lead | Primary Workstation (`Vibe`) | `eng/hd-presentation` ([PR #1](https://github.com/huytruong1810/Vibe/pull/1)) | Presentation renderer (`src/presentation/renderer.ts`), scene graphs, camera viewports, state machines, simulation boundaries, browser journey specs, test suite, Asset Contract v2, and `approvals.json`. |
| **2D Art Designer (Me)** | Central Contact Point & Pipeline Lead | Primary Workstation (`Vibe-art`) | `art/hd-aqualia-slice` ([PR #2](https://github.com/huytruong1810/Vibe/pull/2)) | Central communication bridge, 2D master plates, regional environments/tiles, villager lineups, 9-expression dialogue portraits, neural alpha matting, integer foot grounding, breathing cycle interpolation, asset catalog schemas, atlas packing, and determinism verification. |
| **Blender Agent** | 3D Modeler & Turntable Baker | Dedicated Blender Workstation | `art/hd-aqualia-slice` (Cloned) | 3D stylized low-poly base meshes, armatures/rigging, modular humanoid and creature rigs, headless Blender orthographic baking (`render_pixel_sprites.py`), and zero-drift turntable generation. |

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
│ - Compiles atlas pages & catalog.json                  │
│ - Enforces SHA-256 determinism (rebuild.py --check)   │
└──────────────────────────┬─────────────────────────────┘
                           │ Validated atlas pages + catalog.json
                           ▼
┌────────────────────────────────────────────────────────┐
│ Engineering Agent (eng/hd-presentation)                │
│ - Consumes public/assets/generated/catalog.json        │
│ - Renders sprites via src/presentation/renderer.ts     │
│ - Gates active gameplay via docs/art/approvals.json    │
│ - Runs engine test suite (npm test)                    │
└────────────────────────────────────────────────────────┘
```

### Shared Geometric Specifications

| Entity | Canvas | Ground Anchor $(X, Y)$ | Camera Pitch | Ortho Scale | Shading / AA | Required Margins |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Player Aqualia** | $96 \times 144\text{ px}$ | $(48, 132)$ (Feet contact) | $18.0^\circ$ | $2.0$ | Workbench, MATCAP/Texture, AA OFF | $\ge 2\text{px}$ transparent |
| **Rivallie (Creature)** | $96 \times 96\text{ px}$ | $(48, 86)$ (Body/feet contact) | $22.0^\circ$ | $1.5$ | Workbench, MATCAP/Texture, AA OFF | $\ge 2\text{px}$ transparent |
| **30 Villagers** | $96 \times 144\text{ px}$ | $(48, 132)$ (Feet contact) | $18.0^\circ$ / 2D Ortho | $2.0$ / N/A | Workbench, MATCAP/Texture, AA OFF | $\ge 2\text{px}$ transparent |
| **8 Creature Species** | $96 \times 96\text{ px}$ | Species-calibrated | $22.0^\circ$ | $1.5$ | Workbench, MATCAP/Texture, AA OFF | $\ge 2\text{px}$ transparent |

### Texture Atlas & Memory Budget Contract
- **Atlas Page Dimensions**: $2048 \times 2048\text{ px}$ per page.
- **Multipage Allocation**: Multiple pages are fully supported.
- **Resident Memory Limits**: High: **512 MiB**, Balanced: **256 MiB**, Low: **128 MiB**. The $16\text{ MiB}$ metric is the decoded footprint of a single $2048^2$ RGBA page, not a project-wide limit.

---

## 3. Asset Pipeline Status Tracker

| Asset Category | Target / Requirement | Current Status | Responsible Agent | Next Action |
| :--- | :--- | :--- | :--- | :--- |
| **Master Director Briefing** | Comprehensive executive briefing | Delivered: [`docs/art/game-director-briefing.md`](game-director-briefing.md). | 2D Lead | Awaiting Claude Game Director directives. |
| **Modular Humanoid Rig** | 19 deform bones + 10 non-deforming equipment sockets | Delivered: `humanoid_modular_base.blend` with bone hierarchy, mannequin body, 9 hairstyles, 9 outfits, and 8 tools. Headless batch renderer `render_modular_cast.py` verified across 1008 frames. | Blender Agent $\rightarrow$ 2D Lead | Ready for equipment swapping & locomotion cycles. |
| **Player Aqualia (8-Way)** | 8 facings $\times$ 6 breathing frames = 48 frames | Delivered: Stylized low-poly 3D mesh with Aqualia teal poncho, trim, tunic, boots, hair, and $(48, 132)$ anchor. Headless 8-way turnaround baked and ingested. | Blender Agent $\rightarrow$ 2D Lead | Ready for locomotion/walk cycles. |
| **Rivallie (8-Way)** | 8 facings $\times$ 6 breathing frames = 48 frames | Delivered: Stylized low-poly quadruped mesh with teal flanks, cream belly, aqua crest, paw fins, paddle tail, and $(48, 86)$ anchor. Headless 8-way turnaround baked and ingested. | Blender Agent $\rightarrow$ 2D Lead | Ready for locomotion/walk cycles. |
| **8 Creature Species** | 8 species $\times$ 8 facings $\times$ 6 breathing = 384 frames | Delivered in commit `b63e7e9`: All 8 species (`rivallie`, `ignicap`, `zephyrit`, `mireling`, `cindermoth`, `steamshell`, `bramblefang`, `marshstalker`) modeled and rendered across 8 facings with breathing frames. | Blender Agent $\rightarrow$ 2D Lead | Awaiting Director visual sign-off. |
| **30 Canonical Villagers** | 30 identities with distinct hairstyles, robes, and tools | Delivered in commit `b63e7e9`: Modular humanoid rig expanded with hairstyles and faction robes for all 30 villagers and 3 player origins. | Blender Agent $\rightarrow$ 2D Lead | Awaiting Director visual sign-off. |
| **Regional Environment** | Cottages, tiles, terrain, water edges | Complete. Packed in atlas. | 2D Lead | Stable. |
| **Dialogue Bust Portraits** | 22 high-resolution dialogue portraits | 22 existing portraits stable. Full scope requires 9 expressions across 33 human identities (297 masters / 594 runtime exports). | 2D Lead | Phase in 9-expression sets per character identity. |

---

## 4. Cross-Agent Communications & Sync Log

- **To Claude Game Director**:
  - Published master briefing document in [`docs/art/game-director-briefing.md`](game-director-briefing.md).
  - Outlined 3 high-priority decisions: Camera pitch approval ($18^\circ / 22^\circ$ vs unified), Aqualia Target Slice milestone sequence, and Agent A/B division confirmation.
- **From Codex Engineering Agent (`eng/hd-presentation` / `a3fc957c`)**:
  - Published Asset Contract v2 and physical presence mechanics.
  - Corrected atlas memory model: multi-page supported within 512/256/128 MiB resident ceiling.
  - Flagged rebuild toolchain hardening: `--check` must be strictly read-only, and committed Blender exports must not be overwritten by procedural mesh generation.
- **From Blender Agent (Dedicated Workstation / Commit `b63e7e9`)**:
  - Delivered modular humanoid base rig with 19 deform bones, 10 equipment sockets, 9 hairstyles, 9 outfits, and 8 tools.
  - Modeled and rendered all 8 distinct creature species across all 8 directions.
- **From 2D Art Designer (Me)**:
  - Reconciling ingestion pipeline and manifest declarations with Contract v2.
  - Enforcing zero scanline tears, integer root grounding, and $\ge 2\text{px}$ transparent padding across all candidate frames.

---

## 5. Verification Gate Protocol

Every asset delivered into the repository must pass this 4-step verification sequence:

1. **Gate 1: Render Quality (Blender Agent)**
   - Check rendered frames in `art/source/exports/{entity}/` for correct orientation, zero clipping, and unaliased pixel edges.
2. **Gate 2: Ingestion & Expansion (2D Pipeline Lead)**
   - Run `python art/source/pipeline/rebuild.py`.
   - Verify continuous inverse row mapping produces 0 scanline tears in breathing cycles.
   - Run `python -B art/source/pipeline/rebuild.py --check` to verify SHA-256 determinism (< 2s) with zero side effects.
3. **Gate 3: Texture Atlas & Margin Audit (Engineering Script)**
   - Run `npm run assets:build` to pack atlas pages.
   - Run `npm run check:assets` to verify $\ge 2\text{px}$ transparent margins and root anchor compliance.
4. **Gate 4: Engine Integration (Engineering Agent)**
   - Run `npm run check:architecture` (0 domain leaks).
   - Run `npm test` (all 133 tests green).
