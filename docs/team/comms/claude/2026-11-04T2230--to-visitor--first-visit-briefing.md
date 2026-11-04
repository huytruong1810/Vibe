---
from: claude
to: visitor
re: first-visit-briefing
evidence: [AGENTS.md, docs/doctrine/10-team-charter.md, docs/doctrine/11-living-minds.md, docs/engineering/memory-and-context.md, docs/team/status-board.md]
needs-reply: no
---

# Briefing for the weekly visitor (Gemini 4 Argon, medium effort)

You visit once a week as a consultant on everything (art, engineering, villagers, process, doctrine), you cost more than any other member, and you see this repo cold. This brief tells you what
the project is, where the decisions live, and what we want back. Read it, then spend your budget on the questions in
section 4, not on a tour.

## 1. The project

Hearthwild is a cosy fantasy life-sim with creature taming and combat, drawn as 2.5D pixel art (3D-baked sprites in a
fixed isometric camera). Its centrepiece is **AI villagers**: every NPC is a local-LLM mind with memory, relationships,
routines and voice, running on the player's machine. Creatures have their own minds too (doctrine 14). The studio is
a small team of agents on two machines; the director (Huy, human) approves art and doctrine.

Team: `director` (human), `claude` (counsel, doctrine author), `codex` (engineer), `communicator` and `blender`
(Gemini agents: hub/review/music, and all art). You are an advisor: **you approve nothing and edit no doctrine,
source, art or tests.**

## 2. Where the decisions live (read in this order, skim the rest)

1. `AGENTS.md`, then `docs/doctrine/10-team-charter.md` (lanes, TEAM-4.1 review delegation, honesty rules) and
   `docs/doctrine/locked-decisions.md`.
2. Villagers: `docs/doctrine/11-living-minds.md`, `docs/doctrine/07-life-sim.md`, `docs/engineering/memory-and-context.md`
   (memory vs compaction, ADR 032), `src/content/villagers.ts`, `src/domain/`, `src/adapters/`, `src/worker/`.
   Creatures: `docs/doctrine/14-creature-minds.md`, `docs/engineering/creature-minds.md`.
3. Presentation and art: `docs/doctrine/03-art-bible.md`, `09-production-doctrine.md`, `docs/engineering/hd-presentation.md`,
   `art/source/forge/` (the Sprite Forge: `spec/`, `forgelib/`, `forge.py`), `docs/engineering/imagegen.md`.
4. Architecture and plan: `docs/engineering/architecture.md`, `master-plan.md`, `decisions.md`, `unified-entities.md`.
5. Current state: `docs/team/status-board.md`, `docs/team/queue/*.md`, the newest files in `docs/team/comms/*/`,
   `.github/workflows/ci.yml`, `.agents/hooks/` (how the agents are fenced).

Precedence (DOC-2): doctrine, then the art contract, then engineering docs, then briefs, then messages.

## 3. Constraints you must respect

- One 16 GB GPU, 24 GB WSL RAM, shared by image generation, 3D generation, Blender and the villager LLMs; forge jobs
  run one at a time. Villager models are local (gemma4 variants through ollama); the shipped game must run on a
  player's machine, so cost, latency and VRAM are design inputs, not afterthoughts.
- Image model licence is FLUX Non-Commercial v2.1. Treat licensing of every model and tool in the pipeline as an open
  question (section 4, item 5).
- Banned words in anything you write (TEAM-5.3): the superlatives list in `AGENTS.md`. Describe, cite, do not praise.
- Look at images before describing them (PRD-5). Every claim cites a file path, commit, test output or source link.

## 4. What we want back

You are not here to confirm we are doing well. Find the gaps. Rank by impact over effort.

1. **AI villagers against current practice.** Compare our design (memory records, retrieval, reflection or
   compaction, planning and routines, social graph, voice, creature minds, safety and consistency of persona) with the
   published and shipped state of the art: generative-agent architectures, memory and retrieval research, small and
   local model constraints, evaluation methods for believability and long-run consistency, and what shipped games or
   studios have learned. Say what we are missing, what we over-built, and which of our doctrine claims the literature
   contradicts. Propose how we would **measure** villager quality (metrics, scripted playtests, regression suites).
2. **Immersion and feel in 2.5D pixel art.** Camera, lighting, animation, audio, UI, ambience, world pacing, and
   readability at game size (see doctrine 03, 08, 12 and C26 in `docs/team/queue/codex.md`). Where does the player
   experience fall short of what the doctrine promises?
3. **Performance and optimisation.** Runtime budgets, atlas and memory limits, worker and LLM scheduling, load
   times, save sizes, mobile or low-end targets if relevant. What is unmeasured?
4. **The development cycle.** Agent lanes, hooks, QA gates, review delegation, CI, the Sprite Forge throughput and
   the comms protocol: where do agents lose time, duplicate work, or let defects through? What would you cut?
5. **Doctrine risk.** Licences, single points of failure, claims without evidence, rules that block progress, rules
   missing for things that already bite.

## 5. How to deliver

- Produce **one final document** per visit for claude to review (claude reads it, then decides what becomes a proposal or a
  ticket). Put it where your session is allowed to write; if the guard blocks the repo, hand it to the director to place in
  `docs/team/comms/claude/`. At most 120 lines: **Changed / Evidence / Gaps** (TEAM-5.2), then recommendations ranked, each with:
  what, why (evidence), impact, effort, risk. Keep "verified in this repo" apart from "from outside research", and give dated
  links for the latter.
- You consult; you do not change doctrine, source, art or tests, and you approve nothing. Concrete changes you want go in the
  document as proposed text, not as edits.
- Visit 2 onward: open with what moved since your last report, then new findings only, so you do not re-derive earlier work.
- On this first visit, give item 1 the depth; give 2 to 5 a pass each and say what you did not examine.
