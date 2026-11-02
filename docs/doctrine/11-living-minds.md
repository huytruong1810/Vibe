# 11 — Living minds

Hearthwild's villagers are local-LLM agents grounded by a deterministic simulation:
structured long-term memory with provenance, reflection, daily schedules, structured
JSON actions, context compaction within a conversation (AGT-10), and emotions that drive
portraits and poses. This is a headline feature. It
must feel alive **and** stay fast. The existing engineering rules stand: the simulation
alone changes world state, proposals are validated, and a model can't create facts by
saying them (engineering ADR 005/006).

## AGT-1 Model stack (L10)

- **AGT-1.1** Inference is local only, through Ollama on loopback. No hosted
  provider and no secrets in the browser.
- **AGT-1.2** The reference villager model is **Gemma 4 26B** (`gemma4:26b`,
  mixture-of-experts, about 4B active parameters, native vision). The director rates it
  best for character depth. Smaller models are fallbacks for weaker machines and must
  pass the same smoke test.
- **AGT-1.3** One model serves dialogue, planning, reflection and sight (AGT-3), so VRAM
  holds one resident model. The background jobs that summarize and extract (context
  compaction and memory extraction, AGT-10) use the small **Gemma 4 E4B**
  (`gemma4:e4b`, 128K context), run on the CPU by default so they never evict the
  villager model from VRAM. Other models (TTS, image, embeddings) must fit around it
  (AGT-4, AGT-6, AGT-10).

## AGT-2 What makes a villager feel alive

1. **They remember you specifically**: names, gifts, promises, what you wore, what you did
   in front of them (provenance-backed memories).
2. **They notice the world**: weather, time, a fire on the dock, a new painting on a wall
   (perception, now including sight).
3. **They have their own day**: schedules and plans that continue without the player.
4. **They react with their whole body**: emotion drives the portrait, sprite face, idle pose and
   voice at the same moment (AGT-5).
5. **They make things**: gifts, gossip, and for some, art (AGT-6).

## AGT-3 Sight: villagers can see the game

- **AGT-3.1 What they see.** A snapshot of the **rendered world layer only**: no HUD,
  menus, cursor, debug overlays or anything outside the game canvas. It is cropped to the
  villager's view (about 12×7 tiles around them, biased toward their facing) and scaled
  with nearest-neighbour to at most 448×252.
- **AGT-3.2 When.** (a) Once when a conversation opens: the villager looks at the
  scene and at you. (b) "Notice" events: something salient enters their view (the player
  in new gear, a placed painting, fire, a creature fight), at most one per villager per
  10 real minutes, background priority. (c) Once per game day, a look at their home or
  work area for reflection.
- **AGT-3.3 Sight notes, not raw images.** Each snapshot is turned once into a short
  structured **sight note** (at most 40 words: people, creatures, objects, mood) and stored
  as a new memory kind `sight` with its snapshot time and place. Later prompts reuse the
  text and never resend old images. That keeps context small and calls rare.
- **AGT-3.4 Grounding.** A sight note is perception, not fact. Mentions of entities the
  `WorldQuery` doesn't list nearby are dropped before storage. Sight can colour dialogue
  ("that poncho suits the river"); it can't authorize actions, create items or alter
  relationships beyond the existing validated actions.
- **AGT-3.5 Budget.** Image token budget 280 for dialogue sight and 140 for background
  sight. A dialogue prompt with an image stays within the configured context. Snapshot
  capture and encoding run off the main thread (no more than 2 ms main-thread cost per
  snapshot).
- **AGT-3.6 Player control.** A settings toggle "Villagers can see" (default on), and a
  small eye glyph on the villager's name plate while a snapshot is in use. Snapshots never
  leave loopback and are not saved; sight notes are.

## AGT-4 Voice: villagers speak

