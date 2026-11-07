import { ChunkStore } from '../src/domain/world';
import { SpatialIndex } from '../src/domain/navigation';
import { NpcProfileRegistry, PlanService, MemoryRepository } from '../src/domain/agents';
import { cpus, platform, arch, totalmem } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { SimulationHost } from '../src/domain/simulation';
import { NPC_PROFILES } from '../src/content/definitions';
import { migrateSave } from '../src/domain/save-schema';
import { CombatSystem } from '../src/domain/combat';
import { EntityStore, bindBody } from '../src/domain/entities';

const samples = Number(process.env.BENCHMARK_TICKS ?? 3000);
const started = performance.now();
let host: SimulationHost;
if (process.env.BENCHMARK_WORLD === 'authored') {
  const { readFile } = await import('node:fs/promises');
  const compiled = JSON.parse(
    await readFile('public/assets/generated/aqualia-region.json', 'utf8'),
  );
  host = new SimulationHost(42, 1, 1000, 'world:benchmark', {
    worldSource: 'authored',
    compiledWorld: compiled,
  });
} else {
  host = new SimulationHost(42, 1, 1000, 'world:benchmark');
}
const generationMs = performance.now() - started;
host.advance(300);
const step: number[] = [],
  snapshots: number[] = [],
  cloning: number[] = [];
let maximumDetailed = 0,
  maximumPaths = 0;
for (let i = 0; i < samples; i++) {
  const before = performance.now();
  host.step();
  step.push(performance.now() - before);
  maximumDetailed = Math.max(maximumDetailed, host.tiers.detailed.length);
  maximumPaths = Math.max(maximumPaths, host.navigation.pending);
  if (i % 3 === 0) {
    const time = performance.now(),
      frame = host.frame();
    snapshots.push(performance.now() - time);
    const copy = performance.now();
    structuredClone(frame);
    cloning.push(performance.now() - copy);
  }
}
const summarize = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    meanMs: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(3),
    p95Ms: +sorted[Math.floor(sorted.length * 0.95)]!.toFixed(3),
    maxMs: +sorted.at(-1)!.toFixed(3),
  };
};
const saveStarted = performance.now(),
  saved = migrateSave(host.snapshot()),
  serialized = JSON.stringify(saved),
  saveMs = performance.now() - saveStarted;
// A second scenario measures the actual detailed-tier cap instead of assuming a dispersed world exercises it.
let placed = 0;
for (let i = 0; i < host.creatures.count && placed < 128; i++)
  if (host.creatures.alive[i] && host.creatures.owner[i] === -1) {
    host.creatures.scene[i] = host.entities.scene[host.entities.require(0)]!;
    host.creatures.x[i] = host.player.x + ((placed % 12) - 6) * 0.4;
    host.creatures.y[i] = host.player.y + (Math.floor(placed / 12) - 5) * 0.4;
    host.creatures.targetX[i] = host.creatures.x[i]!;
    host.creatures.targetY[i] = host.creatures.y[i]!;
    placed++;
  }
host.advance(60);
const dense: number[] = [];
let denseMaximumDetailed = 0;
for (let i = 0; i < Math.min(samples, 1500); i++) {
  const before = performance.now();
  host.step();
  dense.push(performance.now() - before);
  denseMaximumDetailed = Math.max(denseMaximumDetailed, host.tiers.detailed.length);
}
// Controlled tactical load: 64 independent pairs keep 128 living actors fighting.
// Refill between ticks so this measures sustained work rather than a brief mass defeat.
const fighters = [...host.entities.slots()]
  .filter((i) => !host.entities.protected(i))
  .slice(0, 128);
for (let n = 0; n < fighters.length; n++) {
  const i = fighters[n]!;
  host.entities.scene[i] = 0;
  host.entities.x[i] = host.player.x + (n % 12) * 0.1;
  host.entities.y[i] = host.player.y + Math.floor(n / 12) * 0.1;
}
const activeCombat: number[] = [];
for (let n = 0; n < Math.min(samples, 1500); n++) {
  for (let index = 0; index < fighters.length; index++) {
    const i = fighters[index]!,
      target = fighters[index % 2 ? index - 1 : index + 1];
    host.entities.hp[i] = host.entities.maxHp(i);
    host.entities.stamina[i] = 100;
    host.entities.food[i] = host.entities.water[i] = host.entities.rest[i] = 1;
    if (target !== undefined)
      host.combat.pursuits.set(host.entities.id(i), {
        target: host.entities.id(target),
        cause: 'territory',
        until: host.tick + 90,
      });
  }
  const before = performance.now();
  host.step();
  activeCombat.push(performance.now() - before);
}
const memoryNpc = new NpcProfileRegistry().create()[0]!,
  memoryRepository = new MemoryRepository();
