import { describe, expect, it } from 'vitest';
import type { ActorPresentation } from '../src/domain/presentation-contract';
import { AnimationController, PoseResolver, layerFrameId } from '../src/presentation/animation';
import {
  AppearanceResolver,
  type AnimationClip,
  type AssetCatalog,
  type AssetFrame,
} from '../src/presentation/assets/catalog';
import {
  BoundedCompositeCache,
  compositeKey,
  compositeBounds,
  layerRegistration,
  layerSockets,
  selectModularLayers,
  socketWorld,
} from '../src/presentation/compositor';
import { EffectDirector, effectSeed, visibleProjectiles } from '../src/presentation/effects';
import { actorInScene, sceneCamera } from '../src/presentation/scene-view';

const actor = (changes: Partial<ActorPresentation> = {}): ActorPresentation => ({
  id: 1,
  appearanceKind: 'origin',
  appearanceId: 'aqualia',
  x: 3,
  y: 4,
  elevation: 0,
  facingX: 1,
  facingY: 0,
  pose: 'walk',
  protected: true,
  action: null,
  ...changes,
});
const clip = (changes: Partial<AnimationClip> = {}): AnimationClip => ({
  id: 'body_walk_e',
  appearanceId: 'layer:body',
  state: 'walk',
  facing: 'e',
  frameIds: Array.from({ length: 8 }, (_, i) => `body_${i}`),
  fps: 8,
  playback: 'distance',
  stride: 1,
  ...changes,
});
const frame: AssetFrame = {
  id: 'body_0',
  pageId: 'page',
  textureKey: 'body_0',
  rect: { x: 0, y: 0, w: 40, h: 50 },
  sourceSize: { w: 48, h: 64 },
  trim: { x: 4, y: 10, w: 40, h: 50 },
  anchor: { x: 0.5, y: 1 },
  anchorPx: { x: 24, y: 64 },
  sockets: { hand: { x: 40, y: 30 } },
};

