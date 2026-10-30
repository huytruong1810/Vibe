import { mkdir, writeFile } from 'node:fs/promises';
import { OllamaAdapter } from '../src/adapters/inference';
import { DialogueResponseSchema, PlanService, MemoryRepository } from '../src/domain/agents';
import { NPC_PROFILES } from '../src/content/definitions';
import { SimulationHost } from '../src/domain/simulation';

const model = process.argv[2] ?? process.env.OLLAMA_MODEL ?? 'qwen2.5:3b';
const adapter = new OllamaAdapter(process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434');
const started = performance.now();
let report: object;
let capabilityMs: number | null = null;
try {
  await adapter.capabilityCheck(model);
  capabilityMs = performance.now() - started;
  const readyMs = capabilityMs,
    host = new SimulationHost(42, 1, 0, 'world:smoke'),
    npc = host.npcs[10]!;
  const plans = new PlanService(new MemoryRepository(), (id) => host.query.perceivedFacts(id));
  const job = plans.job(
    npc,
    NPC_PROFILES[10]!,
    host.session,
    host.tick,
    'dialogue',
    'Hello. What do you enjoy about this village?',
  );
  const generation = performance.now(),
    response = await adapter.generate(job, model, AbortSignal.timeout(45_000));
  const validated = DialogueResponseSchema.parse(response.output);
  report = {
    recordedAt: new Date().toISOString(),
    model,
    passed: true,
    capabilityMs: +readyMs.toFixed(2),
    dialogueMs: +(performance.now() - generation).toFixed(2),
    outputTokens: response.tokens,
    action: validated.action.type,
    dialogue: validated.dialogue,
    note: 'One live local structured dialogue; not a long-horizon quality evaluation or an 8 GB hardware guarantee.',
  };
  host.dispose();
} catch (error) {
  report = {
    recordedAt: new Date().toISOString(),
    model,
    passed: false,
    capabilityPassed: capabilityMs !== null,
    capabilityMs,
    elapsedMs: +(performance.now() - started).toFixed(2),
    error: error instanceof Error ? error.message : String(error),
  };
  process.exitCode = 1;
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/ollama-smoke.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
