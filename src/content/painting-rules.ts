import { ITEMS, NPC_PROFILES, SETTLEMENTS, SPECIES, VILLAGES } from './definitions';

/** Shared deterministic content rules. Extend these data lists as playtests expose gaps. */
export const PAINTING_CONTENT_RULES = {
  brands: [
    'coca-cola',
    'coca cola',
    'nike',
    'adidas',
    'mcdonalds',
    "mcdonald's",
    'disney',
    'google',
    'microsoft',
    'openai',
    'apple inc',
    'starbucks',
  ],
  realPeople: [
    'taylor swift',
    'albert einstein',
    'donald trump',
    'elon musk',
    'beyonce',
    'leonardo da vinci',
  ],
  lettering: [
    'text',
    'letters',
    'words',
    'write',
    'writing',
    'lettering',
    'logo',
    'logos',
    'watermark',
    'text that says',
    'text saying',
    'words that say',
  ],
} as const;
const catalogs = {
  npc: NPC_PROFILES.map((p) => ({ id: p.id, name: p.name })),
  creature: SPECIES.map((p) => ({ id: p.id, name: p.name })),
  place: [
    ...SETTLEMENTS.map((p) => ({ id: p.id, name: p.name })),
    ...VILLAGES.map((p, index) => ({ id: `village:${index}`, name: p.name })),
  ],
  item: Object.values(ITEMS).map((p) => ({ id: p.id, name: p.name })),
};
export type PaintingSubject = { kind: keyof typeof catalogs; id: string };
const folded = (text: string) => text.normalize('NFKC').toLocaleLowerCase('en-US');
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function contains(text: string, phrase: string): boolean {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escape(folded(phrase))}(?![\\p{L}\\p{N}])`, 'u').test(
    text,
  );
}
export function validatePaintingText(text: string): void {
  const value = folded(text);
  if (/(?:https?:|www\.|[\p{L}\p{N}-]+\.(?:com|org|net|io)\b)/u.test(value))
    throw Error('Paintings cannot include URLs.');
  if (
    /["“”«»]|(?<!\p{L})'[^'\n]+'(?!\p{L})/u.test(value) ||
    PAINTING_CONTENT_RULES.lettering.some((word) => contains(value, word))
  )
    throw Error('Paintings cannot request text, quoted lettering or logos.');
  if (PAINTING_CONTENT_RULES.brands.some((word) => contains(value, word)))
    throw Error('Choose a subject without real-world brands.');
  if (PAINTING_CONTENT_RULES.realPeople.some((word) => contains(value, word)))
    throw Error('Choose a world subject instead of a real-world person.');
}
export function paintingSubjectExists(subject: PaintingSubject): boolean {
  return catalogs[subject.kind].some((entry) => entry.id === subject.id);
}
export function namedPaintingSubjects(text: string): PaintingSubject[] {
  const value = folded(text),
    subjects: PaintingSubject[] = [];
  for (const kind of Object.keys(catalogs) as (keyof typeof catalogs)[])
    for (const entry of catalogs[kind])
      if (contains(value, entry.name)) subjects.push({ kind, id: entry.id });
  return subjects;
}
