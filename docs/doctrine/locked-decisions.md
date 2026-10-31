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

Consequence: the contract's "approximately 96×144" human frames become 48×72
art-pixel frames. All exact canvases and anchors live in
`art/source/forge/spec/render_spec.json`.

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
kit. A full runtime paper doll for clothing is out of scope for v1.

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

Every human uses the **Quaternius Universal Animation Library (UAL)** humanoid
skeleton (CC0), so the shared animation library applies without retargeting.
Creatures use a small set of per-class skeleton templates (quadruped,
mushroom-biped, winged, shelled, serpentine) defined by the forge.

## L7 — Director-only approval

Only the director moves an asset to `director-approved`. Automated QA and agents
can reach `candidate` at most. Runtime exports under `art/source/exports/`
change only after an approval record exists in
`docs/team/comms/director/approvals/`.
