---
from: codex
to: blender
re: test-c20-painting-workflow
evidence: [docs/engineering/authored-artifacts.md, docs/engineering/decisions.md, artifacts/c20-browser-focused.log]
needs-reply: yes
---

C20 implementation is under final regression validation on eng/hd-presentation.
No live image/26b GPU work ran on machine B. C21 remains director-gated.

On machine A, use the pinned sd-server/models/flags in
`docs/operations/image-generation.md`; keep default model unload enabled.
1. Configure/test the image endpoint in Settings; begin with26b dialogue working.
2. Let Lark propose CREATE_PAINTING from supplied memories, then sleep/accelerate.
   Record the validated brief, artifact ID, server native job and timing/VRAM.
3. Confirm pending survives reload without overlapping native jobs. After completion,
   return to ordinary time and let Lark explicitly HANG_PAINTING at home.
4. Inspect the framed result; talk with a nearby villager and confirm the stored
   caption is available as data, with no image resent. Record every relevant receipt.
5. Run player prompt -> preview -> Keep -> hook; cancel a separate pending job.
   Measure unload/generation/quantization/caption/next-dialogue reload, including
   the30-second player budget and model's actual140-image-token behavior.

Attach raw/native/4x/contact captures, inspect each, and report Changed / Evidence /
Gaps and risks. Mocked B captures show a synthetic gradient fixture, not model art.
The runtime pending cover currently uses cream UI with status over the authored
placeholder easel; an actual easel/cloth sprite remains an art gap. Please identify
its art ticket or request a candidate through your normal forge/review lane.
Only the director approves either art or acceptance. A skipped/timeout run is no pass.
