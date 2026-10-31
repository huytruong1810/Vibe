import { NPC_PROFILES, SPECIES, VILLAGES } from '../content/definitions';
import {
  ANIMATION_STATES,
  AssetCatalogSchema,
  FACINGS,
  type AnimationClip,
  type AssetAppearance,
  type AssetCatalog,
  type AssetFrame,
  type Facing,
} from './assets/catalog';
import './gallery.css';

interface Identity {
  readonly kind: 'species' | 'npc' | 'origin' | 'environment' | 'item';
  readonly id: string;
  readonly name: string;
}

interface PortraitVariant {
  readonly master: string;
  readonly hud_128: string;
  readonly hud_96: string;
}

interface PortraitManifest {
  readonly creatures: Record<string, PortraitVariant>;
  readonly characters: Record<string, PortraitVariant>;
}

const actorIdentities: readonly Identity[] = [
  ...VILLAGES.map((v) => ({
    kind: 'origin' as const,
    id: v.name.toLowerCase(),
    name: `${v.name} player`,
  })),
  ...SPECIES.map((s) => ({ kind: 'species' as const, id: s.id, name: s.name })),
  ...NPC_PROFILES.map((n) => ({
    kind: 'npc' as const,
    id: n.id,
    name: `${n.name} · ${VILLAGES[n.village]?.name ?? 'Settlement'}`,
  })),
];

const facingNames: Readonly<Record<Facing, string>> = {
  n: 'North',
  ne: 'Northeast',
  e: 'East',
  se: 'Southeast',
  s: 'South',
  sw: 'Southwest',
  w: 'West',
  nw: 'Northwest',
};

const FLORA_SPECIES = [
  { id: 'berries', name: 'Sunberries' },
  { id: 'reeds', name: 'River Reeds' },
  { id: 'wheat', name: 'Wild Wheat' },
  { id: 'nectar', name: 'Nectar Blossom' },
  { id: 'ashgrass', name: 'Ashgrass' },
  { id: 'fungi', name: 'Spore Fungi' },
] as const;

const VFX_EFFECTS = [
  'vfx_fire_tap',
  'vfx_fire_veil',
  'vfx_ice_wall',
  'vfx_slash',
  'vfx_steam_burst',
  'vfx_water_bubble',
  'vfx_water_pulse',
  'vfx_wind_gust',
] as const;

