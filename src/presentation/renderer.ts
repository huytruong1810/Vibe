import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  TexturePool,
  Texture,
  Rectangle,
  RenderTexture,
} from 'pixi.js';
import { SETTLEMENTS, itemIds } from '../content/definitions';
import { ENTITY_STRIDE, type RenderSnapshot, type TerrainView } from '../domain/contracts';
import type {
  ActorPresentation,
  PresentationCue,
  ScenePresentation,
  ProjectilePresentation,
} from '../domain/presentation-contract';
import { BIOME_COLORS, Biome, Fluid, TileFlag } from '../domain/world';
import { CameraShake, FootprintTrail } from './motion-feedback';
import { clamp } from '../domain/values';
import { PixelArt } from './art';
import { DualGridAutotiler } from './autotiler';
import {
  AnimationController,
  PoseResolver,
  PresentationClock,
  PresentationCueReader,
  facingFor,
  layerFrameId,
  type PoseSample,
} from './animation';
import { CameraController, HD_PROFILE, WorldProjection } from './projection';
import { QualitySettings, TEXTURE_BUDGETS, type Quality } from './quality';
import {
  AppearanceResolver,
  type AssetCatalog,
  type AssetAppearance,
  type AssetFrame,
  type Facing,
  type EffectDefinition,
} from './assets/catalog';
import { AssetManager, type AssetLease } from './assets/manager';
import {
  BoundedCompositeCache,
  compositeKey,
  compositeBounds,
  layerRegistration,
  layerSockets,
  selectModularLayers,
  socketWorld,
  frameAnchor,
  type CompositeLease,
  type ModularSelection,
} from './compositor';
import { EffectDirector, visibleProjectiles, effectSeed } from './effects';
import { actorInScene, sceneCamera } from './scene-view';

export type { Quality } from './quality';
export { CameraController } from './projection';

const PROFILE = HD_PROFILE,
  TILE = PROFILE.tilePixels,
  REGION = PROFILE.cacheRegionTiles;
/** Procedural/legacy placeholders remain visibly low detail; this scale never marks them HD. */
const LEGACY_SCALE = TILE / 16;
// Reserve space for the nine nearby terrain caches, framebuffer attachments and procedural fallbacks.
const PRESENTATION_RESERVE_BYTES = 64 * 1024 ** 2;
const HOUSE_ART = ['house_pyrador', 'house_aqualia', 'house_zephyria'] as const;
interface EntitySprite {
  readonly body: Sprite;
  readonly shadow: Graphics;
  readonly health: Graphics;
  readonly fallbackTexture: Texture;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  elevated: number;
  kind: number;
  gesture: boolean;
  hp: number;
  actor: ActorPresentation;
  appearance: AssetAppearance | undefined;
  facing: Facing;
  hitUntil: number;
  fallback: boolean;
  composite?: CompositeLease<RenderTexture>;
  compositeKey?: string;
  poseSample?: PoseSample;
  baseFrame?: AssetFrame;
  socketPositions?: ReadonlyMap<string, { x: number; y: number }>;
  socketAnchor?: { x: number; y: number };
}
interface ChunkView {
  readonly container: Container;
  readonly graphics: Graphics;
  readonly cx: number;
  readonly cy: number;
  dirty: boolean;
}
interface PropView {
  readonly sprite: Sprite;
  readonly canopy: boolean;
  readonly foliage: boolean;
}
interface AuthoredEffect {
  readonly definition: EffectDefinition;
  readonly actor: number;
  readonly sceneId: string;
  readonly startedAt: number;
  readonly origin: { x: number; y: number };
  readonly sprite: Sprite;
}

/** Shared bounded particles evaluated from simulation time. No entity ticker or simulation mutation. */
export class WeatherRenderer {
  readonly graphics = new Graphics();
  render(frame: RenderSnapshot, seconds: number, quality: Quality, reducedMotion: boolean): void {
    const g = this.graphics;
    g.clear();
    if (reducedMotion || quality === 'low') return;
    const rain = frame.weather.kind === 'rain',
      snow = frame.weather.kind === 'snow';
    const count = quality === 'high' ? (rain || snow ? 100 : 28) : rain || snow ? 45 : 12;
    for (let i = 0; i < count; i++) {
      const speed = rain ? 360 : snow ? 40 : 24;
      const x =
        (((i * 317.48 + seconds * (rain ? -72 : 12) + Math.sin(seconds * 0.4 + i) * 8) %
          PROFILE.width) +
          PROFILE.width) %
        PROFILE.width;
      const y = (i * 164.76 + seconds * speed) % PROFILE.height;
      g.rect(Math.floor(x), Math.floor(y), rain ? 2 : 5, rain ? 20 : 3).fill({
        color: rain ? 0xc4dcd7 : snow ? 0xe6ebdf : frame.season === 2 ? 0xceaa79 : 0xe6c7ae,
        alpha: rain ? 0.35 : 0.65,
      });
    }
  }
}
/** Eight persistent light sprites avoid allocation during each rendering frame. */
export class LightingRenderer {
  readonly darkness = new Graphics();
  readonly lights = new Container();
  private initialized = false;
  constructor(
    private readonly art: PixelArt,
    private readonly projection: WorldProjection,
  ) {}
  render(frame: RenderSnapshot, camera: Pick<CameraController, 'x' | 'y'>, quality: Quality): void {
    const night = clamp((Math.cos((frame.hour / 24) * Math.PI * 2) + 0.1) * 0.45, 0, 0.48);
    this.darkness
      .clear()
      .rect(0, 0, PROFILE.width, PROFILE.height)
      .fill({ color: 0x102f3a, alpha: night });
    if (!this.initialized) {
      for (let i = 0; i < 8; i++) {
        const sprite = new Sprite(this.art.light());
        sprite.anchor.set(0.5);
        sprite.scale.set(LEGACY_SCALE);
        sprite.blendMode = 'add';
        this.lights.addChild(sprite);
      }
      this.initialized = true;
    }
    const near =
      quality === 'low' || night < 0.04
        ? []
        : SETTLEMENTS.filter((s) => {
            const p = this.projection.screen(s.x, s.y, 0, camera);
            return (
              p.x > -200 && p.x < PROFILE.width + 200 && p.y > -200 && p.y < PROFILE.height + 200
            );
          }).slice(0, quality === 'high' ? 8 : 3);
    for (let i = 0; i < this.lights.children.length; i++) {
      const light = this.lights.children[i] as Sprite,
        s = near[i];
      light.visible = !!s;
      if (s) {
        const p = this.projection.screen(s.x, s.y, 0, camera);
        light.position.set(p.x, p.y);
        light.alpha = night;
      }
    }
  }
}

/** Owns disposable terrain caches and copied actor read models, never authoritative worker arrays. */
export class WorldRenderer {
  readonly app = new Application();
  readonly projection = new WorldProjection();
  readonly camera = new CameraController(this.projection);
  private readonly art = new PixelArt();
  private readonly assets = new AssetManager({
    budgetBytes: TEXTURE_BUDGETS.medium - PRESENTATION_RESERVE_BYTES - 16 * 1024 ** 2,
  });
  private resolver: AppearanceResolver | null = null;
  private readonly frames = new Map<string, AssetFrame>();
  private readonly ground = new Container();
  private readonly objects = new Container();
  private readonly foreground = new Container();
  private readonly groundProps = new Container();
  private readonly vfxLayer = new Container();
  private readonly labels = new Container();
  private readonly chunks = new Map<string, ChunkView>();
  private readonly entities = new Map<number, EntitySprite>();
  private readonly props = new Map<string, PropView>();
  private readonly indicators = new Graphics();
  private readonly surfaceEffects = new Graphics();
  private readonly debug = new Graphics();
  private readonly weather = new WeatherRenderer();
  private readonly lighting = new LightingRenderer(this.art, this.projection);
  private readonly tiler = new DualGridAutotiler();
  private readonly animations = new AnimationController();
  private readonly poses = new PoseResolver();
  private readonly clock = new PresentationClock();
  private readonly cueReader = new PresentationCueReader();
  private readonly effects: PresentationCue[] = [];
  private readonly shake = new CameraShake();
  private readonly footprints = new FootprintTrail();
  private readonly footprintGraphics = new Graphics();
  private renderCamera = { x: 0, y: 0 };
  private readonly qualitySettings = new QualitySettings();
  private readonly composites = new BoundedCompositeCache<RenderTexture>(16 * 1024 ** 2, (t) =>
    t.destroy(true),
  );
  private readonly effectDirector = new EffectDirector();
  private readonly actionEffects = new Set<string>();
  private readonly authoredEffects = new Map<string, AuthoredEffect>();
  private terrain: TerrainView | null = null;
  private frame: RenderSnapshot | null = null;
  private lastPropsTile = '';
  private selected: number | null = null;
  private quality: Quality = 'medium';
  private reducedMotion = false;
  private debugEnabled = false;
  private last = performance.now();
  private renderMs = 0;
  private loadMs = 0;
  private assetError = '';
  private needsRedraw = true;
  private sceneSignature = '';
  private gpu = 'unreported';
  private initialized = false;
  private disposed = false;
  private assetSignature = '';
  private staticTextureSignature = '';
  private textureResolution: 1 | 0.5 = 1;
  private loadedTextureResolution: 1 | 0.5 = 1;
  private assetRetryAfter = 0;
  private readonly clippedTextures = new Map<string, Texture>();
  private assetRequest: AbortController | null = null;
  private assetLease: AssetLease | null = null;
  private preparedLease: AssetLease | null = null;
  private preparedAtSceneId = '';
  private preparedSession = '';
  private prepareRequest: AbortController | null = null;
  private readonly labelStyle = new TextStyle({
    fontFamily: 'Silver',
    fontSize: 38,
    fill: 0xf1e9c9,
    stroke: { color: 0x355047, width: 5 },
    align: 'center',
  });
  get catalog(): AssetCatalog | null {
    return this.assets.catalog;
  }
  private get scene(): ScenePresentation {
    return (
      (this.frame as (RenderSnapshot & { scene?: ScenePresentation }) | null)?.scene ?? {
        id: 'overworld',
        width: this.terrain?.size ?? 512,
        height: this.terrain?.size ?? 512,
        outside: true,
        props: [],
        portals: [],
      }
    );
  }
  /** Portal UI may preload artwork; the worker still revalidates every actual transition. */
  async prepareScene(assetContentIds: readonly string[]): Promise<void> {
    const catalog = this.assets.catalog;
    if (!catalog) throw new Error('Artwork catalog is not ready');
    this.prepareRequest?.abort();
    const request = new AbortController();
    this.prepareRequest = request;
    const ids = new Set(assetContentIds);
    const appearanceIds = new Set(
      catalog.sceneAssets?.filter((a) => ids.has(a.id)).map((a) => a.appearanceId) ?? [],
    );
    const frames = catalog.appearances
      .filter((a) => ids.has(a.contentId) || appearanceIds.has(a.id))
      .flatMap((a) => (a.frameId ? [a.frameId] : []));
    const lease = await this.assets.acquire(
      frames,
      this.quality === 'low' ? 0.5 : this.textureResolution,
      request.signal,
    );
    if (this.disposed || request.signal.aborted) {
      lease.release();
      throw new DOMException('Scene preload superseded', 'AbortError');
    }
    this.preparedLease?.release();
    this.preparedLease = lease;
    this.preparedAtSceneId = this.scene.id;
    this.preparedSession = this.frame?.session ?? '';
  }

