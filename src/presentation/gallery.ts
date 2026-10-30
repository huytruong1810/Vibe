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
    name: `${n.name} · ${VILLAGES[n.village]!.name}`,
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

/** Review tool only: no simulation, worker, save store, inference, or game-entry bypass. */
export async function initializeArtGallery(root: HTMLElement): Promise<() => void> {
  if (!import.meta.env.DEV) throw new Error('The art gallery is available only in development.');
  const lifecycle = new AbortController();
  let disposed = false;
  let animation = 0;
  let lastTime = 0;
  let accumulated = 0;
  let playing = false;
  let frameIndex = 0;
  let catalog: AssetCatalog | null = null;
  let identities: readonly Identity[] = actorIdentities;
  const images = new Map<string, HTMLImageElement>();
  const pageLoads = new Map<string, HTMLImageElement>();
  const pageErrors = new Map<string, string>();
  let requiredPages = new Set<string>();
  const pageBudget = 128 * 1024 * 1024;
  const frames = new Map<string, AssetFrame>();
  let proof: HTMLImageElement | null = null;
  let proofUrl: string | null = null;
  root.innerHTML = `
    <main class="art-gallery">
      <header><div><p class="art-eyebrow">Hearthwild · development art review</p><h1>Aqualia, in the making.</h1><p>Identity, pose, registration and native-resolution review.</p></div><a href="./">Return to the game</a></header>
      <p class="art-warning">Prototype exports are reference material. A large preview does not count as native HD artwork. Missing identities and directions remain visible here.</p>
      <div class="art-controls" aria-label="Art selection">
        <label>Asset group<select id="art-kind" aria-label="Asset group"><option value="all">All assets</option><option value="origin">Player origins</option><option value="species">Creature species</option><option value="npc">Villagers</option><option value="environment">Environment</option><option value="item">Items</option></select></label>
        <label>Identity<select id="art-identity" aria-label="Identity"></select></label>
        <label>Animation<select id="art-state" aria-label="Animation"></select></label>
        <label>Move<select id="art-move"><option value="">All authored moves</option></select></label>
        <label>Facing<select id="art-facing" aria-label="Facing"></select></label>
        <label>Preview magnification<select id="art-scale"><option value="1">1× authored pixels</option><option value="2">2× preview</option><option value="4" selected>4× preview</option></select></label>
        <label class="art-checkbox"><input id="art-anchor" type="checkbox" checked>Anchor and bounds</label>
      </div>
      <p id="art-status" class="art-status" role="status">Loading validated asset catalog…</p>
      <div class="art-layout">
        <section class="art-stage" aria-label="Selected frame"><canvas id="art-frame" width="640" height="420" role="img" aria-label="Selected animation frame with ground anchor"></canvas><div class="art-controls"><button id="art-previous">Previous frame</button><button id="art-play" aria-pressed="false">Play</button><button id="art-next">Next frame</button><label>Playback speed<select id="art-speed"><option value="0.25">¼×</option><option value="0.5">½×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div><p id="art-frame-label"></p></section>
        <aside class="art-metadata" aria-label="Frame metadata"><h2>Registration</h2><dl id="art-metadata"></dl></aside>
      </div>
      <section id="art-comparison" aria-label="Eight-direction comparison"><h2 id="art-comparison-title" style="margin-top:24px">Eight authored directions</h2><p id="art-comparison-note">Each card uses the requested direction exactly. Missing poses are never mirrored or rotated.</p><div id="art-facings" class="art-facing-grid"></div></section>
      <section class="art-scene" aria-label="Native 1080p scene review"><h2>Native 1080p review board</h2><p>64-pixel terrain grid and a 96×144 human registration box. No approved target scene has been supplied yet. Load a local scene proof to review its native pixels; this does not publish or approve it.</p><div class="art-controls"><label>Local target-scene proof<input id="art-proof" type="file" accept="image/png,image/jpeg,image/webp"></label><label>Lighting preview<select id="art-light"><option value="day">Day</option><option value="night">Night</option></select></label><label>Weather preview<select id="art-weather"><option value="clear">Clear</option><option value="rain">Rain</option><option value="snow">Snow</option></select></label></div><p id="art-proof-status" class="art-status">Review board only · target scene pending</p><canvas id="art-scene" width="1920" height="1080" role="img" aria-label="Native 1920 by 1080 scene registration board"></canvas></section>
    </main>`;
  const el = <T extends HTMLElement = HTMLElement>(id: string): T =>
    root.querySelector<T>(`#${id}`)!;
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
    // A fallback-only binding preserves runtime identity but is still missing source artwork.
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
      render();
    };
    image.onerror = () => {
      finish();
      if (disposed) return;
      pageErrors.set(pageId, `Could not decode atlas image: ${page.imageUrl}`);
      render();
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
  const renderScene = (): void => {
    sceneContext.fillStyle = '#54766b';
    sceneContext.fillRect(0, 0, scene.width, scene.height);
    if (proof) sceneContext.drawImage(proof, 0, 0);
    else {
      sceneContext.fillStyle = '#547e8b';
      sceneContext.fillRect(0, 560, 1920, 360);
      sceneContext.fillStyle = '#9ca782';
      sceneContext.fillRect(0, 520, 1920, 40);
      sceneContext.fillRect(0, 920, 1920, 40);
      sceneContext.font = '24px system-ui';
      sceneContext.fillStyle = '#e6eddb';
      sceneContext.fillText('Registration board · approved Aqualia target scene pending', 48, 64);
    }
    sceneContext.strokeStyle = 'rgba(237,241,220,.18)';
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
    sceneContext.strokeStyle = '#efcf8b';
    sceneContext.strokeRect(912, 304, 96, 144);
    drawFrame(sceneContext, selectedFrame(clip(), frameIndex), 960, 448, 1, true);
    if (el<HTMLSelectElement>('art-light').value === 'night') {
      sceneContext.fillStyle = 'rgba(8,20,45,.60)';
      sceneContext.fillRect(0, 0, 1920, 1080);
    }
    const weather = el<HTMLSelectElement>('art-weather').value;
    if (weather !== 'clear') {
      sceneContext.fillStyle = 'rgba(231,242,247,.65)';
      for (let i = 0; i < 140; i++)
        sceneContext.fillRect(
          (i * 137) % 1920,
          (i * 251) % 1080,
          weather === 'rain' ? 2 : 5,
          weather === 'rain' ? 15 : 5,
        );
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
  };
  const render = (): void => {
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
    if (isStatic && playing) {
      playing = false;
      el('art-play').textContent = 'Play';
      el('art-play').setAttribute('aria-pressed', 'false');
    }
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
    renderScene();
  };
  const reset = (): void => {
    frameIndex = 0;
    accumulated = 0;
    render();
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
  for (const id of ['art-scale', 'art-anchor']) listen(id, 'change', render);
  for (const id of ['art-light', 'art-weather']) listen(id, 'change', renderScene);
  listen('art-next', 'click', () => {
    frameIndex++;
    render();
  });
  listen('art-previous', 'click', () => {
    const length = clip()?.frameIds.length ?? 1;
    frameIndex = (frameIndex + length - 1) % length;
    render();
  });
  listen('art-play', 'click', () => {
    playing = !playing;
    el('art-play').textContent = playing ? 'Pause' : 'Play';
    el('art-play').setAttribute('aria-pressed', String(playing));
    accumulated = 0;
  });
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
          `${file.name} · ${image.naturalWidth}×${image.naturalHeight} authored pixels${image.naturalWidth !== 1920 || image.naturalHeight !== 1080 ? ' · dimensions differ from 1920×1080 reference; displayed without resampling' : ''} · local review only`;
        renderScene();
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
    const response = await fetch('/assets/generated/catalog.json', { signal: lifecycle.signal });
    if (!response.ok)
      throw new Error(`Catalog request failed (${response.status}). Run npm run assets:build.`);
    catalog = AssetCatalogSchema.parse(await response.json());
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
    if (disposed) return dispose;
    populateIdentities();
    const tick = (time: number): void => {
      if (disposed) return;
      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      lastTime = time;
      const selectedClip = clip();
      if (playing && selectedClip && !document.hidden) {
        accumulated += delta * Number(el<HTMLSelectElement>('art-speed').value);
        const step = 1 / selectedClip.fps;
        if (accumulated >= step) {
          frameIndex += Math.floor(accumulated / step);
          accumulated %= step;
          render();
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
