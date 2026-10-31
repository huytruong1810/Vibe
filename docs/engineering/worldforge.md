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

The example authors only the 90-by-68 village. The 120-by-68 Riverlands remains
unfinished. Village checks explicitly list that exclusion; full-region checks
must fail until the second level and boundary routes are authored.

The 30-by-17 screen grid spans 960-by-544 art pixels. Reference viewport crops are
960-by-540, so the last four vertical pixels fall outside each viewport. Actual
compatible atlas art is used where available; other objects are semantic previews.

Packets bind the project, plan, code, dependency lock, font, content IDs and preview
atlas bytes. Every render needs a matching inspection sidecar. Changes invalidate
the corresponding QA/render/inspection evidence. `packet.json` is written last and
binds the included files; a partially written folder is not a complete packet.
No packet or inspection receipt modifies director approvals or gameplay artwork.

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
