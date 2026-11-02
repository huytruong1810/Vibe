# Creature minds: engineering specification (CRM)

Status: specification, 2026-11-02 (claude, on the director's request). Doctrine:
`docs/doctrine/14-creature-minds.md` (CRM-1…CRM-10), `05-combat-direction.md` (CMB-3,
CMB-4, CMB-7), `06-creatures-and-progression.md` (CRE). Implementation: codex C14
(director and telegraphs), C13 (movement, perception, intents, scripted brain), C15–C16
(learned brain, gated). ADR 033.

Goal: fights that read like meeting animals (notice, stalk, commit, break) and stay fair
(one or two clear threats at a time), at a cost that lets 150 creatures fight on a laptop
CPU with the simulation deterministic and replayable.

## 1. As built today (what this replaces and what it keeps)

| Concern       | Today                                                                                                                                                                                                                                     | Keep / change                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Everyday life | `CreatureDecisionSystem.decide` (`src/domain/creatures.ts:175`): needs-urgency utility over Wander/Feed/Drink/Bathe/Socialize with 0.08 hysteresis and a 4 s commitment; resource reservation; navigation requests                        | **Keep** (CRM-1.4). It owns calm creatures.                                      |
| Herds         | `SteeringSystem` boids (separation 0.7, alignment 0.08, cohesion 0.04 within 4 tiles); `HerdController` herd goals, 8 decisions/s                                                                                                         | **Keep**; weights become per species (§6.1).                                     |
| Detail tiers  | `SimulationTierManager`: nearest 128 (`CONFIG.detailedCreatures`) get full updates                                                                                                                                                        | **Extend** with an engaged tier (§9).                                            |
| Engagement    | `CombatSystem` (`src/domain/combat.ts:395`): hungry predators hunt within 6 tiles (food < 0.40 latch until > 0.80, reservations, failed-hunt cooldown); `NaturePolicy` aggression radius → territory pursuit; retaliate or avoid when hit | **Keep** as the _reasons_ a creature becomes alert (§3).                         |
| Fighting      | `CombatSystem.advance` (`combat.ts:546`, ~:640): run straight at the target, attack whenever in range, off cooldown and with stamina; `avoid` natures run straight away                                                                   | **Replace** with intents executed by movement and gated by the director (§5–§7). |
| Moves         | `ATTACKS` strike 4/2/9, element 7/3/16 ticks; `CREATURE_MOVES[species]` power, cooldown, range, periodic defense window                                                                                                                   | **Keep**; the periodic defense becomes the `guard` intent (§5).                  |
| Telegraphs    | None in code (CMB-4 unimplemented)                                                                                                                                                                                                        | **Add** (§7.3).                                                                  |
| Cost          | `npm run benchmark` active combat, 128 actors: 1.04 ms mean, 2.95 ms p95 per tick                                                                                                                                                         | Budget below (§9).                                                               |

## 2. Per-tick pipeline (30 Hz, deterministic order)

1. Perception grid rebuild (§4), once per tick for the loaded scene.
2. Engagement update (§3): calm → alert transitions from events and perception.
3. Director (§7): release finished tokens, grant tokens for this tick.
4. Brain decisions for creatures whose `nextDecisionTick ≤ tick` (§5, §6), staggered.
5. Intent execution (§5.3) → desired velocity; movement layer (§8) → positions.
6. Attack resolution (existing `CombatSystem` timing, telegraphs, damage).

Hot-loop rules: no allocation per tick (preallocated `Float32Array`/`Int32Array` buffers,
no closures, no `Map`/string keys in the loop), integer entity order for ties, seeded
`SeededRandom` streams per creature for jitter, so a save, seed and input sequence replay
to identical decisions (CRM-7.1).

## 3. Engagement state machine (CRM-1.4)

`engage[i]: Uint8` = `calm | alert | engaged | disengaging`, with `engageSince[i]`.

- **calm → alert** when, within the species' notice radius and the creature's facing
  cone (±110°; full circle within 2 tiles): a threat it dislikes (NaturePolicy aggression,
  a predator of its species, the player if hostile), prey it is hunting (existing latch),
  an attacker (damage event), a partner command, or a pack call from its herd.
- **alert** plays the _notice_ beat (CRM-10.1): 6–12 ticks (deterministic per creature)
  facing the source in `guard`/`idle`, then the brain runs.
- **engaged** once it holds a target intent other than `hold`/`flee`.
- **disengaging** when no threat is perceived for 3 s, or the target leaves the species'
  leash (home range radius + 6 tiles), or prey escapes beyond 1.5× notice radius; 2 s of
  `retreat` toward home or herd, then **calm** (utility system resumes).
- Calm creatures never run the brain; that is most of the 1,031 living entities.

## 4. Perception (allocation-free)

Replace per-query `SpatialIndex` string keys and array allocation in the hot path with a
`PerceptionGrid`: integer cell keys (`scene * cellsPerScene + cy * cols + cx`), cell
heads/next arrays (counting sort into an `Int32Array`), rebuilt each tick for actors in
loaded scenes (O(n)). `nearest(i, radius, filter, k, out: Int32Array)` writes up to k ids
into a caller buffer with partial selection by squared distance (k ≤ 8). The existing
`SpatialIndex` API stays for other callers.

No line-of-sight raycasts in v1 (cost and sprite readability); reeds and deep water
(`Habitat` or terrain flags) reduce how far a creature _is seen_ (×0.5), which is what
makes ambushers work.

## 5. Brain contract: observation and intent (versioned schema `crm-obs-1`)

### 5.1 Observation (`Float32Array(64)`, values normalized to about −1…1)

| Slice                       | Floats | Contents                                                                                                                                                              |
| --------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Self                        | 12     | hp fraction, stamina, strike cooldown, element cooldown, move phase one-hot (idle/windup/active/recovery), medium one-hot (land/water/air), elevation delta to target |
| Threats (×3 nearest)        | 3×8    | relative x/y (tiles/8), relative velocity x/y, hp fraction, telegraphing (0/1), telegraph phase progress, is-player                                                   |
| Allies (×2 nearest of herd) | 2×5    | relative x/y, hp fraction, engaged (0/1), holds token (0/1)                                                                                                           |
| Prey (nearest)              | 5      | relative x/y, relative velocity x/y, hp fraction                                                                                                                      |
| Surroundings                | 6      | herd centroid x/y, safe medium direction x/y (water/lava/reeds), home direction x/y                                                                                   |
| History and memory          | 4      | ticks since hit, ticks since last hit landed, 2 memory counters (CRM-7.2: player dash-side bias, player element use)                                                  |
| Commands and context        | 3      | partner command (none/focus/regroup), token granted (0/1), director pressure (attackers active / allowed)                                                             |

Missing entities are zeros with a presence bit folded into hp (−1). Species, template,
temperament and level are **not** in this vector: the scripted brain reads them from
content tables, the learned brain receives them as a separate conditioning vector
(`crm-cond-1`: species one-hot 8, template one-hot 4, temperament one-hot 15, level, bond,
partner flag), so the observation stays identical across species.

### 5.2 Intents and masking

`hold, approach, flankLeft, flankRight, retreat, flee, strike, element, guard, dash,
callPack, follow` (CRM-3.3). Mask before choosing: `strike`/`element` without a director
token for that target or on cooldown or out of stamina; `element` for species without one;
`callPack` without herd members within 12 tiles or within 10 s of the last call; `follow`
unless partner; `dash` without stamina for it; `flank*` for non-pack species with
`flankBias = 0`. Output: intent, target id (one of the observed entities), and for the
learned brain an optional flocking-weight adjustment in [−0.3, 0.3].

### 5.3 Intent execution (movement layer, every tick)

| Intent           | Movement                                                                                 | Clip (C3h)                       | Notes                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| hold             | face target; drift with herd                                                             | `idle` (calm) / `guard` (alert)  | the stalking freeze                                                    |
| approach         | intercept: aim at target pos + vel × lead (lead = dist/speed, capped 1 s)                | `walk` far, `run` within 6 tiles | stops at readiness ring if no token                                    |
| flankLeft/Right  | orbit target at ring radius toward ±70° from the target's facing, then close             | `run`                            | pack tactic                                                            |
| retreat          | back off to ring radius + 1, keep facing target                                          | `walk` (facing target)           | reads as wary, not fleeing                                             |
| flee             | evade: away from the threat-weighted centroid, biased to safe medium; 1.2× speed for 2 s | `run`                            | prey and breaking morale                                               |
| strike / element | close to move range, then start the attack (existing timing)                             | `strike` / `element`             | only with a token                                                      |
| guard            | stand, face target; 0.5 damage taken while active (replaces periodic `defensePeriod`)    | `guard`                          | steamshell/mireling lean on it                                         |
| dash             | burst 2× speed for 6 ticks along the chosen side or away                                 | `run`                            | dodge a telegraph                                                      |
| callPack         | stop, face herd                                                                          | `social`                         | herd members in 12 tiles get the call (→ alert), cohesion ×1.5 for 4 s |
| follow           | partner formation behind-left of the player                                              | `walk`/`run`                     | CMB-7                                                                  |

The readiness ring radius is per species: `max(moveRange + 1.5, kiteRange)` tiles.

## 6. Scripted utility brain (ships; teacher for imitation)

### 6.1 Species tactics (content table `CREATURE_TACTICS`, all 8 species)

| Species      | aggression | caution | packness | flankBias | kiteRange | guardBias | elementBias | fleeAt | safe medium / ambush  |
| ------------ | ---------- | ------- | -------- | --------- | --------- | --------- | ----------- | ------ | --------------------- |
| rivallie     | 0.4        | 0.6     | 0.3      | 0.2       | 0         | 0.3       | 0.5         | 0.30   | water / —             |
| bramblefang  | 0.8        | 0.2     | 0.9      | 0.9       | 0         | 0.1       | 0.2         | 0.20   | — / —                 |
| marshstalker | 0.7        | 0.4     | 0.3      | 0.5       | 0         | 0.2       | 0.3         | 0.25   | water / reeds at dusk |
| mireling     | 0.3        | 0.3     | 0.4      | 0.1       | 0         | 0.8       | 0.4         | 0.10   | mud / —               |
| steamshell   | 0.4        | 0.3     | 0.2      | 0.0       | 0         | 0.9       | 0.6         | 0.10   | water / —             |
| zephyrit     | 0.5        | 0.5     | 0.6      | 0.4       | 2.5       | 0.1       | 0.4         | 0.35   | air / —               |
| cindermoth   | 0.4        | 0.5     | 0.4      | 0.2       | 3.5       | 0.1       | 0.8         | 0.35   | air / —               |
| ignicap      | 0.2        | 0.7     | 0.3      | 0.0       | 0         | 0.4       | 0.6         | 0.50   | lava / —              |

Also per species: notice radius (6–10 tiles), leash, and boids weights. Values are starting
points tuned in playtests and pinned by the identity tests (§11), not by feel alone.

### 6.2 Scoring

`score(intent) = Σ consideration(curve(input)) × weight(species tactics)`, the usual
utility-AI form with response curves (linear, quadratic, logistic) per consideration.
Examples:

- `strike` = token × in-range-or-near × aggression × (1 − threat-telegraphing × caution);
- `guard` = threat-telegraphing × guardBias + recently-hit × guardBias × 0.5;
- `dash` = threat-telegraphing × (1 − guardBias) × stamina, aimed to the side away from
  the attack;
- `flank*` = packness × flankBias × (allies engaged ≥ 1) × (no token);
- `flee` = logistic(fleeAt − hp) + (prey-of-threat) × caution;
- `callPack` = packness × (first engagement or a herd member hit) × (not called recently);
- `hold` = baseline 0.15 + no-token × caution (the stalk).

Choose the max over unmasked intents with **hysteresis** (+0.1 to the current intent) and
a minimum commitment of 6 ticks, plus a deterministic per-creature jitter in [0, 0.05] so
packs don't move in lockstep. Reaction time (CRM-3.4): decisions every 3–6 ticks
(`3 + id % 4`), staggered by id; a hit or a newly started telegraph schedules an early
decision 2–4 ticks later (never sooner than 2).

## 7. Combat director (CRM-4, CMB-4)

### 7.1 Tokens

Pools per target: the player (2 melee, 1 ranged/element), the partner (2/1), each villager
in a fight (1/1); wild-versus-wild fights don't use tokens. A token is held from
windup start to recovery end. Grants each tick go to the waiting candidate with the best
`priority = waitTicks / 30 + 0.5 × aggression − 0.1 × distance`, with at least **8 ticks
between grants** on the same target so strikes arrive one after another (staggered
pressure). Creatures off screen (outside a fixed 30 × 17 tile view rectangle around the player: claude's estimate of the 1080p view with 64-px tiles; verify against the renderer's camera and keep it a content constant) never receive a token for the player
(CRM-4.3).

### 7.2 Difficulty knobs (settings → content)

Token counts, reaction delay range, an aggression bias added to every species'
aggression, and the grant spacing. Never a different brain (CRM-4.4).

### 7.3 Telegraphs (implements CMB-4)

Every creature attack whose damage can exceed 15% of the target's max HP sets
`telegraph[i]` from windup start: kind (`ground` arc for melee range, `glint` for
element), facing, range. The presentation draws it (ground marking under the attacker,
in the effect layer, never covered by VFX: CMB-4.3); predators add the crouch-and-shiver
pose on the first windup frames (CMB-4.2). Telegraphs are also observation inputs, so
creatures react to the _player's_ windups too (they guard or dash), and to each other.

## 8. Movement layer changes (CRM-2)

- **Intercept and evade** as in §5.3; flocking weights per species and scaled by intent.
- **Flight** for winged species: `Traversal.air`: crosses water and steps up to 2
  elevation levels, never solid tiles or interiors; altitude is presentation (the C3h
  hover), not a second plane; flyers land (`hoverPx` 0) for eat, drink, bathe and sleep.
- **Home ranges**: from `Habitat` regions once C7 lands; until then, the herd's spawn point
  with a 12-tile radius.
- **Safe medium**: nearest walkable tile of the species' safe medium within 16 tiles,
  cached per herd and refreshed every 2 s.

## 9. Level of detail and budget (CRM-8)

| Tier    | Who                                                           | Brain                                                                    | Rate            |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------- |
| Engaged | alert/engaged creatures within 2 screens (cap 48 by distance) | full scripted (later learned)                                            | every 3–6 ticks |
| Near    | other detailed creatures (≤ 128)                              | calm utility; engaged ones beyond the cap use the scripted brain at 2 Hz | existing        |
| Far     | rest of the loaded region                                     | existing coarse simulation                                               | existing        |

Arithmetic for 150 engaged at the CRM-8.1 limit: ≈ 150 / 4.5 ≈ 33 decisions per tick. A
scripted decision (8-neighbour observation fill + 12 intent scores) targets ≤ 6 µs →
≈ 0.2 ms; execution and movement for 150 ≈ 0.6 ms; director ≈ 0.05 ms. The learned
brain later must fit 33 × inference ≤ 1.0 ms → ≤ 30 µs per forward pass, which a
≤ 32k-parameter float32 MLP meets in plain JS (WASM SIMD if not). The benchmark gains an
`engagedCombat150` case that asserts these numbers on CI.

## 10. Partner, save, tools

- **Partner** (CRM-5, CMB-7): same brain, partner flag; commands `focus` (target id) and
  `regroup`; bond scales how strongly commands override the brain's choice (score bonus
  0.2 at 0 hearts to 0.8 at 8+). HUD intent icon beside the partner portrait.
