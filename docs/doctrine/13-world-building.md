# 13 — World building

## WLD-1 One authored world (L8)

Hearthwild's world is **hand-composed**, not generated on new game. A breathtaking
landscape (No Name Village, Zenonia 4, Eastward) comes from deliberate composition:
sightlines, framed landmarks, paths that curve toward a reveal, dense set-dressing where
the player lingers. A seeded generator can't promise any of that, and it prevents
investing in bespoke art. Every new game starts in the same authored world; open-
endedness comes from living minds (AGT), ecology and player choices, not terrain.

## WLD-2 Authoring tool and format

- **WLD-2.1** Maps are built in **LDtk** (MIT, open-source level editor for top-down pixel
  art, documented JSON, rule-based autotiling). Projects live in `art/source/world/`.
- **WLD-2.2** Grid: 32 art-px tiles (L1). Layers: ground (autotiled), elevation and
  cliffs, water, paths, decoration, collision, entities (spawns, services, entrances,
  resource nodes, creature habitat regions, ambience emitters, light sources).
- **WLD-2.3** The engine loads LDtk JSON at build time into its world format. Collision,
  routes and entrances come only from the map's collision and entity layers, never from
  decorative art (ART-11.4).

## WLD-3 Composition rules

- **WLD-3.1 Every screen has a subject**: a landmark, a building front, a bridge, a tree
  of note. No screen is empty texture.
- **WLD-3.2 Lead the eye**: paths curve; reveal the next landmark at screen edge.
- **WLD-3.3 Density gradient**: dense, handcrafted detail in villages and story spots;
  calmer, readable ground in fight areas (combat readability first, PIL-2).
- **WLD-3.4 Layered depth**: foreground canopy and roofs (ART-11.1), mid-ground actors,
  background water and cliffs; at least three depth layers on village screens.
- **WLD-3.5 Region identity** follows ART-13. Aqualia may have canals and boardwalks:
  the authored map replaces the old generated geography.

## WLD-4 Who builds it

- **WLD-4.1** The director and Claude write a **region bible** per area: map sketch,
  landmarks, routes, story spots and creature habitats.
- **WLD-4.2** Ground tiles, autotile rules and decoration sprites come from the
  communicator (2D) and the Blender agent (3D-baked buildings, props, trees), all through
  the doctrine pipelines.
- **WLD-4.3** Map layout in LDtk is done by a human (the director) or by Claude. Agent
  edits to map JSON are limited to scripted, validated passes (for example scattering
  decorations inside a painted region), because layout quality depends on taste agents
  can't verify.

## Engineering mandates

| ID     | Mandate                                                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WLD-M1 | Retire new-game procedural world generation. Load the authored LDtk world (build-time import) into the world/chunk format; keep height, ramps and collision semantics. |
| WLD-M2 | Settlements, services, entrances, resources and creature habitats are placed from map entities and regions; population seeding uses habitat regions.                   |
| WLD-M3 | Bump world/content/save versions; old generated-world saves are not migrated (development phase). Tests and soak run on the authored map.                              |
| WLD-M4 | LDtk validation in CI: required layers, entity schema, reachability of all settlements and entrances.                                                                  |
