import { mkdir, writeFile } from 'node:fs/promises';
import { SimulationHost } from '../src/domain/simulation';
import { CONFIG } from '../src/domain/values';
import { migrateSave } from '../src/domain/save-schema';

const days = Number(process.env.SOAK_DAYS ?? 28),
  ticks = Math.ceil(days * CONFIG.daySeconds * CONFIG.tickRate);
const host = new SimulationHost(42, 1, 1000, 'world:soak'),
  started = performance.now();
let checkpoints = 0,
  maximumDetailed = 0,
  maximumReactions = 0;
let minimumWildlife = 1000,
  maximumWildlife = 1000;
const daily: {
  day: number;
  population: number;
  species: number[];
  deaths: number;
  births: number;
}[] = [];
for (let i = 0; i < ticks; i++) {
  host.step();
  maximumDetailed = Math.max(maximumDetailed, host.tiers.detailed.length);
  maximumReactions = Math.max(maximumReactions, host.reactions.pending);
  minimumWildlife = Math.min(minimumWildlife, host.entities.wildlifeCount);
  maximumWildlife = Math.max(maximumWildlife, host.entities.wildlifeCount);
  if ((i + 1) % (CONFIG.tickRate * 60) === 0) {
    host.creatures.validate();
    migrateSave(host.snapshot());
    checkpoints++;
    // Exercise outage handling; no test ever downloads a model or sends player data remotely.
    for (const job of host.frame().jobs)
      host.submit({
        id: `soak:${i}:${job.id}`,
        session: host.session,
        issuer: 'inference',
        command: { type: 'agentFailure', jobId: job.id, reason: 'headless soak' },
      });
  }
  if ((i + 1) % (CONFIG.daySeconds * CONFIG.tickRate) === 0) {
    const species = new Array<number>(8).fill(0);
    for (let slot = 0; slot < host.entities.count; slot++)
      if (host.entities.alive[slot]) species[host.entities.species[slot]!]!++;
    daily.push({
      day: daily.length + 1,
      population: host.entities.wildlifeCount,
      species,
      deaths: host.ecology.deaths,
      births: host.ecology.births,
    });
    if (
      host.entities.wildlifeCount < 850 ||
      host.entities.wildlifeCount > 1000 ||
      species.some((n) => n < 5)
    )
      throw new Error(`Population collapse or runaway: ${JSON.stringify(daily.at(-1))}`);
    console.log(`Completed day ${(i + 1) / (CONFIG.daySeconds * CONFIG.tickRate)} of ${days}`);
  }
}
const snapshot = migrateSave(host.snapshot()),
  restored = new SimulationHost(42, 1, 0, 'world:restored');
restored.restore(snapshot);
restored.advance(30);
restored.creatures.validate();
const result = {
  recordedAt: new Date().toISOString(),
  days,
  ticks,
  checkpoints,
  elapsedMs: +(performance.now() - started).toFixed(2),
  villagers: host.npcs.length,
  creatures: host.entities.wildlifeCount,
  livingEntities: host.entities.livingCount,
  minimumWildlife,
  maximumWildlife,
  daily,
  deaths: host.ecology.deaths,
  births: host.ecology.births,
  maximumDetailed,
  maximumReactions,
  finalDay: host.calendar.day,
  finalSeason: host.calendar.season,
  passed: true,
  note: 'Accelerated full-tick simulation with deterministic inference outages; live LLM believability is a separate manual evaluation.',
};
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/soak.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
host.dispose();
restored.dispose();
