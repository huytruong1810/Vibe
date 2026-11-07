import { z } from 'zod';
import type { Element, NpcId, SettlementId } from '../domain/values';
import { VILLAGER_SEEDS } from './villagers';

export const itemIds = [
  'berries',
  'reeds',
  'wheat',
  'nectar',
  'ashgrass',
  'fungi',
  'flint',
  'stick',
  'fiber',
  'tool-head',
  'hatchet',
  'poultice',
  'water',
  'ore',
  'meat',
  'meal',
  'sword',
  'spear',
  'bow',
  'arrow-bundle',
  'pyrador-hood',
  'pyrador-coat',
  'pyrador-gloves',
  'pyrador-trousers',
  'pyrador-boots',
  'pyrador-cape',
  'aqualia-hat',
  'aqualia-poncho',
  'aqualia-gloves',
  'aqualia-trousers',
  'aqualia-boots',
  'aqualia-cape',
  'zephyria-cap',
  'zephyria-tunic',
  'zephyria-gloves',
  'zephyria-trousers',
  'zephyria-shoes',
  'zephyria-cloak',
  'note',
  'book',
  'canvas',
  'painting',
] as const;
export type ItemId = (typeof itemIds)[number];
export const ItemIdSchema = z.enum(itemIds);
export const ARTIFACT_LIMITS = Object.freeze({
  title: 48,
  line: 96,
  lines: 24,
  pages: 48,
  records: 512,
  textBytes: 2 * 1024 * 1024,
  width: 48,
  height: 32,
  colors: 16,
});
export type GarmentSlot = 'head' | 'torso' | 'hands' | 'legs' | 'feet' | 'back';
export interface ItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly color: number;
  readonly food?: number;
  readonly water?: number;
  readonly tool?: boolean;
  readonly garment?: {
    readonly slot: GarmentSlot;
    readonly defense: number;
    readonly speedMultiplier: number;
  };
  readonly weapon?: 'sword' | 'spear' | 'bow';
  readonly ammo?: { readonly capacity: number };
}
export const ITEMS: Readonly<Record<ItemId, ItemDefinition>> = {
  note: { id: 'note', name: 'Note', color: 0xd7c894 },
  book: { id: 'book', name: 'Book', color: 0xb58a63 },
  canvas: { id: 'canvas', name: 'Blank canvas', color: 0xd7c894 },
  painting: { id: 'painting', name: 'Painting', color: 0x80c3c6 },
  berries: { id: 'berries', name: 'Sunberries', color: 0xd87572, food: 0.35 },
  reeds: { id: 'reeds', name: 'River reeds', color: 0x99b780, food: 0.25 },
  wheat: { id: 'wheat', name: 'Wild wheat', color: 0xe8c577, food: 0.3 },
  nectar: { id: 'nectar', name: 'Nectar blossom', color: 0xe3adbd, food: 0.3 },
  ashgrass: { id: 'ashgrass', name: 'Ash grass', color: 0xc9986e, food: 0.3 },
  fungi: { id: 'fungi', name: 'Spore fungi', color: 0xb6a3cd, food: 0.3 },
  flint: { id: 'flint', name: 'River flint', color: 0xa4b3ba },
  stick: { id: 'stick', name: 'Hardwood stick', color: 0xb58a63 },
  fiber: { id: 'fiber', name: 'Reed fiber', color: 0xc5d29d },
  'tool-head': { id: 'tool-head', name: 'Tool head · WIP', color: 0xa8b4ba },
  hatchet: { id: 'hatchet', name: 'Stone hatchet', color: 0xd0d9ca, tool: true },
  poultice: { id: 'poultice', name: 'Herbal poultice', color: 0x8cc492 },
  water: { id: 'water', name: 'Spring water', color: 0x8cd5d8, water: 0.45 },
  ore: { id: 'ore', name: 'Copper ore', color: 0xc78a66 },
  meat: { id: 'meat', name: 'Wild meat', color: 0xb96665, food: 0.4 },
  meal: { id: 'meal', name: 'Nectar roast', color: 0xc99a68, food: 0.65 },
  sword: { id: 'sword', name: 'Copper sword', color: 0xc78a66, weapon: 'sword' },
  spear: { id: 'spear', name: 'Hunting spear', color: 0xa4b3ba, weapon: 'spear' },
  bow: { id: 'bow', name: 'Shortbow', color: 0xb58a63, weapon: 'bow' },
  'arrow-bundle': {
    id: 'arrow-bundle',
    name: 'Arrow bundle',
    color: 0xd7c894,
    ammo: { capacity: 12 },
  },
  ...(Object.fromEntries(
    (
      [
        ['pyrador', ['hood', 'coat', 'gloves', 'trousers', 'boots', 'cape'], 0xdfa17c],
        ['aqualia', ['hat', 'poncho', 'gloves', 'trousers', 'boots', 'cape'], 0x80c3c6],
        ['zephyria', ['cap', 'tunic', 'gloves', 'trousers', 'shoes', 'cloak'], 0xd7d698],
      ] as const
    ).flatMap(([region, names, color]) =>
      names.map((name, index) => {
        const id = `${region}-${name}` as ItemId;
        return [
          id,
          {
            id,
            name: `${region[0]!.toUpperCase()}${region.slice(1)} ${name}`,
            color,
            garment: {
              slot: (['head', 'torso', 'hands', 'legs', 'feet', 'back'] as const)[index]!,
              defense: index === 1 ? (region === 'pyrador' ? 3 : 2) : 1,
              speedMultiplier: region === 'pyrador' && index === 1 ? 0.95 : 1,
            },
          },
        ];
      }),
    ),
  ) as Record<Extract<ItemId, `${'pyrador' | 'aqualia' | 'zephyria'}-${string}`>, ItemDefinition>),
};
export interface Recipe {
  readonly a: ItemId;
  readonly b: ItemId;
  readonly result: ItemId;
}
export const RECIPES: readonly Recipe[] = [
  { a: 'fiber', b: 'fiber', result: 'note' },
  { a: 'note', b: 'fiber', result: 'book' },
  { a: 'note', b: 'stick', result: 'canvas' },
  { a: 'flint', b: 'stick', result: 'tool-head' },
  { a: 'tool-head', b: 'fiber', result: 'hatchet' },
  { a: 'reeds', b: 'reeds', result: 'fiber' },
  { a: 'berries', b: 'fungi', result: 'poultice' },
  { a: 'reeds', b: 'nectar', result: 'water' },
  { a: 'meat', b: 'nectar', result: 'meal' },
  { a: 'ore', b: 'tool-head', result: 'sword' },
  { a: 'stick', b: 'tool-head', result: 'spear' },
  { a: 'stick', b: 'fiber', result: 'bow' },
  { a: 'flint', b: 'reeds', result: 'arrow-bundle' },
  ...(
    [
      ['ashgrass', 'fiber', 'pyrador-hood'],
      ['ashgrass', 'ore', 'pyrador-coat'],
      ['ashgrass', 'reeds', 'pyrador-gloves'],
      ['ashgrass', 'wheat', 'pyrador-trousers'],
      ['ashgrass', 'stick', 'pyrador-boots'],
      ['ashgrass', 'nectar', 'pyrador-cape'],
      ['reeds', 'wheat', 'aqualia-hat'],
      ['reeds', 'fiber', 'aqualia-poncho'],
      ['reeds', 'fungi', 'aqualia-gloves'],
      ['reeds', 'ore', 'aqualia-trousers'],
      ['reeds', 'stick', 'aqualia-boots'],
      ['water', 'fiber', 'aqualia-cape'],
      ['wheat', 'fiber', 'zephyria-cap'],
      ['wheat', 'nectar', 'zephyria-tunic'],
      ['wheat', 'fungi', 'zephyria-gloves'],
      ['wheat', 'ore', 'zephyria-trousers'],
      ['wheat', 'stick', 'zephyria-shoes'],
      ['nectar', 'fiber', 'zephyria-cloak'],
    ] as const
  ).map(([a, b, result]) => ({ a, b, result })),
];
export type SpeciesId =
  | 'ignicap'
  | 'rivallie'
  | 'zephyrit'
  | 'mireling'
  | 'cindermoth'
  | 'steamshell'
  | 'bramblefang'
  | 'marshstalker'
  | 'human';
