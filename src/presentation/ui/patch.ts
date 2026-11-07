/** Small DOM reconciler for isolated HUD sections. Reuse keyed controls so live
 * snapshots do not destroy focus, text selection, listeners, or entered text. */
export function patchView(element: HTMLElement, html: string): void {
  const template = document.createElement('template');
  template.innerHTML = html;
  const key = (node: Node): string | null =>
    node instanceof HTMLElement
      ? node.id ||
        node.dataset.key ||
        (node.dataset.action
          ? `${node.tagName}:${node.dataset.action}:${node.dataset.id ?? ''}:${node.dataset.care ?? ''}`
          : null)
      : null;
  const patch = (old: Node, next: Node): void => {
    if (old.nodeType !== next.nodeType || old.nodeName !== next.nodeName) {
      old.parentNode?.replaceChild(next.cloneNode(true), old);
      return;
    }
    if (old.nodeType === Node.TEXT_NODE) {
      if (old.textContent !== next.textContent) old.textContent = next.textContent;
      return;
    }
    if (!(old instanceof Element) || !(next instanceof Element)) return;
    for (const attr of Array.from(old.attributes))
      if (!next.hasAttribute(attr.name)) old.removeAttribute(attr.name);
    for (const attr of Array.from(next.attributes))
      if (old.getAttribute(attr.name) !== attr.value) old.setAttribute(attr.name, attr.value);
    children(old, next);
  };
  const children = (old: Node, next: Node): void => {
    const keyed = new Map(
      Array.from(old.childNodes).flatMap((n) => (key(n) ? [[key(n)!, n] as const] : [])),
    );
    const incoming = Array.from(next.childNodes);
    for (let i = 0; i < incoming.length; i++) {
      const source = incoming[i]!,
        id = key(source),
        existing = id ? keyed.get(id) : old.childNodes[i];
      if (existing) {
        if (existing !== old.childNodes[i]) old.insertBefore(existing, old.childNodes[i] ?? null);
        patch(existing, source);
      } else old.insertBefore(source.cloneNode(true), old.childNodes[i] ?? null);
    }
    while (old.childNodes.length > incoming.length) old.removeChild(old.lastChild!);
  };
  children(element, template.content);
}
