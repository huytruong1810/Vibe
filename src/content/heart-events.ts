import { NPC_PROFILES } from './definitions';
import type { DialogueEmotion } from '../domain/dialogue';

export interface HeartEventBeat {
  readonly speaker: 'npc' | 'player';
  readonly text: string;
  readonly emotion: DialogueEmotion;
}

export interface HeartEventSkeleton {
  readonly id: string;
  readonly npcId: string;
  readonly hearts: 2 | 4 | 6 | 8 | 10;
  readonly title: string;
  readonly location: string;
  readonly preferredPhase?: 'morning' | 'midday' | 'dusk' | 'night';
  readonly promptSummary: string;
  readonly beats: readonly HeartEventBeat[];
  readonly outcome?: {
    readonly recipe?: string;
    readonly item?: string;
    readonly affinityBonus?: number;
  };
}

export const HEART_EVENT_SKELETONS: readonly HeartEventSkeleton[] = [
  // Caelum
  {
    id: 'heart:caelum:2',
    npcId: 'npc:caelum',
    hearts: 2,
    title: 'Canal Currents',
    location: 'Aqualia Canal Bridge',
    preferredPhase: 'midday',
    promptSummary: 'Caelum pauses on the bridge watching the water flow toward the estuary.',
    beats: [
      {
        speaker: 'npc',
        text: 'The water here comes all the way from the mist highlands. Look closely at the eddies.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'player',
        text: 'It moves quickly past the stone pillars.',
        emotion: 'neutral',
      },
      {
        speaker: 'npc',
        text: 'Indeed. A village built on water must learn to respect the current rather than fight it.',
        emotion: 'warm',
      },
    ],
    outcome: { affinityBonus: 4 },
  },
  {
    id: 'heart:caelum:4',
    npcId: 'npc:caelum',
    hearts: 4,
    title: 'Warden’s Vigil',
    location: 'Aqualia Water Gauge Tower',
    preferredPhase: 'dusk',
    promptSummary: 'Caelum examines seasonal water level marks carved into the stone tower.',
    beats: [
      {
        speaker: 'npc',
        text: 'The river is rising steadily this season. When the floods come, the whole delta breathes.',
        emotion: 'concerned',
      },
      {
        speaker: 'player',
        text: 'You watch over this delta every day.',
        emotion: 'warm',
      },
      {
        speaker: 'npc',
        text: 'It is good to have someone beside me who notices the quiet work.',
        emotion: 'warm',
      },
    ],
    outcome: { item: 'water', affinityBonus: 6 },
  },

  // Marina
  {
    id: 'heart:marina:2',
    npcId: 'npc:marina',
    hearts: 2,
    title: 'Reed Weaving',
    location: 'Aqualia Boardwalk',
    preferredPhase: 'midday',
    promptSummary: 'Marina splits marsh reeds into supple strips for fishing baskets.',
    beats: [
      {
        speaker: 'npc',
        text: 'If you pull too quickly, the fiber frays. You must follow the grain gently.',
        emotion: 'amused',
      },
      {
        speaker: 'npc',
        text: 'Here, take a handful of reeds and try it yourself.',
        emotion: 'warm',
      },
    ],
    outcome: { item: 'fiber', affinityBonus: 4 },
  },
  {
    id: 'heart:marina:4',
    npcId: 'npc:marina',
    hearts: 4,
    title: 'Ferry Songs',
    location: 'Aqualia Ferry Landing',
    preferredPhase: 'dusk',
    promptSummary: 'Marina ties up the ferry as the sun sets over the estuary.',
    beats: [
      {
        speaker: 'npc',
        text: 'Long ago, ferrymen sang across the water to keep from losing their way in the fog.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'player',
        text: 'Do you still know the songs?',
        emotion: 'warm',
      },
      {
        speaker: 'npc',
        text: 'A few. Next time you cross the river at dusk, listen closely to the wind.',
        emotion: 'amused',
      },
    ],
    outcome: { affinityBonus: 6 },
  },

  // Neris
  {
    id: 'heart:neris:2',
    npcId: 'npc:neris',
    hearts: 2,
    title: 'Fisher’s Patience',
    location: 'Aqualia Docks',
    preferredPhase: 'morning',
    promptSummary: 'Neris mends a cast net at dawn while checking the tide.',
    beats: [
      {
        speaker: 'npc',
        text: 'The morning tide brings the best fish, but only if your knots hold fast.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'A sturdy net means food for everyone on the boardwalks tonight.',
        emotion: 'warm',
      },
    ],
    outcome: { affinityBonus: 4 },
  },
  {
    id: 'heart:neris:4',
    npcId: 'npc:neris',
    hearts: 4,
    title: 'Estuary Secrets',
    location: 'Aqualia Shallow Waters',
    preferredPhase: 'dusk',
    promptSummary: 'Neris points out schools of silverfish flashing beneath the surface.',
    beats: [
      {
        speaker: 'npc',
        text: 'Watch where the current swirls. The fish gather where the water cools.',
        emotion: 'amused',
      },
      {
        speaker: 'npc',
        text: 'You have a good eye for the water, traveler. Not many outsiders do.',
        emotion: 'warm',
      },
    ],
    outcome: { affinityBonus: 6 },
  },

  // Reed
  {
    id: 'heart:reed:2',
    npcId: 'npc:reed',
    hearts: 2,
    title: 'Canal Sprouts',
    location: 'Aqualia Raised Beds',
    preferredPhase: 'morning',
    promptSummary: 'Reed inspects damp soil beds for young river shoots.',
    beats: [
      {
        speaker: 'npc',
        text: 'River silt makes the richest earth. These shoots will be tall by midsummer.',
        emotion: 'warm',
      },
      {
        speaker: 'npc',
        text: 'Patience and clean water—that is all a plant asks of you.',
        emotion: 'thoughtful',
      },
    ],
    outcome: { item: 'wheat', affinityBonus: 4 },
  },
  {
    id: 'heart:reed:4',
    npcId: 'npc:reed',
    hearts: 4,
    title: 'Waterwheel Grain',
    location: 'Aqualia Mill',
    preferredPhase: 'midday',
    promptSummary: 'Reed listens to the rhythm of the wooden mill grinding wheat into meal.',
    beats: [
      {
        speaker: 'npc',
        text: 'The waterwheel has turned since before I was born. A steady pulse for the whole town.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'Take this meal. Fresh bread tastes best when shared with good company.',
        emotion: 'warm',
      },
    ],
    outcome: { item: 'meal', affinityBonus: 6 },
  },

  // Willa
  {
    id: 'heart:willa:2',
    npcId: 'npc:willa',
    hearts: 2,
    title: 'Herbal Poultice',
    location: 'Willa’s Apothecary Stilt Hut',
    preferredPhase: 'morning',
    promptSummary: 'Willa grinds dried river herbs in a stone mortar.',
    beats: [
      {
        speaker: 'npc',
        text: 'River mint cools burns, and marsh fern eases aching joints. Nature provides if you know where to look.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'Always handle the roots with care—their medicine lives in the bark.',
        emotion: 'warm',
      },
    ],
    outcome: { item: 'poultice', affinityBonus: 4 },
  },
  {
    id: 'heart:willa:4',
    npcId: 'npc:willa',
    hearts: 4,
    title: 'Luminous Spores',
    location: 'Wetland Fungi Grove',
    preferredPhase: 'night',
    promptSummary: 'Willa guides you to a ring of glowing nocturnal mushrooms.',
    beats: [
      {
        speaker: 'npc',
        text: 'Step softly. The spores only glow when undisturbed in the cool night air.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'Few travelers take time to see how the marsh wakes when the sun goes down.',
        emotion: 'warm',
      },
    ],
    outcome: { item: 'fungi', affinityBonus: 6 },
  },

  // Oren
  {
    id: 'heart:oren:2',
    npcId: 'npc:oren',
    hearts: 2,
    title: 'Timber & Tenon',
    location: 'Aqualia Workshop',
    preferredPhase: 'midday',
    promptSummary: 'Oren squares cedar planks with a drawknife.',
    beats: [
      {
        speaker: 'npc',
        text: 'Water rots soft wood in a month. You need heart-wood cedar if you want a dock to stand.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'Hold the rasp steady. Let the tool do the work.',
        emotion: 'amused',
      },
    ],
    outcome: { item: 'stick', affinityBonus: 4 },
  },

  // Mira
  {
    id: 'heart:mira:2',
    npcId: 'npc:mira',
    hearts: 2,
    title: 'Berry Gathering',
    location: 'Delta Thicket',
    preferredPhase: 'midday',
    promptSummary: 'Mira gathers wild berries along the water edge.',
    beats: [
      {
        speaker: 'npc',
        text: 'The sweet berries grow right where the sun hits the water reflections.',
        emotion: 'amused',
      },
      {
        speaker: 'npc',
        text: 'Here, try this bunch! They are tart, but they give you energy for exploring.',
        emotion: 'warm',
      },
    ],
    outcome: { item: 'berries', affinityBonus: 4 },
  },

  // Lark
  {
    id: 'heart:lark:2',
    npcId: 'npc:lark',
    hearts: 2,
    title: 'Color of River Water',
    location: 'Lark’s Easel Studio',
    preferredPhase: 'dusk',
    promptSummary: 'Lark mixes pigment to match the evening sky reflected in the canals.',
    beats: [
      {
        speaker: 'npc',
        text: 'People think river water is just blue. But at dusk, it turns violet and amber.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'A painter must see what is actually there, not just what they expect.',
        emotion: 'warm',
      },
    ],
    outcome: { affinityBonus: 4 },
  },

  // Dara
  {
    id: 'heart:dara:2',
    npcId: 'npc:dara',
    hearts: 2,
    title: 'Campfire Tales',
    location: 'Aqualia Waystone',
    preferredPhase: 'night',
    promptSummary: 'Dara shares stories of travels across the provinces.',
    beats: [
      {
        speaker: 'npc',
        text: 'Every outpost has a different smell. Pyrador smells of charcoal, Zephyria of pines, and Aqualia of clean reeds.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'It is comforting to return to familiar paths after a long journey.',
        emotion: 'warm',
      },
    ],
    outcome: { affinityBonus: 4 },
  },

  // Finn
  {
    id: 'heart:finn:2',
    npcId: 'npc:finn',
    hearts: 2,
    title: 'Stalwart Flint',
    location: 'Aqualia Forge Post',
    preferredPhase: 'midday',
    promptSummary: 'Finn sharpens tools with a whetstone.',
    beats: [
      {
        speaker: 'npc',
        text: 'A sharp tool is a safe tool. A dull blade slips and ruins your work.',
        emotion: 'thoughtful',
      },
      {
        speaker: 'npc',
        text: 'Keep your flint dry and it will never fail you.',
        emotion: 'warm',
      },
    ],
    outcome: { item: 'flint', affinityBonus: 4 },
  },
];

export function validateHeartEventSkeleton(skeleton: HeartEventSkeleton): boolean {
  if (!skeleton.id || typeof skeleton.id !== 'string') return false;
  if (!NPC_PROFILES.some((p) => p.id === skeleton.npcId)) return false;
  if (![2, 4, 6, 8, 10].includes(skeleton.hearts)) return false;
  if (!skeleton.title || !skeleton.location) return false;
  if (!Array.isArray(skeleton.beats) || skeleton.beats.length < 2) return false;

  const validEmotions: DialogueEmotion[] = [
    'neutral',
    'warm',
    'thoughtful',
    'curious',
    'concerned',
    'amused',
    'angry',
    'sad',
    'fearful',
  ];

  for (const beat of skeleton.beats) {
    if (beat.speaker !== 'npc' && beat.speaker !== 'player') return false;
    if (!beat.text || typeof beat.text !== 'string') return false;
    if (!validEmotions.includes(beat.emotion)) return false;
  }

  return true;
}

export function getEligibleHeartEvents(
  npcId: string,
  currentHearts: number,
): readonly HeartEventSkeleton[] {
  return HEART_EVENT_SKELETONS.filter((e) => e.npcId === npcId && e.hearts <= currentHearts);
}
