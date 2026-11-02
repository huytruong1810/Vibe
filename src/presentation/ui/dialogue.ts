import { DialogueEmotionSchema, type DialogueEmotion } from '../../domain/dialogue';

/** Player/system lines and a pending request do not reset the last spoken NPC expression. */
export function latestNpcEmotion(
  lines: readonly {
    readonly speaker: 'player' | 'npc' | 'system';
    readonly emotion?: DialogueEmotion;
  }[],
): DialogueEmotion {
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index]!;
    if (line.speaker !== 'npc') continue;
    const emotion = DialogueEmotionSchema.safeParse(line.emotion);
    return emotion.success ? emotion.data : 'neutral';
  }
  return 'neutral';
}
