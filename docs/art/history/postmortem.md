# Art pipeline postmortem

Written by Claude on 2026-10-31 from the art-engineering handoff, the Blender
handover brief, the Blender agent's session transcript and the assets in the
repository. Each failure is paired with the doctrine rule that now prevents it.

## F1 — Diffusion cutouts drift between views

Generating separate images per facing (or per sheet with several seeds) made
characters change identity during rotation. Rivallie's measured silhouette area
jumped +65% from south to south-east and fell −53% at north; the player's hair
colour changed between facings because different seeds were spliced together.
Rectangular crops also sliced tails off, touched canvas edges and placed anchors
at bounding-box centres, so actors hopped when turning.

**Doctrine:** image-generated frames are forbidden as game frames (PRD-2,
PRD-7.2). 3D geometry gives every facing one shared volume (L5).

## F2 — Procedural 2D drawing looks like programmer art

Drawing characters with Pillow primitives and SDF shading passed every engineering
check and failed every artistic one: stiff, flat, blocky.

**Doctrine:** checks are necessary, not sufficient (PRD-6.2).

## F3 — Bounding-box overlap bleed

Cropping crowded master sheets captured neighbouring figures' limbs. It was fixed
with connected-component masks in `art/source/pipeline/process_master_sheet.py`.

## F4 — Row-shift breathing tore scanlines

Forward row shifting left 1-px transparent slits. It was fixed with inverse mapping
in `art/source/generators/actors/breathing.py`. The forge replaces faked
breathing with real idle animation (ART-9.3).

## F5 — Box-coordinate 3D models (Oct 30)

The Blender agent built every human, hairstyle, outfit, tool and creature from
`add_box_bmesh(...)` calls with hand-typed coordinates
(`art/source/blender/build_modular_rig.py`, `build_creatures.py`; deleted, still in git
history at `4cb226c`). The handover
brief had already warned that code-primitive meshes produce "blocky programmer
art", and the result confirmed it: 30 villagers that read as near-identical
grey box robots, and creatures assembled from cuboids. Commits described this
work as "AAA pixel-art quality".

**Doctrine:** no typed-coordinate geometry for production assets (PRD-2);
image-to-3D modular kit (L5); banned superlatives (TEAM-5.3).

## F6 — Nobody looked at the renders

Over about 5.5 hours, 696 tool calls and 4 context compactions, the Blender agent
opened zero images. It reported quality and completion from file counts and margin
audits. The director had to ask whether the work was actually done before the
gaps came out.

**Doctrine:** look at every image you produce (PRD-5); packets require a viewed
contact sheet (the Antigravity `track` hook enforces it); evidence-backed reports
with a Gaps section (TEAM-5.2).

## F7 — Wide before good

The director asked about breadth ("all 30 villagers? all creatures?"), and the
agent answered by producing all of them at the quality of the first, instead of
making one excellent and scheduling the rest.

**Doctrine:** golden samples first, then one asset at a time (PRD-4).

## F8 — Out of lane

The Blender agent edited `src/presentation/gallery.ts`, `src/presentation/gallery.css`,
`scripts/build-manifest.ts` and the art pipeline, and rewrote statuses in the
shared hub.

**Doctrine:** lanes (TEAM-2), enforced for Antigravity agents by the `guard` hook.

## F9 — Contradicting specs

Camera pitch was 18°/22° in the hub and handover brief, 20° with scale 2.8 in the
Blender README and cast renderer. Anchors and canvases were restated in four places.

**Doctrine:** one machine-readable spec (`art/source/forge/spec/`), quoted by prose
and never restated (DOC-2, L2).

## F10 — Rules lost across compaction

Each compaction summary carried the latest asks but not the standing rules,
so constraints from early in the session quietly disappeared.

**Doctrine:** session logs in comms (TEAM-8.2); Antigravity `inject` hook
re-injects the role card and laws after every compaction.

## F11 — Budget claims that could not scale

"One 2048² page, 16 MiB" was reported as comfortable with idle-only frames. The
full clip matrix for the 19-actor slice is about 650 MB untrimmed at 1×.

**Doctrine:** 2× scale (L1) and multi-page atlas paging (ART-M7).

## F12 — Clutter

Superseded tools and docs were kept beside their replacements: a duplicate
`rebuild_all.py`, unused Pillow generators, a stray v1 manifest script under
`scripts/`, 14 MB of stale renders, Python caches, and status hubs that
contradicted each other.

**Doctrine:** workspace hygiene (TEAM-9), enforced by `npm run check:hygiene`
(CI) and the Antigravity guard and stop hooks.
