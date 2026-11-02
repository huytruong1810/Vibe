# Worldforge: authored map tooling (C6)

Worldforge builds a native LDtk 1.5.3 project from the pinned vendored schema and
the existing world contract. It is offline authoring tooling. C7 will load the map
into the game; this milestone does not change simulation, saves or new-game entry.

## Commands and ownership

Use `uv run --project art/source/forge python art/source/world/tools/worldforge.py`.
The CLI preserves `plan check` / `plan render` and adds:

| Command                                          | Behavior                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `doctor`                                         | Verify imports, pinned schema digest and protected plan.                                          |
| `next --region aqualia --level aqualia_village`  | Identify missing authoring, checks or review evidence.                                            |
| `new aqualia`                                    | Create both planned levels, refusing overwrite.                                                   |
| `example aqualia`                                | Emit the initial inspectable golden-village pass when absent.                                     |
| `apply <pass.json>`                              | Check the expected base, validate a cloned edit, then replace atomically under an exclusive lock. |
| `check --region aqualia [--level …]`             | Write objective findings and composition measurements; hard failures return nonzero.              |
| `render --region aqualia --level …`              | Render an overview and 960-by-540 art-pixel screen crops.                                         |
| `packet --region aqualia --level … --revision 1` | Create a new candidate packet after current QA, render inspection and replay gates.               |

Agents edit pass files, not the LDtk project. The director retains direct editor
access. Source plans, world meanings and LDtk schema stay unchanged in C6.

## Pass contract

```json
{
  "version": 1,
  "id": "example-edit",
  "region": "aqualia",
  "level": "aqualia_village",
  "baseDigest": "<SHA-256 of canonical current project>",
  "operations": [
    {
      "op": "paint",
      "layer": "ground",
      "value": 1,
      "shape": { "kind": "rect", "rect": [0, 0, 2, 2] }
    }
  ]
}
```

Canonical JSON uses sorted keys, two-space indentation, UTF-8 and a final newline.
`apply` prints the new digest. Each pass names its expected base, preventing stale
replays; unique placement IDs derive UUIDv5 identities independently of array order.
The golden example is built only by replaying committed passes.

- Paint supports integer rectangles, finite polygons/circles and piecewise-linear
  splines with width. Rasterization tests tile centers. Spline ends may meet level
  edges; their coverage is clipped to that level.
- Place supplies `id`, `entity`, `at`, optional tile `size` and schema-defined
  `fields`. LDtk point field values use `{cx,cy}`. Constrained string values remain
  native LDtk strings, validated against the world contract by worldforge.
  `replace: true` explicitly replaces an existing same-kind placement while
  retaining its identity; duplicates without that flag and absent replacements fail.
- Scatter supplies `id`, `shape`, integer `seed`, `density` in 0..1, minimum
  `spacing` in tiles and an `asset`. It creates only nonblocking Decor, preserves
  semantic approaches and paths, and uses a spatial grid for distance checks.
- An invalid pass changes neither the project nor its previous authoring receipt.
  Locks fail closed; operators inspect the owner before removing abandoned locks.

## QA and review semantics

Required layers, identifiers, references, footprints, door approaches, spawn
access, villager anchors, subjects, landmark tolerance, story windows, bridge
surfaces and depth evidence are hard gates. Navigation is cardinal, matching
`TerrainNavigation`; no diagonal shortcuts are introduced. Python and TypeScript
share traversal fixtures. Fixtures are embedded inside the engine's outer safety
border; level-local map coordinates are not a new runtime boundary policy.

Doors are walkable approach tiles outside solid building footprints. Human
swimming eligibility and dry-foot service access are separate: map QA requires
the essential service network to work without swimming. Boardwalk/bridge are
walk surfaces above authoring water; the later importer must retain that meaning.

Density is reported per zone as decoration count per 100 tiles, solid fraction
and walkable fraction. It is not an invented aesthetic score or approval gate.
Depth evidence may include labeled foreground placeholders until C10 art exists.
The rendered images expose collision and elevation, rather than concealing them.

The example authors only the 90-by-68 village. By itself it leaves the 120-by-68
Riverlands unfinished, and full-region QA must reject that draft. The subsequent
`003-riverlands-layout.json` supplies a separate region candidate. Scoped village
checks still exclude Riverlands; they do not certify it.

The 30-by-17 screen grid spans 960-by-544 art pixels. Reference viewport crops are
960-by-540, so the last four vertical pixels fall outside each viewport. Actual
compatible atlas art is used where available; other objects are semantic previews.

Packets bind the project, plan, code, dependency lock, font, content IDs and preview
atlas bytes. Every render needs a matching inspection sidecar. Changes invalidate
the corresponding QA/render/inspection evidence. `packet.json` is written last and
binds the included files; a partially written folder is not a complete packet.
No packet or inspection receipt modifies director approvals or gameplay artwork.

C6b reads collision flags, deck membership and elevation values from the shared
contract through `TerrainSemantics`; the example pass uses named content lookups.
Zero remains the contract's empty value. Re-numbering test fixtures verifies that
walkability does not depend on today's numeric IDs. A negative integration test
writes a blocking pass, runs CLI `apply` then `check`, and repairs it through a
second pass without touching the shared project.

