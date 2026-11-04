import { Assets, Container, NineSliceSprite, Sprite, Text, Texture, TextStyle } from 'pixi.js';
import type { Artifact } from '../domain/artifacts';
import type { RenderSnapshot } from '../domain/contracts';
import type { Painting } from '../domain/painting';
import { paintingRgba } from '../domain/painting-pixels';
import { PaintingTextureCache } from './painting-cache';
import { WorldProjection } from './projection';
import { appUrl } from './assets/url';

type Frame = Pick<RenderSnapshot, 'session' | 'scene' | 'placements' | 'artifacts' | 'player'>;
type Widget = { node: Container; revision: number; id: string };
/** Painting content stays on demand; frame snapshots carry metadata only. */
export class WorldPaintings {
  private readonly widgets = new Map<string, Widget>();
  private readonly records = new Map<string, Painting>();
  private readonly attempted = new Set<string>();
  private readonly textures = new PaintingTextureCache<Texture>((texture) => texture.destroy(true));
  private frame: Frame | null = null;
  private session = '';
  private frameTexture: Texture | null = null;
  private loadingFrame = false;
  private disposed = false;
  private readonly frameUrl = appUrl('/assets/generated/ui/frame_thin.png');
  constructor(
    private readonly parent: Container,
    private readonly projection: WorldProjection,
    private readonly content: (id: string) => Promise<Artifact | null>,
    private readonly changed: () => void,
    private readonly failed: (message: string) => void,
  ) {}
  get textureCount(): number {
    return this.textures.size;
  }
  get bytes(): number {
    return (
      this.textures.size * 48 * 32 * 4 +
      (this.frameTexture
        ? this.frameTexture.source.pixelWidth * this.frameTexture.source.pixelHeight * 4
        : 0)
    );
  }
  apply(frame: Frame): void {
    if (this.disposed) return;
    if (frame.session !== this.session) {
      this.clear();
      this.session = frame.session;
    }
    this.frame = {
      session: frame.session,
      scene: frame.scene,
      placements: frame.placements,
      artifacts: frame.artifacts,
      player: frame.player,
    };
    const placements = frame.placements
      .filter(
        (p) =>
          p.sceneId === frame.scene.id &&
          frame.artifacts.some((a) => a.id === p.artifactId && a.kind === 'painting'),
      )
      .map((placement) => ({
        placement,
        prop: frame.scene.props.find((p) => p.id === placement.propId),
      }))
      .filter((entry) => !!entry.prop)
      .sort(
        (a, b) =>
          Math.hypot(a.prop!.x - frame.player.x, a.prop!.y - frame.player.y) -
          Math.hypot(b.prop!.x - frame.player.x, b.prop!.y - frame.player.y),
      )
      .slice(0, 32);
    const wanted = new Set<string>();
    if (placements.length && !this.frameTexture && !this.loadingFrame) {
      this.loadingFrame = true;
      void Assets.load<Texture>(this.frameUrl)
        .then((texture) => {
          if (this.disposed) return;
          texture.source.scaleMode = 'nearest';
          this.frameTexture = texture;
          if (this.frame) this.apply(this.frame);
          this.changed();
        })
        .catch((error) => this.failed(`Painting frame unavailable: ${String(error)}`));
    }
    const pinned = new Set(
      placements.map(({ placement }) => {
        const view = frame.artifacts.find((a) => a.id === placement.artifactId)!;
        return `${frame.session}:${view.id}:${view.revision}`;
      }),
    );
    for (const { placement, prop } of placements) {
      const view = frame.artifacts.find((a) => a.id === placement.artifactId)!,
        key = `${placement.propId}:${placement.slot}:${view.id}`;
      wanted.add(key);
      const requestKey = `${frame.session}:${view.id}:${view.revision}`,
        record = this.records.get(key);
      if (record?.revision !== view.revision && !this.attempted.has(requestKey)) {
        this.attempted.add(requestKey);
        void this.content(view.id)
          .then((artifact) => {
            if (
              this.disposed ||
              this.session !== frame.session ||
              artifact?.kind !== 'painting' ||
              artifact.revision !== view.revision ||
              !this.frame?.placements.some(
                (p) => p.artifactId === view.id && p.propId === placement.propId,
              )
            )
              return;
            this.records.set(key, artifact);
            if (this.frame) this.apply(this.frame);
            this.changed();
          })
          .catch((error) => this.failed(String(error)));
      }
      if (!record || !this.frameTexture) continue;
      let widget = this.widgets.get(key);
      if (!widget || widget.revision !== record.revision) {
        widget?.node.destroy({ children: true });
        widget = { node: this.create(record, pinned), revision: record.revision, id: record.id };
        this.widgets.set(key, widget);
        this.parent.addChild(widget.node);
        this.changed();
      }
      const ready = record.status === 'ready' && record.sealed;
      const anchor = !ready
        ? (frame.scene.props.find((p) => p.interaction === 'paint') ?? prop!)
        : prop!;
      const point = this.projection.world(anchor.x, anchor.y, anchor.elevation ?? 0);
      widget.node.position.set(Math.round(point.x / 2) * 2, Math.round(point.y / 2) * 2);
      widget.node.zIndex = this.projection.depth(anchor.y, 0) + 0.01;
    }
    for (const [key, widget] of this.widgets)
      if (!wanted.has(key)) {
        widget.node.destroy({ children: true });
        this.widgets.delete(key);
        this.records.delete(key);
        this.changed();
      }
  }
  private create(record: Painting, pinned: ReadonlySet<string>): Container {
    const node = new Container();
    node.pivot.set(54, 76);
    node.addChild(
      new NineSliceSprite({
        texture: this.frameTexture!,
        leftWidth: 6,
        rightWidth: 6,
        topHeight: 6,
        bottomHeight: 6,
        width: 108,
        height: 76,
      }),
    );
    if (record.status === 'ready' && record.sealed && record.pixels && record.palette) {
      const texture = this.textures.get(
        `${this.session}:${record.id}:${record.revision}`,
        () => {
          const canvas = document.createElement('canvas');
          canvas.width = 48;
          canvas.height = 32;
          canvas
            .getContext('2d')!
            .putImageData(
              new ImageData(
                paintingRgba({ pixels: record.pixels!, palette: record.palette! }),
                48,
                32,
              ),
              0,
              0,
            );
          const texture = Texture.from(canvas);
          texture.source.scaleMode = 'nearest';
          return texture;
        },
        pinned,
      );
      const image = new Sprite(texture);
      image.position.set(6, 6);
      image.scale.set(2);
      node.addChild(image);
    } else {
      // Runtime UI cover over the authored easel; no new baked art or model pixels while pending.
      const cover = new Sprite(Texture.WHITE);
      cover.tint = 0xece0c2;
      cover.position.set(6, 6);
      cover.width = 96;
      cover.height = 64;
      node.addChild(cover);
      const label = new Text({
        text:
          record.status === 'failed'
            ? 'Failed'
            : record.status === 'ready'
              ? 'Ready'
              : 'In progress',
        style: new TextStyle({
          fontFamily: 'Silver',
          fontSize: 24,
          fill: 0x191928,
          align: 'center',
        }),
      });
      label.anchor.set(0.5);
      label.position.set(54, 38);
      node.addChild(label);
    }
    return node;
  }
  private clear(): void {
    for (const widget of this.widgets.values()) widget.node.destroy({ children: true });
    this.widgets.clear();
    this.records.clear();
    this.attempted.clear();
    this.textures.clear();
  }
  dispose(): void {
    this.disposed = true;
    this.clear();
    this.frame = null;
    if (this.loadingFrame) void Assets.unload(this.frameUrl).catch(() => {});
  }
}