- **AGT-4.1 Three tiers, chosen in settings:**

  | Tier                         | Engine                                                                                                  | Cost                                         | Use                                               |
  | ---------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
  | **Blips** (always available) | Per-villager syllable voice blips synthesized in-engine (pitch, timbre, cadence from the voice profile) | Near zero                                    | Low-end machines, fast reading, the retro default |
  | **Spoken** (recommended)     | **Kokoro-82M** (Apache-2.0) in a browser worker via WebGPU, WASM fallback                               | About 300 MB RAM, no VRAM contention on WASM | Full voiced dialogue                              |
  | **Expressive** (high end)    | **Chatterbox** (MIT, emotion exaggeration control) as a local loopback service                          | About 4 GB VRAM                              | When the GPU has headroom beside the LLM          |

- **AGT-4.2 Voice profiles are authored, not inferred.** Each villager gets a content
  record: engine voice ID or blend, pitch offset, rate, timbre notes, blip settings. Age,
  role and personality inform the casting. **Gender is never inferred from pronouns
  or names.** The director approves a voice casting sheet (one sample line per
  villager) before voices ship.
- **AGT-4.3 Emotion → prosody.** The line's emotion (the same nine as portraits)
  selects a preset:

  | Emotion    | Rate | Pitch         | Energy / exaggeration | Pauses   |
  | ---------- | ---- | ------------- | --------------------- | -------- |
  | neutral    | 1.00 | 0             | 0.50                  | normal   |
  | warm       | 0.96 | +0.5 st       | 0.55                  | soft     |
  | thoughtful | 0.90 | −0.5 st       | 0.40                  | longer   |
  | curious    | 1.04 | +1 st, rising | 0.55                  | short    |
  | concerned  | 0.94 | −0.5 st       | 0.50                  | hesitant |
  | amused     | 1.06 | +1 st         | 0.65                  | light    |
  | angry      | 1.08 | −1 st         | 0.80                  | clipped  |
  | sad        | 0.86 | −1.5 st       | 0.35                  | long     |
  | fearful    | 1.10 | +1.5 st       | 0.70                  | broken   |

- **AGT-4.4 Streaming.** Dialogue streams from Ollama with the `dialogue` field first in
  the schema. A sentence chunker feeds TTS sentence by sentence. Text reveal is synced to
  audio, and skip stops audio instantly. Subtitles are always on. Music ducks 6 dB under
  voices.
- **AGT-4.5** Only villagers speak aloud; player lines are text.

## AGT-5 One emotion, whole body

Each spoken line carries exactly one emotion. It drives, at the same time: the dialogue
portrait (9 expressions), the sprite face layer (ART-8.3), an idle pose variant, and the
voice prosody (AGT-4.3). No subsystem picks its own emotion.

## AGT-6 Agentic creativity: paintings

