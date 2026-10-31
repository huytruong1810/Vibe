import { describe, expect, it } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { hudViewState } from '../src/presentation/ui/state';
import { meterPixels } from '../src/presentation/ui/meters';
import type { ActorPresentation } from '../src/domain/presentation-contract';
import {
  AnimationController,
  facingFor,
  PoseResolver,
  PresentationCueReader,
  PresentationClock,
} from '../src/presentation/animation';
import type { AnimationClip } from '../src/presentation/assets/catalog';
import { CameraController, HD_PROFILE, WorldProjection } from '../src/presentation/projection';
import { QualitySettings, TEXTURE_BUDGETS } from '../src/presentation/quality';

const actor = (props: Partial<ActorPresentation> = {}): ActorPresentation => ({
  id: 0xffffffff,
  appearanceKind: 'origin',
  appearanceId: 'aqualia',
  x: 3,
  y: 4,
  elevation: 2,
  facingX: 1,
  facingY: 1,
  pose: 'idle',
  protected: true,
  action: null,
  ...props,
});
const clip = (props: Partial<AnimationClip> = {}): AnimationClip => ({
  id: 'test',
  appearanceId: 'origin:aqualia',
  state: 'walk',
  facing: 'se',
  frameIds: ['page-a:0', 'page-a:1', 'page-b:2', 'page-b:3'],
  fps: 8,
  playback: 'distance',
  stride: 1,
  ...props,
});

