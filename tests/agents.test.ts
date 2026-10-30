import { describe, expect, it } from 'vitest';
import {
  AgentActionSchema,
  AgentActionValidator,
  MemoryRepository,
  MemoryRetriever,
  PlanService,
  NpcProfileRegistry,
  PerceptionSystem,
  SocialEncounterSystem,
} from '../src/domain/agents';
import { NPC_PROFILES } from '../src/content/definitions';
import { WorldCalendar } from '../src/domain/core';
import { ResourceLocator, ResourceStore } from '../src/domain/resources';
import { flatWorld } from './helpers';

describe('agent grounding and memory', () => {
  it('budgets complete Unicode memory records without truncating JSON or evicting unseen sources', () => {
    const npc = new NpcProfileRegistry().create()[0]!,
      memories = new MemoryRepository();
    npc.memory.summary = '季'.repeat(1600);
    for (let i = 0; i < 20; i++)
      memories.append(npc, {
        tick: i,
        day: 0,
        kind: 'conversation',
        text: '川'.repeat(1000),
        importance: 5,
        subjects: [],
        sourceIds: [],
      });
    const job = new PlanService(memories).job(
      npc,
      NPC_PROFILES[0]!,
      'world:budget',
      30,
      'compaction',
    );
    const context = JSON.parse(job.messages[1]!.content) as {
      memories: { id: string; text: string }[];
    };
    expect(context.memories.length).toBeGreaterThan(0);
    expect(context.memories.length).toBeLessThan(20);
    expect(job.sourceIds).toEqual(context.memories.map((m) => m.id));
    expect(
      memories.estimateTokens(job.messages.map((m) => m.content).join('')),
    ).toBeLessThanOrEqual(2800);
    expect(context.memories.every((m) => m.text.length === 1000)).toBe(true);
  });
  it('covers NONE and every advertised action, and rejects arbitrary payloads', () => {
    const actions = [
      { type: 'NONE' },
      { type: 'FOLLOW_PLAYER', durationSeconds: 60 },
      { type: 'MOVE_TO_LOCATION', location: 'square', durationSeconds: 60 },
      { type: 'DROP_GIFT', itemId: 'berries' },
      { type: 'OFFER_QUEST_MARKER', resource: 'reeds' },
      {
        type: 'GOSSIP_RELATIONSHIP_SHIFT',
        targetNPCId: 'npc:vulkan',
        tone: 'kind',
        claim: 'He repaired a tool.',
      },
      { type: 'SCHEDULE_OVERRIDE', location: 'shrine', startHour: 10, durationHours: 1 },
      { type: 'PARTNER_GESTURE', gesture: 'spark' },
    ];
    for (const action of actions) expect(AgentActionSchema.safeParse(action).success).toBe(true);
    expect(
      AgentActionSchema.safeParse({ type: 'DROP_GIFT', itemId: 'unlimited_gold' }).success,
    ).toBe(false);
    expect(
      AgentActionSchema.safeParse({
        type: 'GOSSIP_RELATIONSHIP_SHIFT',
        targetNPCId: 'npc:vulkan',
        affinityDelta: 100,
      }).success,
    ).toBe(false);
    expect(AgentActionSchema.safeParse({ type: 'NONE', execute: 'arbitrary code' }).success).toBe(
      false,
    );
  });
  it('only creates memories for witnesses, with supporting event IDs', () => {
    const npcs = new NpcProfileRegistry().create(),
      memory = new MemoryRepository(),
      perception = new PerceptionSystem(memory);
    npcs[0]!.x = 4;
    npcs[0]!.y = 4;
    npcs[1]!.x = 100;
    npcs[1]!.y = 100;
    perception.observe(npcs, {
      id: 'e1',
      tick: 2,
      day: 0,
      x: 4,
      y: 4,
      type: 'care',
      text: 'The player cared for a Rivallie.',
      subjects: ['player'],
      importance: 7,
    });
    expect(npcs[0]!.memory.records[0]?.sourceIds).toEqual(['e1']);
    expect(npcs[1]!.memory.records).toHaveLength(0);
    perception.observe(npcs, {
      id: 'e1',
      tick: 2,
      day: 0,
      x: 4,
      y: 4,
      type: 'care',
      text: 'Repeated event.',
      subjects: ['player'],
      importance: 7,
    });
    expect(npcs[0]!.memory.records).toHaveLength(1);
  });
  it('retrieves relevant memories and preserves source turns if compaction is stale', () => {
    const npc = new NpcProfileRegistry().create()[0]!,
      memories = new MemoryRepository();
    const a = memories.append(npc, {
      tick: 1,
      day: 0,
      kind: 'conversation',
      text: 'We promised to inspect the river bridge.',
      importance: 8,
      sourceIds: [],
      subjects: ['player'],
    })!;
    memories.append(npc, {
      tick: 2,
      day: 0,
      kind: 'fact',
      text: 'The wheat looks healthy.',
      importance: 1,
      sourceIds: ['e2'],
      subjects: [],
    });
    expect(new MemoryRetriever().retrieve(npc, 'river bridge', 3, 1)[0]?.id).toBe(a.id);
    const revision = npc.memory.revision;
    memories.append(npc, {
      tick: 3,
      day: 0,
      kind: 'conversation',
      text: 'We should bring a companion.',
      importance: 5,
      sourceIds: [],
      subjects: [],
    });
    expect(
      memories.compact(npc, revision, [a.id], {
        summary: 'We plan to inspect the bridge.',
        sourceIds: [a.id],
      }),
    ).toBe(false);
    expect(npc.memory.records.some((r) => r.id === a.id)).toBe(true);
    expect(
      memories.compact(npc, npc.memory.revision, [a.id], {
        summary: 'Unsupported.',
        sourceIds: ['invented'],
      }),
    ).toBe(false);
    expect(
      memories.compact(npc, npc.memory.revision, [a.id], {
        summary: 'We plan to inspect the bridge.',
        sourceIds: [a.id],
      }),
    ).toBe(true);
    expect(npc.memory.records.some((r) => r.id === a.id)).toBe(false);
  });
  it('shares attributed hearsay without recursively broadcasting hearsay as a fact', () => {
    const npcs = new NpcProfileRegistry().create().slice(0, 2),
      memory = new MemoryRepository(),
      social = new SocialEncounterSystem(memory);
    npcs.forEach((n) => {
      n.x = 4;
      n.y = 4;
    });
    memory.append(npcs[0]!, {
      tick: 1,
      day: 0,
      kind: 'fact',
      text: 'The player found a river herb.',
      importance: 5,
      subjects: ['player'],
      sourceIds: ['event:herb'],
    });
    expect(social.advance(npcs, 100, 2, 0)).not.toBeNull();
    expect(npcs[1]!.memory.records[0]?.kind).toBe('hearsay');
    expect(npcs[1]!.memory.records[0]?.sourceIds).toEqual(['event:herb']);
    social.advance(npcs, 200, 3, 0);
    expect(npcs[1]!.memory.records).toHaveLength(1);
  });
  it('authorizes gifts through a daily allowance and rejects impossible partner gestures', () => {
    const world = flatWorld(),
      resources = new ResourceStore(world),
      npc = new NpcProfileRegistry().create()[0]!,
      calendar = new WorldCalendar(),
      validator = new AgentActionValidator();
    Object.assign(resources.supplies[0]!, { x: 4, y: 4 });
    npc.x = 4;
    npc.y = 4;
    npc.affinity = 5;
    const context = {
      world,
      resources,
      locator: new ResourceLocator(resources),
      calendar,
      npcs: [npc],
      player: { x: 4, y: 4 },
      markers: [],
    };
    expect(validator.execute(npc, { type: 'DROP_GIFT', itemId: 'berries' }, context).ok).toBe(true);
    expect(validator.execute(npc, { type: 'DROP_GIFT', itemId: 'berries' }, context).ok).toBe(
      false,
    );
    expect(resources.drops).toHaveLength(1);
    expect(validator.execute(npc, { type: 'PARTNER_GESTURE', gesture: 'spark' }, context).ok).toBe(
      false,
    );
    calendar.advance(1440);
    expect(validator.execute(npc, { type: 'DROP_GIFT', itemId: 'water' }, context).ok).toBe(true);
  });
});
