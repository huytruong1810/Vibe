import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ContextSettingsSchema } from '../src/domain/conversation';
import type { CommandPayload } from '../src/domain/contracts';
import { OllamaAdapter } from '../src/adapters/inference';
import { DialogueResponseSchema, PlanService, MemoryRepository } from '../src/domain/agents';
import { NPC_PROFILES } from '../src/content/definitions';
import { SimulationHost } from '../src/domain/simulation';

const model =
  process.argv.slice(2).find((arg) => !arg.startsWith('--')) ??
  process.env.OLLAMA_MODEL ??
  'gemma4-abliterated:26b';
const adapter = new OllamaAdapter(process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434');
const started = performance.now();
let report: object;
let capabilityMs: number | null = null;
let ownedHost: SimulationHost | null = null;
try {
  await adapter.capabilityCheck(model);
  capabilityMs = performance.now() - started;
  const readyMs = capabilityMs,
    host = new SimulationHost(42, 1, 0, 'world:smoke'),
    npc = host.npcs[10]!;
  ownedHost = host;
  if (process.argv.includes('--conversation') || process.argv.includes('--memory')) {
    const backgroundModel = process.env.OLLAMA_BACKGROUND_MODEL ?? 'gemma4-abliterated:e4b';
    const settings = ContextSettingsSchema.parse({
      dialogueModel: model,
      backgroundModel,
      backgroundCpu: process.env.OLLAMA_BACKGROUND_CPU !== '0',
      contextTokens: Number(process.env.OLLAMA_CONTEXT_TOKENS ?? 8192),
    });
    let serial = 0;
    const send = (command: CommandPayload, issuer: 'player' | 'inference' = 'player') =>
      host.submit({ id: `smoke:${++serial}`, session: host.session, issuer, command });
    const models = await adapter.models();
    if (!models.some((m) => m.name === backgroundModel))
      throw Error(
        `Install the background alias ${backgroundModel} using docs/operations/operations.md before the B0 smoke.`,
      );
    send({ type: 'configureContext', settings });
    host.player.x = npc.x;
    host.player.y = npc.y;
    send({ type: 'interact', npcId: npc.profileId });
    const turns: object[] = [],
      compactions: object[] = [];
    let recalled = false;
    for (let turn = 1; turn <= 30; turn++) {
      const text =
        process.argv.includes('--memory') && turn === 29
          ? 'My favorite plant is marsh lavender. Please remember that for our next conversation.'
          : turn === 3
            ? 'I promise to visit you at the square tomorrow after breakfast. Please remember this promise.'
            : turn === 28
              ? 'What did I promise you earlier in this conversation? Please recall the place and when.'
              : `Let us keep talking about village life, turn ${turn}. ${'I enjoy noticing the river, weather, paths and little everyday changes around the village. '.repeat(9)}`;
      if (!send({ type: 'dialogue', text }).ok) throw Error(`Conversation refused at turn ${turn}`);
      const job = host.frame().jobs.find((j) => j.kind === 'dialogue')!;
      const start = performance.now();
      const response = await adapter.generate(job, model, AbortSignal.timeout(90_000));
      const parsed = DialogueResponseSchema.parse(response.output);
      const result = send(
        {
          type: 'agentResult',
          jobId: job.id,
          output: response.output,
          promptTokens: response.promptTokens,
        },
        'inference',
      );
      if (!result.ok) throw Error(result.message);
      if (turn === 28)
        recalled = /square/i.test(parsed.dialogue) && /breakfast/i.test(parsed.dialogue);
      turns.push({
        turn,
        text,
        response: parsed.dialogue,
        replyMs: performance.now() - start,
        promptTokens: response.promptTokens,
      });
      const compact = host.frame().jobs.find((j) => j.kind === 'compaction');
      if (compact) {
        const before = JSON.stringify(npc.memory),
          start = performance.now();
        const response = await adapter.generate(
          compact,
          backgroundModel,
          AbortSignal.timeout(90_000),
        );
        const receipt = send(
          {
            type: 'agentResult',
            jobId: compact.id,
            output: response.output,
            promptTokens: response.promptTokens,
          },
          'inference',
        );
        if (JSON.stringify(npc.memory) !== before)
          throw Error('Compaction changed persistent memory');
        compactions.push({
          turn,
          latencyMs: performance.now() - start,
          applied: receipt.ok,
          output: response.output,
        });
      }
    }
    const applied = host.frame().performance.context!.compactions;
    let crossConversation: object | null = null;
    let memoryPassed = true;
    if (process.argv.includes('--memory')) {
      const closeStarted = performance.now();
      send({ type: 'closeDialogue' });
      const extraction = host.frame().jobs.find((j) => j.kind === 'extraction');
      if (!extraction) throw Error('Session close did not produce an extraction');
      const extracted = await adapter.generate(
        extraction,
        backgroundModel,
        AbortSignal.timeout(30_000),
      );
      const receipt = send(
        { type: 'agentResult', jobId: extraction.id, output: extracted.output },
        'inference',
      );
      const extractionMs = performance.now() - closeStarted;
      if (!receipt.ok) throw Error(receipt.message);
      send({ type: 'interact', npcId: npc.profileId });
      send({
        type: 'dialogue',
        text: 'What is my favorite plant, from our previous conversation?',
      });
      const second = host.frame().jobs.find((j) => j.kind === 'dialogue')!;
      const start = performance.now();
      const response = await adapter.generate(second, model, AbortSignal.timeout(90_000));
      const dialogue = DialogueResponseSchema.parse(response.output);
      const accepted = send(
        {
          type: 'agentResult',
          jobId: second.id,
          output: response.output,
          promptTokens: response.promptTokens,
        },
        'inference',
      );
      const recalledFact = /marsh lavender/i.test(dialogue.dialogue);
      memoryPassed = accepted.ok && recalledFact && extractionMs <= 30_000;
      crossConversation = {
        extractionMs,
        extractionOutput: extracted.output,
        recalledFact,
        dialogue: dialogue.dialogue,
        replyMs: performance.now() - start,
        core: npc.memory.core,
        validRecords: npc.memory.records.filter((r) => r.invalidAtTick === undefined).length,
        pendingWrites: npc.memory.pending.length,
      };
    }
    report = {
      recordedAt: new Date().toISOString(),
      model,
      backgroundModel,
      settings,
      passed: recalled && applied > 0 && memoryPassed,
      crossConversation,
      recalled,
      appliedCompactions: applied,
      turns,
      compactions,
      note: 'Full response latency, not first streamed token. Compaction is awaited between turns only in this measurement harness; runtime preempts it. Director reviews turn 3 and 28 for semantic recall.',
    };
    if (!recalled || !applied || !memoryPassed) process.exitCode = 1;
  } else {
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
  }
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
} finally {
  ownedHost?.dispose();
}
const outputDirectory = process.env.OLLAMA_SMOKE_DIR ?? join(tmpdir(), 'hearthwild-ollama-smoke');
await mkdir(outputDirectory, { recursive: true });
await writeFile(
  join(
    outputDirectory,
    process.argv.includes('--memory')
      ? 'memory-smoke.json'
      : process.argv.includes('--conversation')
        ? 'conversation-smoke.json'
        : 'ollama-smoke.json',
  ),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
