import { ITEMS, NPC_PROFILES, type GarmentSlot, type ItemId } from '../content/definitions';
import { TwoSlotInventory, type InventoryState, type ItemInstance } from './inventory';

export const GARMENT_SLOTS = ['head', 'torso', 'hands', 'legs', 'feet', 'back'] as const;
export type GearSlot = GarmentSlot;
export type WornEquipment = Record<GearSlot, ItemInstance | null>;
export interface EquipmentView {
  readonly worn: Readonly<WornEquipment>;
  readonly ammo: number;
}
export interface EquippedLoadout {
  readonly entityId: number;
  readonly worn: WornEquipment;
  combat: [ItemInstance | null, ItemInstance | null];
}
export interface AmmoReservation {
  readonly id: string;
  readonly entityId: number;
  readonly instance: string;
}
export interface EquipmentSnapshot {
  loadouts: EquippedLoadout[];
  reservations: AmmoReservation[];
}
const emptyWorn = (): WornEquipment => ({
  head: null,
  torso: null,
  hands: null,
  legs: null,
  feet: null,
  back: null,
});

/** Explicit worn slots and NPC combat-only loadouts. No resource storage is introduced. */
export class EquipmentService {
  private readonly loadouts = new Map<number, EquippedLoadout>();
  private readonly reservations = new Map<string, AmmoReservation>();
  constructor(private readonly inventory: TwoSlotInventory) {}

  initialize(origin: number): void {
    this.loadouts.clear();
    this.reservations.clear();
    for (const entityId of [0, ...NPC_PROFILES.map((_, i) => i + 1)]) {
      const region = (['pyrador', 'aqualia', 'zephyria'] as const)[
        entityId === 0 ? origin : NPC_PROFILES[entityId - 1]!.village
      ]!;
      const worn = emptyWorn();
      for (const definition of Object.values(ITEMS))
        if (
          definition.id.startsWith(`${region}-`) &&
          definition.garment &&
          (entityId !== 0 || ['torso', 'legs', 'feet'].includes(definition.garment.slot))
        )
          worn[definition.garment.slot] = this.inventory.create(definition.id);
      const combat: [ItemInstance | null, ItemInstance | null] = [null, null];
      if (entityId !== 0) {
        const role = NPC_PROFILES[entityId - 1]!.role;
        const weapon: ItemId | null = /armorer|forge|carpenter|woodworker/.test(role)
          ? 'sword'
          : /courier|prospector|survey|scout/.test(role)
            ? 'spear'
            : /herbal|natural|forag|keeper/.test(role)
              ? 'bow'
              : null;
        if (weapon) combat[0] = this.inventory.create(weapon);
        if (weapon === 'bow') combat[1] = this.inventory.create('arrow-bundle');
      }
      this.loadouts.set(entityId, { entityId, worn, combat });
    }
  }
  loadout(entityId: number): EquippedLoadout | undefined {
    return this.loadouts.get(entityId);
  }
  held(entityId: number): InventoryState {
    return entityId === 0
      ? this.inventory.state
      : (this.loadouts.get(entityId)?.combat ?? [null, null]);
  }
  view(entityId = 0): EquipmentView {
    return {
      worn: { ...(this.loadouts.get(entityId)?.worn ?? emptyWorn()) },
      ammo: this.held(entityId)[1]?.charges ?? 0,
    };
  }
  defense(entityId: number): number {
    return Math.min(
      10,
      Object.values(this.loadouts.get(entityId)?.worn ?? {}).reduce(
        (sum, item) => sum + (item ? (ITEMS[item.id].garment?.defense ?? 0) : 0),
        0,
      ),
    );
  }
  movement(entityId: number): number {
    return Math.max(
      0.9,
      Object.values(this.loadouts.get(entityId)?.worn ?? {}).reduce(
        (factor, item) => factor * (item ? (ITEMS[item.id].garment?.speedMultiplier ?? 1) : 1),
        1,
      ),
    );
  }
  equip(slot: 0 | 1): string {
    const item = this.inventory.state[slot],
      garment = item && ITEMS[item.id].garment;
    if (!item || !garment) return 'Carry a garment to equip it.';
    const worn = this.loadouts.get(0)!.worn;
    const old = worn[garment.slot];
    worn[garment.slot] = item;
    this.inventory.set(slot, old);
    return `Equipped ${ITEMS[item.id].name}.`;
  }
  unequip(slot: GearSlot, drop?: (item: ItemInstance) => boolean): string {
    const worn = this.loadouts.get(0)!.worn,
      item = worn[slot];
    if (!item) return 'That worn slot is empty.';
    const carried = this.inventory.state;
    const free = carried[0] === null ? 0 : carried[1] === null ? 1 : -1;
    if (drop) {
      if (!drop(item)) return 'There is no accessible place to drop the garment.';
    } else if (free !== -1) this.inventory.set(free as 0 | 1, item);
    else return 'Both carried slots are full. Make room or explicitly drop the garment.';
    worn[slot] = null;
    return `Unequipped ${ITEMS[item.id].name}.`;
  }
  reserve(entityId: number, id: string): boolean {
    if (this.reservations.has(id)) return false;
    const ammo = this.held(entityId)[1];
    if (
      !ammo ||
      ammo.id !== 'arrow-bundle' ||
      !(ammo.charges! > 0) ||
      this.hasReservation(entityId)
    )
      return false;
    this.reservations.set(id, { id, entityId, instance: ammo.instance });
    return true;
  }
  hasReservation(entityId: number): boolean {
    return [...this.reservations.values()].some((r) => r.entityId === entityId);
  }
  release(id: string): boolean {
    const r = this.reservations.get(id);
    if (!r) return false;
    this.reservations.delete(id);
    const item = this.held(r.entityId)[1];
    if (!item || item.instance !== r.instance || item.id !== 'arrow-bundle' || !(item.charges! > 0))
      return false;
    const next = { ...item, charges: item.charges! - 1 };
    if (r.entityId === 0) this.inventory.set(1, next);
    else this.loadouts.get(r.entityId)!.combat[1] = next;
    return true;
  }
  cancel(id: string): void {
    this.reservations.delete(id);
  }
  resupply(entityId: number, consume: () => boolean): boolean {
    const loadout = this.loadouts.get(entityId);
    if (
      !loadout ||
      entityId === 0 ||
      loadout.combat[0]?.id !== 'bow' ||
      this.hasReservation(entityId) ||
      (loadout.combat[1]?.charges ?? 0) > 0 ||
      !consume()
    )
      return false;
    loadout.combat[1] = this.inventory.create('arrow-bundle');
    return true;
  }
  snapshot(): EquipmentSnapshot {
    return {
      loadouts: [...this.loadouts.values()].map((l) => ({
        entityId: l.entityId,
        worn: { ...l.worn },
        combat: [...l.combat] as [ItemInstance | null, ItemInstance | null],
      })),
      reservations: [...this.reservations.values()].map((r) => ({ ...r })),
    };
  }
  restore(snapshot: EquipmentSnapshot): void {
    this.loadouts.clear();
    this.reservations.clear();
    for (const loadout of snapshot.loadouts)
      this.loadouts.set(loadout.entityId, {
        ...loadout,
        worn: { ...loadout.worn },
        combat: [...loadout.combat],
      });
    for (const reservation of snapshot.reservations)
      this.reservations.set(reservation.id, { ...reservation });
  }
}
