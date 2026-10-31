import type { RenderSnapshot } from '../../domain/contracts';
import type { AppearanceResolver } from '../assets/catalog';
import { ITEMS } from '../../content/definitions';
import { patchView } from './patch';
import { meterMarkup, setMeter } from './meters';
import { hudTime } from './state';
import { escapeHtml } from './view';

export function experienceFraction(experience: number, level: number): number {
  if (level >= 50) return 1;
  const lower = 25 * (level - 1) ** 2,
    upper = 25 * level ** 2;
  return Math.max(0, Math.min(1, (experience - lower) / (upper - lower)));
}

/** Presentation only; updates bounded nodes without replacing focused buttons. */
export function updateExploration(
  frame: RenderSnapshot,
  appearance: AppearanceResolver | null,
  map: HTMLCanvasElement | null,
): void {
  const el = (id: string) => document.getElementById(id)!;
  const actor = frame.actors.find((a) => a.id === frame.player.entityId);
  const portrait = actor && appearance?.portrait(actor.appearanceKind, actor.appearanceId);
  const medallion = el('player-medallion');
  const url = portrait?.hud96;
  if (medallion.dataset.url !== (url ?? '')) {
    medallion.dataset.url = url ?? '';
    medallion.replaceChildren();
    if (url) {
      const img = new Image();
      img.src = url;
      img.alt = 'Player';
      medallion.append(img);
    } else medallion.textContent = '?';
  }
  setMeter(el('health-track'), frame.player.hp / frame.player.maxHp);
  setMeter(el('stamina-track'), frame.player.stamina / 100);
  setMeter(el('xp-track'), experienceFraction(frame.player.experience, frame.player.level));
  const time = hudTime(frame);
  el('hud-day').textContent = time.day;
  el('hud-phase').textContent = time.phase;
  el('clock').textContent = time.clock;
  el('hud-weather').textContent = time.weather;
  const combat =
    frame.duel !== null ||
    frame.threats.some(
      (t) => t.actor === frame.player.entityId || t.target === frame.player.entityId,
    ) ||
    !!actor?.action;
  el('app').dataset.combat = String(combat);
  const sleeping = frame.humanNeeds.find((h) => h.id === frame.player.entityId)?.sleeping;
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-combat]')) {
    const action = actor?.action;
    const disabled =
      frame.paused.length > 0 ||
      !!sleeping ||
      frame.player.hp <= 0 ||
      !!action ||
      (button.dataset.combat === 'dash' &&
        (frame.player.dashReadyAt > frame.tick || frame.player.stamina < 22));
    button.disabled = disabled;
    const progress = action
      ? Math.max(0, Math.min(1, (action.endsAt - frame.tick) / (action.endsAt - action.startedAt)))
      : 0;
    button.style.setProperty('--cooldown', `${100 * progress}%`);
  }
  const partner = frame.creatures.find((c) => c.owner === frame.player.entityId);
  const companion = el('companion-hud');
  companion.hidden = !partner;
  if (partner) {
    const portrait = appearance?.portrait('species', partner.species);
    patchView(
      companion,
      `${portrait ? `<img data-key="partner:portrait" src="${escapeHtml(portrait.hud96)}" alt="${escapeHtml(partner.name)}" class="companion-portrait"/>` : ''}<div class="companion-body" data-key="partner:body"><div class="companion-title">${escapeHtml(partner.name)} · ${Math.ceil(partner.hp)}/${partner.maxHp}</div><div class="companion-needs">${(
        [
          ['Food', partner.food],
          ['Water', partner.water],
          ['Play', partner.recreation],
          ['Clean', partner.cleanliness],
          ['Rest', partner.rest],
        ] as const
      )
        .map(([label, value]) => meterMarkup(label, value, true))
        .join('')}</div></div>`,
    );
  }
  // Item names are assigned below using textContent, keeping markup independent of content.
  patchView(
    el('quick-slots'),
    [0, 1]
      .map(
        (i) =>
          `<button data-action="use" data-id="${i}" data-key="quick:${i}"><span class="slot-face" aria-hidden="true"><i class="quick-icon"></i><span class="quick-charges"></span></span><span class="quick-label"></span></button>`,
      )
      .join(''),
  );
  frame.inventory.forEach((item, i) => {
    const button = el('quick-slots').children[i]! as HTMLButtonElement;
    const text = `${i + 1} ${item ? ITEMS[item.id].name : 'Empty'}${item?.charges !== undefined ? ` · ${item.charges} left` : ''}`;
    button.querySelector('.quick-label')!.textContent =
      `${i + 1} ${item ? ITEMS[item.id].name : 'Empty'}`;
    button.querySelector('.quick-charges')!.textContent =
      item?.charges !== undefined ? String(item.charges) : '';
    button.setAttribute('aria-label', `Carried slot ${text}`);
    button.title = text;
    const icon = button.querySelector<HTMLElement>('.quick-icon')!;
    icon.className = `quick-icon${item ? ' item-pixel' : ''}`;
    icon.textContent = item ? '' : '+';
    if (item)
      icon.style.setProperty('--item', `#${ITEMS[item.id].color.toString(16).padStart(6, '0')}`);
  });
  const canvas = el('hud-minimap') as HTMLCanvasElement,
    ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (map)
    ctx.drawImage(
      map,
      frame.player.x - 32,
      frame.player.y - 32,
      64,
      64,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  ctx.fillStyle = '#f5ddb0';
  ctx.fillRect(canvas.width / 2 - 4, canvas.height / 2 - 4, 8, 8);
}
