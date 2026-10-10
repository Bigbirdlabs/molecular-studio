import { useLayoutEffect, useRef, useState } from 'react'
import { ElementPicker } from '../ElementPicker'

const GAP = 4 // the picker grid uses gap-1

/**
 * ElementPicker that never overflows its container. The grid is `columns x var(--hit)` wide (7 x 44 px + gaps = 332 px on
 * touch), which is wider than the tablet drawer (287 px content box) and a 360 px phone. The column count follows the
 * measured width, so the last element chips are never cut off and the inspector gains no horizontal scroll.
 */
export function FittedElementPicker({ value, onPick, ariaLabel, maxColumns = 7 }: {
  value: string | null; onPick: (symbol: string) => void; ariaLabel: string; maxColumns?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(maxColumns)

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const first = el.querySelector('button')
      const hit = first ? first.getBoundingClientRect().width : 0
      if (w <= 0 || hit <= 0) return
      const fit = Math.floor((w + GAP) / (hit + GAP))
      setColumns(Math.max(3, Math.min(maxColumns, fit)))
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [maxColumns])

  return (
    <div ref={box} className="min-w-0 max-w-full">
      <ElementPicker value={value} onPick={onPick} ariaLabel={ariaLabel} columns={columns} />
    </div>
  )
}