- **Save**: `engage`, `intent`, `intentTarget`, `intentUntil`, `nextDecisionTick`, token
  holds and memory counters are saved with the creature columns, so a mid-fight save
  replays exactly. Brain version (`crm-obs-1`, scripted rules hash or weights hash) is
  recorded in the save (CRM-7.1).
- **Tools** (CRM-9): debug overlay (intent, target, token, top three scores), an
  observation inspector for one creature, and a per-species scripted/learned switch.

## 11. Tests and evidence

| Area                 | Test                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Determinism          | same seed and inputs → identical intent streams over 3,000 ticks (hash)                                                                  |
| Masking and reaction | unit: masked intents never chosen; early decision never < 2 ticks after a hit or telegraph                                               |
| Director             | 20 hostiles vs the player: never more than the token counts attacking; ≥ 8 ticks between grants; no off-screen grants                    |
| Telegraphs           | every creature attack over 15% max HP has a telegraph from windup tick 0; browser capture looked at (PRD-5)                              |
| Species identity     | one deterministic scenario per CRM-6.4 bullet (all 8 species), asserting the behaviour from intent logs and positions                    |
| Budget               | `engagedCombat150` benchmark within §9 on CI                                                                                             |
| Feel                 | a 1080p capture of a 6-Bramblefang pack fight and a Zephyrit skirmish for the director (notice, stalk, staggered strikes, break visible) |

## 12. Learned brain (C15, C16; gated)

Starts only after the scripted brain ships in a playtested build and the director asks
(CRM-6.1). Then: a headless bridge that runs N deterministic Node simulations as a
vectorized multi-agent environment for PufferLib or CleanRL (binary observation/intent
frames over pipes; versions pinned; Python through `uv`), imitation of the scripted brain,
then PPO with shared parameters and the CRM-6.3 reward; weights as content with hashes and
a model card; the same identity tests; the scripted/learned switch as the safety valve.
