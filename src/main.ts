import { ContextSettingsSchema, type ContextSettings } from './domain/conversation';
import './style.css';
import { FallbackProvider, InferenceScheduler, OllamaAdapter } from './adapters/inference';
import {
  SdCppProvider,
  OllamaImageProvider,
  PaintingDecoder,
  recoverImageFlight,
  browserImageFlights,
  resetImageFlightAfterServerRestart,
  type ImageSettings,
  type ImageRequest,
} from './adapters/image';
import { GpuArbiter } from './adapters/gpu-arbiter';
import { paintingCaptionFallback } from './domain/painting';
import { IndexedDbSaveRepository, IndexedDbEmbeddingCache } from './adapters/persistence';
import { WorkerBridge } from './adapters/worker-bridge';
import type { CommandPayload, RenderSnapshot } from './domain/contracts';
import { AudioDirector } from './presentation/audio';
import { HudPresenter } from './presentation/hud';
import { WorldRenderer } from './presentation/renderer';
import { nearestInteraction, PortalEntryController } from './presentation/ui/interaction';

/** Composition root: the only module that knows all browser adapters. */
export class GameBootstrap {
  private readonly bridge = new WorkerBridge();
  private readonly repository = new IndexedDbSaveRepository();
  private readonly renderer = new WorldRenderer();
  private readonly audio = new AudioDirector();
  private readonly hud: HudPresenter;
  private readonly rendererReady: Promise<void>;
  private inference: InferenceScheduler | null = null;
  private imageProvider: SdCppProvider | OllamaImageProvider | null = null;
  private gpu: GpuArbiter | null = null;
  private imageSettings: ImageSettings = { endpoint: '', provider: 'sdcpp', unload: true };
  private paintingEpoch = 0;
  private paintingReady = false;
  private paintingWorldSeed = 0;
  private imageControl: Promise<void> = Promise.resolve();
  private readonly paintingAttempts = new Map<string, string>();
  private readonly paintingInFlight = new Set<string>();
  private readonly paintingProgress = new Map<string, string>();
  private readonly paintingRaw = new Map<string, Blob>();
  private frame: RenderSnapshot | null = null;
  private readonly keys = new Set<string>();
  private movementSignature = '';
  private guardActive = false;
  private readonly portals: PortalEntryController;
  private lastEventId = '';
  private connectedModel = '';
  private offline = false;
  private connectedEndpoint = '';
  private contextSettings: ContextSettings = ContextSettingsSchema.parse({});
  private hudMs = 0;
  private readonly autoSave: ReturnType<typeof setInterval>;
  constructor(root: HTMLElement) {
    this.renderer.setArtifactContent((id) => this.bridge.artifactContent(id, 'display'));
    this.portals = new PortalEntryController(
      () => this.frame,
      (ids) => this.renderer.prepareScene(ids),
      (command) => this.bridge.send(command),
    );
    this.hud = new HudPresenter(root, {
      imageRecoveryNeeded: () => {
        try {
          return !!browserImageFlights?.read();
        } catch {
          return true;
        }
      },
      recoverImages: async () => {
        this.gpu?.acknowledgeServerRestart();
        await resetImageFlightAfterServerRestart();
        await this.configureImages(this.imageSettings);
        this.inference?.resumeAfterImageRecovery();
      },
      painting: {
        enabled: () =>
          this.paintingReady && this.imageProvider instanceof SdCppProvider && !!this.gpu,
        progress: (id) => this.paintingProgress.get(id) ?? 'Waiting to paint…',
        raw: (id) => this.paintingRaw.get(id) ?? null,
        cancel: (id) => {
          const key = this.paintingAttempts.get(id);
          if (key) this.gpu?.cancel(key);
        },
      },
      imageSettings: (settings) => this.configureImages(settings),
      testImage: async (settings) => {
        if (!settings.endpoint)
          return { ok: false, reason: 'Choose a loopback image endpoint first.' };
        const provider =
          settings.provider === 'ollama'
            ? new OllamaImageProvider()
            : new SdCppProvider(settings.endpoint);
        return provider.probe();
      },
      bookDiagnostics: (active) => this.bridge.bookDiagnostics(active),
      artifactContent: (id) => this.bridge.artifactContent(id),
      send: async (command) => {
        const receipt = await this.bridge.send(command);
        if (
          receipt.ok &&
          [
            'paintingRequest',
            'paintingKeep',
            'paintingDiscard',
            'artifactDisplay',
            'artifactTake',
          ].includes(command.type)
        )
          await this.save();
        return receipt;
      },
      enter: (options) => this.enter(options),
      discover: (endpoint) => new OllamaAdapter(endpoint).models(),
      save: () => this.save(),
      load: () => this.load(),
      export: () => this.exportSave(),
      import: async (file) => {
        await this.requireConnection();
        await this.bridge.restore(this.repository.import(await file.text()));
        await this.bridge.send({ type: 'configureContext', settings: this.contextSettings });
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
    this.rendererReady = document.fonts
      .load('38px Silver')
      .then(() => this.renderer.initialize(this.hud.gameElement))
      .then(() => {
        if (this.renderer.catalog) this.hud.setAssets(this.renderer.catalog);
      });
    void this.rendererReady.catch((error) =>
      this.hud.notify(`Unable to initialize WebGL: ${String(error)}`),
    );
    this.bridge.onError = (message) => this.hud.notify(message);
    this.bridge.onFrame = (frame, terrain) => {
      if (terrain) {
        this.paintingWorldSeed = terrain.seed;
        this.renderer.setTerrain(terrain);
        this.hud.setTerrain(terrain);
        if (this.frame?.session !== frame.session) {
          this.inference?.reset(frame.session);
          this.paintingEpoch++;
          this.paintingAttempts.clear();
          this.paintingProgress.clear();
          this.paintingRaw.clear();
          void this.configureImages(this.imageSettings).catch((error) =>
            this.hud.notify(String(error)),
          );
        }
        this.keys.clear();
        this.updateGuard();
        this.movementSignature = '';
        if ((document.getElementById('debug') as HTMLInputElement).checked)
          void this.bridge
            .send({ type: 'debug', enabled: true })
            .catch((error) => this.hud.notify(String(error)));
      }
      this.frame = frame;
      const applyStarted = performance.now();
      this.renderer.apply(frame);
      this.bridge.recordWork('renderer-apply', applyStarted, performance.now());
      const hudStarted = performance.now();
      this.hud.update(frame, this.inference?.usage ?? null, this.renderer.stats);
      this.updateGuard();
      this.hudMs = performance.now() - hudStarted;
      this.bridge.recordWork('hud-update', hudStarted, performance.now());
      this.inference?.setBackgroundDeferred(frame.timeScale > 1);
      for (const job of frame.jobs) this.inference?.enqueue(job);
      this.gpu?.setWindow({
        dialogue: !!frame.dialogue,
        paused: frame.paused.length > 0,
        asleep: frame.humanNeeds.some(
          (human) => human.id === frame.player.entityId && human.sleeping,
        ),
        accelerated: frame.timeScale > 1,
      });
      this.dispatchPaintings(frame);
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
    this.renderer.onDiagnostic = (start, end) =>
      this.bridge.recordWork('renderer-tick', start, end);
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
          bookDiagnostics: () => this.bridge.diagnosticReceipt(),
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
    authored?: boolean;
    offline: boolean;
    backgroundModel: string;
    backgroundCpu: boolean;
    contextTokens: number;
    image: ImageSettings;
  }): Promise<string | void> {
    await this.rendererReady;
    await this.gpu?.dispose();
    const provider = options.offline
      ? new FallbackProvider()
      : new OllamaAdapter(options.endpoint, undefined, new IndexedDbEmbeddingCache());
    if (!options.offline) {
      await recoverImageFlight();
      await provider.capabilityCheck(options.model);
    }
    const context = ContextSettingsSchema.parse({
      dialogueModel: options.model,
      backgroundModel: options.backgroundModel,
      backgroundCpu: options.backgroundCpu,
      contextTokens: options.contextTokens,
    });
    let backgroundWarning = '';
    if (!options.offline) {
      const models = await provider.models();
      context.embeddingEnabled = models.some(
        (m) => m.name === 'embeddinggemma:latest' || m.name === 'embeddinggemma',
      );
      if (!models.some((m) => m.name === context.backgroundModel)) {
        backgroundWarning = `Background model ${context.backgroundModel} is missing. Using ${options.model}. Install the source weights and create the local alias using the Install the background model link in Conversation settings.`;
        context.backgroundModel = options.model;
      }
    }
    this.offline = options.offline;
    this.connectedModel = options.model;
    this.connectedEndpoint = options.endpoint;
    this.inference?.dispose();
    this.inference = new InferenceScheduler(provider, options.model, (receipt) => {
      if (receipt.error)
        void this.bridge
          .send({ type: 'agentFailure', jobId: receipt.jobId, reason: receipt.error }, 'inference')
          .then((result) => {
            if (!this.offline && result.message.includes('unavailable'))
              this.hud.notify(result.message);
          })
          .catch((error) => this.hud.notify(String(error)));
      else
        void this.bridge
          .send(
            {
              type: 'agentResult',
              jobId: receipt.jobId,
              output: receipt.output,
              promptTokens: receipt.promptTokens,
            },
            'inference',
          )
          .catch((error) => this.hud.notify(String(error)));
    });
    this.contextSettings = context;
    try {
      await this.configureImages(options.image);
    } catch (error) {
      backgroundWarning += ` Painting endpoint disabled: ${String(error)}`;
    }
    if (options.resume) {
      const saved = await this.repository.restore();
      if (!saved)
        throw new Error('There is no saved journey in this browser yet. Begin a new journey.');
      await this.bridge.restore(saved);
    } else {
      let compiledWorld: unknown = undefined;
      if (options.authored) {
        try {
          const res = await fetch('/art/source/world/work/import/aqualia-region.json');
          if (res.ok) compiledWorld = await res.json();
        } catch {
          /* fallback to procedural */
        }
      }
      await this.bridge.initialize(options.seed, options.origin, {
        worldSource: options.authored && compiledWorld ? 'authored' : 'procedural',
        compiledWorld,
      });
    }
    this.contextSettings = context;
    await this.bridge.send({ type: 'configureContext', settings: context });
    await this.save();
    return backgroundWarning;
  }
  private async requireConnection(): Promise<void> {
    if (this.offline) return;
    if (!this.connectedModel) throw new Error('Connect local Ollama before resuming a journey');
    const check = async () => {
      await recoverImageFlight();
      await new OllamaAdapter(this.connectedEndpoint).capabilityCheck(this.connectedModel);
    };
    if (this.inference) await this.inference.exclusive(check);
    else await check();
  }
  private async configureImages(settings: ImageSettings): Promise<void> {
    const provider = settings.endpoint
      ? settings.provider === 'ollama'
        ? new OllamaImageProvider()
        : new SdCppProvider(settings.endpoint)
      : null;
    const epoch = ++this.paintingEpoch;
    this.paintingReady = false;
    const configure = this.imageControl
      .catch(() => {})
      .then(async () => {
        await this.gpu?.dispose();
        if (epoch !== this.paintingEpoch) return;
        this.paintingAttempts.clear();
        this.paintingInFlight.clear();
        this.paintingProgress.clear();
        this.paintingRaw.clear();
        this.imageSettings = { ...settings };
        this.imageProvider = provider;
        this.gpu =
          provider && this.inference
            ? new GpuArbiter(
                this.inference,
                async (signal) => {
                  if (this.offline) return;
                  const adapter = new OllamaAdapter(this.connectedEndpoint);
                  const models = new Set([this.connectedModel]);
                  if (!this.contextSettings.backgroundCpu)
                    models.add(this.contextSettings.backgroundModel);
                  for (const model of models) await adapter.unload(model, signal);
                },
                settings.unload,
              )
            : null;
        this.paintingReady = true;
        if (this.frame)
          await this.bridge.send({
            type: 'configurePainting',
            enabled: provider instanceof SdCppProvider,
          });
        if (this.frame) this.dispatchPaintings(this.frame);
      });
    this.imageControl = configure;
    return configure;
  }
  async generatePainting(
    id: string,
    owner: 'player' | 'villager',
    request: ImageRequest,
    progress?: (text: string) => void,
  ) {
    const provider = this.imageProvider,
      gpu = this.gpu;
    if (!(provider instanceof SdCppProvider) || !gpu)
      throw Error('Choose an available image endpoint in Settings.');
    return gpu.request(
      id,
      owner,
      async (signal) => {
        const decoder = new PaintingDecoder();
        try {
          await decoder.prepare();
          const probe = await provider.probe(signal);
          if (!probe.ok) throw Error(probe.reason);
          const raw = await provider.generateManaged(request, signal);
          progress?.('Applying the palette…');
          const painting = await decoder.decode(raw, signal);
          let caption: string | null = null;
          if (!this.offline && painting.captionPng) {
            progress?.('Describing the painting…');
            try {
              caption = await new OllamaAdapter(this.connectedEndpoint).captionPainting(
                this.connectedModel,
                painting.captionPng,
                signal,
              );
            } catch {
              signal.throwIfAborted();
            }
          }
          return { raw, painting, caption, model: probe.model };
        } finally {
          decoder.dispose();
        }
      },
      (stage) =>
        progress?.(
          stage === 'waiting'
            ? 'Waiting for the GPU…'
            : stage === 'unloading'
              ? 'Unloading the villagers’ model…'
              : 'Painting…',
        ),
    );
  }
  private dispatchPaintings(frame: RenderSnapshot): void {
    if (!this.paintingReady || !(this.imageProvider instanceof SdCppProvider) || !this.gpu) return;
    for (const view of frame.artifacts) {
      if (view.kind !== 'painting' || view.status !== 'pending') continue;
      // Leave excess villager work durable rather than turning queue pressure into failure.
      // A player request keeps a reserved slot and can preempt queued villager work.
      if (view.author.kind === 'npc' && this.paintingInFlight.size >= 8) continue;
      const key = `${frame.session}:${view.id}:${view.revision}`;
      if (this.paintingAttempts.get(view.id) === key) continue;
      this.paintingAttempts.set(view.id, key);
      this.paintingInFlight.add(key);
      const epoch = this.paintingEpoch;
      void (async () => {
        const record = await this.bridge.artifactContent(view.id, 'generation');
        if (
          epoch !== this.paintingEpoch ||
          this.frame?.session !== frame.session ||
          record?.kind !== 'painting' ||
          record.revision !== view.revision ||
          record.pixels
        )
          return;
        const request: ImageRequest = {
          prompt: `${record.brief.composition}: ${record.brief.subject}. ${record.brief.mood} mood. Broad shapes, no text or lettering.`,
          negative: 'text, letters, logos, brands, watermark, real people',
          width: 512,
          height: 352,
          steps: 8,
          cfg: 1,
          seed: Math.imul(this.paintingWorldSeed ^ Number(record.id.slice(4)), 2654435761) >>> 0,
        };
        try {
          await this.save();
          if (epoch !== this.paintingEpoch || this.frame?.session !== frame.session) return;
          const output = await this.generatePainting(
            key,
            record.author.kind === 'player' ? 'player' : 'villager',
            request,
            (text) => this.paintingProgress.set(record.id, text),
          );
          if (epoch !== this.paintingEpoch || this.frame?.session !== frame.session) return;
          if (record.author.kind === 'player') {
            this.paintingRaw.clear();
            this.paintingRaw.set(record.id, output.raw);
          }
          await this.bridge.send(
            {
              type: 'paintingResult',
              artifactId: record.id,
              revision: record.revision,
              result: {
                pixels: output.painting.pixels,
                palette: [...output.painting.palette],
                caption: output.caption ?? paintingCaptionFallback(record.brief),
                render: {
                  provider: 'sdcpp',
                  model: output.model,
                  seed: request.seed,
                  steps: request.steps,
                  width: request.width,
                  height: request.height,
                },
              },
            },
            'inference',
          );
          await this.save();
        } catch (error) {
          if (epoch !== this.paintingEpoch || this.frame?.session !== frame.session) return;
          await this.bridge.send(
            {
              type: 'paintingFailure',
              artifactId: record.id,
              revision: record.revision,
              reason: String(error).slice(0, 200),
            },
            'inference',
          );
          await this.save();
        }
      })()
        .catch((error) => this.hud.notify(String(error)))
        .finally(() => this.paintingInFlight.delete(key));
    }
    for (const id of this.paintingAttempts.keys())
      if (!frame.artifacts.some((view) => view.id === id)) {
        this.paintingAttempts.delete(id);
        this.paintingRaw.delete(id);
        this.paintingProgress.delete(id);
      }
  }
  private async save(): Promise<void> {
    await this.bridge.persistCheckpoint();
  }
  private async load(): Promise<void> {
    await this.requireConnection();
    const saved = await this.repository.restore();
    if (!saved) throw new Error('No saved journey found');
    await this.bridge.restore(saved);
    await this.bridge.send({ type: 'configureContext', settings: this.contextSettings });
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
        (event.key === ' ' || event.key === 'Enter') &&
        target.closest('button,a,summary,[role="tab"]')
      )
        return;
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
        const interaction = nearestInteraction(this.frame);
        if (interaction.kind === 'portal') {
          if (interaction.portal.allowed) void this.enterPortal(interaction.portal.id);
          else
            this.hud.notify(
              interaction.portal.reason ?? 'That doorway is not currently accessible.',
            );
        } else if (interaction.kind === 'furniture')
          void this.useFurniture(interaction.prop.id, interaction.prop.interaction === 'equip');
        else if (interaction.kind === 'npc')
          this.send({ type: 'interact', npcId: interaction.npc.profileId });
        else this.send({ type: 'harvest' });
      }
      if (key === 'r') this.send({ type: 'harvest' });
      if (key === 'c') this.send({ type: 'combine' });
      if (key === 'q') this.send({ type: 'swap' });
      if (key === '1' || key === '2') this.hud.useItem(key === '1' ? 0 : 1);
      if (key === 'j' || key === 'k')
        this.send({ type: 'attack', kind: key === 'j' ? 'strike' : 'element' });
      if (key === ' ') this.send({ type: 'dash' });
      if (key === 'g') this.updateGuard();
      if (key === 'm') this.hud.openMenu('map-dialog');
      if (key === 'i') this.hud.intent({ type: 'toggle', overlay: 'inventory' });
      if (key === 'f' && !this.hud.inspectText())
        this.hud.intent({ type: 'toggle', overlay: 'inspection' });
      if (key === 'l') this.hud.intent({ type: 'toggle', overlay: 'journal' });
      if (key === 'escape' && !this.hud.closeOverlay()) this.hud.openMenu('settings-dialog');
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
      this.updateMovement();
      this.updateGuard();
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.updateMovement();
      this.updateGuard();
    });
    document.addEventListener('visibilitychange', () => {
      this.keys.clear();
      this.updateMovement();
      this.updateGuard();
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
  private updateGuard(): void {
    if (!this.frame) return;
    const active = this.keys.has('g') && !this.hud.inputBlocked && this.frame.paused.length === 0;
    if (active === this.guardActive) return;
    this.guardActive = active;
    this.send({ type: 'guard', active });
  }
  private async enterPortal(portalId: string): Promise<void> {
    try {
      const result = await this.portals.enter(portalId);
      if (result === 'stale')
        this.hud.notify(
          'The doorway changed while preparing the scene. Approach it and try again.',
        );
      else if (result === 'unavailable')
        this.hud.notify('That doorway is not currently accessible.');
    } catch (error) {
      this.hud.notify(
        `Could not prepare the destination: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  private async useFurniture(propId: string, openEquipment: boolean): Promise<void> {
    const before = this.frame;
    if (!before) return;
    const result = await this.hud.command({ type: 'furniture', propId });
    if (result.ok && before.scene.props.find((prop) => prop.id === propId)?.interaction === 'paint')
      this.hud.openPainting();
    if (
      result.ok &&
      openEquipment &&
      this.frame?.session === before.session &&
      this.frame.scene.id === before.scene.id &&
      !this.hud.inputBlocked
    )
      this.hud.openInventory();
  }
  dispose(): void {
    clearInterval(this.autoSave);
    this.inference?.dispose();
    void this.gpu?.dispose().catch(() => {});
    this.portals.dispose();
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
