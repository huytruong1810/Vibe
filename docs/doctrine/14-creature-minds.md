# 14 — Creature minds

Villagers think; creatures react. Villager minds are slow and deliberate: language
models, memory and sight (AGT, a "System 2"). Creature minds are fast and intuitive: a
small learned policy that decides in microseconds what more than 100 creatures do in an
open-world fight (a "System 1"). Creatures still flock, hunt and flee by the movement
rules the world already has. Director decision, 2026-11-01 (L11).

## CRM-1 Three layers

| Layer              | Kind                                    | Rate                 | Decides                                                                                              |
| ------------------ | --------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| 1. Movement        | Scripted, deterministic                 | Every tick (30 Hz)   | Flocking, pursuit and evasion, herd and territory, obstacle avoidance                                |
| 2. System 1 brain  | Learned policy, deterministic inference | 5–10 Hz per creature | Intent and target: approach, flank, strike, element, guard, dash, retreat, flee, call the pack, hold |
| 3. Combat director | Scripted rules                          | Every tick           | Who may attack the player now (tokens), telegraph compliance, difficulty                             |

- **CRM-1.1** The layers talk through fixed contracts. Movement executes the brain's
  intent. The director grants or withholds the right to attack. The brain never sets
  positions or velocities directly.
- **CRM-1.2** Bonded or named creatures may also receive slow goals from the living-minds
  stack (AGT, L10), for example "stay near the ferry today". Those goals become
  observation inputs to System 1, never per-tick control.
- **CRM-1.3** Ambient creatures (AMB-1) are presentation only and have no brain.
- **CRM-1.4 The brain runs only when it matters.** A creature's everyday life (feeding,
  drinking, bathing, wandering, sleeping, herding) stays on the needs-driven utility
  system and the movement layer. The System 1 brain switches on when the creature
  becomes **alert** (it perceives a threat, prey it means to hunt, an attacker, or its
  partner's command) and switches off after a calm period with no threat in sight. Most
  creatures most of the time cost no brain work at all (2026-11-02).

## CRM-2 Movement layer

- **CRM-2.1** **Flocking** is the classic three-rule swarm: separation, alignment and
  cohesion. Weights are per species (from the template data) plus a bounded adjustment
  set by the current intent: a "call the pack" intent raises cohesion, "flee" raises
  separation from threats.
- **CRM-2.2** **Predation:**
  - Predators pursue with interception, aiming where the prey will be.
  - Prey evade inside a species flight radius.
  - The existing predation relationships and dispositions (CRE-4.3) decide who hunts
    whom.
- **CRM-2.3** **Herd and territory:** home ranges come from map `Habitat` regions
  (WLD-M2). Creatures drift back when no intent pulls them away.
- **CRM-2.4** **Pathing:** movement respects collision, elevation and ramps exactly as
  the player does (`SurfaceRules`), and the creature's medium: land, water, lava (fire
  species) or **air**. Winged species (zephyrit, cindermoth) fly: they cross water and
  steps of up to two elevation levels, never walls or interiors' solid tiles, and land to
  eat, drink, bathe and sleep (C3h `winged` clips). Flying is movement, not invisibility:
  they cast a shadow and can be hit like anyone else.

## CRM-3 System 1 brain

- **CRM-3.1 One shared network** drives every species. It is conditioned on:
  - species and skeleton template;
  - temperament (CRE-4) and disposition (CRE-4.3);
  - stats and level (CRE-2);
  - bond (CRE-6) and partner flag (CRM-5).

  Species identity comes from these inputs and from the training tests in CRM-6.4, not
  from separate models.

- **CRM-3.2 Observation: local and honest.** The brain sees only what the creature could
  perceive:
  - **Self:** health, stamina, cooldowns, current move phase, elevation, medium.
  - **Others:** the nearest few threats, allies and prey, each with relative position,
    velocity, health, and any telegraph it shows (with its phase).
  - **Surroundings:** the pack centroid and the terrain features near it (water, ramp,
    cliff edge).
  - **Recent history:** time since it last hit or was hit.
  - **Commands and goals:** player commands (partner only) and System 2 goals.
  - **Memory:** a small set of decaying memory counters (CRM-7.2).

  It never sees global state, hidden player inputs or anything beyond its sight radius.

