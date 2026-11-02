import {
  ITEMS,
  RECIPES,
  itemIds,
  type ItemId,
  type Recipe,
  type SpeciesId,
} from '../content/definitions';

export interface ItemInstance {
  readonly id: ItemId;
  readonly instance: string;
  readonly originSpecies?: readonly SpeciesId[];
  readonly charges?: number;
  readonly artifact?: string;
}
export type InventoryState = readonly [ItemInstance | null, ItemInstance | null];
export class TwoSlotInventory {
  private slots: [ItemInstance | null, ItemInstance | null] = [null, null];
  private sequence = 0;
  get state(): InventoryState {
    return [this.slots[0], this.slots[1]];
  }
  add(id: ItemId, originSpecies?: readonly SpeciesId[]): boolean {
    const slot = this.slots[0] === null ? 0 : this.slots[1] === null ? 1 : -1;
    if (slot === -1) return false;
    this.slots[slot] = {
      id,
      instance: `item:${++this.sequence}`,
      ...(originSpecies?.length ? { originSpecies: [...originSpecies] } : {}),
      ...(ITEMS[id].ammo ? { charges: ITEMS[id].ammo!.capacity } : {}),
    };
    return true;
  }
  remove(slot: 0 | 1): ItemInstance | null {
    const item = this.slots[slot];
    this.slots[slot] = null;
    return item;
  }
  /** Replaces one carried item without changing identity or allocating hidden storage. */
  set(slot: 0 | 1, item: ItemInstance | null): void {
    this.slots[slot] = item;
  }
  insert(item: ItemInstance): boolean {
    const slot = this.slots[0] === null ? 0 : this.slots[1] === null ? 1 : -1;
    if (slot === -1) return false;
    this.slots[slot] = { ...item };
    this.sequence = Math.max(this.sequence, Number(item.instance.split(':').at(-1)) || 0);
    return true;
  }
  create(id: ItemId): ItemInstance {
    return {
      id,
      instance: `item:${++this.sequence}`,
      ...(ITEMS[id].ammo ? { charges: ITEMS[id].ammo!.capacity } : {}),
    };
  }
  swap(): void {
    [this.slots[0], this.slots[1]] = [this.slots[1], this.slots[0]];
  }
  combine(registry: RecipeRegistry): ItemId | null {
    const [a, b] = this.slots;
    if (!a || !b) return null;
    if (a.artifact || b.artifact) return null;
    const result = registry.lookup(a.id, b.id);
    if (!result) return null;
    const originSpecies = [...new Set([...(a.originSpecies ?? []), ...(b.originSpecies ?? [])])];
    this.slots = [
      {
        id: result,
        instance: `item:${++this.sequence}`,
        ...(originSpecies.length ? { originSpecies } : {}),
        ...(ITEMS[result].ammo ? { charges: ITEMS[result].ammo!.capacity } : {}),
      },
      null,
    ];
    return result;
  }
  restore(state: InventoryState, sequence?: number): void {
    this.slots = [state[0] ? { ...state[0] } : null, state[1] ? { ...state[1] } : null];
    this.sequence =
      sequence ?? Math.max(0, ...state.map((s) => Number(s?.instance.split(':').at(-1)) || 0));
  }
  get serial(): number {
    return this.sequence;
  }
}
export class RecipeRegistry {
  private readonly recipes = new Map<string, ItemId>();
  constructor(recipes: readonly Recipe[] = RECIPES) {
    const products = new Set(recipes.map((r) => r.result));
    const reachable = new Set<ItemId>(itemIds.filter((id) => !products.has(id)));
    for (const r of recipes) {
      const key = this.key(r.a, r.b);
      if (this.recipes.has(key)) throw new Error(`Ambiguous recipe: ${key}`);
      if (r.result === r.a || r.result === r.b)
        throw new Error('Recipe cannot regenerate an input');
      this.recipes.set(key, r.result);
    }
    // Reject cycles in the directed ingredient-to-result graph.
    const edges = new Map<ItemId, ItemId[]>();
    for (const r of recipes)
      for (const ingredient of [r.a, r.b])
        edges.set(ingredient, [...(edges.get(ingredient) ?? []), r.result]);
    const visit = (id: ItemId, active: Set<ItemId>, done: Set<ItemId>): void => {
      if (active.has(id)) throw new Error(`Cyclic recipe graph: ${id}`);
      if (done.has(id)) return;
      active.add(id);
      for (const next of edges.get(id) ?? []) visit(next, active, done);
      active.delete(id);
      done.add(id);
    };
    const done = new Set<ItemId>();
    for (const id of edges.keys()) visit(id, new Set(), done);
    for (let pass = 0; pass < recipes.length; pass++)
      for (const r of recipes)
        if (reachable.has(r.a) && reachable.has(r.b)) reachable.add(r.result);
    for (const r of recipes)
      if (!reachable.has(r.result)) throw new Error(`Unreachable recipe: ${r.result}`);
  }
  private key(a: ItemId, b: ItemId): string {
    return [a, b].sort().join('+');
  }
  lookup(a: ItemId, b: ItemId): ItemId | null {
    return this.recipes.get(this.key(a, b)) ?? null;
  }
}
export class CraftingService {
  constructor(private readonly recipes = new RecipeRegistry()) {}
  combine(inventory: TwoSlotInventory): string {
    const result = inventory.combine(this.recipes);
    return result
      ? `Crafted ${ITEMS[result].name}.`
      : 'Those items do not combine. Try flint + hardwood, then add reed fiber.';
  }
}
