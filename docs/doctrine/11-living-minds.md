# 11 — Living minds

Hearthwild's villagers are local-LLM agents grounded by a deterministic simulation:
memory with provenance, reflection, daily schedules, structured JSON actions, auto-
compaction, and emotions that drive portraits and poses. This is a headline feature. It
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
- **AGT-1.3** One model serves dialogue, planning, reflection, compaction and sight
  (AGT-3), so VRAM holds one resident model. Other models (TTS, image) must fit
  around it (AGT-4, AGT-6).

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

- **AGT-6.1** Villagers with artistic roles (Lark, the wetland painter, first) can create a
  **painting**, a decorative item class, through a new validated action `CREATE_PAINTING`.
  The subject comes from their memories and sight notes ("the ferry at dusk", "Rivallie by
  the reeds").
- **AGT-6.2 Pipeline (asynchronous, never real time).** The LLM writes a structured brief
  (title, subject, palette mood, composition). A local image model renders it at low
  resolution. A deterministic post-process downsamples to 48×32 art px, quantizes to the
  doctrine palette (at most 16 colours), and adds a frame. The result becomes an item with
  provenance (painter, day, title, brief).
- **AGT-6.3 Scheduling.** It runs only when no dialogue is active and the GPU is free:
  during sleep acceleration or pause, with the LLM unloaded if VRAM requires it. One
  painting per painter per game day. While work is pending the item shows "in progress".
- **AGT-6.4 Platform reality.** Ollama's image generation is experimental and was
  macOS-first when this doctrine was written. Until it ships on Windows and Linux, the
  engine supports a configurable loopback image endpoint and degrades gracefully: no
  endpoint means no paintings, never a broken game.
- **AGT-6.5 Content rules.** Allowed subjects are landscapes, creatures, objects and
  villagers (portrait requests pass through the subject's affinity). No text in images,
  no real-world people or brands. A brief that fails the allowlist is rejected with a
  receipt.

## AGT-7 Performance budgets (reference machine: RTX 5080 laptop, `gemma4:26b`)

| Path                                                                    | Budget                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------- |
| Dialogue: player sends → first streamed token                           | ≤ 2.0 s warm                                       |
| Dialogue: player sends → first voiced audio (Spoken tier)               | ≤ 3.0 s                                            |
| Dialogue with sight (first turn)                                        | ≤ +1.5 s over text-only                            |
| Background jobs                                                         | Never delay or block a dialogue (preemption stays) |
| Main thread cost of AI subsystems (capture, chunking, audio scheduling) | ≤ 1 ms per frame average                           |
| TTS on main thread                                                      | 0 (worker only)                                    |

These are product targets measured by the smoke and benchmark scripts. Missing one is a
bug to fix or a tier to downgrade, never a reason to block the game.

## Engineering mandates

| ID     | Mandate                                                                                                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AGT-M1 | Streaming structured dialogue (dialogue field first) with incremental JSON parsing and validation on completion.                                                                                                          |
| AGT-M2 | World-layer snapshot capture (no HUD), view-cone crop, nearest downscale, off-main-thread encode; images attached via Ollama's chat `images` field with an image token budget.                                            |
| AGT-M3 | `sight` memory kind with entity-grounding filter, salience-triggered notice events, daily look; settings toggle and eye glyph.                                                                                            |
| AGT-M4 | Voice system: blip synthesizer, Kokoro worker (WebGPU/WASM), optional Chatterbox loopback adapter, authored voice profiles in content, emotion→prosody presets, sentence-streamed playback with ducking and instant skip. |
| AGT-M5 | `CREATE_PAINTING` action, brief schema and allowlist, async image job against a configurable loopback endpoint, palette quantization, painting item class with provenance and persistence.                                |
| AGT-M6 | Measure AGT-7 budgets in `npm run test:ollama` and the benchmark; record results in operations docs.                                                                                                                      |
