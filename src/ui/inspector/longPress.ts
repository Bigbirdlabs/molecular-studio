import { useSyncExternalStore } from 'react'
import { ATOM_LONG_PRESS_EVENT } from '../../scene/pickApi'

/**
 * Touch long-press on an atom (B.12). The scene selects the atom, raises the sheet and dispatches ATOM_LONG_PRESS_EVENT;
 * the atom card reveals its quick actions (change element, delete) in response. The listener is installed at module load
 * because the atom card usually mounts only after the event fired (the sheet opens in the same tick).
 */
const WINDOW_MS = 2500
let tick = 0
let lastAt = 0
const subs = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener(ATOM_LONG_PRESS_EVENT, () => {
    tick += 1
    lastAt = Date.now()
    subs.forEach((f) => f())
  })
}

const subscribe = (f: () => void): (() => void) => {
  subs.add(f)
  return () => { subs.delete(f) }
}

/** Counter that increments on every atom long-press. */
export const useLongPressTick = (): number => useSyncExternalStore(subscribe, () => tick, () => 0)

/** True while the most recent long-press is fresh enough to belong to the panel that is mounting now. */
export const longPressIsFresh = (): boolean => tick > 0 && Date.now() - lastAt < WINDOW_MS
