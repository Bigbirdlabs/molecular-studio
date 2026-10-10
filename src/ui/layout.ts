import { useSyncExternalStore } from 'react'

export type Layout = 'desktop' | 'tablet' | 'mobile'

/** desktop >= 1200, tablet 768-1199, mobile < 768 (px of viewport width). */
const QUERIES = ['(min-width: 1200px)', '(min-width: 768px)'] as const

function current(): Layout {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'desktop'
  if (window.matchMedia(QUERIES[0]).matches) return 'desktop'
  if (window.matchMedia(QUERIES[1]).matches) return 'tablet'
  return 'mobile'
}

function subscribe(cb: () => void): () => void {
  const mqs = QUERIES.map((q) => window.matchMedia(q))
  for (const m of mqs) m.addEventListener('change', cb)
  return () => { for (const m of mqs) m.removeEventListener('change', cb) }
}

export function useLayout(): Layout {
  return useSyncExternalStore(subscribe, current, () => 'desktop' as Layout)
}

/** Viewport height that tracks mobile browser chrome (visualViewport when available). */
export function useViewportHeight(): number {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb)
      window.visualViewport?.addEventListener('resize', cb)
      return () => {
        window.removeEventListener('resize', cb)
        window.visualViewport?.removeEventListener('resize', cb)
      }
    },
    () => Math.round(window.visualViewport?.height ?? window.innerHeight),
    () => 800,
  )
}
