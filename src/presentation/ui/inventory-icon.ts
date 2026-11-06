import type { AppearanceResolver } from '../assets/catalog';
import { appUrl } from '../assets/url';

/** Draw the approved atlas rectangle at 32 px while retaining its transparent source margin. */
export function inventoryIcon(
  resolver: AppearanceResolver | null | undefined,
  item: string,
  base?: string,
): string {
  const appearance = resolver?.resolve('item', item);
  if (!resolver || appearance?.stage !== 'approved' || !appearance.frameId) return '';
  const frame = resolver.catalog.frames.find((f) => f.id === appearance.frameId);
  const page = frame && resolver.catalog.pages.find((p) => p.id === frame.pageId);
  if (!frame || !page) return '';
  const scale = 32 / Math.max(frame.sourceSize.w, frame.sourceSize.h);
  const url = appUrl(page.imageUrl, base);
  return `<span class="inventory-sprite" aria-hidden="true" style="display:inline-block;position:relative;width:32px;height:32px;overflow:hidden"><span style="position:absolute;left:${frame.trim.x * scale}px;top:${frame.trim.y * scale}px;width:${frame.rect.w * scale}px;height:${frame.rect.h * scale}px;background-image:url(${url});background-position:${-frame.rect.x * scale}px ${-frame.rect.y * scale}px;background-size:${page.width * scale}px ${page.height * scale}px;image-rendering:pixelated"></span></span>`;
}
