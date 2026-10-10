import { useSyncExternalStore } from 'react'

export type Layout = 'desktop' | 'tablet' | 'mobile'

/** SPEC D.8: desktop >= 1024, tablet 640-1023, mobile < 640 (px of viewport width). */
const QUERIES = ['(min-width: 1024px)', '(min-width: 640px)'] as const

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

/** Reactive media query (false on the server / without matchMedia). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  )
}

/** Viewport height < 500 px (phone landscape): compact chrome. */
export const useShortScreen = (): boolean => useMediaQuery('(max-height: 499px)')

/** Primary pointer is coarse (touch). */
export const useCoarsePointer = (): boolean => useMediaQuery('(pointer: coarse)')

/** navigator.onLine, reactive. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    () => true,
  )
}