export type Medium = 'freshwater' | 'saltwater' | 'sand' | 'mud' | 'lava';
export interface CreatureDefinition {
  readonly id: SpeciesId;
  readonly name: string;
  readonly elements: readonly Element[];
  readonly color: number;
  readonly diet: readonly ItemId[];
  readonly prey?: readonly SpeciesId[];
  readonly bath: Medium;
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly attunement: number;
  readonly resonance: number;
  readonly speed: number;
  readonly habitat: readonly number[];
  readonly description: string;
}
export const SPECIES: readonly CreatureDefinition[] = [
  {
    id: 'ignicap',
    name: 'Ignicap',
    elements: ['fire'],
    color: 0xe3946e,
    diet: ['ashgrass'],
    bath: 'lava',
    hp: 64,
    attack: 12,
    defense: 7,
    attunement: 14,
    resonance: 8,
    speed: 2.5,
    habitat: [3, 5],
    description: 'A warm-hearted wanderer with a smoldering mushroom cap.',
  },
  {
    id: 'rivallie',
    name: 'Rivallie',
    elements: ['water'],
    color: 0x84c7ca,
    diet: ['reeds'],
    bath: 'freshwater',
    hp: 72,
    attack: 10,
    defense: 9,
    attunement: 11,
    resonance: 10,
    speed: 2.7,
    habitat: [0, 6],
    description: 'Playful river spirits that gather wherever the reeds grow.',
  },
  {
    id: 'zephyrit',
    name: 'Zephyrit',
    elements: ['wind'],
    color: 0xdbdca7,
    diet: ['berries'],
    bath: 'sand',
    hp: 56,
    attack: 11,
    defense: 6,
    attunement: 16,
    resonance: 11,
    speed: 3.3,
    habitat: [1, 4],
    description: 'These bright little companions follow the sea breeze.',
  },
  {
    id: 'mireling',
    name: 'Mireling',
    elements: ['water', 'wind'],
    color: 0xa6bc8c,
    diet: ['fungi'],
    bath: 'mud',
    hp: 70,
    attack: 10,
    defense: 10,
    attunement: 8,
    resonance: 12,
    speed: 2.3,
    habitat: [2, 6],
    description: 'Mossy creatures that keep the wetlands company.',
  },
  {
    id: 'cindermoth',
    name: 'Cindermoth',
    elements: ['fire', 'wind'],
    color: 0xdaa2a9,
    diet: ['nectar'],
    bath: 'sand',
    hp: 52,
    attack: 14,
    defense: 5,
    attunement: 18,
    resonance: 10,
    speed: 3.2,
    habitat: [1, 5],
    description: 'Fluttering sparks that pollinate hardy wildflowers.',
  },
  {
    id: 'steamshell',
    name: 'Steamshell',
    elements: ['fire', 'water'],
    color: 0xb6a7ce,
    diet: ['wheat'],
    bath: 'freshwater',
    hp: 84,
    attack: 9,
    defense: 13,
    attunement: 6,
    resonance: 14,
    speed: 2.0,
    habitat: [0, 3],
    description: 'Gentle grazers with little clouds above their shells.',
  },
  {
    id: 'bramblefang',
    name: 'Bramblefang',
    elements: ['fire', 'wind'],
    color: 0xc67f51,
    diet: ['meat', 'meal'],
    prey: ['zephyrit', 'rivallie', 'marshstalker'],
    bath: 'sand',
    hp: 84,
    attack: 14,
    defense: 9,
    attunement: 6,
    resonance: 6,
    speed: 3.8,
    habitat: [1, 4, 5],
    description: 'An ember-maned hunter that stalks grassland margins.',
  },
  {
    id: 'marshstalker',
    name: 'Marshstalker',
    elements: ['water', 'wind'],
    color: 0x698e80,
    diet: ['meat', 'meal'],
    prey: ['cindermoth', 'mireling'],
    bath: 'mud',
    hp: 68,
    attack: 12,
    defense: 7,
    attunement: 10,
    resonance: 9,
    speed: 3.5,
    habitat: [2, 6],
    description: 'A patient wetland hunter with a low, rippling gait.',
  },
];