New world packets use manifest format 2. `source` records the canonical LDtk path
and SHA-256; the large project is not copied into each packet. The included pass
sequence reconstructs the same source digest. Historical format-1 packets remain
unchanged. Packaging revisions preserve the map digest; they do not expand the
approved layout scope to dressing or production artwork.

`next` reads protected director records for an exact source digest, asset and
layout scope. When that layout already has approval and QA passes, it directs the
author to unfinished levels instead of requesting a repeat layout export. This is
operator guidance, never an approval writer or a runtime activation permission.

## Verification

```text
python -m uv run --project art/source/forge python -B -m unittest discover -s art/source/world/tools/worldlib -p worldforge_selftest.py
node --test .agents/hooks/test/hooks.test.mjs
npx tsx scripts/check-packets.ts
npm run check
npm run test:browser
```

The creature checks verify all registered frame hashes, dimensions and socket/anchor
registration. Browser tests load all supplied facings of representative states.
These are technical checks; the director's records and runtime approval ledger
remain separate. See [ADR 020](decisions.md#adr-020--offline-world-authoring-and-scoped-review).

## C7 candidate compiler and domain loader

```text
npm run check:world -- --region aqualia --level aqualia_village
npm run world:build -- --region aqualia --level aqualia_village
```

Both commands first run the pinned official-schema validation and worldforge QA.
Omitting `--level` requests full-region validation. The received Riverlands pass
now permits candidate compilation of both levels (219 placements). A deliberately
unfinished region still fails QA. A scoped success excludes Riverlands explicitly;
neither success is map approval or permission to activate the playable game.

For read-only validation of a fixture or other candidate, use
`check:world -- --region aqualia --project <file.ldtk>` or
`worldforge.py check --region aqualia --project <file.ldtk>`. Alternate projects
cannot be built to the canonical output. Their QA receipts are isolated under
`world/work/validation/<project-digest>/<scope>/`; canonical map/inspection receipts
are not overwritten. Other authoring commands do not accept this override.

Regression tests replay the first two explicit passes for historical village-only
approval and unfinished-region cases, while a separate round-trip test replays
all current passes against the live project. Importer rejection uses a temporary
copy with Riverlands deliberately cleared, independent of the artists' progress.

The build writes canonical JSON atomically under ignored
`art/source/world/work/import/`. Check mode validates in memory without replacing
that output. Failed validation preserves an earlier bundle. Source and plan bytes
are checked before and after QA so edits during validation require a retry.

`CompiledWorld` format 1 is separate from save/content versions. It contains the
selected level bounds, numeric channels, legends, stable entity identities and
fields. Provenance binds normalized source semantics, the protected contract and
plan, and importer/loader dependencies. Source digest describes compiled semantics,
not LDtk editor formatting; source record ordering does not change the bundle.
Unknown values, malformed fields, unresolved references, duplicate identities and
overlapping resources are rejected. Omitted resource quantities become three.

`AuthoredWorldLoader.load(unknown)` validates the bundle and returns a new
`ChunkStore`, its normalized definition and presentation channels. It performs no
I/O or random generation. The definition retains all 152 current village placements,
including ten buildings and every villager anchor. Building footprints, doors and
settlement ownership remain normalized records; they are not coerced into the
legacy `Building`/`SceneRegistry` assumptions. Adapting those consumers belongs to
activation. Integer tile points are converted once from local to world coordinates;
`authoredInteractionPosition` derives centered positions without rewriting them.

Coverage uses exact LDtk coordinates, including zero. World gaps are solid void;
there is no importer-added border or coordinate shift. Negative positions,
overlapping levels and extents beyond 512 by 512 tiles are rejected. Existing
generated worlds keep their original outer border. Neighboring authored levels
can connect directly across their shared edge. Canopies and decoration never add
implicit collision.

Ground, water, path, surface, water depth and deck channels remain separate from
effective traversal fluid. A bridge keeps its underlying water and becomes dry
for movement. Material and fluid values come from the protected contract. No
LDtk auto-layer tiles influence gameplay. The loader derives cardinal distances
over covered tiles, including across level seams, without treating obstacles as
climate barriers: drainage = distance to authored water, coast distance = distance
to saltwater, moisture = `clamp(1 - drainage / 16)`. Unreachable/no-source distance
is 262,144 tiles (one past the longest possible simple path). Biome temperature baselines in enum order are 0.60, 0.65, 0.55,
0.30, 0.70, 0.90 and 0.65. Distances are linear-time multi-source BFS; loading is
linear in tile and placement counts with bounded 512-square channel allocations.

Directive 006's C5 and village-layout records were integrated from `e0ca66c` via
normal merge history. C6b opens the world-authoring lane. Runtime activation still
requires reviewed Riverlands/routes, authored forage
resource nodes (the current village contains none), and adapters for settlements,
services, schedules, habitats, scenes and presentation. It then requires version
bumps, explicit rejection of old generated-world saves, browser journeys and an
authored-world soak. The current bootstrap, saves and version constants are unchanged.
See [ADR 021](decisions.md#adr-021--candidate-authored-world-compilation).