for (let i = 0; i < 400; i++)
  memoryRepository.append(memoryNpc, {
    type: 'episodic',
    text: `River bridge observation ${i}`,
    subjects: ['player'],
    importance: 1 + (i % 10),
    createdTick: i,
    lastAccessTick: i,
    confidence: 'witnessed',
    source: { kind: 'event', ids: [`fixture:${i}`] },
  });
const memoryPlans = new PlanService(memoryRepository);
const query = 'river bridge';
memoryPlans.queries.set(query, [1, ...Array<number>(255).fill(0)]);
for (const record of memoryNpc.memory.records)
  memoryPlans.vectors.set(record.id, {
    text: record.text,
    vector: [1, ...Array<number>(255).fill(0)],
  });
const memoryTimings: number[] = [],
  memoryPromptTimings: number[] = [];
for (let i = 0; i < 1100; i++) {
  const start = performance.now();
  memoryPlans.retrieval.retrieve(memoryNpc, query, 1000, 12, {
    query: memoryPlans.queries.get(query)!,
    records: memoryPlans.vectors,
  });
  if (i >= 100) memoryTimings.push(performance.now() - start);
  const promptStart = performance.now();
  memoryPlans.job(memoryNpc, NPC_PROFILES[0]!, 'world:benchmark-memory', 1000, 'dialogue', query);
  if (i >= 100) memoryPromptTimings.push(performance.now() - promptStart);
}
// Director preparation includes release, candidate collection and deterministic selection.
// Exercise both one crowded target and 75 independent wild-target pools.
const directorStore = new EntityStore(),
  directorPlayer = { ...host.player };
directorStore.spawnHuman(0, 1, 20, 20);
bindBody(directorPlayer, directorStore, 0);
const directorCombat = new CombatSystem(directorStore, directorPlayer, []);
for (let n = 0; n < 150; n++) directorStore.spawn(6, 20 + (n % 2), 20);
directorCombat.minds.sync();
for (let i = 0; i < 150; i++) directorCombat.minds.state.engage[i] = 2;
const directorTimings: number[] = [],
  wildDirectorTimings: number[] = [];
for (const paired of [false, true]) {
  directorCombat.pursuits.clear();
  directorCombat.director.reset();
  for (let n = 0; n < 150; n++)
    directorCombat.pursuits.set(directorStore.id(n), {
      target: paired ? directorStore.id(n % 2 ? n - 1 : n + 1) : 0,
      cause: 'territory',
      until: 10000,
    });
  for (let n = 0; n < 3300; n++) {
    const before = performance.now();
    directorCombat.prepareDirector(n);
    if (n >= 300) (paired ? wildDirectorTimings : directorTimings).push(performance.now() - before);
  }
}
// 150 living combatants execute every tick; the 48-slot cap affects decision cadence only.
const engagedStore = new EntityStore(),
  engagedPlayer = { ...host.player };
engagedStore.spawnHuman(0, 1, 64, 64);
bindBody(engagedPlayer, engagedStore, 0);
const engagedWorld = new ChunkStore(128),
  engagedCombat = new CombatSystem(engagedStore, engagedPlayer, [], engagedWorld),
  engagedSpatial = new SpatialIndex();
for (let i = 0; i < 150; i++)
  engagedStore.spawn(i % 8, 64 + ((i % 15) - 7) * 0.5, 64 + (Math.floor(i / 15) - 5) * 0.5);
const brain150: number[] = [],
  movement150: number[] = [],
  engagedDirector150: number[] = [];
let minimumExecuted = 150,
  maximumFullRate = 0;