describe('HD projection, poses and animation boundaries', () => {
  it('interpolates confirmed clock ranges, acceleration and pause without predicting simulation', () => {
    const clock = new PresentationClock();
    clock.accept('a', 30, 481, false, 1000);
    clock.accept('a', 33, 481.1, false, 1100);
    expect(clock.sample(1150).tick).toBe(31.5);
    expect(clock.sample(1300).tick).toBe(33);
    clock.accept('a', 57, 481.9, false, 1400);
    expect(clock.sample(1450).tick).toBe(45);
    clock.accept('a', 57, 481.9, true, 1500);
    expect(clock.sample(5000)).toEqual({ tick: 57, seconds: 481.9 });
    clock.accept('b', 0, 480, false, 6000);
    expect(clock.sample(6000).tick).toBe(0);
  });
  it('round trips elevated feet and CSS-scaled picking without changing coverage', () => {
    const p = new WorldProjection(),
      camera = { x: 120, y: 360 };
    for (const elevation of [0, 1, 3]) {
      const screen = p.screen(12.5, 18.75, elevation, camera);
      expect(p.unproject(screen.x, screen.y, camera, elevation)).toEqual({ x: 12.5, y: 18.75 });
      const bounds = { left: 24, top: 30, width: 960, height: 540 };
      expect(p.client({ x: screen.x / 2 + 24, y: screen.y / 2 + 30 }, bounds)).toEqual(screen);
    }
    expect(p.fit(1280, 800)).toEqual({ width: 1280, height: 720 });
    const c = new CameraController(p);
    c.follow(100, 200, 2, 1 / 60);
    expect(p.screen(100, 200, 2, c)).toEqual({ x: HD_PROFILE.width / 2, y: HD_PROFILE.height / 2 });
    expect(p.depth(5, 0xffffffff)).toBeGreaterThan(p.depth(5, 0));
  });
  it('selects all eight authored directions and preserves idle facing', () => {
    expect(
      [
        [1, 0],
        [1, 1],
        [0, 1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
        [0, -1],
        [1, -1],
      ].map(([x, y]) => facingFor(x!, y!)),
    ).toEqual(['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne']);
    expect(facingFor(0, 0, 'nw')).toBe('nw');
  });
  it('maps authoritative combat phases across pages without changing damage deadlines', () => {
    const controller = new AnimationController(),
      attack = clip({
        playback: 'combat',
        state: 'attack',
        moveId: 'strike',
        frameIds: Array.from({ length: 12 }, (_, i) => `page-${i < 6 ? 'a' : 'b'}:${i}`),
        phases: { windup: [0, 4], active: [4, 6], recovery: [6, 12] },
      });
    const a = actor({
      pose: 'attack',
      action: { move: 'strike', startedAt: 100, activeAt: 104, recoveryAt: 106, endsAt: 115 },
    });
    expect(controller.frame(a, attack, 103)).toBe('page-a:3');
    expect(controller.frame(a, attack, 104)).toBe('page-a:4');
    expect(controller.frame(a, attack, 106)).toBe('page-b:6');
    expect(controller.frame(a, attack, 115)).toBe('page-b:11');
  });
  it('uses travel distance for feet and freezes time-based clips at a paused tick', () => {
    const c = new AnimationController(),
      walk = clip(),
      a = actor();
    expect(c.frame(a, walk, 0)).toBe('page-a:0');
    expect(c.frame({ ...a, x: 3.5 }, walk, 30)).toBe('page-b:2');
    expect(c.frame({ ...a, x: 3.5 }, walk, 60)).toBe('page-b:2');
    const sleep = clip({ id: 'sleep', state: 'sleep', playback: 'loop' });
    expect(c.frame(a, sleep, 60)).toBe(c.frame(a, sleep, 60));
    const resolver = new PoseResolver();
    expect(resolver.resolve(actor({ pose: 'sleep' }))).toBe('sleep');
    expect(resolver.resolve(actor({ pose: 'downed' }), true)).toBe('downed');
  });
  it('deduplicates cues and resets on session change or restored time', () => {
    const r = new PresentationCueReader(),
      cue = { sequence: 1, tick: 10, actor: 0xffffffff, target: 1, kind: 'hit' as const };
    expect(r.read('a', 10, [cue])).toEqual([cue]);
    expect(r.read('a', 11, [cue])).toEqual([]);
    expect(r.read('b', 10, [cue])).toEqual([cue]);
    expect(r.read('b', 100, [{ ...cue, sequence: 2 }])).toEqual([]);
    expect(r.read('b', 10, [cue])).toEqual([cue]);
  });
  it('reduces decorations before framebuffer and preserves exact texture budgets', () => {
    const q = new QualitySettings();
    expect(q.textureBudget).toBe(TEXTURE_BUDGETS.medium);
    for (let i = 0; i < 360; i++) q.sample(30);
    expect(q.effects).toBe(0);
    expect(q.framebufferScale).toBe(1);
    for (let i = 0; i < 180; i++) q.sample(30);
    expect(q.framebufferScale).toBe(0.75);
    for (let i = 0; i < 180; i++) q.sample(30);
    expect(q.framebufferScale).toBe(2 / 3);
    q.configure('low');
    expect(q.textureBudget).toBe(128 * 1024 ** 2);
  });
  it('keeps snapshots and rendering frequency out of authoritative save-v4 outcomes', () => {
    const a = new SimulationHost(42, 1, 40, 'same'),
      b = new SimulationHost(42, 1, 40, 'same');
    for (let i = 0; i < 90; i++) {
      a.step();
      b.step();
      if (i % 3 === 0) {
        const view = hudViewState(a.frame());
        meterPixels(view.health, 160);
        expect(view.time.day).toBe('Day 1');
      }
    }
    expect(a.snapshot()).toEqual(b.snapshot());
    const frame = a.frame();
    expect(frame.actors.find((e) => e.id === 0)?.appearanceId).toBe('aqualia');
    expect(frame.actors.find((e) => e.appearanceKind === 'npc')?.appearanceId).toMatch(/^npc:/);
    expect(frame.actors.every((e) => Number.isSafeInteger(e.id))).toBe(true);
    expect(a.snapshot().version).toBe(4);
    expect(a.snapshot()).not.toHaveProperty('cues');
    a.dispose();
    b.dispose();
  });
});
