# Queue: communicator (machine B)

Read your brief `docs/team/briefs/communicator.md` first. Take the top `open` ticket.
If it's blocked, mark it and take the next. Change only `status:` and `evidence:`
lines.

### M1 · Relay the hand-off and reset the board

- status: done
- goal: make sure codex has read directive 004; point the status board at the queues.
- work:
  - Tell codex about `docs/team/comms/claude/2026-11-01T0100--to-all--directive-004-handoff.md`.
  - Commit codex's reply.
  - In `docs/team/status-board.md`, add a "Queues" line linking `docs/team/queue/`.
  - Change "Sprite Forge stages: claude" to codex (C2, C3, C9, C10).
  - Add rows for World pipeline (codex C4–C7) and tileforge (codex C11).
- done when: board updated and pushed, with codex's reply committed
- evidence: docs/team/status-board.md (queues link and codex rows), docs/team/comms/communicator/2026-10-31T0500--to-codex--relay-directive-004-and-005.md

### M2 · Rivallie reference sheet, single pose

- status: done
- goal: redo `art/source/references/rivallie/` as a creature sheet with **one all-fours pose** (the master's side pose) in front, left side and back views. The current sheet mixes an upright front and back with an all-fours side, which fused into a hybrid mesh; Claude worked around it with the side view only. Show the cream belly and chest clearly in the side view: today's sprite reads almost all teal. Rearing up is an animation (`social`), not a sheet pose.
- inputs: the `reference-sheets` skill, the approved Rivallie portrait anatomy (ART-10: rounded otter body, cream belly, aqua crest fins, paddle tail)
- done when: `sheet.json` and the views are committed, the image ledger is updated, and you've messaged codex and blender
- evidence: art/source/references/rivallie/sheet.json, art/source/references/rivallie/{front,left,back}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0530--to-blender-codex--rivallie-reference-ready.md

### M3 · Neris: A-pose sheet plus ferry-pole prop sheet

- status: done
- done when: the sheet (in `art/source/references/<asset-id>/`, per the `reference-sheets` skill) and the prop sheet are committed, the ledger is updated, and you've messaged codex and blender
- evidence: art/source/references/npc-neris/sheet.json, art/source/references/npc-neris/{sheet,front,back,prop-ferry-pole}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0600--to-blender-codex--neris-reference-ready.md

### M4 · player-aqualia: A-pose sheet plus hatchet prop sheet

- status: done
- done when: same as M3
- evidence: art/source/references/player-aqualia/sheet.json, art/source/references/player-aqualia/{sheet,front,back,prop-hatchet}.png, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0630--to-blender-codex--player-aqualia-reference-ready.md

### M5 · Four body-type mannequin sheets (standard, sturdy, slender, elder)

- status: done
- done when: four sheets committed at doctrine proportions (4.5–5 heads)
- evidence: art/source/references/mannequin-{standard,sturdy,slender,elder}/{sheet.png,front.png,back.png,sheet.json}, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0700--to-blender-codex--mannequin-references-ready.md

### M6 · Voice casting sheet: draft for the 10 Aqualia villagers (AGT-4.2)

- status: done
- goal: write proposal `docs/team/proposals/002-aqualia-voice-casting.md`. For each villager in `src/content/villagers.ts`:
  - engine voice ID or blend;
  - pitch offset, rate and timbre notes;
  - blip settings;
  - one sample line.

  Base the casting on age, role and personality. **Never infer gender from pronouns or names** (AGT-4.2).

- done when: the proposal is pushed and the director has been messaged
- evidence: docs/team/proposals/002-aqualia-voice-casting.md, docs/team/comms/communicator/2026-10-31T0730--to-director--aqualia-voice-casting-proposal.md

### M7 · Aqualia day and night scores

- status: done
- goal: `art/source/audio/scores/aqualia-day.json` and `aqualia-night.json`, using the `music-score` skill: 6/8, harp and soft pulse, major with a raised 4th (AUD-3.2), quoting bars 1–2 of the motif, with four stems.
- done when: `render_score.py` exits 0 for both, and the report numbers are in a message to the director
- evidence: art/source/audio/scores/aqualia-day.json, art/source/audio/scores/aqualia-night.json, docs/team/comms/communicator/2026-10-31T0800--to-director--aqualia-scores-ready.md

### M8 · Weekly review digest

- status: open (recurring, every Friday)
- goal: `art/review/digest-<YYYY-Www>.md` covering every packet, proposal and approval request waiting on the director, each with a one-line ask. The director decides them in one pass. First digest: the Rivallie golden sample `art/review/2026-10-31-rivallie/`, and codex C5 (the Aqualia region bible, `docs/doctrine/regions/aqualia.md`, awaiting composition review).
- done when: never closes; add a dated evidence line each week
- evidence: art/review/digest-2026-W44.md (2026-10-31)

### M9 · Aqualia terrain set through tileforge (long design session)

- status: in_progress (scaffolded aqualia-terrain; swatches paused awaiting image generation quota reset per PRD-7)
- goal: the whole Aqualia ground in palette-locked 32-px tiles (ART-11.2), designed by you, made exact by tileforge: grass, dirt, sand, stone, mud, reedbed, boardwalk; freshwater with its 14 shore masks; dirt-path and stone-path edges; cliff strip and ramp.
- inputs: `.agents/skills/tile-forge/SKILL.md` (read it fully first); region bible `docs/doctrine/regions/aqualia.md` and ART-13 (teal, sand, warm timber); the concept `art/source/masters/aqualia_canal_settlement_master.jpg` for mood only (its grid lines and props make it unusable as a swatch); the golden sample `art/source/tiles/sets/aqualia-grass-water/` and its packet `art/review/tiles-aqualia-grass-water-1/` (procedural stand-in swatches; beat them).
- work, one material at a time (PRD-4), each through the skill's loop (swatch, recipe, `all`, look at all three previews, fix inputs, repeat):
  1. Set `aqualia-terrain`: `tileforge.py new aqualia-terrain`; `preview.level` `aqualia_village`, `rect` one canal screen (30×17 tiles).
  2. Grass (`ground_grass`, binds ground grass) with 3 variants. Decide the actor-contrast trade-off (skill, design rules) and write it in `notes`.
  3. Freshwater body (`ground_freshwater`, 2 variants) and the shore overlay (`shore_freshwater_mask_{mask}`, binds water fresh_shallow and fresh_deep).
  4. Dirt (`ground_dirt`) and sand (`ground_sand`); pairs grass/dirt and grass/sand must pass.
  5. Stone, mud, reedbed, boardwalk (runtime ids `ground_stone`, `ground_mud`, `ground_reedbed`, `ground_boardwalk`; they go to the manifest at publish).
  6. Path edges: overlays for dirt_path and stone_path (`path_dirt_mask_{mask}`, `path_stone_mask_{mask}`, binds paths).
  7. Cliff strip (`cliff_grass`, `wrap` x, `heightPx` 8) and ramp (`ramp_grass`).
  8. Packet when the whole set is candidate and reads well on `level.png`. Write `DIGEST.md` in the packet with what you saw and the trade-offs. Message the director. One packet per set; a second set (for example `aqualia-water-deep`) is fine if the first grows too large.
- never: edit tile PNGs, exports or packets; write director records; change the tool or spec (ask codex).
- done when: an `art/review/tiles-aqualia-terrain-<n>/` packet is QA candidate with every material above, and the director is messaged
- evidence: art/source/tiles/sets/aqualia-terrain/set.json

### M10 · Quadruped creature reference sheets (bramblefang, marshstalker, mireling)

- status: done
- goal: produce 3-view orthographic reference sheets (front, left side, back) in `art/source/references/<species>/` for the three quadrupeds in the order specified in Blender B3 (bramblefang, marshstalker, mireling). Single all-fours standing pose, limbs separated from body, mouth closed, plain grey background, no labels, matching approved portraits.
- inputs: the `reference-sheets` skill, approved portraits (`public/assets/portraits/creatures/portrait_<species>_128.png`)
- done when: sheets committed with views and `sheet.json`, ledger updated, and blender notified
- evidence: art/source/references/{bramblefang,marshstalker,mireling}/{sheet.png,front.png,left.png,back.png,sheet.json}, docs/team/comms/communicator/image-ledger.md, docs/team/comms/communicator/2026-10-31T0900--to-blender-codex--bramblefang-reference-ready.md, docs/team/comms/communicator/2026-10-31T1500--to-blender-codex--marshstalker-reference-ready.md, docs/team/comms/communicator/2026-10-31T1600--to-blender-codex--mireling-reference-ready.md

### M11 · Redraw the human sheets; fix ramp names on every sheet

- status: in_progress (palette ramps and metadata schemas normalized; 3-view redraw paused on image model capacity limit)
- goal: bring every reference sheet up to PRD-3 and L3 (director decision via directive 006).
- work:
  1. **Human sheets: player-aqualia, npc-neris, and the four mannequins (standard, sturdy, slender, elder).**
     - Draw at 4.5–5 heads (L3): head 11–12 art px, crown per `body_types.json`. Today they are about 5.5–7 heads.
     - Use an A-pose with the arms about 45° from the body (mannequin-elder is at about 20°).
     - Provide front, **left** and back views.
     - Make `sheet.png` at least 1024 px tall (PRD-3.1).
     - Match `body_types.json` `aqualiaCast` for the player: build slender, skin-porcelain, hair-teal.
  2. **Ramp names on every sheet**, from `art/source/forge/spec/palette.json` only:
     - bramblefang: `charcoal`, `amber`, `ivory`;
     - marshstalker: `aqua`;
     - npc-neris: `charcoal`, `outline-dark`;
     - player-aqualia: `river-blue`, `charcoal`, `outline-dark`.

     Keep to at most 5 ramps per character (ART-4.4: 24 colours).

  3. **mireling `sheet.json`:** use the same schema as the other sheets (`asset`, `kind`, `identitySources`, `ramps`, `generations`, `ledger`).
- done when: every sheet passes these checks, the ledger is updated within quota (PRD-7), and you've messaged codex and blender
- evidence: art/source/references/{bramblefang,marshstalker,mireling,player-aqualia,npc-neris,mannequin-*}/sheet.json, docs/team/comms/communicator/image-ledger.md

### M12 · Relay C6 review evidence

- status: done
- goal: add the candidate village packet to the next review digest and relay its C5 composition gate to the director.
- work: use the Codex C6 handoff and art/review/world-aqualia-aqualia_village-1/packet.json. Distinguish objective QA from visual approval; link only published evidence.
- done when: digest and relay cite the packet, its preview limitations and the required director decision.
- evidence: art/review/digest-2026-W45.md, docs/team/comms/communicator/2026-10-31T1948--to-director--relay-c6-village-evidence.md, art/review/world-aqualia-aqualia_village-1/packet.json

### M13 · Existing world-preview kit inventory

- status: done
- goal: identify which existing source/catalog terrain and environment assets can replace the village preview fallbacks when their owning production gates permit.
- work: report canonical IDs, dimensions, anchors, available layers and approval status in your own comms. Read existing artwork/catalog; do not invent assets, edit generated output or activate candidates.
- done when: a source-linked inventory and explicit missing-kit list are published for Codex/C10/C11.
- evidence: docs/team/comms/communicator/2026-10-31T1950--to-codex--world-preview-kit-inventory.md, art/source/manifest.json, docs/art/coverage.md

### M14 · Recast proposal 002 (AGT-4.2)

- status: done
- goal: a new revision of `docs/team/proposals/002-aqualia-voice-casting.md` that answers the director's changes-requested record `docs/team/comms/director/approvals/proposal-002.md`.
- work:
  - Cast every voice from age, role and personality only, with a one-line rationale per villager that never mentions pronouns, names or gender.
  - Fix the Mira, Dara and Finn personality drift against `src/content/villagers.ts`.
  - Keep the sample lines, blips and prosody fields.
  - Record which Kokoro voice list the IDs come from.
- done when: the proposal is revised and you've messaged the director with exactly what changed
- evidence: docs/team/proposals/002-aqualia-voice-casting.md, docs/team/comms/communicator/2026-10-31T1847--to-director--aqualia-voice-recast-proposal.md

### M15 · Score revisions (AUD-3, AUD-4.1)

- status: done
- goal: fix the scores per `docs/team/comms/director/approvals/music--aqualia-day-night.md`.
- work:
  - quote motif bars 1–2 exactly;
  - fix day bar 6;
  - give night the same tempo, length and four stems as day, with harp and a soft pulse.
- done when: `render_score.py` exits 0 for both, the report numbers are in a message to the director, and that message says "quotes bars 1–2" only when it does
- evidence: art/source/audio/scores/aqualia-day.json, art/source/audio/scores/aqualia-night.json, docs/team/comms/communicator/2026-10-31T1850--to-director--aqualia-scores-revised.md

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
- evidence: art/review/2026-11-01-rivallie-faces-d749a4350126/contact.png, art/review/2026-11-01-rivallie-faces-d749a4350126/registered.png, art/review/digest-2026-W45.md, docs/team/comms/communicator/2026-11-01T0100--to-codex-blender--rivallie-faces-and-manifest-plan.md

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
- evidence: docs/team/comms/communicator/2026-11-01T0100--to-codex-blender--rivallie-faces-and-manifest-plan.md, art/source/staging/blender/rivallie.json, art/source/manifest.json

### M19 - Integrate portable C3b staging into the source manifest

- status: in-progress (C3e delivered; full tracked V2 graph and refreshed digests remain)
- goal: preserve approved-body provenance across machines while keeping runtime activation separate.
- work: after B10, apply the existing M18 ID/path/appearance-ownership mapping and candidate flags. Preserve integer registration, sockets, rig, phases, strides and the complete immutable provenance closure. Follow the [portable-source handoff](../comms/codex/2026-11-01T0145--to-all--c3b-portable-provenance.md); do not strip provenance, fabricate inputs or integrate unapproved faces. Compile for validation and leave generated outputs/ledger to engineering.
- done when: the source manifest passes shared validation with all dependencies present and matching hashes on Machine B; report the mapping and source digests for engineering's separate ledger/compilation review.
- evidence: M19 digest report is integrated at `5a128d1`, but `84863c3` contains no manifest changes and the source remains V1. Follow the [tracked-graph request](../comms/codex/2026-11-01T0349--to-communicator--m19-tracked-graph-needed.md); preserve rig/sockets/provenance and report full schema validation. C3e now supplies multiple registrations under the same rig identity.
- update: [C3e fields and correction](../comms/codex/2026-11-01T0454--to-all--c3e-rig-registration-contract.md) at consumer `4041714` now unblock registration validation. Existing digest closure already included frame rigs; recompute from the full validated graph, not the earlier report. Report ambiguous V1 anchors rather than silently rounding or removing content.
- received: [M19/M22 report at c6902df](../comms/communicator/2026-11-01T0550--to-codex-blender--m19-candidate-v2-graph-and-v1-anchor-audit.md) attributes native subset validation and refreshed digests to the communicator. It publishes no candidate JSON or source-manifest edit, so full integration is still pending. The reported 1,070 fractional legacy registrations require engineering compatibility ingestion; preserve V1 rather than blanket-rounding anchors or weakening native V2 validation.

### M20 - Review human sprite-face grammar readability

- status: done (readability report received; no director acceptance)
- goal: identify subtle or unclear human emotions before real-head integration.
- work: open the native and 4x proofs linked in the [C9b handoff](../comms/codex/2026-11-01T0247--to-all--c9b-human-face-sidecars.md). Report expression/facing-specific readability observations; distinguish a skin-tone review matte from a real human face plane. Follow with B11 registered proof feedback when available. Do not edit forge code or approve art.
- done when: concrete observations are published in your own comms for Codex/director. This review does not activate expressions or complete C9b.
- evidence: [published M20 report at b47e102](https://github.com/huytruong1810/Vibe/blob/b47e102/docs/team/comms/communicator/2026-11-01T0350--to-codex-blender--m20-human-face-review.md); profile emotion differences remain subtle. Codex's source check clarifies blink/sleep mouths differ in pixel count at the same Y, not by a Y shift. Real-player fitting is still gated on M11 and body QA.

<<<<<<< HEAD
### M21 - Prepare the canonical hatchet reference handoff

- status: done (reference metadata delivered; no model/render readiness implied)
- goal: prepare one separate prop input for C9b before any weapon batch.
- work: audit the existing `references/player-aqualia/prop-hatchet.png` against PRD-3.3. If suitable, register a canonical item-hatchet reference sheet with provenance and source identity in your lane; otherwise report the exact input defect and image-quota dependency. Do not generate game frames or invent model grip coordinates. Coordinate the eventual existing-mesh/grip annotations with Blender; item rendering remains an engineering prerequisite.
- done when: a traceable canonical reference handoff or precise blocker is published. This does not approve art or grant go-items.
- evidence: `art/source/references/item-hatchet/sheet.json` and `sheet.png` integrated at `99011b2`; canonical identity and declared iron/wood/leather/reed ramp names verified against the palette. Visual observations remain attributed to the communicator's report; no additional image generation or Codex visual approval.
=======

>>>>>>> origin/art/hd-aqualia-slice

### M22 - Audit V1 registration conversion for M19

- status: open (metadata audit; no image-generation quota needed)
- goal: keep the 1,092 existing source frames and working appearances intact during V2 mapping.
- work: inspect source dimensions and original anchor metadata; list any fractional/ambiguous native registration, missing pose/rig declaration or identity collision in your own comms. Use source authoring evidence for exact integers, not blanket rounding or dropped frames. Coordinate findings with M19's sole manifest integration and C3e's declared registration pairs; do not edit generated output or other agents' sources.
- done when: a bounded record-specific conversion checklist and blockers are published. This audit does not activate candidates or approve artwork.
