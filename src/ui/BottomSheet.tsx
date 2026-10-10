import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useDragControls, useMotionValue, type PanInfo } from 'motion/react'
import { X } from 'lucide-react'
import { useStudio } from '../store'
import { useViewportHeight } from './layout'
import { useT } from './i18n'
import type { SheetSnap } from './uiStore'

interface Props {
  open: boolean
  onClose: () => void
  title: ReactNode
  ariaLabel: string
  snap: SheetSnap
  onSnapChange: (s: SheetSnap) => void
  /** Allowed snap points (default: all three). */
  snaps?: SheetSnap[]
  /** Modal sheets dim the viewport and trap focus semantics; non-modal ones leave the 3D view interactive. */
  modal?: boolean
  /** Always-visible summary under the title (what the "peek" snap shows). */
  summary?: ReactNode
  children: ReactNode
}

const FRACTION: Record<SheetSnap, number> = { peek: 0, half: 0.5, full: 0.9 }
const PEEK_PX = 132

/**
 * Draggable bottom sheet (peek / half / full). Dragging starts from the handle area only, so the
 * content can scroll natively; swipe down past the lowest snap to close.
 */
export function BottomSheet({ open, onClose, title, ariaLabel, snap, onSnapChange, snaps = ['peek', 'half', 'full'], modal, summary, children }: Props) {
  const t = useT()
  const reduced = useStudio((s) => s.reducedMotion)
  const vh = useViewportHeight()
  const sheetH = Math.round(vh * FRACTION.full)
  const heightOf = (s: SheetSnap) => (s === 'peek' ? PEEK_PX : Math.round(vh * FRACTION[s]))
  const yOf = (s: SheetSnap) => sheetH - heightOf(s)
  const closedY = sheetH + 24

  const y = useMotionValue(closedY)
  const controls = useDragControls()
  const [mounted, setMounted] = useState(open)
  const panel = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<Element | null>(null)

  useEffect(() => {
    const target = open ? yOf(snap) : closedY
    if (open) setMounted(true)
    if (reduced) {
      y.set(target)
      if (!open) setMounted(false)
      return
    }
    const controlsAnim = animate(y, target, {
      type: 'tween', duration: 0.28, ease: [0.2, 0, 0, 1],
      onComplete: () => { if (!open) setMounted(false) },
    })
    return () => controlsAnim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, snap, vh, reduced])

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement
    panel.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus({ preventScroll: true })
    }
  }, [open, onClose])

  if (!mounted) return null

  const onDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const projected = y.get() + info.velocity.y * 0.22
    const stops: { id: SheetSnap | 'closed'; y: number }[] = [
      ...snaps.map((s) => ({ id: s, y: yOf(s) })),
      { id: 'closed', y: closedY },
    ]
    let best = stops[0]
    for (const s of stops) if (Math.abs(s.y - projected) < Math.abs(best.y - projected)) best = s
    if (best.id === 'closed') onClose()
    else {
      if (reduced) y.set(best.y)
      else animate(y, best.y, { type: 'tween', duration: 0.22, ease: [0.2, 0, 0, 1] })
      onSnapChange(best.id)
    }
  }

  const sheet = (
    <>
      {modal && (
        <div
          className="fixed inset-0 z-[70] bg-black/55 transition-opacity duration-200"
          onPointerDown={onClose}
          aria-hidden="true"
        />
      )}
      <motion.div
        ref={panel}
        tabIndex={-1}
        role={modal ? 'dialog' : 'complementary'}
        aria-modal={modal || undefined}
        aria-label={ariaLabel}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: Math.min(...snaps.map(yOf)), bottom: closedY }}
        dragElastic={0.03}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        style={{ y, height: sheetH }}
        className="fixed inset-x-0 bottom-0 z-[75] flex flex-col rounded-t-[14px] border-x border-t border-line-strong bg-surface-1 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] outline-none"
      >
        <div
          className="flex shrink-0 touch-none flex-col items-stretch px-4 pb-2 pt-2"
          onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('button')) controls.start(e) }}
        >
          <div aria-hidden="true" className="mx-auto mb-2 h-1 w-9 rounded-full bg-line-strong" />
          <div className="flex min-h-11 items-center gap-2">
            <div className="min-w-0 flex-1">{title}</div>
            <button
              type="button"
              aria-label={t('sheet.close')}
              onClick={onClose}
              className="inline-flex size-11 items-center justify-center rounded-ctl text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
          {summary}
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line"
          style={{ paddingBottom: sheetH - heightOf(snap) + 16 }}
        >
          {children}
        </div>
      </motion.div>
    </>
  )
  return createPortal(sheet, document.body)
}
