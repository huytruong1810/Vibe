# Development art review gallery

Run `npm run assets:build`, then `npm run dev`. Open `http://127.0.0.1:5173/?gallery=1` (or the development server's printed port). This development-only entry initializes no simulation, persistence or Ollama connection. The playable game still requires local model setup. Production builds do not expose this route.

The identity selector comes from the canonical content registries, including all 30 villagers. Missing identities stay selectable. The gallery never uses another villager's appearance to fill a missing identity. Frame selection uses an exact appearance/state/facing match; no fallback, mirroring or rotation conceals a missing authored direction.

The Asset group selector also exposes every environment and item binding in the generated catalog, including materials, shoreline masks, cliffs, ramps and resource-state exports when supplied. These entries use their canonical catalog content IDs rather than inferred filenames. Static `frameId` appearances show their authored dimensions, trim and anchor once as nondirectional objects; playback and facing controls are disabled. They do not count as eight authored actor poses.

Use the animation, facing and frame controls to compare exports. Yellow bounds show the untrimmed authored rectangle, cyan bounds show the trim rectangle, and the red cross shows the normalized ground anchor. The metadata panel reports the authored dimensions separately from preview magnification. A 4× preview of a prototype does not qualify as HD artwork.

The eight comparison cards use one shared selected frame index. Animation preview is an art-review clock, independent of authoritative game combat timing. It stops while the page is hidden. In-game phase synchronization is reviewed through the playable renderer and its tests.

Atlas images load only for the currently selected frame and facing-comparison cards, with at most two decodes in flight and a 128 MiB decoded-image cache. Changing identity does not eagerly decode the full HD library. Stale loads cannot replace the selected identity, and page decode failures remain explicit.

The scene board is a native 1920×1080 canvas with 64-pixel grid lines and a 96×144 human registration box. Its initial river-colored blocks are explicitly a registration board, not the approved Aqualia target scene. A local PNG/JPEG/WebP proof can be loaded without uploading or publishing it. Images are drawn at their original resolution, with dimension mismatches reported. Day/night and rain/snow controls provide static readability previews without changing simulation weather.

## Review evidence

For the first art submission, capture the native target scene, the Aqualia player and Rivallie frames at 1×, and all eight movement/combat directions. Include anchor overlays, exact identity and clip IDs, and any deliberate missing coverage. The gallery can review prototypes, but native-resolution proof approval and complete catalog coverage are separate acceptance requirements.

Browser checks in `tests/browser/gallery.spec.ts` cover independent startup, exact missing-direction reporting, missing villager identities, frame stepping, load failures, keyboard navigation, a smaller desktop viewport, and static environment/item registration with restoration of actor controls.
