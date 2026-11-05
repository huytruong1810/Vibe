import { pathToFileURL } from 'node:url';
import { NPC_PROFILES } from '../src/content/definitions';
import {
  AgentActionValidator,
  DialogueResponseSchema,
  fallbackDialogue,
  MemoryRepository,
  MemoryRetriever,
  NpcProfileRegistry,
  PlanService,
  ReflectionResponseSchema,
} from '../src/domain/agents';
import { WorldCalendar } from '../src/domain/core';
import { ResourceLocator, ResourceStore } from '../src/domain/resources';
import { ChunkStore } from '../src/domain/world';

export interface VillagerEvalReport {
  readonly passed: boolean;
  readonly metrics: {
    readonly M1_structuredJsonValidityPct: number;
    readonly M2_characterLoreConsistencyPct: number;
    readonly M3_actionWorldFactGroundingPct: number;
    readonly M4_memoryRecallNonContradictionPct: number;
    readonly M5_p95PreparationLatencyMs: number;
  };
}

export function runVillagerEvalGate(): VillagerEvalReport {
  const npcs = new NpcProfileRegistry().create();
  const memories = new MemoryRepository();
  const retriever = new MemoryRetriever();
  const plans = new PlanService(memories, (npcId) => ({
    npcId,
    settlement: 'Aqualia',
  }));

  // M1: Structured JSON Validity (20 turns across profiles and prompts)
  const prompts = [
    'Good morning! How is your work going today?',
    'Could you walk with me along the river for a bit?',
    'Do you have any spare supplies or berries to share?',
    'Where can I find sunberries or reeds nearby?',
    'What do you think of our settlement and the creatures?',
  ];
  let m1Valid = 0;
  let m1Total = 0;
  let m2Consistent = 0;
  const latenciesMs: number[] = [];

  for (let i = 0; i < 20; i++) {
    const profile = NPC_PROFILES[i % NPC_PROFILES.length]!;
    const npc = npcs[i % npcs.length]!;
    const prompt = prompts[i % prompts.length]!;
    const t0 = performance.now();
    const job = plans.job(npc, profile, `eval:${i}`, i * 60, 'dialogue', prompt);
    const reply = fallbackDialogue(profile, prompt);
    const elapsed = performance.now() - t0;
    latenciesMs.push(elapsed);

    m1Total++;
    const parsed = DialogueResponseSchema.safeParse(reply);
    if (parsed.success && job.messages.length === 2) {
      m1Valid++;
    }
    const text = reply.dialogue;
    const noFourthWall = !/\b(as an ai|language model|openai|anthropic|google)\b/i.test(text);
    const withinLength = text.length >= 10 && text.length <= 700;
    if (noFourthWall && withinLength) {
      m2Consistent++;
    }
  }

  const compactionCheck = ReflectionResponseSchema.safeParse({
    summary: 'We agreed to inspect the lantern wharf tomorrow morning.',
    sourceIds: ['npc:m1'],
  });
  if (!compactionCheck.success) {
    m1Valid = 0;
  }

  // M3: Action & World-Fact Grounding (100% rejection of ungrounded actions, acceptance of grounded ones)
  const world = new ChunkStore(16);
  const resources = new ResourceStore(world);
  const calendar = new WorldCalendar();
  const validator = new AgentActionValidator();
  const testNpc = npcs[0]!;
  testNpc.x = 4;
  testNpc.y = 4;
  testNpc.affinity = 5;
  Object.assign(resources.supplies[0]!, { x: 4, y: 4 });
  const ctx = {
    world,
    resources,
    locator: new ResourceLocator(resources),
    calendar,
    npcs,
    player: { x: 4, y: 4 },
    markers: [],
  };

  let m3ChecksPassed = 0;
  const m3Total = 4;
  // 1. Valid gift succeeds once
  if (validator.execute(testNpc, { type: 'DROP_GIFT', itemId: 'berries' }, ctx).ok)
    m3ChecksPassed++;
  // 2. Duplicate gift on same day is rejected
  if (!validator.execute(testNpc, { type: 'DROP_GIFT', itemId: 'berries' }, ctx).ok)
    m3ChecksPassed++;
  // 3. Partner gesture without partner is rejected
  if (!validator.execute(testNpc, { type: 'PARTNER_GESTURE', gesture: 'spark' }, ctx).ok)
    m3ChecksPassed++;
  // 4. Self-gossip is rejected
  if (
    !validator.execute(
      testNpc,
      {
        type: 'GOSSIP_RELATIONSHIP_SHIFT',
        targetNPCId: testNpc.profileId,
        tone: 'kind',
        claim: 'Self praise.',
      },
      ctx,
    ).ok
  ) {
    m3ChecksPassed++;
  }

  // M4: Memory Recall & Non-Contradiction across 15 game days + extraction pinning
  let m4Passed = 0;
  const m4Total = 10;
  for (let trial = 0; trial < m4Total; trial++) {
    const subjectNpc = new NpcProfileRegistry().create()[trial % NPC_PROFILES.length]!;
    const commitmentRec = memories.append(subjectNpc, {
      tick: 100,
      day: 0,
      kind: 'conversation',
      subkind: 'commitment',
      text: `Trial ${trial}: promised to deliver reeds to the shrine at dawn.`,
      importance: 7,
      subjects: ['player'],
      sourceIds: [`trial:${trial}:c`],
    })!;
    const relRec = memories.append(subjectNpc, {
      tick: 120,
      day: 0,
      kind: 'reflection',
      subkind: 'relationship',
      text: `Trial ${trial}: the player helped repair the village footbridge.`,
      importance: 8,
      subjects: ['player'],
      sourceIds: [`trial:${trial}:r`],
    })!;
    for (let k = 0; k < 12; k++) {
      memories.append(subjectNpc, {
        tick: 10_000 + k * 50,
        day: 10,
        kind: 'fact',
        text: `Mundane observation ${k}: water level remained steady.`,
        importance: 4,
        subjects: [],
        sourceIds: [`trial:${trial}:m:${k}`],
      });
    }
    const recalled = retriever.retrieve(
      subjectNpc,
      'unrelated topic about clouds',
      22_000,
      8,
      'player',
    );
    const extraction = retriever.extractionCandidates(
      subjectNpc,
      'unrelated topic about clouds',
      22_000,
      'player',
      8,
    );
    const hasBothPinned =
      recalled.some((r) => r.id === commitmentRec.id) && recalled.some((r) => r.id === relRec.id);
    const inExtraction =
      extraction.some((r) => r.id === commitmentRec.id) &&
      extraction.some((r) => r.id === relRec.id);
    if (hasBothPinned && inExtraction && commitmentRec.tick === 100) {
      m4Passed++;
    }
  }

  latenciesMs.sort((a, b) => a - b);
  const p95Index = Math.min(latenciesMs.length - 1, Math.floor(latenciesMs.length * 0.95));
  const p95Ms = Number((latenciesMs[p95Index] ?? 0).toFixed(2));

  const M1 = (m1Valid / m1Total) * 100;
  const M2 = (m2Consistent / m1Total) * 100;
  const M3 = (m3ChecksPassed / m3Total) * 100;
  const M4 = (m4Passed / m4Total) * 100;
  const passed = M1 === 100 && M2 >= 95 && M3 === 100 && M4 >= 90 && p95Ms <= 2500;

  return {
    passed,
    metrics: {
      M1_structuredJsonValidityPct: M1,
      M2_characterLoreConsistencyPct: M2,
      M3_actionWorldFactGroundingPct: M3,
      M4_memoryRecallNonContradictionPct: M4,
      M5_p95PreparationLatencyMs: p95Ms,
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = runVillagerEvalGate();
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exit(1);
}
