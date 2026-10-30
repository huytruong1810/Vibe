import './style.css';
import { InferenceScheduler, OllamaAdapter } from './adapters/inference';
import { IndexedDbSaveRepository, SaveCoordinator } from './adapters/persistence';
import { WorkerBridge } from './adapters/worker-bridge';
import type { CommandPayload, RenderSnapshot } from './domain/contracts';
import { AudioDirector } from './presentation/audio';
import { HudPresenter } from './presentation/hud';
import { WorldRenderer } from './presentation/renderer';

/** Composition root: the only module that knows all browser adapters. */
export class GameBootstrap {
  private readonly bridge = new WorkerBridge();
  private readonly repository = new IndexedDbSaveRepository();
  private readonly saves = new SaveCoordinator(this.repository);
  private readonly renderer = new WorldRenderer();
  private readonly audio = new AudioDirector();
  private readonly hud: HudPresenter;
  private readonly rendererReady: Promise<void>;
  private inference: InferenceScheduler | null = null;
  private frame: RenderSnapshot | null = null;
  private readonly keys = new Set<string>();
  private movementSignature = '';
  private lastEventId = '';
  private connectedModel = '';
  private connectedEndpoint = '';
  private hudMs = 0;
  private readonly autoSave: ReturnType<typeof setInterval>;
  constructor(root: HTMLElement) {
    this.hud = new HudPresenter(root, {
      send: (command) => this.bridge.send(command),
      enter: (options) => this.enter(options),
      discover: (endpoint) => new OllamaAdapter(endpoint).models(),
      save: () => this.save(),
      load: () => this.load(),
      export: () => this.exportSave(),
      import: async (file) => {
        await this.requireConnection();
        await this.bridge.restore(this.repository.import(await file.text()));
        await this.save();
      },
      settings: (quality, reducedMotion, debug) => {
        this.renderer.settings(quality, reducedMotion, debug);
        if (this.frame)
          void this.bridge
            .send({ type: 'debug', enabled: debug })
            .catch((error) => this.hud.notify(String(error)));
      },
      audio: () => this.audio.toggle(),
      select: (id) => this.renderer.select(id),
    });
    this.rendererReady = this.renderer.initialize(this.hud.gameElement).then(() => {
      if (this.renderer.catalog) this.hud.setAssets(this.renderer.catalog);
    });
    void this.rendererReady.catch((error) =>
      this.hud.notify(`Unable to initialize WebGL: ${String(error)}`),
    );
    this.bridge.onError = (message) => this.hud.notify(message);
    this.bridge.onFrame = (frame, terrain) => {
      if (terrain) {
        this.renderer.setTerrain(terrain);
        this.hud.setTerrain(terrain);
        this.inference?.reset(frame.session);
        this.keys.clear();
        this.movementSignature = '';
        if ((document.getElementById('debug') as HTMLInputElement).checked)
          void this.bridge
            .send({ type: 'debug', enabled: true })
            .catch((error) => this.hud.notify(String(error)));
      }
      this.frame = frame;
      this.renderer.apply(frame);
      const hudStarted = performance.now();
      this.hud.update(frame, this.inference?.usage ?? null, this.renderer.stats);
      this.hudMs = performance.now() - hudStarted;
      this.inference?.setBackgroundDeferred(frame.timeScale > 1);
      for (const job of frame.jobs) this.inference?.enqueue(job);
      if (frame.events.at(-1)?.id !== this.lastEventId) {
        const event = frame.events.at(-1);
        this.lastEventId = event?.id ?? '';
        if (event && ['gather', 'craft', 'care', 'victory', 'hit'].includes(event.type))
          this.audio.cue(event.type as 'gather' | 'craft' | 'care' | 'victory' | 'hit');
      }
      this.audio.ambience(frame.season);
      // Renderer copied entity coordinates; UI never reads packed data. Return only the disposable copy.
      this.bridge.recycle(frame.packed.buffer as ArrayBuffer);
      if (terrain && document.hidden) void this.bridge.send({ type: 'pause', token: 'hidden' });
      if (
        terrain &&
        document.querySelector('#settings-dialog[open], #map-dialog[open], #journal-dialog[open]')
      )
        void this.bridge.send({ type: 'pause', token: 'menu' });
    };
    this.bindInput();
    this.autoSave = setInterval(() => {
      if (this.frame && !this.frame.paused.length)
        void this.save().catch((error) => this.hud.notify(`Autosave failed: ${String(error)}`));
    }, 30_000);
    if (import.meta.env.DEV && new URLSearchParams(location.search).get('test') === '1') {
      Object.assign(window, {
        __hearthwild: {
          command: (command: CommandPayload) => this.bridge.send(command),
          checkpoint: () => this.bridge.checkpoint(),
          frame: () => this.frame,
          stats: () => ({ ...this.renderer.stats, hudMs: this.hudMs }),
        },
      });
    }
  }
  private async enter(options: {
    endpoint: string;
    model: string;
    seed: number;
    origin: number;
    resume: boolean;
  }): Promise<void> {
    await this.rendererReady;
    const provider = new OllamaAdapter(options.endpoint);
    await provider.capabilityCheck(options.model);
    this.connectedModel = options.model;
    this.connectedEndpoint = options.endpoint;
    this.inference?.dispose();
    this.inference = new InferenceScheduler(provider, options.model, (receipt) => {
      if (receipt.error)
        void this.bridge
          .send({ type: 'agentFailure', jobId: receipt.jobId, reason: receipt.error }, 'inference')
          .then((result) => {
            if (result.message.includes('unavailable')) this.hud.notify(result.message);
          })
          .catch((error) => this.hud.notify(String(error)));
      else
        void this.bridge
          .send({ type: 'agentResult', jobId: receipt.jobId, output: receipt.output }, 'inference')
          .catch((error) => this.hud.notify(String(error)));
    });
    if (options.resume) {
      const saved = await this.repository.restore();
      if (!saved)
        throw new Error('There is no saved journey in this browser yet. Begin a new journey.');
      await this.bridge.restore(saved);
    } else await this.bridge.initialize(options.seed, options.origin);
    await this.save();
  }
  private async requireConnection(): Promise<void> {
    if (!this.connectedModel) throw new Error('Connect local Ollama before resuming a journey');
    await new OllamaAdapter(this.connectedEndpoint).capabilityCheck(this.connectedModel);
  }
  private async save(): Promise<void> {
    await this.saves.checkpoint(await this.bridge.checkpoint());
  }
  private async load(): Promise<void> {
    await this.requireConnection();
    const saved = await this.repository.restore();
    if (!saved) throw new Error('No saved journey found');
    await this.bridge.restore(saved);
  }
  private async exportSave(): Promise<void> {
    const data = this.repository.export(await this.bridge.checkpoint()),
      url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hearthwild-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private send(command: CommandPayload): void {
    void this.hud.command(command);
  }
  private bindInput(): void {
    window.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement;
      if (
        target.matches('input, textarea, select') ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const key = event.key.toLowerCase();
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key))
        event.preventDefault();
      if (this.hud.inputBlocked || !this.frame || event.repeat) return;
      this.keys.add(key);
      this.updateMovement();
      if (key === 'e') {
        const frame = this.frame;
        const nearest = [...frame.npcs].sort(
          (a, b) =>
            Math.hypot(a.x - frame.player.x, a.y - frame.player.y) -
            Math.hypot(b.x - frame.player.x, b.y - frame.player.y),
        )[0];
        if (nearest && Math.hypot(nearest.x - frame.player.x, nearest.y - frame.player.y) <= 3)
          this.send({ type: 'interact', npcId: nearest.profileId });
        else this.send({ type: 'harvest' });
      }
      if (key === 'r') this.send({ type: 'harvest' });
      if (key === 'c') this.send({ type: 'combine' });
      if (key === 'q') this.send({ type: 'swap' });
      if (key === '1' || key === '2') this.send({ type: 'use', slot: key === '1' ? 0 : 1 });
      if (key === 'j' || key === 'k')
        this.send({ type: 'attack', kind: key === 'j' ? 'strike' : 'element' });
      if (key === ' ') this.send({ type: 'dash' });
      if (key === 'm') this.hud.openMenu('map-dialog');
      if (key === 'i') this.hud.intent({ type: 'toggle', overlay: 'inventory' });
      if (key === 'f') this.hud.intent({ type: 'toggle', overlay: 'inspection' });
      if (key === 'l') this.hud.intent({ type: 'toggle', overlay: 'journal' });
      if (key === 'escape' && !this.hud.closeOverlay()) this.hud.openMenu('settings-dialog');
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
      this.updateMovement();
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.updateMovement();
    });
    document.addEventListener('visibilitychange', () => {
      this.keys.clear();
      this.updateMovement();
      if (this.frame) this.send({ type: document.hidden ? 'pause' : 'resume', token: 'hidden' });
    });
    this.hud.gameElement.addEventListener('click', (event) => {
      const canvas = this.renderer.app.canvas,
        bounds = canvas.getBoundingClientRect();
      if (!this.frame || this.hud.inputBlocked) return;
      if (
        event.clientX < bounds.left ||
        event.clientY < bounds.top ||
        event.clientX > bounds.right ||
        event.clientY > bounds.bottom
      )
        return;
      const picked = this.renderer.pickActor(event.clientX, event.clientY);
      const creature = this.frame.creatures.find((c) => c.id === picked);
      if (creature) this.hud.selectCreature(creature.id);
      else {
        const npc = this.frame.npcs.find((n) => n.entityId === picked);
        if (npc) {
          this.renderer.select(npc.entityId);
          this.hud.showPanel('people');
        }
      }
    });
    const resize = new ResizeObserver(() => {
      if (!this.renderer.app.canvas) return;
      this.renderer.fit(this.hud.gameElement.clientWidth, this.hud.gameElement.clientHeight);
    });
    void this.rendererReady.then(() => resize.observe(this.hud.gameElement));
    window.addEventListener('pagehide', () => this.dispose(), { once: true });
  }
  private updateMovement(): void {
    if (!this.frame) return;
    const blocked = this.hud.inputBlocked;
    const x = blocked
      ? 0
      : +(this.keys.has('d') || this.keys.has('arrowright')) -
        +(this.keys.has('a') || this.keys.has('arrowleft'));
    const y = blocked
      ? 0
      : +(this.keys.has('s') || this.keys.has('arrowdown')) -
        +(this.keys.has('w') || this.keys.has('arrowup'));
    const signature = `${x},${y}`;
    if (signature === this.movementSignature) return;
    this.movementSignature = signature;
    void this.bridge.send({ type: 'move', x, y }).catch((error) => this.hud.notify(String(error)));
  }
  dispose(): void {
    clearInterval(this.autoSave);
    this.inference?.dispose();
    this.bridge.dispose();
    this.audio.dispose();
    this.hud.dispose();
    this.renderer.dispose();
    void this.repository.close();
  }
}

const root = document.getElementById('app')!;
if (import.meta.env.DEV && new URLSearchParams(location.search).get('gallery') === '1') {
  void import('./presentation/gallery')
    .then(({ initializeArtGallery }) => initializeArtGallery(root))
    .catch((error) => {
      root.textContent = `Art gallery unavailable: ${String(error)}`;
    });
} else new GameBootstrap(root);