for (let tick = 1; tick <= samples + 300; tick++) {
  engagedPlayer.invulnerableUntil = tick + 100;
  for (let i = 0; i < 150; i++) {
    engagedStore.hp[i] = engagedStore.maxHp(i);
    engagedStore.stamina[i] = 100;
    engagedCombat.pursuits.set(engagedStore.id(i), {
      target: 0,
      cause: 'territory',
      until: tick + 600,
    });
    // Keep this sustained-load fixture inside the same home/leash, independently of motion.
    if (engagedCombat.minds.ids[i]! >= 0) {
      engagedCombat.minds.state.lastSeen[i] = tick;
      engagedCombat.minds.state.homeX[i] = 64;
      engagedCombat.minds.state.homeY[i] = 64;
    }
  }
  engagedCombat.advance(tick, engagedSpatial);
  let executed = 0,
    full = 0;
  for (let i = 0; i < 150; i++) {
    if (engagedCombat.minds.state.lastMove[i] === tick) executed++;
    full += engagedCombat.minds.fullRate[i]!;
  }
  if (tick > 300) {
    brain150.push(engagedCombat.minds.brainMs);
    movement150.push(engagedCombat.minds.movementMs);
    engagedDirector150.push(engagedCombat.directorMs);
    minimumExecuted = Math.min(minimumExecuted, executed);
    maximumFullRate = Math.max(maximumFullRate, full);
  }
}
const engagedCombat150 = {
  actors: 150,
  minimumExecuted,
  maximumFullRate,
  brain: summarize(brain150),
  movement: summarize(movement150),
  director: summarize(engagedDirector150),
};
const report = {
  engagedCombat150,
  recordedAt: new Date().toISOString(),
  runtime: process.version,
  platform: `${platform()} ${arch()}`,
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
  worldSource: host.worldSource,
  systemMemoryGiB: +(totalmem() / 2 ** 30).toFixed(1),
  seed: 42,
  villagers: host.npcs.length,
  creatures: host.entities.wildlifeCount,
  livingEntities: host.entities.livingCount,
  measuredTicks: samples,
  warmupTicks: 300,
  generationMs: +generationMs.toFixed(2),
  simulation: summarize(step),
  renderSnapshot: summarize(snapshots),
  structuredClone: summarize(cloning),
  maximumDetailed,
  maximumPaths,
  denseSimulation: summarize(dense),
  denseMaximumDetailed,
  activeCombat: summarize(activeCombat),
  activeCombatActors: fighters.length,
  activeCombatFixture:
    '64 paired territorial encounters; needs, stamina and HP refill between ordinary ticks; no rendering or inference.',
  memoryRetrieval: summarize(memoryTimings),
  memoryPrompt: summarize(memoryPromptTimings),
  memoryFixture:
    '400 valid records, cached 256-d embeddings, full prompt construction; 100 warmups and 1000 samples',
  director150: summarize(directorTimings),
  directorWild150: summarize(wildDirectorTimings),
  directorFixture:
    '150 ready Bramblefang: one player target, then 75 independent wild pairs; 300 warmups and 3000 samples each; collection, release and selection included.',
  checkpointMs: +saveMs.toFixed(2),
  checkpointBytes: Buffer.byteLength(serialized),
  nodeRssMiB: +(process.memoryUsage().rss / 2 ** 20).toFixed(1),
  limitations:
    'Headless Node CPU measurements; excludes GPU, browser rendering, and live model inference. Maxima include garbage collection. This is a measured host, not an ordinary-laptop guarantee.',
};
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/benchmark.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
host.dispose();
if (summarize(memoryTimings).p95Ms > 5) {
  console.error('Memory retrieval/prompt p95 exceeds 5 ms');
  process.exitCode = 1;
}
if (Math.max(summarize(directorTimings).p95Ms, summarize(wildDirectorTimings).p95Ms) > 0.2) {
  console.error('Combat director p95 exceeds 0.2 ms/tick');
  process.exitCode = 1;
}

if (
  engagedCombat150.minimumExecuted !== 150 ||
  engagedCombat150.maximumFullRate > 48 ||
  engagedCombat150.brain.p95Ms > 1 ||
  engagedCombat150.movement.p95Ms > 1 ||
  engagedCombat150.director.p95Ms > 0.2
) {
  console.error('CRM-8 engagedCombat150 budget/execution gate failed');
  process.exitCode = 1;
}
