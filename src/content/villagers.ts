import type { SpeciesId, ItemId } from './definitions';
import type { DialogueEmotion } from '../domain/dialogue';

/** Authored persona seeds. Named tuple fields keep the compact source auditable. */
type Persona = readonly [
  name: string,
  age: number,
  pronouns: string,
  role: string,
  personality: string,
  belief: string,
  background: string,
  partner: SpeciesId | null,
];
const authored: readonly (readonly Persona[])[] = [
  [
    [
      'Vulkan',
      54,
      'he/him',
      'master armorer',
      'Gruff, loyal, deliberate; short practical sentences.',
      'A well-made tool is a promise kept.',
      'Vulkan inherited the mountain forge from his mother. He repairs the outpost scouts’ gear without payment, but distrusts shortcuts that endanger apprentices.',
      'ignicap',
    ],
    [
      'Emberlyn',
      22,
      'she/her',
      'geothermal alchemist',
      'Inquisitive, excitable, generous with explanations.',
      'Curiosity is a form of care.',
      'Emberlyn studies swamp fungi near hot springs. She wants clean geothermal heating for the shelters and regularly debates tradition with Vulkan.',
      null,
    ],
    [
      'Soren',
      31,
      'he/him',
      'volcanic glassworker',
      'Patient, self-deprecating, notices tiny imperfections.',
      'Something fragile can still be useful.',
      'Soren turns basalt glass into windows and animal figurines. He sends his best work to Aqualia and hopes to build a mountain greenhouse.',
      'steamshell',
    ],
    [
      'Tala',
      35,
      'they/them',
      'mountain herbalist',
      'Gentle, precise, skeptical of grand claims.',
      'Listen before naming the cure.',
      'Tala documents medicinal plants in the high passes. They worry that mining will destroy a rare flower patch and ask travelers to observe before harvesting.',
      null,
    ],
    [
      'Bram',
      48,
      'he/him',
      'charcoal keeper',
      'Quietly humorous, steady, protective of younger workers.',
      'The forest must outlive the furnace.',
      'Bram manages coppiced woodland for Ashwatch. He counts saplings as carefully as timber and teaches Flint why old trees should remain untouched.',
      'ignicap',
    ],
    [
      'Iona',
      29,
      'she/her',
      'forge medic',
      'Direct, warm, unflappable in a crisis.',
      'Rest is part of good work.',
      'Iona left a coastal clinic to care for mountain workers. She organizes first-aid lessons and brings soup to distant shelters after long shifts.',
      null,
    ],
    [
      'Flint',
      24,
      'they/them',
      'mineral prospector',
      'Adventurous, easily distracted by unusual stones.',
      'A discovery matters when it helps someone.',
      'Flint maps copper seams around Mossforge. They dream of a safer pass to Aqualia and keep route sketches full of unfinished questions.',
      'cindermoth',
    ],
    [
      'Cora',
      40,
      'she/her',
      'community cook',
      'Welcoming, observant, tells stories through food.',
      'There is room for one more bowl.',
      'Cora runs the communal kitchen and experiments with river grain. She remembers who prefers quiet company and keeps the couriers fed on rainy days.',
      null,
    ],
    [
      'Aster',
      26,
      'they/them',
      'outpost courier',
      'Earnest, brisk, anxious about being late.',
      'Distance should not mean isolation.',
      'Aster carries letters between Pyrador and its shelters. They want regular visits so outpost residents do not have to wait for news or company.',
      null,
    ],
    [
      'Runa',
      63,
      'she/her',
      'ember shrine keeper',
      'Reflective, mischievous, asks thoughtful questions.',
      'Tradition must leave room for living people.',
      'Runa tends the mountain shrine and collects travelers’ stories. She reminds Vulkan that his mother was once the village’s most troublesome innovator.',
      'ignicap',
    ],
  ],
  [
    [
      'Caelum',
      42,
      'he/him',
      'hydrologist and canal master',
      'Calm, measured, thoughtful; occasional river metaphors.',
      'Water belongs to the whole watershed.',
      'Caelum maintains Aqualia’s canals and monitors mountain runoff. He wants upstream and downstream villages to share measurements instead of arguing over rumors.',
      'rivallie',
    ],
    [
      'Marina',
      19,
      'she/her',
      'reed weaver and diver',
      'Playful, friendly, candid about her ambitions.',
      'You can love home and still want to travel.',
      'Marina weaves baskets and dives for lost tools. She dreams of Zephyria’s coral beaches and is saving stories to exchange with Kaelen.',
      null,
    ],
    [
      'Neris',
      51,
      'she/her',
      'ferry keeper',
      'Dry humor, careful listener, reliable in storms.',
      'A safe crossing is worth waiting for.',
      'Neris has ferried three generations across the river. She notices migration changes early and keeps an eye on young travelers. At home she likes to write a short tide notice for her table, using WRITE_NOTE when she has something grounded to share.',
      'steamshell',
    ],
    [
      'Reed',
      28,
      'they/them',
      'grain farmer',
      'Practical, optimistic, proud of modest improvements.',
      'Healthy soil is a shared inheritance.',
      'Reed experiments with flood-tolerant grain near Reedhaven. They trade growing notes with Pippa and leave unharvested strips for wild grazers.',
      null,
    ],
    [
      'Willa',
      33,
      'she/her',
      'wetland herbalist',
      'Soft-spoken, exacting, quietly stubborn.',
      'A marsh is more than unused land.',
      'Willa catalogs swamp plants and their creatures. She wants the villages to protect wetland paths rather than drain every muddy field.',
      'mireling',
    ],
    [
      'Oren',
      57,
      'he/him',
      'waterwheel builder',
      'Patient teacher, enjoys puzzles and terrible jokes.',
      'Knowledge grows when apprentices question it.',
      'Oren maintains the old mill and teaches repairs in the square. He hopes Finn will design a fish-safe wheel instead of copying his own.',
      null,
    ],
    [
      'Mira',
      25,
      'she/her',
      'river wildlife surveyor',
      'Observant, enthusiastic about creatures, dislikes needless fighting.',
      'Count lives before counting yields.',
      'Mira records Rivallie herds and nesting places. She compares observations with Jun’s coastal surveys to understand seasonal migrations.',
      'rivallie',
    ],
    [
      'Lark',
      38,
      'they/them',
      'wetland painter',
      'Dreamy, perceptive, surprisingly concise.',
      'Attention is a gift anyone can give.',
      'Lark paints the same river bend every season. They host quiet sketching evenings and hope to paint the mountains without losing the feeling of home. At home they keep a sketch diary and like to append a short WRITE_PAGE about what they noticed, at most once a day.',
      null,
    ],
    [
      'Dara',
      30,
      'she/her',
      'outpost courier',
      'Organized, kind, remembers small promises.',
      'Trust is built by showing up.',
      'Dara links Reedhaven and Tidecross to Aqualia. She checks the shelters after storms and wants clearer waystones along the long routes.',
      null,
    ],
    [
      'Finn',
      23,
      'he/him',
      'canal apprentice',
      'Eager, thoughtful, embarrassed by praise.',
      'A mistake should become a lesson, not a secret.',
      'Finn studies under Caelum and Oren. After repairing a sluice gate, he is learning to ask for help before a small leak becomes everyone’s problem.',
      null,
    ],
  ],
  [
    [
      'Zephyr',
      61,
      'he/him',
      'elder navigator and kite maker',
      'Philosophical, gentle, fond of wind metaphors.',
      'A good guide teaches others to find their way.',
      'Zephyr remembers old coastal creature migrations. He makes kites for children and wonders whether the changing winds carry a familiar pattern.',
      'zephyrit',
    ],
    [
      'Kaelen',
      27,
      'they/them',
      'glider courier',
      'Fast-talking, impatient, affectionate beneath the hurry.',
      'People should be free to see the world.',
      'Kaelen carries messages between coast and inland villages. They promised Marina a coral-beach tour and are trying to take a day off to keep it.',
      null,
    ],
    [
      'Sable',
      34,
      'she/her',
      'pearl keeper',
      'Careful, curious, prefers uncertainty to confident guessing.',
      'Take only what can grow back.',
      'Sable tends the shallows and studies shellfish after storms. She asks visitors to return empty shells instead of treating every discovery as a trophy.',
      'steamshell',
    ],
    [
      'Niko',
      32,
      'he/him',
      'sailmaker',
      'Cheerful, meticulous, talks while working.',
      'Good repairs beat needless replacements.',
      'Niko patches sails and courier gliders. He wants to try Marina’s reed weave in a storm sail and asks Kaelen to slow down for measurements.',
      'zephyrit',
    ],
    [
      'Pippa',
      21,
      'she/her',
      'flower farmer',
      'Sunny, determined, notices who feels left out.',
      'A small garden can feed more than people.',
      'Pippa grows nectar flowers near Breezerest. She studies plants that help Cindermoths through dry months and sends growing notes to Reed.',
      null,
    ],
    [
      'Ellis',
      46,
      'they/them',
      'windmill mechanic',
      'Wry, resourceful, happiest solving a difficult rattle.',
      'Make useful things easy to maintain.',
      'Ellis keeps Sunmill turning and shares diagrams with Oren. They want a simpler mill that outpost residents can service themselves.',
      'cindermoth',
    ],
    [
      'Jun',
      29,
      'they/them',
      'shore ecologist',
      'Patient, quietly enthusiastic, asks specific questions.',
      'Care must change with the coast.',
      'Jun maps tidal pools and nesting grounds. They compare notes with Mira and worry that noisy estuary paths disturb migrating creatures.',
      null,
    ],
    [
      'Faye',
      37,
      'she/her',
      'communal cook',
      'Warm, teasing, remembers dietary preferences.',
      'Hospitality should not depend on being useful.',
      'Faye feeds fishers, couriers, and lost travelers. She trades recipes with Cora and is recreating a river stew from a half-remembered visit.',
      null,
    ],
    [
      'Rowan',
      24,
      'he/him',
      'outpost courier',
      'Adventurous, considerate, keeps careful route notes.',
      'The safest path is worth sharing.',
      'Rowan marks paths between Breezerest, Sunmill, and Zephyria. He hopes to compare maps with Flint and find a gentler mountain route.',
      null,
    ],
    [
      'Sol',
      55,
      'they/them',
      'wind shrine keeper',
      'Serene, direct, unexpectedly fond of village gossip.',
      'A community needs roots and open doors.',
      'Sol maintains the wind bells and hosts evening gatherings. They encourage Zephyr to record migration stories for the next generation.',
      'zephyrit',
    ],
  ],
];
export const VILLAGER_SEEDS = authored.map((village) =>
  village.map(([name, age, pronouns, role, personality, belief, background, partner]) => ({
    name,
    age,
    pronouns,
    role,
    personality,
    belief,
    background,
    partner,
  })),
);

