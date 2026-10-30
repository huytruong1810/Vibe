import { mountHudView, escapeHtml } from './ui/view';
import {
  commandForIntent,
  hudViewState,
  type UiIntent,
  type Overlay,
  type HudViewState,
} from './ui/state';
import { patchView } from './ui/patch';
import { AppearanceResolver, type AssetCatalog } from './assets/catalog';
import { ITEMS, NPC_PROFILES, SETTLEMENTS, SPECIES, VILLAGES } from '../content/definitions';
import type {
  CommandPayload,
  CommandResult,
  CreatureView,
  RenderSnapshot,
  TerrainView,
} from '../domain/contracts';
import { BIOME_COLORS, BIOME_NAMES, nearestSettlement } from '../domain/world';
import type { InferenceUsage, ModelInfo } from '../adapters/inference';
import type { Quality } from './renderer';

const percent = (n: number): number => Math.round(Math.max(0, Math.min(1, n)) * 100);
const meter = (label: string, value: number, color = 'sage'): string =>
  `<div class="need"><span>${label}</span><div class="meter ${color}"><i style="width:${percent(value)}%"></i></div><small>${percent(value)}%</small></div>`;

export interface HudHandlers {
  send(command: CommandPayload): Promise<CommandResult>;
  enter(options: {
    endpoint: string;
    model: string;
    seed: number;
    origin: number;
    resume: boolean;
  }): Promise<void>;
  discover(endpoint: string): Promise<readonly ModelInfo[]>;
  save(): Promise<void>;
  load(): Promise<void>;
  export(): Promise<void>;
  import(file: File): Promise<void>;
  settings(quality: Quality, reducedMotion: boolean, debug: boolean): void;
  audio(): Promise<boolean>;
  select(id: number | null): void;
}

