# First Aqualia proofs: changes requested before bulk production

Reviewed art [PR #2](https://github.com/huytruong1810/Vibe/pull/2), commit
`1cd8f820dffe414d2aa8a6e363bc5875373ddf42`, in a detached worktree. Engineering
draft integration is [PR #1](https://github.com/huytruong1810/Vibe/pull/1).
These are source proof references; runtime visual approval remains pending.

## Inspected delivery

| File under `art/source/proofs/` | Actual export             | Findings                                                                                                                                                                                                                                                                   |
| ------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aqualia-target-scene.png`      | 1920×1080 RGB PNG, opaque | Canal timber, lanterns, reeds, caustics and dawn palette provide a useful visual direction. The distant horizon and perspective shrink distant buildings; runtime WorldProjection uses an orthographic grid with equal tile size at every depth.                           |
| `player-aqualia-pose-proof.png` | 1376×768 RGB PNG, opaque  | Four labeled views show the teal hair, shell pin, poncho and necklace consistently. Individual transparent 96×144 frames and their foot registration were not supplied. The harpoon is a prop proof; it cannot grant an extra carried tool slot or redefine a combat move. |
| `rivallie-pose-proof.png`       | 1376×768 RGB PNG, opaque  | Front/back, side and diagonal views exist. The long dragon-like side profile needs reconciliation with the established rounded, otter-like portrait muzzle and body. The printed `48px` brackets are not runtime source dimensions or anchor metadata.                     |

The art source manifest contains zero frames, appearances, clips or portraits.
`check:assets` therefore validates the unchanged prototype runtime bundle. It does
not validate the three new proof images as renderable actors. HD coverage remains
0/19 actor appearances and the required animation matrix remains unmet.

## Next proof revision

1. Submit an Aqualia layout proof using the actual 1920×1080 camera coverage,
   64-pixel grid, orthographic feet/elevation projection and a 96×144 player
   silhouette. Include traversable roads, service points and entrances. Keep
   bridges on the existing single walk-surface model; show explicit ramps where
   elevation changes. Preserve the canal palette without introducing a horizon
   or traversable floors beneath the bridge.
2. Export the four player proof poses as separate transparent, untrimmed 96×144
   PNGs at authored production resolution. Supply source IDs, canonical origin
   `aqualia`, consistent ground anchors, canvas bounds and a 1× registration
   preview. Maintain the diagonal's authored anatomy. Declare any weapon prop as
   an existing carried tool or temporary attack effect; a hero pose does not add
   equipment or a new move.
3. Export four comparable Rivallie poses with an explicit species-appropriate
   untrimmed frame size and one shared ground anchor. Reconcile the portrait and
   sprite anatomy, particularly muzzle, neck/body length, crest and tail. Separate
   swimming effects from body registration; supply a transparent 1× preview.
4. Register the real frames and representative proof clips in
   `art/source/manifest.json`, using canonical IDs and shared schemas. Partial
   proof clips may remain incomplete; structural checks must exercise the supplied
   exports. Keep full matrix gaps visible until production clips exist.
5. Run `assets:build` and `check:assets`, review the 1× registration and facing
   comparisons in the gallery, and attach captures to PR #2. Record actual
   dimensions and distinguish structural validation from the HD completion gate.

The first proof round establishes direction. Hold bulk animation production until
the revised camera, registration and anatomy proof is reviewed. No source images
were resized, cut out, relabeled as HD or merged into runtime by engineering.
