# Prompt templates (fixed clauses in CAPS stay verbatim)

Fill `{…}` fields from the identity sources. Don't remove fixed clauses; they
encode PRD-3 and were chosen so image-to-3D models get clean input.

## human-apose v1 (front + back in one image)

```
Character model sheet of {NAME}, a {AGE}-year-old {ROLE} from a canal village, {ONE-LINE PERSONALITY}.
Appearance: {HAIR: shape, length, colour}, {SKIN TONE}, {COSTUME LAYERS with colours}, {SIGNATURE DETAIL}.
TWO VIEWS SIDE BY SIDE: FRONT VIEW ON THE LEFT, BACK VIEW ON THE RIGHT, SAME CHARACTER, SAME SCALE.
FULL BODY FROM HEAD TO FEET, A-POSE WITH ARMS ANGLED ABOUT 45 DEGREES AWAY FROM THE BODY, PALMS FACING INWARD, LEGS SLIGHTLY APART.
STYLIZED PROPORTIONS, ABOUT 5 HEADS TALL, ADULT, FRIENDLY READABLE FACE, NEUTRAL EXPRESSION.
ORTHOGRAPHIC VIEW, NO PERSPECTIVE DISTORTION, EVEN SOFT LIGHTING FROM THE UPPER LEFT, NO CAST SHADOWS.
HANDS EMPTY, NO PROPS, NO WEAPONS, NO TOOLS, NO BAGS HELD.
PLAIN FLAT LIGHT GREY BACKGROUND, NO TEXT, NO LABELS, NO FRAME.
Clean painterly concept-art rendering with clear colour regions (not pixel art).
```

Why "not pixel art": image-to-3D reconstructs better from clean colour regions.
The forge produces the pixel look later.

## creature v1 (front, left side, back)

```
Creature model sheet of {SPECIES}, a {ELEMENT}-element {SIZE} creature: {DESCRIPTION FROM CONTENT}.
Anatomy: {BODY SHAPE}, {HEAD AND MUZZLE}, {LIMBS}, {TAIL}, {SIGNATURE FEATURES}, colours {MAIN}, {BELLY}, {ACCENTS}.
THREE VIEWS IN A ROW AT THE SAME SCALE: FRONT VIEW, LEFT SIDE VIEW, BACK VIEW.
NEUTRAL STANDING POSE, ALL FOUR LIMBS VISIBLE AND SEPARATED FROM THE BODY, TAIL EXTENDED AWAY FROM THE BODY, MOUTH CLOSED.
ORTHOGRAPHIC VIEW, NO PERSPECTIVE, EVEN SOFT LIGHTING FROM THE UPPER LEFT, NO CAST SHADOWS.
PLAIN FLAT LIGHT GREY BACKGROUND, NO TEXT, NO LABELS.
Clean painterly concept-art rendering with clear colour regions.
```

Rivallie anatomy is canon from its portrait: rounded otter-like body and muzzle,
cream belly, aqua crest fins, paddle tail (ART-10, first-proof review).

## prop v1

```
Single object reference: {OBJECT} used by {OWNER/ROLE}: {MATERIALS AND COLOURS}, {SIZE RELATIVE TO A HUMAN HAND}.
THREE-QUARTER VIEW, OBJECT ALONE, CENTERED, ENTIRE OBJECT VISIBLE.
CHUNKY READABLE SHAPES, NO THIN WIRES, NO FINE FILIGREE.
EVEN SOFT LIGHTING FROM THE UPPER LEFT, PLAIN FLAT LIGHT GREY BACKGROUND, NO HANDS, NO TEXT.
Clean painterly concept-art rendering with clear colour regions.
```

## part v1 (gear worn by the mannequin)

```
Clothing part reference: {PART} — {DESCRIPTION, MATERIALS, COLOURS}, worn by a plain featureless grey mannequin.
TWO VIEWS SIDE BY SIDE: FRONT AND BACK, A-POSE MANNEQUIN, ARMS ABOUT 45 DEGREES OUT, ABOUT 5 HEADS TALL.
ONLY THIS ONE GARMENT ON THE MANNEQUIN, NOTHING ELSE WORN.
ORTHOGRAPHIC, EVEN SOFT LIGHTING FROM THE UPPER LEFT, PLAIN FLAT LIGHT GREY BACKGROUND, NO TEXT.
```

## bodytype v1

```
Neutral human base mannequin, {BODY TYPE: average | broad | slim | elder} build, smooth simple surfaces,
minimal anatomy, plain mid-grey matte material, bald, no clothing details, mitten-like hands, simple feet.
TWO VIEWS SIDE BY SIDE: FRONT AND BACK, A-POSE, ARMS ABOUT 45 DEGREES OUT, PALMS IN, LEGS SLIGHTLY APART.
STYLIZED PROPORTIONS ABOUT {5 | 5 | 5 | 4.5} HEADS TALL.
ORTHOGRAPHIC, EVEN SOFT LIGHTING, PLAIN FLAT LIGHT GREY BACKGROUND, NO TEXT.
```
