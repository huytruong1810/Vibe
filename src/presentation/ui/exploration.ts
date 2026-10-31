import type { RenderSnapshot } from '../../domain/contracts';
import type { AppearanceResolver } from '../assets/catalog';
import { ITEMS } from '../../content/definitions';
import { patchView } from './patch';

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
  el('player-xp').style.width =
    `${100 * experienceFraction(frame.player.experience, frame.player.level)}%`;
  el('hud-weather').textContent = frame.weather.kind;
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
    // Names originate in authored content; use text nodes, not model-controlled markup.
    companion.replaceChildren();
    const portrait = appearance?.portrait('species', partner.species);
    if (portrait) {
      const img = new Image();
      img.src = portrait.hud96;
      img.alt = partner.name;
      img.className = 'companion-portrait';
      companion.append(img);
    }
    const title = document.createElement('div');
    title.textContent = `${partner.name} · ${Math.ceil(partner.hp)}/${partner.maxHp}`;
    companion.append(title);
    for (const [label, value] of [
      ['Food', partner.food],
      ['Water', partner.water],
      ['Play', partner.recreation],
      ['Clean', partner.cleanliness],
      ['Rest', partner.rest],
    ] as const) {
      const row = document.createElement('div');
      row.className = 'need';
      const text = document.createElement('span');
      text.textContent = label;
      const track = document.createElement('div');
      track.className = 'meter';
      const bar = document.createElement('i');
      bar.style.width = `${Math.max(0, Math.min(1, value)) * 100}%`;
      track.append(bar);
      row.append(text, track);
      companion.append(row);
    }
  }
  // Item names are assigned below using textContent, keeping markup independent of content.
  patchView(
    el('quick-slots'),
    '<button data-action="use" data-id="0" data-key="quick:0"></button><button data-action="use" data-id="1" data-key="quick:1"></button>',
  );
  frame.inventory.forEach((item, i) => {
    el('quick-slots').children[i]!.textContent = `${i + 1} ${item ? ITEMS[item.id].name : 'Empty'}`;
  });
  const canvas = el('hud-minimap') as HTMLCanvasElement,
    ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 160, 160);
  if (map) ctx.drawImage(map, frame.player.x - 32, frame.player.y - 32, 64, 64, 0, 0, 160, 160);
  ctx.fillStyle = '#f5ddb0';
  ctx.fillRect(76, 76, 8, 8);
}
