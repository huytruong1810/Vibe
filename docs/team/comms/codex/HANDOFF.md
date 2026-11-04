# Codex session handoff

## Current work

Branch `eng/hd-presentation`, workspace `C:/Users/htruong/source/repos/Vibe`.
Committed HEAD **1df43a7**. C20 is locally validated and ready for its separate commit/push.
The director asked to continue through all unblocked Codex tickets. The earlier
pause/cron request was cancelled; no cron was created. C21 still needs explicit go.

Read the codex brief and charter after compaction. Use
[team-comms](../../../../.agents/skills/team-comms/SKILL.md) and
[doctrine-lookup](../../../../.agents/skills/doctrine-lookup/SKILL.md).
Keep the existing [session log](session-2026-11-02.md) and `.last-read` current.
Before pushing: pull `--ff-only`, read new addressed messages at one directory
level (no archives), run hygiene, stop owned processes. Leave Vibe-art alone.

## Changed

C18 CI repair is separately committed and pushed. C19 implementation is committed
in **8f1c399** and **1c14403**; C18 phase diagnostics/hygiene entry-point repairs
are **842765c**, **ef890fd**, **1df43a7**. Do not restart those implementations.

C20 adds shared painting content rules/canonical subjects/affinity; durable canvas
identity and request/result/Keep/Discard/Retry; kit modal with keyboard/gamepad,
progress and nearest previews; native-flight recovery across reload; NPC
CREATE_PAINTING/HANG_PAINTING with free home-hook reservation and durable rates;
one-time caption encoding/vision call/fallback, painter semantic memory and nearby
caption sight notices; framed hooks,32-resident pinned LRU and16x11 thumbnails.
See [ADR037](../../../engineering/decisions.md#adr-037--durable-painting-requests-and-native-gpu-recovery),
[artifact specification](../../../engineering/authored-artifacts.md) and
[pinned operations](../../../operations/image-generation.md).

Player subjects retain1�240 characters; NPCs retain3�160. Save v9 fields are reused,
no migration/new field. NPC reservations remain covered/unsealed until explicit
HANG at home. Retained authored records provide rates. Caption pixels are not
resent to later dialogue. Missing endpoint rejects new player/NPC requests.

Native marker `hearthwild-image-flight` is browser-local and written before POST.
Web Locks serialize image flights; recovery cancels/polls terminal state before a
new submission or warming Ollama. Unknown state suspends chat/image use until the
operator restarts sd-server and explicitly resets recovery in Settings. Use one
active game tab; LLM scheduling remains per instance. Main dispatch bounds queued
NPC work and reserves a player slot. Request seeds combine world seed/artifact ID.

## Evidence

[C18 diagnostic evidence](c18-ci-diagnostics.json) retains the complete failed
history, timing receipts, artifact hashes and public CI jobs. Latest source1df43a7:

- [Push41873320685](https://github.com/huytruong1810/Vibe/actions/runs/41873320685)
  **success**, including checks, both browser shards, both beta bases and aggregate
  `verify`. This satisfies the required C18 browser/verify gate before C19/C20.
- [PR41873343384](https://github.com/huytruong1810/Vibe/actions/runs/41873343384)
  browser/CPU/beta/verify jobs pass, but workflow is **cancelled** during ecology.
- Push ecology is scope-skipped, PR ecology cancelled: neither proves a soak.
  Independently, ef890fd push41868358995 ecology126708375448 actually passes22m52s;
  sibling PR ecology126708438813 times out at25 minutes. Keep outcomes separate.
- Public receipts: `artifacts/c18-trace-repair/phase-diagnostics/1df43a7-ci.json` and
  `ef890fd-ci.json`. Never retry rejected stored-credential access. Public REST only;
  append a receipt timestamp to avoid stale GitHub API cache responses.

C18 file-scoped trace retains failures/DOM snapshots, disables continuous trace
screenshots. Explicit1080p screenshot, CPU trace, compact notice, functional
assertions, five measurements, two mounted pages and100ms limit remain. The Linux
CI literacy test uses the measured SwiftShader GLES compositor args; other journeys'
tracing/retries/deadlines are unchanged. Two one-worker browser shards retain the
20-minute job limits and required aggregate verify. Historical screenshot-only
repair still failed619/633ms remotely; full headless compositor experiment61.2ms,
ec22a07 PR11.3ms and ef890fd PR21.2ms passed with fresh48-page receipts. Bootstrap
phase/status diagnostics expose the intermittent setup timeout without hiding it.
Temporary experiments were removed; earlier spread screenshots were inspected.

[C19 evidence](c19-validation.json): golden JSON hash
`80bd3049d7d65ff7f8ce461f9ca0ffb7489b50e1f9780879482b62281f14ba01`.
Four-worker check513 tests/42 files in56.80s; full browser25/25 in6.7min, all42 PNGs
inspected under `artifacts/c19-browser/`. Latest mock worker quant2.6ms, startup106.6ms,
total296ms; historical cold46ms and focused5.2/6.7ms gaps retained. Unchanged5ms Node
budget runs in existing serial budget project. Provider is pinned sd-server native
managed jobs; fetch abort alone is not GPU cancellation. No real GPU model ran on B.

[C20 evidence](c20-validation.json): four-worker `npm run check` passes **544 tests /
45 files**,63.12s, plus types/architecture/assets/hygiene/build. Final typecheck passes.
Focused player hook and pending-native-recovery browser **2/2** in1.0min; screenshots
inspected. Reload preserves immutable brief/identity and cancels prior native job
before the second POST. NPC real-save restore/quota/hang/nearby-caption test passes.
Full27-journey suite passes7.6min; C18 opening42.7ms/two pages/complete.
Root/subpath beta each2/2 pass19.3/19.2s. All48 retained PNGs inspected under
`artifacts/c20-browser/screenshots/`; hashes, CPU and golden receipts retained.
Formatting/hygiene pass; no owned4173 listener remains. Source CI is pending.
Mock worker6ms exceeds5ms target; startup149.3ms/total542.5ms, golden bytes unchanged.

## Next actions

1. C20 local validation and screenshot retention are finished. Do not repeat them
   without a new change/failure; see c20-validation.json for exact commands/hashes.
2. Commit C20 separately from C18 repair, pull/push, retain public source CI receipts.
   Update this handoff, session and queue with Changed / Evidence / Gaps and risks.
3. Send the concrete machine-A request prepared in
   [C20 smoke request](2026-11-04T2252--to-blender--test-c20-painting-workflow.md).
   C19 already has [a smoke request](2026-11-04T1619--to-blender--test-c19-painting.md).
4. Continue C3g: gallery still hardcodes page0 and16MiB despite five catalog pages.
   Add every-page selection, truthful catalog/resident-byte statistics and document
   the existing128MiB gallery cache versus runtime quality budgets. Keep approval,
   atlas content and runtime streaming gates unchanged; inspect the gallery capture.
5. Audit remaining queue tickets against current code before implementing duplicates.
   C32 previous-revision tooling already landed; machine-A revision3 proof is external.
   C7 authored-world activation remains gated separately; never enable it from layout
   approval alone. C15/C16 and C21 require explicit director authorization.

## Gaps and risks

Machine-A26b/sd-server overnight, cancellation, VRAM and30-second player pipeline
acceptance are external, as is director review.192�128 nearest PNG plus140 output
tokens does not prove the model's actual140-image-token cost. Pending cover is cream
runtime UI/status over the placeholder easel; actual easel/cloth art remains external.
Brand/person lists are finite; NPC memory vocabulary is deliberately conservative.
Real-time notice cooldown is session-local, not a cross-restart replay guarantee.

C13 candidate receipts: [validation](c13-validation.json), [benchmark](c13-benchmark.json),
[failed timing history](c13-benchmark-history.json). Save v8 intent/motion replay hash
`d0c664d43d5cdd3110d6d3105c376d719589d609e15b34034e281ae8a599f10e`.
C18 live B reading is functional evidence only: [receipt](c18-live-reading.json).
Do not repeat model latency tests on B; director clarified B is functional checks only.

C22/C24/C25/C14/C13/C18/C19 remain candidates with external acceptance. Only director
merges main/activates Pages; draft PR1 remains unmerged. Art ledger requires actual
digest-bound director records; communicator owns manifest/status integration.
Current assets:3908 frames,5 pages,79.84/19.88MiB; HD gaps1515, approvals4/41.