export class HudPresenter {
  readonly gameElement: HTMLElement;
  private frame: RenderSnapshot | null = null;
  private terrain: TerrainView | null = null;
  private panel: 'journey' | 'companion' | 'people' = 'journey';
  private selectedHuman = 0;
  private selectedCreature: number | null = null;
  private dialogSignature = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private mapBackground: HTMLCanvasElement | null = null;
  private readonly handlers: HudHandlers;
  private appearance: AppearanceResolver | null = null;
  private viewState: HudViewState | null = null;
  private readonly overlayFocus = new Map<Overlay, HTMLElement>();
  constructor(root: HTMLElement, handlers: HudHandlers) {
    this.handlers = handlers;
    mountHudView(root);
    this.gameElement = root.querySelector<HTMLElement>('#game-viewport')!;
    this.bind();
    this.renderEmpty();
    const setup = this.el<HTMLDialogElement>('setup-dialog');
    setup.showModal();
    setup.addEventListener('cancel', (event) => event.preventDefault());
    try {
      const settings = JSON.parse(localStorage.getItem('hearthwild-connection') ?? 'null') as {
        endpoint?: string;
        model?: string;
      } | null;
      if (settings?.endpoint) this.el<HTMLInputElement>('endpoint').value = settings.endpoint;
      if (settings?.model)
        this.el<HTMLSelectElement>('model').replaceChildren(
          new Option(settings.model, settings.model),
        );
    } catch {
      /* Storage preference failure must not block play. */
    }
  }
  private el<T extends HTMLElement = HTMLElement>(id: string): T {
    return document.getElementById(id) as T;
  }
  private bind(): void {
    this.el('setup-form').addEventListener('submit', (event) => {
      event.preventDefault();
      void this.enter(false);
    });
    this.el('resume-button').addEventListener('click', () => void this.enter(true));
    this.el('discover-button').addEventListener('click', () => void this.discover());
    this.el('combine-button').addEventListener(
      'click',
      () => void this.command({ type: 'combine' }),
    );
    this.el('save-button').addEventListener(
      'click',
      () => void this.run(() => this.handlers.save(), 'Journey saved.'),
    );
    this.el('load-button').addEventListener(
      'click',
      () => void this.run(() => this.handlers.load(), 'Journey restored.'),
    );
    this.el('export-button').addEventListener(
      'click',
      () => void this.run(() => this.handlers.export(), 'Save exported.'),
    );
    this.el<HTMLInputElement>('import-input').addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) void this.run(() => this.handlers.import(file), 'Journey imported.');
    });
    this.el('map-button').addEventListener('click', () => this.openMenu('map-dialog'));
    this.el('settings-button').addEventListener('click', () => this.openMenu('settings-dialog'));
    this.el('inventory-button').addEventListener('click', () =>
      this.intent({ type: 'toggle', overlay: 'inventory' }),
    );
    this.el('inspection-button').addEventListener('click', () =>
      this.intent({ type: 'toggle', overlay: 'inspection' }),
    );
    this.el('field-journal-button').addEventListener('click', () =>
      this.intent({ type: 'toggle', overlay: 'journal' }),
    );
    for (const overlay of ['inventory', 'inspection'] as const)
      this.el(`close-${overlay}`).addEventListener('click', () =>
        this.intent({ type: 'toggle', overlay }),
      );
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]'))
      button.addEventListener('click', () =>
        this.showPanel(button.dataset.panel as typeof this.panel),
      );
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-close]'))
      button.addEventListener('click', () =>
        this.el<HTMLDialogElement>(button.dataset.close!).close(),
      );
    for (const id of ['map-dialog', 'settings-dialog', 'journal-dialog'])
      this.el<HTMLDialogElement>(id).addEventListener('close', () => {
        if (
          !document.querySelector('#map-dialog[open],#settings-dialog[open],#journal-dialog[open]')
        )
          void this.command({ type: 'resume', token: 'menu' });
      });
    this.el('close-conversation').addEventListener(
      'click',
      () => void this.command({ type: 'closeDialogue' }),
    );
    this.el('conversation-dialog').addEventListener('cancel', (event) => {
      event.preventDefault();
      void this.command({ type: 'closeDialogue' });
    });
    this.el('dialogue-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const input = this.el<HTMLInputElement>('dialogue-input'),
        text = input.value.trim();
      if (text) {
        void this.command({ type: 'dialogue', text });
        input.value = '';
      }
    });
    this.el('dialogue-battle').addEventListener('click', () => {
      const npcId = this.frame?.dialogue?.npcId;
      if (npcId)
        void this.command({ type: 'closeDialogue' }).then(() =>
          this.command({ type: 'battle', npcId }),
        );
    });
    this.el('audio-button').addEventListener(
      'click',
      () =>
        void this.handlers
          .audio()
          .then((muted) => {
            this.el('audio-button').textContent = muted ? 'Enable sound' : 'Mute sound';
          })
          .catch((error) => this.notify(String(error))),
    );
    for (const id of ['quality', 'reduced-motion', 'debug'])
      this.el(id).addEventListener('change', () =>
        this.handlers.settings(
          this.el<HTMLSelectElement>('quality').value as Quality,
          this.el<HTMLInputElement>('reduced-motion').checked,
          this.el<HTMLInputElement>('debug').checked,
        ),
      );
    document.getElementById('app')!.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (!button) return;
      const action = button.dataset.action!,
        id = Number(button.dataset.id);
      if (action === 'sleep' || action === 'wake') void this.command({ type: action });
      else if (action === 'accelerate') void this.command({ type: 'accelerate', factor: 8 });
      else if (action === 'service')
        void this.command({
          type: 'service',
          action: button.dataset.service as 'eat' | 'drink' | 'wash',
        });
      else if (action === 'inspect-human') {
        this.selectedHuman = id;
        this.renderPanel();
      } else if (action === 'talk')
        void this.command({ type: 'interact', npcId: NPC_PROFILES[id]!.id });
      else if (action === 'select') {
        this.selectedCreature = id;
        this.handlers.select(id);
        this.showPanel('companion');
      } else if (action === 'care')
        void this.command({
          type: 'care',
          creature: id,
          action: button.dataset.care as 'feed' | 'water' | 'pet' | 'bathe' | 'heal',
        });
      else if (action === 'tame') void this.command({ type: 'tame', creature: id });
      else if (action === 'release') void this.command({ type: 'release' });
      else if (action === 'travel') {
        this.el<HTMLDialogElement>('map-dialog').close();
        void this.command({ type: 'resume', token: 'menu' }).then(() =>
          this.command({ type: 'travel', settlementId: button.dataset.settlement! }),
        );
      } else if (action === 'use' || action === 'drop')
        void this.command({ type: action, slot: id as 0 | 1 });
      else if (action === 'gather') void this.command({ type: 'harvest' });
      else if (action === 'reaction')
        void this.command({
          type: 'reaction',
          reaction: button.dataset.reaction as 'fire' | 'freeze' | 'shock',
        });
    });
  }
  private async discover(): Promise<void> {
    const status = this.el('setup-status'),
      button = this.el<HTMLButtonElement>('discover-button');
    button.disabled = true;
    status.textContent = 'Looking for local models…';
    try {
      const models = await this.handlers.discover(this.el<HTMLInputElement>('endpoint').value);
      const select = this.el<HTMLSelectElement>('model');
      const previous = select.value;
      select.replaceChildren(
        ...[...models]
          .sort((a, b) => a.size - b.size)
          .map((m) => new Option(`${m.name} · ${(m.size / 1e9).toFixed(1)} GB`, m.name)),
      );
      if (models.some((m) => m.name === previous)) select.value = previous;
      status.textContent = models.length
        ? `${models.length} installed models found. Choose one and begin.`
        : 'No models installed. Install qwen2.5:3b with Ollama first.';
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : 'Could not reach Ollama. Check the server and browser permissions.';
    } finally {
      button.disabled = false;
    }
  }
  private async enter(resume: boolean): Promise<void> {
    const begin = this.el<HTMLButtonElement>('enter-button'),
      resumeButton = this.el<HTMLButtonElement>('resume-button'),
      status = this.el('setup-status');
    begin.disabled = resumeButton.disabled = true;
    status.textContent =
      'Checking local AI and preparing the world. A cold model can take a moment…';
    const options = {
      endpoint: this.el<HTMLInputElement>('endpoint').value,
      model: this.el<HTMLSelectElement>('model').value,
      seed: Number(this.el<HTMLInputElement>('seed').value),
      origin: Number(this.el<HTMLSelectElement>('origin').value),
      resume,
    };
    try {
      await this.handlers.enter(options);
      try {
        localStorage.setItem(
          'hearthwild-connection',
          JSON.stringify({ endpoint: options.endpoint, model: options.model }),
        );
      } catch {
        /* Optional preference. */
      }
      this.el<HTMLDialogElement>('setup-dialog').close();
      this.el('connection-label').textContent = `LOCAL AI · ${options.model}`;
      this.notify(
        resume
          ? 'Welcome back. Your little world remembers.'
          : `Welcome to ${VILLAGES[options.origin]!.name}. Take your time. Look around.`,
      );
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Unable to start the game.';
    } finally {
      begin.disabled = resumeButton.disabled = false;
    }
  }
  private async run(action: () => Promise<void>, message: string): Promise<void> {
    try {
      await action();
      this.notify(message);
    } catch (error) {
      this.notify(error instanceof Error ? error.message : String(error));
    }
  }
  async command(command: CommandPayload): Promise<CommandResult> {
    try {
      const result = await this.handlers.send(command);
      if (result.message) this.notify(result.message);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notify(message);
      return { id: '', ok: false, message };
    }
  }
  notify(message: string): void {
    if (!message) return;
    const toast = this.el('toast');
    toast.textContent = message;
    toast.hidden = false;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 6000);
  }
  private renderEmpty(): void {
    this.el('inventory').innerHTML = [0, 1]
      .map(
        (i) =>
          `<div class="hand-slot"><span class="slot-number">0${i + 1} <span>${i === 0 ? 'LEFT' : 'RIGHT'} HAND</span></span><div class="slot-item"><span class="empty-hand">+</span><span>Room for a discovery</span></div></div>`,
      )
      .join('');
    this.el('panel-content').innerHTML =
      '<div class="journal-intro"><span class="journal-number">01</span><h3>Begin somewhere.</h3><p>There is no hurry. A new path, a new face, a small creature in the grass — every connection starts with a little curiosity.</p></div>';
  }
  update(
    frame: RenderSnapshot,
    usage: InferenceUsage | null,
    stats: {
      fps: number;
      sprites: number;
      chunks: number;
      textureBytes?: number;
      renderMs?: number;
      loadMs?: number;
      framebufferScale?: number;
      gpu?: string;
      assetError?: string;
      prototypeActors?: number;
    },
  ): void {
    this.frame = frame;
    this.viewState = hudViewState(frame);
    this.el('interaction-prompt').textContent = this.viewState.prompt;
    this.setHtml(
      'journal-entries',
      frame.journal.map((text) => `<p>${escapeHtml(text)}</p>`).join('') ||
        '<p>Your field journal will fill as you explore.</p>',
    );
    const settlement = nearestSettlement(frame.player),
      distance = Math.hypot(settlement.x - frame.player.x, settlement.y - frame.player.y);
    const i = this.terrain
      ? Math.floor(frame.player.y) * this.terrain.size + Math.floor(frame.player.x)
      : 0;
    const biome = this.terrain?.biome[i] ?? 0;
    const name = distance < 25 ? settlement.name : BIOME_NAMES[biome];
    this.el('location-title').innerHTML =
      `${escapeHtml(name)} <span>${distance < 25 ? ['among the mountain paths', 'and the riverlands', 'where the sea meets sky'][settlement.village] : 'beyond the village paths'}</span>`;
    this.el('season-label').textContent =
      `${['Spring', 'Summer', 'Autumn', 'Winter'][frame.season]}, day ${frame.day + 1}`;
    this.el('clock').textContent = frame.calendar.toUpperCase();
    const hp = percent(frame.player.hp / frame.player.maxHp),
      stamina = percent(frame.player.stamina / 100);
    this.el('player-health').style.width = `${hp}%`;
    this.el('player-stamina').style.width = `${stamina}%`;
    this.el('health-track').setAttribute('aria-valuenow', String(hp));
    this.el('stamina-track').setAttribute('aria-valuenow', String(stamina));
    this.el('player-level').textContent = `LV ${frame.player.level}`;
    this.el('world-status').innerHTML =
      `<i></i> ${frame.paused.length ? 'A MOMENT OF STILLNESS' : 'A WORLD IN MOTION'}`;
    this.el('pause-banner').hidden = !frame.paused.length || !!frame.dialogue;
    this.el('area-label').textContent =
      frame.duel === null
        ? `${BIOME_NAMES[biome]} · ${frame.performance.population} LITTLE LIVES`
        : 'FRIENDLY PARTNER BATTLE';
    const last = frame.events.at(-1);
    this.el('world-event').textContent = last?.text ?? 'The wind moves softly through the reeds.';
    this.el('performance-mini').textContent = `${Math.round(stats.fps)} FPS`;
    this.el('debug-stats').textContent =
      `Tick ${frame.tick} · simulation ${frame.performance.stepMs.toFixed(2)} ms · ${frame.performance.detailed} detailed creatures · ${frame.performance.paths} pending paths · ${stats.sprites} sprites · ${stats.chunks} chunks\nAI: ${usage?.requests ?? 0} requests · ${usage?.queued ?? 0} queued · ${usage?.errors ?? 0} errors · ${Math.round(usage?.lastMs ?? 0)} ms last request`;
    this.el('debug-stats').textContent +=
      `\nRender CPU ${stats.renderMs?.toFixed(2) ?? '?'} ms · load ${stats.loadMs?.toFixed(0) ?? '?'} ms · tracked textures ${((stats.textureBytes ?? 0) / 1048576).toFixed(1)} MiB · framebuffer ${stats.framebufferScale ?? 1} · prototype actors ${stats.prototypeActors ?? 0}\nGPU: ${stats.gpu ?? 'unreported'}${stats.assetError ? `\n${stats.assetError}` : ''}`;
    if (this.el<HTMLInputElement>('debug').checked)
      this.el('debug-stats').textContent += this.diagnostics(frame);
    const human = frame.humanNeeds.find((h) => h.id === 0)!;
    this.setHtml(
      'human-needs',
      `${meter('Food', human.food)}${meter('Water', human.water, 'water')}${meter('Recreation', human.recreation)}${meter('Cleanliness', human.cleanliness, 'water')}${meter('Rest', human.rest, 'warm')}`,
    );
    this.el('rest-status').textContent = human.sleeping
      ? `${human.forcedRest ? 'Exhausted · resting until 50%' : 'Sleeping'} · world at ${frame.timeScale}×`
      : human.rest < 0.2
        ? 'You feel tired. Find a safe place to rest.'
        : `Human · ${human.elements.join(' / ')} · ${human.nature.join(', ')}`;
    this.el<HTMLButtonElement>('sleep-button').disabled = human.sleeping;
    this.el<HTMLButtonElement>('wake-button').disabled = !human.sleeping || human.forcedRest;
    this.el<HTMLButtonElement>('accelerate-button').disabled =
      !human.sleeping || frame.paused.length > 0;
    this.renderInventory();
    this.renderPanel();
    this.renderConversation();
    if (this.el<HTMLDialogElement>('map-dialog').open) this.drawMap();
  }
  private renderInventory(): void {
    const frame = this.frame!;
    const html = frame.inventory
      .map(
        (item, i) =>
          `<div class="hand-slot ${item ? 'filled' : ''}"><span class="slot-number">0${i + 1} <span>${i === 0 ? 'LEFT' : 'RIGHT'} HAND</span></span><div class="slot-item">${item ? `<span class="item-pixel" style="--item:#${ITEMS[item.id].color.toString(16)}"></span><b>${escapeHtml(ITEMS[item.id].name)}</b>` : '<span class="empty-hand">+</span><span>Room for a discovery</span>'}</div>${item ? `<div class="slot-actions"><button data-action="use" data-id="${i}">Use</button><button data-action="drop" data-id="${i}">Drop</button></div>` : ''}</div>`,
      )
      .join('');
    this.setHtml('inventory', html);
    this.el<HTMLButtonElement>('combine-button').disabled =
      !frame.inventory[0] || !frame.inventory[1] || frame.paused.length > 0;
  }
  private diagnostics(frame: RenderSnapshot): string {
    const closest = <T extends { x: number; y: number }>(items: readonly T[]) =>
      [...items].sort(
        (a, b) =>
          Math.hypot(a.x - frame.player.x, a.y - frame.player.y) -
          Math.hypot(b.x - frame.player.x, b.y - frame.player.y),
      )[0];
    const creature =
      frame.creatures.find((c) => c.id === this.selectedCreature) ??
      frame.creatures.find((c) => c.owner === 0) ??
      closest(frame.creatures);
    const npc = closest(frame.npcs);
    const lines = [
      '\n\nOVERLAY LEGEND',
      'Cyan: villager paths · green: creature paths',
      'Gold: goals · red: collision',
      'Need bars: food / water / recreation / cleanliness / Rest',
    ];
    lines.push(
      `ECOLOGY · ${frame.ecology.deaths} deaths / ${frame.ecology.births} births / ${frame.ecology.pending} pending · ${frame.carrion.length} carrion sources`,
    );
    lines.push(
      'FOOD WEB',
      ...SPECIES.filter((s) => s.prey?.length).map((s) => `${s.name} → ${s.prey!.join(', ')}`),
      'LOCAL THREATS',
      ...frame.threats.map((t) => `${t.actor} → ${t.target} (${t.cause})`),
    );
    if (creature)
      lines.push(
        `Nature ${creature.nature.join(', ')} · Rest ${percent(creature.rest)}% · sleeping ${creature.sleeping}`,
        `\nCREATURE ${creature.id} · ${creature.name}`,
        `Mode ${creature.mode} · goal ${creature.goal.x.toFixed(1)}, ${creature.goal.y.toFixed(1)}`,
        `Commitment ${Math.max(0, creature.commitUntil - frame.elapsedSeconds).toFixed(1)}s remaining`,
        `Utility wander .18 / food ${(1 - creature.food).toFixed(2)} / water ${(1 - creature.water).toFixed(2)} / bath ${((1 - creature.cleanliness) * 0.8).toFixed(2)} / social ${((1 - creature.recreation) * 0.6).toFixed(2)}`,
      );
    if (npc) {
      lines.push(
        `\nVILLAGER ${npc.profileId}`,
        npc.activity,
        `Current plan: ${npc.override ? `${npc.override.location} until ${npc.override.until.toFixed(0)}` : 'authored schedule'}`,
        `Tomorrow: ${npc.tomorrow ? `${npc.tomorrow.location} at ${npc.tomorrow.startHour}` : 'authored schedule'}`,
      );
      for (const promise of npc.commitments.slice(-3))
        lines.push(`Promise ${promise.id}: ${promise.status} · ${promise.location}`);
      lines.push(
        '\nMEMORY PROVENANCE',
        npc.memory.summary
          ? `Summary: ${npc.memory.summary.slice(0, 240)}`
          : 'No compacted summary yet.',
      );
      for (const memory of npc.memory.records.slice(-4))
        lines.push(
          `${memory.kind} · ${memory.id}\n${memory.text.slice(0, 180)}\nSources: ${memory.sourceIds.join(', ').slice(0, 240) || 'direct conversation'}`,
        );
    }
    return lines.join('\n');
  }
  showPanel(panel: typeof this.panel): void {
    this.el('inspection-panel').hidden = false;
    this.el('inspection-button').setAttribute('aria-expanded', 'true');
    this.panel = panel;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]'))
      button.setAttribute('aria-selected', String(button.dataset.panel === panel));
    this.renderPanel();
  }
  selectCreature(id: number): void {
    this.selectedCreature = id;
    this.handlers.select(id);
    this.showPanel('companion');
  }
  private renderPanel(): void {
    const frame = this.frame;
    if (!frame) return;
    let html = '';
    if (this.panel === 'journey') {
      const checks = [
        ['gather', 'Something in your hands', 'Press E near a resource to gather it.'],
        ['craft', 'A little ingenuity', 'Combine flint + hardwood, then add reed fiber.'],
        [
          'commitment',
          'Get to know a neighbor',
          'Talk to a villager. Ask for a walk or a little help.',
        ],
        [
          'partnership',
          'A friend for the road',
          'Offer a creature its favorite food and fresh water.',
        ],
        ['victory', 'Find your footing', 'Try a friendly partner battle or a wild encounter.'],
      ];
      const seen = new Set(frame.journal);
      html = `<div class="journal-intro"><span class="journal-number">01</span><div class="eyebrow">YOUR FIRST CHAPTER</div><h3>Put down small roots.</h3><p>A new place becomes home one little discovery at a time.</p></div><div class="journey-steps">${checks.map(([event, title, detail], i) => `<div class="journey-step ${seen.has(event!) ? 'complete' : ''}"><span class="step-index">${seen.has(event!) ? '✓' : `0${i + 1}`}</span><div><h4>${title}</h4><p>${detail}</p></div></div>`).join('')}</div><div class="field-tip"><span>✧</span><p><b>A small field tip</b>Creatures have their own tastes. Inspect one to learn what it eats and where it likes to bathe.</p></div><button class="wide-secondary" data-action="gather">Gather nearby <kbd>E</kbd></button>`;
    } else if (this.panel === 'companion') {
      const partner = frame.creatures.find((c) => c.owner === 0);
      const selected =
        frame.creatures.find((c) => c.id === this.selectedCreature) ??
        partner ??
        [...frame.creatures]
          .filter((c) => c.owner === -1)
          .sort(
            (a, b) =>
              Math.hypot(a.x - frame.player.x, a.y - frame.player.y) -
              Math.hypot(b.x - frame.player.x, b.y - frame.player.y),
          )[0];
      html = selected
        ? this.creatureCard(selected)
        : '<div class="journal-intro"><span class="journal-number">✧</span><h3>Wild little wonders.</h3><p>Head beyond the cottages and click a creature to get to know it. A partnership begins with care.</p></div>';
      const nearby = [...frame.creatures]
        .filter((c) => c.owner === -1)
        .sort(
          (a, b) =>
            Math.hypot(a.x - frame.player.x, a.y - frame.player.y) -
            Math.hypot(b.x - frame.player.x, b.y - frame.player.y),
        )
        .slice(0, 6);
      html += `<h4 class="list-heading">NEARBY IN THE WILD</h4><div class="creature-list">${nearby.map((c) => `<button data-action="select" data-id="${c.id}"><span class="creature-dot" style="background:#${SPECIES.find((s) => s.id === c.species)!.color.toString(16)}"></span><span>${c.name}<small>${c.elements.join(' · ')}</small></span><span>↗</span></button>`).join('') || '<p class="muted">No creatures in sight. Wander a little farther.</p>'}</div>`;
    } else {
      const nearby = frame.npcs
        .map((npc, index) => ({
          npc,
          index,
          distance: Math.hypot(npc.x - frame.player.x, npc.y - frame.player.y),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);
      html = `<div class="journal-intro compact"><div class="eyebrow">FAMILIAR FACES</div><h3>Everyone has a rhythm.</h3><p>Villagers work, wander, share news, and make plans. Stop by and say hello.</p></div><div class="people-list">${nearby.map(({ npc, index, distance }) => `<div class="person-card"><span class="person-avatar village-${NPC_PROFILES[index]!.village}">${NPC_PROFILES[index]!.name[0]}</span><div><h4>${escapeHtml(NPC_PROFILES[index]!.name)} <small>${npc.partner !== null ? '✧' : ''}</small></h4><p>${escapeHtml(NPC_PROFILES[index]!.role)}</p><small>${escapeHtml(npc.activity)}</small></div><button class="person-talk" data-action="talk" data-id="${index}" ${distance > 3 ? 'disabled' : ''} aria-label="Talk to ${escapeHtml(NPC_PROFILES[index]!.name)}">${distance <= 3 ? 'Talk ↗' : `${Math.round(distance)}m`}</button></div>`).join('')}</div>`;
    }
    if (this.panel === 'people') {
      const human =
        frame.humanNeeds.find((h) => h.id === this.selectedHuman) ?? frame.humanNeeds[0]!;
      const name = human.id === 0 ? 'You' : NPC_PROFILES.find((_, i) => i + 1 === human.id)!.name;
      const selector = frame.humanNeeds
        .map(
          (h) =>
            `<button data-action="inspect-human" data-id="${h.id}">${h.id === 0 ? 'You' : escapeHtml(NPC_PROFILES[h.id - 1]!.name)}</button>`,
        )
        .join('');
      html =
        `<details class="human-inspector" open><summary>${escapeHtml(name)} · HP ${Math.ceil(human.hp)} / ${human.maxHp} · ${human.elements.join(' / ')}</summary><p>${human.nature.join(', ')} · ${human.sleeping ? 'Sleeping' : 'Awake'}</p>${meter('Food', human.food)}${meter('Water', human.water, 'water')}${meter('Recreation', human.recreation)}${meter('Cleanliness', human.cleanliness, 'water')}${meter('Rest', human.rest, 'warm')}<div class="human-selector">${selector}</div></details>` +
        html;
    }
    this.setHtml('panel-content', html);
  }
  private creatureCard(creature: CreatureView): string {
    const definition = SPECIES.find((s) => s.id === creature.species)!,
      tamed = creature.owner === 0,
      portrait = this.appearance?.portrait('species', creature.species);
    return `<div class="creature-card"><div class="creature-art creature-art-${creature.species}" style="--creature:#${definition.color.toString(16)}">${portrait ? `<img src="${escapeHtml(portrait.hud128)}" alt="${escapeHtml(creature.name)} portrait" width="128" height="128"/>` : `<span class="creature-ear left"></span><span class="creature-ear right"></span><span class="creature-face"><i></i><i></i></span>`}<span class="creature-spark">✧</span></div><div class="creature-title"><div><div class="eyebrow">${tamed ? 'YOUR COMPANION' : creature.owner > 0 ? 'VILLAGER COMPANION' : 'A WILD LITTLE WONDER'}</div><h3>${creature.name}</h3></div><span class="element-tag">${creature.elements.join(' / ')}</span></div><p class="creature-description">${definition.description}</p><p class="creature-diet"><b>Likes</b> ${definition.diet.map((id) => ITEMS[id].name).join(', ')} <span>·</span> <b>Bathes in</b> ${definition.bath}</p>${tamed ? `<div class="creature-stats"><span>LV ${creature.level}</span><span>HP ${Math.ceil(creature.hp)} / ${creature.maxHp}</span><span>ATK ${creature.attack}</span><span>DEF ${creature.defense}</span></div>${meter('Food', creature.food)}${meter('Water', creature.water, 'water')}${meter('Recreation', creature.recreation)}${meter('Cleanliness', creature.cleanliness, 'water')}${meter('Rest', creature.rest, 'warm')}${meter('Wildness', creature.wildness, 'warm')}` : `<div class="wild-stats"><span>HP ???</span><span>ATK ???</span><span>DEF ???</span></div>${meter('Trust', creature.trust, 'warm')}`}<p class="creature-mode">${escapeHtml(creature.mode)} · ${escapeHtml(creature.nature.join(', '))} · ${Math.round(Math.hypot(creature.x - this.frame!.player.x, creature.y - this.frame!.player.y))} tiles away</p><div class="care-buttons">${(['feed', 'water', 'pet', 'bathe', 'heal'] as const).map((action) => `<button data-action="care" data-care="${action}" data-id="${creature.id}">${action[0]!.toUpperCase() + action.slice(1)}</button>`).join('')}</div><button class="wide-secondary" data-action="${tamed ? 'release' : 'tame'}" data-id="${creature.id}">${tamed ? 'Release to the wild' : 'Form a partnership'} <span>♡</span></button></div>`;
  }
  private renderConversation(): void {
    const frame = this.frame!,
      dialog = this.el<HTMLDialogElement>('conversation-dialog'),
      conversation = frame.dialogue;
    if (!conversation) {
      if (dialog.open) dialog.close();
      this.dialogSignature = '';
      return;
    }
    const profile = NPC_PROFILES.find((p) => p.id === conversation.npcId)!;
    if (!dialog.open) dialog.showModal();
    this.el('conversation-name').textContent = profile.name;
    this.el('conversation-role').textContent =
      `${profile.role} · ${VILLAGES[profile.village]!.name}`;
    const portrait = this.appearance?.portrait('npc', profile.id);
    this.setHtml(
      'portrait',
      portrait
        ? `<img src="${escapeHtml(portrait.hud128)}" width="96" height="96" alt="${escapeHtml(profile.name)} portrait"/>`
        : `<span aria-label="${escapeHtml(profile.name)} · portrait pending">${escapeHtml(profile.name[0]!)}</span>`,
    );
    const signature = `${conversation.lines.length}:${conversation.pendingJob}`;
    if (signature !== this.dialogSignature) {
      this.el('conversation-lines').innerHTML =
        conversation.lines
          .map(
            (line) =>
              `<div class="dialogue-line ${line.speaker}"><small>${line.speaker === 'player' ? 'YOU' : line.speaker === 'system' ? 'WORLD' : escapeHtml(profile.name.toUpperCase())}</small><p>${escapeHtml(line.text)}</p></div>`,
          )
          .join('') +
        (conversation.pendingJob
          ? '<div class="thinking"><span></span><span></span><span></span><small>Gathering a thought…</small></div>'
          : '');
      const lines = this.el('conversation-lines');
      lines.scrollTop = lines.scrollHeight;
      this.dialogSignature = signature;
    }
    this.el<HTMLButtonElement>('send-dialogue').disabled = !!conversation.pendingJob;
    this.el<HTMLInputElement>('dialogue-input').disabled = !!conversation.pendingJob;
    this.el<HTMLButtonElement>('dialogue-battle').hidden = profile.partner === null;
    const staged = this.el('staged-note');
    staged.hidden = conversation.staged.length === 0;
    staged.textContent = `${conversation.staged.length} offer(s) will be checked and carried out when you finish talking.`;
  }
  private setHtml(id: string, html: string): void {
    const el = this.el(id);
    if (el.dataset.rendered === html) return;
    patchView(el, html);
    el.dataset.rendered = html;
  }
  openMenu(id: 'map-dialog' | 'settings-dialog' | 'journal-dialog'): void {
    if (!this.frame || this.frame.dialogue) return;
    if (document.querySelector('dialog[open]')) return;
    void this.command({ type: 'pause', token: 'menu' });
    this.el<HTMLDialogElement>(id).showModal();
    if (id === 'map-dialog') this.drawMap();
  }
  setAssets(catalog: AssetCatalog): void {
    this.appearance = new AppearanceResolver(catalog);
  }
  closeOverlay(): boolean {
    for (const overlay of ['inventory', 'inspection'] as const)
      if (!this.el(`${overlay}-panel`).hidden) {
        this.intent({ type: 'toggle', overlay });
        return true;
      }
    return false;
  }
  intent(intent: UiIntent): void {
    const command = commandForIntent(intent);
    if (command) {
      void this.command(command);
      return;
    }
    if (intent.type !== 'toggle' || !this.frame || this.frame.dialogue) return;
    if (intent.overlay === 'journal' || intent.overlay === 'map' || intent.overlay === 'settings') {
      this.openMenu(
        `${intent.overlay === 'map' ? 'map' : intent.overlay === 'journal' ? 'journal' : 'settings'}-dialog`,
      );
      return;
    }
    const panel = this.el(`${intent.overlay}-panel`);
    const opening = panel.hidden;
    panel.hidden = !opening;
    this.el(`${intent.overlay === 'inventory' ? 'inventory' : 'inspection'}-button`).setAttribute(
      'aria-expanded',
      String(opening),
    );
    if (opening) {
      const active = document.activeElement;
      this.overlayFocus.set(
        intent.overlay,
        active instanceof HTMLElement && active !== document.body
          ? active
          : this.el(`${intent.overlay}-button`),
      );
      panel.querySelector<HTMLElement>('button')?.focus();
    } else this.overlayFocus.get(intent.overlay)?.focus();
  }
  setTerrain(terrain: TerrainView): void {
    this.terrain = terrain;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = terrain.size;
    const ctx = canvas.getContext('2d')!,
      image = ctx.createImageData(terrain.size, terrain.size);
    for (let i = 0; i < terrain.biome.length; i++) {
      const color =
        terrain.flags[i]! & 2
          ? 0xd5c798
          : terrain.fluid[i]
            ? 0x689d9d
            : BIOME_COLORS[terrain.biome[i]!]!;
      image.data[i * 4] = color >> 16;
      image.data[i * 4 + 1] = (color >> 8) & 255;
      image.data[i * 4 + 2] = color & 255;
      image.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    this.mapBackground = canvas;
    this.el('settlement-list').innerHTML = SETTLEMENTS.map(
      (s) =>
        `<button data-action="travel" data-settlement="${s.id}" class="settlement-button"><span>${s.capital ? '✦' : '◇'}</span><span>${s.name}<small>${s.capital ? 'ELEMENTAL VILLAGE' : 'REMOTE OUTPOST'}</small></span><span>→</span></button>`,
    ).join('');
  }
  private drawMap(): void {
    const canvas = this.el<HTMLCanvasElement>('world-map'),
      context = canvas.getContext('2d')!;
    if (!this.mapBackground) return;
    context.drawImage(this.mapBackground, 0, 0);
    context.font = '11px monospace';
    context.textAlign = 'center';
    for (const s of SETTLEMENTS) {
      context.fillStyle = '#243f36';
      context.fillRect(s.x - 4, s.y - 4, 8, 8);
      context.fillStyle = '#f1dc9c';
      context.fillRect(s.x - 2, s.y - 2, 4, 4);
      context.strokeStyle = '#334f41';
      context.lineWidth = 3;
      context.strokeText(s.name, s.x, s.y - 10);
      context.fillStyle = '#f2e9c9';
      context.fillText(s.name, s.x, s.y - 10);
    }
    if (this.frame) {
      context.fillStyle = '#fff1be';
      context.beginPath();
      context.arc(this.frame.player.x, this.frame.player.y, 4, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#355046';
      context.lineWidth = 2;
      context.stroke();
      for (const marker of this.frame.markers) {
        context.strokeStyle = '#f0d49a';
        context.strokeRect(marker.x - 3, marker.y - 3, 6, 6);
      }
    }
  }
  get inputBlocked(): boolean {
    return !!document.querySelector('dialog[open]');
  }
  get currentFrame(): RenderSnapshot | null {
    return this.frame;
  }
  dispose(): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }
}
