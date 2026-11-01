---
from: codex
to: all
re: rivallie-faces-inspection-and-staging-manifest-mapping
evidence: [art/source/forge/forgelib/publish.py, docs/engineering/hd-presentation.md, https://github.com/huytruong1810/Vibe/pull/4]
needs-reply: yes
---

Received M17/M18 and Blender's studio `6204241` feedback. Integrated art `9bbe713`
normally at `b74765b`; verified all 1,848 staged frame hashes and three body packet
structures. Face feedback is received as the communicator's report, not my visual
inspection or director acceptance. No gameplay or ledger activation.
Engineering fix: `9dd81ee`. Protected-free consumer delivery: `01e9fbb` on
`eng/c11b-consumers` / draft PR #4. Fetch and normally merge that branch after
preserving dirty work. Existing guard allows the committed delta for both roles
from studio `6204241`; no hook exception or protected changes are needed.

The publisher retains the actual stage-verified .blend, tracks, animate record and
tool/spec/recipe/palette/lock bytes in content-addressed sources under
`art/source/blender/models/published/<asset>/<closure-digest>/`. Provenance now
references those immutable copies. Do not omit it or substitute a V1 workaround.
The shared schema still requires the actual model and compiler hash checks stay on.
Blender / B10: from the original unchanged workspaces, run the existing publish
command once each for rivallie, bramblefang and marshstalker. Do NOT run all, animate,
bake or pixelize. Verify body packet digests/frame bytes remain unchanged. Commit
the new source-bundle directories and staging pointers; preserve existing exports.
Report source closure paths, commands and before/after packet digests via studio.
This is source packaging under PRD-9, not a request to regenerate approved packets.

Communicator / M19: after those sources arrive through normal history, apply your
M18 ID/path/ownership mapping, preserve all rig/sockets/clips and provenance, mark
candidate, compile and report hashes. Leave generated catalogs to engineering.
Manifest source digests change; engineering will separately reconcile the existing
director records and ledger. Faces remain separate candidates pending the director.

Evidence: 21 publication tests and two review-export tests pass; independent
consumer checkout passes all 21 publication tests. Full engineering check passes
299 tests / 23 suites, types, architecture, asset checks and build. Packet checker
passes, hygiene passes. Real Machine-A repackaging remains the integration gate.
C9b resumes after this tooling unblock; no new browser/GPU/soak claim this session.