export const CREATURES: Readonly<Record<SpeciesId, CreatureDefinition>> = Object.fromEntries(
  SPECIES.map((s) => [s.id, s]),
) as Record<SpeciesId, CreatureDefinition>;

export interface SpeciesMoveLearn {
  readonly moveId: string;
  readonly name: string;
  readonly requiredLevel: number;
  readonly requiredBondHearts?: number;
  readonly element: string;
  readonly power: number;
  readonly stamina: number;
}

export const SPECIES_LEARNABLE_MOVES: Readonly<Record<SpeciesId, readonly SpeciesMoveLearn[]>> = {
  ignicap: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'ember_tap',
      name: 'Ember Tap',
      requiredLevel: 1,
      element: 'fire',
      power: 12,
      stamina: 5,
    },
    {
      moveId: 'cinder_veil',
      name: 'Cinder Veil',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'fire',
      power: 15,
      stamina: 7,
    },
    {
      moveId: 'flame_burst',
      name: 'Flame Burst',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'fire',
      power: 22,
      stamina: 10,
    },
    {
      moveId: 'magma_surge',
      name: 'Magma Surge',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'fire',
      power: 30,
      stamina: 14,
    },
  ],
  rivallie: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'river_pulse',
      name: 'River Pulse',
      requiredLevel: 1,
      element: 'water',
      power: 11,
      stamina: 5,
    },
    {
      moveId: 'bubble_guard',
      name: 'Bubble Guard',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'water',
      power: 14,
      stamina: 6,
    },
    {
      moveId: 'torrent_surge',
      name: 'Torrent Surge',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'water',
      power: 20,
      stamina: 9,
    },
    {
      moveId: 'abyssal_cascade',
      name: 'Abyssal Cascade',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'water',
      power: 28,
      stamina: 13,
    },
  ],
  zephyrit: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'gust_kick',
      name: 'Gust Kick',
      requiredLevel: 1,
      element: 'wind',
      power: 11,
      stamina: 4,
    },
    {
      moveId: 'wind_step',
      name: 'Wind Step',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'wind',
      power: 14,
      stamina: 6,
    },
    {
      moveId: 'gale_slice',
      name: 'Gale Slice',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'wind',
      power: 21,
      stamina: 9,
    },
    {
      moveId: 'sky_vortex',
      name: 'Sky Vortex',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'wind',
      power: 29,
      stamina: 13,
    },
  ],
  mireling: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'mist_spiral',
      name: 'Mist Spiral',
      requiredLevel: 1,
      element: 'water',
      power: 12,
      stamina: 5,
    },
    {
      moveId: 'moss_shroud',
      name: 'Moss Shroud',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'earth',
      power: 15,
      stamina: 7,
    },
    {
      moveId: 'spore_cloud',
      name: 'Spore Cloud',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'earth',
      power: 20,
      stamina: 9,
    },
    {
      moveId: 'bog_grasp',
      name: 'Bog Grasp',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'water',
      power: 27,
      stamina: 12,
    },
  ],
  cindermoth: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'spark_wing',
      name: 'Spark Wing',
      requiredLevel: 1,
      element: 'fire',
      power: 13,
      stamina: 5,
    },
    {
      moveId: 'ash_flutter',
      name: 'Ash Flutter',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'fire',
      power: 16,
      stamina: 7,
    },
    {
      moveId: 'scorch_dive',
      name: 'Scorch Dive',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'fire',
      power: 23,
      stamina: 10,
    },
    {
      moveId: 'phoenix_flare',
      name: 'Phoenix Flare',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'fire',
      power: 32,
      stamina: 15,
    },
  ],
  steamshell: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'steam_burst',
      name: 'Steam Burst',
      requiredLevel: 1,
      element: 'water',
      power: 14,
      stamina: 6,
    },
    {
      moveId: 'shell_shelter',
      name: 'Shell Shelter',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'water',
      power: 16,
      stamina: 8,
    },
    {
      moveId: 'geyser_slam',
      name: 'Geyser Slam',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'water',
      power: 24,
      stamina: 11,
    },
    {
      moveId: 'caldera_eruption',
      name: 'Caldera Eruption',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'fire',
      power: 31,
      stamina: 14,
    },
  ],
  bramblefang: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'bramble_pounce',
      name: 'Bramble Pounce',
      requiredLevel: 1,
      element: 'fire',
      power: 13,
      stamina: 5,
    },
    {
      moveId: 'ember_sidestep',
      name: 'Ember Sidestep',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'fire',
      power: 16,
      stamina: 7,
    },
    {
      moveId: 'flame_fang',
      name: 'Flame Fang',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'fire',
      power: 23,
      stamina: 10,
    },
    {
      moveId: 'savage_combustion',
      name: 'Savage Combustion',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'fire',
      power: 33,
      stamina: 15,
    },
  ],
  marshstalker: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 10,
      stamina: 4,
    },
    {
      moveId: 'reed_ambush',
      name: 'Reed Ambush',
      requiredLevel: 1,
      element: 'earth',
      power: 12,
      stamina: 5,
    },
    {
      moveId: 'mist_crouch',
      name: 'Mist Crouch',
      requiredLevel: 8,
      requiredBondHearts: 2,
      element: 'water',
      power: 15,
      stamina: 7,
    },
    {
      moveId: 'swamp_frenzy',
      name: 'Swamp Frenzy',
      requiredLevel: 18,
      requiredBondHearts: 4,
      element: 'earth',
      power: 22,
      stamina: 10,
    },
    {
      moveId: 'apex_strike',
      name: 'Apex Strike',
      requiredLevel: 28,
      requiredBondHearts: 6,
      element: 'water',
      power: 30,
      stamina: 14,
    },
  ],
  human: [
    {
      moveId: 'strike',
      name: 'Strike',
      requiredLevel: 1,
      element: 'physical',
      power: 8,
      stamina: 4,
    },
  ],
};

