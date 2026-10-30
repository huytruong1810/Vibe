import {
  ITEMS,
  NPC_PROFILES,
  RECIPES,
  SETTLEMENTS,
  SPECIES,
  VILLAGES,
} from '../content/definitions';
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

const icons = {
  leaf: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 4C9 3 4 8 5 14c1 5 7 7 11 3 3-3 4-8 3-13Z" fill="currentColor"/><path d="M4 21 15 9" stroke="var(--ink)" stroke-width="1.6"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m3 5 6-2 6 3 6-2v15l-6 2-6-3-6 2V5Z" stroke="currentColor" stroke-width="1.5"/><path d="M9 3v15M15 6v15" stroke="currentColor" stroke-width="1.5"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" stroke="currentColor" stroke-width="1.5"/></svg>',
  settings:
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 17h16" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="3" fill="var(--ink)" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="17" r="3" fill="var(--ink)" stroke="currentColor" stroke-width="1.5"/></svg>',
};
export const escapeHtml = (s: unknown): string =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
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
  constructor(root: HTMLElement, handlers: HudHandlers) {
    this.handlers = handlers;
    root.innerHTML = `
      <header class="masthead"><a class="brand" href="./" aria-label="Hearthwild home"><span class="brand-mark">${icons.leaf}</span><span>hearthwild<small>A LIVING LITTLE WORLD</small></span></a>
        <div class="header-center"><span class="live-dot"></span> YOUR OWN CORNER OF THE WILD</div>
        <div class="header-actions"><button class="quiet" id="save-button">Save journey <span>↗</span></button><button class="icon-button" id="settings-button" aria-label="Settings">${icons.settings}</button></div>
      </header>
      <main class="shell">
        <section class="play-column" aria-label="Game">
          <div class="world-heading"><div><div class="eyebrow">THE OVERWORLD <span class="small-dot">·</span> SINGLE PLAYER</div><h1 id="location-title">Aqualia <span>and the riverlands</span></h1></div><div class="season-badge">${icons.sun}<span id="season-label">Spring, day 1</span></div></div>
          <div class="world-frame"><div class="game-viewport" id="game-viewport"></div><div class="canvas-top"><div class="player-hud"><span class="clock-badge" id="clock">MON · 08:00</span><div class="player-vitals"><span>HP</span><div class="vital-track" id="health-track" role="progressbar" aria-label="Player health" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="player-health"></i></div><span>ST</span><div class="vital-track stamina" id="stamina-track" role="progressbar" aria-label="Player stamina" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i id="player-stamina"></i></div><b id="player-level">LV 1</b></div></div><span class="world-status" id="world-status"><i></i> THE WORLD IS WAKING UP</span></div>
            <div class="canvas-bottom"><span class="area-label" id="area-label">WANDER. NOTICE. BELONG.</span><button id="map-button" class="map-button">${icons.map} World map <kbd>M</kbd></button></div><div class="pause-banner" id="pause-banner" hidden>THE WORLD IS RESTING</div>
          </div>
          <div class="control-strip"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span><span><kbd>E</kbd> talk / gather</span><span><kbd>J</kbd> strike <kbd>K</kbd> element</span><span><kbd>SPACE</kbd> dash</span></div>
          <section class="physiology-panel" aria-label="Human needs"><div id="human-needs"></div><p id="rest-status" role="status"></p><div class="button-row"><button class="secondary" data-action="sleep" id="sleep-button">Rest</button><button class="secondary" data-action="wake" id="wake-button">Wake</button><button class="secondary" data-action="accelerate" data-id="8" id="accelerate-button">Sleep at 8×</button><button class="secondary" data-action="service" data-service="eat">Eat at pantry</button><button class="secondary" data-action="service" data-service="drink">Drink at spring</button><button class="secondary" data-action="service" data-service="wash">Wash</button></div></section>
          <section class="inventory-section" aria-label="Two-slot inventory"><div class="inventory-intro"><div class="eyebrow">TRAVEL LIGHT</div><h2>Two hands.<br>Endless possibilities.</h2><p>Gather a little. Make something useful.</p></div><div class="inventory-hands" id="inventory"></div><button id="combine-button" class="combine-button"><span>⇄</span> Combine <kbd>C</kbd></button></section>
          <section class="world-log" aria-label="Recent world events"><div class="log-title"><span class="live-dot"></span> LIFE AROUND YOU</div><p id="world-event">The villagers are starting their day.</p><button class="text-button" id="journal-button">Open field journal ↗</button></section>
        </section>
        <aside class="field-panel"><div class="field-heading"><span class="eyebrow">YOUR FIELD NOTES</span><span class="chapter-mark">I</span></div><h2>A world worth<br>getting to know.</h2><p class="field-subtitle">Small discoveries. Lasting connections.</p>
          <div class="panel-tabs" role="tablist" aria-label="Field notes"><button role="tab" data-panel="journey" aria-selected="true">Journey</button><button role="tab" data-panel="companion" aria-selected="false">Creatures</button><button role="tab" data-panel="people" aria-selected="false">Villagers</button></div>
          <div id="panel-content" class="panel-content" role="tabpanel"></div>
          <div class="panel-bottom"><span class="connection-dot"></span><span id="connection-label">LOCAL AI · NOT CONNECTED</span><span id="performance-mini"></span></div>
        </aside>
      </main>
      <footer class="page-footer"><span>THREE VILLAGES. COUNTLESS LITTLE STORIES.</span><span>Built to wander in. <span class="footer-leaf">✦</span></span></footer>
      <div id="toast" class="toast" role="status" hidden></div>
      <dialog id="setup-dialog" class="setup-dialog"><div class="setup-landscape"><span class="setup-star">✦</span><div class="pixel-hill one"></div><div class="pixel-hill two"></div><span class="setup-tree">♣</span><div class="setup-art-title">A little wild.<br>A little wonder.</div></div><div class="setup-content"><div class="eyebrow">WELCOME TO HEARTHWILD</div><h2>Every little life<br>has a story.</h2><p>A single-player wilderness of curious creatures and villagers who remember. Connect your local Ollama to begin.</p><form id="setup-form"><label>Local Ollama address<input id="endpoint" type="url" value="http://127.0.0.1:11434" required /></label><div class="model-row"><label>Installed model<select id="model"><option value="qwen2.5:3b">qwen2.5:3b</option></select></label><button type="button" class="secondary" id="discover-button">Find models</button></div><div class="setup-options"><label>Your hometown<select id="origin"><option value="0">Pyrador · Fire</option><option value="1" selected>Aqualia · Water</option><option value="2">Zephyria · Wind</option></select></label><label>World seed<input id="seed" type="number" value="42" min="0" max="2147483647" required /></label></div><p id="setup-status" class="setup-status" role="status">Your world stays on this browser. No account needed.</p><button class="primary" id="enter-button" type="submit">Connect & begin journey <span>→</span></button><button class="text-button resume-button" id="resume-button" type="button">Connect & resume saved journey</button></form><p class="setup-footnote">Need a small model? Run <code>ollama pull qwen2.5:3b</code> in your terminal. Allow this page’s origin in Ollama if your browser blocks access.</p></div></dialog>
      <dialog id="conversation-dialog" class="conversation-dialog"><div class="conversation-heading"><span class="portrait" id="portrait">C</span><div><span class="eyebrow">A MOMENT TOGETHER</span><h2 id="conversation-name"></h2><small id="conversation-role"></small></div><button class="icon-button" id="close-conversation" aria-label="Finish conversation">×</button></div><div id="conversation-lines" class="conversation-lines" aria-live="polite"></div><div id="staged-note" class="staged-note" hidden></div><form id="dialogue-form"><label class="sr-only" for="dialogue-input">Your message</label><input id="dialogue-input" autocomplete="off" maxlength="1200" placeholder="Ask about their day, or offer an adventure…" required/><button class="primary" id="send-dialogue" type="submit">Send ↗</button></form><div class="conversation-footer"><span id="conversation-state">The world is paused while you talk.</span><button id="dialogue-battle" class="text-button">Partner battle →</button></div></dialog>
      <dialog id="map-dialog" class="map-dialog"><div class="modal-heading"><div><div class="eyebrow">YOUR CORNER OF THE WORLD</div><h2>The elemental wilds</h2></div><button class="icon-button" data-close="map-dialog" aria-label="Close map">×</button></div><div class="map-layout"><canvas id="world-map" width="512" height="512" aria-label="Map of villages and outposts"></canvas><div><p class="muted">Roads connect three villages and six outposts. At a settlement waystone, travel to any other settlement.</p><div id="settlement-list"></div><p class="map-legend"><i></i> YOUR LOCATION <span>✦</span> VILLAGE</p></div></div></dialog>
      <dialog id="settings-dialog" class="settings-dialog"><div class="modal-heading"><div><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>Settings & journal</h2></div><button class="icon-button" data-close="settings-dialog" aria-label="Close settings">×</button></div><div class="settings-grid"><section><h3>Presentation</h3><label>Visual quality<select id="quality"><option value="low">Low · fewer effects</option><option value="medium" selected>Balanced</option><option value="high">High · more weather</option></select></label><label class="checkbox"><input type="checkbox" id="reduced-motion"/> Reduce motion</label><label class="checkbox"><input type="checkbox" id="debug"/> Developer overlay</label><button class="secondary" id="audio-button">Enable sound</button><h3>Save your journey</h3><div class="button-row"><button class="secondary" id="load-button">Load checkpoint</button><button class="secondary" id="export-button">Export save</button><label class="secondary file-label">Import save<input type="file" id="import-input" accept="application/json,.json"/></label></div><p class="muted">Only committed actions are saved. Unfinished dialogue offers are canceled when loading.</p></section><section><h3>Field recipes</h3><div class="recipe-list">${RECIPES.map((r) => `<p><span>${escapeHtml(ITEMS[r.a].name)} + ${escapeHtml(ITEMS[r.b].name)}</span><b>→ ${escapeHtml(ITEMS[r.result].name)}</b></p>`).join('')}</div><h3>Elemental circle</h3><p class="muted">Water → Fire → Wind → Water<br>Strong attacks deal 1.5×; physical strikes stay neutral.</p><div id="debug-stats" class="debug-stats"></div></section></div></dialog>`;
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
    this.el('journal-button').addEventListener('click', () => this.openMenu('settings-dialog'));
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-panel]'))
      button.addEventListener('click', () =>
        this.showPanel(button.dataset.panel as typeof this.panel),
      );
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-close]'))
      button.addEventListener('click', () =>
        this.el<HTMLDialogElement>(button.dataset.close!).close(),
      );
    for (const id of ['map-dialog', 'settings-dialog'])
      this.el<HTMLDialogElement>(id).addEventListener('close', () => {
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
    stats: { fps: number; sprites: number; chunks: number },
  ): void {
    this.frame = frame;
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
      tamed = creature.owner === 0;
    return `<div class="creature-card"><div class="creature-art creature-art-${creature.species}" style="--creature:#${definition.color.toString(16)}"><span class="creature-ear left"></span><span class="creature-ear right"></span><span class="creature-face"><i></i><i></i></span><span class="creature-spark">✧</span></div><div class="creature-title"><div><div class="eyebrow">${tamed ? 'YOUR COMPANION' : creature.owner > 0 ? 'VILLAGER COMPANION' : 'A WILD LITTLE WONDER'}</div><h3>${creature.name}</h3></div><span class="element-tag">${creature.elements.join(' / ')}</span></div><p class="creature-description">${definition.description}</p><p class="creature-diet"><b>Likes</b> ${definition.diet.map((id) => ITEMS[id].name).join(', ')} <span>·</span> <b>Bathes in</b> ${definition.bath}</p>${tamed ? `<div class="creature-stats"><span>LV ${creature.level}</span><span>HP ${Math.ceil(creature.hp)} / ${creature.maxHp}</span><span>ATK ${creature.attack}</span><span>DEF ${creature.defense}</span></div>${meter('Food', creature.food)}${meter('Water', creature.water, 'water')}${meter('Recreation', creature.recreation)}${meter('Cleanliness', creature.cleanliness, 'water')}${meter('Rest', creature.rest, 'warm')}${meter('Wildness', creature.wildness, 'warm')}` : `<div class="wild-stats"><span>HP ???</span><span>ATK ???</span><span>DEF ???</span></div>${meter('Trust', creature.trust, 'warm')}`}<p class="creature-mode">${escapeHtml(creature.mode)} · ${escapeHtml(creature.nature.join(', '))} · ${Math.round(Math.hypot(creature.x - this.frame!.player.x, creature.y - this.frame!.player.y))} tiles away</p><div class="care-buttons">${(['feed', 'water', 'pet', 'bathe', 'heal'] as const).map((action) => `<button data-action="care" data-care="${action}" data-id="${creature.id}">${action[0]!.toUpperCase() + action.slice(1)}</button>`).join('')}</div><button class="wide-secondary" data-action="${tamed ? 'release' : 'tame'}" data-id="${creature.id}">${tamed ? 'Release to the wild' : 'Form a partnership'} <span>♡</span></button></div>`;
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
    this.el('portrait').textContent = profile.name[0]!;
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
    el.innerHTML = html;
    el.dataset.rendered = html;
  }
  openMenu(id: 'map-dialog' | 'settings-dialog'): void {
    if (!this.frame || this.frame.dialogue) return;
    void this.command({ type: 'pause', token: 'menu' });
    this.el<HTMLDialogElement>(id).showModal();
    if (id === 'map-dialog') this.drawMap();
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
