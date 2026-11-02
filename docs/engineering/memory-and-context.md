# Villager memory and conversation context (AGT-10)

Status: specification, 2026-11-02 (claude, on the director's request). Implementation is
codex tickets C24 (context and compaction) and C25 (long-term memory). Doctrine:
`docs/doctrine/11-living-minds.md` AGT-1.3, AGT-10, AGT-7; ADR 032.

## 1. What is wrong today (the correction)

The code treats compaction as the memory mechanism, and has no conversation context:

- **No transcript.** `PlanService.job` (`src/domain/agents.ts:665`) builds every dialogue
  prompt from identity, a 800-char `summary`, ~12 keyword-retrieved memories, commitments
  and the player's latest line. The turns of the current conversation are not in the
  prompt, so a villager can lose the thread inside one conversation.
- **"Compaction" destroys memory.** `needsCompaction` (`agents.ts:232`) fires on counts
  (more than 10 conversation records, ~1,500 tokens of them, or 180 records) and
  `MemoryRepository.compact` (`agents.ts:208`) replaces up to 24 records with one
  1,600-char summary string and deletes them. Structured, provenance-bearing memories turn
  into lossy prose. Nothing measures the model's context window.
- **One model** does everything, and `num_ctx` is fixed at 4096
  (`src/adapters/inference.ts:103`) while the budget is a constant 2800
  (`agents.ts:696`).

## 2. Industry practice (research, 2026-11-01)

Compaction (within one session):

- Anthropic's API compacts on an `input_tokens` trigger (default 150,000, minimum 50,000),
  can pause after compaction so the caller re-inserts recent turns (docs example keeps 3),
  and takes custom summary instructions
  ([compaction](https://platform.claude.com/docs/en/build-with-claude/compaction-threshold)).
  Claude Code compacts near the model's context limit and re-reads durable memory
  (CLAUDE.md, auto memory) from disk afterwards, keeping memory separate from the
  summary ([context window](https://code.claude.com/docs/en/context-window)).
- OpenAI's Responses API compacts server-side at a `compact_threshold`
  ([compaction](https://developers.openai.com/api/docs/guides/compaction)).
- LangChain's `SummarizationMiddleware` triggers on a `fraction` or `tokens` threshold,
  keeps the last N messages (default 20) and lets you pass a separate summarizer model
  ([middleware](https://docs.langchain.com/oss/python/langchain/middleware/built-in)).
  Google ADK compacts in the background on an interval or `token_threshold`, with an
  overlap of retained events ([ADK](https://adk.dev/context/compaction/)).
- Common shape: token trigger well before the hard limit, background summarization,
  recent turns kept verbatim, durable memory kept outside the summary. No source publishes
  a fixed percentage; the director's **75%** is the threshold here.

Memory (across sessions):

- Generative Agents: a memory stream scored by recency + importance + relevance, equal
  weights, min-max normalized, recency decay 0.995 per game hour; importance 1–10 from the
  LLM at write time; reflection when recent importance sums past 150
  ([paper](https://arxiv.org/abs/2304.03442)).
- Letta/MemGPT: small labelled **memory blocks always in context**, edited only through
  memory tools; larger recall and archival stores searched on demand
  ([blocks](https://docs.letta.com/v1-sdk/memory/memory-blocks/), [MemGPT](https://arxiv.org/abs/2310.08560)).
- Mem0: extraction from the conversation summary plus recent messages, then an update step
  where an LLM picks **ADD / UPDATE / DELETE / NOOP** against the top-10 similar memories;
  on LOCOMO it reaches 66.9% vs 72.9% for full context at 0.71 s vs 9.87 s p50 latency and
  ~1.8K vs ~26K tokens ([paper](https://arxiv.org/abs/2504.19413)).
- Zep/Graphiti: temporal knowledge graph; facts are invalidated rather than deleted
  ([paper](https://arxiv.org/abs/2501.13956)). LangMem: semantic, episodic and procedural
  memory; formation in the hot path or in the background
  ([guide](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)).

Local models (Ollama): `gemma4:e4b` (4.5B effective, 128K context, 6.6–9.5 GB, structured
output via `format`), `gemma4:26b` (MoE, 3.8B active, 256K context, 16–19 GB),
`embeddinggemma` (768-d, Matryoshka 512/256/128) via `POST /api/embed`
([gemma4](https://ollama.com/library/gemma4), [structured outputs](https://docs.ollama.com/capabilities/structured-outputs.md)).

## 3. Design

### 3.1 Conversation context (C24)

- `DialogueSession` (worker state, not saved): `{ id, npcId, turns: {speaker, text,
emotion?, tokens}[], summary: CompactionSummary | null, summarizedThrough: number,
revision }`. Opened by `interact`, closed by `closeDialogue`; a reload ends it.
- **Input budget** `B = contextTokens − replyReserve − 5%`. `contextTokens` is a setting
  (default 8192 for `gemma4:26b`; `num_ctx` sent to Ollama is the same value, so the KV
  cache is sized deliberately). `replyReserve` = the job's `num_predict`.
- **Token counting**: estimate as today, then calibrate per model from Ollama's reported
  `prompt_eval_count` (running ratio of real to estimated tokens), so the 75% trigger tracks
  the real tokenizer.
- **Prompt order** (stable, cache-friendly): system (identity, rules) → core blocks →
  retrieved memories → world facts → `conversationSoFar` (summary) → recent turns → player
  line. Fixed budgets: core blocks ≤ 300 tokens, memories ≤ 600, facts ≤ 300.
- **Trigger**: after each completed turn, if the next prompt's projected size
  (current + one average turn) is ≥ 75% of `B`, enqueue a `compaction` job unless one is
  pending for the session.
- **Job** (`gemma4:e4b`, priority below dialogue, above plans): input = previous summary +
  turns `(summarizedThrough, n − K]` with **K = 4** recent turns kept verbatim. Output
  schema `CompactionSummary`: `{ gist ≤ 120 words, playerAsked[], villagerPromised[],
decided[], open[], mood }`, each list ≤ 5 items of ≤ 20 words. Apply only if the session
  revision is unchanged since the job was built (optimistic concurrency, like today's
  `expectedRevision`); otherwise discard and retry next turn.
- **Overflow fallback**: if a turn must be sent at ≥ 95% and no summary covers enough, drop
  the oldest verbatim turns (deterministic) and mark the prompt `truncated` in the debug
  overlay. Never block, never fail a reply, never touch memory blocks.
- **Model placement**: setting `backgroundModel` (default `gemma4:e4b`; falls back to the
  dialogue model with a warning if not installed) and "Run background model on CPU"
  (default on: sends `options.num_gpu: 0`, so the 26B dialogue model stays resident in
  VRAM; measure CPU latency in the smoke and record it).
- **Remove** the old count-based `compaction` job and `MemoryRepository.compact`'s deletion
  path (C25 replaces consolidation).

### 3.2 Long-term memory (C25)

```ts
type MemoryType = 'episodic' | 'semantic' | 'commitment' | 'reflection' | 'sight' | 'reading';
interface MemoryRecordV2 {
  id: string;
  type: MemoryType;
  text: string /* ≤ 280 */;
  subjects: string[];
  importance: number /* 1–10 */;
  createdTick: number;
  lastAccessTick: number;
  confidence: 'witnessed' | 'told' | 'inferred';
  source: { kind: 'event' | 'session' | 'reflection' | 'sight' | 'artifact'; ids: string[] };
  invalidAtTick?: number;
  supersededBy?: string; // never deleted silently
}
interface CoreBlocks {
  self: string /* ≤ 300 chars */;
  player: string /* ≤ 400 */;
  relationships: string; /* ≤ 400 */
}
```

- **Deterministic writes** (no LLM): perception, gifts, battles, care, commitments: the
  existing `PerceptionSystem`/action paths write typed records directly.
- **Extraction at session end** (`gemma4:e4b`, background): input = final
  `CompactionSummary` + last K turns + the top-10 most similar existing memories (ids) +
  core blocks. Output: `operations: ({op:'ADD', type, text, subjects, importance} | {op:
'UPDATE', id, text, importance?} | {op:'INVALIDATE', id, reason} | {op:'NOOP'})[] ≤ 8`
  and `blocks: {block, value}[] ≤ 2`. Validation: ids only from the supplied set; the
  grounding filter (entities must exist; player claims stay `told`); caps; ≤ 1 extraction
  per session. Applied by the simulation with provenance `{kind:'session', ids:[sessionId]}`.
- **Retrieval**: score = recency + importance + relevance, each min-max normalized over
  the candidates, weights 1. Recency = 0.995^(game hours since `lastAccessTick`);
  relevance = cosine similarity of `embeddinggemma` vectors (256-d Matryoshka) of the
  query and the record, keyword overlap when no embedding model is installed. Exclude
  invalidated records. Update `lastAccessTick` for records that make it into a prompt.
- **Embeddings** are a cache, not save data: IndexedDB keyed by (model, dimensions, record
  id, text hash), recomputed on demand in the background. Saves stay small.
- **Reflection**: when the importance sum since the last reflection reaches a threshold
  (start at 150, tune in the soak), a reflection job (dialogue model, idle only) writes ≤ 3
  `reflection` records citing their sources.
- **Capacity**: ≤ 400 valid records per villager. Over the cap, the lowest-scoring
  `episodic` records are folded into one `episodic` digest record by a background job,
  and the originals are invalidated with `supersededBy`. Semantic facts and commitments
  are never folded.
- **Migration** (next save version): `fact` → episodic/witnessed, `hearsay` →
  episodic/told, `reflection` → reflection, `conversation` → episodic/witnessed; the old
  `summary` string becomes one episodic record "Earlier, I remembered: …" (importance 5) and
  core blocks seed from the profile. C18's `reading` memories and AGT-3 `sight` notes use
  the new types.

### 3.3 Safety

Memory text and transcripts are data, never instructions (existing identity line). A
model can propose memory operations but only the simulation applies them after
validation (ADR 005/006). Player claims stay `told` until the simulation witnesses them.

## 4. Tests and evidence

| Area                               | Test                                                                                                                                                                                                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Budget and trigger                 | Unit: a session crosses 75% → exactly one compaction job; recent K turns verbatim; summary applied only on unchanged revision; ≥ 95% overflow drops oldest turns deterministically                                           |
| No memory loss                     | Unit: compaction never changes `npc.memory`; property test: any session length keeps the prompt ≤ B                                                                                                                          |
| Extraction                         | Unit per op: ADD/UPDATE/INVALIDATE/NOOP validation, foreign ids rejected, hearsay stays `told`, caps; injection text in a turn cannot create an action or a witnessed fact                                                   |
| Retrieval                          | Golden ranking on a fixture with fixed vectors; keyword fallback; invalidated records excluded                                                                                                                               |
| Migration                          | v-current → next save: counts, types, ids, summary record                                                                                                                                                                    |
| Live smoke (machine A, blender B0) | `npm run test:ollama` extended: a 30-turn conversation with `gemma4:26b` + `gemma4:e4b` (CPU) stays coherent (the villager recalls a turn-3 promise at turn 28), compaction latency and reply latency recorded against AGT-7 |