- **CRM-3.3 Intent, not control.** The output is one discrete intent, a target among the
  observed entities, and optionally a bounded flocking-weight adjustment.
  - **Allowed intents:** hold, approach, flank left, flank right, retreat, flee, strike,
    element, guard, dash, call the pack, and follow (partner only).
  - **Masking:** illegal options are masked before the choice: moves on cooldown, moves
    the species lacks (CRE-5, CMB-3 move registry), and attacks the director has not
    granted (CRM-4).
- **CRM-3.4 Reaction time.**
  - Each creature decides every 3–6 ticks (100–200 ms), staggered by entity id so no tick
    holds every decision.
  - An intent holds until the next decision.
  - Being hit or seeing a telegraph lets a creature decide early, but never sooner than 2
    ticks after the event.
  - Creatures react like animals, not like bots with instant reflexes.
- **CRM-3.5 Model size and runtime.**
  - **Network:** a small feed-forward network, at most 64k parameters, optionally with a
    recurrent memory of at most 64 units.
  - **Inference:** runs on the CPU in the simulation, in float32 or int8 fixed-point, and
    is bit-for-bit deterministic for a given input.
  - **Forbidden:** GPU inference and language models in the combat loop (L11).

## CRM-4 Combat director: fairness first

- **CRM-4.1 Attack tokens.**
  - At most **2 melee and 1 ranged or element** attacker may be in windup or active
    against the player at once. These are starting values; engineering tunes them.
  - Creatures without a token circle at a readiness ring, guard or reposition.
  - Partner creatures and wild-versus-wild fights use their own token pools.
- **CRM-4.2** Every attack still obeys CMB-3 timing and CMB-4 telegraphs. A learned brain
  cannot shorten a windup or hide a telegraph.
- **CRM-4.3** Creatures off screen never start an attack on the player.
- **CRM-4.4 Difficulty** is set by token counts, reaction time (CRM-3.4) and the
  aggression bias input, never by swapping networks.

## CRM-5 Partner creatures

- **CRM-5.1** The partner uses the same brain with the partner flag set. It receives the
  player's contextual command (CMB-7: focus target, regroup) and its bond level (CRE-6):
  higher bond means it follows commands more closely and holds formation better.
- **CRM-5.2** The HUD shows the partner's current intent as a small icon beside its
  portrait (UI-1). The player should always know what their creature is doing.

## CRM-6 Training: fun, not winning

- **CRM-6.1 Scripted brain first.** A hand-written utility brain implements the same
  observation and intent interfaces. The learned brain (CRM-6.2 onward) starts only after
  the scripted brain has shipped in a playtested build and the director asks for it. It
  is:
  - the shipping baseline;
  - the teacher for imitation;
  - the far-away fallback (CRM-8.2);
  - the comparison point in tests.
- **CRM-6.2 Pipeline.** Training runs in this order:
  1. Imitate the scripted brain.
  2. Train further with reinforcement learning (PPO, all agents sharing one network) in
     the headless deterministic simulation.
  3. Use open-source tooling only (PufferLib or CleanRL; engineering picks and pins the
     versions).
- **CRM-6.3 Reward for fun.** Reward:
  - trading hits well;
  - readable tactics: using telegraphs, keeping spacing;
  - pack cohesion;
  - species identity: prey flee, predators stalk and flank;
  - a floor on behavioural variety.

  Penalise degenerate play: corner camping, stun-locking, edge-of-range kiting. Opponents
  are scripted player bots plus recorded player traces.

- **CRM-6.4 Species identity tests.** Each species has written behaviour assertions that
  run in CI on whichever brain ships, scripted or learned. A brain that fails them doesn't
  ship. The starting set (engineering adds cases, never removes them):
  - **Rivallie:** disengages below 30% health and heads for water; fights near water.
  - **Bramblefang:** packs gather and flank before the first strike; a downed leader
    breaks the pack.
  - **Marshstalker:** waits hidden in reeds or shallows near dusk and opens with a
    lunge; gives up a chase that leaves its marsh.
  - **Mireling:** slow and stubborn: guards more than it strikes and seldom flees.
  - **Steamshell:** withdraws into its shell (guard) when hit hard, then vents (element)
    at whoever is closest.
  - **Zephyrit:** hit and run: strikes, flies off past its readiness ring, returns.
  - **Cindermoth:** erratic flutter at range; prefers element over strike; drawn to fire
    and light at night.
  - **Ignicap:** peaceable; retaliates once, then retreats toward warm ground; a cornered
    Ignicap bursts (element).

