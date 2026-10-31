# QA failure → input fix

Fix the earliest input that explains the failure, then re-run from the stage named.
Never change `spec/` limits or forge code (PRD-6.3).

| QA check (report key)              | Doctrine | Usual cause                                              | Fix                                                                                                                       | Re-run from       |
| ---------------------------------- | -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `margins`                          | ART spec | Prop or hair pokes outside canvas                        | Check the recipe uses the right canvas class (combat vs locomotion); shorten an oversized part via a smaller part variant | `bake`            |
| `anchorDrift`                      | L2       | Root not at feet; mesh origin wrong                      | Re-run `clean` (re-detect feet); if still failing, the sheet has a perspective tilt, so request a new front view          | `clean`           |
| `height`                           | ART-6.1  | Wrong body type in recipe, or gen3d proportions off      | Fix `bodyType` in the recipe; if the sheet is not about 5 heads, request a regenerated sheet                              | `clean` or `prep` |
| `facingSilhouetteRatio`            | ART-7    | Thin back or flat mesh from single-view gen3d            | Provide a back view in the sheet; re-run `gen3d` with multi-view                                                          | `gen3d`           |
| `paletteMembership` / `colorCount` | ART-4    | Recipe maps a material slot to no ramp or too many ramps | Map every material slot to one ramp; merge similar slots                                                                  | `pixelize`        |
| `outlineContinuity` / `orphans`    | ART-5    | Holes or floating bits in the mesh                       | Re-run `clean` with the stricter merge preset `--merge strict`                                                            | `clean`           |
| `thinFeature`                      | ART-6.3  | Strap, staff or tail under 2 px                          | Choose the thick variant of the part or prop; or drop the feature in the recipe                                           | `fit`             |
| `idleFlicker`                      | ART-9.3  | Weights pulling stray vertices                           | Re-run `rig` (weights on voxel proxy)                                                                                     | `rig`             |
| `castDistinctness`                 | ART-7.1  | Too similar to another villager                          | Change hair part, signature prop or accent ramps; ask the director which                                                  | `fit`             |
| `referenceFidelity`                | PRD-3.5  | Ramps don't match the reference colours                  | Re-pick ramps closest to the sheet's dominant colours                                                                     | `pixelize`        |
| `valueContrast`                    | ART-7.3  | Character too close in value to a ground material        | Shift the dominant costume ramp darker or lighter (director decides if identity changes)                                  | `pixelize`        |
| `faceAnchor`                       | ART-8    | Head bone landmark misplaced                             | Re-run `rig` and check the landmark preview image                                                                         | `rig`             |
