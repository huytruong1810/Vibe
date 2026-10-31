import { NPC_PROFILES, SPECIES, VILLAGES } from '../content/definitions';
import type { NpcState } from './agents';
import type { CreatureStateStore } from './creatures';
import { SeasonSystem, type WorldCalendar } from './core';
import { SettlementPlanner, nearestSettlement } from './world';
import { distanceSquared, type NpcId } from './values';
import type { ResourceStore } from './resources';

/** Read-only, actor-scoped facts. A prompt never receives the complete world store. */
export class WorldQuery {
  constructor(
    private readonly npcs: readonly NpcState[],
    private readonly creatures: CreatureStateStore,
    private readonly calendar: WorldCalendar,
    private readonly resources?: ResourceStore,
    private readonly resourcesFor?: (scene: number) => ResourceStore,
  ) {}
  perceivedFacts(npcId: NpcId): object {
    const index = this.npcs.findIndex((n) => n.profileId === npcId);
    if (index < 0) throw new Error('Unknown observer');
    const observer = this.npcs[index]!,
      s = this.creatures;
    const resources = this.resourcesFor?.(observer.scene ?? 0) ?? this.resources;
    const nearbyCreatures: { name: string; position: { x: number; y: number } }[] = [];
    for (let i = 0; i < s.count && nearbyCreatures.length < 12; i++)
      if (s.alive[i] && distanceSquared(observer, s.position(i)) < 12 ** 2)
        nearbyCreatures.push({ name: SPECIES[s.species[i]!]!.name, position: s.position(i) });
    return {
      day: this.calendar.day,
      hour: this.calendar.hour,
      weather: new SeasonSystem().weather(this.calendar),
      settlement: observer.scene
        ? VILLAGES[NPC_PROFILES[index]!.village]!.name
        : nearestSettlement(observer).name,
      scene: observer.scene ?? 0,
      partner: observer.partner === null ? null : s.definition(s.require(observer.partner)).name,
      giftAvailable:
        observer.lastGiftDay !== this.calendar.day &&
        observer.affinity >= 0 &&
        (!resources ||
          ['berries', 'water', 'fiber'].some((item) =>
            resources!.hasSupply(observer, item as 'berries' | 'water' | 'fiber'),
          )),
      needs: {
        food: s.food[s.require(observer.entityId)],
        water: s.water[s.require(observer.entityId)],
        rest: s.rest[s.require(observer.entityId)],
        sleeping: !!s.sleeping[s.require(observer.entityId)],
      },
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
