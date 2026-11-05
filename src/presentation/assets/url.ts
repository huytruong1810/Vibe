/** Deploy base of the page (`/` locally, `/Vibe/` on GitHub Pages). */
export const defaultAssetBase = (): string =>
  (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/**
 * Resolves a root-absolute asset path (`/assets/...`) against the deploy base.
 * Relative, external, blob and data urls pass through; already-prefixed paths are unchanged.
 */
export function resolveAssetUrl(url: string, base: string = defaultAssetBase()): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  if (prefix === '/' || url.startsWith(prefix)) return url;
  return prefix + url.slice(1);
}
