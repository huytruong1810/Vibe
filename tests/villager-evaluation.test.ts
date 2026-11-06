import { expect, it } from 'vitest';
import { CommandPayloadSchema } from '../src/domain/contracts';
import { ContextSettingsSchema } from '../src/domain/conversation';
import {
  VILLAGER_TURNS,
  SESSION_ENDS,
  evaluateVillagers,
  personaMetrics,
  type EvaluationTurn,
  type VillagerReviews,
} from '../scripts/lib/villager-evaluation';

it('uses twenty valid player turns across three sessions and a shared GPU default', () => {
  expect(VILLAGER_TURNS).toHaveLength(20);
  expect(SESSION_ENDS).toEqual([7, 14, 20]);
  for (const text of VILLAGER_TURNS)
    expect(CommandPayloadSchema.safeParse({ type: 'dialogue', text }).success).toBe(true);
  expect(ContextSettingsSchema.parse({})).toMatchObject({
    dialogueModel: 'gemma4-abliterated:e4b',
    backgroundModel: 'gemma4-abliterated:e4b',
    backgroundCpu: false,
  });
  expect(
    ContextSettingsSchema.parse({ dialogueModel: 'gemma4-abliterated:26b', backgroundCpu: true }),
  ).toMatchObject({ dialogueModel: 'gemma4-abliterated:26b', backgroundCpu: true });
});
const turn: EvaluationTurn = {
  id: 'npc:test:1',
  npc: 'npc:test',
  turn: 12,
  session: 2,
  prompt: 'Rumor?',
  response: { dialogue: 'Someone told me that.', emotion: 'neutral', action: { type: 'NONE' } },
  actionError: null,
  accepted: true,
  firstTokenMs: 100,
  fullMs: 500,
  worldFacts: {},
};
const digest = 'a'.repeat(64);
const reviews: VillagerReviews = {
  transcriptSha256: digest,
  reviewer: 'independent fixture reviewer',
  turns: [
    {
      id: turn.id,
      claims: [],
      unsupportedClaim: false,
      completedClaim: false,
      invalidatedPromise: false,
      recall: true,
      rumorHedged: true,
    },
  ],
};

it('rejects missing, duplicate and stale quality annotations rather than treating mocks as acceptance', () => {
  expect(evaluateVillagers([turn], digest, {}, [], undefined).metrics.M1.passed).toBe(false);
  expect(evaluateVillagers([turn], digest, {}, [], reviews).metrics.M1.passed).toBe(true);
  expect(evaluateVillagers([turn], 'b'.repeat(64), {}, [], reviews).reviewed).toBe(false);
  expect(
    evaluateVillagers([turn], digest, {}, [], {
      ...reviews,
      turns: [...reviews.turns, ...reviews.turns],
    }).reviewed,
  ).toBe(false);
  const result = evaluateVillagers([turn], digest, {}, [], reviews);
  expect(result.metrics.M2.passed).toBe(true);
  expect(result.passed).toBe(false); // Shape, ten personas and extraction receipts are mandatory.
});
it('rejects action/prose mismatch, completed staged claims, unhedged rumors and missing TTFT', () => {
  const unsupported = {
    ...reviews,
    turns: [
      { ...reviews.turns[0]!, claims: [{ type: 'DROP_GIFT' as const, itemId: 'water' as const }] },
    ],
  };
  expect(evaluateVillagers([turn], digest, {}, [], unsupported).metrics.M1.passed).toBe(false);
  expect(
    evaluateVillagers([turn], digest, {}, [], {
      ...reviews,
      turns: [{ ...reviews.turns[0]!, completedClaim: true }],
    }).metrics.M1.passed,
  ).toBe(false);
  expect(
    evaluateVillagers([turn], digest, {}, [], {
      ...reviews,
      turns: [{ ...reviews.turns[0]!, rumorHedged: false }],
    }).metrics.M2.passed,
  ).toBe(false);
  expect(
    evaluateVillagers([{ ...turn, firstTokenMs: null }], digest, {}, [], reviews).metrics.M5.passed,
  ).toBe(false);
});
it('detects copied personas and identical cadence deterministically', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({
    ...turn,
    id: `npc:${i}:1`,
    npc: `npc:${i}`,
  }));
  const a = personaMetrics(rows);
  expect(a).toEqual(personaMetrics(rows));
  expect(a.pairs).toHaveLength(45);
  expect(a.passed).toBe(false);
  expect(a.pairs.every((p) => p.jaccard === 1 && p.cadenceP === 1)).toBe(true);
});
