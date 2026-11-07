import { describe, expect, it, vi } from 'vitest';
import { DialogueResponseSchema } from '../src/domain/agents';
import { DIALOGUE_EMOTIONS, DialogueEmotionSchema } from '../src/domain/dialogue';
import type { NpcId } from '../src/domain/values';
import { latestNpcEmotion } from '../src/presentation/ui/dialogue';
import {
  nearestInteraction,
  PortalEntryController,
  type InteractionFrame,
} from '../src/presentation/ui/interaction';
import { commandForIntent } from '../src/presentation/ui/state';

const context = (): InteractionFrame => ({
  session: 'world:one',
  player: { x: 5, y: 5 },
  scene: {
    id: 'overworld',
    props: [],
    portals: [
      {
        id: 'door:home',
        targetSceneId: 'home:caelum',
        name: 'Enter Caelum’s home',
        x: 6,
        y: 5,
        allowed: true,
        assetContentIds: ['floor-wood', 'door-open'],
      },
    ],
  },
  npcs: [{ entityId: 11, profileId: 'npc:caelum' as NpcId, x: 7.5, y: 5 }],
});
function deferred(): { promise: Promise<void>; resolve(): void; reject(error: Error): void } {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  return {
    promise: new Promise<void>((a, b) => {
      resolve = a;
      reject = b;
    }),
    resolve: () => resolve(),
    reject: (error) => reject(error),
  };
}

describe('dialogue emotion presentation', () => {
  it('shares all nine validated values with structured dialogue responses', () => {
    expect(DIALOGUE_EMOTIONS).toHaveLength(9);
    for (const emotion of DIALOGUE_EMOTIONS) {
      expect(DialogueEmotionSchema.parse(emotion)).toBe(emotion);
      expect(
        DialogueResponseSchema.parse({
          dialogue: 'A spoken response.',
          emotion,
          action: { type: 'NONE' },
        }).emotion,
      ).toBe(emotion);
    }
    expect(DialogueEmotionSchema.safeParse('invented-emotion').success).toBe(false);
  });
  it('keeps the last NPC expression during player/system lines and pending replies', () => {
    expect(
      latestNpcEmotion([
        { speaker: 'npc', emotion: 'angry' },
        { speaker: 'player' },
        { speaker: 'system' },
      ]),
    ).toBe('angry');
    expect(
      latestNpcEmotion([
        { speaker: 'npc', emotion: 'angry' },
        { speaker: 'npc', emotion: 'warm' },
        { speaker: 'player' },
      ]),
    ).toBe('warm');
  });
  it('uses neutral for an initial or migrated NPC line without emotion', () => {
    expect(latestNpcEmotion([])).toBe('neutral');
    expect(latestNpcEmotion([{ speaker: 'npc', emotion: 'angry' }, { speaker: 'npc' }])).toBe(
      'neutral',
    );
  });
});

describe('shared interaction target', () => {
  it('selects only nearby interactive furniture and resolves ties independently of prop order', () => {
    const frame = context();
    const props = [
      { id: 'table:z', contentId: 'furniture_table', x: 5.4, y: 5, interaction: 'work' as const },
      { id: 'basin:a', contentId: 'furniture_basin', x: 5.4, y: 5, interaction: 'wash' as const },
      { id: 'decoration', contentId: 'vase', x: 5, y: 5 },
    ];
    expect(nearestInteraction({ ...frame, scene: { ...frame.scene, props } })).toMatchObject({
      kind: 'furniture',
      prop: { id: 'basin:a', interaction: 'wash' },
    });
    expect(
      nearestInteraction({ ...frame, scene: { ...frame.scene, props: [...props].reverse() } }),
    ).toMatchObject({ kind: 'furniture', prop: { id: 'basin:a' } });
    expect(
      nearestInteraction({ ...frame, scene: { ...frame.scene, props: [{ ...props[0]!, x: 7 }] } })
        .kind,
    ).toBe('portal');
    expect(
      nearestInteraction({ ...frame, scene: { ...frame.scene, props: [{ ...props[0]!, x: 6 }] } })
        .kind,
    ).toBe('portal');
    expect(
      nearestInteraction({
        ...frame,
        npcs: [{ ...frame.npcs[0]!, x: 5.1 }],
        scene: { ...frame.scene, props },
      }).kind,
    ).toBe('npc');
  });
  it('selects an eligible nearby portal only when it is the closest interaction', () => {
    const frame = context();
    expect(nearestInteraction(frame).kind).toBe('portal');
    expect(nearestInteraction({ ...frame, npcs: [{ ...frame.npcs[0]!, x: 5.2 }] }).kind).toBe(
      'npc',
    );
    expect(
      nearestInteraction({
        ...frame,
        scene: { ...frame.scene, portals: [{ ...frame.scene.portals[0]!, allowed: false }] },
      }).kind,
    ).toBe('npc');
    expect(nearestInteraction({ ...frame, player: { x: 30, y: 30 } }).kind).toBe('gather');
    expect(
      nearestInteraction({
        ...frame,
        npcs: [],
        scene: {
          ...frame.scene,
          portals: [{ ...frame.scene.portals[0]!, allowed: false, reason: 'Invitation required' }],
        },
      }),
    ).toMatchObject({ kind: 'portal', portal: { allowed: false, reason: 'Invitation required' } });
  });
});

