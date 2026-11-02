import type { CommandPayload, RenderSnapshot } from '../../domain/contracts';
import { NPC_PROFILES } from '../../content/definitions';
import type { GearSlot } from '../../domain/equipment';
import { FURNITURE_ACTION_LABELS, nearestInteraction } from './interaction';
export type Overlay = 'inventory' | 'inspection' | 'journal' | 'map' | 'settings';
export type UiIntent =
  | { readonly type: 'toggle'; readonly overlay: Overlay }
  | { readonly type: 'use'; readonly slot: 0 | 1 }
  | { readonly type: 'drop'; readonly slot: 0 | 1 }
  | { readonly type: 'equip'; readonly slot: 0 | 1 }
  | { readonly type: 'unequip'; readonly slot: GearSlot; readonly drop?: boolean }
  | { readonly type: 'craft' }
  | { readonly type: 'rest' }
  | { readonly type: 'wake' };
export interface HudViewState {
  readonly session: string;
  readonly health: number;
  readonly stamina: number;
  readonly needs: readonly { readonly label: string; readonly value: number }[];
  readonly prompt: string;
  readonly sleeping: boolean;
  readonly modal: 'dialogue' | 'menu' | null;
  readonly time: Readonly<{
    day: string;
    phase: 'Dawn' | 'Day' | 'Dusk' | 'Night';
    clock: string;
    weather: string;
  }>;
}
export function hudTime(
  frame: Pick<RenderSnapshot, 'day' | 'hour' | 'calendar' | 'weather'>,
): HudViewState['time'] {
  const hour = ((frame.hour % 24) + 24) % 24;
  return Object.freeze({
    day: `Day ${frame.day + 1}`,
    phase:
      hour >= 5 && hour < 9
        ? 'Dawn'
        : hour >= 9 && hour < 17
          ? 'Day'
          : hour >= 17 && hour < 21
            ? 'Dusk'
            : 'Night',
    clock: frame.calendar,
    weather: frame.weather.kind,
  });
}
/** Pure read model; views receive values, controllers retain commands and lifecycle. */
export function hudViewState(frame: RenderSnapshot): HudViewState {
  const player = frame.humanNeeds.find((h) => h.id === frame.player.entityId);
  const interaction = nearestInteraction(frame);
  return Object.freeze({
    session: frame.session,
    time: hudTime(frame),
    health: frame.player.hp / frame.player.maxHp,
    stamina: frame.player.stamina / 100,
    sleeping: player?.sleeping ?? false,
    needs: Object.freeze(
      [
        ['Food', player?.food],
        ['Water', player?.water],
        ['Recreation', player?.recreation],
        ['Cleanliness', player?.cleanliness],
        ['Rest', player?.rest],
      ].map(([label, value]) => Object.freeze({ label: String(label), value: Number(value ?? 1) })),
    ),
    prompt: frame.dialogue
      ? 'Finish the conversation to continue'
      : frame.duel !== null
        ? 'J strike · K element · Space dash'
        : player?.sleeping
          ? 'Sleeping · wake when rested'
          : interaction.kind === 'portal'
            ? `E · ${interaction.portal.name}${interaction.portal.allowed ? '' : ` · ${interaction.portal.reason ?? 'Entry unavailable'}`}`
            : interaction.kind === 'furniture'
              ? `E · ${FURNITURE_ACTION_LABELS[interaction.prop.interaction]}`
              : interaction.kind === 'npc'
                ? `E · Talk to ${NPC_PROFILES.find((p) => p.id === interaction.npc.profileId)?.name ?? 'villager'}`
                : 'E · Gather nearby resources',
    modal: frame.dialogue ? 'dialogue' : frame.paused.includes('menu') ? 'menu' : null,
  });
}
export function commandForIntent(intent: UiIntent): CommandPayload | null {
  switch (intent.type) {
    case 'use':
    case 'drop':
    case 'equip':
      return { type: intent.type, slot: intent.slot };
    case 'unequip':
      return { type: 'unequip', slot: intent.slot, ...(intent.drop ? { drop: true } : {}) };
    case 'craft':
      return { type: 'combine' };
    case 'rest':
      return { type: 'sleep' };
    case 'wake':
      return { type: 'wake' };
    case 'toggle':
      return null;
  }
}