- **AGT-6.1 Who paints.** Any human can make a **painting**, a decorative artifact (AGT-9).
  Villagers do it through the validated action `CREATE_PAINTING`; artistic roles (Lark,
  the wetland painter, first) paint often, everyone else rarely (AGT-6.3). The subject
  comes from their memories and sight notes ("the ferry at dusk", "Rivallie by the
  reeds"). The **player** paints at an easel or on a blank canvas through a painting
  screen: they write the prompt, see a preview in the game palette, then keep or retry.
- **AGT-6.2 Pipeline (asynchronous, never real time).** A villager's LLM writes a
  structured brief (title, subject, palette mood, composition); the player's screen
  writes the same brief from the player's text. A local image model renders it at low
  resolution. A deterministic post-process downsamples to 48×32 art px, quantizes to the
  doctrine palette (at most 16 colours) and the renderer adds a frame. The result becomes
  a painting artifact with provenance (painter, day, title, brief, model, seed).
- **AGT-6.3 Scheduling.** Villager paintings run only when no dialogue is active and the
  GPU is free: during sleep acceleration or pause, with the LLM unloaded if VRAM requires
  it. Artists paint at most one painting per game day, other villagers at most one per
  seven days. A player painting runs on request; dialogue and villager jobs wait for it.
  While work is pending the artifact shows "in progress"; it survives a save and reload.
- **AGT-6.4 Platform reality.** Image generation goes through a configurable **loopback
  image endpoint**, not through Ollama: Ollama's experimental image generation was
  macOS-first and was removed in v0.32.6 (August 2026). The reference provider is the
  stable-diffusion.cpp server (MIT; CUDA, Vulkan, Metal; Linux, Windows, macOS) with an
  Apache-2.0 model (Z-Image Turbo or FLUX.2 klein 4B); never a non-commercial model. No
  endpoint means no new paintings, never a broken game: existing paintings still show.
- **AGT-6.5 Content rules.** Allowed subjects are landscapes, creatures, objects and
  villagers (portrait requests pass through the subject's affinity). No text in images,
  no real-world people or brands. A brief that fails the allowlist is rejected with a
  receipt. The player's prompt passes the same rules.
- **AGT-6.6 Seeing a painting.** A villager perceives a painting through its **caption**,
  a sight note (AGT-3.3) made once when the painting is finished, never by resending the
  image. Hanging a painting is a notice event (AGT-3.2).
- **AGT-6.7 No pixel drawing by models.** Language models never place pixels: a 48×32
  painting is 1,536 decisions, far beyond a villager's context budget. A player-only
  pixel touch-up tool on the palette grid is allowed (it needs no model).

## AGT-7 Performance budgets (reference machine: RTX 5080 laptop, `gemma4:26b`)

| Path                                                                    | Budget                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Dialogue: player sends → first streamed token                           | ≤ 2.0 s warm                                                                         |
| Dialogue: player sends → first voiced audio (Spoken tier)               | ≤ 3.0 s                                                                              |
| Dialogue with sight (first turn)                                        | ≤ +1.5 s over text-only                                                              |
| Background jobs                                                         | Never delay or block a dialogue (preemption stays)                                   |
| Reading (`READ_TEXT` reaction) after the read is proposed               | ≤ 2.0 s to first streamed token warm                                                 |
| Player painting: Generate → palette preview                             | ≤ 30 s, including unloading and reloading the LLM                                    |
| Opening a 48-page book on the book screen                               | ≤ 100 ms                                                                             |
| Compaction and memory extraction (`gemma4:e4b`, background)             | Never on a reply's critical path; extraction done ≤ 30 s after a conversation closes |
| Memory retrieval per prompt (scoring, cached embeddings)                | ≤ 5 ms                                                                               |
| Main thread cost of AI subsystems (capture, chunking, audio scheduling) | ≤ 1 ms per frame average                                                             |
| TTS on main thread                                                      | 0 (worker only)                                                                      |

These are product targets measured by the smoke and benchmark scripts. Missing one is a
bug to fix or a tier to downgrade, never a reason to block the game.

## AGT-8 The written word: notes and books

- **AGT-8.1 What exists.** A **note** is one page; a **book** is pages bound together.
  Both are artifacts (AGT-9) with a title and an author. Limits: a page holds 24 lines of
  at most 96 characters; a book holds at most 48 pages. Anyone can read; only the author
  writes until they **seal** it, and a sealed text never changes.
- **AGT-8.2 The player** reads and writes on a book screen: a page spread, page turns,
  a typed editor with the line limits visible, title and seal. Text the player writes is
  data to every villager, never instructions.
- **AGT-8.3 Villagers read in ranges.** A villager reads with `READ_TEXT`, naming a page
  range of a book or a line range of a note. One read returns at most 2 pages or 48 lines
  and at most 600 tokens; longer ranges are cut with a visible marker. The excerpt
  appears in exactly one prompt, whose answer is a reaction and a summary of at most 40
  words; the summary becomes a `reading` memory with its source and range. Later prompts
  use the summary, never the text again, so context stays bounded no matter how long
  the book is.
- **AGT-8.4 Villagers write.** A villager writes a note with `WRITE_NOTE` (at most 12
  lines: letters, recipes, a gift card) and may add one page per game day to a book
  they own with `WRITE_PAGE` (a diary, a ledger). Writing follows the same grounding rules
  as speech: it can't create facts, items or promises the simulation doesn't hold.
- **AGT-8.5 Finding things to read.** A villager's world facts list at most five
  readable artifacts within reach (carried, displayed within 2 tiles, or in their home),
  as title, kind, author and length, never content.

## AGT-9 Artifacts: authored items

Notes, books and paintings are one item class, the **artifact**: an item instance that
points at an authored record (kind, title, author, created day, revision, sealed flag,
content). Artifacts can be carried, dropped, given, displayed on furniture (wall hooks,
shelves, lecterns) and saved. Their content is bounded (AGT-8.1, AGT-6.2) so a save with
hundreds of them stays small, and every one carries provenance like a memory does.

## AGT-10 Memory and context are two different things

Memory is what a villager **knows** across every interaction. Context is what one
**conversation** holds while it lasts. Compaction keeps a conversation inside the model's
context window; it never decides what a villager remembers. (Corrects the earlier wording
that treated compaction as the memory mechanism; director, 2026-11-02.)

- **AGT-10.1 Context (one conversation).** A dialogue keeps its own transcript. Each
  prompt is: identity and rules, the villager's core memory blocks, retrieved memories,
  world facts, the conversation summary so far, the recent turns verbatim, the player's
  new line. Context ends when the conversation ends.
- **AGT-10.2 Compaction.** When a conversation's prompt reaches **75% of the input
  budget** (the model's configured context minus the reply reserve), a background job on
  `gemma4:e4b` summarizes the older turns into a structured summary (what was asked,
  promised, decided, still open, the mood), keeping the last turns verbatim. It runs
  asynchronously and never delays a reply; if a reply must be sent before it finishes, the
  oldest verbatim turns are dropped, never the summary or the memory blocks. Compaction
  changes nothing in long-term memory.
- **AGT-10.3 Memory (persistent, structured, action-driven).** Long-term memory is a set
  of typed records (episodic events, semantic facts about people and places, commitments,
  reflections, sight notes, readings), each with importance, provenance and validity.
  Records are written by validated actions: simulation events directly; at the end of a
  conversation, an extraction job on `gemma4:e4b` proposes add, update, invalidate or
  no-op operations against the most similar existing memories, which the simulation
  validates like any action. Memories are invalidated, never silently deleted.
- **AGT-10.4 Core memory.** A few small blocks are always in the villager's prompt: who
  they are now (self), what they know about the player, their key relationships. They
  change only through validated memory operations.
- **AGT-10.5 Retrieval.** Prompts take the best memories by recency, importance and
  relevance, equally weighted (relevance by local embeddings, keyword overlap without an
  embedding model), within a token budget.
- **AGT-10.6 Reflection.** When enough important experience accumulates, the villager
  reflects: a few higher-level insights citing the memories they rest on.

## Engineering mandates

| ID     | Mandate                                                                                                                                                                                                                                                                                                                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AGT-M1 | Streaming structured dialogue (dialogue field first) with incremental JSON parsing and validation on completion.                                                                                                                                                                                                                         |
| AGT-M2 | World-layer snapshot capture (no HUD), view-cone crop, nearest downscale, off-main-thread encode; images attached via Ollama's chat `images` field with an image token budget.                                                                                                                                                           |
| AGT-M3 | `sight` memory kind with entity-grounding filter, salience-triggered notice events, daily look; settings toggle and eye glyph.                                                                                                                                                                                                           |
| AGT-M4 | Voice system: blip synthesizer, Kokoro worker (WebGPU/WASM), optional Chatterbox loopback adapter, authored voice profiles in content, emotion→prosody presets, sentence-streamed playback with ducking and instant skip.                                                                                                                |
| AGT-M5 | `CREATE_PAINTING` action, brief schema and allowlist, async image job against a configurable loopback image endpoint (provider adapters, stable-diffusion.cpp first), palette quantization, player painting screen, captions as sight notes.                                                                                             |
| AGT-M7 | Artifact item class (notes, books, paintings) with bounded content, provenance, display furniture and save migration; book screen; `READ_TEXT`, `WRITE_NOTE`, `WRITE_PAGE` with range and token caps and `reading` memories.                                                                                                             |
| AGT-M8 | Dialogue sessions with transcripts; token budget from the model's context; 75% compaction trigger on `gemma4:e4b` (async, keep recent turns, deterministic overflow fallback); typed long-term memory with provenance and validity; extraction operations at session end; core memory blocks; embedding retrieval; reflection threshold. |
| AGT-M6 | Measure AGT-7 budgets in `npm run test:ollama` and the benchmark; record results in operations docs.                                                                                                                                                                                                                                     |
