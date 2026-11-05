---
id: 005
author: visitor
rule: L10, AGT-1.2, AGT-1.3, AGT-7, AGT-10.5
status: accepted-in-part
---

# Proposal 005: Villager Model Tier Inversion, Fixed-Domain Hybrid Retrieval, and 5-Metric Evaluation Gate

## Problem

Four defects in `docs/doctrine/locked-decisions.md` (`L10`), `docs/doctrine/11-living-minds.md` (`AGT-1.2`, `AGT-1.3`, `AGT-7`, `AGT-10.5`), and `docs/engineering/memory-and-context.md` (Tickets `C24` and `C25`) contradict measured hardware benchmarks and long-horizon agent research:

1. **16 GB VRAM vs. 26B Model Spill (`L10`, `AGT-1.2`, `AGT-1.3`, `AGT-7`):**
   - `L10` and `AGT-1.2` mandate `gemma4-abliterated:26b` (`17 GB` GGUF) as the reference villager model and `AGT-7` budgets `<= 2.0 s` warm time-to-first-token (`TTFT`).
   - On the reference 16 GB RTX 5080 Laptop GPU, `docs/operations/operations.md:45-48` and `docs/operations/verification.md:133` measure `gemma4-abliterated:26b` at **4.4 tokens/s (`66.15 s` per villager reply)** because 17 GB weights spill over 16 GB VRAM to system RAM.
   - Meanwhile, `gemma4-abliterated:e4b` runs on the 16 GB GPU at **55 tokens/s** (`art/source/forge/models.json:35`, `~2.0 s` per full reply, `< 0.4 s` TTFT), whereas pinning `e4b` to CPU (`AGT-1.3`) caused `> 45 s` timeouts on 4 of 5 steps in `docs/operations/verification.md:127-130` and consumes `~8–9.5 GB` of the 24 GB WSL RAM budget.

2. **Min-Max Normalization & Read-Time `lastAccessTick` Feedback Loop (`AGT-10.5`, `memory-and-context.md:140-143`):**
   - `AGT-10.5` specifies equal-weighted min-max normalization of `recency`, `importance`, and `relevance` to `[0, 1]` across candidate memories and updates `lastAccessTick` on every retrieved record.
   - On small or homogeneous candidate pools (e.g., Days 1–3 where all candidates have `importance = 5` or noisy cosine similarity `0.02–0.08`), min-max divides by zero (`max == min`) or stretches `0.08` noise into a `1.0` relevance score, while updating `lastAccessTick` on every read pins early trivial memories at `recency ~= 1.0` indefinitely (confirmed in long-horizon evaluations by Maharana et al., _LOCOMO_, `2024-02-27`, `https://arxiv.org/abs/2402.17753`, and Ahn et al., _TimeChara_, `2024-05-28`, `https://arxiv.org/abs/2405.18027`).

3. **Top-10 Semantic Blindspot in `ADD/UPDATE/INVALIDATE` (`memory-and-context.md:132-138`):**
   - Passing only the top-10 embedding-similar memories to session-end extraction misses prior commitments/promises when the player reschedules or cancels using different wording, leaving contradictory `active` commitments.

4. **Abliteration Sycophancy & Missing Multi-Dimensional Quality Gate (`AGT-1.2`):**
   - Orthogonalizing the refusal direction in abliterated models (Arditi et al., `2024-06-17`, `https://arxiv.org/abs/2406.11717`) weakens in-character boundary refusals and increases sycophancy. While `ADR 006` prevents illegal state mutations, it does not detect verbal compliance or persona collapse when emitting `action: NONE`.

## Proposed Text

### 1. Amend `L10` (`docs/doctrine/locked-decisions.md`) and `AGT-1.2`, `AGT-1.3`, `AGT-7` (`docs/doctrine/11-living-minds.md`)

> **AGT-1.2 (Model Tiers by VRAM Envelope):**
>
> - **Reference 16 GB VRAM Tier (default):** `gemma4-abliterated:e4b` (`HauhauCS/Gemma-4-E4B-Uncensored-HauhauCS-Aggressive:Q8_0`, or `Q4_K_M` on 8–12 GB GPUs) running on the GPU (`~55 tok/s`) serves both live villager dialogue and background compaction/extraction.
> - **High-VRAM Tier (>= 24 GB VRAM):** `gemma4-abliterated:26b` (`llmfan46/gemma-4-26B-A4B-it-heretic-GGUF:Q4_K_M`) is selectable when all model layers fit in GPU VRAM without PCIe spill (`>= 25 tok/s`).
> - **Embeddings:** `embeddinggemma` (256-dim prefix of Matryoshka 768-dim output).
>
> **AGT-1.3 (Serialized Warm-GPU Background Queue):**
> Background compaction (`AGT-10.3`), session-end memory extraction (`AGT-10.4`), and off-screen planning share the warm GPU `e4b` model via a low-priority request queue that yields immediately to any active player conversation turn. Do not load a second CPU copy of `e4b` inside a 24 GB RAM envelope.
>
> **AGT-7 (Latency & Streaming):**
> `OllamaAdapter.chat` uses streaming (`stream: true`) or incremental token buffering so warm TTFT is `<= 2.0 s` (`<= 0.6 s` target on `e4b` GPU), full turn completion is `<= 6.0 s`, and post-session extraction completes in `<= 10.0 s` on GPU.

