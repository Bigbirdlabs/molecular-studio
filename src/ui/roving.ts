import { useEffect, useRef, type KeyboardEvent } from 'react'

interface RovingOptions {
  /** Which arrow keys move focus. Radio groups use "both"; the vertical rail uses "vertical". */
  orientation?: 'horizontal' | 'vertical' | 'both'
  /** Grid width for two-dimensional groups (up/down move by a row). */
  columns?: number
  /** Radio semantics: moving focus also selects (clicks) the new item. */
  select?: boolean
}

/**
 * Roving tabindex for toolbars and radio groups: the group is a single Tab stop, arrow keys / Home / End move
 * focus between its buttons. Attach `ref` and `onKeyDown` to the container.
 */
export function useRoving<T extends HTMLElement = HTMLDivElement>({ orientation = 'both', columns, select = false }: RovingOptions = {}) {
  const ref = useRef<T>(null)
  const stop = useRef<HTMLElement | null>(null)

  const items = (): HTMLButtonElement[] => Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])

  // Exactly one tab stop: the last focused item, else the checked / pressed one, else the first.
  useEffect(() => {
    const list = items()
    if (!list.length) return
    const current =
      (stop.current && list.includes(stop.current as HTMLButtonElement) ? stop.current : null) ??
      list.find((b) => b.getAttribute('aria-checked') === 'true' || b.getAttribute('aria-pressed') === 'true') ??
      list[0]
    for (const b of list) b.tabIndex = b === current ? 0 : -1
  })

  const onFocus = (e: React.FocusEvent) => {
    const t = e.target as HTMLElement
    if (t.tagName === 'BUTTON') {
      stop.current = t
      for (const b of items()) b.tabIndex = b === t ? 0 : -1
    }
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const list = items()
    const i = list.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    const horizontal = orientation !== 'vertical'
    const vertical = orientation !== 'horizontal'
    let n = i
    switch (e.key) {
      case 'ArrowRight': if (!horizontal) return; n = i + 1; break
      case 'ArrowLeft': if (!horizontal) return; n = i - 1; break
      case 'ArrowDown': if (!vertical) return; n = i + (columns ?? 1); break
      case 'ArrowUp': if (!vertical) return; n = i - (columns ?? 1); break
      case 'Home': n = 0; break
      case 'End': n = list.length - 1; break
      default: return
    }
    e.preventDefault()
    e.stopPropagation()
    n = columns ? Math.max(0, Math.min(list.length - 1, n)) : (n + list.length) % list.length
    const target = list[n]
    if (!target) return
    stop.current = target
    target.focus()
    if (select && target !== list[i]) target.click()
  }

  return { ref, onKeyDown, onFocus }
}
