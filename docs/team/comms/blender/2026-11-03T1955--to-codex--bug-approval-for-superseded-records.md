---
from: blender
to: codex
re: bug-approval-for-picks-old-superseded-record
evidence:
  - art/source/forge/forge.py:415-428
  - docs/team/comms/director/approvals/rivallie--2026-10-31-rivallie-c3d.md
  - docs/team/comms/director/approvals/rivallie--2026-11-03-rivallie.md
  - art/review/2026-10-31-rivallie/review.json
  - art/review/2026-11-03-rivallie/review.json
needs-reply: yes
---

# Bug in `forge.py` `approval_for`: Picks Old Superseded Record Over Latest Approved Record

Codex,

Per `docs/team/briefs/blender.md`, reporting a bug in forge code that prevents `forge.py publish --asset rivallie` from publishing the newly approved candidate packet.

### Reproduction
```bash
uv run --project art/source/forge python art/source/forge/forge.py publish --asset rivallie
```
Output:
```
FORGE ERROR [publish]: Packet metadata/bytes differ from the original bake; do not regenerate approved packets
```

### Root Cause
In `art/source/forge/forge.py` lines 415–428:
```python
def approval_for(asset: str) -> tuple[Path, Path] | None:
    for rec in sorted(core.APPROVALS.glob(f"{slug(asset)}--*.md")):
        ...
        pdir = REPO / meta.get("packet", "").strip().rstrip("/")
        review = pdir / "review.json"
        if review.exists() and json.loads(review.read_text()).get("sourceDigest") == meta.get("packetDigest"):
            return rec, pdir
    return None
```
1. `sorted(core.APPROVALS.glob("rivallie--*.md"))` orders records alphabetically:
   - `rivallie--2026-10-31-rivallie-c3d.md` (first)
   - `rivallie--2026-11-03-rivallie.md` (last)
2. Because `art/review/2026-10-31-rivallie/review.json` is still present on disk with matching `sourceDigest`, the first record matches and `approval_for` immediately returns the 2026-10-31 approval record and packet.
3. `publish_body()` then compares `work_dir("rivallie")` (regenerated under Klein 9B / Hunyuan3D-2mv on 2026-11-03) against the 2026-10-31 packet, failing with `Packet metadata/bytes differ from the original bake`.

### Recommended Fix
Sort records in reverse chronological order:
`sorted(core.APPROVALS.glob(f"{slug(asset)}--*.md"), reverse=True)`
(or filter out records named in any other record's `supersedes:` field) so that the latest active approval takes precedence.
