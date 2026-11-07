import { describe, it, expect } from 'vitest';
import {
  VILLAGER_GIFT_PREFERENCES,
  evaluateGiftTaste,
  giftAffinityDelta,
  giftReactionEmotion,
} from '../src/content/villagers';
import { calculateVillagerHearts } from '../src/domain/agents';
import { SimulationHost } from '../src/domain/simulation';
import { send } from './helpers';

describe('LIF-M1 & LIF-M2 Villager 10-step Hearts & Gift Taste Tables', () => {
  it('maps affinity substrate into 10 fixed heart steps (LIF-2.3, LIF-M1)', () => {
    // Negative affinity yields 0 hearts
    expect(calculateVillagerHearts(-50)).toBe(0);
    expect(calculateVillagerHearts(-1)).toBe(0);

    // 0..9 affinity yields 0 hearts
    expect(calculateVillagerHearts(0)).toBe(0);
    expect(calculateVillagerHearts(9)).toBe(0);

    // 10..19 yields 1 heart
    expect(calculateVillagerHearts(10)).toBe(1);
    expect(calculateVillagerHearts(19)).toBe(1);

    // 50..59 yields 5 hearts
    expect(calculateVillagerHearts(50)).toBe(5);
    expect(calculateVillagerHearts(55)).toBe(5);

    // 80..89 yields 8 hearts (favours and daily small gifts tier)
    expect(calculateVillagerHearts(80)).toBe(8);

    // 100 yields 10 hearts maximum
    expect(calculateVillagerHearts(100)).toBe(10);
    expect(calculateVillagerHearts(150)).toBe(10);
  });

  it('authors distinct gift taste tables for all 10 Aqualia villagers (LIF-3.1, LIF-M2)', () => {
    const aqualiaVillagers = [
      'npc:caelum',
      'npc:marina',
      'npc:neris',
      'npc:reed',
      'npc:willa',
      'npc:oren',
      'npc:mira',
      'npc:lark',
      'npc:dara',
      'npc:finn',
    ];

    for (const npcId of aqualiaVillagers) {
      const tastes = VILLAGER_GIFT_PREFERENCES[npcId];
      expect(tastes, `Missing gift taste table for ${npcId}`).toBeDefined();
      if (!tastes) continue;
      expect(tastes.loved.length).toBeGreaterThan(0);
      expect(tastes.liked.length).toBeGreaterThan(0);
      expect(tastes.disliked.length).toBeGreaterThan(0);
      expect(tastes.hated.length).toBeGreaterThan(0);

      // Verify no overlap between categories for the same villager
      const allAuthored = [...tastes.loved, ...tastes.liked, ...tastes.disliked, ...tastes.hated];
      const unique = new Set(allAuthored);
      expect(unique.size).toBe(allAuthored.length);
    }

    // Check specific lore-grounded tastes
    expect(evaluateGiftTaste('npc:caelum', 'water')).toBe('loved');
    expect(evaluateGiftTaste('npc:caelum', 'sword')).toBe('hated');

    expect(evaluateGiftTaste('npc:marina', 'fiber')).toBe('loved');
    expect(evaluateGiftTaste('npc:marina', 'reeds')).toBe('loved');

    expect(evaluateGiftTaste('npc:willa', 'poultice')).toBe('loved');
    expect(evaluateGiftTaste('npc:willa', 'ashgrass')).toBe('hated');

    expect(evaluateGiftTaste('npc:lark', 'canvas')).toBe('loved');
    expect(evaluateGiftTaste('npc:lark', 'painting')).toBe('loved');

    expect(evaluateGiftTaste('npc:mira', 'berries')).toBe('loved');
    expect(evaluateGiftTaste('npc:mira', 'spear')).toBe('hated');
  });

  it('evaluates affinity deltas and emotions for each taste tier with 4x birthday scaling (LIF-3.2)', () => {
    expect(giftAffinityDelta('loved', false)).toBe(8);
    expect(giftAffinityDelta('liked', false)).toBe(4);
    expect(giftAffinityDelta('neutral', false)).toBe(2);
    expect(giftAffinityDelta('disliked', false)).toBe(-4);
    expect(giftAffinityDelta('hated', false)).toBe(-8);

    // Birthday 4x multiplier
    expect(giftAffinityDelta('loved', true)).toBe(32);
    expect(giftAffinityDelta('liked', true)).toBe(16);
    expect(giftAffinityDelta('neutral', true)).toBe(8);
    expect(giftAffinityDelta('disliked', true)).toBe(-16);
    expect(giftAffinityDelta('hated', true)).toBe(-32);

    // Expressions
    expect(giftReactionEmotion('loved')).toBe('warm');
    expect(giftReactionEmotion('hated')).toBe('angry');
    expect(giftReactionEmotion('disliked')).toBe('concerned');
  });

  it('handles player gifting in SimulationHost, enforcing one gift per day and recording discovered tastes', () => {
    const host = new SimulationHost(42, 1, 0, 'world:lifesim:gifting');
    const npcId = 'npc:caelum';
    const npc = host.npcs.find((n) => n.profileId === npcId)!;
    expect(npc).toBeDefined();
    const initialAffinity = npc.affinity;

    // Equip water (loved by Caelum) into player slot 0
    host.inventory.set(0, { id: 'water', instance: 'item:test:water' });

    // Start conversation with Caelum
    expect(send(host, { type: 'interact', npcId }).ok).toBe(true);

    // Give gift from slot 0
    const result = send(host, { type: 'giveGift', npcId, slot: 0 });
    expect(result.ok).toBe(true);

    // Water removed from slot 0
    expect(host.inventory.state[0]).toBeNull();

    // Affinity increased by 8 points (loved gift)
    expect(npc.affinity).toBe(initialAffinity + 8);

    // Taste recorded in discovered tastes
    expect(npc.discoveredTastes).toBeDefined();
    expect(npc.discoveredTastes!['water']).toBe('loved');

    // Dialogue line added with emotion 'warm'
    expect(host.dialogue).toBeDefined();
    const lastLine = host.dialogue!.lines.at(-1);
    expect(lastLine).toBeDefined();
    expect(lastLine!.speaker).toBe('npc');
    expect(lastLine!.emotion).toBe('warm');

    // Second gift in same day is rejected
    host.inventory.set(0, { id: 'flint', instance: 'item:test:flint' });
    const secondResult = send(host, { type: 'giveGift', npcId, slot: 0 });
    expect(secondResult.ok).toBe(false);
    expect(secondResult.message).toMatch(/already received a gift today/);

    // Frame snapshot exposes hearts mapped from affinity
    const snapshot = host.frame();
    const snapNpc = snapshot.npcs.find((n) => n.profileId === npcId)!;
    expect(snapNpc).toBeDefined();
    expect(snapNpc.hearts).toBe(calculateVillagerHearts(snapNpc.affinity));
  });
});