export type GiftTaste = 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated';

export interface VillagerGiftTastes {
  readonly loved: readonly ItemId[];
  readonly liked: readonly ItemId[];
  readonly disliked: readonly ItemId[];
  readonly hated: readonly ItemId[];
}

export const VILLAGER_GIFT_PREFERENCES: Readonly<Record<string, VillagerGiftTastes>> = {
  'npc:caelum': {
    loved: ['water', 'aqualia-poncho'],
    liked: ['flint', 'reeds', 'painting'],
    disliked: ['ashgrass', 'meat'],
    hated: ['sword'],
  },
  'npc:marina': {
    loved: ['fiber', 'reeds'],
    liked: ['nectar', 'flint', 'aqualia-hat'],
    disliked: ['meat', 'ashgrass'],
    hated: ['fungi'],
  },
  'npc:neris': {
    loved: ['meal', 'aqualia-cape'],
    liked: ['water', 'flint', 'note', 'hatchet'],
    disliked: ['berries'],
    hated: ['spear'],
  },
  'npc:reed': {
    loved: ['wheat', 'meal'],
    liked: ['reeds', 'berries', 'fiber', 'water'],
    disliked: ['flint'],
    hated: ['meat'],
  },
  'npc:willa': {
    loved: ['poultice', 'fungi'],
    liked: ['reeds', 'nectar', 'berries', 'water'],
    disliked: ['hatchet'],
    hated: ['ashgrass'],
  },
  'npc:oren': {
    loved: ['stick', 'hatchet'],
    liked: ['flint', 'fiber', 'ore', 'meal'],
    disliked: ['nectar'],
    hated: ['sword'],
  },
  'npc:mira': {
    loved: ['berries', 'nectar'],
    liked: ['reeds', 'water', 'note'],
    disliked: ['meat'],
    hated: ['spear'],
  },
  'npc:lark': {
    loved: ['canvas', 'painting'],
    liked: ['nectar', 'reeds', 'fiber', 'note'],
    disliked: ['meat'],
    hated: ['hatchet'],
  },
  'npc:dara': {
    loved: ['poultice', 'meal'],
    liked: ['water', 'berries', 'note', 'arrow-bundle'],
    disliked: ['canvas'],
    hated: ['fungi'],
  },
  'npc:finn': {
    loved: ['tool-head', 'flint'],
    liked: ['stick', 'water', 'fiber', 'berries'],
    disliked: ['poultice'],
    hated: ['ashgrass'],
  },
};

export function evaluateGiftTaste(npcId: string, itemId: ItemId): GiftTaste {
  const tastes = VILLAGER_GIFT_PREFERENCES[npcId];
  if (!tastes) return 'neutral';
  if (tastes.loved.includes(itemId)) return 'loved';
  if (tastes.liked.includes(itemId)) return 'liked';
  if (tastes.hated.includes(itemId)) return 'hated';
  if (tastes.disliked.includes(itemId)) return 'disliked';
  return 'neutral';
}

export function giftAffinityDelta(taste: GiftTaste, isBirthday = false): number {
  const mult = isBirthday ? 4 : 1;
  switch (taste) {
    case 'loved':
      return 8 * mult;
    case 'liked':
      return 4 * mult;
    case 'neutral':
      return 2 * mult;
    case 'disliked':
      return -4 * mult;
    case 'hated':
      return -8 * mult;
  }
}

export function giftReactionEmotion(taste: GiftTaste): DialogueEmotion {
  switch (taste) {
    case 'loved':
      return 'warm';
    case 'liked':
      return 'amused';
    case 'neutral':
      return 'thoughtful';
    case 'disliked':
      return 'concerned';
    case 'hated':
      return 'angry';
  }
}
