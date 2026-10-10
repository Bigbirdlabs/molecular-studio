/**
 * Brings `box` into view inside its own scrollable content area, and nowhere else.
 * `Element.scrollIntoView` also scrolls overflow:hidden ancestors, and the bottom-sheet wrapper is one of those:
 * scrolling it shifts every detent of the sheet until reload. Only an ancestor that really scrolls (overflow-y auto/scroll)
 * is moved here.
 */
export function revealInScroller(box: HTMLElement | null): void {
  if (!box || typeof window === 'undefined') return
  let host: HTMLElement | null = box.parentElement
  while (host) {
    const oy = window.getComputedStyle(host).overflowY
    if (oy === 'auto' || oy === 'scroll') break
    host = host.parentElement
  }
  if (!host) return
  const h = host.getBoundingClientRect()
  const b = box.getBoundingClientRect()
  if (b.bottom > h.bottom) host.scrollTop += Math.min(b.bottom - h.bottom, b.top - h.top)
  else if (b.top < h.top) host.scrollTop -= h.top - b.top
}

/** Reveal after the next layout, so content that just mounted (an opened section) is measured. */
export function revealSoon(box: HTMLElement | null): void {
  if (typeof requestAnimationFrame === 'undefined') { revealInScroller(box); return }
  requestAnimationFrame(() => requestAnimationFrame(() => revealInScroller(box)))
}