  async initialize(element: HTMLElement): Promise<void> {
    const started = performance.now();
    await this.app.init({
      width: PROFILE.width,
      height: PROFILE.height,
      backgroundColor: 0x203c35,
      antialias: false,
      resolution: 1,
      roundPixels: true,
      preference: 'webgl',
    });
    if (this.disposed) {
      this.app.destroy(true, { children: true });
      return;
    }
    this.initialized = true;
    const gl = (this.app.renderer as unknown as { gl?: WebGLRenderingContext }).gl;
    const info = gl?.getExtension('WEBGL_debug_renderer_info') as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    if (gl && info) this.gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    this.app.canvas.setAttribute(
      'aria-label',
      'Hearthwild game world. Move with WASD or arrow keys.',
    );
    this.app.canvas.setAttribute('role', 'img');
    element.appendChild(this.app.canvas);
    this.fit(element.clientWidth, element.clientHeight);
    this.objects.sortableChildren = true;
    this.foreground.sortableChildren = true;
    this.app.stage.addChild(
      this.ground,
      this.groundProps,
      this.surfaceEffects,
      this.footprintGraphics,
      this.objects,
      this.foreground,
      this.vfxLayer,
      this.indicators,
      this.labels,
      this.lighting.darkness,
      this.lighting.lights,
      this.weather.graphics,
      this.debug,
    );
    try {
      await this.assets.loadCatalog('/assets/generated/catalog.json');
      if (this.disposed) return;
      const catalog = this.assets.catalog;
      if (catalog) {
        this.resolver = new AppearanceResolver(catalog);
        for (const f of catalog.frames) this.frames.set(f.id, f);
      }
      await this.loadVisibleAssets([]);
    } catch (error) {
      this.assetError = `Prototype rendering: ${error instanceof Error ? error.message : String(error)}`;
    }
    this.loadMs = performance.now() - started;
    // DOM menus remain responsive without continuously redrawing a frozen world.
    this.app.ticker.remove(this.app.render, this.app);
    this.app.ticker.add(() => {
      if (this.render()) this.app.render();
    });
  }
  fit(width: number, height: number): void {
    if (!this.initialized) return;
    const fit = this.projection.fit(width, height);
    this.app.canvas.style.width = `${fit.width}px`;
    this.app.canvas.style.height = `${fit.height}px`;
  }
  pickActor(clientX: number, clientY: number): number | null {
    if (!this.initialized) return null;
    const p = this.projection.client(
      { x: clientX, y: clientY },
      this.app.canvas.getBoundingClientRect(),
    );
    // Actual anchored bounds in painter order preserve elevation and trim registration.
    const sorted = [...this.entities].sort((a, b) => b[1].body.zIndex - a[1].body.zIndex);
    for (const [id, e] of sorted) {
      const left = e.body.x - this.renderCamera.x - e.body.anchor.x * e.body.width;
      const top = e.body.y - this.renderCamera.y - e.body.anchor.y * e.body.height;
      if (p.x >= left && p.x <= left + e.body.width && p.y >= top && p.y <= top + e.body.height)
        return id;
    }
    return null;
  }
  private async loadVisibleAssets(actors: readonly ActorPresentation[]): Promise<void> {
    const catalog = this.assets.catalog;
    if (!catalog || !this.resolver) return;
    if (performance.now() < this.assetRetryAfter) return;
    const contentIds = new Set([
      ...(this.scene.sceneAssetIds ?? []),
      ...this.scene.props.map((p) => p.contentId),
    ]);
    if (this.scene.floorContentId) contentIds.add(this.scene.floorContentId);
    if (this.scene.outside) {
      for (const id of [
        'ground_grass',
        'ground_dirt',
        'ground_sand',
        'ground_freshwater',
        'cliff_grass',
        'ramp_grass',
        'tree_oak',
        'tree_oak_variant',
        'canopy_oak',
        ...HOUSE_ART,
        'landmark_waystone',
        'landmark_well',
        'landmark_lantern',
        'landmark_fence',
        'prop_hearth',
        'rock_pebbles',
        'rock_copper_rich',
        'rock_copper_depleted',
      ])
        contentIds.add(id);
      for (let i = 1; i < 15; i++) contentIds.add(`shore_freshwater_mask_${i}`);
      for (const plant of ['berries', 'reeds', 'wheat', 'nectar', 'ashgrass', 'fungi'])
        for (const state of ['healthy', 'harvested', 'burnt'])
          contentIds.add(`flora_${plant}_${state}`);
    }
    const requestedFrames = new Set<string>();
    for (const id of contentIds) {
      const appearance = this.environmentAppearance(id);
      if (appearance?.frameId) requestedFrames.add(appearance.frameId);
    }
    for (const drop of this.frame?.drops ?? []) {
      const appearance = this.resolver.resolve('item', drop.item);
      if (appearance?.frameId) requestedFrames.add(appearance.frameId);
    }
    for (const actor of actors) {
      const appearance = this.resolver.resolve(actor.appearanceKind, actor.appearanceId);
      if (!appearance) continue;
      const entity = this.entities.get(actor.id);
      const facing = facingFor(actor.facingX, actor.facingY, entity?.facing);
      const tick = this.frame?.tick ?? 0;
      const reactionActive =
        !!actor.reaction && tick >= actor.reaction.startedAt && tick < actor.reaction.endsAt;
      const pose = this.poses.resolve(
        reactionActive ? actor : { ...actor, reaction: undefined },
        (entity?.hitUntil ?? 0) > tick,
      );
      // Acquire only the current direction/state and likely same-facing locomotion transitions.
      // A full eight-direction production appearance can contain thousands of frames.
      for (const state of new Set([pose, 'idle', 'walk'] as const)) {
        const modular = selectModularLayers(
          catalog,
          this.resolver,
          actor,
          appearance,
          state,
          facing,
        );
        if (modular?.complete)
          for (const layer of modular.layers)
            for (const id of layer.clip.frameIds) requestedFrames.add(id);
        const clip = this.resolver.clip(
          appearance,
          state,
          facing,
          state === 'attack' ? actor.action?.move : undefined,
        );
        if (clip) for (const id of clip.frameIds) requestedFrames.add(id);
      }
    }
    for (const effect of this.authoredEffects.values()) {
      const clip = catalog.clips.find((c) => c.id === effect.definition.clipId);
      if (clip) for (const id of clip.frameIds) requestedFrames.add(id);
    }
    const frameIds = [...requestedFrames].sort();
    const frameSignature = frameIds.join(',');
    const resolution = this.quality === 'low' ? 0.5 : this.textureResolution;
    const signature = `${resolution}:${frameSignature}`;
    if (signature === this.assetSignature) return;
    this.assetSignature = signature;
    this.assetRequest?.abort();
    const request = new AbortController();
    this.assetRequest = request;
    try {
      let selectedResolution = resolution;
      let lease: AssetLease;
      try {
        lease = await this.assets.acquire(frameIds, selectedResolution, request.signal);
      } catch (error) {
        if (
          request.signal.aborted ||
          !(error instanceof Error) ||
          !error.message.startsWith('Texture budget exceeded')
        )
          throw error;
        // Free old atlas references before retrying; all displayed objects detach first.
        this.detachLoadedAssets();
        this.assetLease?.release();
        this.assetLease = null;
        selectedResolution = 0.5;
        this.textureResolution = 0.5;
        this.assetSignature = `0.5:${frameSignature}`;
        lease = await this.assets.acquire(frameIds, selectedResolution, request.signal);
      }
      if (this.disposed || request.signal.aborted) {
        lease.release();
        return;
      }
      const previous = this.assetLease;
      this.assetLease = lease;
      this.loadedTextureResolution = selectedResolution;
      previous?.release();
      if (this.preparedAtSceneId !== this.scene.id) {
        this.preparedLease?.release();
        this.preparedLease = null;
      }
      this.assetError = '';
      this.needsRedraw = true;
      const staticSignature = catalog.appearances
        .filter((a) => a.kind === 'environment' || a.kind === 'item')
        .map((a) => (a.frameId ? `${a.frameId}:${this.assets.texture(a.frameId)?.uid ?? 0}` : ''))
        .join(',');
      if (staticSignature !== this.staticTextureSignature) {
        this.staticTextureSignature = staticSignature;
        this.lastPropsTile = '';
        // Actor pose changes share static atlas leases; they must not invalidate terrain caches.
        for (const prop of this.props.values()) prop.sprite.destroy();
        this.props.clear();
        for (const chunk of this.chunks.values()) chunk.graphics.clear();
        this.clearClippedTextures();
        for (const chunk of this.chunks.values()) chunk.dirty = true;
      }
    } catch (error) {
      if (!request.signal.aborted) {
        this.assetRetryAfter = performance.now() + 5000;
        this.assetError = `Prototype rendering: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }
  private clearClippedTextures(): void {
    for (const texture of this.clippedTextures.values()) texture.destroy(false);
    this.clippedTextures.clear();
  }
  private detachLoadedAssets(): void {
    this.staticTextureSignature = '';
    for (const e of this.entities.values()) {
      e.composite?.release();
      e.composite = undefined;
      e.compositeKey = undefined;
      e.body.texture = e.fallbackTexture;
      e.body.anchor.set(0.5, 1);
      e.body.scale.set(e.kind === 2 ? LEGACY_SCALE : PROFILE.humanHeight / 24);
    }
    for (const p of this.props.values()) p.sprite.destroy();
    this.props.clear();
    this.lastPropsTile = '';
    for (const chunk of this.chunks.values()) {
      chunk.graphics.clear();
      chunk.dirty = true;
    }
    this.clearClippedTextures();
  }
  setTerrain(terrain: TerrainView): void {
    this.prepareRequest?.abort();
    this.prepareRequest = null;
    this.needsRedraw = true;
    this.sceneSignature = '';
    this.assetRequest?.abort();
    this.assetRequest = null;
    this.assetSignature = '';
    this.staticTextureSignature = '';
    this.assetRetryAfter = 0;
    this.assetLease?.release();
    this.assetLease = null;
    this.clearClippedTextures();
    this.terrain = terrain;
    this.camera.initialized = false;
    this.lastPropsTile = '';
    for (const c of this.chunks.values()) c.container.destroy({ children: true });
    this.chunks.clear();
    TexturePool.clear(true);
    for (const p of this.props.values()) p.sprite.destroy();
    this.props.clear();
    for (const e of this.entities.values()) {
      e.composite?.release();
      e.body.destroy();
      e.shadow.destroy();
      e.health.destroy();
    }
    this.entities.clear();
    for (const child of this.labels.removeChildren()) child.destroy();
    this.animations.reset();
    this.clock.reset();
    this.cueReader.reset();
    this.effects.length = 0;
    this.shake.reset();
    this.footprints.reset();
    this.footprintGraphics.clear();
    this.composites.clear();
    this.effectDirector.reset();
    this.actionEffects.clear();
    for (const effect of this.authoredEffects.values()) effect.sprite.destroy();
    this.authoredEffects.clear();
  }
  apply(frame: RenderSnapshot): void {
    if (this.preparedLease && this.preparedSession !== frame.session) {
      this.preparedLease.release();
      this.preparedLease = null;
    }
    const nextScene =
      (frame as RenderSnapshot & { scene?: ScenePresentation }).scene?.id ?? 'overworld';
    if (this.frame && this.scene.id !== nextScene && this.terrain) this.setTerrain(this.terrain);
    const signature = `${nextScene}:${frame.session}:${frame.tick}:${frame.paused.join(',')}:${frame.debugEnabled}:${frame.deltas.length}:${frame.drops.map((d) => d.id).join(',')}:${frame.carrion.length}:${frame.cues.at(-1)?.sequence ?? 0}`;
    if (signature !== this.sceneSignature) this.needsRedraw = true;
    this.sceneSignature = signature;
    // packed/ids are returned to the worker immediately after apply; retaining empty views is intentional.
    this.frame = { ...frame, packed: new Float32Array(0), ids: new Uint32Array(0) };
    this.clock.accept(
      frame.session,
      frame.tick,
      frame.elapsedSeconds,
      frame.paused.length > 0,
      performance.now(),
    );
    this.animations.accept(frame.session, frame.tick, frame.actors);
    const terrain = this.terrain;
    if (!terrain) return;
    for (const delta of frame.deltas) {
      terrain.flags[delta.index] = delta.flags;
      terrain.fluid[delta.index] = delta.fluid;
      terrain.resource[delta.index] = delta.resource;
      terrain.quantity[delta.index] = delta.quantity;
      const x = delta.index % terrain.size,
        y = Math.floor(delta.index / terrain.size);
      for (const dx of [-1, 0, 1])
        for (const dy of [-1, 0, 1]) {
          const c = this.chunks.get(
            `${Math.floor((x + dx) / REGION)},${Math.floor((y + dy) / REGION)}`,
          );
          if (c) c.dirty = true;
        }
    }
    if (frame.deltas.length || frame.carrion.length || frame.drops.length) this.lastPropsTile = '';
    const actors = new Map(frame.actors.map((a) => [a.id, a])),
      seen = new Set<number>();
    const cues = this.cueReader.read(frame.session, frame.tick, frame.cues);
    this.effects.push(...cues);
    if (this.effects.length > 64) this.effects.splice(0, this.effects.length - 64);
    for (const cue of cues) {
      const actor = actors.get(cue.target ?? cue.actor);
      if (!actor || !actorInScene(actor, this.scene.id)) continue;
      if (cue.kind === 'hit' && Math.hypot(actor.x - frame.player.x, actor.y - frame.player.y) < 6)
        this.shake.add(cue.tick, (cue.strength ?? 1) * (actor.id === 0 ? 2 : 0.7), cue.sequence);
      this.emitEffect(
        cue.kind === 'hit'
          ? 'hit'
          : cue.kind === 'care' || cue.kind === 'recover'
            ? 'heal'
            : 'ambient',
        `cue:${frame.session}:${cue.sequence}`,
        actor,
        cue.tick,
      );
      const p = this.projection.world(actor.x, actor.y, actor.elevation);
      this.effectDirector.emit({
        id: `cue:${frame.session}:${cue.sequence}`,
        sceneId: this.scene.id,
        kind: cue.kind,
        tick: cue.tick,
        seed: cue.sequence,
        origin: p,
        count: cue.kind === 'hit' ? 8 : 4,
      });
    }
    const visibleActors: ActorPresentation[] = [];
    for (let i = 0; i < frame.count; i++) {
      const at = i * ENTITY_STRIDE,
        p = frame.packed,
        id = frame.ids[i]!,
        kind = p[at + 1]!,
        x = p[at + 2]!,
        y = p[at + 3]!;
      if (Math.abs(x - frame.player.x) > 23 || Math.abs(y - frame.player.y) > 17) continue;
      const actor = actors.get(id);
      if (!actor || !actorInScene(actor, this.scene.id)) continue;
      seen.add(id);
      visibleActors.push(actor);
      if (actor.action) {
        const key = `${frame.session}:${this.scene.id}:${actor.id}:${actor.action.instanceId ?? actor.action.startedAt}`;
        if (!this.actionEffects.has(key)) {
          this.actionEffects.add(key);
          if (this.actionEffects.size > 256)
            this.actionEffects.delete(this.actionEffects.values().next().value!);
          this.emitEffect('attack', key, actor, actor.action.startedAt);
        }
      }
      let e = this.entities.get(id);
      if (!e) {
        const body = new Sprite(
          kind === 2
            ? this.art.creature(p[at + 7]!, p[at + 5]!)
            : this.art.person(p[at + 7]!, kind === 0),
        );
        body.anchor.set(0.5, 1);
        body.scale.set(kind === 2 ? LEGACY_SCALE : PROFILE.humanHeight / 24);
        const shadow = new Graphics()
            .ellipse(0, 0, kind === 2 ? 28 : 22, 8)
            .fill({ color: 0x243d32, alpha: 0.22 }),
          health = new Graphics();
        e = {
          body,
          shadow,
          health,
          fallbackTexture: body.texture,
          x,
          y,
          targetX: x,
          targetY: y,
          elevated: p[at + 4]!,
          kind,
          gesture: false,
          hp: 1,
          actor,
          appearance: this.resolver?.resolve(actor.appearanceKind, actor.appearanceId),
          facing: 's',
          hitUntil: 0,
          fallback: true,
        };
        this.entities.set(id, e);
        this.objects.addChild(shadow, body, health);
      }
      e.actor = actor;
      e.targetX = x;
      e.targetY = y;
      e.elevated = p[at + 4]!;
      e.gesture = (p[at + 8]! & 4) !== 0;
      e.hp = p[at + 6]!;
      for (const cue of cues)
        if (cue.kind === 'hit' && cue.target === id) e.hitUntil = cue.tick + 5;
      e.health.clear();
      if (e.hp < 0.99 || id === this.selected || (p[at + 8]! & 1) !== 0)
        e.health
          .rect(-32, -156, 64, 6)
          .fill(0x3a5748)
          .rect(-32, -156, 64 * clamp(e.hp), 6)
          .fill((p[at + 8]! & 1) !== 0 ? 0xdcc48b : 0xb9ce91);
    }
    for (const [id, e] of this.entities)
      if (!seen.has(id)) {
        e.composite?.release();
        e.body.destroy();
        e.shadow.destroy();
        e.health.destroy();
        this.entities.delete(id);
      }
    this.animations.retain(seen);
    void this.loadVisibleAssets(visibleActors);
  }
  settings(quality: Quality, reducedMotion: boolean, debug: boolean): void {
    this.needsRedraw = true;
    const loweringBudget = TEXTURE_BUDGETS[quality] < TEXTURE_BUDGETS[this.quality];
    this.quality = quality;
    this.qualitySettings.configure(quality);
    this.reducedMotion = reducedMotion;
    this.debugEnabled = debug;
    const compositeBudget = (quality === 'high' ? 32 : quality === 'low' ? 8 : 16) * 1024 ** 2;
    for (const e of this.entities.values()) {
      e.composite?.release();
      e.composite = undefined;
      e.compositeKey = undefined;
      e.body.texture = e.fallbackTexture;
    }
    this.composites.configure(compositeBudget);
    this.assets.setBudget(TEXTURE_BUDGETS[quality] - PRESENTATION_RESERVE_BYTES - compositeBudget);
    this.textureResolution = quality === 'low' ? 0.5 : 1;
    this.assetRetryAfter = 0;
    if (loweringBudget) {
      this.assetLease?.release();
      this.assetLease = null;
      this.assetSignature = '';
      this.detachLoadedAssets();
    }
    if (this.initialized) this.app.renderer.resize(PROFILE.width, PROFILE.height, 1);
    void this.loadVisibleAssets([...this.entities.values()].map((e) => e.actor));
  }
  select(id: number | null): void {
    this.needsRedraw = true;
    this.selected = id;
  }
  private textureFor(
    kind: 'environment' | 'item',
    id: string,
    fallback: Texture,
  ): { texture: Texture; frame?: AssetFrame; scale: number } {
    const appearance =
        kind === 'environment' ? this.environmentAppearance(id) : this.resolver?.resolve(kind, id),
      frame = appearance?.frameId && this.frames.get(appearance.frameId);
    const texture = frame && this.assets.texture(frame.id);
    if (texture) texture.source.scaleMode = 'nearest';
    return texture && frame
      ? { texture, frame, scale: appearance?.quality === 'hd' ? 1 : LEGACY_SCALE }
      : { texture: fallback, scale: LEGACY_SCALE };
  }
  private environmentAppearance(id: string): AssetAppearance | undefined {
    const direct = this.resolver?.resolve('environment', id);
    if (direct) return direct;
    const definition =
      this.catalog?.sceneAssets?.find(
        (a) => a.id === id && a.stage !== 'proof' && a.stage !== 'candidate',
      ) ??
      this.catalog?.furniture?.find(
        (a) => a.id === id && a.stage !== 'proof' && a.stage !== 'candidate',
      );
    return definition && this.resolver?.getAppearance(definition.appearanceId);
  }
  private drawChunk(chunk: ChunkView): void {
    const t = this.terrain!,
      g = chunk.graphics;
    g.clear();
    for (let dy = 0; dy < REGION; dy++)
      for (let dx = 0; dx < REGION; dx++) {
        const x = chunk.cx * REGION + dx,
          y = chunk.cy * REGION + dy;
        if (x >= t.size || y >= t.size || x >= this.scene.width || y >= this.scene.height) continue;
        const i = y * t.size + x,
          color = BIOME_COLORS[t.biome[i]!] ?? 0x8da570,
          flags = t.flags[i]!,
          px = dx * TILE,
          py = dy * TILE;
        const material = !this.scene.outside
          ? this.scene.floorContentId
          : flags & TileFlag.Road
            ? 'ground_dirt'
            : t.biome[i] === Biome.Beach
              ? 'ground_sand'
              : [Biome.Riverlands, Biome.Meadows, Biome.Forest].includes(t.biome[i]!)
                ? 'ground_grass'
                : undefined;
        const groundArt = material && this.drawCatalogTexture(g, material, px, py, TILE, TILE);
        if (!groundArt)
          g.rect(px, py, TILE, TILE).fill(
            this.scene.outside ? color : this.scene.kind === 'cave' ? 0x424c48 : 0x86735b,
          );
        if (!this.scene.outside && flags & TileFlag.Solid)
          g.rect(px, py, TILE, TILE).fill({ color: 0x233b36, alpha: 0.7 });
        const hash = (Math.imul(x + 13, 73856093) ^ Math.imul(y + 7, 19349663)) >>> 0,
          e = t.elevation[i]!,
          next = t.elevation[i + t.size] ?? e;
        if (
          e &&
          !(
            material &&
            this.drawCatalogTexture(g, material, px, py - e * PROFILE.elevationPixels, TILE, TILE)
          )
        )
          g.rect(px, py - e * PROFILE.elevationPixels, TILE, TILE).fill(color);
        if (e > next && !(flags & TileFlag.Road)) {
          for (let step = 0; step < e - next; step++) {
            const faceY = py + TILE - (step + 1) * PROFILE.elevationPixels;
            if (
              !this.drawCatalogTexture(g, 'cliff_grass', px, faceY, TILE, PROFILE.elevationPixels)
            )
              g.rect(px, faceY, TILE, PROFILE.elevationPixels).fill({
                color: 0x4d6250,
                alpha: 0.5,
              });
          }
        }
        if (this.scene.outside && !groundArt && !t.fluid[i] && !(flags & TileFlag.Road)) {
          const sy = py - e * PROFILE.elevationPixels;
          g.rect(px + (hash % 13) * 4, sy + ((hash >>> 4) % 13) * 4, 4, 10).fill({
            color: 0x365f40,
            alpha: 0.15,
          });
          g.rect(px + ((hash >>> 8) % 14) * 4, sy + ((hash >>> 12) % 14) * 4, 8, 4).fill({
            color: 0xe5dcb0,
            alpha: 0.15,
          });
        }
        if (
          flags & TileFlag.Ramp &&
          !this.drawCatalogTexture(
            g,
            'ramp_grass',
            px,
            py - e * PROFILE.elevationPixels,
            TILE,
            TILE,
          )
        )
          for (let line = 0; line < 4; line++)
            g.rect(px + 8, py + line * 12, 48, 3).fill({ color: 0xe0d4ac, alpha: 0.3 });
        if (flags & TileFlag.Burning)
          g.rect(px + 20, py + 12, 20, 40)
            .fill(0xe8ae67)
            .rect(px + 28, py + 28, 8, 24)
            .fill(0xf3d79a);
      }
    const grid = { size: t.size, index: (x: number, y: number) => y * t.size + x };
    const overlays = [
      { matches: (i: number) => t.fluid[i] === 4, color: 0x6b8670, material: undefined },
      { matches: (i: number) => t.fluid[i] === 1, color: 0x6ca6a0, material: 'ground_freshwater' },
      { matches: (i: number) => t.fluid[i] === 2, color: 0x689da2, material: undefined },
      { matches: (i: number) => t.fluid[i] === 3, color: 0xc98558, material: undefined },
      {
        matches: (i: number) => (t.flags[i]! & TileFlag.Ice) !== 0,
        color: 0xb3d2cf,
        material: undefined,
      },
      {
        matches: (i: number) => (t.flags[i]! & TileFlag.Road) !== 0,
        color: 0xc5b78c,
        material: 'ground_dirt',
      },
    ];
    const overlayRect = (
      x: number,
      y: number,
      width: number,
      height: number,
      color: number,
    ): void => {
      const left = Math.max(0, x),
        top = Math.max(0, y);
      const right = Math.min(REGION * TILE, x + width),
        bottom = Math.min(REGION * TILE, y + height);
      if (right > left && bottom > top) g.rect(left, top, right - left, bottom - top).fill(color);
    };
    for (let y = 0; y <= REGION; y++)
      for (let x = 0; x <= REGION; x++)
        for (const overlay of overlays) {
          const mask = this.tiler.mask(
            grid,
            chunk.cx * REGION + x - 1,
            chunk.cy * REGION + y - 1,
            overlay.matches,
          );
          if (mask === 0) continue;
          const textureId =
            mask === 15
              ? overlay.material
              : overlay.material === 'ground_freshwater'
                ? `shore_freshwater_mask_${mask}`
                : undefined;
          if (
            textureId &&
            this.drawCatalogTexture(
              g,
              textureId,
              x * TILE - TILE / 2,
              y * TILE - TILE / 2,
              TILE,
              TILE,
              true,
            )
          )
            continue;
          if (mask === 15)
            overlayRect(x * TILE - TILE / 2, y * TILE - TILE / 2, TILE, TILE, overlay.color);
          else
            for (const r of this.tiler.pattern(mask))
              overlayRect(
                x * TILE - TILE / 2 + r.x * LEGACY_SCALE,
                y * TILE - TILE / 2 + r.y * LEGACY_SCALE,
                r.width * LEGACY_SCALE,
                r.height * LEGACY_SCALE,
                overlay.color,
              );
        }
    if (chunk.container.isCachedAsTexture) chunk.container.updateCacheTexture();
    else chunk.container.cacheAsTexture({ resolution: 1, antialias: false, scaleMode: 'nearest' });
    chunk.dirty = false;
  }
  /** Graphics.texture uses atlas UVs directly. Account for preserved trim explicitly,
   * then crop boundary UVs rather than stretching opaque water over missing corners. */
  private drawCatalogTexture(
    g: Graphics,
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    clipRegion = false,
  ): boolean {
    const appearance = this.environmentAppearance(id);
    const frame = appearance?.frameId && this.frames.get(appearance.frameId);
    const texture = frame && this.assets.texture(frame.id);
    if (!texture || !frame) return false;
    texture.source.scaleMode = 'nearest';
    const scaleX = width / frame.sourceSize.w,
      scaleY = height / frame.sourceSize.h;
    const tx = x + frame.trim.x * scaleX,
      ty = y + frame.trim.y * scaleY;
    const tw = frame.trim.w * scaleX,
      th = frame.trim.h * scaleY;
    const left = clipRegion ? Math.max(0, tx) : tx,
      top = clipRegion ? Math.max(0, ty) : ty;
    const right = clipRegion ? Math.min(REGION * TILE, tx + tw) : tx + tw;
    const bottom = clipRegion ? Math.min(REGION * TILE, ty + th) : ty + th;
    if (right <= left || bottom <= top) return true;
    let image = texture;
    if (left !== tx || top !== ty || right !== tx + tw || bottom !== ty + th) {
      const key = `${texture.uid}:${left - tx}:${top - ty}:${right - left}:${bottom - top}`;
      let clipped = this.clippedTextures.get(key);
      if (!clipped) {
        clipped = new Texture({
          source: texture.source,
          frame: new Rectangle(
            texture.frame.x + ((left - tx) / tw) * texture.frame.width,
            texture.frame.y + ((top - ty) / th) * texture.frame.height,
            ((right - left) / tw) * texture.frame.width,
            ((bottom - top) / th) * texture.frame.height,
          ),
          label: `region:${frame.id}`,
        });
        this.clippedTextures.set(key, clipped);
      }
      image = clipped;
    }
    g.texture(image, 0xffffff, left, top, right - left, bottom - top);
    return true;
  }
  private updateChunks(): void {
    const t = this.terrain!,
      pixels = REGION * TILE;
    const left = Math.max(0, Math.floor(this.camera.x / pixels)),
      right = Math.min(
        Math.ceil(this.scene.width / REGION) - 1,
        Math.ceil(t.size / REGION) - 1,
        Math.floor((this.camera.x + PROFILE.width) / pixels),
      );
    const top = Math.max(0, Math.floor(this.camera.y / pixels)),
      bottom = Math.min(
        Math.ceil(this.scene.height / REGION) - 1,
        Math.ceil(t.size / REGION) - 1,
        Math.floor((this.camera.y + PROFILE.height + 128) / pixels),
      );
    for (let cy = top; cy <= bottom; cy++)
      for (let cx = left; cx <= right; cx++) {
        const key = `${cx},${cy}`;
        let c = this.chunks.get(key);
        if (!c) {
          const container = new Container(),
            graphics = new Graphics();
          container.position.set(cx * pixels, cy * pixels);
          container.addChild(graphics);
          c = { container, graphics, cx, cy, dirty: true };
          this.chunks.set(key, c);
          this.ground.addChild(container);
        }
        if (c.dirty) this.drawChunk(c);
      }
    let evicted = false;
    for (const [key, c] of this.chunks)
      if (c.cx < left || c.cx > right || c.cy < top || c.cy > bottom) {
        c.container.destroy({ children: true });
        this.chunks.delete(key);
        evicted = true;
      }
    // Pixi pools returned cache render targets. Reclaim idle targets at region crossings.
    if (evicted) TexturePool.clear(true);
  }
  private updateProps(): void {
    if (!this.scene.outside) {
      this.updateLocalProps(this.scene);
      return;
    }
    const t = this.terrain!,
      frame = this.frame!,
      centerX = Math.floor(frame.player.x),
      centerY = Math.floor(frame.player.y);
    const key = `${centerX},${centerY}`;
    if (key === this.lastPropsTile) return;
    this.lastPropsTile = key;
    const wanted = new Set<string>();
    const prop = (
      id: string,
      x: number,
      y: number,
      fallback: Texture,
      binding?: { kind: 'environment' | 'item'; id: string },
      canopy = false,
    ): void => {
      wanted.add(id);
      let view = this.props.get(id);
      if (!view) {
        const source = binding
          ? this.textureFor(binding.kind, binding.id, fallback)
          : { texture: fallback, scale: LEGACY_SCALE };
        const sprite = new Sprite(source.texture);
        sprite.anchor.set(source.frame?.anchor.x ?? 0.5, source.frame?.anchor.y ?? 1);
        sprite.scale.set(source.scale);
        view = { sprite, canopy, foliage: id.startsWith('tree:') };
        this.props.set(id, view);
        (id.startsWith('canopy:') ? this.foreground : this.objects).addChild(sprite);
      }
      const e = t.elevation[Math.floor(y) * t.size + Math.floor(x)] ?? 0,
        p = this.projection.world(x, y, e);
      view.sprite.position.set(Math.round(p.x), Math.round(p.y));
      view.sprite.zIndex = this.projection.depth(y, 0);
    };
    const plants = ['berries', 'reeds', 'wheat', 'nectar', 'ashgrass', 'fungi'];
    const cliffFrameId = this.resolver?.resolve('environment', 'cliff_grass')?.frameId;
    const authoredCliff = cliffFrameId && this.assets.texture(cliffFrameId);
    for (let y = Math.max(1, centerY - 14); y < Math.min(t.size - 1, centerY + 15); y++)
      for (let x = Math.max(1, centerX - 19); x < Math.min(t.size - 1, centerX + 20); x++) {
        const i = y * t.size + x,
          resource = t.resource[i]!,
          quantity = t.quantity[i]!;
        if (resource) {
          const plant = plants[resource - 1];
          prop(
            `r:${i}`,
            x + 0.5,
            y + 0.9,
            this.art.resource(resource - 1),
            plant
              ? {
                  kind: 'environment',
                  id: `flora_${plant}_${t.flags[i]! & TileFlag.Burning ? 'burnt' : quantity ? 'healthy' : 'harvested'}`,
                }
              : resource === 7
                ? { kind: 'environment', id: 'rock_pebbles' }
                : resource === 14
                  ? {
                      kind: 'environment',
                      id: quantity ? 'rock_copper_rich' : 'rock_copper_depleted',
                    }
                  : undefined,
          );
        }
        const height = t.elevation[i]! - (t.elevation[i + t.size] ?? t.elevation[i]!);
        if (height > 0 && !(t.flags[i]! & TileFlag.Road) && !authoredCliff)
          prop(
            `cliff:${i}`,
            x + 0.5,
            y + 1,
            this.art.cliff(BIOME_COLORS[t.biome[i]!]!, height * 4),
          );
        const hash = (Math.imul(x + 29, 127) ^ Math.imul(y + 17, 719)) >>> 0;
        if (
          !t.fluid[i] &&
          !(t.flags[i]! & (TileFlag.Protected | TileFlag.Road)) &&
          !resource &&
          (t.biome[i] === Biome.Forest
            ? hash % 10 === 0
            : t.biome[i] === Biome.Meadows && hash % 80 === 0)
        ) {
          const crown = this.resolver?.resolve('environment', 'canopy_oak');
          const crownLoaded = !!crown?.frameId && !!this.assets.texture(crown.frameId);
          const base = this.resolver?.resolve('environment', 'tree_oak');
          const variant = this.resolver?.resolve('environment', 'tree_oak_variant');
          const treeId =
            base?.quality === 'hd' && variant?.quality !== 'hd'
              ? 'tree_oak'
              : hash % 2
                ? 'tree_oak_variant'
                : 'tree_oak';
          prop(
            `tree:${i}`,
            x + 0.5,
            y + 1,
            this.art.tree(hash % 2),
            { kind: 'environment', id: treeId },
            !crownLoaded,
          );
          if (crownLoaded)
            prop(
              `canopy:${i}`,
              x + 0.5,
              y + 1,
              this.art.tree(hash % 2),
              { kind: 'environment', id: 'canopy_oak' },
              true,
            );
        }
      }
    for (const b of t.buildings)
      if (Math.abs(b.x - centerX) < 22 && Math.abs(b.y - centerY) < 18)
        prop(
          b.id,
          b.x + 0.5,
          b.y + 1.2,
          this.art.house(b.village),
          { kind: 'environment', id: HOUSE_ART[b.village]! },
          true,
        );
    for (const s of SETTLEMENTS)
      if (Math.abs(s.x - centerX) < 36 && Math.abs(s.y - centerY) < 30) {
        prop(`${s.id}:stone`, s.x - 2.5, s.y + 1, this.art.landmark('waystone'), {
          kind: 'environment',
          id: 'landmark_waystone',
        });
        prop(`${s.id}:well`, s.x + 4.5, s.y - 2, this.art.landmark('well'), {
          kind: 'environment',
          id: 'landmark_well',
        });
        const hearth = this.resolver?.resolve('environment', 'prop_hearth');
        if (hearth?.frameId && this.assets.texture(hearth.frameId)) {
          const offset = [
            [-4, 3],
            [4, 3],
            [-5, -3],
            [5, -3],
          ].find(([dx, dy]) => {
            const i = (s.y + dy!) * t.size + s.x + dx!;
            return (
              !t.fluid[i] && !(t.flags[i]! & (TileFlag.Road | TileFlag.Solid)) && !t.resource[i]
            );
          });
          if (offset)
            prop(
              `${s.id}:hearth`,
              s.x + offset[0]! + 0.5,
              s.y + offset[1]! + 1,
              this.art.landmark('well'),
              { kind: 'environment', id: 'prop_hearth' },
            );
        }
        for (const [i, [dx, dy]] of [
          [-6, -3],
          [6, -3],
          [-6, 5],
          [6, 5],
        ].entries())
          prop(`${s.id}:flowers:${i}`, s.x + dx!, s.y + dy!, this.art.landmark('flowers'));
        for (const dx of [-2, 2])
          prop(`${s.id}:lamp:${dx}`, s.x + dx, s.y - 2, this.art.landmark('lantern'), {
            kind: 'environment',
            id: 'landmark_lantern',
          });
        if (s.capital)
          for (let dx = -14; dx <= 14; dx += 2)
            if (!(t.flags[(s.y + 12) * t.size + s.x + dx]! & TileFlag.Road))
              prop(`${s.id}:fence:${dx}`, s.x + dx + 0.5, s.y + 12.9, this.art.landmark('fence'), {
                kind: 'environment',
                id: 'landmark_fence',
              });
      }
    for (const corpse of frame.carrion)
      if (Math.abs(corpse.x - centerX) < 20 && Math.abs(corpse.y - centerY) < 15)
        prop(
          `carrion:${corpse.sourceId}`,
          corpse.x,
          corpse.y,
          this.art.texture('carrion', 24, 12, (c) => {
            c.fillStyle = '#665647';
            c.fillRect(2, 5, 20, 5);
            c.fillStyle = '#9c6d60';
            c.fillRect(4, 3, 15, 6);
            c.fillStyle = '#dfcfaa';
            c.fillRect(8, 5, 10, 2);
            c.fillRect(8, 4, 2, 4);
            c.fillRect(16, 4, 2, 4);
          }),
        );
    for (const drop of frame.drops)
      if (Math.abs(drop.x - centerX) < 20 && Math.abs(drop.y - centerY) < 15)
        prop(`drop:${drop.id}`, drop.x, drop.y, this.art.resource(itemIds.indexOf(drop.item)), {
          kind: 'item',
          id: drop.item,
        });
    this.appendSceneProps(this.scene, wanted);
    for (const [id, p] of this.props)
      if (!wanted.has(id)) {
        p.sprite.destroy();
        this.props.delete(id);
      }
    for (const child of this.labels.removeChildren()) child.destroy();
    for (const s of SETTLEMENTS)
      if (Math.abs(s.x - centerX) < 26 && Math.abs(s.y - centerY) < 20) {
        const label = new Text({ text: s.name.toUpperCase(), style: this.labelStyle });
        label.anchor.set(0.5, 1);
        const p = this.projection.world(s.x, s.y - 13);
        label.position.set(p.x, p.y);
        this.labels.addChild(label);
      }
  }
  private updateLocalProps(scene: ScenePresentation): void {
    const key = `${scene.id}:${scene.props.map((p) => `${p.id}:${p.variant ?? ''}`).join(',')}`;
    if (key === this.lastPropsTile) return;
    this.lastPropsTile = key;
    const wanted = new Set<string>();
    this.appendSceneProps(scene, wanted);
    for (const [id, view] of this.props)
      if (!wanted.has(id)) {
        view.sprite.destroy();
        this.props.delete(id);
      }
  }
  private appendSceneProps(scene: ScenePresentation, wanted: Set<string>): void {
    for (const prop of scene.props) {
      if (
        this.frame &&
        (Math.abs(prop.x - this.frame.player.x) > 30 || Math.abs(prop.y - this.frame.player.y) > 22)
      )
        continue;
      wanted.add(prop.id);
      let view = this.props.get(prop.id);
      if (!view) {
        const fallback = this.art.texture('local-prop-prototype', 32, 32, (c) => {
          c.fillStyle = '#30453c';
          c.fillRect(3, 5, 26, 25);
          c.fillStyle = '#a38e68';
          c.fillRect(5, 3, 22, 24);
          c.fillStyle = '#cbbb8b';
          c.fillRect(7, 5, 18, 4);
        });
        const source = this.textureFor('environment', prop.contentId, fallback),
          sprite = new Sprite(source.texture);
        sprite.anchor.set(source.frame?.anchor.x ?? 0.5, source.frame?.anchor.y ?? 1);
        sprite.scale.set(source.frame ? source.scale : 2);
        view = { sprite, canopy: prop.layer === 'roof' || prop.layer === 'canopy', foliage: false };
        this.props.set(prop.id, view);
        (view.canopy
          ? this.foreground
          : prop.layer === 'ground'
            ? this.groundProps
            : this.objects
        ).addChild(sprite);
      }
      const p = this.projection.world(prop.x, prop.y, prop.elevation ?? 0);
      view.sprite.position.set(p.x, p.y);
      view.sprite.zIndex = this.projection.depth(prop.y, 0);
    }
  }
  private animate(e: EntitySprite, tick: number): void {
    e.facing = facingFor(e.actor.facingX, e.actor.facingY, e.facing);
    const hit = tick >= e.hitUntil - 5 && tick < e.hitUntil;
    const reactionActive =
      !!e.actor.reaction && tick >= e.actor.reaction.startedAt && tick < e.actor.reaction.endsAt;
    const reactionActor = reactionActive ? e.actor : { ...e.actor, reaction: undefined };
    const pose = this.poses.resolve(reactionActor, hit),
      clip =
        e.appearance && this.resolver?.clip(e.appearance, pose, e.facing, e.actor.action?.move);
    const sample = clip && this.animations.sample(e.actor, clip, tick);
    e.poseSample = sample;
    const frameId = sample?.frameId,
      frame = frameId && this.frames.get(frameId),
      texture = frameId && this.assets.texture(frameId);
    e.baseFrame = frame || undefined;
    e.socketPositions = undefined;
    e.socketAnchor = undefined;
    const resolvedAppearance = clip && this.resolver?.getAppearance(clip.appearanceId);
    e.fallback = !texture || (!!clip && clip.appearanceId !== e.appearance?.id);
    const modular =
      sample &&
      e.appearance &&
      this.catalog &&
      this.resolver &&
      selectModularLayers(
        this.catalog,
        this.resolver,
        e.actor,
        e.appearance,
        sample.state,
        sample.facing,
      );
    let composed = false;
    try {
      composed = !!(modular && sample && frame && this.composeActor(e, modular, sample, frame));
    } catch (error) {
      this.assetError = `Prototype composition: ${error instanceof Error ? error.message : String(error)}`;
    }
    if (composed) {
      e.fallback = false;
    } else if (e.appearance?.recipeId) {
      e.composite?.release();
      e.composite = undefined;
      e.compositeKey = undefined;
      e.body.texture = e.fallbackTexture;
      e.body.anchor.set(0.5, 1);
      e.body.scale.set(e.kind === 2 ? LEGACY_SCALE : PROFILE.humanHeight / 24);
      e.fallback = true;
      e.baseFrame = undefined;
      e.socketPositions = undefined;
      e.socketAnchor = undefined;
    } else if (texture && frame) {
      e.composite?.release();
      e.composite = undefined;
      e.compositeKey = undefined;
      texture.source.scaleMode = 'nearest';
      e.body.texture = texture;
      e.body.anchor.set(frame.anchor.x, frame.anchor.y);
      e.body.scale.set(
        resolvedAppearance?.quality === 'hd'
          ? 1
          : e.kind === 2
            ? LEGACY_SCALE
            : PROFILE.humanHeight / frame.sourceSize.h,
      );
    } else {
      e.body.texture = e.fallbackTexture;
      e.body.anchor.set(0.5, 1);
      e.body.scale.set(e.kind === 2 ? LEGACY_SCALE : PROFILE.humanHeight / 24);
    }
    e.body.rotation = 0;
    e.body.tint = hit || reactionActive ? 0xffc7aa : 0xffffff;
    e.body.alpha = e.hp <= 0 ? 0.55 : 1;
  }
  private composeActor(
    e: EntitySprite,
    selection: ModularSelection,
    sample: PoseSample,
    bodyFrame: AssetFrame,
  ): boolean {
    if (!selection.complete) return false;
    const { rig, recipe } = selection;
    const layers: { texture: Texture; frame: AssetFrame; target: { x: number; y: number } }[] = [];
    for (const layer of selection.layers) {
      const id = layerFrameId(layer.clip, sample),
        frame = id && this.frames.get(id),
        texture = id && this.assets.texture(id);
      const socket = layer.definition.socketId
        ? bodyFrame.sockets?.[layer.definition.socketId]
        : undefined;
      if (!frame || !texture || (layer.definition.socketId && !socket)) {
        if (layer.definition.required) return false;
        continue;
      }
      layers.push({ texture, frame, target: socket ?? rig.anchorPx });
    }
    if (!layers.length) return false;
    const bounds = compositeBounds(rig.canvas, layers);
    e.socketPositions = new Map(
      layers.flatMap((layer) => Object.entries(layerSockets(layer.frame, layer.target))),
    );
    e.socketAnchor = rig.anchorPx;
    const key = compositeKey(
      e.actor,
      recipe.id,
      layers.map((l) => `${l.frame.id}:${l.texture.uid}`),
      this.loadedTextureResolution,
    );
    if (e.compositeKey !== key || !e.composite) {
      e.composite?.release();
      e.composite = undefined;
      e.compositeKey = undefined;
      const bytes =
        Math.ceil(bounds.w * this.loadedTextureResolution) *
        Math.ceil(bounds.h * this.loadedTextureResolution) *
        4;
      const lease = this.composites.acquire(key, bytes, () => {
        const container = new Container();
        for (const layer of layers) {
          const sprite = new Sprite(layer.texture),
            p = layerRegistration(layer.frame, layer.target);
          sprite.anchor.set(0);
          sprite.position.set(p.x - bounds.x, p.y - bounds.y);
          container.addChild(sprite);
        }
        const texture = RenderTexture.create({
          width: bounds.w,
          height: bounds.h,
          resolution: this.loadedTextureResolution,
          antialias: false,
        });
        texture.source.scaleMode = 'nearest';
        try {
          this.app.renderer.render({ container, target: texture, clear: true });
        } catch (error) {
          texture.destroy(true);
          throw error;
        } finally {
          container.destroy({ children: true });
        }
        return texture;
      });
      if (!lease) return false;
      e.composite = lease;
      e.compositeKey = key;
    }
    e.body.texture = e.composite.value;
    e.body.anchor.set(
      (rig.anchorPx.x - bounds.x) / bounds.w,
      (rig.anchorPx.y - bounds.y) / bounds.h,
    );
    e.body.scale.set(
      e.appearance?.quality === 'hd'
        ? 1
        : e.kind === 2
          ? LEGACY_SCALE
          : PROFILE.humanHeight / rig.canvas.h,
    );
    return true;
  }
  private emitEffect(
    trigger: EffectDefinition['trigger'],
    instance: string,
    actor: ActorPresentation,
    tick: number,
  ): void {
    for (const definition of this.catalog?.effects ?? []) {
      if (
        definition.trigger !== trigger ||
        definition.stage === 'proof' ||
        definition.stage === 'candidate' ||
        (definition.rigId && definition.rigId !== actor.rigId) ||
        (definition.moveId && definition.moveId !== actor.action?.move)
      )
        continue;
      const id = `${definition.id}:${instance}`;
      if (
        this.authoredEffects.has(id) ||
        this.authoredEffects.size >= 128 ||
        [...this.authoredEffects.values()].filter((e) => e.definition.id === definition.id)
          .length >= definition.maxInstances
      )
        continue;
      const sprite = new Sprite(Texture.EMPTY);
      sprite.visible = false;
      sprite.blendMode = definition.blendMode;
      this.vfxLayer.addChild(sprite);
      this.authoredEffects.set(id, {
        definition,
        actor: actor.id,
        sceneId: this.scene.id,
        startedAt: tick,
        origin: this.projection.world(actor.x, actor.y, actor.elevation),
        sprite,
      });
      this.effectDirector.emit({
        id,
        sceneId: this.scene.id,
        kind: trigger === 'hit' ? 'hit' : trigger === 'heal' ? 'care' : 'craft',
        tick,
        seed: effectSeed(id),
        origin: this.projection.world(actor.x, actor.y, actor.elevation),
        count: 4,
        essential: definition.essential,
      });
    }
  }
  private renderEffects(tick: number, quality: Quality, cx: number, cy: number): void {
    for (const [id, effect] of this.authoredEffects) {
      const age = tick - effect.startedAt,
        definition = effect.definition;
      if (effect.sceneId !== this.scene.id || age > definition.lifetimeTicks) {
        effect.sprite.destroy();
        this.authoredEffects.delete(id);
        continue;
      }
      effect.sprite.visible = false;
      if (age < 0 || (!definition.essential && (quality === 'low' || this.reducedMotion))) continue;
      const clip = this.catalog?.clips.find((c) => c.id === definition.clipId);
      const frameId =
        clip?.frameIds[Math.min(clip.frameIds.length - 1, Math.floor((age / 30) * clip.fps))];
      const frame = frameId && this.frames.get(frameId),
        texture = frameId && this.assets.texture(frameId);
      if (!frame || !texture) continue;
      let point = effect.origin;
      const actor = this.entities.get(effect.actor);
      if (definition.attachment !== 'world') {
        if (!actor) continue;
        point = { x: actor.body.x, y: actor.body.y };
        if (definition.attachment === 'socket') {
          const base = actor.baseFrame,
            socket = definition.socketId && actor.socketPositions?.get(definition.socketId),
            bodySocket = definition.socketId && base?.sockets?.[definition.socketId];
          if (socket && actor.socketAnchor)
            point = {
              x: point.x + (socket.x - actor.socketAnchor.x) * actor.body.scale.x,
              y: point.y + (socket.y - actor.socketAnchor.y) * actor.body.scale.y,
            };
          else {
            if (!base || !bodySocket) continue;
            point = socketWorld(base, bodySocket, point, actor.body.scale.x);
          }
        }
      }
      const anchor = frameAnchor(frame);
      effect.sprite.texture = texture;
      effect.sprite.anchor.set(anchor.x / frame.sourceSize.w, anchor.y / frame.sourceSize.h);
      effect.sprite.position.set(point.x - cx, point.y - cy);
      effect.sprite.visible = true;
    }
    for (const particle of this.effectDirector.sample(
      this.scene.id,
      tick,
      this.reducedMotion,
      quality === 'low',
    ))
      this.indicators
        .circle(particle.x - cx, particle.y - cy - 32, particle.radius)
        .fill({ color: particle.kind === 'hit' ? 0xf5d2a1 : 0xaed5bf, alpha: particle.alpha });
    const projectiles =
      (this.frame as (RenderSnapshot & { projectiles?: readonly ProjectilePresentation[] }) | null)
        ?.projectiles ?? [];
    for (const projectile of visibleProjectiles(projectiles, this.scene.id)) {
      const p = this.projection.screen(projectile.x, projectile.y, 0, { x: cx, y: cy }),
        dx = projectile.facingX * 24,
        dy = projectile.facingY * 24;
      this.indicators
        .moveTo(p.x - dx / 2, p.y - dy / 2)
        .lineTo(p.x + dx / 2, p.y + dy / 2)
        .stroke({ color: 0xffedbb, width: 4 });
      this.indicators
        .moveTo(p.x + dx / 2 - dx * 0.3 - dy * 0.2, p.y + dy / 2 - dy * 0.3 + dx * 0.2)
        .lineTo(p.x + dx / 2, p.y + dy / 2)
        .lineTo(p.x + dx / 2 - dx * 0.3 + dy * 0.2, p.y + dy / 2 - dy * 0.3 - dx * 0.2)
        .stroke({ color: 0xf8d49b, width: 3 });
    }
  }
  private render(): boolean {
    const now = performance.now(),
      dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    const frame = this.frame,
      t = this.terrain;
    if (!frame || !t || (frame.paused.length > 0 && !this.needsRedraw)) return false;
    const started = performance.now(),
      elevation =
        t.elevation[Math.floor(frame.player.y) * t.size + Math.floor(frame.player.x)] ?? 0;
    const presentation = this.clock.sample(now);
    this.camera.follow(frame.player.x, frame.player.y, elevation, dt);
    const camera = sceneCamera(this.camera, this.scene, TILE, PROFILE);
    this.camera.x = camera.x;
    this.camera.y = camera.y;
    this.updateChunks();
    this.updateProps();
    const shake = this.shake.sample(presentation.tick, this.reducedMotion);
    const cx = Math.round(this.camera.x) - shake.x,
      cy = Math.round(this.camera.y) - shake.y;
    this.renderCamera = { x: cx, y: cy };
    this.ground.position.set(-cx, -cy);
    this.objects.position.set(-cx, -cy);
    this.foreground.position.set(-cx, -cy);
    this.groundProps.position.set(-cx, -cy);
    this.labels.position.set(-cx, -cy);
    const effectQuality =
      this.qualitySettings.effects <= 0
        ? 'low'
        : this.qualitySettings.effects < 1
          ? 'medium'
          : this.quality;
    if (this.scene.outside) this.drawSurfaceEffects(presentation.seconds, effectQuality, cx, cy);
    else this.surfaceEffects.clear();
    for (const [id, e] of this.entities) {
      const position = this.animations.position(e.actor, presentation.tick);
      e.x = position.x;
      e.y = position.y;
      const p = this.projection.world(e.x, e.y, position.elevation);
      e.body.position.set(Math.round(p.x), Math.round(p.y));
      e.body.zIndex = this.projection.depth(e.y, id);
      e.shadow.position.copyFrom(e.body.position);
      e.shadow.zIndex = e.body.zIndex - 0.01;
      e.health.position.copyFrom(e.body.position);
      e.health.zIndex = e.body.zIndex + 0.01;
      this.animate(e, presentation.tick);
      const index = Math.floor(e.y) * t.size + Math.floor(e.x);
      this.footprints.observe(
        e.actor,
        presentation.tick,
        this.scene.outside &&
          (t.biome[index] === Biome.Beach ||
            t.fluid[index] === Fluid.Mud ||
            frame.weather.kind === 'snow'),
      );
      // A small additive lean reads as unstable footing; authored gait remains in control.
      const moving = e.actor.pose === 'walk' || e.actor.pose === 'run';
      const phase =
        ((e.actor.locomotion?.distance ?? 0) /
          Math.max(0.2, e.actor.physique?.strideTiles ?? 1.5)) *
        Math.PI *
        2;
      const body = e.actor.physique;
      const stability = body
        ? clamp(body.heightMeters / 1.7 / Math.cbrt(body.massKg / 70), 0.5, 1.5)
        : 1;
      e.body.skew.x =
        !this.reducedMotion && moving && t.fluid[index] === Fluid.Mud
          ? Math.sin(phase) * 0.014 * stability
          : 0;
    }
    this.footprints.prune(presentation.tick, new Set(this.entities.keys()));
    this.footprintGraphics.clear();
    if (!this.reducedMotion && effectQuality !== 'low')
      for (const mark of this.footprints.marks) {
        const p = this.projection.world(mark.x, mark.y, mark.elevation),
          age = presentation.tick - mark.tick;
        this.footprintGraphics
          .ellipse(p.x - cx, p.y - cy, mark.size, mark.size * 0.45)
          .fill({ color: 0x574f3c, alpha: 0.24 * Math.max(0, 1 - age / 180) });
      }
    const player = this.entities.get(0);
    if (player)
      for (const p of this.props.values()) {
        const s = p.sprite,
          left = s.x - s.anchor.x * s.width,
          top = s.y - s.anchor.y * s.height;
        s.skew.x =
          p.foliage && !this.reducedMotion && effectQuality !== 'low'
            ? Math.sin(presentation.seconds * 0.6 + s.x / TILE) * 0.008
            : 0;
        s.alpha =
          p.canopy &&
          (s.parent === this.foreground || player.body.zIndex < s.zIndex) &&
          player.body.x + player.body.width / 2 > left &&
          player.body.x - player.body.width / 2 < left + s.width &&
          player.body.y > top &&
          player.body.y - player.body.height < s.y
            ? 0.35
            : 1;
      }
    this.indicators.clear();
    for (const e of this.entities.values())
      if (e.gesture)
        this.indicators
          .star(e.body.x - cx, e.body.y - cy - 150, 4, 20, 8)
          .fill({ color: 0xf0d99c, alpha: 0.8 });
    const selected = this.selected === null ? null : this.entities.get(this.selected);
    if (selected)
      this.indicators
        .ellipse(selected.body.x - cx, selected.body.y - cy, 44, 16)
        .stroke({ color: 0xf1d994, width: 3, alpha: 0.9 });
    for (const e of this.entities.values())
      if (
        e.actor.action &&
        presentation.tick >= e.actor.action.startedAt &&
        presentation.tick < e.actor.action.endsAt
      ) {
        const active =
          presentation.tick >= e.actor.action.activeAt &&
          presentation.tick < e.actor.action.recoveryAt;
        this.indicators
          .circle(
            e.body.x - cx + e.actor.facingX * 60,
            e.body.y - cy - 32 + e.actor.facingY * 40,
            44,
          )
          .stroke({
            color: e.actor.action.move === 'element' ? 0xb6e0d3 : 0xf5dfab,
            width: active ? 8 : 3,
            alpha: active ? 0.9 : 0.35,
          });
      }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const cue = this.effects[i]!,
        age = presentation.tick - cue.tick;
      if (age < 0) continue;
      if (age > 15) {
        this.effects.splice(i, 1);
        continue;
      }
      const e = this.entities.get(cue.target ?? cue.actor);
      if (e && cue.kind === 'hit')
        this.indicators
          .circle(e.body.x - cx, e.body.y - cy - 48, 20 + age * 2)
          .stroke({ color: 0xf6dda7, width: 3, alpha: (1 - age / 16) * 0.8 });
    }
    this.renderEffects(presentation.tick, effectQuality, cx, cy);
    for (const portal of this.scene.portals) {
      const p = this.projection.screen(portal.x, portal.y, 0, { x: cx, y: cy });
      if (p.x < 0 || p.y < 0 || p.x > PROFILE.width || p.y > PROFILE.height) continue;
      this.indicators
        .rect(p.x - 20, p.y - 52, 40, 52)
        .stroke({ color: portal.allowed ? 0xe8d59c : 0xb7796b, width: 3, alpha: 0.8 });
    }
    this.lighting.lights.visible = this.scene.outside;
    if (this.scene.outside) {
      this.lighting.render(frame, this.renderCamera, effectQuality);
      this.weather.render(frame, presentation.seconds, effectQuality, this.reducedMotion);
    } else {
      this.weather.graphics.clear();
      this.lighting.darkness
        .clear()
        .rect(0, 0, PROFILE.width, PROFILE.height)
        .fill({ color: 0x0c201c, alpha: this.scene.kind === 'cave' ? 0.18 : 0.04 });
    }
    this.drawDebug(frame, cx, cy);
    this.renderMs = performance.now() - started;
    if (!frame.paused.length && this.qualitySettings.sample(dt * 1000))
      this.app.renderer.resize(
        PROFILE.width,
        PROFILE.height,
        this.qualitySettings.framebufferScale,
      );
    this.needsRedraw = false;
    return true;
  }
  private drawSurfaceEffects(seconds: number, quality: Quality, cx: number, cy: number): void {
    const g = this.surfaceEffects,
      t = this.terrain!;
    g.clear();
    if (quality === 'low' || this.reducedMotion) return;
    const limit = quality === 'high' ? 128 : 64;
    let count = 0;
    for (
      let y = Math.max(0, Math.floor(cy / TILE));
      y < Math.min(t.size, (cy + PROFILE.height + 64) / TILE);
      y++
    )
      for (
        let x = Math.max(0, Math.floor(cx / TILE));
        x < Math.min(t.size, (cx + PROFILE.width) / TILE);
        x++
      ) {
        const i = y * t.size + x;
        if (!t.fluid[i] || count >= limit) continue;
        const hash = (Math.imul(x + 13, 127) ^ Math.imul(y + 17, 719)) >>> 0;
        const p = this.projection.screen(x + 0.5, y + 0.5, t.elevation[i] ?? 0, { x: cx, y: cy });
        const wave = Math.sin(seconds * 1.7 + (hash % 31));
        g.rect(p.x - 16 + wave * 6, p.y + (hash % 13), 20, 2).fill({
          color: t.fluid[i] === 3 ? 0xf7cd89 : 0xc8e2da,
          alpha: 0.17 + wave * 0.07,
        });
        count++;
      }
  }
  private drawDebug(frame: RenderSnapshot, cx: number, cy: number): void {
    const g = this.debug,
      t = this.terrain!;
    g.clear();
    if (!this.debugEnabled) return;
    const point = (x: number, y: number) =>
      this.projection.screen(x, y, t.elevation[Math.floor(y) * t.size + Math.floor(x)] ?? 0, {
        x: cx,
        y: cy,
      });
    for (const path of frame.debugPaths) {
      const first = path.points[0];
      if (!first) continue;
      const start = point(first.x, first.y);
      g.moveTo(start.x, start.y);
      for (const w of path.points.slice(1)) {
        const p = point(w.x, w.y);
        g.lineTo(p.x, p.y);
      }
      g.stroke({
        color: path.actor.startsWith('npc:') ? 0x99d8db : 0xaace82,
        alpha: 0.8,
        width: 3,
      });
    }
    for (const c of frame.creatures.slice(0, 32)) {
      const p = point(c.x, c.y),
        goal = point(c.goal.x, c.goal.y);
      g.moveTo(p.x, p.y).lineTo(goal.x, goal.y).stroke({ color: 0xe9ce85, alpha: 0.45, width: 3 });
      for (const [i, n] of [c.food, c.water, c.recreation, c.cleanliness, c.rest].entries())
        g.rect(p.x - 32 + i * 16, p.y - 160, 12, 20)
          .fill(0x203b31)
          .rect(p.x - 32 + i * 16, p.y - 160 + (1 - n) * 20, 12, n * 20)
          .fill([0xabca82, 0x88c4ca, 0xe0bd87, 0xbb9bcd, 0xd5ca91][i]!);
    }
    for (const threat of frame.threats) {
      const from = point(threat.from.x, threat.from.y),
        to = point(threat.to.x, threat.to.y);
      g.moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({ color: threat.cause === 'hunt' ? 0xe7a068 : 0xe17e7a, alpha: 0.7, width: 3 });
    }
    for (let y = Math.floor(cy / TILE); y < (cy + PROFILE.height) / TILE; y++)
      for (let x = Math.floor(cx / TILE); x < (cx + PROFILE.width) / TILE; x++) {
        if (x < 0 || y < 0 || x >= t.size || y >= t.size) continue;
        if (t.flags[y * t.size + x]! & TileFlag.Solid)
          g.rect(x * TILE - cx, y * TILE - cy, TILE, TILE).stroke({
            color: 0xef8781,
            alpha: 0.8,
            width: 3,
          });
      }
  }
  get stats(): {
    sprites: number;
    chunks: number;
    fps: number;
    renderMs: number;
    loadMs: number;
    textureBytes: number;
    atlasBytes: number;
    cacheBytes: number;
    framebufferBytes: number;
    compositeBytes: number;
    framebufferScale: number;
    textureResolution: 1 | 0.5;
    gpu: string;
    assetError: string;
    prototypeActors: number;
  } {
    const atlasBytes = this.assets.stats.residentBytes;
    let cacheBytes = 0;
    for (const c of this.chunks.values()) {
      const source = c.container.renderGroup?.texture?.source;
      if (source) cacheBytes += source.pixelWidth * source.pixelHeight * 4;
    }
    const framebufferBytes =
      PROFILE.width * PROFILE.height * this.qualitySettings.framebufferScale ** 2 * 8;
    return {
      sprites: this.entities.size + this.props.size,
      chunks: this.chunks.size,
      fps: this.initialized ? this.app.ticker.FPS : 0,
      renderMs: this.renderMs,
      loadMs: this.loadMs,
      textureBytes: atlasBytes + cacheBytes + framebufferBytes + this.composites.stats.bytes,
      compositeBytes: this.composites.stats.bytes,
      atlasBytes,
      cacheBytes,
      framebufferBytes,
      framebufferScale: this.qualitySettings.framebufferScale,
      textureResolution: this.loadedTextureResolution,
      gpu: this.gpu,
      assetError: this.assetError,
      prototypeActors: [...this.entities.values()].filter(
        (e) => e.fallback || e.appearance?.quality !== 'hd',
      ).length,
    };
  }
  dispose(): void {
    this.disposed = true;
    this.assetRequest?.abort();
    this.assetLease?.release();
    this.prepareRequest?.abort();
    this.preparedLease?.release();
    for (const e of this.entities.values()) e.composite?.release();
    this.composites.clear();
    for (const effect of this.authoredEffects.values()) effect.sprite.destroy();
    this.authoredEffects.clear();
    this.clearClippedTextures();
    void this.assets.dispose().catch(() => undefined);
    if (this.initialized) this.app.destroy(true, { children: true });
    TexturePool.clear(true);
    this.art.dispose();
  }
}
