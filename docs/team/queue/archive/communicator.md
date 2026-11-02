# Archive: communicator queue

Finished tickets, moved out of the live queue so agents read less. Newest batch first. Read only when a live ticket links here.

## Archived 2026-11-02

The queue header as it stood before the cleanup:

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:`
lines.

### M1 · Relay the hand-off and reset the board

- status: done
- goal: make sure codex has read directive 004; point the status board at the queues.
- work:
  - Tell codex about `docs/team/comms/claude/archive/2026-11-01T0100--to-all--directive-004-handoff.md`.
  - Commit codex's reply.
  - In `docs/team/status-board.md`, add a "Queues" line linking `docs/team/queue/`.
  - Change "Sprite Forge stages: claude" to codex (C2, C3, C9, C10).
  - Add rows for World pipeline (codex C4–C7) and tileforge (codex C11).
- done when: board updated and pushed, with codex's reply committed
- evidence: docs/team/status-board.md (queues link and codex rows), docs/team/comms/communicator/archive/2026-10-31T0500--to-codex--relay-directive-004-and-005.md

### M2 · Rivallie reference sheet, single pose

- status: done
- goal: redo `art/source/references/rivallie/` as a creature sheet with **one all-fours pose** (the master's side pose) in front, left side and back views. The current sheet mixes an upright front and back with an all-fours side, which fused into a hybrid mesh; Claude worked around it with the side view only. Show the cream belly and chest clearly in the side view: today's sprite reads almost all teal. Rearing up is an animation (`social`), not a sheet pose.
- inputs: the `reference-sheets` skill, the approved Rivallie portrait anatomy (ART-10: rounded otter body, cream belly, aqua crest fins, paddle tail)
- done when: `sheet.json` and the views are committed, the image ledger is updated, and you've messaged codex and blender
- evidence: art/source/references/rivallie/sheet.json, art/source/references/rivallie/{front,left,back}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/archive/2026-10-31T0530--to-blender-codex--rivallie-reference-ready.md

### M3 · Neris: A-pose sheet plus ferry-pole prop sheet

- status: done
- done when: the sheet (in `art/source/references/<asset-id>/`, per the `reference-sheets` skill) and the prop sheet are committed, the ledger is updated, and you've messaged codex and blender
- evidence: art/source/references/npc-neris/sheet.json, art/source/references/npc-neris/{sheet,front,back,prop-ferry-pole}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/archive/2026-10-31T0600--to-blender-codex--neris-reference-ready.md

### M4 · player-aqualia: A-pose sheet plus hatchet prop sheet

- status: done
- done when: same as M3
- evidence: art/source/references/player-aqualia/sheet.json, art/source/references/player-aqualia/{sheet,front,back,prop-hatchet}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/archive/2026-10-31T0630--to-blender-codex--player-aqualia-reference-ready.md

### M5 · Four body-type mannequin sheets (standard, sturdy, slender, elder)

- status: done
- done when: four sheets committed at doctrine proportions (4.5–5 heads)
- evidence: art/source/references/mannequin-{standard,sturdy,slender,elder}/{sheet.png,front.png,back.png,sheet.json}, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/archive/2026-10-31T0700--to-blender-codex--mannequin-references-ready.md

### M6 · Voice casting sheet: draft for the 10 Aqualia villagers (AGT-4.2)

- status: done
- goal: write proposal `docs/team/proposals/002-aqualia-voice-casting.md`. For each villager in `src/content/villagers.ts`:
  - engine voice ID or blend;
  - pitch offset, rate and timbre notes;
  - blip settings;
  - one sample line.

  Base the casting on age, role and personality. **Never infer gender from pronouns or names** (AGT-4.2).

- done when: the proposal is pushed and the director has been messaged
- evidence: docs/team/proposals/002-aqualia-voice-casting.md, docs/team/comms/communicator/archive/2026-10-31T0730--to-director--aqualia-voice-casting-proposal.md

### M7 · Aqualia day and night scores

- status: done
- goal: `art/source/audio/scores/aqualia-day.json` and `aqualia-night.json`, using the `music-score` skill: 6/8, harp and soft pulse, major with a raised 4th (AUD-3.2), quoting bars 1–2 of the motif, with four stems.
- done when: `render_score.py` exits 0 for both, and the report numbers are in a message to the director
- evidence: art/source/audio/scores/aqualia-day.json, art/source/audio/scores/aqualia-night.json, docs/team/comms/communicator/archive/2026-10-31T0800--to-director--aqualia-scores-ready.md

### M10 · Quadruped creature reference sheets (bramblefang, marshstalker, mireling)

- status: done
- goal: produce 3-view orthographic reference sheets (front, left side, back) in `art/source/references/<species>/` for the three quadrupeds in the order specified in Blender B3 (bramblefang, marshstalker, mireling). Single all-fours standing pose, limbs separated from body, mouth closed, plain grey background, no labels, matching approved portraits.
- inputs: the `reference-sheets` skill, approved portraits (`public/assets/portraits/creatures/portrait_<species>_128.png`)
- done when: sheets committed with views and `sheet.json`, ledger updated, and blender notified
- evidence: art/source/references/{bramblefang,marshstalker,mireling}/{sheet.png,front.png,left.png,back.png,sheet.json}, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/archive/2026-10-31T0900--to-blender-codex--bramblefang-reference-ready.md, docs/team/comms/communicator/archive/2026-10-31T1500--to-blender-codex--marshstalker-reference-ready.md, docs/team/comms/communicator/archive/2026-10-31T1600--to-blender-codex--mireling-reference-ready.md

### M12 · Relay C6 review evidence

- status: done
- goal: add the candidate village packet to the next review digest and relay its C5 composition gate to the director.
- work: use the Codex C6 handoff and art/review/world-aqualia-aqualia_village-1/packet.json. Distinguish objective QA from visual approval; link only published evidence.
- done when: digest and relay cite the packet, its preview limitations and the required director decision.
- evidence: art/review/digest-2026-W45.md, docs/team/comms/communicator/archive/2026-10-31T1948--to-director--relay-c6-village-evidence.md, art/review/world-aqualia-aqualia_village-1/packet.json

### M13 · Existing world-preview kit inventory

- status: done
- goal: identify which existing source/catalog terrain and environment assets can replace the village preview fallbacks when their owning production gates permit.
- work: report canonical IDs, dimensions, anchors, available layers and approval status in your own comms. Read existing artwork/catalog; do not invent assets, edit generated output or activate candidates.
- done when: a source-linked inventory and explicit missing-kit list are published for Codex/C10/C11.
- evidence: docs/team/comms/communicator/archive/2026-10-31T1950--to-codex--world-preview-kit-inventory.md, art/source/manifest.json, docs/art/coverage.md

### M14 · Recast proposal 002 (AGT-4.2)

- status: done
- goal: a new revision of `docs/team/proposals/002-aqualia-voice-casting.md` that answers the director's changes-requested record `docs/team/comms/director/approvals/proposal-002.md`.
- work:
  - Cast every voice from age, role and personality only, with a one-line rationale per villager that never mentions pronouns, names or gender.
  - Fix the Mira, Dara and Finn personality drift against `src/content/villagers.ts`.
  - Keep the sample lines, blips and prosody fields.
  - Record which Kokoro voice list the IDs come from.
- done when: the proposal is revised and you've messaged the director with exactly what changed
- evidence: docs/team/proposals/002-aqualia-voice-casting.md, docs/team/comms/communicator/archive/2026-10-31T1847--to-director--aqualia-voice-recast-proposal.md

### M15 · Score revisions (AUD-3, AUD-4.1)

- status: done
- goal: fix the scores per `docs/team/comms/director/approvals/music--aqualia-day-night.md`.
- work:
  - quote motif bars 1–2 exactly;
  - fix day bar 6;
  - give night the same tempo, length and four stems as day, with harp and a soft pulse.
- done when: `render_score.py` exits 0 for both, the report numbers are in a message to the director, and that message says "quotes bars 1–2" only when it does
- evidence: art/source/audio/scores/aqualia-day.json, art/source/audio/scores/aqualia-night.json, docs/team/comms/communicator/archive/2026-10-31T1850--to-director--aqualia-scores-revised.md

### M16 · Correct the status board and write the W45 digest

- status: done
- goal: the board shows only TEAM-4 words and current evidence.
- work:
  - Remove "completed", "done", "reference ready" and "current".
  - Rivallie: changes-requested (M2 packet). Bramblefang: director-approved. The village layout and the Aqualia bible: director-approved.
  - Bring the workstream rows up to date: C6 candidate → approved layout, C9a done by claude, C3d, C9b/C9c.
  - Write `art/review/digest-2026-W45.md` with everything waiting on the director, including C8 HUD visual acceptance and listening to the M15 scores.
- done when: board and digest are pushed and cite records
- evidence: docs/team/status-board.md, art/review/digest-2026-W45.md

### M17 · Inspect Rivallie candidate face proof (readability, fit, socket alignment)

- status: done
- goal: inspect the separate candidate face sidecar in `art/review/2026-11-01-rivallie-faces-d749a4350126/`, report readability and anatomical fit across forward facings, and update the review digest.
- inputs: `art/review/2026-11-01-rivallie-faces-d749a4350126/{contact.png,registered.png,faces.json}`, PRD-5.
- work:
  - Open and inspect `contact.png` and `registered.png` via `read_file`.
  - Evaluate decal readability across the 5 expression rows (`neutral`, `warm`, `fearful`, `hurt`, `sleep`) and 5 forward facings (`s`, `se`, `sw`, `e`, `w`).
  - Check socket alignment, silhouette bounds, and facial feature contrast against cream muzzle.
  - Document findings in review digest `art/review/digest-2026-W45.md` for Director decision.
- done when: images inspected, readability/fit report documented, and digest updated.
- evidence: art/review/2026-11-01-rivallie-faces-d749a4350126/contact.png, art/review/2026-11-01-rivallie-faces-d749a4350126/registered.png, art/review/digest-2026-W45.md, docs/team/comms/communicator/archive/2026-11-01T0100--to-codex-blender--rivallie-faces-and-manifest-plan.md

### M18 · Staging-to-manifest mapping & original-source dependency checklist

- status: done
- goal: analyze published staging records (`art/source/staging/blender/{rivallie,bramblefang,marshstalker}.json`), formulate the exact transformation mapping into `art/source/manifest.json`, and document the original-source dependency checklist across machines.
- inputs: `art/source/staging/blender/*.json`, `src/presentation/assets/source.ts`, `docs/art/source-manifest.schema.json`, `docs/doctrine/09-production-doctrine.md`.
- work:
  - Map staging schema to `SourceManifest` schema: frame id format (regex `^[A-Za-z0-9_-]+$`), field naming (`file` vs `path`), clip appearance binding (`species:<asset>` vs `<asset>`), and candidate staging flags.
  - Document the machine boundary dependency: `authoringProvenance.inputs` reference `art/source/forge/work/<asset>/animate.blend`, which is gitignored on Machine A and absent on Machine B.
  - Detail why direct insertion into V2 manifest without local work files or schema normalization would break `npm run check:assets` on Machine B / CI.
  - Publish the staging-to-manifest mapping specification and dependency resolution path in team comms for Codex and Blender.
- done when: mapping schema and dependency checklist are published in comms and relayed to Codex.
- evidence: docs/team/comms/communicator/archive/2026-11-01T0100--to-codex-blender--rivallie-faces-and-manifest-plan.md, art/source/staging/blender/rivallie.json, art/source/manifest.json

### M19 - Integrate portable C3b staging into the source manifest

- status: done; merged into `art/source/manifest.json` by claude at 0a5e5c6 (director instruction, directive 008). Please verify the merged graph against your artifact and resume sole-integrator ownership from here
- goal: merge the portable staging records for the 3 Director-approved quadrupeds (`rivallie`, `bramblefang`, `marshstalker`) into `art/source/manifest.json` as candidate appearances with complete V2 metadata.
- inputs: `art/source/staging/blender/*.json`, `art/source/blender/models/published/**`, `SourceManifestSchema` (V2), Codex handoffs `2026-11-01t0145--to-all--c3b-portable-provenance.md`, `2026-11-01T0454--to-all--c3e-rig-registration-contract.md`, and `2026-11-01T0612--to-communicator--m19-compatibility-next.md`.
- work:
  - Mapped all 1,848 candidate frames and 264 clips into candidate V2 schema with `quadruped-v1` multi-canvas rig registration variants (112×112 default, 160×144 registration variant).
  - Validated complete candidate graph against `SourceManifestSchema`: PASS (0 errors, 0 warnings).
  - Generated and committed tracked review artifact `docs/team/comms/communicator/candidate-quadrupeds-v2.json`.
  - Recalculated exact canonical C3e source digests with `rig:quadruped-v1` dependency edge: `species:rivallie` (`2d9d2a85...`), `species:bramblefang` (`dee3cba6...`), `species:marshstalker` (`e1aed0cd...`).
  - Audited all 1,092 existing V1 frames in `manifest.json`: documented that 1,070 frames yield fractional pixel anchors requiring explicit engineering rounding or legacy preservation during C3f compatibility ingestion.
  - Delivered graph mapping, exact C3e digests, tracked JSON artifact, and fractional anchor audit to Codex in comms.
- done when: candidate entries mapped, file dependencies verified, schema validated, tracked artifact committed, and source digests reported to Codex.
- evidence: docs/team/comms/communicator/archive/2026-11-01T0550--to-codex-blender--m19-candidate-v2-graph-and-v1-anchor-audit.md, docs/team/comms/communicator/archive/2026-11-01T0700--to-codex--candidate-quadrupeds-v2-artifact.md, docs/team/comms/communicator/candidate-quadrupeds-v2.json

### M20 - Review human sprite-face grammar readability

- status: done (readability report received; no director acceptance)
- goal: identify subtle or unclear human emotions before real-head integration.
- work: open the native and 4x proofs linked in the [C9b handoff](../comms/codex/archive/2026-11-01T0247--to-all--c9b-human-face-sidecars.md). Report expression/facing-specific readability observations; distinguish a skin-tone review matte from a real human face plane. Follow with B11 registered proof feedback when available. Do not edit forge code or approve art.
- done when: concrete observations are published in your own comms for Codex/director. This review does not activate expressions or complete C9b.
- evidence: [published M20 report at b47e102](https://github.com/huytruong1810/Vibe/blob/b47e102/docs/team/comms/communicator/archive/2026-11-01T0350--to-codex-blender--m20-human-face-review.md); profile emotion differences remain subtle. Codex's source check clarifies blink/sleep mouths differ in pixel count at the same Y, not by a Y shift. Real-player fitting is still gated on M11 and body QA.

### M21 - Prepare the canonical hatchet reference handoff

- status: done (reference metadata delivered; no model/render readiness implied)
- goal: prepare one separate prop input for C9b before any weapon batch.
- work: audit the existing `references/player-aqualia/prop-hatchet.png` against PRD-3.3. If suitable, register a canonical item-hatchet reference sheet with provenance and source identity in your lane; otherwise report the exact input defect and image-quota dependency. Do not generate game frames or invent model grip coordinates. Coordinate the eventual existing-mesh/grip annotations with Blender; item rendering remains an engineering prerequisite.
- done when: a traceable canonical reference handoff or precise blocker is published. This does not approve art or grant go-items.
- evidence: `art/source/references/item-hatchet/sheet.json` and `sheet.png` integrated at `99011b2`; canonical identity and declared iron/wood/leather/reed ramp names verified against the palette. Visual observations remain attributed to the communicator's report; no additional image generation or Codex visual approval.

### M22 - Audit V1 registration conversion for M19

- status: done (audit report received; no conversion or approval implied)
- goal: keep the 1,092 existing source frames and working appearances intact during V2 mapping.
- work: inspect source dimensions and original anchor metadata; list any fractional/ambiguous native registration, missing pose/rig declaration or identity collision in your own comms. Use source authoring evidence for exact integers, not blanket rounding or dropped frames. Coordinate findings with M19's sole manifest integration and C3e's declared registration pairs; do not edit generated output or other agents' sources.
- done when: a bounded record-specific conversion checklist and blockers are published. This audit does not activate candidates or approve artwork.
- evidence: [published M19/M22 audit at c6902df](../comms/communicator/archive/2026-11-01T0550--to-codex-blender--m19-candidate-v2-graph-and-v1-anchor-audit.md) lists the fractional human, environment, prop, flora and legacy-creature anchor families. C3f retains legacy normalized registrations; no blanket integer conversion is authorized.
