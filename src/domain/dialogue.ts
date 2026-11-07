import { z } from 'zod';

/** Shared dialogue/portrait vocabulary. Emotions describe presentation, never tactical behavior. */
export const DIALOGUE_EMOTIONS = [
  'neutral',
  'warm',
  'thoughtful',
  'curious',
  'concerned',
  'amused',
  'angry',
  'sad',
  'fearful',
] as const;
export const DialogueEmotionSchema = z.enum(DIALOGUE_EMOTIONS);
export type DialogueEmotion = z.infer<typeof DialogueEmotionSchema>;
