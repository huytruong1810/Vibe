# Engineering response to art handoff dbb40df

This review preserves the external art branch and its source assets. It does not
approve production art or change that worktree. The supported direction is hybrid
authoring: batched masters or Blender models followed by recorded, deterministic
mechanical ingestion. There is no Pillow-only artistic requirement.

## Corrected contract

- The cap is 2048×2048 **per atlas page**. Multiple pages are supported within the
  High/Balanced/Low 512/256/128 MiB resident budgets. Sixteen MiB is the decoded cost
  of one full 2048² RGBA page, not a global hard budget.
- Source-only art PRs should supply masters, models, pinned scripts/configuration,
  provenance, exports and manifest declarations. Engineering regenerates runtime
  catalogs and coverage after integration. Keep the existing multipage code.
- Structural validation and deterministic hashes are evidence for review; neither
  is artistic approval or full animation coverage.

## Observed inventory and coverage

The inspected manifest has **182 source frames**: 48 Aqualia player idle frames,
48 Rivallie idle frames, 44 environment frames and 42 frames across seven villagers
(six south-facing idle frames each). The checked-in runtime catalog has **790
frames**, one 999×1038 page and 4,147,848 decoded bytes (3.96 MiB). It adds 182
source frames and removes 75 replaced legacy frames from the 683-frame baseline.
The handoff's 742-frame header is stale by 48 frames; the current eight-direction
player/Rivallie idle sets each add 24 frames over their earlier four-direction sets.

There are no complete walk/run/combat/needs/defeat sets for the proposed actors.
Replacing the complete legacy appearance with these idle-only proposals would
remove working movement poses. The v2 compiler therefore keeps partial proposals
in review arrays and retains the gameplay fallback, including for v1 HD inputs.

The player idle files contain three distinct PNG byte sequences across six
positions per facing; Rivallie contains two. Held poses in a cycle are not by
themselves an error, but six filenames do not prove six distinct authored poses
or adequate motion quality. The current geometric renders are technical proofs;
native-detail style and identity remain subject to visual review.

## Rebuild and Blender findings

| Finding                                                                                                                                                     | Impact                                                                                                        | Minimal correction                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `rebuild.py --check` creates output/proof directories unconditionally. Python imports can also create bytecode caches.                                      | The advertised check is not strictly read-only.                                                               | Suppress every source-tree write in check mode and run Python with bytecode disabled.                                     |
| `--check --from-masters` performs extraction before the check branch.                                                                                       | It can write cutouts and initialize matting/model downloads while checking.                                   | Reject this flag combination before extraction or imports with side effects.                                              |
| `process_master_sheet.py` imports rembg, SciPy and NumPy eagerly.                                                                                           | Cached-input checks still need the heavy optional authoring dependency stack.                                 | Split lightweight registration from matting and import neural tools only in the explicit extraction command.              |
| Default rebuild always calls `build_player_3d_mesh`, `build_rivallie_3d_mesh` and `render_actor_8way`.                                                      | It does not consume Blender bakes and would overwrite their exported idle frames with procedural mesh proofs. | Make the input mode explicit; ingest immutable committed baked inputs instead of overwriting them with another generator. |
| The Blender models directory contains only `.gitkeep`; no `.blend` model is supplied.                                                                       | A Blender-authored production bake cannot be reproduced or approved from this submission.                     | Supply the actual models plus scripts, material/texture inputs and pose/camera configuration with hashes.                 |
| Blender instructions allow broad “3.x, 4.x, or LTS”; no Python dependency lock was found.                                                                   | Toolchain changes can alter rendered/encoded bytes without a reviewable pin.                                  | Record exact Blender/Python/package versions and dependency-lock hashes.                                                  |
| The bake script selects a named `Armature`, then classifies humans using only `player`/`human` in its name.                                                 | A human root named `Armature`, allowed by the instructions, is classified as Rivallie.                        | Use an explicit validated profile/target argument instead of identity inference from names.                               |
| The bake script does not perform the declared integer ground-root registration.                                                                             | A fixed camera alone cannot demonstrate the prescribed foot anchor for every pose.                            | Validate/register every baked frame against its rig metadata and show anchor overlays.                                    |
| Rebuild compares provenance entry hashes, retaining obsolete entries and checking other metadata only when a hash changes. Missing NPC cutouts are skipped. | A passing check does not establish a complete, exact source/output dependency graph.                          | Validate the expected artifact set, all metadata and required inputs; reject missing or obsolete records.                 |

No source-tree rebuild or bake was executed during this audit. The read-only
checks inspected source, manifests, file hashes and installed package metadata.
Available versions were Python 3.13.12, Pillow 12.1.1, NumPy 2.4.2, SciPy 1.17.0,
rembg 2.0.86, ONNX Runtime 1.31.1 and torch 2.14.0+cpu. These are observations,
not a committed lockfile or proof of byte-identical output on a fresh machine.

## Next reviewable delivery

First make check mode genuinely read-only and select the intended immutable input
pipeline. Supply pinned authoring provenance with the actual master/model and
script dependencies. Declare proposed assets as proof/candidate under contract
v2. Submit the Aqualia scene plus player and Rivallie pose proofs for visual review;
then complete the mandatory motion matrix and identity bindings. Engineering can
compile and validate candidates while preserving existing gameplay. Approval
records remain empty until an explicit review approves the exact source digest.
