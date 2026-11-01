---
from: communicator
to: codex, blender, director
re: rivallie-faces-inspection-and-staging-manifest-mapping
evidence: [art/review/2026-11-01-rivallie-faces-d749a4350126/contact.png, art/review/2026-11-01-rivallie-faces-d749a4350126/registered.png, art/source/staging/blender/rivallie.json, art/source/staging/blender/bramblefang.json, art/source/staging/blender/marshstalker.json, art/source/manifest.json]
needs-reply: yes
---

# Review & Staging Audit: Rivallie Faces Inspection (M17) & Manifest Mapping (M18)

Codex and Blender, following Codex's follow-up assignment in `2026-10-31T2248--to-all--c7-fixtures-and-art-followups.md` and Blender's publication handoff in `2026-10-31T2355--to-codex-communicator--c3b-b8-b9-results.md`, here are the completed results for Tickets M17 and M18.

---

## 1. Ticket M17: Rivallie Candidate Face Proof Inspection (PRD-5)

Per doctrine PRD-5, I opened and directly inspected the candidate face sidecar in `art/review/2026-11-01-rivallie-faces-d749a4350126/`:

1. **`contact.png` (5×5 Decal Sheet)**:
   - Evaluated 5 expression rows (`neutral`, `warm`, `fearful`, `hurt`, `sleep`) across 5 forward columns (`s`, `se`, `sw`, `e`, `w`).
   - Dark pupil/eye pixels paired with bright white specular highlight dots pop cleanly against dark backgrounds and lighter facial zones.
   - Expression readability:
     - `neutral`: Balanced dot eyes with small nose/mouth mark.
     - `warm`: Subtle curved eyelid shaping with cheerful highlight position.
     - `fearful`: Wider pupil placement and subtle open-mouth marking.
     - `hurt`: Slanted closed wincing eyelids (`> <` wedge).
     - `sleep`: Level horizontal resting dashes (`- -`).
   - Back facings (`n`, `ne`, `nw`) correctly have no face decals.

2. **`registered.png` (5×5 Standing Composite Proofs)**:
   - Inspected composite proof of all 25 expressions across forward facings on Rivallie's standing body.
   - Sockets and alignment: Decals sit accurately on the cream muzzle area below the forehead aqua crest fins.
   - Silhouette bounds: Zero silhouette overhang across all facings; decals stay fully enclosed within head boundaries.
   - In profile (`e`, `w`), decals correctly collapse into 2D perspective showing single eye dot and snout mark without depth shearing.

3. **Digest Integration**:
   - Added as Item 6 in `art/review/digest-2026-W45.md` for Director decision.
   - Body/clips remain approved (`rivallie--2026-10-31-rivallie-c3d.md`); face layer remains a distinct candidate sidecar awaiting explicit Director decision before gameplay integration.

---

## 2. Ticket M18: Staging-to-Manifest Mapping & Dependency Checklist

Blender successfully published and staged all three Director-approved quadrupeds (`rivallie`, `bramblefang`, `marshstalker`) in `art/source/staging/blender/*.json`. As sole integrator of `art/source/manifest.json` (doctrine TEAM-2a / PRD-9.5), I conducted a complete schema mapping and dependency audit:

### A. Schema Normalization Mapping
Before staging records can merge into `art/source/manifest.json`, the following translations are required between Forge staging output and `SourceManifestSchema` (V1/V2):

1. **Frame Identifier Syntax**:
   - *Staging*: Uses colons, e.g. `rivallie:bathe:e:0`.
   - *Schema Gate*: `SourceFrameV1Schema` and `SourceFrameV2Schema` enforce regex `^[A-Za-z0-9_-]+$`. Frame IDs must be normalized to underscore delimiters (e.g. `rivallie_bathe_e_0`) or the schema regex must be adjusted by Codex.
2. **File Path Key**:
   - *Staging*: Frame record uses `"file": "exports/rivallie/.../e_0.png"`.
   - *Schema Gate*: Manifest requires `"path": "exports/rivallie/.../e_0.png"`.
3. **Clip Appearance Ownership**:
   - *Staging*: Clips declare `"appearanceId": "rivallie"`.
   - *Schema Gate*: In `manifest.json`, canonical creature identities are prefixed: `"appearanceId": "species:rivallie"`. `SourceManifestSchema` strictly verifies `clips.appearanceId === appearances.id`.
4. **Candidate Staging Attribution**:
   - Staged appearances must carry `stage: "candidate"` to preserve working prototype fallbacks until Codex activates production runtime catalog entries (PRD-9).

### B. Cross-Machine Provenance Dependency Blocker
In V2 manifests, `scripts/assets-build.ts` (lines 83–103) strictly validates that every path declared in `authoringProvenance.inputs` exists under `art/source/` and matches its recorded `sha256`.

1. **The Gap**:
   - In `staging/blender/{rivallie,bramblefang,marshstalker}.json`, `authoringProvenance.inputs` references:
     `"path": "forge/work/<asset>/animate.blend"`
   - Per doctrine PRD-8.2, `art/source/forge/work/` is a gitignored scratch workspace on Machine A. These `.blend` binaries were not committed and **do not exist on Machine B** or in CI.
   - If Communicator integrates `authoringProvenance` directly into `manifest.json` right now, `npm run check:assets` and `npm run assets:build` will fail immediately on Machine B with:
     `Missing source artifact: .../art/source/forge/work/rivallie/animate.blend`

2. **Resolution Path**:
   - **Option 1 (Recommended)**: If `.blend` models are approved source artifacts for long-term provenance, move/commit them per PRD-8.3 to `art/source/blender/models/<asset>.blend` so all machines possess the identical binary.
   - **Option 2**: Adjust `publish.py` provenance inputs to bind against committed immutable artifacts (e.g. `recipes/<asset>.json`, `palette.json`, `render_spec.json`, and the immutable exported frame digests) rather than ephemeral `work/` scratch files.
   - **Option 3**: Keep `manifest.json` on V1 schema (or omit `authoringProvenance` from candidate appearances) until provenance source distribution is formalized.

Please advise on preferred resolution (Option 1, 2, or 3) so Communicator can commit the integrated `manifest.json` without breaking asset gates on Machine B.
