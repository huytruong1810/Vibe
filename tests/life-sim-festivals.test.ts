import { describe, it, expect } from 'vitest';
import {
  VILLAGER_BIRTHDAYS,
  FESTIVALS,
  isVillagerBirthday,
  getFestivalForDay,
} from '../src/content/villagers';
import {
  HEART_EVENT_SKELETONS,
  validateHeartEventSkeleton,
  getEligibleHeartEvents,
} from '../src/content/heart-events';
import { SimulationHost } from '../src/domain/simulation';
import { send } from './helpers';

describe('LIF-M3, LIF-M4, LIF-M5 Villager Birthdays, Festivals & Heart Events', () => {
  it('authors valid 28-day calendar birthdays for all 10 Aqualia villagers (LIF-4.1, LIF-M3)', () => {
    const villagers = [
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

    for (const npcId of villagers) {
      const bday = VILLAGER_BIRTHDAYS[npcId];
      expect(bday, `Missing birthday for ${npcId}`).toBeDefined();
      if (!bday) continue;
      expect(bday.season).toBeGreaterThanOrEqual(0);
      expect(bday.season).toBeLessThanOrEqual(3);
      expect(bday.day).toBeGreaterThanOrEqual(1);
      expect(bday.day).toBeLessThanOrEqual(7);

      expect(isVillagerBirthday(npcId, bday.season, bday.day)).toBe(true);
      expect(isVillagerBirthday(npcId, bday.season, (bday.day % 7) + 1)).toBe(false);
    }
  });

  it('triggers 4x gift affinity multiplier and celebration dialogue on villager birthday (LIF-3.2, LIF-M3)', () => {
    // Caelum birthday: Season 0, Day 3 -> world day 2 (0-indexed days 0, 1, 2)
    const host = new SimulationHost(42, 1, 0, 'world:lifesim:birthday');
    const npcId = 'npc:caelum';
    const bday = VILLAGER_BIRTHDAYS[npcId];
    expect(bday).toBeDefined();
    if (!bday) throw new Error('Caelum birthday missing');

    // Advance calendar to Caelum's birthday
    // day = season * 7 + (bday.day - 1)
    const targetDay = bday.season * 7 + (bday.day - 1);
    const targetSeconds = targetDay * 1440 + 360; // 06:00 on birthday
    host.calendar.elapsedSeconds = targetSeconds;

    expect(host.calendar.season).toBe(bday.season);
    expect((host.calendar.day % 7) + 1).toBe(bday.day);

    const npc = host.npcs.find((n) => n.profileId === npcId)!;
    const initialAffinity = npc.affinity;

    // Equip water (loved gift: base delta +8) into slot 0
    host.inventory.set(0, { id: 'water', instance: 'item:test:water' });

    // Interact and offer gift
    expect(send(host, { type: 'interact', npcId }).ok).toBe(true);
    const result = send(host, { type: 'giveGift', npcId, slot: 0 });
    expect(result.ok).toBe(true);

    // Loved gift delta is 8 * 4 = 32 on birthday
    expect(npc.affinity).toBe(initialAffinity + 32);

    // Dialogue line includes birthday acknowledgment
    const lastLine = host.dialogue?.lines.at(-1);
    expect(lastLine).toBeDefined();
    expect(lastLine!.text).toMatch(/birthday/i);
    expect(lastLine!.emotion).toBe('warm');
  });

  it('defines 4 canonical seasonal festivals with Day 7 schedule overrides (LIF-4.2, LIF-4.3, LIF-M3)', () => {
    expect(FESTIVALS.length).toBe(4);

    const spring = FESTIVALS.find((f) => f.season === 0)!;
    expect(spring).toBeDefined();
    expect(spring.id).toBe('festival:reedlight-float');
    expect(spring.name).toBe('Reedlight Float');
    expect(spring.village).toBe('village:aqualia');
    expect(spring.day).toBe(7);

    const summer = FESTIVALS.find((f) => f.season === 1)!;
    expect(summer).toBeDefined();
    expect(summer.id).toBe('festival:kiln-fair');
    expect(summer.name).toBe('Kiln Fair');
    expect(summer.day).toBe(7);

    const autumn = FESTIVALS.find((f) => f.season === 2)!;
    expect(autumn).toBeDefined();
    expect(autumn.id).toBe('festival:kite-moon');
    expect(autumn.name).toBe('Kite Moon');
    expect(autumn.day).toBe(7);

    const winter = FESTIVALS.find((f) => f.season === 3)!;
    expect(winter).toBeDefined();
    expect(winter.id).toBe('festival:hearth-night');
    expect(winter.name).toBe('Hearth Night');
    expect(winter.day).toBe(7);

    // Helper checks
    expect(getFestivalForDay(0, 7)).toEqual(spring);
    expect(getFestivalForDay(0, 3)).toBeNull();
    expect(getFestivalForDay(2, 7)).toEqual(autumn);

    // Simulation snapshot exposes active festival on day 7
    const host = new SimulationHost(42, 1, 0, 'world:lifesim:festival');
    host.calendar.elapsedSeconds = 6 * 1440 + 720; // Season 0, Day 7 (day index 6) at noon
    const snapshot = host.frame();
    expect(snapshot.festival).toBeDefined();
    expect(snapshot.festival?.name).toBe('Reedlight Float');

    // Aqualia villagers show festival participation in snapshot
    const oren = snapshot.npcs.find((n) => n.profileId === 'npc:oren');
    expect(oren).toBeDefined();
    expect(oren!.activity).toMatch(/Reedlight Float|festival|celebrating/i);
  });

  it('authors grounded heart-event skeletons across milestone thresholds (LIF-5.1, LIF-M4, LIF-M5)', () => {
    expect(HEART_EVENT_SKELETONS.length).toBeGreaterThanOrEqual(10);

    for (const skeleton of HEART_EVENT_SKELETONS) {
      expect(validateHeartEventSkeleton(skeleton)).toBe(true);
      expect([2, 4, 6, 8, 10]).toContain(skeleton.hearts);
      expect(skeleton.beats.length).toBeGreaterThanOrEqual(2);

      // Verify all dialogue beats carry valid emotions (LIF-M5)
      for (const beat of skeleton.beats) {
        expect([
          'neutral',
          'warm',
          'thoughtful',
          'curious',
          'concerned',
          'amused',
          'angry',
          'sad',
          'fearful',
        ]).toContain(beat.emotion);
      }
    }

    // Check eligible heart events calculation
    const eligibleForCaelumAt4Hearts = getEligibleHeartEvents('npc:caelum', 4);
    expect(eligibleForCaelumAt4Hearts.some((e) => e.hearts === 2)).toBe(true);
    expect(eligibleForCaelumAt4Hearts.some((e) => e.hearts === 4)).toBe(true);
    expect(eligibleForCaelumAt4Hearts.some((e) => e.hearts === 8)).toBe(false);
  });
});
