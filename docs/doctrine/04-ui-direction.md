# 04 — UI and UX direction

Reference: Zenonia 4 (REF-2) for framing, hierarchy and tactility; Coromon and
Cassette Beasts (REF-11) for creature data. Hyper Light Drifter (REF-10) sets
the restraint rule: during action, the play field comes first.

## UI-1 Visual language

- **UI-1.0 Kit.** The reference implementation is the UI kit (`art/source/ui/`, review
  composition `kit/hud_mock.png`), with tokens in `art/source/forge/spec/ui_theme.json` (L9).
- **UI-1.1 Frames.** Panels are deep navy (`navy` ramp) with bronze/gold
  filigree trim (`gold` ramp) as 9-slice pixel frames: corner ornaments 8×8 art
  px, edges tile seamlessly, a 1-px inner bevel lit from the upper left (ART-3.1).
  Three frame weights: **ornate** (menus, dialogue), **standard** (HUD
  clusters), **thin** (tooltips, toasts).
- **UI-1.2 Pixel grid.** UI is drawn at the same 2× art-pixel scale as the
  world (ART-1.1). Text may render at screen resolution for legibility but sits
  inside pixel-grid frames.
- **UI-1.3 Colour semantics.** HP = red ramp; stamina = gold/amber; element
  charge = the element's VFX key (ART-12.1); XP = pale cyan. Rarity frames:
  common bronze, fine silver, rare teal, epic violet, mythic ember. Colour is
  never the only signal: pair it with an icon or shape (UI-8).
- **UI-1.4 Iconography.** Item icons come from the same mesh as the held item
  (ART-15), so the icon in your hand slot matches the tool in your hand.

## UI-2 HUD layout (exploration and combat)

```
┌─────────────────────────────────────────────────────────────┐
│ [Portrait medallion] HP ████████░░  Day 3 · Dawn  ◯ Minimap │
│  Lv 7  Stamina ▰▰▰▰▱    ☼ weather icon           (ornate   │
│ [Companion medallion] needs: 🍖 💧 🎾 🫧 💤         ring)   │
│                                                             │
│                    (play field — kept clear)                │
│                                                             │
│ [toast area: quest/receipt notifications, top-centre]       │
│                                                             │
│                                   [Hand L][Hand R]  ( K )   │
│ [context prompt: "E  Talk"]              [Dash]  (  J  )    │
└─────────────────────────────────────────────────────────────┘
```

- **UI-2.1** Top-left: the player portrait medallion (circular, ornate) with
  HP, stamina and level; the companion medallion beneath it, with five need icons
  (food, water, recreation, cleanliness, rest) that fill and pulse when critical.
- **UI-2.2** Top-right: minimap inside an ornate ring, with day, time phase and
  weather.
- **UI-2.3** Bottom-right action cluster: large **J** strike button, **K**
  element skill with a radial cooldown, **Dash** with a stamina gate, and the two
  **hand slots** (L/R) showing item icons and combine (C) and swap (Q) affordances.
  On keyboard, buttons show keybind glyphs; the layout is ready for touch later.
- **UI-2.4** Bottom-left: context prompt ("E Talk", "R Gather", "F Inspect").
- **UI-2.5** During active combat, non-essential HUD (minimap ring, toasts) dims
  to 60% opacity so attention stays on the fight.

## UI-3 Combat feedback UI

- **UI-3.1** Damage numbers pop from the hit point with a 1-px outline, rise
  and fade over about 0.6 s. Element-strong hits are larger and coloured with the
  element key; resisted hits are smaller and grey. Crits get a short scale punch
  using integer steps only.
- **UI-3.2** Enemy HP bars appear only once an enemy is engaged, above its
  head, thin frame.
- **UI-3.3** Telegraphs (CMB-4) are world-space markings, not UI panels.

## UI-4 Dialogue

- **UI-4.1** Bottom dialogue box, ornate frame, 128-px portrait on the left
  with a name plate (village accent colour). The portrait changes expression
  with the line (ART-8.3).
- **UI-4.2** Text reveals at a readable rate (skippable). Choices appear as
  framed buttons with keyboard focus rings.
- **UI-4.3** Staged effects of the conversation (gifts, markers, follows) are
  listed as pending receipts and confirmed when the dialogue closes, in line with
  the existing commit-on-close rule.

## UI-5 Full-screen menus

- **UI-5.1** Tabbed ornate menu: **Inventory · Companion · Journal · Map ·
  Settings**. Tabs show icons with labels; menu open pauses per existing rules.
- **UI-5.2** Inventory shows the two hand slots prominently (exactly two
  carried items, no bag) plus a recipe book with discovered and undiscovered
  recipes.
- **UI-5.3** Journal holds recipes, villager profiles (hearts, gift tastes
  learned, schedule notes, birthday), the creature field guide and active
  commitments.

## UI-6 Companion page (Pokémon-depth)

- **UI-6.1** A large animated sprite of the partner on the left. On the right: name,
  species, level, element badges, temperament badge (CRE-4) and bond hearts.
- **UI-6.2** A six-axis **stat radar** (CRE-2) showing base plus conditioning,
  with potential shown as a dotted outline once discovered.
- **UI-6.3** Four equipped **move cards** (element, power, cadence, short
  description), plus a list of learnable moves.
- **UI-6.4** Needs bars with the wellbeing tier and its combat multiplier,
  stated plainly ("Well cared for: full strength").

## UI-7 Typography

- **UI-7.1** One font for everything: **Silver** (Poppy Works, CC BY 4.0, credit in the
  game credits; see `art/source/ui/fonts/LICENSE.md`). Native 19 px em grid, cap height
  9 px, rendered at 19 art px (38 display px), never anti-aliased (L9). Its large glyph set
  (Latin, Cyrillic, Greek, CJK, Hangul) keeps localization open. Headings use colour,
  frames and spacing for hierarchy, never a second typeface. The title-screen logo is
  bespoke pixel lettering, drawn as art.
- **UI-7.2** Minimum body text: 16 screen px cap height at 1080p reference.

## UI-8 Accessibility

UI scale (100/125/150%), high-contrast frames, reduced motion (keeps attack
readability), colour-blind-safe element icons (shape plus colour), remappable
keys, captions for important audio cues.

## Engineering mandates

| ID    | Mandate                                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI-M1 | The HUD view supports the UI-2 layout regions and the combat dimming rule (UI-2.5).                                                                              |
| UI-M2 | Damage-number and hit cues are emitted as presentation cues with element and effectiveness data.                                                                 |
| UI-M3 | The dialogue view can swap portrait expressions per line (requires expression tags on dialogue lines).                                                           |
| UI-M4 | The companion page exposes the CRE stat model once implemented: radar values, temperament, moves, bond.                                                          |
| UI-M5 | 9-slice frame rendering at integer scale for three frame weights.                                                                                                |
| UI-M6 | Integrate the UI kit first: Silver (subset for runtime), `ui_theme.json` tokens as CSS variables, kit frames as 9-slice border images at 2×. Remove other fonts. |