## CRM-7 Frozen at release, adaptive in play

- **CRM-7.1 Versioned weights.** Weights are content:
  - they are versioned with `contentVersion` and their hash is recorded in the save;
  - they never update during play.

  A given save, seed and input sequence always replays to the same decisions.

- **CRM-7.2 Adaptation through memory, not weights.** Creatures adapt to a player through
  decaying memory counters in their observation, for example "this player dashes left"
  or "this player uses fire". Those counters are saved per individual or per pack.
- **CRM-7.3 Reproducible training.** Every training run records its seed, configuration,
  data hash and resulting weight hash. Each release has a short model card: what changed,
  test results, budget measurements.

## CRM-8 Budgets (reference machine: RTX 5080 laptop CPU)

- **CRM-8.1 Per-tick cost** with 150 creatures in active combat:
  - all System 1 brains: at most **1.0 ms** per tick;
  - the movement layer: at most **1.0 ms** per tick;
  - the director: at most **0.2 ms** per tick.
- **CRM-8.2 Level of detail by distance:**
  - within 2 screens of the player: full brain at its decision rate;
  - farther, inside the loaded region: the scripted brain at 2 Hz;
  - outside the loaded region: statistical simulation, no per-tick work.

## CRM-9 Tools

- **CRM-9.1** A debug overlay shows each creature's intent, target, token state and top
  three intent scores.
- **CRM-9.2** An observation inspector shows one creature's full input vector live.
- **CRM-9.3** A per-species switch toggles between the scripted and learned brain at
  runtime, for comparison and as a safety valve.

## CRM-10 Presence: how a fight reads

The brain exists to make fights feel like meeting animals, not bots. Every engagement
moves through readable beats, each with its own body language (C3h clips) so the player
can read it at a glance:

1. **Notice.** The creature stops, turns its head toward the threat and holds a beat
   (`guard` or `idle`) before acting. Prey bolt; predators hold still.
2. **Stalk or warn.** Predators approach low and slow and circle at their readiness
   ring; territorial species posture (`social`) at the edge of their territory before
   committing; packs call (`social`) and gather.
3. **Commit.** Only creatures holding an attack token strike, one after another rather
   than all at once; each strike shows its telegraph (CMB-4) from the start of windup.
   Others circle, feint (a short approach then back) or guard.
4. **Break.** Hurt creatures disengage and seek their safe medium (Rivallie to water,
   Ignicap to warm ground); a pack whose leader falls loses heart; prey that escapes is let
   go. Fights end; they don't grind.

A fight against a pack should feel dangerous and fair at once: lots of motion around
the player, one or two clear threats at a time.

## Engineering mandates

| ID     | Mandate                                                                                                                                                                                                  |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CRM-M1 | Movement layer: per-species flocking, predation pursuit and evasion, home ranges from `Habitat` regions, `SurfaceRules`-exact pathing; deterministic; within budget (CRM-2, CRM-8).                      |
| CRM-M2 | Brain interface: the fixed observation vector and the masked intent space as a versioned schema; a scripted utility brain behind it; staggered decision cadence and reaction delay (CRM-3, CRM-6.1).     |
| CRM-M3 | Combat director: attack tokens, readiness ring, off-screen rule, difficulty knobs; partner intent icon in the HUD (CRM-4, CRM-5).                                                                        |
| CRM-M4 | Headless training bridge: the deterministic Node simulation exposed as a multi-agent environment to PufferLib or CleanRL; imitation then PPO with shared parameters; reproducible runs (CRM-6, CRM-7.3). |
| CRM-M5 | Learned policy v1: deterministic CPU inference in the simulation (float32 or int8), weights as versioned content with a save hash, memory counters (CRM-3.5, CRM-7).                                     |
| CRM-M6 | Species identity tests in CI and the per-tick budget measurement in benchmark and soak (CRM-6.4, CRM-8).                                                                                                 |
| CRM-M7 | Debug overlay, observation inspector and the scripted/learned switch (CRM-9).                                                                                                                            |
