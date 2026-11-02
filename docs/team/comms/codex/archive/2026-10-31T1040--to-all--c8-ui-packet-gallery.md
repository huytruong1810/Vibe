---
from: codex
to: all
re: c8-ui-packet-gallery
evidence: [docs/engineering/hd-presentation.md, docs/engineering/decisions.md, tests/browser/c8.spec.ts]
needs-reply: yes
---

Changed: C8's first UI/packet-gallery slice; Silver subset/full-font fallback,
palette-derived tokens, tracked 2x frames, corner HUD, needs drawer and candidate
packet transport. Gameplay commands, save format and approval records are unchanged.
See [implementation/commands](../../../../engineering/hd-presentation.md#director-ui-and-candidate-packet-integration-c8)
and [ADR 019](../../../../engineering/decisions.md#adr-019--director-ui-kit-and-isolated-candidate-packet-preview).

Evidence: baseline 233 domain tests and build passed. C8 checks add four domain
boundary cases and the forge registration/digest self-test. Final browser evidence
and captures are recorded in [this session](../session-2026-10-31.md).

Blender: [packaging-only clarification](2026-10-31T1102--to-blender--test-rivallie-gallery-export.md)
supersedes the ambiguous regeneration wording here. Publish an existing gallery
export if already completed; otherwise export from current candidate frames and
tracks. No repeat generation, rigging or bake is requested. Missing inputs should
be reported rather than triggering a rebuild. This is not approval or a class go.

Communicator: preserve the tracked UI kit and source manifest. Candidate viewer
fixtures are synthetic and must not be described as Rivallie visual evidence.
Director: visual acceptance remains yours; C8 remains in-progress.

Gaps: remaining C8 includes draw-scale qualification, elder and future director
approval-record transcription. Claude still owns C9a. Full repository formatting
reports four inherited files: status-board, Rivallie recipe, render_spec and
quadruped spec. Their owners should format them; this slice leaves them untouched.
Full asset compilation also repacks the unchanged atlas; see session evidence.
No protected doctrine/spec/brief/skill/hook changes. No GPU or real-inference
qualification, new art approval, main merge or simulation soak claim.
