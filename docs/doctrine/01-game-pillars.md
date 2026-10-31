# 01 — Game pillars

## PIL-1 Player fantasy

> *"I arrive in a canal village at dawn, befriend a river spirit, learn every
> neighbour's name and habits, and grow strong enough to protect a living
> wilderness that remembers what I do."*

Hearthwild is a cozy-but-dangerous action RPG life sim. Every system serves one
promise: **a small world that feels alive, that you belong to, and that is worth
defending.**

## PIL-2 The four pillars

| ID | Pillar | Primary reference | Means in practice |
| --- | --- | --- | --- |
| PIL-2.1 | **A village that breathes** | No Name Village, Eastward | Ambient life on every screen, light that changes with the hour, sound that tells you where you are. Nothing on screen is perfectly still for long (AMB). |
| PIL-2.2 | **Combat with weight and clarity** | Zenonia 4, CrossCode, Hyper Light Drifter | Snappy combos, readable telegraphs, hit-stop, elemental reactions on terrain. Every hit is felt; every enemy attack is fair (CMB). |
| PIL-2.3 | **Creatures worth knowing** | Pokémon, Coromon, Cassette Beasts | Stats, temperaments, moves and growth deep enough for theorycrafting, but driven by *care*, not grinding (CRE). |
| PIL-2.4 | **Belonging through routine** | Stardew Valley, Fields of Mistria | Schedules, gifts, festivals and remembered conversations. Your relationships are the long-term progression (LIF). |

When pillars conflict, resolve them in this order: **readability → belonging →
weight → depth.** A beautiful effect that hides an enemy telegraph is wrong. A
deep stat that makes caring for a creature feel like spreadsheet work is wrong.

## PIL-3 Core loops

- **PIL-3.1 Moment (seconds):** move, gather, strike, dash, react to an
  element on terrain. Feedback within 100 ms of every input (CMB-6).
- **PIL-3.2 Day (one 24-minute game day):** morning chores and care → village
  errands and conversations → expedition into the wilds → evening meal, rest,
  journal. Each day ends with something remembered: a gift given, a creature fed,
  a villager's new memory.
- **PIL-3.3 Season (7 days):** one festival (LIF-4), seasonal resources and
  creature behaviour, one villager heart event available per relationship tier.
- **PIL-3.4 Bond (many seasons):** partner creature growth and ascension
  (CRE-6), heart levels with villagers (LIF-2), origin skill-tree mastery (CMB-5).

## PIL-4 Tone

Warm, earnest, gently funny, never cynical. Danger is real (wildlife hunts,
neglect breaks bonds) but cruelty is never the point. Villagers are competent
adults with their own concerns (ages 19–63; no children in the current cast),
written to be liked.

## PIL-5 Scope tiers

| Tier | Contents | Exit criterion |
| --- | --- | --- |
| **T0 Aqualia slice** | Player Aqualia, 10 Aqualia villagers, 8 species, Aqualia village and riverlands, combat, care, two-hand crafting, HUD | Director approves golden samples (PRD-4), then the full slice clip matrix at doctrine quality |
| **T1 Vertical** | Pyrador and Zephyria at slice quality, three origins, festivals, heart events, skill trees | Director plays a full season with no placeholder art on screen |
| **T2 Content** | More species, outposts at full quality, crafting depth, ascension | Content-complete milestone defined later by the director |

No work on T1 art starts until T0 golden samples are approved.

## Engineering mandates

| ID | Mandate |
| --- | --- |
| PIL-M1 | Every interactive verb (strike, gather, talk, pet, feed) produces visible and audible feedback within 100 ms of input. |
| PIL-M2 | The 24-minute day carries four lighting/audio phases (dawn, day, dusk, night) that ambience can key off (AMB-3). |
| PIL-M3 | Systems expose the hooks LIF, CRE and CMB need (relationship events, care events, combat events) as presentation cues, not as UI-owned state. |
