import { describe, expect, it } from 'vitest';
import {
  CompactionSummarySchema,
  ContextSettingsSchema,
  ConversationContext,
} from '../src/domain/conversation';
import { MemoryRepository, NpcProfileRegistry, PlanService } from '../src/domain/agents';
import { SimulationHost } from '../src/domain/simulation';
import { CONFIG } from '../src/domain/values';
import { send } from './helpers';

const summary = {
  gist: 'We discussed the bridge.',
  playerAsked: ['Meet at the bridge'],
  villagerPromised: ['Bring a blue ribbon'],
  decided: [],
  open: [],
  mood: 'hopeful',
};
function setup() {
  const npc = new NpcProfileRegistry().create()[0]!;
  const context = new ConversationContext();
  const plans = new PlanService(new MemoryRepository(), () => ({}), context);
  context.open(npc.profileId);
  return { npc, context, plans };
}
function fill(context: ConversationContext, count = 18) {
  for (let i = 0; i < count; i++)
    context.append(i % 2 ? 'npc' : 'player', `${i}: ${'river '.repeat(175)}`);
}
describe('conversation context', () => {
  it('triggers once at projected 75%, retains four entries, and never mutates memory', () => {
    const { npc, context, plans } = setup();
    fill(context, 6);
    expect(plans.compaction(npc, 'world:test')).toBeNull();
    fill(context, 12);
    const before = structuredClone(npc.memory);
    const job = plans.compaction(npc, 'world:test')!;
    expect(job).not.toBeNull();
    expect(plans.compaction(npc, 'world:test')).toBeNull();
    expect(job.model).toBe('gemma4-abliterated:e4b');
    expect(job.numGpu).toBe(0);
    expect(context.count(job.messages, job.model)).toBeLessThanOrEqual(context.budget(768));
    expect(context.apply(job.id, job.compactionTarget!, summary)).toBe(true);
    const messages = context.prompt('rules', {}, [], {}, 'next question');
    const recent = context.session!.turns.slice(context.session!.summarizedThrough);
    expect(recent).toHaveLength(4);
    expect(messages.slice(-5, -1).map((m) => m.content)).toEqual(recent.map((t) => t.text));
    expect(messages.find((m) => m.content.startsWith('conversationSoFar:'))?.content).toContain(
      'blue ribbon',
    );
    expect(npc.memory).toEqual(before);
    expect(context.debug.compactions).toBe(1);
  });
  it('discards changed revisions and closed/reopened sessions and retries later', () => {
    const { npc, context, plans } = setup();
    fill(context);
    const job = plans.compaction(npc, 'world:test')!;
    context.append('player', 'Something changed');
    expect(context.apply(job.id, job.compactionTarget!, summary)).toBe(false);
    expect(context.session!.summary).toBeNull();
    const retry = plans.compaction(npc, 'world:test')!;
    expect(retry).not.toBeNull();
    context.close();
    context.open(npc.profileId);
    fill(context);
    const replacement = plans.compaction(npc, 'world:test')!;
    expect(context.apply(retry.id, retry.compactionTarget!, summary)).toBe(false);
    expect(context.session!.pending).toBe(replacement.id);
    expect(context.apply(replacement.id, replacement.compactionTarget!, summary)).toBe(true);
  });
  it('validates summary caps, rejects malformed results, and releases failed jobs', () => {
    expect(
      CompactionSummarySchema.safeParse({ ...summary, gist: 'word '.repeat(121) }).success,
    ).toBe(false);
    expect(
      CompactionSummarySchema.safeParse({ ...summary, open: Array(6).fill('request') }).success,
    ).toBe(false);
    expect(
      CompactionSummarySchema.safeParse({ ...summary, decided: ['word '.repeat(21)] }).success,
    ).toBe(false);
    const { npc, context, plans } = setup();
    fill(context);
    const job = plans.compaction(npc, 'world:test')!;
    expect(context.apply(job.id, job.compactionTarget!, { summary: 'old shape' })).toBe(false);
    const retry = plans.compaction(npc, 'world:test')!;
    context.release(retry.id);
    expect(plans.compaction(npc, 'world:test')).not.toBeNull();
  });
  it('bounds Unicode prompts for arbitrary transcript sizes and deterministically truncates oldest context', () => {
    for (const contextTokens of [4096, 8192, 16384]) {
      const { context } = setup();
      context.configure({ ...context.settings, contextTokens });
      for (let i = 0; i < 120; i++) {
        context.append(i % 2 ? 'npc' : 'player', `${i} ${'川🌿'.repeat((i * 47) % 250)}`);
        const args = [
          'identity rules',
          { self: 'villager' },
          [{ text: 'river memory' }],
          { weather: 'rain' },
          'latest question',
        ] as const;
        const messages = context.prompt(...args);
        expect(context.count(messages)).toBeLessThanOrEqual(context.budget());
        expect(context.prompt(...args)).toEqual(messages);
        expect(messages.at(-1)!.content).toBe('latest question');
      }
      expect(context.debug.truncated).toBe(true);
      expect(context.session!.turns).toHaveLength(120);
    }
  });
  it('retains authoritative scalar facts and core identity when large lists exceed sub-budgets', () => {
    const { context } = setup();
    const messages = context.prompt(
      'rules',
      { name: 'Lark', summary: 'old memory '.repeat(1000) },
      [],
      {
        day: 4,
        giftAvailable: true,
        nearbyCreatures: Array.from({ length: 100 }, () => ({ name: 'Bramblefang', x: 12, y: 8 })),
      },
      'Hello',
    );
    const core = messages.find((m) => m.content.startsWith('core:'))!.content.slice(6);
    const facts = messages.find((m) => m.content.startsWith('worldFacts:'))!.content.slice(12);
    expect(JSON.parse(core).name).toBe('Lark');
    expect(JSON.parse(facts)).toMatchObject({ day: 4, giftAvailable: true });
    expect(context.estimate(core)).toBeLessThanOrEqual(300);
    expect(context.estimate(facts)).toBeLessThanOrEqual(300);
  });
  it('calibrates estimates per model and keeps calibrated prompts and jobs within budget', () => {
    const { context, plans, npc } = setup();
    fill(context);
    const messages = context.prompt('rules', {}, [], {}, 'hello');
    const before = context.estimate('calibration');
    context.calibrate(context.settings.dialogueModel, messages, context.count(messages) * 2);
    expect(context.estimate('calibration')).toBeGreaterThan(before);
    expect(context.estimate('calibration', 'another-model')).toBe(before);
    expect(context.count(context.prompt('rules', {}, [], {}, 'hello'))).toBeLessThanOrEqual(
      context.budget(),
    );
    const job = plans.compaction(npc, 'world:test')!;
    expect(job.contextTokens).toBe(8192);
    context.release(job.id);
    context.configure({ ...context.settings, backgroundCpu: false });
    expect(plans.compaction(npc, 'world:test')!.numGpu).toBeUndefined();
    expect(ContextSettingsSchema.safeParse({ contextTokens: 1024 }).success).toBe(false);
  });
  it('preserves the summary and budget when calibration changes after compaction', () => {
    const { context, plans, npc } = setup();
    fill(context);
    const job = plans.compaction(npc, 'world:test')!;
    expect(context.apply(job.id, job.compactionTarget!, summary)).toBe(true);
    const messages = context.prompt(
      'identity and rules',
      { self: 'villager' },
      [],
      {},
      'player question',
    );
    context.calibrate(context.settings.dialogueModel, messages, context.count(messages) * 100);
    const calibrated = context.prompt(
      'identity and rules',
      { self: 'villager' },
      [],
      {},
      'player question',
    );
    expect(context.count(calibrated)).toBeLessThanOrEqual(context.budget());
    expect(calibrated.find((m) => m.content.startsWith('conversationSoFar:'))?.content).toContain(
      'blue ribbon',
    );
  });
  it('continues 35 exchanges with full memory and bounds frame transcript transport', () => {
    const host = new SimulationHost(42, 1, 0);
    try {
      const npc = host.npcs[10]!;
      npc.memory.records = Array.from({ length: CONFIG.memoryLimit }, (_, i) => ({
        id: `retained:${i}`,
        createdTick: 0,
        lastAccessTick: 0,
        type: 'episodic',
        confidence: 'told',
        text: 'retained',
        subjects: [],
        source: { kind: 'session', ids: [] },
        importance: 5,
      }));
      const before = structuredClone(npc.memory);
      host.player.x = npc.x;
      host.player.y = npc.y;
      expect(send(host, { type: 'interact', npcId: npc.profileId }).ok).toBe(true);
      for (let turn = 0; turn < 35; turn++) {
        expect(
          send(host, { type: 'dialogue', text: `Question ${turn}: ${'river '.repeat(140)}` }).ok,
        ).toBe(true);
        const job = host.frame().jobs.find((j) => j.kind === 'dialogue')!;
        expect(job).toBeDefined();
        expect(
          send(
            host,
            {
              type: 'agentResult',
              jobId: job.id,
              output: {
                dialogue: `Reply ${turn}: ${'bridge '.repeat(60)}`,
                emotion: 'neutral',
                action: { type: 'NONE' },
              },
            },
            'inference',
          ).ok,
        ).toBe(true);
        const compact = host.frame().jobs.find((j) => j.kind === 'compaction');
        if (compact) {
          const memoryBeforeCompaction = structuredClone(npc.memory);
          expect(
            send(host, { type: 'agentResult', jobId: compact.id, output: summary }, 'inference').ok,
          ).toBe(true);
          expect(npc.memory).toEqual(memoryBeforeCompaction);
        }
        expect(host.frame().dialogue!.lines.length).toBeLessThanOrEqual(32);
      }
      expect(npc.memory.records).toEqual(before.records);
      expect(npc.memory.pending.length).toBeGreaterThan(0);
      const view = host.frame().npcs.find((n) => n.profileId === npc.profileId)!;
      expect(view.memory.pending).toEqual([]);
      expect(view.memoryCounts).toEqual({
        active: CONFIG.memoryLimit,
        pending: npc.memory.pending.length,
      });
      expect(host.frame().performance.context!.compactions).toBeGreaterThan(0);
    } finally {
      host.dispose();
    }
  });
});
