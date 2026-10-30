# Hearthwild

A single-player, top-down pixel world with terrain height, three elemental villages, six outposts, 30 villagers, and 1,000 persistent creatures. Local language models propose villager dialogue and plans; a deterministic simulation validates and executes them.

This is a runnable reference game with original code-drawn placeholder art and representative content. It is also the implementation companion to the [master plan](docs/master_plan.md).

## Run locally

Requires Node **22.12 or newer**, a desktop browser with WebGL, and [Ollama](https://ollama.com/). All application assets are local; inference stays on your machine.

```sh
npm ci
ollama pull qwen2.5:3b
npm run dev
```

Open the URL printed by Vite, normally **http://127.0.0.1:5173**. Start Ollama if it is not running. Choose **Find models**, select an installed model, pick an origin, and connect. The selected model must pass a real structured-output check before starting or resuming a session. Models are never installed automatically.

If the browser reports a cross-origin failure, add the exact development origin to `OLLAMA_ORIGINS` and restart Ollama. For example, set `OLLAMA_ORIGINS=http://127.0.0.1:5173` in the environment used by Ollama. This setting belongs to **the Ollama server**, not Vite. A hosted build may also require browser permission for loopback access. See [local AI setup](docs/operations.md).

```powershell
# Windows: set for the current terminal, then start the server there.
# Quit an already running Ollama tray application first if it owns port 11434.
$env:OLLAMA_ORIGINS = 'http://127.0.0.1:5173'
ollama serve
```

The default model is a candidate, not a throughput guarantee. A smaller model can still be too slow on a given machine. Use the included smoke test and benchmark before changing budgets.

## Play

| Control            | Action                                           |
| ------------------ | ------------------------------------------------ |
| WASD / arrows      | Move                                             |
| E                  | Talk to a nearby villager, otherwise gather      |
| R                  | Gather directly, even near a villager            |
| C / Combine button | Combine the two carried items                    |
| Q                  | Swap hands                                       |
| 1 / 2              | Use the item in that hand                        |
| J                  | Physical strike                                  |
| K                  | Origin elemental attack and terrain reaction     |
| Space              | Stamina dash with a short invulnerability window |
| M                  | World map and settlement waystones               |
| Escape             | Settings; close an open dialog                   |
| Click a creature   | Inspect and open care actions                    |

Begin in Aqualia for an easy first journey:

1. Talk to a nearby villager. Ask for a walk or supplies. Proposed effects wait until you close the conversation.
2. Gather the flint and hardwood east of the square. Combine them, then add reed fiber to finish a hatchet. The field journal lists every recipe.
3. Inspect a nearby Rivallie. Offer reeds, spring water, and a gentle pet; then form a partnership. Gather water beside the village well.
4. Keep your companion fed, hydrated, clean, rested, and entertained. Good care reduces wildness; neglect can break a bond.
5. Challenge an eligible villager through dialogue, or strike a wild creature. Humans and bonded partners recover; killed unbonded wildlife leaves finite carrion. Agreed village partner duels are limited to once per absolute day.
6. Use a waystone near a settlement center to visit the other villages and outposts. Roads also connect the entire world.
7. Save manually or let the 30-second autosave checkpoint committed state. Export a JSON save before clearing browser storage.

There are exactly two carried items, no item stacks, and no hidden equipment inventory. Clothing/origin bonuses are passive. Basic attacks are innate.

## Verification

```sh
npm run check             # Types, dependency boundary check, unit/integration tests, build
npm run test:browser      # Real browser journeys with a mocked loopback model
npm run benchmark        # 30 villagers / 1,000 creatures; writes artifacts/benchmark.json
npm run soak             # 28 days, 1,209,600 full simulation ticks; writes artifacts/soak.json
npm run test:ollama -- qwen2.5:3b  # Real installed model; never downloads one
npm run format:check
```

On Windows, browser tests use installed Google Chrome. On other systems, run `npx playwright install chromium` first. Set `PLAYWRIGHT_CHANNEL` to use another installed channel such as `msedge`. Browser tests do not need an installed model; the real-model smoke test does.

The checked-in lockfile is the dependency source of truth. `.npmrc` uses the legacy peer resolver to avoid an npm 10 optional-peer resolver crash observed during setup; the installed combination is typechecked and exercised in the browser.

## Architecture and documentation

- [Architecture, ownership, patterns, and public contracts](docs/architecture.md)
- [Unified entities, sleep, Nature, predation and save-v3 compatibility](docs/unified_entities.md)
- [Master roadmap and corrected game rules](docs/master_plan.md)
- [Foundation, clocks, persistence, and lifecycle](docs/foundation.md)
- [Phase 1 — world and rendering](docs/phases/01-world.md)
- [Phase 2 — resources and reactions](docs/phases/02-environment.md)
- [Phase 3 — calendar, herds, and simulation tiers](docs/phases/03-ecology.md)
- [Phase 4 — care, needs, and partnerships](docs/phases/04-creatures.md)
- [Phase 5 — inventory, settlements, and schedules](docs/phases/05-settlements.md)
- [Phase 6 — agentic villagers and memory](docs/phases/06-agents.md)
- [Phase 7 — combat and progression](docs/phases/07-combat.md)
- [Phase 8 — weather, lighting, audio, and UI](docs/phases/08-presentation.md)
- [Decision records](docs/decisions.md), [operations](docs/operations.md), and [verification results](docs/verification.md)

The source files are complete reference implementations, not documentation pseudocode. The phase documents describe the same modules and their tests. Extend data definitions for new content; keep simulation code free of rendering, storage, and network dependencies.

## Reference-game boundaries

The world has one traversable height surface per tile, not stacked floors or a 3D physics engine. Protected recovery, bounded new wildlife births and habitat regrowth make ecology recoverable rather than an attempt at biological realism. Navigation and distant herd steering are bounded approximations. LLM summaries and character statements can be imperfect; they never authoritatively create world facts or completed commitments.

Placeholder art, synthesized audio, schedules, and eight nonhuman species are included. Production art, extensive authored stories, mobile controls, hosted inference, multiplayer, and a backend are outside this reference implementation.

All 1,031 initial actors share health, elemental affinity, five needs and combat rules. The needs panel offers finite settlement meals, spring water, washing, Rest and safe 8× sleep. Villager inspection shows the same meters. Wildlife hunts according to diet and hunger; humans and bonded companions cannot be consumed. Player assaults on villagers are nonlethal, remembered and grant no XP. Existing v2 saves migrate to v3 without regenerating terrain or replacing their populations.