describe('portal loading boundary', () => {
  it('preloads once, leaves gameplay running, and submits a revisioned command after revalidation', async () => {
    let frame = context();
    const gate = deferred();
    const prepare = vi.fn(() => gate.promise);
    const submit = vi.fn(async () => ({ id: 'cmd:1', ok: true, message: 'Entered.' }));
    const controller = new PortalEntryController(() => frame, prepare, submit);
    const first = controller.enter('door:home');
    expect(await controller.enter('door:home')).toBe('pending');
    expect(submit).not.toHaveBeenCalled();
    expect(prepare).toHaveBeenCalledWith(['floor-wood', 'door-open']);
    frame = { ...frame, player: { x: 5.5, y: 5 } };
    gate.resolve();
    expect(await first).toBe('entered');
    expect(submit).toHaveBeenCalledExactlyOnceWith({
      type: 'enterPortal',
      portalId: 'door:home',
      expectedScene: 'overworld',
    });
  });
  it.each(['session', 'scene', 'range', 'permission', 'target'] as const)(
    'discards stale %s state after asynchronous loading',
    async (change) => {
      let frame = context();
      const gate = deferred();
      const submit = vi.fn(async () => ({ id: 'cmd:1', ok: true, message: 'Entered.' }));
      const controller = new PortalEntryController(
        () => frame,
        () => gate.promise,
        submit,
      );
      const attempt = controller.enter('door:home');
      if (change === 'session') frame = { ...frame, session: 'world:restored' };
      else if (change === 'scene')
        frame = { ...frame, scene: { ...frame.scene, id: 'different-room' } };
      else if (change === 'range') frame = { ...frame, player: { x: 40, y: 40 } };
      else
        frame = {
          ...frame,
          scene: {
            ...frame.scene,
            portals: [
              {
                ...frame.scene.portals[0]!,
                ...(change === 'permission'
                  ? { allowed: false }
                  : { targetSceneId: 'changed-room' }),
              },
            ],
          },
        };
      gate.resolve();
      expect(await attempt).toBe('stale');
      expect(submit).not.toHaveBeenCalled();
    },
  );
  it('reports load failure, permits retry, and ignores completion after disposal', async () => {
    const prepare = vi
      .fn()
      .mockRejectedValueOnce(new Error('texture unavailable'))
      .mockResolvedValue(undefined);
    const submit = vi.fn(async () => ({ id: 'cmd:1', ok: false, message: 'Permission changed.' }));
    const controller = new PortalEntryController(context, prepare, submit);
    await expect(controller.enter('door:home')).rejects.toThrow('texture unavailable');
    expect(await controller.enter('door:home')).toBe('unavailable');
    const gate = deferred();
    const disposed = new PortalEntryController(context, () => gate.promise, submit);
    const pending = disposed.enter('door:home');
    disposed.dispose();
    gate.resolve();
    expect(await pending).toBe('stale');
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

it('translates equipment UI intentions into explicit carried/worn/drop commands', () => {
  expect(commandForIntent({ type: 'equip', slot: 1 })).toEqual({ type: 'equip', slot: 1 });
  expect(commandForIntent({ type: 'unequip', slot: 'torso' })).toEqual({
    type: 'unequip',
    slot: 'torso',
  });
  expect(commandForIntent({ type: 'unequip', slot: 'back', drop: true })).toEqual({
    type: 'unequip',
    slot: 'back',
    drop: true,
  });
});
