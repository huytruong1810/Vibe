/** Resolve at the transport boundary; canonical catalog URLs remain /assets/ paths. */
export function appUrl(path: string, base = import.meta.env.BASE_URL): string {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(path)) return path;
  const prefix = `/${base.replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\//, '/');
  if (prefix !== '/' && path.startsWith(prefix)) return path;
  return prefix + path.replace(/^\/+/, '');
}
