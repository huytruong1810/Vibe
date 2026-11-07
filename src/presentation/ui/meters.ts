import { escapeHtml } from './view';

export function meterFraction(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
export function meterPixels(value: number, innerWidth: number): number {
  return Math.floor((meterFraction(value) * Math.max(0, innerWidth)) / 2) * 2;
}
export function meterMarkup(label: string, value: number, compact = false): string {
  const safe = meterFraction(value);
  return `<div class="need${compact ? ' compact-need' : ''}" title="${escapeHtml(label)}: ${Math.round(safe * 100)}%"><span class="need-label"${compact ? ' aria-hidden="true"' : ''}>${escapeHtml(compact ? label[0]! : label)}</span><div class="meter kit-meter" data-kind="need" data-value="${safe}" role="progressbar" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${safe * 100}"><i class="kit-fill"></i></div>${compact ? '' : `<small>${Math.round(safe * 100)}%</small>`}</div>`;
}
export function setMeter(track: HTMLElement, value: number): void {
  const fraction = meterFraction(value);
  track.dataset.value = String(fraction);
  track.setAttribute('aria-valuenow', String(fraction * 100));
}
/** One bounded DOM pass after patching; hidden panels are measured on reopening. */
export function refreshMeters(root: ParentNode = document): void {
  for (const track of root.querySelectorAll<HTMLElement>('.kit-meter')) {
    const pixels = meterPixels(Number(track.dataset.value ?? 0), track.clientWidth);
    const fill = track.querySelector<HTMLElement>('.kit-fill');
    if (fill && fill.style.width !== `${pixels}px`) fill.style.width = `${pixels}px`;
  }
}
