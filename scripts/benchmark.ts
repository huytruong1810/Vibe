import { cpus, platform, arch, totalmem } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';

const samples = Number(process.env.BENCHMARK_TICKS ?? 3000);
const started = performance.now(),
  host = new SimulationHost(42, 1, 1000, 'world:benchmark');
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
  if (host.creatures.owner[i] === -1) {
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
const report = {
  recordedAt: new Date().toISOString(),
  runtime: process.version,
  platform: `${platform()} ${arch()}`,
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
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
