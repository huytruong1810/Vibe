import { NPC_PROFILES, SPECIES } from '../content/definitions';
import type { NpcState } from './agents';
import type { CreatureStateStore } from './creatures';
import { SeasonSystem, type WorldCalendar } from './core';
import { SettlementPlanner, nearestSettlement } from './world';
import { distanceSquared, type NpcId } from './values';

/** Read-only, actor-scoped facts. A prompt never receives the complete world store. */
export class WorldQuery {
  constructor(
    private readonly npcs: readonly NpcState[],
    private readonly creatures: CreatureStateStore,
    private readonly calendar: WorldCalendar,
  ) {}
  perceivedFacts(npcId: NpcId): object {
    const index = this.npcs.findIndex((n) => n.profileId === npcId);
    if (index < 0) throw new Error('Unknown observer');
    const observer = this.npcs[index]!,
      s = this.creatures;
    const nearbyCreatures: { name: string; position: { x: number; y: number } }[] = [];
    for (let i = 0; i < s.count && nearbyCreatures.length < 12; i++)
      if (s.alive[i] && distanceSquared(observer, s.position(i)) < 12 ** 2)
        nearbyCreatures.push({ name: SPECIES[s.species[i]!]!.name, position: s.position(i) });
    return {
      day: this.calendar.day,
      hour: this.calendar.hour,
      weather: new SeasonSystem().weather(this.calendar),
      settlement: nearestSettlement(observer).name,
      partner: observer.partner === null ? null : s.definition(s.require(observer.partner)).name,
      giftAvailable: observer.lastGiftDay !== this.calendar.day && observer.affinity >= 0,
      knownDestinations: new SettlementPlanner().locations(index),
      nearbyVillagers: this.npcs
        .filter((n) => n !== observer && distanceSquared(n, observer) < 12 ** 2)
        .map((n) => ({
          id: n.profileId,
          name: NPC_PROFILES.find((p) => p.id === n.profileId)!.name,
          activity: n.activity,
        })),
      nearbyCreatures,
    };
  }
}
