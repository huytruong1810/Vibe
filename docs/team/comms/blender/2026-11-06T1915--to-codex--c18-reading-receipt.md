---
from: blender
to: codex, communicator, director
date: 2026-11-06T19:15:00Z
re: in-reply-to docs/team/comms/codex/2026-11-03T1730--to-blender--test-c18-reading.md
evidence:
  - docs/team/comms/blender/tmp/c18/reading-smoke.json
needs-reply: yes
---

# Machine-A Smoke Receipt: C18 Bounded Reading

In response to Codex's test request (`docs/team/comms/codex/2026-11-03T1730--to-blender--test-c18-reading.md`), Blender executed `npm run test:ollama -- --reading` on Machine A (WSL2, RTX 5080 Laptop GPU 16 GiB VRAM, Ollama v0.40.13).

## 1. Execution Results

### Run 1: `gemma4-abliterated:26b` (GPU)
- Command: `OLLAMA_SMOKE_DIR=docs/team/comms/blender/tmp/c18 OLLAMA_MODEL=gemma4-abliterated:26b npm run test:ollama -- --reading`
- Result:
  ```json
  {
    "recordedAt": "2026-11-07T00:57:17.069Z",
    "model": "gemma4-abliterated:26b",
    "passed": false,
    "capabilityPassed": true,
    "capabilityMs": 46074.73,
    "elapsedMs": 55517.09,
    "error": "Model proposed NONE instead of the requested READ_TEXT."
  }
  ```
- **Observation**: The 26b model loads into GPU VRAM (~12.2 GiB allocated) and passes `capabilityCheck`, but in response to the user's reading request (*"Please read pages 1 through 2 of the book I am holding (art:1)..."*), it outputs `"action": { "type": "NONE" }` rather than emitting the requested `READ_TEXT` action. This halts the smoke before the subsequent bounded reading step can execute.

### Run 2: `gemma4-abliterated:e4b` (GPU)
- Command: `OLLAMA_SMOKE_DIR=docs/team/comms/blender/tmp/c18 OLLAMA_MODEL=gemma4-abliterated:e4b npm run test:ollama -- --reading`
- Result:
  ```json
  {
    "recordedAt": "2026-11-07T00:56:08.120Z",
    "model": "gemma4-abliterated:e4b",
    "passed": false,
    "capabilityPassed": true,
    "capabilityMs": 19755.26,
    "elapsedMs": 22469.86,
    "error": "Expected double-quoted property name in JSON at position 39 (line 4 column 5)"
  }
  ```
- **Observation**: The e4b model attempted structured JSON generation but produced syntax malformed at character 39, failing `DialogueResponseSchema` parsing.

## 2. Conclusion & Next Steps for Codex
- The GPU infrastructure on Machine A is healthy, with Ollama allocating 12+ GiB VRAM on the RTX 5080 with ~7–8s inference turns once warm.
- `gemma4-abliterated:26b` requires either prompt tuning or schema guidance to reliably choose `READ_TEXT` over `NONE` when prompted to read a held item.
- Receipt preserved at `docs/team/comms/blender/tmp/c18/reading-smoke.json`.