describe('modular presentation invariants', () => {
  it('preserves foot cadence across authored facings and samples only committed odometers', () => {
    const c = new AnimationController(),
      a = actor({ locomotion: { gait: 'walk', distance: 0, discontinuity: 0 } });
    c.accept('session', 0, [a]);
    expect(c.sample(a, clip(), 0).frameIndex).toBe(0);
    const moved = actor({ x: 4, locomotion: { gait: 'walk', distance: 1, discontinuity: 0 } });
    c.accept('session', 10, [moved]);
    expect(c.sample(moved, clip(), 5).frameIndex).toBe(4);
    expect(c.position(moved, 5).x).toBe(3.5);
    const turned = clip({
      id: 'body_walk_n',
      facing: 'n',
      frameIds: Array.from({ length: 8 }, (_, i) => `north_${i}`),
    });
    expect(c.sample(moved, turned, 7.5).frameId).toBe('north_6');
    expect(c.sample(moved, turned, 999).frameIndex).toBe(0);
  });
  it('resets phase on discontinuity, restored time, session and scene-controller reset', () => {
    const c = new AnimationController(),
      a = actor({ locomotion: { gait: 'walk', distance: 10, discontinuity: 0 } });
    c.accept('one', 30, [a]);
    c.sample(a, clip(), 30);
    const moved = actor({ locomotion: { gait: 'walk', distance: 10.75, discontinuity: 0 } });
    c.accept('one', 40, [moved]);
    expect(c.sample(moved, clip(), 40).frameIndex).toBe(6);
    const teleported = actor({ locomotion: { gait: 'walk', distance: 90, discontinuity: 1 } });
    c.accept('one', 41, [teleported]);
    expect(c.sample(teleported, clip(), 41).frameIndex).toBe(0);
    c.accept('one', 5, [moved]);
    expect(c.sample(moved, clip(), 5).frameIndex).toBe(0);
    c.accept('two', 10, [moved]);
    expect(c.sample(moved, clip(), 10).frameIndex).toBe(0);
    c.reset();
    expect(c.sample(moved, clip(), 10).frameIndex).toBe(0);
  });
  it('restarts repeated reactions and attacks while retaining an uninterrupted attack under a hit overlay', () => {
    const c = new AnimationController(),
      hit = clip({ id: 'hit', state: 'hit', playback: 'once', fps: 30 });
    const first = actor({ pose: 'hit', reaction: { id: 'damage:1', startedAt: 0, endsAt: 8 } });
    expect(c.sample(first, hit, 4).frameIndex).toBe(4);
    expect(
      c.sample(
        actor({ pose: 'hit', reaction: { id: 'damage:2', startedAt: 5, endsAt: 13 } }),
        hit,
        5,
      ).frameIndex,
    ).toBe(0);
    const attack = clip({
      id: 'attack',
      state: 'attack',
      playback: 'combat',
      moveId: 'sword-slash',
      phases: { windup: [0, 3], active: [3, 5], recovery: [5, 8] },
    });
    const fighting = actor({
      pose: 'attack',
      action: {
        instanceId: 'attack:1',
        move: 'sword-slash',
        startedAt: 20,
        activeAt: 23,
        recoveryAt: 25,
        endsAt: 28,
      },
    });
    expect(new PoseResolver().resolve({ ...fighting, reaction: first.reaction }, true)).toBe(
      'attack',
    );
    expect(c.sample(fighting, attack, 24).frameIndex).toBe(4);
    const next = {
      ...fighting,
      action: {
        ...fighting.action!,
        instanceId: 'attack:2',
        startedAt: 30,
        activeAt: 33,
        recoveryAt: 35,
        endsAt: 38,
      },
    };
    expect(c.sample(next, attack, 30).frameIndex).toBe(0);
    expect(c.sample(next, attack, 33).instanceId).toBe('attack:2');
    const eat = clip({ id: 'eat', state: 'eat', playback: 'once', fps: 30 });
    const eating = actor({ pose: 'eat', activityInstanceId: 'meal:1' });
    c.sample(eating, eat, 40);
    expect(c.sample(eating, eat, 44).frameIndex).toBe(4);
    expect(c.sample({ ...eating, activityInstanceId: 'meal:2' }, eat, 45).frameIndex).toBe(0);
  });
  it('shares one body pose sample across layers without guessing missing authored frames', () => {
    const c = new AnimationController(),
      a = actor();
    c.frame(a, clip(), 0);
    const sample = c.sample({ ...a, x: 3.5 }, clip(), 10);
    expect(sample.frameIndex).toBe(4);
    expect(
      layerFrameId(
        clip({ id: 'coat', frameIds: Array.from({ length: 8 }, (_, i) => `coat_${i}`) }),
        sample,
      ),
    ).toBe('coat_4');
    expect(layerFrameId(clip({ id: 'short', frameIds: ['one'] }), sample)).toBeUndefined();
    expect(layerFrameId(clip({ facing: 'n' }), sample)).toBeUndefined();
  });
  it('preserves integer anchor/socket registration independently of trim or texture quality', () => {
    expect(layerRegistration(frame, { x: 24, y: 64 })).toEqual({
      x: 0,
      y: 0,
      trimmedX: 4,
      trimmedY: 10,
    });
    const weapon = { ...frame, anchorPx: { x: 5, y: 8 } };
    expect(layerRegistration(weapon, frame.sockets!.hand!)).toEqual({
      x: 35,
      y: 22,
      trimmedX: 39,
      trimmedY: 32,
    });
    expect(
      layerSockets({ ...weapon, sockets: { muzzle: { x: 10, y: 2 } } }, frame.sockets!.hand!),
    ).toEqual({ muzzle: { x: 45, y: 24 } });
    expect(
      compositeBounds({ w: 48, h: 64 }, [{ frame: weapon, target: frame.sockets!.hand! }]),
    ).toEqual({ x: 0, y: 0, w: 79, h: 82 });
    expect(socketWorld(frame, frame.sockets!.hand!, { x: 100, y: 200 })).toEqual({
      x: 116,
      y: 166,
    });
    const untrimmed: AssetFrame = { ...frame, trim: { x: 0, y: 0, w: 48, h: 64 } };
    expect(
      socketWorld(untrimmed, frame.sockets!.hand!, {
        x: 100,
        y: 200,
      }),
    ).toEqual({ x: 116, y: 166 });
  });
  it('keeps pinned composites alive and refuses allocations that exceed the hard budget', () => {
    const destroyed: string[] = [],
      cache = new BoundedCompositeCache<string>(100, (v) => destroyed.push(v));
    const one = cache.acquire('one', 60, () => 'one')!;
    expect(
      cache.acquire('two', 60, () => {
        throw new Error('must not allocate');
      }),
    ).toBeUndefined();
    const shared = cache.acquire('one', 60, () => 'wrong')!;
    one.release();
    expect(cache.stats.bytes).toBe(60);
    expect(cache.stats.pinned).toBe(1);
    shared.release();
    const two = cache.acquire('two', 60, () => 'two')!;
    expect(destroyed).toEqual(['one']);
    expect(two.value).toBe('two');
    expect(() => cache.configure(20)).toThrow(/Release visible/);
    two.release();
    cache.configure(20);
    expect(cache.stats.bytes).toBe(0);
    expect(cache.acquire('huge', 21, () => 'huge')).toBeUndefined();
  });
  it('shares matching appearances while equipment and committed appearance revisions invalidate composites', () => {
    const a = actor({
      equipment: { outfit: 'river-tunic' },
      held: ['bow', null],
      appearanceRevision: 2,
    });
    const key = compositeKey(a, 'recipe', ['body_0', 'bow_0'], 1);
    expect(compositeKey({ ...a, id: 999 }, 'recipe', ['body_0', 'bow_0'], 1)).toBe(key);
    expect(
      compositeKey({ ...a, appearanceRevision: 3 }, 'recipe', ['body_0', 'bow_0'], 1),
    ).not.toBe(key);
    expect(
      compositeKey({ ...a, held: ['berries', null] }, 'recipe', ['body_0', 'bow_0'], 1),
    ).not.toBe(key);
  });
  it('selects authored held layers by canonical item rather than drawing an inventory icon as a weapon', () => {
    const bodyClip = clip({ id: 'body', appearanceId: 'layer:body' }),
      bowClip = clip({ id: 'bow', appearanceId: 'layer:bow' });
    const catalog: AssetCatalog = {
      schemaVersion: 2,
      contentVersion: 'fixture',
      pages: [],
      frames: [],
      portraits: [],
      clips: [bodyClip, bowClip],
      appearances: [
        {
          id: 'origin:aqualia',
          kind: 'origin',
          contentId: 'aqualia',
          quality: 'prototype',
          clipIds: [],
          recipeId: 'person',
        },
        {
          id: 'layer:body',
          kind: 'layer',
          contentId: 'body',
          quality: 'prototype',
          clipIds: ['body'],
        },
        {
          id: 'layer:bow',
          kind: 'layer',
          contentId: 'bow-layer',
          quality: 'prototype',
          clipIds: ['bow'],
        },
      ],
      rigs: [
        { id: 'human', canvas: { w: 48, h: 64 }, anchorPx: { x: 24, y: 64 }, socketIds: ['hand'] },
      ],
      layerSets: [
        {
          id: 'base',
          rigId: 'human',
          buildProfileIds: ['adult'],
          slot: 'body',
          appearanceId: 'layer:body',
        },
        {
          id: 'weapon',
          rigId: 'human',
          buildProfileIds: ['adult'],
          slot: 'held',
          appearanceId: 'layer:bow',
        },
      ],
      recipes: [
        {
          id: 'person',
          rigId: 'human',
          buildProfileId: 'adult',
          layers: [
            { layerSetId: 'base', z: 0, required: true },
            {
              layerSetId: 'weapon',
              z: 1,
              required: false,
              heldSlot: 0,
              itemId: 'bow',
              socketId: 'hand',
            },
          ],
        },
      ],
    };
    const resolver = new AppearanceResolver(catalog),
      appearance = resolver.resolve('origin', 'aqualia')!;
    expect(
      selectModularLayers(
        catalog,
        resolver,
        actor({ held: ['berries', null] }),
        appearance,
        'walk',
        'e',
      )?.layers.map((l) => l.layerSet.id),
    ).toEqual(['base']);
    expect(
      selectModularLayers(
        catalog,
        resolver,
        actor({ held: ['bow', null] }),
        appearance,
        'walk',
        'e',
      )?.layers.map((l) => l.layerSet.id),
    ).toEqual(['base', 'weapon']);
    expect(
      selectModularLayers(catalog, resolver, actor({ rigId: 'other' }), appearance, 'walk', 'e'),
    ).toBeUndefined();
  });
  it('bounds seeded emissions, deduplicates repeated cues and preserves essential effects in reduced settings', () => {
    const a = new EffectDirector(16),
      b = new EffectDirector(16);
    const emission = {
      id: 'hit:1',
      sceneId: 'overworld',
      kind: 'hit' as const,
      tick: 10,
      seed: effectSeed('hit:1'),
      origin: { x: 30, y: 40 },
      count: 100,
    };
    for (const director of [a, b]) {
      director.emit(emission);
      director.emit(emission);
    }
    expect(a.sample('overworld', 12, false, false)).toEqual(
      b.sample('overworld', 12, false, false),
    );
    expect(a.sample('overworld', 12, false, false)).toHaveLength(16);
    expect(a.sample('overworld', 12, true, true)).toEqual([]);
    const essential = new EffectDirector();
    essential.emit({ ...emission, essential: true, count: 1 });
    expect(essential.sample('overworld', 12, true, true)).toHaveLength(1);
    expect(essential.sample('inside', 12, false, false)).toEqual([]);
    expect(essential.sample('overworld', 50, false, false)).toEqual([]);
  });
  it('filters scenes and projectiles while centering finite rooms without changing world coordinates', () => {
    expect(actorInScene(actor(), 'overworld')).toBe(true);
    expect(actorInScene(actor({ sceneId: 'building:1' }), 'overworld')).toBe(false);
    expect(
      sceneCamera({ x: 999, y: 999 }, { width: 10, height: 8 }, 64, { width: 1920, height: 1080 }),
    ).toEqual({ x: -640, y: -284 });
    expect(
      sceneCamera({ x: -20, y: 9999 }, { width: 40, height: 40 }, 64, {
        width: 1920,
        height: 1080,
      }),
    ).toEqual({ x: 0, y: 1480 });
    const arrow = {
      id: 1,
      sceneId: 'building:1',
      x: 3,
      y: 4,
      facingX: 1,
      facingY: 0,
      kind: 'arrow' as const,
    };
    expect(visibleProjectiles([arrow], 'building:1')).toEqual([arrow]);
    expect(visibleProjectiles([arrow], 'overworld')).toEqual([]);
  });
});
