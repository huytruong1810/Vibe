import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { send } from './helpers';
import { COMBO_ATTACKS } from '../src/domain/combat';

describe('CMB-M1..M5 3-hit combo chain and recovery dash cancels (CMB-2)', () => {
  it('chains 3 consecutive strike attacks during recovery windows and resets after finisher', () => {
    const host = new SimulationHost(42, 1, 0, 'world:combo:test');

    // Hit 1: start attack from idle
    const hit1 = send(host, { type: 'attack', kind: 'strike' });
    expect(hit1.ok).toBe(true);
    expect(host.player.attack).not.toBeNull();
    expect(host.player.attack?.chainIndex).toBe(0);

    const def1 = COMBO_ATTACKS.strike[0]!;

    // Advance into windup - cannot chain during windup
    for (let t = 0; t < def1.windup; t++) host.step();
    expect(host.combat.stateMachine.phase(host.player, host.tick)).toBe('active');
    const premature = send(host, { type: 'attack', kind: 'strike' });
    expect(premature.ok).toBe(false);

    // Advance into active phase
    for (let t = 0; t < def1.active; t++) host.step();
    expect(host.combat.stateMachine.phase(host.player, host.tick)).toBe('recovery');

    // In recovery of hit 1: attack chains to Hit 2!
    const hit2 = send(host, { type: 'attack', kind: 'strike' });
    expect(hit2.ok).toBe(true);
    expect(host.player.attack?.chainIndex).toBe(1);

    const def2 = COMBO_ATTACKS.strike[1]!;

    // Advance through windup and active of hit 2 to recovery
    for (let t = 0; t < def2.windup + def2.active; t++) host.step();
    expect(host.combat.stateMachine.phase(host.player, host.tick)).toBe('recovery');

    // In recovery of hit 2: attack chains to Hit 3 finisher!
    const hit3 = send(host, { type: 'attack', kind: 'strike' });
    expect(hit3.ok).toBe(true);
    expect(host.player.attack?.chainIndex).toBe(2);

    const def3 = COMBO_ATTACKS.strike[2]!;

    // Advance through hit 3 completion
    for (let t = 0; t < def3.windup + def3.active + def3.recovery; t++) host.step();
    expect(host.player.attack).toBeNull();

    // After finisher completes, next strike starts fresh at Hit 1 (chainIndex 0)
    const freshHit1 = send(host, { type: 'attack', kind: 'strike' });
    expect(freshHit1.ok).toBe(true);
    expect(host.player.attack?.chainIndex).toBe(0);
  });

  it('resets combo to hit 1 when attack recovery window expires without input', () => {
    const host = new SimulationHost(42, 1, 0, 'world:combo:expire');

    // Start hit 1
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    expect(host.player.attack?.chainIndex).toBe(0);

    const def1 = COMBO_ATTACKS.strike[0]!;

    // Advance past the entire attack duration
    for (let t = 0; t <= def1.windup + def1.active + def1.recovery; t++) host.step();
    expect(host.player.attack).toBeNull();

    // Next attack should start fresh at hit 1 (chainIndex 0)
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    expect(host.player.attack?.chainIndex).toBe(0);
  });

  it('allows dash to cancel recovery of hits 1 and 2, but rejects dash during hit 3 or windup', () => {
    const host = new SimulationHost(42, 1, 0, 'world:combo:dash');

    // Start hit 1
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    const def1 = COMBO_ATTACKS.strike[0]!;

    // During windup: dash is rejected
    const dashInWindup = send(host, { type: 'dash' });
    expect(dashInWindup.ok).toBe(false);
    expect(dashInWindup.message).toMatch(/Finish the attack/);

    // Advance to recovery
    for (let t = 0; t < def1.windup + def1.active; t++) host.step();
    expect(host.combat.stateMachine.phase(host.player, host.tick)).toBe('recovery');

    // Dashing during hit 1 recovery succeeds and cancels the attack!
    const dashInRecovery = send(host, { type: 'dash' });
    expect(dashInRecovery.ok).toBe(true);
    expect(host.player.dashUntil).toBeGreaterThan(host.tick);
    expect(host.player.attack).toBeNull();

    // Wait for dash and cooldown to finish
    for (let t = 0; t < 40; t++) host.step();

    // Now advance to Hit 3
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true); // hit 1
    for (let t = 0; t < def1.windup + def1.active; t++) host.step();
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true); // hit 2
    const def2 = COMBO_ATTACKS.strike[1]!;
    for (let t = 0; t < def2.windup + def2.active; t++) host.step();
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true); // hit 3
    const def3 = COMBO_ATTACKS.strike[2]!;
    for (let t = 0; t < def3.windup + def3.active; t++) host.step();
    expect(host.combat.stateMachine.phase(host.player, host.tick)).toBe('recovery');
    expect(host.player.attack?.chainIndex).toBe(2);

    // Dashing during hit 3 recovery is rejected (CMB-2.3 finisher commitment)
    const dashInFinisher = send(host, { type: 'dash' });
    expect(dashInFinisher.ok).toBe(false);
    expect(dashInFinisher.message).toMatch(/Finish the attack/);
  });

  it('applies enhanced knockback impulse on hit 3 finisher compared to hit 1 jab', () => {
    const host = new SimulationHost(42, 1, 0, 'world:combo:knockback');
    const s = host.entities;
    host.player.facingX = 1;
    host.player.facingY = 0;
    const targetSlot = host.creatures.spawn(0, host.player.x + 1.2, host.player.y);

    // Start hit 1 jab
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    const def1 = COMBO_ATTACKS.strike[0]!;

    // Step through windup and 1 active tick to deliver damage and recoil
    for (let t = 0; t <= def1.windup; t++) host.step();
    const jabRecoil = s.recoilX[targetSlot]!;
    expect(jabRecoil).toBeGreaterThan(0);

    // Step remaining active frames into recovery
    for (let t = 0; t < def1.active - 1; t++) host.step();
    expect(host.combat.stateMachine.phase(host.player, host.tick)).toBe('recovery');

    // Chain to hit 2 sweep
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    expect(host.player.attack?.chainIndex).toBe(1);
    const def2 = COMBO_ATTACKS.strike[1]!;
    for (let t = 0; t < def2.windup + def2.active; t++) host.step();
    expect(host.combat.stateMachine.phase(host.player, host.tick)).toBe('recovery');

    // Reset target recoil and ensure in-range distance before hit 3
    s.recoilX[targetSlot] = 0;
    s.recoilY[targetSlot] = 0;
    s.x[targetSlot] = host.player.x + 1.2;
    s.y[targetSlot] = host.player.y;

    // Chain to hit 3 finisher
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    expect(host.player.attack?.chainIndex).toBe(2);
    const def3 = COMBO_ATTACKS.strike[2]!;

    // Step into active frame of hit 3
    for (let t = 0; t <= def3.windup; t++) host.step();
    const finisherRecoil = s.recoilX[targetSlot]!;
    expect(finisherRecoil).toBeGreaterThan(jabRecoil * 1.5);
  });
});