export function learnableMovesForSpecies(
  speciesId: SpeciesId,
  level: number,
  bondHearts = 0,
): readonly SpeciesMoveLearn[] {
  const pool = SPECIES_LEARNABLE_MOVES[speciesId] ?? [];
  return pool.filter((m) => m.requiredLevel <= level && (m.requiredBondHearts ?? 0) <= bondHearts);
}

export function findMoveDefinition(moveId: string): SpeciesMoveLearn {
  for (const moves of Object.values(SPECIES_LEARNABLE_MOVES)) {
    const found = moves.find((m) => m.moveId === moveId);
    if (found) return found;
  }
  return {
    moveId,
    name:
      moveId === 'strike'
        ? 'Strike'
        : moveId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    requiredLevel: 1,
    element: 'physical',
    power: 10,
    stamina: 4,
  };
}

export interface CreatureMoveset {
  readonly category: 'melee' | 'ranged';
  readonly aggression: number;
  readonly kiteRange: number;
  readonly attackName: string;
  readonly power: number;
  readonly cooldownTicks: number;
  readonly range: number;
  readonly defenseName: string;
  readonly defensePeriod: number;
  readonly defenseTicks: number;
}
export const CREATURE_MOVES: Readonly<Record<SpeciesId, CreatureMoveset>> = {
  ignicap: {
    attackName: 'Ember tap',
    category: 'melee',
    aggression: 0.2,
    kiteRange: 0,
    power: 10,
    cooldownTicks: 35,
    range: 1.6,
    defenseName: 'Cinder veil',
    defensePeriod: 100,
    defenseTicks: 16,
  },
  rivallie: {
    attackName: 'River pulse',
    category: 'ranged',
    aggression: 0.4,
    kiteRange: 0,
    power: 8,
    cooldownTicks: 32,
    range: 2,
    defenseName: 'Bubble guard',
    defensePeriod: 90,
    defenseTicks: 20,
  },
  zephyrit: {
    attackName: 'Gust kick',
    category: 'melee',
    aggression: 0.5,
    kiteRange: 2.5,
    power: 8,
    cooldownTicks: 26,
    range: 1.8,
    defenseName: 'Wind step',
    defensePeriod: 80,
    defenseTicks: 14,
  },
  mireling: {
    attackName: 'Mist spiral',
    category: 'ranged',
    aggression: 0.3,
    kiteRange: 0,
    power: 9,
    cooldownTicks: 36,
    range: 2.1,
    defenseName: 'Moss shroud',
    defensePeriod: 110,
    defenseTicks: 24,
  },
  cindermoth: {
    attackName: 'Spark wing',
    category: 'ranged',
    aggression: 0.4,
    kiteRange: 3.5,
    power: 11,
    cooldownTicks: 30,
    range: 1.9,
    defenseName: 'Ash flutter',
    defensePeriod: 95,
    defenseTicks: 16,
  },
  steamshell: {
    attackName: 'Steam burst',
    category: 'ranged',
    aggression: 0.4,
    kiteRange: 0,
    power: 12,
    cooldownTicks: 44,
    range: 1.7,
    defenseName: 'Shell shelter',
    defensePeriod: 120,
    defenseTicks: 32,
  },
  bramblefang: {
    attackName: 'Bramble pounce',
    category: 'melee',
    aggression: 0.8,
    kiteRange: 0,
    power: 11,
    cooldownTicks: 30,
    range: 1.9,
    defenseName: 'Ember sidestep',
    defensePeriod: 95,
    defenseTicks: 16,
  },
  marshstalker: {
    attackName: 'Reed ambush',
    category: 'melee',
    aggression: 0.7,
    kiteRange: 0,
    power: 9,
    cooldownTicks: 36,
    range: 2.1,
    defenseName: 'Mist crouch',
    defensePeriod: 110,
    defenseTicks: 24,
  },
  human: {
    attackName: 'Elemental palm',
    category: 'ranged',
    aggression: 0.5,
    kiteRange: 0,
    power: 8,
    cooldownTicks: 36,
    range: 1.8,
    defenseName: 'Guard',
    defensePeriod: 90,
    defenseTicks: 18,
  },
};
export interface ScheduleEntry {
  readonly hour: number;
  readonly location: 'home' | 'work' | 'square' | 'shrine' | 'outpost';
  readonly activity: string;
}
export interface NpcProfile {
  readonly dietPreferences?: readonly ItemId[];
  readonly dietRestrictions?: readonly ItemId[];
  readonly id: NpcId;
  readonly name: string;
  readonly age: number;
  readonly pronouns: string;
  readonly role: string;
  readonly village: number;
  readonly personality: string;
  readonly belief: string;
  readonly bigFive: readonly [number, number, number, number, number];
  readonly partner: SpeciesId | null;
  readonly background: string;
  readonly relationships: readonly NpcId[];
  readonly week: readonly (readonly ScheduleEntry[])[];
}
export const VILLAGES = [
  {
    name: 'Pyrador',
    element: 'fire' as Element,
    color: 0xdfa17c,
    x: 104,
    y: 110,
    bonus: 'Thermal resistance',
  },
  {
    name: 'Aqualia',
    element: 'water' as Element,
    color: 0x80c3c6,
    x: 264,
    y: 282,
    bonus: 'River stride',
  },
  {
    name: 'Zephyria',
    element: 'wind' as Element,
    color: 0xd7d698,
    x: 414,
    y: 188,
    bonus: 'Fleet-footed dash',
  },
] as const;
export const NPC_PROFILES: readonly NpcProfile[] = VILLAGER_SEEDS.flatMap((villagers, village) =>
  villagers.map((seed, index) => {
    const name = seed.name;
    const id = `npc:${name.toLowerCase()}` as NpcId;
    return {
      id,
      name,
      age: seed.age,
      pronouns: seed.pronouns,
      role: seed.role,
      village,
      personality: seed.personality,
      belief: seed.belief,
      bigFive: [
        0.35 + index * 0.05,
        0.8 - index * 0.03,
        0.3 + (index % 4) * 0.15,
        0.75,
        0.2 + (index % 3) * 0.1,
      ] as const,
      partner: seed.partner,
      background: seed.background,
      relationships: [
        ...new Set([
          ...[1, 3].map(
            (offset) => `npc:${villagers[(index + offset) % 10]!.name.toLowerCase()}` as NpcId,
          ),
          ...VILLAGER_SEEDS.flat()
            .filter(
              (other) =>
                other.name !== name && new RegExp(`\\b${other.name}\\b`, 'i').test(seed.background),
            )
            .map((other) => `npc:${other.name.toLowerCase()}` as NpcId),
        ]),
      ],
      week: Array.from({ length: 7 }, (_, day) => [
        { hour: 0, location: 'home' as const, activity: 'Sleeping' },
        { hour: 6 + (index % 2), location: 'square' as const, activity: 'Sharing breakfast' },
        {
          hour: 8,
          location:
            day === 6
              ? ('shrine' as const)
              : seed.role.includes('courier')
                ? ('outpost' as const)
                : ('work' as const),
          activity: day === 6 ? 'Reflecting at the shrine' : `Working as ${seed.role}`,
        },
        { hour: 12, location: 'square' as const, activity: 'Lunch with neighbors' },
        {
          hour: 14,
          location: day === 5 ? ('outpost' as const) : ('work' as const),
          activity: day === 5 ? 'Visiting the outpost' : 'Finishing the day’s work',
        },
        { hour: 18, location: 'square' as const, activity: 'Talking by the communal fire' },
        { hour: 22, location: 'home' as const, activity: 'Resting at home' },
      ]),
    };
  }),
);

