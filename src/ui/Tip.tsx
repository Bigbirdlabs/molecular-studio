import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const LONG_PRESS_MS = 500

export type TipSide = 'right' | 'bottom' | 'top' | 'left'

interface TipProps {
  label: string
  shortcut?: string
  /** Extra line shown under the label (e.g. why a control is disabled). */
  note?: string
  side?: TipSide
  children: ReactNode
  className?: string
}

interface Pos { left?: number; right?: number; top?: number; bottom?: number; tx: string; ty: string }

/**
 * Lightweight tooltip rendered in a portal (so scrolling toolbars cannot clip it).
 * Mouse hover, keyboard focus, and a 500 ms long press on touch / pen (which replaces hover there);
 * the press that opened a tooltip does not also activate the control.
 */
export function Tip({ label, shortcut, note, side = 'right', children, className = '' }: TipProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setPos(null)
  }, [])

  const show = useCallback(
    (delay: number) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const gap = 8
        if (side === 'right') setPos({ left: r.right + gap, top: r.top + r.height / 2, tx: '0', ty: '-50%' })
        else if (side === 'left') setPos({ right: window.innerWidth - r.left + gap, top: r.top + r.height / 2, tx: '0', ty: '-50%' })
        else {
          const cx = r.left + r.width / 2
          const vertical = side === 'bottom' ? { top: r.bottom + gap } : { bottom: window.innerHeight - r.top + gap }
          if (cx > window.innerWidth - 160) setPos({ ...vertical, right: Math.max(8, window.innerWidth - r.right), tx: '0', ty: '0' })
          else if (cx < 120) setPos({ ...vertical, left: Math.max(8, r.left), tx: '0', ty: '0' })
          else setPos({ ...vertical, left: cx, tx: '-50%', ty: '0' })
        }
      }, delay)
    },
    [side],
  )

  const clearPress = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
  }, [])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
    if (pressTimer.current) clearTimeout(pressTimer.current)
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') { hide(); return }
    longPressed.current = false
    clearPress()
    if (hideTimer.current) clearTimeout(hideTimer.current)
    pressTimer.current = setTimeout(() => { longPressed.current = true; show(0) }, LONG_PRESS_MS)
  }
  const onPointerEnd = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    clearPress()
    if (longPressed.current) {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(hide, 1800) // keep the tooltip readable after the finger lifts
    }
  }

  return (
    <>
      <span
        ref={ref}
        className={`inline-flex [-webkit-touch-callout:none] ${className}`}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') show(380) }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') hide() }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => { if (longPressed.current) { e.preventDefault(); e.stopPropagation(); longPressed.current = false } }}
        onContextMenu={(e) => { if (longPressed.current) e.preventDefault() }}
        onFocus={(e) => { if ((e.target as HTMLElement).matches(':focus-visible')) show(0) }}
        onBlur={hide}
        onKeyDown={(e) => { if (e.key === 'Escape') hide() }}
      >
        {children}
      </span>
      {pos &&
        createPortal(
          <div
            role="tooltip"
            aria-hidden="true"
            className="tip-in pointer-events-none fixed z-[100] flex max-w-[260px] flex-col gap-0.5 rounded-ctl border border-line-strong bg-surface-3 px-2 py-1 text-label text-ink shadow-lg shadow-black/40"
            style={{
              left: pos.left, right: pos.right, top: pos.top, bottom: pos.bottom,
              transform: `translate(${pos.tx}, ${pos.ty})`,
            }}
          >
            <span className="flex items-center gap-2 whitespace-nowrap">
              {label}
              {shortcut && <kbd className="rounded-[4px] border border-line-strong bg-surface-1 px-1 font-mono text-micro text-ink-dim">{shortcut}</kbd>}
            </span>
            {note && <span className="text-label text-ink-dim">{note}</span>}
          </div>,
          document.body,
        )}
    </>
  )
}
