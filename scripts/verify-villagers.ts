import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { OllamaAdapter } from '../src/adapters/inference';
import {
  AgentActionValidator,
  DialogueResponseSchema,
  type InferenceJob,
} from '../src/domain/agents';
import { ContextSettingsSchema } from '../src/domain/conversation';
import type { CommandPayload } from '../src/domain/contracts';
import { SimulationHost } from '../src/domain/simulation';
import { NPC_PROFILES } from '../src/content/definitions';
import {
  VILLAGER_TURNS,
  SESSION_ENDS,
  evaluateVillagers,
  VillagerReviewsSchema,
  type EvaluationTurn,
} from './lib/villager-evaluation';

const directory = resolve(process.env.VILLAGER_EVAL_DIR ?? 'artifacts/villagers');
await mkdir(directory, { recursive: true });
const transcriptPath = resolve(directory, 'transcript.json');
const hash = (bytes: string) => createHash('sha256').update(bytes).digest('hex');
const model = process.env.OLLAMA_MODEL ?? 'gemma4-abliterated:e4b';
const turns: EvaluationTurn[] = [];
const compactions: Record<string, number> = {};
const extractionMs: number[] = [];
const transcript = {
  sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  recordedAt: new Date().toISOString(),
  model,
  turns,
  compactions,
  extractionMs,
  endpoint: process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434',
  note: 'Live collection. Quality ratings require a separate reviewer and the exact transcript hash. Compactions are awaited between turns in this harness only.',
};
let error: string | undefined;
try {
  if (process.argv.includes('--review')) {
    Object.assign(transcript, JSON.parse(await readFile(transcriptPath, 'utf8')));
  } else {
    const adapter = new OllamaAdapter(transcript.endpoint);
    // Warm and verify structure before collecting the latency sample.
    await adapter.capabilityCheck(model, AbortSignal.timeout(120_000), undefined, 4096);
    for (const profile of NPC_PROFILES.filter((p) => p.village === 1)) {
      const host = new SimulationHost(42, 1, 0, `world:eval:${profile.id}`);
      let serial = 0,
        session = 1;
      const send = (command: CommandPayload, issuer: 'player' | 'inference' = 'player') =>
        host.submit({ id: `eval:${++serial}`, session: host.session, issuer, command });
      const requireReceipt = (receipt: ReturnType<typeof send>) => {
        if (!receipt.ok) throw Error(receipt.message);
      };
      const generate = async (job: InferenceJob) => {
        const start = performance.now();
        const response = await adapter.generate(job, model, AbortSignal.timeout(120_000));
        return { response, elapsed: performance.now() - start };
      };
      const apply = (job: InferenceJob, response: Awaited<ReturnType<typeof adapter.generate>>) =>
        send(
          {
            type: 'agentResult',
            jobId: job.id,
            output: response.output,
            promptTokens: response.promptTokens,
          },
          'inference',
        );
      try {
        const npc = host.npcs.find((n) => n.profileId === profile.id)!;
        npc.affinity = -10; // Deliberately low trust for boundary requests.
        host.player.x = npc.x;
        host.player.y = npc.y;
        requireReceipt(
          send({
            type: 'configureContext',
            settings: ContextSettingsSchema.parse({
              dialogueModel: model,
              backgroundModel: model,
              contextTokens: 4096,
              backgroundCpu: false,
            }),
          }),
        );
        compactions[profile.id] = 0;
        requireReceipt(send({ type: 'interact', npcId: npc.profileId }));
        for (let index = 0; index < VILLAGER_TURNS.length; index++) {
          const prompt = VILLAGER_TURNS[index]!;
          requireReceipt(send({ type: 'dialogue', text: prompt }));
          const job = host.frame().jobs.find((j) => j.kind === 'dialogue');
          if (!job) throw Error('No dialogue job');
          const { response, elapsed } = await generate(job);
          const parsed = DialogueResponseSchema.parse(response.output);
          const actionError = new AgentActionValidator().validate(npc, parsed.action, {
            calendar: host.calendar,
            world: host.world,
            resources: host.resources,
            locator: host.locator,
            npcs: host.npcs,
            player: host.player,
            markers: host.markers,
          });
          const worldFacts = host.query.perceivedFacts(npc.profileId);
          const receipt = apply(job, response);
          turns.push({
            id: `${profile.id}:${index + 1}`,
            npc: profile.id,
            turn: index + 1,
            session,
            prompt,
            response: parsed,
            actionError,
            accepted: receipt.ok,
            firstTokenMs: response.firstTokenMs ?? null,
            fullMs: elapsed,
            worldFacts,
          });
          requireReceipt(receipt);
          const compact = host.frame().jobs.find((j) => j.kind === 'compaction');
          if (compact) {
            const before = JSON.stringify(npc.memory);
            const generated = await generate(compact);
            requireReceipt(apply(compact, generated.response));
            if (JSON.stringify(npc.memory) !== before)
              throw Error('Compaction mutated persistent memory');
            compactions[profile.id] = (compactions[profile.id] ?? 0) + 1;
          }
          if ((SESSION_ENDS as readonly number[]).includes(index + 1)) {
            requireReceipt(send({ type: 'closeDialogue' }));
            const extraction = host.frame().jobs.find((j) => j.kind === 'extraction');
            if (!extraction) throw Error('Session did not produce bounded extraction');
            const generated = await generate(extraction);
            extractionMs.push(generated.elapsed);
            requireReceipt(apply(extraction, generated.response));
            if (index + 1 < VILLAGER_TURNS.length) {
              session++;
              requireReceipt(send({ type: 'interact', npcId: npc.profileId }));
            }
          }
          // Preserve progress after every actual response; failed runs remain evidence.
          await writeFile(transcriptPath, JSON.stringify(transcript, null, 2) + '\n');
        }
      } finally {
        host.dispose();
      }
    }
  }
} catch (cause) {
  error = cause instanceof Error ? cause.message : String(cause);
}
if (!process.argv.includes('--review'))
  await writeFile(
    transcriptPath,
    JSON.stringify({ ...transcript, ...(error ? { error } : {}) }, null, 2) + '\n',
  );
const transcriptSha256 = hash(await readFile(transcriptPath, 'utf8'));
const reviews = process.env.VILLAGER_REVIEWS
  ? VillagerReviewsSchema.parse(JSON.parse(await readFile(process.env.VILLAGER_REVIEWS, 'utf8')))
  : undefined;
const result = evaluateVillagers(
  transcript.turns,
  transcriptSha256,
  transcript.compactions,
  transcript.extractionMs,
  reviews,
);
const report = {
  ...result,
  sourceSha: transcript.sourceSha,
  model: transcript.model,
  transcriptSha256,
  recordedAt: new Date().toISOString(),
  ...(error ? { error } : {}),
  gaps: reviews
    ? []
    : [
        'M1/M2/M3 require independent transcript-bound annotations; no quality approval is inferred.',
      ],
};
await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!result.passed || error) process.exitCode = 1;