export interface SettlementDefinition {
  readonly id: SettlementId;
  readonly name: string;
  readonly village: number;
  readonly x: number;
  readonly y: number;
  readonly capital: boolean;
}
export const SETTLEMENTS: readonly SettlementDefinition[] = VILLAGES.flatMap((v, i) => [
  {
    id: `settlement:${v.name.toLowerCase()}` as SettlementId,
    name: v.name,
    village: i,
    x: v.x,
    y: v.y,
    capital: true,
  },
  {
    id: `settlement:${i}-1` as SettlementId,
    name: ['Ashwatch', 'Reedhaven', 'Breezerest'][i]!,
    village: i,
    x: v.x - 44,
    y: v.y + 50,
    capital: false,
  },
  {
    id: `settlement:${i}-2` as SettlementId,
    name: ['Mossforge', 'Tidecross', 'Sunmill'][i]!,
    village: i,
    x: v.x + 40,
    y: v.y + 52,
    capital: false,
  },
]);

export class ContentRegistry {
  readonly npcs = new Map(NPC_PROFILES.map((n) => [n.id, n]));
  readonly species = new Map(SPECIES.map((s) => [s.id, s]));
  validate(): void {
    if (this.npcs.size !== 30 || SETTLEMENTS.length !== 9)
      throw new Error('Expected 30 unique villagers and 9 settlements');
    for (const n of this.npcs.values()) {
      if (n.week.length !== 7 || n.week.some((day) => day[0]?.hour !== 0))
        throw new Error(`Invalid schedule: ${n.id}`);
      if (n.relationships.some((id) => !this.npcs.has(id)))
        throw new Error(`Unknown relationship: ${n.id}`);
      if (n.partner && !this.species.has(n.partner))
        throw new Error(`Unknown species: ${n.partner}`);
    }
    for (const recipe of RECIPES)
      for (const id of [recipe.a, recipe.b, recipe.result]) ItemIdSchema.parse(id);
  }
}
