# 07 — Life sim

Stardew Valley (REF-4) and Fields of Mistria (REF-12) set the bar for belonging:
learnable routines, meaningful gifts, festivals and relationships that become the
long-term progression. Hearthwild's twist is the agentic villagers: LLM-voiced,
grounded by the deterministic simulation (existing rules). Authored structure
gives shape; the model gives voice.

## LIF-1 Villagers are people with routines

- **LIF-1.1** Every villager has a weekly schedule (existing), a role, a
  workplace and favourite spots. Players should be able to predict where to find
  someone after a week of play.
- **LIF-1.2** Villagers react visibly to weather, time of day, festivals and
  recent events (expression decals, ART-8; idle variants; schedule overrides).

## LIF-2 Hearts

- **LIF-2.1** 10 hearts per villager. Gains: daily conversation (small, once per
  day), gifts (LIF-3), finishing their requests, attending festivals together,
  heart events. Losses: assaults (existing nonlethal rule), disliked gifts,
  broken commitments.
- **LIF-2.2** Heart tiers unlock deeper dialogue topics, heart events (LIF-5),
  favours (discounts, recipes, guidance to rare creatures) and, at 8+ hearts,
  daily small gifts back from the villager.
- **LIF-2.3** The existing affinity system is the substrate. Hearts are its
  player-facing presentation, in fixed 10% steps.

## LIF-3 Gifts

- **LIF-3.1** Each villager has a gift taste table: **loved, liked, neutral,
  disliked, hated**, authored from their role, background and beliefs (a
  wetland herbalist loves rare reeds; a glassworker loves fine sand).
- **LIF-3.2** One gift per villager per day; birthday gifts count ×4.
- **LIF-3.3** Taste discovery: the journal records a taste the first time the
  player observes a reaction (or hears it in gossip), shown as an expression
  change plus a short line.
- **LIF-3.4** The two-hand inventory rule stands: gifting hands over a carried
  item.

## LIF-4 Calendar and festivals

- **LIF-4.1** Four seasons of 7 days (existing) make a 28-day year. Each
  villager has a birthday on the calendar.
- **LIF-4.2** One festival per season, hosted by rotating villages:
  - **Spring — Reedlight Float (Aqualia):** lantern boats on the canals at dusk.
  - **Summer — Kiln Fair (Pyrador):** glass and forge contests.
  - **Autumn — Kite Moon (Zephyria):** kite races on the windy cliffs.
  - **Winter — Hearth Night (all villages):** shared meal and gift exchange.
- **LIF-4.3** A festival is a set-piece day: special schedules, decorations
  (environment extra IDs), a mini-activity, and a heart bonus for attending with
  a villager.

## LIF-5 Heart events

- **LIF-5.1** Each villager has heart events at 2, 4, 6, 8 and 10 hearts:
  **authored skeletons** (location, participants, beats, outcome) voiced by
  the local model within grounded constraints (existing proposal and commit
  rules).
- **LIF-5.2** A heart event can change a villager's schedule, unlock a recipe
  or reveal backstory, but it never creates items or world facts outside the
  validation rules.

## LIF-6 Daily rhythm hooks

Morning (care, chores), midday (errands, village life), afternoon (expedition),
evening (meal, social, festival), night (rest, journal). Shops and services keep
hours that match schedules.

## Engineering mandates

| ID | Mandate |
| --- | --- |
| LIF-M1 | Heart presentation (10 steps) over the existing affinity values. |
| LIF-M2 | Per-villager gift taste tables in content data, plus journal discovery records. |
| LIF-M3 | Birthday and festival calendar entries, with festival schedule overrides. |
| LIF-M4 | Heart-event skeleton format with grounding validation. |
| LIF-M5 | Expression tags on villager reactions (feeds the ART-8 face layer). |
