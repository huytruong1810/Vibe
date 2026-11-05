---
id: 006
author: visitor
rule: L5, L10, L12, PRD-9
status: proposed
---

# Proposal 006: Commercial Model Licence Gate, Territory Compliance, and Weight Mirror Provenance

## Problem

Three licensing and supply-chain vulnerabilities in `docs/doctrine/locked-decisions.md` (`L5`, `L10`, `L12`) and `docs/doctrine/09-production-doctrine.md` (`PRD-9`) create severe commercial-release risk if left unaddressed before scaling past the Aqualia vertical slice:

1. **Tencent Hunyuan3D-2mv EU / UK / South Korea Territory Exclusion (`L5`, `L12`):**
   - `L5` locks `tencent/Hunyuan3D-2mv` as the image-to-3D generator for all characters, creatures, props, and buildings.
   - Section 1 of the **Tencent Hunyuan Community License Agreement** (`https://huggingface.co/tencent/Hunyuan3D-2mv/blob/main/LICENSE.txt`, accessed `2026-11-04`) defines the licensed `"Territory"` as **"worldwide except for the territory of the European Union, United Kingdom, and South Korea."**
   - Neither running the model nor distributing generated 3D assets commercially is licensed in the EU, UK, or South Korea without a separate custom commercial licence from Tencent.

2. **`PRD-9` Digest Cascade Invalidates `L12`'s "Regenerate Later" Strategy (`L12`, `PRD-9`):**
   - `L12` states: *"Before any commercial release, we will audit every model licence and regenerate anything made with a non-commercial model using a commercial-safe one."*
   - While regenerating a 2D terrain swatch is isolated, regenerating a `FLUX.2 [klein] 9B` (FLUX Non-Commercial License v2.1) reference sheet or replacing `Hunyuan3D-2mv` changes the generated 3D mesh topology.
   - Under `PRD-9` (Provenance & Digest Binding), changing a reference sheet or 3D mesh invalidates every downstream Blender rig (`rig.py`), every hand/back socket track (`bake/tracks.json`), every garment `fit` pass (`C9b`), and every `sourceDigest` in `docs/art/approvals.json`. Waiting until after all `41` actors and `44` environment props are baked to switch to commercial-clean models would force a complete rebuild of the entire 3D asset catalog.

3. **Volatile Third-Party HuggingFace Tags & Gemma Terms Compliance (`L10`, `AGT-1.2`):**
   - `docs/operations/operations.md:37-41` pulls `hf.co/HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q8_0` and `hf.co/llmfan46/gemma-4-26B-A4B-it-heretic-GGUF:Q4_K_M` directly from individual community HuggingFace accounts.
   - If either community repository is removed or renamed, new machine setups break immediately. Furthermore, the **Gemma Terms of Use** (`https://ai.google.dev/gemma/terms`, accessed `2026-11-04`) incorporate the Gemma Prohibited Use Policy regarding safety-filter circumvention on redistributed derivatives.

## Proposed Text

### 1. Amend `L5` and `L12` in `docs/doctrine/locked-decisions.md`

> **L5 (Image-to-3D Backend & Commercial Territory Gate):**
> `tencent/Hunyuan3D-2mv` is pinned for the non-commercial Aqualia vertical slice (`19` actors). Because the Tencent Hunyuan Community License Agreement excludes the European Union, United Kingdom, and South Korea from its licensed territory, **before starting post-Aqualia production (`41` full-world actors / `44` environment bindings)** the studio must either:
> 1. Qualify an Apache-2.0 or MIT image-to-3D backend in `forgelib/gen3d.py` (e.g., `TripoSG` under MIT or `Step1X-3D` under Apache-2.0) on a golden sample (`PRD-4`), **or**
> 2. Obtain written commercial territory clearance covering global distribution (including EU, UK, and South Korea).
>
> **L12 (Pre-Scale Commercial Licence Gate & `PRD-9` Protection):**
> Because `PRD-9` binds every 3D mesh, rig, socket track, and approval record to the upstream reference sheet and 3D generator digest, **no post-Aqualia 3D asset may be baked from a non-commercial reference sheet or territory-restricted 3D generator** unless a commercial licence for that generator is already executed (`FLUX` Commercial License from Black Forest Labs, or an Apache-2.0/MIT reference generator). Every entry in `art/source/forge/models.json` must carry `"commercialStatus": "apache-2.0" | "mit" | "commercial-licensed" | "dev-only-noncommercial"` and `"territoryRestrictions": []`.

### 2. Amend `L10` in `docs/doctrine/locked-decisions.md` and `docs/operations/operations.md`

> **L10.1 (Weight Mirror & Official Fallback Verification):**
> 1. Every Ollama GGUF model referenced in `docs/operations/operations.md` must record its exact `sha256` manifest digest and be mirrored to the studio's private backup storage so external HuggingFace account takedowns never break setup.
> 2. `npm run test:villagers` must pass on both the development abliterated tag (`gemma4-abliterated:e4b`) and the official un-abliterated `gemma4:e4b` base model (using in-world persona prompting) so commercial builds have a store-compliant weight option that requires no third-party safety-modified redistribution.

## Impact

- **Affected Roles:** `director` / `claude` (licensing decision before post-Aqualia scale-out), `codex` (`art/source/forge/models.json` metadata fields, optional `--backend` in `forgelib/gen3d.py`, GGUF SHA256 recording in `docs/operations/operations.md`).
- **Benefits:**
  - Prevents a full 3D catalog rebuild under `PRD-9` prior to commercial launch.
  - Protects European Union, United Kingdom, and South Korea commercial distribution rights.
  - Insulates developer onboarding and CI from third-party HuggingFace repository takedowns.
