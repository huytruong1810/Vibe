import { SimulationHost } from '../src/domain/simulation';
import type { CommandPayload, CommandResult } from '../src/domain/contracts';
import { ChunkStore } from '../src/domain/world';
import type { PlayerState } from '../src/domain/combat';
let serial = 0;
export function send(
  host: SimulationHost,
  command: CommandPayload,
  issuer: 'player' | 'inference' = 'player',
): CommandResult {
  return host.submit({ id: `test:${++serial}`, session: host.session, issuer, command });
}
export function flatWorld(size = 16): ChunkStore {
  return new ChunkStore(size);
}
export function player(): PlayerState {
  return {
    entityId: 0,
    x: 4.5,
    y: 4.5,
    hp: 100,
    maxHp: 100,
    stamina: 100,
    facingX: 1,
    facingY: 0,
    experience: 0,
    level: 1,
    origin: 1,
    dashUntil: 0,
    dashReadyAt: 0,
    attack: null,
    invulnerableUntil: 0,
  };
}