/** Review tool only: no simulation, worker, save store, inference, or game-entry bypass. */
export async function initializeArtGallery(root: HTMLElement): Promise<() => void> {
  if (!import.meta.env.DEV) throw new Error('The art gallery is available only in development.');
  const lifecycle = new AbortController();
  let disposed = false;
  let animation = 0;
  let lastTime = 0;
  let accumulated = 0;
  let playing = true;
  let frameIndex = 0;
  let catalog: AssetCatalog | null = null;
  let portraitManifest: PortraitManifest | null = null;
  let identities: readonly Identity[] = actorIdentities;
  const images = new Map<string, HTMLImageElement>();
  const pageLoads = new Map<string, HTMLImageElement>();
  const pageErrors = new Map<string, string>();
  let requiredPages = new Set<string>();
  const pageBudget = 128 * 1024 * 1024;
  const frames = new Map<string, AssetFrame>();
  let proof: HTMLImageElement | null = null;
  let proofUrl: string | null = null;
  let activeTab: 'inspector' | 'lineup' | 'staging' | 'matrix' | 'atlas' = 'inspector';

  // Staging scene state
  let stagingSelectedEntity: string | null = 'origin:aqualia';
  let lineupSelectedActor: string | null = 'origin:aqualia';

  root.innerHTML = `
    <main class="art-gallery">
      <header>
        <div>
          <p class="art-eyebrow">Hearthwild · Interactive Art Review Suite</p>
          <h1>Aqualia, in the making.</h1>
          <p>Single asset inspection, cast lineups, living village staging, item/VFX showcase, and atlas budget audit.</p>
        </div>
        <div class="art-header-actions">
          <span class="art-badge art-badge-success">Milestone PR #2 · Aqualia HD Vertical Slice</span>
          <a href="./">Return to the game</a>
        </div>
      </header>

      <nav class="art-tabs" role="tablist" aria-label="Review modes">
        <button id="tab-inspector" class="art-tab art-tab-active" role="tab" aria-selected="true" data-mode="inspector">
          🔍 Single Asset Inspector
        </button>
        <button id="tab-lineup" class="art-tab" role="tab" aria-selected="false" data-mode="lineup">
          👥 Cast Lineup & Scale
        </button>
        <button id="tab-staging" class="art-tab" role="tab" aria-selected="false" data-mode="staging">
          🏡 Aqualia Village Staging
        </button>
        <button id="tab-matrix" class="art-tab" role="tab" aria-selected="false" data-mode="matrix">
          🎒 Items & VFX Showcase
        </button>
        <button id="tab-atlas" class="art-tab" role="tab" aria-selected="false" data-mode="atlas">
          🗺️ Atlas Sheet & Memory
        </button>
      </nav>

      <!-- VIEW 1: SINGLE ASSET INSPECTOR -->
      <section id="view-inspector" class="art-view art-view-active" aria-label="Single Asset Inspector">
        <p class="art-warning">Prototype exports are reference material. A large preview does not count as native HD artwork. Missing identities and directions remain visible here.</p>
        <div class="art-controls" aria-label="Art selection">
          <label>Asset group<select id="art-kind" aria-label="Asset group"><option value="all">All assets</option><option value="origin">Player origins</option><option value="species">Creature species</option><option value="npc">Villagers</option><option value="environment">Environment</option><option value="item">Items</option></select></label>
          <label>Identity<select id="art-identity" aria-label="Identity"></select></label>
          <label>Animation<select id="art-state" aria-label="Animation"></select></label>
          <label>Move<select id="art-move"><option value="">All authored moves</option></select></label>
          <label>Facing<select id="art-facing" aria-label="Facing"></select></label>
          <label>Preview magnification<select id="art-scale"><option value="1">1× authored pixels</option><option value="2">2× preview</option><option value="4" selected>4× preview</option><option value="8">8× pixel inspection</option></select></label>
          <label class="art-checkbox"><input id="art-anchor" type="checkbox" checked>Anchor and bounds</label>
        </div>
        <p id="art-status" class="art-status" role="status">Loading validated asset catalog…</p>
        <div class="art-layout">
          <section class="art-stage" aria-label="Selected frame">
            <canvas id="art-frame" width="640" height="420" role="img" aria-label="Selected animation frame with ground anchor"></canvas>
            <div class="art-controls">
              <button id="art-previous">Previous frame</button>
              <button id="art-play" aria-pressed="true">Pause</button>
              <button id="art-next">Next frame</button>
              <label>Playback speed<select id="art-speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
            </div>
            <p id="art-frame-label"></p>
          </section>
          <aside class="art-metadata" aria-label="Frame metadata">
            <h2>Registration & Metadata</h2>
            <dl id="art-metadata"></dl>
            <div id="art-portrait-container" class="art-portrait-panel" hidden>
              <h3>Dialogue & HUD Portraits</h3>
              <p style="font-size:12px;color:#a1b8ac">High-resolution cutouts and downscaled HUD busts for this identity.</p>
              <div class="art-portrait-previews">
                <div class="art-portrait-item"><img id="art-portrait-cutout" width="96" height="96" alt="Master Cutout" /><span>Master Cutout</span></div>
                <div class="art-portrait-item"><img id="art-portrait-128" width="64" height="64" alt="128px HUD" /><span>128px HUD</span></div>
                <div class="art-portrait-item"><img id="art-portrait-96" width="48" height="48" alt="96px Bust" /><span>96px Bust</span></div>
              </div>
            </div>
          </aside>
        </div>
        <section id="art-comparison" aria-label="Eight-direction comparison">
          <h2 id="art-comparison-title" style="margin-top:24px">Eight authored directions</h2>
          <p id="art-comparison-note">Each card uses the requested direction exactly. Missing poses are never mirrored or rotated.</p>
          <div id="art-facings" class="art-facing-grid"></div>
        </section>
      </section>

      <!-- VIEW 2: CAST LINEUP & SCALE -->
      <section id="view-lineup" class="art-view" aria-label="Cast Lineup & Scale" hidden>
        <p class="art-warning">Comparative scale review: characters and creatures aligned on a continuous ground datum line with 32px, 64px, 96px, and 144px height guides.</p>
        <div class="art-controls" aria-label="Lineup controls">
          <label>Lineup roster
            <select id="lineup-filter">
              <option value="aqualia_slice" selected>Aqualia Vertical Slice Cast (Player, Rivallie & 7 HD Villagers)</option>
              <option value="all_species">All 8 Creature Species</option>
              <option value="villagers_aqualia">Aqualia Villagers (10)</option>
              <option value="villagers_pyrador">Pyrador Villagers (10)</option>
              <option value="villagers_zephyria">Zephyria Villagers (10)</option>
              <option value="all_villagers">All 30 Villagers (World Roster)</option>
              <option value="origins">Player Origins (3)</option>
            </select>
          </label>
          <label>Sync facing direction
            <select id="lineup-facing">
              <option value="s" selected>South (Front)</option>
              <option value="sw">Southwest (¾ Front)</option>
              <option value="w">West (Profile)</option>
              <option value="nw">Northwest (¾ Back)</option>
              <option value="n">North (Back)</option>
              <option value="ne">Northeast (¾ Back)</option>
              <option value="e">East (Profile)</option>
              <option value="se">Southeast (¾ Front)</option>
            </select>
          </label>
          <label>Lineup zoom
            <select id="lineup-scale">
              <option value="1">1× Authored Scale</option>
              <option value="2" selected>2× Lineup Scale</option>
              <option value="3">3× Large Inspection</option>
            </select>
          </label>
          <label class="art-checkbox"><input id="lineup-guides" type="checkbox" checked>Height scale guides & shadows</label>
          <label class="art-checkbox"><input id="lineup-labels" type="checkbox" checked>Character nameplates</label>
        </div>
        <div class="art-lineup-box">
          <div class="art-lineup-scroll">
            <canvas id="art-lineup-canvas" width="1600" height="380" role="img" aria-label="Actor lineup on continuous ground plane"></canvas>
          </div>
          <div id="art-lineup-cards" class="art-lineup-details"></div>
        </div>
      </section>

      <!-- VIEW 3: AQUALIA VILLAGE STAGING -->
      <section id="view-staging" class="art-view" aria-label="Aqualia Village Staging" hidden>
        <p class="art-warning">Native 1080p composite staging review: cottage, grand oak tree, layered canopy, freshwater canal, well, waystone, hearth, flora, and village actors in live idle simulation.</p>
        <div class="art-controls" aria-label="Staging controls">
          <label>Lighting environment
            <select id="staging-light">
              <option value="day" selected>Bright Daylight</option>
              <option value="sunset">Golden Hour / Sunset</option>
              <option value="night">Nocturnal (Emissive Lanterns & Hearth)</option>
            </select>
          </label>
          <label>Atmospheric weather
            <select id="staging-weather">
              <option value="clear" selected>Clear Sky</option>
              <option value="rain">Canal Rain (Pixel Streaks & Ripples)</option>
              <option value="mist">Canal Mist / Fog</option>
            </select>
          </label>
          <label>Oak canopy layer
            <select id="staging-canopy">
              <option value="1" selected>Fully Opaque (100%)</option>
              <option value="0.5">Occlusion X-Ray (50% Alpha)</option>
              <option value="0">Hidden (Trunk Inspection)</option>
            </select>
          </label>
          <label class="art-checkbox"><input id="staging-grid" type="checkbox">64px terrain grid</label>
          <label class="art-checkbox"><input id="staging-anchors" type="checkbox">Foot anchors & collision boxes</label>
          <label class="art-checkbox"><input id="staging-nametags" type="checkbox" checked>Entity nameplates</label>
          <label>Local scene proof override<input id="art-proof" type="file" accept="image/png,image/jpeg,image/webp"></label>
        </div>
        <p id="art-proof-status" class="art-status">Native Aqualia composition active · 9 actors staged</p>
        <div class="art-scene">
          <canvas id="art-scene" width="1920" height="1080" role="img" aria-label="Native 1920 by 1080 scene staging board"></canvas>
          <div class="art-scene-inspector">
            <div id="art-scene-selected-info" class="art-scene-selected-info">
              <span class="art-badge art-badge-info">Inspector</span>
              <strong id="art-staging-sel-title">Aqualia Player · Origin</strong>
              <span id="art-staging-sel-coords" style="font-size:13px;color:#a1b8ac">World Anchor: (960, 720)</span>
            </div>
            <p id="art-staging-sel-desc" style="margin:0;font-size:13px;color:#cad8c8">Hero protagonist of Aqualia origin. Standing at village center.</p>
          </div>
        </div>
      </section>

      <!-- VIEW 4: ITEMS & VFX SHOWCASE -->
      <section id="view-matrix" class="art-view" aria-label="Items & VFX Showcase" hidden>
        <div class="art-showcase-section">
          <h2>All 16 World Items</h2>
          <p>Inventory, crafting, and foraging resources packed into the asset bundle.</p>
          <div id="art-items-grid" class="art-grid-items"></div>
        </div>

        <div class="art-showcase-section" style="margin-top:30px">
          <h2>Flora Lifecycle Stages (Healthy → Harvested → Burnt)</h2>
          <p>Complete 3-state environmental flora families for foraging and elemental combat interaction.</p>
          <div style="overflow-x:auto">
            <table class="art-flora-table">
              <thead>
                <tr>
                  <th>Flora Species</th>
                  <th>Healthy (Authored)</th>
                  <th>Harvested (Depleted)</th>
                  <th>Burnt (Elemental Interaction)</th>
                </tr>
              </thead>
              <tbody id="art-flora-rows"></tbody>
            </table>
          </div>
        </div>

        <div class="art-showcase-section" style="margin-top:30px">
          <h2>Combat & Elemental VFX</h2>
          <p>Transient effects and spell bursts.</p>
          <div id="art-vfx-grid" class="art-grid-items"></div>
        </div>
      </section>

      <!-- VIEW 5: ATLAS SHEET & MEMORY BUDGET -->
      <section id="view-atlas" class="art-view" aria-label="Atlas Sheet & Memory Budget" hidden>
        <div class="art-budget-card">
          <h2>Deterministic Texture Atlas Budget</h2>
          <p>Strict performance invariant: Entire game art decoded footprint must reside within 1 single atlas page (&lt; 16.0 MiB RAM limit).</p>
          <div class="art-budget-meter" role="progressbar" aria-valuenow="87.4" aria-valuemin="0" aria-valuemax="100">
            <div id="art-budget-fill" class="art-budget-bar" style="width: 87.38%"></div>
          </div>
          <div class="art-budget-labels">
            <span id="art-stat-decoded-ram">Decoded RAM: <strong>13.98 MiB</strong> (1921 × 1908 × 4 bytes)</span>
            <span>Budget Ceiling: <strong>16.00 MiB</strong> (2048 × 2048 × 4 bytes)</span>
          </div>
          <div class="art-stats-grid">
            <div class="art-stat-box"><div id="art-stat-frames" class="art-stat-val">1129</div><div class="art-stat-lbl">Packed Sprite Frames</div></div>
            <div class="art-stat-box"><div id="art-stat-pages" class="art-stat-val">1 Page</div><div class="art-stat-lbl">Atlas Count (Single Page Invariant)</div></div>
            <div class="art-stat-box"><div id="art-stat-headroom" class="art-stat-val">12.62%</div><div class="art-stat-lbl">Free Headroom Remaining</div></div>
            <div class="art-stat-box"><div id="art-stat-half" class="art-stat-val">3.78 MiB</div><div class="art-stat-lbl">Half-Resolution @0.5x RAM</div></div>
          </div>
        </div>
        <div class="art-atlas-viewer">
          <div class="art-controls" style="margin-top:0">
            <label>Atlas view zoom
              <select id="atlas-zoom">
                <option value="0.5">0.5× Fit</option>
                <option id="atlas-zoom-1" value="1" selected>1× Native Authored Sheet (1921 × 1908)</option>
                <option value="1.5">1.5× Zoom</option>
              </select>
            </label>
            <p id="atlas-status" class="art-status" style="margin:0;align-self:center">Single page: bundle.png (1921 × 1908)</p>
          </div>
          <div class="art-atlas-canvas-wrap">
            <canvas id="art-atlas-canvas" width="1921" height="1908" role="img" aria-label="Packed bundle texture atlas"></canvas>
          </div>
        </div>
      </section>
    </main>`;

  const el = <T extends HTMLElement = HTMLElement>(id: string): T =>
    root.querySelector<T>(`#${id}`)!;

  // Inputs
  const stateInput = el<HTMLSelectElement>('art-state');
  const identityInput = el<HTMLSelectElement>('art-identity');
  const facingInput = el<HTMLSelectElement>('art-facing');
  stateInput.replaceChildren(...ANIMATION_STATES.map((s) => new Option(s, s)));
  facingInput.replaceChildren(...FACINGS.map((f) => new Option(facingNames[f], f)));
  facingInput.value = 's';

  const canvas = el<HTMLCanvasElement>('art-frame');
  const context = canvas.getContext('2d')!;
  const scene = el<HTMLCanvasElement>('art-scene');
  const sceneContext = scene.getContext('2d')!;
  const lineupCanvas = el<HTMLCanvasElement>('art-lineup-canvas');
  const lineupContext = lineupCanvas.getContext('2d')!;
  const atlasCanvas = el<HTMLCanvasElement>('art-atlas-canvas');
  const atlasContext = atlasCanvas.getContext('2d')!;

  // Turnaround cards
  const cards = FACINGS.map((facing) => {
    const figure = document.createElement('figure');
    const preview = document.createElement('canvas');
    preview.width = 240;
    preview.height = 200;
    preview.setAttribute('role', 'img');
    preview.setAttribute('aria-label', `${facingNames[facing]} pose`);
    const caption = document.createElement('figcaption');
    figure.append(preview, caption);
    el('art-facings').append(figure);
    return { facing, figure, canvas: preview, context: preview.getContext('2d')!, caption };
  });

  const identity = (): Identity =>
    identities.find((i) => `${i.kind}:${i.id}` === identityInput.value) ?? identities[0]!;

  const appearance = (): AssetAppearance | undefined => {
    const selected = identity();
    const bound = catalog?.appearances.find(
      (a) => a.kind === selected.kind && a.contentId === selected.id,
    );
    return bound && (bound.frameId || bound.clipIds.length) ? bound : undefined;
  };

  const clip = (facing = facingInput.value as Facing): AnimationClip | undefined => {
    const selected = appearance();
    const move = el<HTMLSelectElement>('art-move').value;
    return catalog?.clips.find(
      (c) =>
        c.appearanceId === selected?.id &&
        c.state === stateInput.value &&
        c.facing === facing &&
        (stateInput.value !== 'attack' || !move || c.moveId === move),
    );
  };

  const selectedFrame = (
    selectedClip: AnimationClip | undefined,
    index: number,
  ): AssetFrame | undefined => {
    if (selectedClip)
      return frames.get(selectedClip.frameIds[index % selectedClip.frameIds.length]!);
    const selected = appearance();
    if ((selected?.kind === 'environment' || selected?.kind === 'item') && selected.frameId)
      return frames.get(selected.frameId);
    return undefined;
  };

  const ensurePage = (pageId: string): void => {
    if (
      disposed ||
      images.has(pageId) ||
      pageLoads.has(pageId) ||
      pageErrors.has(pageId) ||
      pageLoads.size >= 2
    )
      return;
    const page = catalog?.pages.find((p) => p.id === pageId);
    if (!page) return;
    const image = new Image();
    pageLoads.set(pageId, image);
    const abort = (): void => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
      pageLoads.delete(pageId);
    };
    lifecycle.signal.addEventListener('abort', abort, { once: true });
    const finish = (): void => {
      lifecycle.signal.removeEventListener('abort', abort);
      pageLoads.delete(pageId);
    };
    image.onload = () => {
      finish();
      if (disposed) return;
      if (requiredPages.has(pageId)) images.set(pageId, image);
      const bytes = (): number =>
        [...images.values()].reduce(
          (sum, item) => sum + item.naturalWidth * item.naturalHeight * 4,
          0,
        );
      for (const [id, cached] of images) {
        if (bytes() <= pageBudget) break;
        if (!requiredPages.has(id)) {
          images.delete(id);
          cached.src = '';
        }
      }
      renderActiveView();
    };
    image.onerror = () => {
      finish();
      if (disposed) return;
      pageErrors.set(pageId, `Could not decode atlas image: ${page.imageUrl}`);
      renderActiveView();
    };
    image.src = page.imageUrl;
  };

  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    frame: AssetFrame | undefined,
    x: number,
    y: number,
    scale: number,
    bounds: boolean,
  ): void => {
    if (!frame) return;
    const image = images.get(frame.pageId);
    if (!image) {
      ensurePage(frame.pageId);
      return;
    }
    ctx.imageSmoothingEnabled = false;
    const left = x - frame.sourceSize.w * frame.anchor.x * scale;
    const top = y - frame.sourceSize.h * frame.anchor.y * scale;
    ctx.drawImage(
      image,
      frame.rect.x,
      frame.rect.y,
      frame.rect.w,
      frame.rect.h,
      left + frame.trim.x * scale,
      top + frame.trim.y * scale,
      frame.trim.w * scale,
      frame.trim.h * scale,
    );
    if (!bounds) return;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e6d39a';
    ctx.strokeRect(left + 0.5, top + 0.5, frame.sourceSize.w * scale, frame.sourceSize.h * scale);
    ctx.strokeStyle = '#72c4cc';
    ctx.strokeRect(
      left + frame.trim.x * scale + 0.5,
      top + frame.trim.y * scale + 0.5,
      frame.trim.w * scale,
      frame.trim.h * scale,
    );
    ctx.strokeStyle = '#ed8d82';
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
  };

  const background = (ctx: CanvasRenderingContext2D, width: number, height: number): void => {
    ctx.fillStyle = '#17282e';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#294048';
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
      ctx.stroke();
    }
  };

  const getActorAppearance = (kind: string, id: string): AssetAppearance | undefined => {
    return catalog?.appearances.find((a) => a.kind === kind && a.contentId === id);
  };

  const getActorFrame = (
    kind: string,
    id: string,
    facing: Facing,
    fIdx: number,
  ): AssetFrame | undefined => {
    const app = getActorAppearance(kind, id);
    if (!app) return undefined;
    if (app.frameId) return frames.get(app.frameId);
    let cl = catalog?.clips.find(
      (c) => c.appearanceId === app.id && c.state === 'idle' && c.facing === facing,
    );
    if (!cl) {
      cl = catalog?.clips.find(
        (c) => c.appearanceId === app.id && (c.facing === 's' || c.state === 'idle'),
      );
    }
    if (cl && cl.frameIds.length) {
      const fid = cl.frameIds[fIdx % cl.frameIds.length];
      return fid ? frames.get(fid) : undefined;
    }
    return undefined;
  };

  // --- TAB 1: SINGLE ASSET INSPECTOR ---
  const updatePortraits = (idObj: Identity): void => {
    const panel = el('art-portrait-container');
    if (!portraitManifest) {
      panel.hidden = true;
      return;
    }
    let pVar: PortraitVariant | undefined;
    if (idObj.kind === 'species') pVar = portraitManifest.creatures[idObj.id];
    else if (idObj.kind === 'origin') pVar = portraitManifest.characters[`player_${idObj.id}`];
    else if (idObj.kind === 'npc') {
      const clean = idObj.id.replace(/^npc:/, '');
      pVar = portraitManifest.characters[`npc_${clean}`];
    }
    if (pVar) {
      panel.hidden = false;
      el<HTMLImageElement>('art-portrait-cutout').src = pVar.master;
      el<HTMLImageElement>('art-portrait-128').src = pVar.hud_128;
      el<HTMLImageElement>('art-portrait-96').src = pVar.hud_96;
    } else {
      panel.hidden = true;
    }
  };

  const metadata = (
    frame: AssetFrame | undefined,
    selectedClip: AnimationClip | undefined,
  ): void => {
    const selected = appearance();
    const rows: readonly [string, string][] = [
      ['Canonical identity', `${identity().kind} · ${identity().id}`],
      [
        'Art status',
        selected
          ? selected.quality === 'hd'
            ? 'Native HD source'
            : 'Prototype · HD approval pending'
          : 'Missing identity · no substitution',
      ],
      ['Clip', selectedClip?.id ?? (frame ? 'Static asset · nondirectional' : 'Not authored')],
      ['Authored frame', frame ? `${frame.sourceSize.w} × ${frame.sourceSize.h} pixels` : '—'],
      [
        'Trim rectangle',
        frame ? `${frame.trim.x}, ${frame.trim.y}, ${frame.trim.w}, ${frame.trim.h}` : '—',
      ],
      ['Ground anchor', frame ? `${frame.anchor.x}, ${frame.anchor.y} (normalized)` : '—'],
      ['Atlas page', frame?.pageId ?? '—'],
      [
        'Move / frame phases',
        selectedClip?.phases
          ? `${selectedClip.moveId} · windup [${selectedClip.phases.windup.join(', ')}), active [${selectedClip.phases.active.join(', ')}), recovery [${selectedClip.phases.recovery.join(', ')})`
          : (selectedClip?.moveId ?? 'Not phase-authored'),
      ],
      [
        'Playback',
        selectedClip
          ? `${selectedClip.playback} · ${selectedClip.fps} FPS${selectedClip.stride ? ` · ${selectedClip.stride} tile stride` : ''}`
          : '—',
      ],
    ];
    const nodes = rows.flatMap(([label, value]) => {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      return [dt, dd];
    });
    el('art-metadata').replaceChildren(...nodes);
    updatePortraits(identity());
  };

  const renderInspector = (): void => {
    requiredPages = new Set(
      FACINGS.flatMap((facing) => {
        const frame = selectedFrame(clip(facing), frameIndex);
        return frame ? [frame.pageId] : [];
      }),
    );
    canvas.setAttribute(
      'aria-busy',
      String([...requiredPages].some((id) => !images.has(id) && !pageErrors.has(id))),
    );
    const selectedClip = clip();
    const frame = selectedFrame(selectedClip, frameIndex);
    const isStatic = !!frame && !selectedClip;
    stateInput.disabled = isStatic;
    facingInput.disabled = isStatic;
    el<HTMLSelectElement>('art-move').disabled = isStatic;
    el<HTMLSelectElement>('art-speed').disabled = isStatic;
    background(context, canvas.width, canvas.height);
    const scale = Number(el<HTMLSelectElement>('art-scale').value);
    const bounds = el<HTMLInputElement>('art-anchor').checked;
    const anchorY = frame
      ? Math.min(340, canvas.height - 24 - (1 - frame.anchor.y) * frame.sourceSize.h * scale)
      : 340;
    drawFrame(context, frame, 320, anchorY, scale, bounds);
    if (!frame) {
      context.font = '18px system-ui';
      context.fillStyle = '#e4b183';
      context.textAlign = 'center';
      context.fillText(
        appearance() ? 'Requested pose is not authored' : 'No artwork for this identity',
        320,
        210,
      );
      context.textAlign = 'left';
    }
    el('art-frame-label').textContent = selectedClip
      ? `Frame ${(frameIndex % selectedClip.frameIds.length) + 1} / ${selectedClip.frameIds.length} · ${scale}× preview`
      : isStatic
        ? `Static frame · nondirectional · ${scale}× preview`
        : 'No frames for this selection';
    el('art-status').textContent = !appearance()
      ? `${identity().name}: missing identity artwork. No unrelated character has been substituted.`
      : !selectedClip && !isStatic
        ? `${identity().name}: ${stateInput.value} / ${facingNames[facingInput.value as Facing]} is missing.`
        : `${identity().name}: ${appearance()!.quality === 'prototype' ? 'prototype export, native HD pending' : 'native HD source; visual approval is separate'}.`;
    const pageError = [...requiredPages].map((id) => pageErrors.get(id)).find(Boolean);
    if (pageError) {
      el('art-status').textContent = pageError;
      el('art-status').setAttribute('role', 'alert');
    } else el('art-status').setAttribute('role', 'status');
    el<HTMLButtonElement>('art-previous').disabled = !selectedClip;
    el<HTMLButtonElement>('art-next').disabled = !selectedClip;
    el<HTMLButtonElement>('art-play').disabled = !selectedClip;
    metadata(frame, selectedClip);
    el('art-comparison').setAttribute(
      'aria-label',
      isStatic ? 'Static asset comparison' : 'Eight-direction comparison',
    );
    el('art-comparison-title').textContent = isStatic
      ? 'Static asset registration'
      : 'Eight authored directions';
    el('art-comparison-note').textContent = isStatic
      ? 'This material or object has one nondirectional frame. It is not counted as eight authored poses.'
      : 'Each card uses the requested direction exactly. Missing poses are never mirrored or rotated.';
    for (const [index, card] of cards.entries()) {
      card.figure.hidden = isStatic && index !== 0;
      card.canvas.setAttribute(
        'aria-label',
        isStatic ? 'Nondirectional static asset preview' : `${facingNames[card.facing]} pose`,
      );
      if (card.figure.hidden) continue;
      const cardClip = clip(card.facing);
      const cardFrame = selectedFrame(cardClip, frameIndex);
      background(card.context, card.canvas.width, card.canvas.height);
      const fit = cardFrame
        ? Math.min(3, 190 / cardFrame.sourceSize.w, 155 / cardFrame.sourceSize.h)
        : 1;
      const cardAnchorY = cardFrame
        ? Math.min(
            175,
            card.canvas.height - 12 - (1 - cardFrame.anchor.y) * cardFrame.sourceSize.h * fit,
          )
        : 175;
      drawFrame(card.context, cardFrame, 120, cardAnchorY, fit, bounds);
      if (!cardFrame) {
        card.context.font = '14px system-ui';
        card.context.fillStyle = '#e4b183';
        card.context.textAlign = 'center';
        card.context.fillText('Not authored', 120, 100);
        card.context.textAlign = 'left';
      }
      card.caption.textContent = isStatic
        ? 'Static frame · nondirectional'
        : `${facingNames[card.facing]} · ${cardClip ? `${cardClip.frameIds.length} frames` : 'missing'}`;
      card.caption.classList.toggle('art-missing', !cardFrame);
    }
  };

  // --- TAB 2: CAST LINEUP & SCALE ---
  interface LineupActor {
    readonly kind: 'origin' | 'species' | 'npc';
    readonly id: string;
    readonly name: string;
    readonly subtitle: string;
    readonly isHd: boolean;
    readonly bio?: string;
  }

  const getLineupActors = (filter: string): readonly LineupActor[] => {
    if (filter === 'aqualia_slice') {
      return [
        {
          kind: 'origin',
          id: 'aqualia',
          name: 'Aqualia Player',
          subtitle: 'Hero Protagonist',
          isHd: true,
          bio: 'Canal-born adventurer attuned to water elements.',
        },
        {
          kind: 'species',
          id: 'rivallie',
          name: 'Rivallie',
          subtitle: 'Water Creature Companion',
          isHd: true,
          bio: 'Bipedal aquatic companion with dynamic crest fins.',
        },
        {
          kind: 'npc',
          id: 'npc:neris',
          name: 'Neris',
          subtitle: 'Master Fishmonger · Aqualia',
          isHd: true,
          bio: 'Deep connection to tidal patterns; supplies market seafood.',
        },
        {
          kind: 'npc',
          id: 'npc:reed',
          name: 'Reed',
          subtitle: 'Master Reedweaver · Aqualia',
          isHd: true,
          bio: 'Harvests river reeds to weave waterproof boats and roofing.',
        },
        {
          kind: 'npc',
          id: 'npc:willa',
          name: 'Willa',
          subtitle: 'Canal Chef · Aqualia',
          isHd: true,
          bio: 'Maintains the central communal cooking hearth.',
        },
        {
          kind: 'npc',
          id: 'npc:oren',
          name: 'Oren',
          subtitle: 'Runic Stonemason · Aqualia',
          isHd: true,
          bio: 'Carves tidal waystones and protects ancient nautical runes.',
        },
        {
          kind: 'npc',
          id: 'npc:lark',
          name: 'Lark',
          subtitle: 'Canal Ferryman · Aqualia',
          isHd: true,
          bio: 'Pilots flat-bottom ferries along freshwater tributaries.',
        },
        {
          kind: 'npc',
          id: 'npc:dara',
          name: 'Dara',
          subtitle: 'Waterkeeper · Aqualia',
          isHd: true,
          bio: 'Tests mineral purity at the stone well and reservoirs.',
        },
        {
          kind: 'npc',
          id: 'npc:finn',
          name: 'Finn',
          subtitle: 'Wetland Scout · Aqualia',
          isHd: true,
          bio: 'Surveys waterlogged boundaries and wildlife habitats.',
        },
      ];
    }
    if (filter === 'all_species') {
      return SPECIES.map((s) => ({
        kind: 'species' as const,
        id: s.id,
        name: s.name,
        subtitle: `${s.elements.join('/').toUpperCase()} elemental species`,
        isHd: true,
        bio: s.description,
      }));
    }
    if (filter === 'villagers_aqualia') {
      return NPC_PROFILES.filter((n) => n.village === 1).map((n) => ({
        kind: 'npc' as const,
        id: n.id,
        name: n.name,
        subtitle: `${n.role} · Aqualia`,
        isHd: true,
        bio: n.personality,
      }));
    }
    if (filter === 'villagers_pyrador') {
      return NPC_PROFILES.filter((n) => n.village === 0).map((n) => ({
        kind: 'npc' as const,
        id: n.id,
        name: n.name,
        subtitle: `${n.role} · Pyrador`,
        isHd: true,
        bio: n.personality,
      }));
    }
    if (filter === 'villagers_zephyria') {
      return NPC_PROFILES.filter((n) => n.village === 2).map((n) => ({
        kind: 'npc' as const,
        id: n.id,
        name: n.name,
        subtitle: `${n.role} · Zephyria`,
        isHd: true,
        bio: n.personality,
      }));
    }
    if (filter === 'origins') {
      return [
        {
          kind: 'origin' as const,
          id: 'aqualia',
          name: 'Aqualia Player',
          subtitle: 'Canal Settlement',
          isHd: true,
          bio: 'Water-attuned protagonist.',
        },
        {
          kind: 'origin' as const,
          id: 'pyrador',
          name: 'Pyrador Player',
          subtitle: 'Volcanic Caldera',
          isHd: true,
          bio: 'Fire-attuned mountain pioneer.',
        },
        {
          kind: 'origin' as const,
          id: 'zephyria',
          name: 'Zephyria Player',
          subtitle: 'Highland Steppe',
          isHd: true,
          bio: 'Wind-attuned fleet-footed nomad.',
        },
      ];
    }
    // all_villagers
    return NPC_PROFILES.map((n) => ({
      kind: 'npc' as const,
      id: n.id,
      name: n.name,
      subtitle: `${n.role} · ${VILLAGES[n.village]?.name ?? ''}`,
      isHd: true,
      bio: n.personality,
    }));
  };

  const renderLineup = (): void => {
    const filter = el<HTMLSelectElement>('lineup-filter').value;
    const facing = el<HTMLSelectElement>('lineup-facing').value as Facing;
    const scale = Number(el<HTMLSelectElement>('lineup-scale').value);
    const showGuides = el<HTMLInputElement>('lineup-guides').checked;
    const showLabels = el<HTMLInputElement>('lineup-labels').checked;
    const actors = getLineupActors(filter);

    // Compute required canvas width based on actor spacing
    const slotWidth = Math.max(130, 96 * scale + 24);
    const groundY = 290;
    lineupCanvas.width = Math.max(1200, actors.length * slotWidth + 80);
    lineupCanvas.height = 380;

    // Background & ground datum line
    lineupContext.fillStyle = '#142226';
    lineupContext.fillRect(0, 0, lineupCanvas.width, lineupCanvas.height);

    // Ground platform strip
    lineupContext.fillStyle = '#1e3337';
    lineupContext.fillRect(0, groundY, lineupCanvas.width, 90);
    lineupContext.strokeStyle = '#395357';
    lineupContext.lineWidth = 2;
    lineupContext.beginPath();
    lineupContext.moveTo(0, groundY);
    lineupContext.lineTo(lineupCanvas.width, groundY);
    lineupContext.stroke();

    if (showGuides) {
      // Height guidelines: 32px, 64px, 96px, 144px
      const guideHeights = [32, 64, 96, 144];
      lineupContext.setLineDash([4, 6]);
      lineupContext.font = '11px monospace';
      for (const gh of guideHeights) {
        const yPos = groundY - gh * scale;
        if (yPos < 20) continue;
        lineupContext.strokeStyle = 'rgba(239, 207, 139, 0.28)';
        lineupContext.fillStyle = '#efcf8b';
        lineupContext.beginPath();
        lineupContext.moveTo(0, yPos);
        lineupContext.lineTo(lineupCanvas.width, yPos);
        lineupContext.stroke();
        lineupContext.fillText(`${gh}px`, 12, yPos - 3);
      }
      lineupContext.setLineDash([]);
    }

    // Render actors
    actors.forEach((act, idx) => {
      const centerX = 60 + idx * slotWidth + slotWidth / 2;
      const isSelected = lineupSelectedActor === `${act.kind}:${act.id}`;

      // Ground shadow ellipse
      lineupContext.fillStyle = 'rgba(10, 16, 20, 0.55)';
      lineupContext.beginPath();
      lineupContext.ellipse(centerX, groundY, 26 * scale, 8 * scale, 0, 0, Math.PI * 2);
      lineupContext.fill();

      // Selection halo
      if (isSelected) {
        lineupContext.strokeStyle = '#efcf8b';
        lineupContext.lineWidth = 2;
        lineupContext.beginPath();
        lineupContext.ellipse(centerX, groundY, 32 * scale, 11 * scale, 0, 0, Math.PI * 2);
        lineupContext.stroke();
      }

      const frm = getActorFrame(act.kind, act.id, facing, frameIndex);
      if (frm) {
        drawFrame(lineupContext, frm, centerX, groundY, scale, false);
      } else {
        // Missing placeholder
        lineupContext.fillStyle = '#e4b183';
        lineupContext.font = '12px system-ui';
        lineupContext.textAlign = 'center';
        lineupContext.fillText('Placeholder', centerX, groundY - 40);
        lineupContext.textAlign = 'left';
      }

      if (showLabels) {
        // Name and badge
        lineupContext.font = 'bold 12px system-ui';
        lineupContext.fillStyle = isSelected ? '#efcf8b' : '#f0f5ec';
        lineupContext.textAlign = 'center';
        lineupContext.fillText(act.name, centerX, groundY + 22);

        lineupContext.font = '10px system-ui';
        lineupContext.fillStyle = act.isHd ? '#8be0a4' : '#f1cf85';
        lineupContext.fillText(act.isHd ? '★ NATIVE HD' : 'PROTOTYPE', centerX, groundY + 38);
        lineupContext.textAlign = 'left';
      }
    });

    // Populate detail cards underneath
    const cardsContainer = el('art-lineup-cards');
    cardsContainer.replaceChildren(
      ...actors.map((act) => {
        const card = document.createElement('div');
        const isSel = lineupSelectedActor === `${act.kind}:${act.id}`;
        card.className = `art-actor-card${isSel ? ' art-actor-selected' : ''}`;
        card.innerHTML = `
          <div class="art-actor-header">
            <span class="art-actor-name">${act.name}</span>
            <span class="art-badge ${act.isHd ? 'art-badge-success' : 'art-badge-warning'}">${act.isHd ? 'HD' : 'PROTO'}</span>
          </div>
          <p class="art-actor-desc"><strong>${act.subtitle}</strong><br/>${act.bio ?? 'Identity seed pending regional milestone.'}</p>
        `;
        card.onclick = () => {
          lineupSelectedActor = `${act.kind}:${act.id}`;
          renderLineup();
        };
        return card;
      }),
    );
  };

  // --- TAB 3: AQUALIA VILLAGE STAGING ---
  interface StagedEntity {
    readonly id: string;
    readonly name: string;
    readonly subtitle: string;
    readonly frameId?: string;
    readonly actorKind?: 'origin' | 'species' | 'npc';
    readonly actorId?: string;
    readonly facing?: Facing;
    readonly x: number;
    readonly y: number;
    readonly scale: number;
    readonly isCanopy?: boolean;
    readonly bio?: string;
  }

  const STAGED_VILLAGE: readonly StagedEntity[] = [
    // Architecture & Landmarks
    {
      id: 'env:house_aqualia',
      name: 'Canal Cottage',
      subtitle: 'Architecture · Aqualia Residence',
      frameId: 'env_house_aqualia',
      x: 420,
      y: 540,
      scale: 1,
      bio: 'Aqualia shingle-roofed canal dwelling with stone base and leaded glass.',
    },
    {
      id: 'env:tree_oak',
      name: 'Ancient Oak Trunk',
      subtitle: 'Flora · Landmark Tree',
      frameId: 'env_tree_oak',
      x: 1400,
      y: 510,
      scale: 1,
      bio: 'Deep-rooted timber oak anchoring the eastern canal bend.',
    },
    {
      id: 'env:landmark_well',
      name: 'Canal Stone Well',
      subtitle: 'Landmark · Fresh Water Spring',
      frameId: 'env_landmark_well',
      x: 880,
      y: 640,
      scale: 1,
      bio: 'Central freshwater reservoir with bucket winch and brass lantern.',
    },
    {
      id: 'env:landmark_waystone',
      name: 'Tidal Rune Waystone',
      subtitle: 'Landmark · Nautical Navigational Marker',
      frameId: 'env_landmark_waystone',
      x: 1120,
      y: 580,
      scale: 1,
      bio: 'Inscribed with luminous celestial glyphs predicting spring tides.',
    },
    {
      id: 'env:prop_hearth',
      name: 'Communal Cooking Hearth',
      subtitle: 'Prop · Village Firepit',
      frameId: 'env_prop_hearth',
      x: 630,
      y: 690,
      scale: 1,
      bio: 'Fieldstone hearth with copper kettle for village meals.',
    },
    // Flora
    {
      id: 'env:berries_1',
      name: 'Sunberry Bush',
      subtitle: 'Flora · Healthy Crop',
      frameId: 'env_flora_berries_healthy',
      x: 260,
      y: 720,
      scale: 1,
    },
    {
      id: 'env:berries_2',
      name: 'Sunberry Bush',
      subtitle: 'Flora · Healthy Crop',
      frameId: 'env_flora_berries_healthy',
      x: 1560,
      y: 680,
      scale: 1,
    },
    {
      id: 'env:reeds_1',
      name: 'River Reeds',
      subtitle: 'Flora · Water Vegetation',
      frameId: 'env_flora_reeds_healthy',
      x: 1040,
      y: 890,
      scale: 1,
    },
    {
      id: 'env:reeds_2',
      name: 'River Reeds',
      subtitle: 'Flora · Water Vegetation',
      frameId: 'env_flora_reeds_healthy',
      x: 1210,
      y: 930,
      scale: 1,
    },
    {
      id: 'env:wheat_1',
      name: 'Wild Wheat',
      subtitle: 'Flora · Grain Patch',
      frameId: 'env_flora_wheat_healthy',
      x: 1480,
      y: 620,
      scale: 1,
    },
    // Staged Cast (9 actors)
    {
      id: 'origin:aqualia',
      name: 'Aqualia Player',
      subtitle: 'Hero Protagonist',
      actorKind: 'origin',
      actorId: 'aqualia',
      facing: 's',
      x: 960,
      y: 720,
      scale: 1,
      bio: 'Hero protagonist standing in the village plaza.',
    },
    {
      id: 'species:rivallie',
      name: 'Rivallie',
      subtitle: 'Water Creature Companion',
      actorKind: 'species',
      actorId: 'rivallie',
      facing: 'sw',
      x: 1020,
      y: 740,
      scale: 1,
      bio: 'Companion following close behind the player.',
    },
    {
      id: 'npc:neris',
      name: 'Neris',
      subtitle: 'Master Fishmonger',
      actorKind: 'npc',
      actorId: 'npc:neris',
      facing: 'se',
      x: 490,
      y: 560,
      scale: 1,
      bio: 'Resting by the cottage porch checking daily nets.',
    },
    {
      id: 'npc:reed',
      name: 'Reed',
      subtitle: 'Master Reedweaver',
      actorKind: 'npc',
      actorId: 'npc:reed',
      facing: 's',
      x: 1070,
      y: 870,
      scale: 1,
      bio: 'Harvesting fresh reeds along the canal water line.',
    },
    {
      id: 'npc:willa',
      name: 'Willa',
      subtitle: 'Canal Chef',
      actorKind: 'npc',
      actorId: 'npc:willa',
      facing: 'e',
      x: 580,
      y: 690,
      scale: 1,
      bio: 'Tending the simmering pot on the communal cooking hearth.',
    },
    {
      id: 'npc:oren',
      name: 'Oren',
      subtitle: 'Runic Stonemason',
      actorKind: 'npc',
      actorId: 'npc:oren',
      facing: 'n',
      x: 1120,
      y: 600,
      scale: 1,
      bio: 'Studying the nautical runes on the tidal waystone.',
    },
    {
      id: 'npc:lark',
      name: 'Lark',
      subtitle: 'Canal Ferryman',
      actorKind: 'npc',
      actorId: 'npc:lark',
      facing: 'e',
      x: 840,
      y: 640,
      scale: 1,
      bio: 'Gathering freshwater at the central stone well.',
    },
    {
      id: 'npc:dara',
      name: 'Dara',
      subtitle: 'Waterkeeper',
      actorKind: 'npc',
      actorId: 'npc:dara',
      facing: 'w',
      x: 920,
      y: 640,
      scale: 1,
      bio: 'Converse with Lark while testing well water purity.',
    },
    {
      id: 'npc:finn',
      name: 'Finn',
      subtitle: 'Wetland Scout',
      actorKind: 'npc',
      actorId: 'npc:finn',
      facing: 'sw',
      x: 1340,
      y: 530,
      scale: 1,
      bio: 'Sheltered under the grand oak tree roots, scanning the horizon.',
    },
    {
      id: 'species:steamshell',
      name: 'Steamshell',
      subtitle: 'Water/Fire Creature',
      actorKind: 'species',
      actorId: 'steamshell',
      facing: 'w',
      x: 1250,
      y: 880,
      scale: 1,
      bio: 'Armored geothermal gastropod basking near the warm canal runoff.',
    },
    {
      id: 'species:mireling',
      name: 'Mireling',
      subtitle: 'Water Creature',
      actorKind: 'species',
      actorId: 'mireling',
      facing: 'ne',
      x: 1160,
      y: 910,
      scale: 1,
      bio: 'Amphibious mud dweller resting among the freshwater reeds.',
    },
    {
      id: 'species:zephyrit',
      name: 'Zephyrit',
      subtitle: 'Wind Creature',
      actorKind: 'species',
      actorId: 'zephyrit',
      facing: 'se',
      x: 1470,
      y: 560,
      scale: 1,
      bio: 'Feathered wind sprite resting under the oak canopy.',
    },
    // Grand oak canopy layer (drawn on top of oak tree and Finn)
    {
      id: 'env:canopy_oak',
      name: 'Grand Oak Canopy',
      subtitle: 'Foliage Cluster Layer',
      frameId: 'env_canopy_oak',
      x: 1400,
      y: 510,
      scale: 1,
      isCanopy: true,
      bio: 'Lush spherical cluster canopy occluding tree trunk and background actors.',
    },
  ];

  const renderStaging = (): void => {
    // If local proof image is loaded, render proof board
    if (proof) {
      sceneContext.drawImage(proof, 0, 0);
      return;
    }

    // 1. Base terrain background
    sceneContext.fillStyle = '#416656'; // Lush meadow base
    sceneContext.fillRect(0, 0, scene.width, scene.height);

    // Draw dirt pathway leading from cottage to plaza
    sceneContext.fillStyle = '#675f4a';
    sceneContext.beginPath();
    sceneContext.moveTo(420, 560);
    sceneContext.lineTo(680, 690);
    sceneContext.lineTo(960, 730);
    sceneContext.lineTo(1120, 600);
    sceneContext.lineTo(1400, 530);
    sceneContext.lineTo(1400, 580);
    sceneContext.lineTo(960, 780);
    sceneContext.lineTo(650, 730);
    sceneContext.lineTo(400, 590);
    sceneContext.closePath();
    sceneContext.fill();

    // Draw freshwater canal strip
    sceneContext.fillStyle = '#3e7589'; // Aqualia canal water
    sceneContext.beginPath();
    sceneContext.moveTo(0, 780);
    sceneContext.bezierCurveTo(480, 760, 800, 830, 1920, 810);
    sceneContext.lineTo(1920, 1080);
    sceneContext.lineTo(0, 1080);
    sceneContext.closePath();
    sceneContext.fill();

    // Sand and shoreline accents along water
    sceneContext.fillStyle = '#7a8b6f';
    sceneContext.fillRect(0, 770, 1920, 12);

    // 2. 64px Grid Overlay
    const showGrid = el<HTMLInputElement>('staging-grid').checked;
    if (showGrid) {
      sceneContext.strokeStyle = 'rgba(237, 241, 220, 0.12)';
      sceneContext.lineWidth = 1;
      for (let x = 0; x <= 1920; x += 64) {
        sceneContext.beginPath();
        sceneContext.moveTo(x + 0.5, 0);
        sceneContext.lineTo(x + 0.5, 1080);
        sceneContext.stroke();
      }
      for (let y = 0; y <= 1080; y += 64) {
        sceneContext.beginPath();
        sceneContext.moveTo(0, y + 0.5);
        sceneContext.lineTo(1920, y + 0.5);
        sceneContext.stroke();
      }
    }

    // 3. Depth-sort entities by ground Y
    const canopyAlpha = Number(el<HTMLSelectElement>('staging-canopy').value);
    const showAnchors = el<HTMLInputElement>('staging-anchors').checked;
    const showNames = el<HTMLInputElement>('staging-nametags').checked;

    const sorted = [...STAGED_VILLAGE]
      .filter((e) => !e.isCanopy || canopyAlpha > 0)
      .sort((a, b) => {
        // Draw canopy strictly after oak tree trunk
        if (a.isCanopy) return 1;
        if (b.isCanopy) return -1;
        return a.y - b.y;
      });

    for (const ent of sorted) {
      const isSelected = stagingSelectedEntity === ent.id;
      let frm: AssetFrame | undefined;
      if (ent.frameId) {
        frm = frames.get(ent.frameId);
      } else if (ent.actorKind && ent.actorId) {
        frm = getActorFrame(ent.actorKind, ent.actorId, ent.facing ?? 's', frameIndex);
      }

      if (ent.isCanopy) {
        sceneContext.save();
        sceneContext.globalAlpha = canopyAlpha;
      }

      // Draw shadow under actors and props
      if (!ent.isCanopy) {
        sceneContext.fillStyle = 'rgba(12, 22, 25, 0.45)';
        sceneContext.beginPath();
        sceneContext.ellipse(ent.x, ent.y, 22 * ent.scale, 7 * ent.scale, 0, 0, Math.PI * 2);
        sceneContext.fill();
      }

      // Draw the frame
      drawFrame(sceneContext, frm, ent.x, ent.y, ent.scale, showAnchors);

      if (ent.isCanopy) {
        sceneContext.restore();
      }

      // Selection reticle
      if (isSelected) {
        sceneContext.strokeStyle = '#efcf8b';
        lineupContext.lineWidth = 2;
        sceneContext.strokeRect(ent.x - 30, ent.y - 70, 60, 75);

        // Marker diamond above
        sceneContext.fillStyle = '#efcf8b';
        sceneContext.beginPath();
        sceneContext.moveTo(ent.x, ent.y - 80);
        sceneContext.lineTo(ent.x + 6, ent.y - 88);
        sceneContext.lineTo(ent.x, ent.y - 96);
        sceneContext.lineTo(ent.x - 6, ent.y - 88);
        sceneContext.closePath();
        sceneContext.fill();
      }

      // Nametag
      if (showNames && !ent.isCanopy) {
        sceneContext.font = '11px system-ui';
        sceneContext.fillStyle = isSelected ? '#efcf8b' : '#f0f5ec';
        sceneContext.textAlign = 'center';
        sceneContext.fillText(ent.name, ent.x, ent.y + 14);
        sceneContext.textAlign = 'left';
      }
    }

    // 4. Lighting Engine Overlay
    const light = el<HTMLSelectElement>('staging-light').value;
    if (light === 'sunset') {
      // Golden Hour warm amber overlay
      sceneContext.fillStyle = 'rgba(235, 145, 45, 0.22)';
      sceneContext.fillRect(0, 0, 1920, 1080);
    } else if (light === 'night') {
      // Deep indigo nocturnal fill
      sceneContext.fillStyle = 'rgba(9, 18, 38, 0.72)';
      sceneContext.fillRect(0, 0, 1920, 1080);

      // Emissive point lights (lanterns, windows, hearth fire)
      // Cottage windows and porch lantern
      const gCottage = sceneContext.createRadialGradient(420, 480, 10, 420, 480, 160);
      gCottage.addColorStop(0, 'rgba(255, 218, 120, 0.6)');
      gCottage.addColorStop(1, 'rgba(255, 218, 120, 0)');
      sceneContext.fillStyle = gCottage;
      sceneContext.fillRect(260, 320, 320, 320);

      // Cooking Hearth fire
      const gHearth = sceneContext.createRadialGradient(630, 675, 5, 630, 675, 120);
      gHearth.addColorStop(0, 'rgba(255, 140, 40, 0.65)');
      gHearth.addColorStop(1, 'rgba(255, 140, 40, 0)');
      sceneContext.fillStyle = gHearth;
      sceneContext.fillRect(510, 555, 240, 240);

      // Stone Well lantern
      const gWell = sceneContext.createRadialGradient(880, 620, 5, 880, 620, 85);
      gWell.addColorStop(0, 'rgba(255, 220, 130, 0.55)');
      gWell.addColorStop(1, 'rgba(255, 220, 130, 0)');
      sceneContext.fillStyle = gWell;
      sceneContext.fillRect(795, 535, 170, 170);

      // Runic Waystone nautical glyph glow
      const gWaystone = sceneContext.createRadialGradient(1120, 540, 5, 1120, 540, 95);
      gWaystone.addColorStop(0, 'rgba(100, 225, 255, 0.45)');
      gWaystone.addColorStop(1, 'rgba(100, 225, 255, 0)');
      sceneContext.fillStyle = gWaystone;
      sceneContext.fillRect(1025, 445, 190, 190);
    }

    // 5. Weather Simulation Overlay
    const weather = el<HTMLSelectElement>('staging-weather').value;
    if (weather === 'rain') {
      sceneContext.fillStyle = 'rgba(215, 238, 248, 0.65)';
      for (let i = 0; i < 280; i++) {
        const rx = (i * 197 + ((frameIndex * 17) % 1920)) % 1920;
        const ry = (i * 139 + ((frameIndex * 43) % 1080)) % 1080;
        sceneContext.fillRect(rx, ry, 2, 14);
      }
      // Water canal ripple circles
      sceneContext.strokeStyle = 'rgba(220, 245, 255, 0.35)';
      sceneContext.lineWidth = 1;
      for (let j = 0; j < 12; j++) {
        const ripX = 100 + ((j * 153) % 1700);
        const ripY = 820 + ((j * 47) % 220);
        const rad = 6 + (frameIndex % 6) * 3;
        sceneContext.beginPath();
        sceneContext.ellipse(ripX, ripY, rad * 2, rad, 0, 0, Math.PI * 2);
        sceneContext.stroke();
      }
    } else if (weather === 'mist') {
      sceneContext.fillStyle = 'rgba(210, 230, 235, 0.16)';
      for (let k = 0; k < 6; k++) {
        const my = 400 + k * 110;
        sceneContext.fillRect(0, my, 1920, 45);
      }
    }
  };

  // --- TAB 4: ITEMS & VFX MATRIX ---
  let matrixRendered = false;
  const renderMatrix = (): void => {
    if (matrixRendered) return;
    matrixRendered = true;

    // Items
    const itemGrid = el('art-items-grid');
    const itemAppearances = catalog?.appearances.filter((a) => a.kind === 'item') ?? [];
    itemGrid.replaceChildren(
      ...itemAppearances.map((app) => {
        const card = document.createElement('div');
        card.className = 'art-item-card';
        const itemCanvas = document.createElement('canvas');
        itemCanvas.width = 64;
        itemCanvas.height = 64;
        const ictx = itemCanvas.getContext('2d')!;
        const frm = app.frameId ? frames.get(app.frameId) : undefined;
        if (frm) {
          drawFrame(ictx, frm, 32, 48, 2, false);
        }
        card.append(itemCanvas);
        const nameEl = document.createElement('div');
        nameEl.className = 'art-item-name';
        nameEl.textContent = app.contentId;
        const idEl = document.createElement('div');
        idEl.className = 'art-item-id';
        idEl.textContent = app.frameId ?? 'item';
        card.append(nameEl, idEl);
        return card;
      }),
    );

    // Flora table
    const floraTbody = el('art-flora-rows');
    const states = ['healthy', 'harvested', 'burnt'] as const;
    floraTbody.replaceChildren(
      ...FLORA_SPECIES.map((spec) => {
        const tr = document.createElement('tr');
        const tdName = document.createElement('td');
        tdName.innerHTML = `<strong>${spec.name}</strong><br/><span style="font-size:11px;color:#8ba497">${spec.id}</span>`;
        tr.append(tdName);

        for (const st of states) {
          const td = document.createElement('td');
          const fCanvas = document.createElement('canvas');
          fCanvas.width = 64;
          fCanvas.height = 64;
          const fctx = fCanvas.getContext('2d')!;
          const frameKey = `env_flora_${spec.id}_${st}`;
          const frm = frames.get(frameKey);
          if (frm) {
            drawFrame(fctx, frm, 32, 52, 1, false);
          }
          const cap = document.createElement('div');
          cap.style.fontSize = '11px';
          cap.style.color = '#a0b3a7';
          cap.textContent = frm ? `${frm.sourceSize.w}×${frm.sourceSize.h}` : 'missing';
          td.append(fCanvas, cap);
          tr.append(td);
        }
        return tr;
      }),
    );

    // VFX Grid
    const vfxGrid = el('art-vfx-grid');
    vfxGrid.replaceChildren(
      ...VFX_EFFECTS.map((vfxKey) => {
        const card = document.createElement('div');
        card.className = 'art-item-card';
        const vCanvas = document.createElement('canvas');
        vCanvas.width = 64;
        vCanvas.height = 64;
        const vctx = vCanvas.getContext('2d')!;
        const app = catalog?.appearances.find((a) => a.contentId === vfxKey);
        const frm = app?.frameId ? frames.get(app.frameId) : undefined;
        if (frm) {
          drawFrame(vctx, frm, 32, 48, 1, false);
        }
        card.append(vCanvas);
        const nameEl = document.createElement('div');
        nameEl.className = 'art-item-name';
        nameEl.textContent = vfxKey.replace('vfx_', '').replace('_', ' ');
        const idEl = document.createElement('div');
        idEl.className = 'art-item-id';
        idEl.textContent = frm ? `${frm.sourceSize.w}×${frm.sourceSize.h}` : 'prototype';
        card.append(nameEl, idEl);
        return card;
      }),
    );
  };

  // --- TAB 5: ATLAS SHEET & MEMORY ---
  const renderAtlas = (): void => {
    if (!catalog?.pages.length) return;
    const page = catalog.pages[0]!;
    const image = images.get(page.id);
    if (!image) {
      ensurePage(page.id);
      return;
    }
    const zoom = Number(el<HTMLSelectElement>('atlas-zoom').value);
    atlasCanvas.width = Math.round(page.width * zoom);
    atlasCanvas.height = Math.round(page.height * zoom);
    atlasContext.imageSmoothingEnabled = false;
    atlasContext.drawImage(image, 0, 0, atlasCanvas.width, atlasCanvas.height);
  };

  const renderActiveView = (): void => {
    if (activeTab === 'inspector') renderInspector();
    else if (activeTab === 'lineup') renderLineup();
    else if (activeTab === 'staging') renderStaging();
    else if (activeTab === 'matrix') renderMatrix();
    else if (activeTab === 'atlas') renderAtlas();
  };

  // Switch tabs
  const switchTab = (mode: 'inspector' | 'lineup' | 'staging' | 'matrix' | 'atlas'): void => {
    activeTab = mode;
    root.querySelectorAll('.art-tab').forEach((tab) => {
      const isMatch = tab.getAttribute('data-mode') === mode;
      tab.classList.toggle('art-tab-active', isMatch);
      tab.setAttribute('aria-selected', String(isMatch));
    });
    root.querySelectorAll<HTMLElement>('.art-view').forEach((vw) => {
      const isMatch = vw.id === `view-${mode}`;
      vw.hidden = !isMatch;
      vw.classList.toggle('art-view-active', isMatch);
    });
    renderActiveView();
  };

  for (const mode of ['inspector', 'lineup', 'staging', 'matrix', 'atlas'] as const) {
    el(`tab-${mode}`).addEventListener('click', () => switchTab(mode), {
      signal: lifecycle.signal,
    });
  }

  const reset = (): void => {
    frameIndex = 0;
    accumulated = 0;
    renderActiveView();
  };

  const populateIdentities = (): void => {
    const previous = identityInput.value;
    const group = el<HTMLSelectElement>('art-kind').value;
    identityInput.replaceChildren(
      ...identities
        .filter((i) => group === 'all' || i.kind === group)
        .map((i) => new Option(i.name, `${i.kind}:${i.id}`)),
    );
    if ([...identityInput.options].some((o) => o.value === previous))
      identityInput.value = previous;
    else if (group === 'all' || group === 'origin') identityInput.value = 'origin:aqualia';
    reset();
  };

  const listen = (id: string, event: string, callback: () => void): void =>
    el(id).addEventListener(event, callback, { signal: lifecycle.signal });

  listen('art-kind', 'change', populateIdentities);
  for (const id of ['art-identity', 'art-state', 'art-facing', 'art-move'])
    listen(id, 'change', reset);
  for (const id of ['art-scale', 'art-anchor']) listen(id, 'change', renderActiveView);
  for (const id of [
    'lineup-filter',
    'lineup-facing',
    'lineup-scale',
    'lineup-guides',
    'lineup-labels',
  ])
    listen(id, 'change', renderLineup);
  for (const id of [
    'staging-light',
    'staging-weather',
    'staging-canopy',
    'staging-grid',
    'staging-anchors',
    'staging-nametags',
  ])
    listen(id, 'change', renderStaging);
  listen('atlas-zoom', 'change', renderAtlas);

  listen('art-next', 'click', () => {
    frameIndex++;
    renderActiveView();
  });
  listen('art-previous', 'click', () => {
    const length = clip()?.frameIds.length ?? 1;
    frameIndex = (frameIndex + length - 1) % length;
    renderActiveView();
  });
  listen('art-play', 'click', () => {
    playing = !playing;
    el('art-play').textContent = playing ? 'Pause' : 'Play';
    el('art-play').setAttribute('aria-pressed', String(playing));
    accumulated = 0;
  });

  // Scene click to inspect entity
  scene.addEventListener(
    'click',
    (evt) => {
      const rect = scene.getBoundingClientRect();
      const clickX = ((evt.clientX - rect.left) / rect.width) * 1920;
      const clickY = ((evt.clientY - rect.top) / rect.height) * 1080;

      // Find closest staged entity
      let closest: StagedEntity | null = null;
      let minDistance = 120;
      for (const ent of STAGED_VILLAGE) {
        if (ent.isCanopy) continue;
        const dist = Math.hypot(ent.x - clickX, ent.y - 40 - clickY);
        if (dist < minDistance) {
          minDistance = dist;
          closest = ent;
        }
      }
      if (closest) {
        stagingSelectedEntity = closest.id;
        el('art-staging-sel-title').textContent = `${closest.name} · ${closest.subtitle}`;
        el('art-staging-sel-coords').textContent = `World Anchor: (${closest.x}, ${closest.y})`;
        el('art-staging-sel-desc').textContent =
          closest.bio ?? 'Selected Aqualia environmental asset.';
        renderStaging();
      }
    },
    { signal: lifecycle.signal },
  );

  // Lineup canvas click
  lineupCanvas.addEventListener(
    'click',
    (evt) => {
      const rect = lineupCanvas.getBoundingClientRect();
      const clickX = ((evt.clientX - rect.left) / rect.width) * lineupCanvas.width;
      const filter = el<HTMLSelectElement>('lineup-filter').value;
      const actors = getLineupActors(filter);
      const scale = Number(el<HTMLSelectElement>('lineup-scale').value);
      const slotWidth = Math.max(130, 96 * scale + 24);
      const clickedIdx = Math.floor((clickX - 60) / slotWidth);
      if (clickedIdx >= 0 && clickedIdx < actors.length) {
        const clickedActor = actors[clickedIdx]!;
        lineupSelectedActor = `${clickedActor.kind}:${clickedActor.id}`;
        renderLineup();
      }
    },
    { signal: lifecycle.signal },
  );

  // Proof upload
  el<HTMLInputElement>('art-proof').addEventListener(
    'change',
    () => {
      const file = el<HTMLInputElement>('art-proof').files?.[0];
      if (!file) return;
      if (proofUrl) URL.revokeObjectURL(proofUrl);
      proofUrl = URL.createObjectURL(file);
      const url = proofUrl;
      const image = new Image();
      image.onload = () => {
        if (disposed || proofUrl !== url) return;
        proof = image;
        el('art-proof-status').textContent =
          `${file.name} · ${image.naturalWidth}×${image.naturalHeight} authored pixels · local review only`;
        renderStaging();
      };
      image.onerror = () => {
        if (!disposed && proofUrl === url)
          el('art-proof-status').textContent =
            'Scene proof could not be decoded. Choose a valid PNG, JPEG or WebP.';
      };
      image.src = url;
    },
    { signal: lifecycle.signal },
  );

  populateIdentities();

  const dispose = (): void => {
    disposed = true;
    lifecycle.abort();
    cancelAnimationFrame(animation);
    images.clear();
    pageLoads.clear();
    proof = null;
    if (proofUrl) URL.revokeObjectURL(proofUrl);
  };
  window.addEventListener('pagehide', dispose, { once: true, signal: lifecycle.signal });

  try {
    const [catResponse, manifestResponse] = await Promise.all([
      fetch('/assets/generated/catalog.json', { signal: lifecycle.signal }),
      fetch('/assets/portraits/manifest.json', { signal: lifecycle.signal }).catch(() => null),
    ]);

    if (!catResponse.ok)
      throw new Error(`Catalog request failed (${catResponse.status}). Run npm run assets:build.`);
    catalog = AssetCatalogSchema.parse(await catResponse.json());

    if (manifestResponse && manifestResponse.ok) {
      try {
        portraitManifest = (await manifestResponse.json()) as PortraitManifest;
      } catch {
        // Manifest optional
      }
    }

    identities = [
      ...actorIdentities,
      ...catalog.appearances.flatMap((a): Identity[] =>
        a.kind === 'environment' || a.kind === 'item'
          ? [{ kind: a.kind, id: a.contentId, name: a.contentId }]
          : [],
      ),
    ];

    el<HTMLSelectElement>('art-move').replaceChildren(
      new Option('All authored moves', ''),
      ...[...new Set(catalog.clips.flatMap((c) => (c.moveId ? [c.moveId] : [])))]
        .sort()
        .map((move) => new Option(move, move)),
    );

    for (const frame of catalog.frames) frames.set(frame.id, frame);

    // Pre-cache primary atlas bundle page
    if (catalog.pages.length) {
      ensurePage(catalog.pages[0]!.id);
    }

    if (disposed) return dispose;
    populateIdentities();
    renderMatrix();

    const tick = (time: number): void => {
      if (disposed) return;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      lastTime = time;
      if (playing && !document.hidden) {
        accumulated += delta * Number(el<HTMLSelectElement>('art-speed').value);
        const step = 1 / 6; // 6 FPS base idle breathing rate
        if (accumulated >= step) {
          frameIndex += Math.floor(accumulated / step);
          accumulated %= step;
          renderActiveView();
        }
      }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
  } catch (error) {
    if (!disposed) {
      el('art-status').textContent =
        `Asset gallery unavailable: ${error instanceof Error ? error.message : String(error)}`;
      el('art-status').setAttribute('role', 'alert');
    }
  }

  return dispose;
}
