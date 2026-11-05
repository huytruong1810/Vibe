# Local operation, model setup, saves, and extension

## Development and clean installation

Use Node 22.12+ and the committed npm lockfile:

```sh
npm ci
npm run dev
npm run check
```

The repository-local npm cache avoids requiring global cache writes. The legacy peer resolver works around an npm 10 optional-peer resolution failure observed during initial installation. It does not replace typechecking or browser tests.

Production output is static `dist/`, built by `npm run build`. `npm run preview` serves that output locally. This work does not register or publish a hosted Site. No backend, account, secret, or hosted inference provider is needed.

## Required local Ollama

Install/start [Ollama](https://ollama.com/), install a small candidate model explicitly, then select it through the setup screen:

```sh
ollama pull qwen2.5:3b
npm run test:ollama -- qwen2.5:3b
```

The application discovers `/api/tags` and performs a real schema-constrained `/api/chat` check. A successful ping alone is insufficient. The adapter uses nonstreaming JSON responses, a 4,096-token context option, bounded output, and abortable requests. Thinking is disabled for supported Qwen 3/Gemma 4 model families; other models must satisfy the same content contract.

The check must succeed before a new or resumed session. During play, a timeout, HTTP error, malformed response, or canceled background request is bounded and reported; deterministic schedules and dialogue fallback keep the session usable. The fallback cannot waive action prerequisites.

### Hearthwild models (abliterated, 2026-11-02)

The game's villagers run abliterated Gemma 4 builds (AGT-1.2): refusals removed so a
character never steps out of the story, capability kept. Install them under the names the
game and docs use (the `gemma4` prefix also keeps thinking disabled in the adapter):

```sh
ollama pull hf.co/HauhauCS/Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-MTP:Q4_K_M
ollama cp hf.co/HauhauCS/Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-MTP:Q4_K_M gemma4-abliterated:26b
ollama pull hf.co/llmfan46/gemma-4-E4B-it-ultra-uncensored-heretic-GGUF:Q5_K_M
ollama cp hf.co/llmfan46/gemma-4-E4B-it-ultra-uncensored-heretic-GGUF:Q5_K_M gemma4-abliterated:e4b
ollama rm hf.co/HauhauCS/Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-MTP:Q4_K_M hf.co/llmfan46/gemma-4-E4B-it-ultra-uncensored-heretic-GGUF:Q5_K_M
```

Both include the vision projector. Measured on machine A (RTX 5080 Laptop 16 GB, a
schema-constrained in-character reply, cold load included): `e4b` 55 tokens/s, 12 s for a
137-token reply; `26b` 4.4 tokens/s, 66 s for 150 tokens (17 GB doesn't fit 16 GB VRAM, so
layers spill to the CPU; the stock `gemma4:26b` measured 6.3 tokens/s the same way). For
responsive play on this laptop pick `gemma4-abliterated:e4b`; the 26B gives richer
characters at much slower replies. Neither refused the in-character threat test the stock
26B softened.

#### Pinned GGUF & Projector SHA256 Digests (`L10.1` / `C35` Provenance)

Because community Hugging Face GGUF repositories (`HauhauCS/...`, `llmfan46/...`) can be renamed or DMCA-removed, every workstation and mirror must verify the exact Ollama layer digests in `~/.ollama/models/manifests-v2/ollama.com/library/gemma4-abliterated/<tag>`:

| Local Model Tag          | Upstream HF Source                                                          | GGUF Model Layer SHA256 (`application/vnd.ollama.image.model`)            | Vision Projector SHA256 (`application/vnd.ollama.image.projector`)        |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `gemma4-abliterated:e4b` | `hf.co/llmfan46/gemma-4-E4B-it-ultra-uncensored-heretic-GGUF:Q5_K_M`        | `sha256:2079c8215603d58ce7e493f6bb03cdd760abe69ca78a5d2224415b08705d27a6` | `sha256:ffa64aebf7144bbadd5a1e143b77794d88e76a81cc0168d91de0770eb49e88e0` |
| `gemma4-abliterated:26b` | `hf.co/HauhauCS/Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-MTP:Q4_K_M` | `sha256:3c13133469e431312fffb8b1d9c85ae42199e6bb5746ea1da84e8ddf2097d73c` | `sha256:b5346e5bfd906f5e16878c2d0b8243e948ca7410fa28ea35be9b0c54a0ac10b7` |

Keep a local backup copy of the matching blob files under `~/.ollama/models/blobs/sha256-*` on an offline drive so a workstation rebuild never depends on third-party repository availability.

### Browser origins and permissions

Use the exact development URL printed by Vite. If it changes ports, the Ollama allowlist must match. On Windows, quit a running tray server before starting another server with modified environment variables:

```powershell
$env:OLLAMA_ORIGINS = 'http://127.0.0.1:5173'
ollama serve
```

On macOS/Linux, configure the environment of the service that actually runs Ollama, not only the browser's terminal. Follow [Ollama's configuration guidance](https://docs.ollama.com/faq). A hosted HTTPS application can additionally require browser loopback/network permission; respect the prompt rather than disabling browser security. See [Chrome's guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access).

The adapter accepts loopback hosts only, with no embedded credentials or URL query. Browser code never handles a hosted-provider secret. Model downloads are not triggered by the page or tests.

### Beta site (GitHub Pages) notes

The beta is served from a sub-path (`https://huytruong1810.github.io/Vibe/`), built with `vite build --base /Vibe/`. Catalog and atlas URLs are root-absolute (`/assets/...`); `resolveAssetUrl` (`src/presentation/assets/url.ts`) prefixes them with `import.meta.env.BASE_URL` at fetch time, and `tests/asset-url.test.ts` covers `/` and `/Vibe/`. CSS `url()` references are rewritten by Vite. For the Ollama allowlist use the Pages origin: `OLLAMA_ORIGINS = 'https://huytruong1810.github.io'`. If the browser blocks the loopback call, accept Chrome's local-network prompt. The game stays playable with fallback dialogue without Ollama.

### Practical model qualification

Run the smoke script against the exact installed model and record cold readiness, warm dialogue latency, output tokens, schema success, and action choice. The interactive deadline is 45 seconds; a model that routinely approaches it is unsuitable even if it eventually emits valid JSON. Test rendering while inference is active because CPU, memory bandwidth, and integrated-GPU resources can contend.

Do not turn the original draft's “>45 tokens/sec” into a product guarantee. The current machine and installed models are not evidence for every ordinary laptop. The recommended small model must still be evaluated when installed.

## Saves and recovery

Manual save reports completion. Autosave runs every 30 seconds during active play. Two IndexedDB checkpoints rotate atomically; a damaged newest slot falls back to the previous valid one. Export JSON before clearing browser data or changing origins.

Browser saves are scoped to the exact origin. `localhost`, `127.0.0.1`, and different ports have separate storage. If a save appears missing, return to the original URL or import an export. Browser quota/private-mode failures are surfaced, not silently treated as saved.

Import validates size, versions, content IDs, array lengths, numbers, ownership, and references before replacing the world. Unfinished conversations and in-flight jobs are canceled; committed effects, memories, and future promises remain. There is no wall-clock catch-up for time spent closed.

## Tests and performance tooling

- `npm run check`: types, dependency boundary, unit/integration tests, static build.
- `npm run test:browser`: installed Chrome on Windows, Playwright Chromium otherwise. Install with `npx playwright install chromium` if needed; optionally set `PLAYWRIGHT_CHANNEL=msedge`.
- `npm run benchmark`: normal and dense detailed-tier CPU scenarios; writes JSON under `artifacts/`.
- `npm run soak`: 28 days by default; set `SOAK_DAYS` for a different duration. This executes full ticks across all seasons, not a time jump.
- `npm run test:ollama -- MODEL`: local-model integration; writes its own outcome, including failures/timeouts.
- `npm run format:check`: consistent source/documentation formatting.

The development-only `?test=1` bridge exposes commands, checkpoint reads, current UI snapshots, and rendering stats for browser tests. It has no production entry-gate bypass and no arbitrary world-mutation endpoint. Browser scenarios can use the normal validated save import to stage encounters.

Enable **Developer overlay** in Settings to see collision, actual navigation paths, creature goals/need bars, utility scores, current/future villager plans, and memory provenance. The extra path payload is disabled by default and does not change saved gameplay state.

## Extending safely

1. Add content IDs and definitions, including diets/media/recipes/schedule locations.
2. Validate new references and recipe graph reachability at startup.
3. Keep capabilities in game rules; expose only grounded proposals to the model.
4. Add behavioral tests for any new ownership, item, reward, or temporal invariant.
5. Version save/content/generation deliberately and provide migrations for released data.
6. Benchmark changed hot loops with normal and dense scenes, not only a static village.
7. Replace art/audio behind presentation adapters; keep content IDs stable.

Do not add remote telemetry, model downloads, server accounts, billing, publishing, or a hosted inference backend as an incidental refactor.
