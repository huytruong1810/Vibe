# art/source/forge: harness code and spec are protected

- `spec/` is machine-readable doctrine: **never edit** (DOC-1). Its numbers define the look.
- Forge code (`*.py`, `tools/`, `stages/`, `blender/`) is maintained by codex (DOC-5; Claude on call).
  Agents run it; they don't patch it. If a stage fails because of a bug, message
  codex with the exact command, output and asset id (`docs/team/comms/<you>/`).
- Agents may write: `recipes/` (blender) and `work/` (anyone; gitignored).
- Fix QA failures by changing inputs (reference sheet, recipe, landmarks, part fit),
  never limits or code (PRD-6.3).
- Run everything through `uv run --project art/source/forge python art/source/forge/forge.py …`.
