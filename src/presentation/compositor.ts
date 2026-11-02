import type { ActorPresentation } from '../domain/presentation-contract';
import type {
  AssetFrame,
  AssetCatalog,
  AssetAppearance,
  AppearanceResolver,
  AnimationState,
  Facing,
  AppearanceRecipe,
  LayerSet,
  AnimationClip,
  RigDefinition,
} from './assets/catalog';

interface CacheEntry<T> {
  readonly value: T;
  readonly bytes: number;
  refs: number;
  used: number;
}
export interface CompositeLease<T> {
  readonly value: T;
  release(): void;
}
/** Pinned current poses cannot be evicted while a sprite still references their texture. */
export class BoundedCompositeCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private serial = 0;
  private bytes = 0;
  constructor(
    private budget: number,
    private readonly destroy: (value: T) => void,
  ) {
    if (!Number.isFinite(budget) || budget <= 0)
      throw new Error('Composite budget must be positive');
  }
  acquire(key: string, bytes: number, create: () => T): CompositeLease<T> | undefined {
    let entry = this.entries.get(key);
    if (!entry) {
      if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > this.budget) return undefined;
      this.evict(bytes);
      if (this.bytes + bytes > this.budget) return undefined;
      const value = create();
      entry = { value, bytes, refs: 0, used: ++this.serial };
      this.entries.set(key, entry);
      this.bytes += bytes;
    }
    entry.refs++;
    entry.used = ++this.serial;
    let released = false;
    return {
      value: entry.value,
      release: () => {
        if (released) return;
        released = true;
        entry!.refs--;
        this.evict(0);
      },
    };
  }
  private evict(incoming: number): void {
    for (const [key, entry] of [...this.entries]
      .filter(([, e]) => e.refs === 0)
      .sort((a, b) => a[1].used - b[1].used)) {
      if (this.bytes + incoming <= this.budget) break;
      this.entries.delete(key);
      this.bytes -= entry.bytes;
      this.destroy(entry.value);
    }
  }
  configure(bytes: number): void {
    if (!Number.isFinite(bytes) || bytes <= 0) throw new Error('Composite budget must be positive');
    if (
      [...this.entries.values()].filter((e) => e.refs > 0).reduce((n, e) => n + e.bytes, 0) > bytes
    )
      throw new Error('Release visible composites before shrinking budget');
    this.budget = bytes;
    this.evict(0);
  }
  clear(): void {
    for (const [key, entry] of this.entries)
      if (entry.refs === 0) {
        this.entries.delete(key);
        this.bytes -= entry.bytes;
        this.destroy(entry.value);
      }
  }
  get stats(): Readonly<{ bytes: number; entries: number; pinned: number; budget: number }> {
    return {
      bytes: this.bytes,
      entries: this.entries.size,
      pinned: [...this.entries.values()].filter((e) => e.refs > 0).length,
      budget: this.budget,
    };
  }
}
export interface PixelPoint {
  readonly x: number;
  readonly y: number;
}
export function frameAnchor(
  frame: Pick<AssetFrame, 'anchor' | 'sourceSize'> & { readonly anchorPx?: PixelPoint },
): PixelPoint {
  return (
    frame.anchorPx ?? {
      x: frame.anchor.x * frame.sourceSize.w,
      y: frame.anchor.y * frame.sourceSize.h,
    }
  );
}
/** Trim changes the atlas rectangle, never the untrimmed attachment or ground registration. */
export function layerRegistration(
  frame: Pick<AssetFrame, 'anchor' | 'sourceSize' | 'trim'> & { readonly anchorPx?: PixelPoint },
  target: PixelPoint,
): {
  readonly x: number;
  readonly y: number;
  readonly trimmedX: number;
  readonly trimmedY: number;
} {
  const anchor = frameAnchor(frame),
    x = target.x - anchor.x,
    y = target.y - anchor.y;
  return { x, y, trimmedX: x + frame.trim.x, trimmedY: y + frame.trim.y };
}
export function socketWorld(
  frame: Pick<AssetFrame, 'anchor' | 'sourceSize'> & { readonly anchorPx?: PixelPoint },
  socket: PixelPoint,
  feet: PixelPoint,
  scale = 1,
): PixelPoint {
  const anchor = frameAnchor(frame);
  return { x: feet.x + (socket.x - anchor.x) * scale, y: feet.y + (socket.y - anchor.y) * scale };
}
export function layerSockets(
  frame: AssetFrame,
  target: PixelPoint,
): Readonly<Record<string, PixelPoint>> {
  const p = layerRegistration(frame, target);
  return Object.fromEntries(
    Object.entries(frame.sockets ?? {}).map(([id, socket]) => [
      id,
      { x: p.x + socket.x, y: p.y + socket.y },
    ]),
  );
}
/** Preserve held silhouettes beyond the body canvas instead of cropping or stretching them. */
export function compositeBounds(
  canvas: { w: number; h: number },
  layers: readonly { frame: AssetFrame; target: PixelPoint }[],
): { x: number; y: number; w: number; h: number } {
  let left = 0,
    top = 0,
    right = canvas.w,
    bottom = canvas.h;
  for (const layer of layers) {
    const p = layerRegistration(layer.frame, layer.target);
    left = Math.min(left, p.trimmedX);
    top = Math.min(top, p.trimmedY);
    right = Math.max(right, p.trimmedX + layer.frame.trim.w);
    bottom = Math.max(bottom, p.trimmedY + layer.frame.trim.h);
  }
  const x = Math.floor(left),
    y = Math.floor(top);
  return { x, y, w: Math.ceil(right) - x, h: Math.ceil(bottom) - y };
}
/** Identity excludes entity IDs so equivalent bodies share a cached pose. */
export function compositeKey(
  actor: ActorPresentation,
  recipeId: string,
  frameIds: readonly string[],
  resolution: number,
): string {
  return JSON.stringify([
    recipeId,
    actor.appearanceRevision ?? 0,
    actor.rigId ?? '',
    Object.entries(actor.equipment ?? {}).sort(([a], [b]) => a.localeCompare(b)),
    actor.held ?? [null, null],
    frameIds,
    resolution,
  ]);
}
export interface ModularLayer {
  readonly definition: AppearanceRecipe['layers'][number];
  readonly layerSet: LayerSet;
  readonly appearance: AssetAppearance;
  readonly clip: AnimationClip;
}
export interface ModularSelection {
  readonly recipe: AppearanceRecipe;
  readonly rig: RigDefinition;
  readonly layers: readonly ModularLayer[];
  readonly complete: boolean;
}
export function selectModularLayers(
  catalog: AssetCatalog,
  resolver: AppearanceResolver,
  actor: ActorPresentation,
  appearance: AssetAppearance,
  state: AnimationState,
  facing: Facing,
): ModularSelection | undefined {
  const recipe = catalog.recipes?.find(
    (r) => r.id === appearance.recipeId && r.stage !== 'proof' && r.stage !== 'candidate',
  );
  const rig = recipe && catalog.rigs?.find((r) => r.id === recipe.rigId);
  if (!recipe || !rig || (actor.rigId && actor.rigId !== rig.id)) return undefined;
  const layers: ModularLayer[] = [];
  let complete = true;
  for (const definition of [...recipe.layers].sort((a, b) => a.z - b.z)) {
    if (definition.gearSlot !== undefined) {
      const equipped = actor.equipment?.[definition.gearSlot];
      if (!equipped || !definition.itemId || equipped !== definition.itemId) continue;
    }
    if (definition.heldSlot !== undefined) {
      const held = actor.held?.[definition.heldSlot];
      if (!held || !definition.itemId || held !== definition.itemId) continue;
    }
    const layerSet = catalog.layerSets?.find(
      (s) =>
        s.id === definition.layerSetId &&
        s.rigId === rig.id &&
        s.stage !== 'proof' &&
        s.stage !== 'candidate',
    );
    const layerAppearance = layerSet && resolver.getAppearance(layerSet.appearanceId);
    const clip =
      layerAppearance && resolver.clip(layerAppearance, state, facing, actor.action?.move);
    if (!layerSet || !layerAppearance || !clip) {
      if (definition.required) complete = false;
      continue;
    }
    layers.push({ definition, layerSet, appearance: layerAppearance, clip });
  }
  if (!layers.some((l) => l.layerSet.slot === 'body')) complete = false;
  return { recipe, rig, layers, complete };
}
