# Locked decisions

These decisions were made by the director on 2026-10-31 on Claude's
recommendation. They are expensive to reverse, so every downstream document,
script and asset assumes them. Re-opening one requires a director amendment.

## L1 — 2× pixel scale

One art pixel is drawn as a 2×2 block of screen pixels at the 1920×1080 reference
viewport. The native art resolution is **960×540**. A terrain tile is **32×32 art
pixels**, displayed at 64×64 screen pixels, so world coordinates, collision and
navigation are unchanged.

Rationale: the target scene and 2D masters already read as chunky pixel art. The
games whose look we are chasing (Eastward, Sea of Stars, Stardew Valley) all
upscale a low native resolution by an integer factor rather than drawing 1:1 at
1080p. 1:1 at 1080p reads as "HD sprite" rather than pixel art, quadruples the
per-frame cleanup surface, and makes the full clip matrix about four times
larger in memory (about 650 MB untrimmed for the 19-actor slice at 1×, against
about 160 MB at 2×).

Consequence, reconciled with asset contract v2: art is **authored** at art-pixel
resolution and **exported** with exact 2× nearest-neighbour upscaling to the
contract's display canvases. A human is authored at 48×72 with anchor (24,66) and
exported at 96×144 with anchor (48,132), exactly the contract's human rig. Creatures
use the class canvases in the spec (Rivallie: `creature.medium`, 56×56 at (28,41), exported
at 112×112 with anchor (56,82)).
One elevation step is 16 display px, which is 8 art px. Every exported pixel is
part of a uniform 2×2 block; a lone display pixel is a mixel defect. All exact
canvases and anchors live in `art/source/forge/spec/render_spec.json`.

## L2 — One camera for every 3D-baked asset

All 3D-baked assets (humans, creatures, props, buildings, trees) use one
orthographic camera at **30° elevation** above the horizon, looking north. Mixed
camera pitches inside one scene are the most common reason 2.5D art looks pasted
together. The old 18°, 20° and 22° values are void.

Environment assets placed on the grid also get a **depth stretch** of
1/sin(30°) along world Y before rendering. This makes building footprints match
the top-down 32-px grid, while walls keep a cos(30°) vertical foreshortening:
the classic oblique RPG look. Actors are not depth-stretched.

## L3 — Human proportions: 4.5–5 heads

Adult humans are 4.5–5 head-heights tall: stylized, elegant, adult-looking, with a
face large enough to carry expressions and readable combat poses. The current 2D
masters (about 6.5 heads) remain **identity references** (colours, costume,
silhouette, props, personality). They are not proportion references.
Character sheets are regenerated at doctrine proportions (PRD-3).

## L4 — Hybrid layered sprites

- **Baked per character:** body, skin, outfit and hair.
- **Runtime layers:** the face/expression decal and the held items (the two hand
  slots), placed at per-frame anchors the bake exports, with a per-facing
  in-front/behind flag.

Expressions and any carried tool therefore cost no rebake. Gear is reusable
across characters because outfits and props are separate 3D parts in a shared
kit.

Reconciled with engineering's equipment system (six worn slots: head, torso,
hands, legs, feet, back) and contract v2 `LayerSet`s: a garment slot that
gameplay can change at runtime (the player's equipment, and any villager slot
engineering makes equippable) is exported as a **runtime garment layer** on the
shared rig. Slots that never change for an actor stay baked into its body layer.
Face and held layers are always runtime layers.

## L5 — Image-to-3D modular kit

3D geometry comes from an open-weight image-to-3D model run locally on the
RTX 5080 (Hunyuan3D-2 multi-view or TRELLIS; a bake-off picks the default),
taking doctrine-standard reference sheets as input. Assets are organized as a
**kit**: a few body types plus a library of parts (hair, headwear, tops,
bottoms, outerwear, footwear, props), combined by character recipes. Agents never
author geometry from typed coordinates (PRD-2).

Licence note: Hunyuan3D-2 ships under the Tencent Hunyuan Community Licence,
which has territory and user-count limits. TRELLIS is MIT. The director confirms
the licence before shipping commercially.

## L6 — One skeleton

Every human uses the **Quaternius Universal Animation Library 2 (UAL2)** humanoid
skeleton (CC0, `Armature`, UE-style bone names) as the master rig, so UAL2 actions
apply directly. UAL1 actions (locomotion) use Rigify `DEF-` names and reach the master
rig only through the forge's fixed bone map (`art/source/forge/spec/bone_maps/`); no
agent retargets by hand. Creatures use a small set of per-class skeleton templates
(quadruped, mushroom-biped, winged, shelled, serpentine) defined in
`art/source/forge/spec/skeletons/`, animated by the forge's parametric clip generator.

## L7 — Director-only approval

Only the director moves an asset to `director-approved`. Automated QA and agents
can reach `candidate` at most. The director's decision is recorded in
`docs/team/comms/director/approvals/`. Codex then transcribes it, bound to the
artifact's exact source digest, into engineering's ledger `docs/art/approvals.json`
(contract v2). That ledger promotes candidates to active gameplay. Codex never
adds a ledger entry without a director record, and no source file self-asserts
approval.

## L8 — One authored world

New games start in a single hand-composed world built in LDtk (WLD). Composition is
set by director-approved region bibles and their plan files; the blender agent lays
maps out only through validated `worldforge` passes against that plan. Procedural world
generation on new game is retired: it prevents the high-investment, composed landscapes
the game is judged by (No Name Village, Zenonia 4). Open-endedness comes from living
minds, ecology and player choice.

## L9 — One font, one UI theme

All text uses **Silver** (Poppy Works, CC BY 4.0) at its native 19 px grid, rendered
without anti-aliasing (UI-7). The UI theme is navy panels with bevelled gold frames and gem
corner bosses, defined in `art/source/forge/spec/ui_theme.json` and built by the UI kit
generator (`art/source/ui/`). Every screen uses these frames, tokens and font.

## L10 — Local AI stack

Villager minds run locally through Ollama with **Gemma 4 26B** as the reference model
(vision included). Voices use the three tiers in AGT-4 (blips, Kokoro, Chatterbox).
Generated imagery is limited to asynchronous decorative paintings (AGT-6). Runtime
combat effects are never diffusion-generated (CMB-9).
