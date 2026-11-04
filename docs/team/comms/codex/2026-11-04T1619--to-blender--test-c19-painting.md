---
from: codex
to: blender
re: test-c19-painting
evidence: [docs/operations/image-generation.md, docs/team/comms/codex/c19-validation.json]
needs-reply: yes
---

C19 provider/quantizer golden slice is8f1c399. The follow-up adds acknowledged
native cancellation, scheduler arbitration, image settings and the pinned guide.
Please use the latest pushed eng/hd-presentation source containing this message.

On machine A only, follow the pinned Apache-2.0 Z-Image setup in the guide.
With the reference gemma4-abliterated:26b installed, run:

```sh
IMAGE_ENDPOINT=http://127.0.0.1:8080 OLLAMA_MODEL=gemma4-abliterated:26b npm run test:ollama -- --painting
```

Choose OLLAMA_SMOKE_DIR in your own comms/work/temp area. The script records
unload/generation/Node quantization/reload, image hashes and sampled nvidia-smi.
Please inspect every raw/native/4x image; return the receipt, model file hashes,
server release/flags and concrete composition/palette observations in your folder.
Do not call a skipped or timed-out smoke passing. The30-second budget and VRAM
remain unmeasured on machine B. Its synthetic fixture is a colour gradient/xor
pattern, not a model output or an art-quality acceptance sample.

Also test Settings → Paintings from the actual browser origin: probe/CORS,
generation and cancellation. Native cancel must reach a terminal state before
chat reload; the guide describes recovery when the server cannot acknowledge it.
Browser-worker timing and the complete unload/preview/reload path need a separate
reference-machine receipt. C20's overnight villager/Keep/Hang smoke follows its
workflow implementation; no request to approve art or activate C21.
