import { ITEMS, NPC_PROFILES, SPECIES, SETTLEMENTS, VILLAGES } from './definitions';

const words = (text: string) => text.toLocaleLowerCase('en-US').match(/[\p{L}\p{N}]+/gu) ?? [];
// Conservative vocabulary: canonical content plus ordinary diary language. Unknown
// words receive a rejection receipt rather than becoming invented entities/items.
const common = `a an the and or but if as at by for from in into of on to with without through beside near across along above below under over before after during until up down out off here there this that these those i me my mine we us our ours you your yours he him his she her hers they them their theirs it its who what when where why how is are was were be been being am have has had do does did can could may might must shall should will would not no yes all any some many more most much few less little each every other another both one two three four five six seven eight nine ten first second third last next today tonight tomorrow yesterday day days night morning noon evening dawn dusk spring summer autumn winter time high low warm cold wet dry rain raining rainy wind windy sun sunny sky cloud clouds light dark quiet calm still gentle bright soft slow slowly quick quickly small large long short deep shallow new old good bad safe home work house room table shelf book books note notes page pages diary letter words lines read reading write writing wrote written draw drawing sketch sketches paint painting painted see saw seen look looked looking hear heard hearing feel felt feeling think thought remember remembered forget forgot know known learn learned find found make made keep kept give gave given gift gifts take took taken return returned bring brought leave left come came go went gone walk walked walking sit sat sitting wait waited waiting rest rested sleep slept wake woke eat ate drink drank wash washed clean carry carried hold held meet met talk talked talking tell told say said ask asked answer answered promise promised enjoy enjoyed love loved like liked hope hoped want wanted need needed help helped friend friends neighbor neighbors village villagers tide tides ferry ferries river rivers bend bank shore reed reeds grass water fire earth air wind rain path paths road bridge forest marsh mountain mountains sea sky garden flower flowers field fields birds bird creature creatures meal food fish boats boat rise rises rose rising fall falls fell falling flow flows flowing change changes changed changing again away together about only once never always often sometimes while because also very just now then so too even yet well perhaps please thanks thank thankyou hello goodbye`;
const canonical = JSON.stringify({
  items: Object.values(ITEMS).map((i) => i.name),
  npcs: NPC_PROFILES.map((n) => n.name),
  species: SPECIES.map((s) => s.name),
  places: [...SETTLEMENTS.map((s) => s.name), ...VILLAGES.map((v) => v.name)],
});
const vocabulary = new Set(words(common + ' ' + canonical));
vocabulary.add('notice');
vocabulary.add('notices');
const names = [
  ...Object.values(ITEMS).map((i) => i.name),
  ...NPC_PROFILES.map((p) => p.name),
  ...SPECIES.map((s) => s.name),
  ...SETTLEMENTS.map((s) => s.name),
  ...VILLAGES.map((v) => v.name),
];
const properWords = new Set(
  names.flatMap((name) => name.match(/\b\p{Lu}[\p{L}\p{N}'’]*\b/gu) ?? []),
);
export function groundWriting(text: string, title = false): string {
  const clean = text
    .normalize('NFC')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_#]/g, '')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim();
  for (const word of words(clean))
    if (!/^\d+$/.test(word) && !vocabulary.has(word))
      throw Error(`Writing contains an unrecognized name or word: ${word}.`);
  if (!title)
    for (const match of clean.matchAll(/\b\p{Lu}[\p{L}\p{N}'’]*\b/gu)) {
      const word = match[0];
      if (word === 'I' || properWords.has(word)) continue;
      const prefix = clean.slice(0, match.index).replace(/[\s"'“”‘’]+$/g, '');
      if (!prefix || /[.!?:;]$/.test(prefix)) continue;
      throw Error(`Writing mentions an unrecognized name: ${word}.`);
    }
  return clean;
}