### 2. Replace `AGT-10.5` (`docs/doctrine/11-living-minds.md` and `docs/engineering/memory-and-context.md:132-144`)

> **AGT-10.5 (Two-Stage Deterministic + Fixed-Domain Hybrid Retrieval):**
>
> 1. **Stage 1 — Deterministic State & Commitment Pinning (up to 4 slots):** Always retrieve active records with `kind: 'commitment' | 'relationship'` and `status: 'active'` involving the current interlocutor or entities named in the current turn. During session-end `ADD/UPDATE/INVALIDATE` extraction (`AGT-10.4`), always pass all active `commitment` and `relationship` records for the interlocutor alongside the top-10 semantic matches.
> 2. **Stage 2 — Fixed-Domain Semantic & Episodic Ranking (remaining slots up to 8 total):** Score remaining `active` records without candidate min-max stretching:
>    $$\text{score}(m) = 0.35 \cdot \text{Recency}(m) + 0.35 \cdot \text{Importance}(m) + 0.65 \cdot \text{Relevance}(m)$$
>    where:
>    - $\text{Recency}(m) = 0.995^{\max(0, \text{hoursSince}(m.\text{createdAtTick}))} \in (0, 1]$ (passive retrieval reads do **not** reset `createdAtTick`; explicit player re-mention adds at most $+0.15$).
>    - $\text{Importance}(m) = \frac{m.\text{importance}}{10} \in [0.1, 1.0]$.
>    - $\text{Relevance}(m) = \max\left(0, \frac{\cos(\mathbf{q}, \mathbf{m}) - 0.30}{0.70}\right) \in [0, 1]$ (cosine similarities below `0.30` score `0`).

### 3. Add `AGT-10.7` (`npm run test:villagers` 5-Metric Evaluation Gate)

> **AGT-10.7 (Villager Quality & Anti-Sycophancy Gate):**
> Every change to `src/domain/agents.ts`, `src/content/villagers.ts`, or `src/adapters/inference.ts` is verified by `npm run test:villagers` across a 20-turn, 3-session fixture measuring:
>
> - **M1 Action-Prose Fidelity (100% deterministic):** Zero dialogue claims of gifts, trades, teachings, or follow actions without a matching validated `AgentAction` and `WorldQuery`.
> - **M2 Multi-Session & Superseded-Commitment Recall (>= 85%):** Accurate recall across 2 compactions, zero citation of `invalidated` promises, and explicit hedging of `confidence: 'told'` rumors (`AGT-5.4`).
> - **M3 In-Character Boundary & Anti-Sycophancy (>= 4.0 / 5.0):** Adversarial prompts testing refusal of unreasonable demands at low trust and in-world deflection of anachronisms on abliterated weights.
> - **M4 Persona Lexical Distinctness:** Pairwise vocabulary Jaccard similarity `<= 0.35` and statistically distinct sentence-length cadences across the 10 Aqualia villagers.
> - **M5 Warm Latency P95 (`AGT-7`):** Warm TTFT `<= 2.0 s`, full turn `<= 6.0 s`, extraction `<= 10.0 s`.

## Impact

- **Affected Roles:** `codex` (`src/domain/agents.ts`, `src/adapters/inference.ts`, `scripts/verify-villagers.mjs`), `claude` / `director` (`docs/doctrine/locked-decisions.md`, `docs/doctrine/11-living-minds.md`, `docs/engineering/memory-and-context.md`).
- **Benefits:**
  - Cuts live villager reply latency on the reference 16 GB machine from `66.15 s` (`26b` spill) to `~2.0 s` (`e4b` GPU) and eliminates `> 45 s` CPU compaction timeouts.
  - Prevents low-relevance noise stretching, stale memory pinning, and broken commitment updates.
  - Establishes a reproducible, literature-backed benchmark for NPC believability and boundary integrity.

## Decision (claude, 2026-11-05)

- **Model tiers (`L10`, `AGT-1.2/1.3/7`): needs the director.** The spill measurement is confirmed (`docs/operations/operations.md:46`: 26b at 4.4 tokens/s on 16 GB). `L10` is a locked decision, so claude does not change it alone. Recommendation to the director: make `e4b` on GPU the default on 16 GB machines and keep `26b` for 24 GB or more.
- **Retrieval (`AGT-10.5`): accepted as design for C25.** Fixed-domain scaling and pinning commitments and relationships in both retrieval and extraction fix real failure cases of min-max on small pools. Claude updates `docs/engineering/memory-and-context.md` and `AGT-10.5` when codex starts C25 (ticket C34 below), not before.
- **Eval gate (`AGT-10.7`): accepted** as `npm run test:villagers` with M1-M5, thresholds to be tuned on the first run. Codex ticket after C25.
