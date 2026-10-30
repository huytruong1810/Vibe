import { Application, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { SETTLEMENTS } from '../content/definitions';
import { ENTITY_STRIDE, type RenderSnapshot, type TerrainView } from '../domain/contracts';
import { BIOME_COLORS, Biome, DualGridAutotiler, TileFlag } from '../domain/world';
import { CONFIG, clamp } from '../domain/values';
import { PixelArt } from './art';

export type Quality = 'low' | 'medium' | 'high';
export class CameraController {
  x = 0;
  y = 0;
  initialized = false;
  follow(x: number, y: number, elevation: number, dt: number): void {
    const tx = x * CONFIG.tileSize - CONFIG.nativeWidth / 2,
      ty = y * CONFIG.tileSize - elevation * 4 - CONFIG.nativeHeight / 2;
    if (!this.initialized) {
      this.x = tx;
      this.y = ty;
      this.initialized = true;
    }
    const factor = 1 - Math.exp(-dt * 10);
    this.x += (tx - this.x) * factor;
    this.y += (ty - this.y) * factor;
  }
}
interface EntitySprite {
  readonly body: Sprite;
  readonly shadow: Graphics;
  readonly health: Graphics;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  elevated: number;
  kind: number;
  mode: number;
  gesture: boolean;
}
interface ChunkView {
  readonly container: Container;
  readonly graphics: Graphics;
  readonly cx: number;
  readonly cy: number;
  dirty: boolean;
}

export class ParticlePool {
  readonly x = new Float32Array(160);
  readonly y = new Float32Array(160);
  readonly phase = new Float32Array(160);
  constructor() {
    for (let i = 0; i < this.x.length; i++) {
      this.x[i] = (i * 79.37) % CONFIG.nativeWidth;
      this.y[i] = (i * 41.19) % CONFIG.nativeHeight;
      this.phase[i] = i * 1.71;
    }
  }
}
export class WeatherRenderer {
  readonly graphics = new Graphics();
  private readonly pool = new ParticlePool();
  render(
    frame: RenderSnapshot,
    seconds: number,
    dt: number,
    quality: Quality,
    reducedMotion: boolean,
  ): void {
    const g = this.graphics;
    g.clear();
    if (reducedMotion || quality === 'low') return;
    const rain = frame.weather.kind === 'rain',
      snow = frame.weather.kind === 'snow';
    const count = quality === 'high' ? (rain || snow ? 100 : 28) : rain || snow ? 45 : 12;
    for (let i = 0; i < count; i++) {
      const speed = rain ? 90 : snow ? 10 : 6;
      this.pool.x[i] =
        (this.pool.x[i]! +
          dt * (rain ? -18 : 3 + Math.sin(seconds + this.pool.phase[i]!) * 4) +
          CONFIG.nativeWidth) %
        CONFIG.nativeWidth;
      this.pool.y[i] = (this.pool.y[i]! + dt * speed) % CONFIG.nativeHeight;
      const x = Math.floor(this.pool.x[i]!),
        y = Math.floor(this.pool.y[i]!);
      g.rect(x, y, rain ? 1 : 2, rain ? 5 : 1).fill({
        color: rain ? 0xc4dcd7 : snow ? 0xe6ebdf : frame.season === 2 ? 0xceaa79 : 0xe6c7ae,
        alpha: rain ? 0.35 : 0.65,
      });
    }
  }
}
export class LightingRenderer {
  readonly darkness = new Graphics();
  readonly lights = new Container();
  constructor(private readonly art: PixelArt) {}
  render(frame: RenderSnapshot, camera: CameraController, quality: Quality): void {
    const night = clamp((Math.cos((frame.hour / 24) * Math.PI * 2) + 0.1) * 0.45, 0, 0.48);
    this.darkness
      .clear()
      .rect(0, 0, CONFIG.nativeWidth, CONFIG.nativeHeight)
      .fill({ color: 0x102f3a, alpha: night });
    for (const child of this.lights.removeChildren()) child.destroy();
    if (night < 0.04 || quality === 'low') return;
    const near = SETTLEMENTS.filter(
      (s) => Math.abs(s.x * 16 - camera.x - 240) < 330 && Math.abs(s.y * 16 - camera.y - 135) < 230,
    ).slice(0, quality === 'high' ? 8 : 3);
    for (const s of near) {
      const light = new Sprite(this.art.light());
      light.anchor.set(0.5);
      light.position.set(Math.round(s.x * 16 - camera.x), Math.round(s.y * 16 - camera.y));
      light.blendMode = 'add';
      this.lights.addChild(light);
    }
  }
}

export class WorldRenderer {
  readonly app = new Application();
  readonly camera = new CameraController();
  private readonly art = new PixelArt();
  private readonly ground = new Container();
  private readonly objects = new Container();
  private readonly chunks = new Map<string, ChunkView>();
  private readonly entities = new Map<number, EntitySprite>();
  private readonly props = new Map<string, Sprite>();
  private readonly indicators = new Graphics();
  private readonly debug = new Graphics();
  private readonly labels = new Container();
  private readonly weather = new WeatherRenderer();
  private readonly lighting = new LightingRenderer(this.art);
  private readonly tiler = new DualGridAutotiler();
  private terrain: TerrainView | null = null;
  private frame: RenderSnapshot | null = null;
  private lastPropsTile = '';
  private selected: number | null = null;
  private quality: Quality = 'medium';
  private reducedMotion = false;
  private debugEnabled = false;
  private last = performance.now();
  private accumulated = 0;
  private readonly labelStyle = new TextStyle({
    fontFamily: 'monospace',
    fontSize: 8,
    fill: 0xf1e9c9,
    stroke: { color: 0x355047, width: 2 },
    align: 'center',
  });
  async initialize(element: HTMLElement): Promise<void> {
    await this.app.init({
      width: CONFIG.nativeWidth,
      height: CONFIG.nativeHeight,
      backgroundColor: 0x203c35,
      antialias: false,
      resolution: 1,
      roundPixels: true,
      preference: 'webgl',
    });
    this.app.canvas.setAttribute(
      'aria-label',
      'Hearthwild game world. Move with WASD or arrow keys.',
    );
    this.app.canvas.setAttribute('role', 'img');
    element.appendChild(this.app.canvas);
    this.objects.sortableChildren = true;
    this.app.stage.addChild(
      this.ground,
      this.objects,
      this.indicators,
      this.labels,
      this.lighting.darkness,
      this.lighting.lights,
      this.weather.graphics,
      this.debug,
    );
    this.app.ticker.add(() => this.render());
  }
  setTerrain(terrain: TerrainView): void {
    this.terrain = terrain;
    this.camera.initialized = false;
    this.lastPropsTile = '';
    for (const chunk of this.chunks.values()) chunk.container.destroy({ children: true });
    this.chunks.clear();
    for (const sprite of this.props.values()) sprite.destroy();
    this.props.clear();
    for (const entity of this.entities.values()) {
      entity.body.destroy();
      entity.shadow.destroy();
      entity.health.destroy();
    }
    this.entities.clear();
    for (const child of this.labels.removeChildren()) child.destroy();
  }
  apply(frame: RenderSnapshot): void {
    this.frame = frame;
    const terrain = this.terrain;
    if (!terrain) return;
    for (const delta of frame.deltas) {
      terrain.flags[delta.index] = delta.flags;
      terrain.fluid[delta.index] = delta.fluid;
      terrain.resource[delta.index] = delta.resource;
      terrain.quantity[delta.index] = delta.quantity;
      const key = `${Math.floor((delta.index % terrain.size) / CONFIG.chunkSize)},${Math.floor(Math.floor(delta.index / terrain.size) / CONFIG.chunkSize)}`;
      const chunk = this.chunks.get(key);
      if (chunk) chunk.dirty = true;
    }
    if (frame.deltas.length) this.lastPropsTile = '';
    if (frame.carrion.length || frame.drops.length) this.lastPropsTile = '';
    const seen = new Set<number>();
    for (let i = 0; i < frame.count; i++) {
      const at = i * ENTITY_STRIDE,
        p = frame.packed,
        id = frame.ids[i]!,
        kind = p[at + 1]!,
        x = p[at + 2]!,
        y = p[at + 3]!;
      // Only instantiate visible entities; distant simulation does not imply distant sprites.
      if (Math.abs(x - frame.player.x) > 24 || Math.abs(y - frame.player.y) > 20) continue;
      seen.add(id);
      let entity = this.entities.get(id);
      if (!entity) {
        const body = new Sprite(
          kind === 2
            ? this.art.creature(p[at + 7]!, p[at + 5]!)
            : this.art.person(p[at + 7]!, kind === 0),
        );
        body.anchor.set(0.5, 1);
        const shadow = new Graphics()
          .ellipse(0, 0, kind === 2 ? 7 : 5, 2)
          .fill({ color: 0x243d32, alpha: 0.22 });
        const health = new Graphics();
        entity = {
          body,
          shadow,
          health,
          x,
          y,
          targetX: x,
          targetY: y,
          elevated: p[at + 4]!,
          kind,
          mode: 0,
          gesture: false,
        };
        this.entities.set(id, entity);
        this.objects.addChild(shadow, body, health);
      }
      entity.targetX = x;
      entity.targetY = y;
      entity.elevated = p[at + 4]!;
      entity.mode = p[at + 9]!;
      entity.gesture = (p[at + 8]! & 4) !== 0;
      entity.body.alpha = p[at + 6]! <= 0 ? 0.45 : 1;
      const asleep =
        kind === 2
          ? frame.creatures.find((c) => c.id === id)?.sleeping
          : frame.humanNeeds.find((h) => h.id === id)?.sleeping;
      entity.body.rotation = asleep ? -0.35 : 0;
      entity.health.clear();
      if (p[at + 6]! < 0.99 || id === this.selected || p[at + 8] === 1)
        entity.health
          .rect(-8, -28, 16, 2)
          .fill(0x3a5748)
          .rect(-8, -28, 16 * clamp(p[at + 6]!), 2)
          .fill(p[at + 8] === 1 ? 0xdcc48b : 0xb9ce91);
    }
    for (const [id, entity] of this.entities)
      if (!seen.has(id)) {
        entity.body.destroy();
        entity.shadow.destroy();
        entity.health.destroy();
        this.entities.delete(id);
      }
  }
  settings(quality: Quality, reducedMotion: boolean, debug: boolean): void {
    this.quality = quality;
    this.reducedMotion = reducedMotion;
    this.debugEnabled = debug;
  }
  select(id: number | null): void {
    this.selected = id;
  }
  private tileColor(index: number): number {
    const t = this.terrain!;
    return BIOME_COLORS[t.biome[index]!] ?? 0x8da570;
  }
  private drawChunk(chunk: ChunkView): void {
    const t = this.terrain!,
      g = chunk.graphics;
    g.clear();
    for (let dy = 0; dy < CONFIG.chunkSize; dy++)
      for (let dx = 0; dx < CONFIG.chunkSize; dx++) {
        const x = chunk.cx * CONFIG.chunkSize + dx,
          y = chunk.cy * CONFIG.chunkSize + dy;
        if (x >= t.size || y >= t.size) continue;
        const index = y * t.size + x,
          color = this.tileColor(index),
          flags = t.flags[index]!,
          px = dx * 16,
          py = dy * 16;
        g.rect(px, py, 16, 16).fill(color);
        const hash = Math.imul(x + 13, 73856093) ^ Math.imul(y + 7, 19349663);
        const elevation = t.elevation[index]!,
          next = t.elevation[index + t.size] ?? elevation;
        if (elevation) g.rect(px, py - elevation * 4, 16, 16).fill(color);
        if (elevation > next && !(flags & TileFlag.Road)) {
          g.rect(px, py + 12, 16, 4).fill({ color: 0x4d6250, alpha: 0.4 });
          g.rect(px, py + 12, 16, 1).fill({ color: 0xd4c69b, alpha: 0.3 });
        }
        if (t.fluid[index]) {
          g.rect(px + (hash & 7), py + ((hash >> 3) & 7) + 3, 5, 1).fill({
            color: 0xd2e3c2,
            alpha: 0.3,
          });
        } else if (!(flags & TileFlag.Road) && (hash & 3) !== 0) {
          g.rect(px + (hash & 7) + 2, py + ((hash >> 4) & 7) + 3, 1, 3).fill({
            color: 0x365f40,
            alpha: 0.15,
          });
          g.rect(px + ((hash >> 8) & 7) + 5, py + ((hash >> 12) & 7) + 5, 2, 1).fill({
            color: 0xe5dcb0,
            alpha: 0.15,
          });
        } else if ((hash & 3) === 0)
          g.rect(px + 3, py + 9, 3, 1).fill({ color: 0x918b6f, alpha: 0.3 });
        if (flags & TileFlag.Burning)
          g.rect(px + 5, py + 3, 5, 10)
            .fill(0xe8ae67)
            .rect(px + 7, py + 7, 2, 6)
            .fill(0xf3d79a);
      }
    const grid = { size: t.size, index: (x: number, y: number) => y * t.size + x };
    const overlays = [
      { matches: (i: number) => t.fluid[i] === 4, color: 0x6b8670 },
      { matches: (i: number) => t.fluid[i] === 1, color: 0x6ca6a0 },
      { matches: (i: number) => t.fluid[i] === 2, color: 0x689da2 },
      { matches: (i: number) => t.fluid[i] === 3, color: 0xc98558 },
      { matches: (i: number) => (t.flags[i]! & TileFlag.Ice) !== 0, color: 0xb3d2cf },
      { matches: (i: number) => (t.flags[i]! & TileFlag.Road) !== 0, color: 0xc5b78c },
    ];
    for (let y = 0; y <= CONFIG.chunkSize; y++)
      for (let x = 0; x <= CONFIG.chunkSize; x++)
        for (const overlay of overlays) {
          const mask = this.tiler.mask(
            grid,
            chunk.cx * CONFIG.chunkSize + x - 1,
            chunk.cy * CONFIG.chunkSize + y - 1,
            overlay.matches,
          );
          if (mask === 15) g.rect(x * 16 - 8, y * 16 - 8, 16, 16).fill(overlay.color);
          else
            for (const rect of this.tiler.pattern(mask))
              g.rect(x * 16 - 8 + rect.x, y * 16 - 8 + rect.y, rect.width, rect.height).fill(
                overlay.color,
              );
        }
    if (chunk.container.isCachedAsTexture) chunk.container.updateCacheTexture();
    else chunk.container.cacheAsTexture({ resolution: 1, antialias: false });
    chunk.dirty = false;
  }
  private updateChunks(): void {
    const t = this.terrain!,
      cx = Math.floor((this.camera.x + 240) / (CONFIG.chunkSize * 16)),
      cy = Math.floor((this.camera.y + 135) / (CONFIG.chunkSize * 16));
    for (let y = Math.max(0, cy - 1); y <= Math.min(t.size / CONFIG.chunkSize - 1, cy + 1); y++)
      for (let x = Math.max(0, cx - 1); x <= Math.min(t.size / CONFIG.chunkSize - 1, cx + 1); x++) {
        const key = `${x},${y}`;
        let chunk = this.chunks.get(key);
        if (!chunk) {
          const container = new Container(),
            graphics = new Graphics();
          container.position.set(x * CONFIG.chunkSize * 16, y * CONFIG.chunkSize * 16);
          container.addChild(graphics);
          chunk = { container, graphics, cx: x, cy: y, dirty: true };
          this.chunks.set(key, chunk);
          this.ground.addChild(container);
        }
        if (chunk.dirty) this.drawChunk(chunk);
      }
    for (const [key, chunk] of this.chunks)
      if (Math.abs(chunk.cx - cx) > 1 || Math.abs(chunk.cy - cy) > 1) {
        chunk.container.destroy({ children: true });
        this.chunks.delete(key);
      }
  }
  private updateProps(): void {
    const t = this.terrain!,
      frame = this.frame!,
      centerX = Math.floor(frame.player.x),
      centerY = Math.floor(frame.player.y),
      key = `${centerX},${centerY}`;
    if (key === this.lastPropsTile) return;
    this.lastPropsTile = key;
    const wanted = new Set<string>();
    const prop = (id: string, x: number, y: number, texture: Sprite['texture']): void => {
      wanted.add(id);
      let sprite = this.props.get(id);
      if (!sprite) {
        sprite = new Sprite(texture);
        sprite.anchor.set(0.5, 1);
        this.props.set(id, sprite);
        this.objects.addChild(sprite);
      }
      const elevation = t.elevation[Math.floor(y) * t.size + Math.floor(x)] ?? 0;
      sprite.position.set(Math.floor(x * 16), Math.floor(y * 16 - elevation * 4));
      sprite.zIndex = Math.floor(y * 1600);
    };
    for (let y = Math.max(1, centerY - 14); y < Math.min(t.size - 1, centerY + 15); y++)
      for (let x = Math.max(1, centerX - 19); x < Math.min(t.size - 1, centerX + 20); x++) {
        const i = y * t.size + x;
        if (t.resource[i] && t.quantity[i])
          prop(`r:${i}`, x + 0.5, y + 0.9, this.art.resource(t.resource[i]! - 1));
        const height = t.elevation[i]! - (t.elevation[i + t.size] ?? t.elevation[i]!);
        if (height > 0 && !(t.flags[i]! & TileFlag.Road))
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
          !t.resource[i] &&
          (t.biome[i] === Biome.Forest
            ? hash % 10 === 0
            : t.biome[i] === Biome.Meadows && hash % 80 === 0)
        )
          prop(`t:${i}`, x + 0.5, y + 1, this.art.tree(hash % 2));
      }
    for (const building of t.buildings)
      if (Math.abs(building.x - centerX) < 22 && Math.abs(building.y - centerY) < 18)
        prop(building.id, building.x + 0.5, building.y + 1.2, this.art.house(building.village));
    for (const s of SETTLEMENTS)
      if (Math.abs(s.x - centerX) < 36 && Math.abs(s.y - centerY) < 30) {
        prop(`${s.id}:stone`, s.x - 2.5, s.y + 1, this.art.landmark('waystone'));
        prop(`${s.id}:well`, s.x + 4.5, s.y - 2, this.art.landmark('well'));
        for (const [i, [dx, dy]] of [
          [-6, -3],
          [6, -3],
          [-6, 5],
          [6, 5],
        ].entries())
          prop(`${s.id}:flowers:${i}`, s.x + dx!, s.y + dy!, this.art.landmark('flowers'));
        for (const dx of [-2, 2])
          prop(`${s.id}:lamp:${dx}`, s.x + dx, s.y - 2, this.art.landmark('lantern'));
        if (s.capital)
          for (let dx = -14; dx <= 14; dx += 2)
            if (!(t.flags[(s.y + 12) * t.size + s.x + dx]! & TileFlag.Road))
              prop(`${s.id}:fence:${dx}`, s.x + dx + 0.5, s.y + 12.9, this.art.landmark('fence'));
      }
    for (const corpse of frame.carrion)
      if (Math.abs(corpse.x - centerX) < 20 && Math.abs(corpse.y - centerY) < 15)
        prop(`carrion:${corpse.sourceId}`, corpse.x, corpse.y, this.art.resource(15));
    for (const drop of frame.drops)
      if (Math.abs(drop.x - centerX) < 20 && Math.abs(drop.y - centerY) < 15)
        prop(`drop:${drop.id}`, drop.x, drop.y, this.art.resource(8));
    for (const [id, sprite] of this.props)
      if (!wanted.has(id)) {
        sprite.destroy();
        this.props.delete(id);
      }
    for (const child of this.labels.removeChildren()) child.destroy();
    for (const s of SETTLEMENTS)
      if (Math.abs(s.x - centerX) < 26 && Math.abs(s.y - centerY) < 20) {
        const label = new Text({ text: s.name.toUpperCase(), style: this.labelStyle });
        label.anchor.set(0.5, 1);
        label.position.set(s.x * 16, (s.y - 13) * 16);
        this.labels.addChild(label);
      }
  }
  private render(): void {
    const now = performance.now(),
      dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.accumulated += dt;
    const frame = this.frame,
      t = this.terrain;
    if (!frame || !t) return;
    const elevation =
      t.elevation[Math.floor(frame.player.y) * t.size + Math.floor(frame.player.x)] ?? 0;
    this.camera.follow(frame.player.x, frame.player.y, elevation, dt);
    this.updateChunks();
    this.updateProps();
    const cx = Math.round(this.camera.x),
      cy = Math.round(this.camera.y);
    this.ground.position.set(-cx, -cy);
    this.objects.position.set(-cx, -cy);
    this.labels.position.set(-cx, -cy);
    for (const [id, entity] of this.entities) {
      const factor = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 24);
      entity.x += (entity.targetX - entity.x) * factor;
      entity.y += (entity.targetY - entity.y) * factor;
      const bob =
        entity.kind === 2 && frame.paused.length === 0 && !this.reducedMotion
          ? Math.round(Math.sin(this.accumulated * 3 + id) * 0.6)
          : 0;
      const px = Math.round(entity.x * 16),
        py = Math.round(entity.y * 16 - entity.elevated * 4);
      entity.body.position.set(px, py + bob);
      entity.body.zIndex = Math.round(entity.y * 1600) + (id / 0x100000000) * 0.1;
      entity.shadow.position.set(px, py);
      entity.shadow.zIndex = entity.body.zIndex - 0.5;
      entity.health.position.set(px, py);
      entity.health.zIndex = entity.body.zIndex + 0.5;
    }
    this.indicators.clear();
    for (const entity of this.entities.values())
      if (entity.gesture) {
        const x = Math.round(entity.x * 16 - cx),
          y = Math.round(entity.y * 16 - entity.elevated * 4 - cy - 30);
        this.indicators.star(x, y, 4, 5, 2).fill({ color: 0xf0d99c, alpha: 0.8 });
      }
    const selected = this.selected === null ? null : this.entities.get(this.selected);
    if (selected)
      this.indicators
        .ellipse(
          Math.round(selected.x * 16 - cx),
          Math.round(selected.y * 16 - selected.elevated * 4 - cy),
          11,
          4,
        )
        .stroke({ color: 0xf1d994, width: 1, alpha: 0.9 });
    if (frame.player.attack) {
      const px = frame.player.x * 16 - cx,
        py = frame.player.y * 16 - elevation * 4 - cy;
      this.indicators
        .circle(px + frame.player.facingX * 15, py - 8 + frame.player.facingY * 10, 11)
        .stroke({
          color: frame.player.attack.kind === 'element' ? 0xb6e0d3 : 0xf5dfab,
          width: 2,
          alpha: 0.7,
        });
    }
    this.lighting.render(frame, this.camera, this.quality);
    this.weather.render(frame, this.accumulated, dt, this.quality, this.reducedMotion);
    this.debug.clear();
    if (this.debugEnabled) {
      const point = (x: number, y: number) => ({
        x: x * 16 - cx,
        y: y * 16 - (t.elevation[Math.floor(y) * t.size + Math.floor(x)] ?? 0) * 4 - cy,
      });
      for (const path of frame.debugPaths) {
        const first = path.points[0];
        if (!first) continue;
        const start = point(first.x, first.y);
        this.debug.moveTo(start.x, start.y);
        for (const waypoint of path.points.slice(1)) {
          const next = point(waypoint.x, waypoint.y);
          this.debug.lineTo(next.x, next.y);
        }
        this.debug.stroke({
          color: path.actor.startsWith('npc:') ? 0x99d8db : 0xaace82,
          alpha: 0.8,
          width: 1,
        });
      }
      for (const creature of frame.creatures.slice(0, 32)) {
        const from = point(creature.x, creature.y),
          to = point(creature.goal.x, creature.goal.y);
        this.debug
          .moveTo(from.x, from.y)
          .lineTo(to.x, to.y)
          .stroke({ color: 0xe9ce85, alpha: 0.45, width: 1 });
        this.debug.rect(to.x - 2, to.y - 2, 4, 4).stroke({ color: 0xe9ce85, width: 1 });
        for (const [index, value] of [
          creature.food,
          creature.water,
          creature.recreation,
          creature.cleanliness,
          creature.rest,
        ].entries()) {
          this.debug
            .rect(from.x - 8 + index * 4, from.y - 34, 3, 5)
            .fill({ color: 0x203b31, alpha: 0.8 });
          this.debug
            .rect(from.x - 8 + index * 4, from.y - 34 + (1 - value) * 5, 3, value * 5)
            .fill([0xabca82, 0x88c4ca, 0xe0bd87, 0xbb9bcd, 0xd5ca91][index]!);
        }
      }
      for (const threat of frame.threats) {
        const from = point(threat.from.x, threat.from.y),
          to = point(threat.to.x, threat.to.y);
        this.debug
          .moveTo(from.x, from.y)
          .lineTo(to.x, to.y)
          .stroke({ color: threat.cause === 'hunt' ? 0xe7a068 : 0xe17e7a, alpha: 0.7, width: 1 });
      }
      for (let y = Math.floor(cy / 16); y < (cy + 270) / 16; y++)
        for (let x = Math.floor(cx / 16); x < (cx + 480) / 16; x++) {
          if (x < 0 || y < 0 || x >= t.size || y >= t.size) continue;
          const i = y * t.size + x;
          if (t.flags[i]! & TileFlag.Solid)
            this.debug
              .rect(x * 16 - cx, y * 16 - cy, 16, 16)
              .stroke({ color: 0xef8781, alpha: 0.8, width: 1 });
        }
    }
  }
  get stats(): { sprites: number; chunks: number; fps: number } {
    return {
      sprites: this.entities.size + this.props.size,
      chunks: this.chunks.size,
      fps: this.app.ticker.FPS,
    };
  }
  dispose(): void {
    this.app.destroy(true, { children: true });
    this.art.dispose();
  }
}
