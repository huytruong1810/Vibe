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

### Browser origins and permissions

Use the exact development URL printed by Vite. If it changes ports, the Ollama allowlist must match. On Windows, quit a running tray server before starting another server with modified environment variables:

```powershell
$env:OLLAMA_ORIGINS = 'http://127.0.0.1:5173'
ollama serve
```

On macOS/Linux, configure the environment of the service that actually runs Ollama, not only the browser's terminal. Follow [Ollama's configuration guidance](https://docs.ollama.com/faq). A hosted HTTPS application can additionally require browser loopback/network permission; respect the prompt rather than disabling browser security. See [Chrome's guidance](https://developer.chrome.com/docs/modern-web-guidance/guides/security/local-network-access).

The adapter accepts loopback hosts only, with no embedded credentials or URL query. Browser code never handles a hosted-provider secret. Model downloads are not triggered by the page or tests.

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
