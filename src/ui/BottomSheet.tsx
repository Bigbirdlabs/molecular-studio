import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useDragControls, useMotionValue, type PanInfo } from 'motion/react'
import { X } from 'lucide-react'
import { useStudio } from '../store'
import { useViewportHeight } from './layout'
import { useT, type TrKey } from './i18n'
import { useUI, type SheetSnap } from './uiStore'

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
const FOCUSABLE = 'a[href],button:not([disabled]):not([aria-disabled="true"]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'

const SNAP_ORDER: SheetSnap[] = ['peek', 'half', 'full']

/**
 * Draggable bottom sheet (peek / half / full). Dragging starts from the handle area only, so the
 * content can scroll natively. Modal sheets (dialogs) close on a swipe past the lowest snap, Esc and the X button;
 * the non-modal info sheet is never dismissed below peek (D.8): Esc / Back drop one detent, the grabber is a button
 * that names the detent and steps through them, and the full detent has a scrim that returns to half.
 */
export function BottomSheet({ open, onClose, title, ariaLabel, snap, onSnapChange, snaps = ['peek', 'half', 'full'], modal, summary, children }: Props) {
  const t = useT()
  const reduced = useStudio((s) => s.reducedMotion)
  const vh = useViewportHeight()
  // Non-modal sheets rest on top of the bottom chrome (tool options, status bar, dock) so the tools stay reachable.
  const chrome = useUI((s) => s.chromeBottom)
  const bottomInset = modal ? 0 : Math.min(chrome, Math.round(vh * 0.4))
  const base = vh - bottomInset
  const sheetH = Math.round(base * FRACTION.full)
  const heightOf = (s: SheetSnap) => (s === 'peek' ? PEEK_PX : Math.round(base * FRACTION[s]))
  const yOf = (s: SheetSnap) => sheetH - heightOf(s)
  const closedY = sheetH + 24

  const y = useMotionValue(closedY)
  const controls = useDragControls()
  const [mounted, setMounted] = useState(open)
  const panel = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<Element | null>(null)
  // Latest values for the document-level key handler (it must not re-register on every snap change).
  const live = useRef({ snap, snaps, onSnapChange, onClose })
  live.current = { snap, snaps, onSnapChange, onClose }
  const grabDown = useRef<{ x: number; y: number } | null>(null)
  const ordered = SNAP_ORDER.filter((s) => snaps.includes(s))

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

  // Focus enters the sheet only once it is actually mounted (on first open the panel does not exist yet when `open` flips),
  // and goes to the search/first field when the content has one, else to the panel itself.
  useEffect(() => {
    if (!open || !mounted) return
    const node = panel.current
    if (!node || node.contains(document.activeElement)) return
    const field = modal ? node.querySelector<HTMLElement>('[data-autofocus]') : null
    ;(field ?? node).focus({ preventScroll: true })
  }, [open, mounted])

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement
    // On document (before the window-level shortcuts): preventDefault so one Esc does exactly one thing.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!modal && useUI.getState().dialog) return // a dialog above this sheet owns Esc
        if (modal) { e.preventDefault(); live.current.onClose(); return }
        // Non-modal info sheet: drop one detent; at the lowest detent Esc is left to the rest of the app.
        const { snap: cur, snaps: all, onSnapChange: change } = live.current
        const order = SNAP_ORDER.filter((s) => all.includes(s))
        const i = order.indexOf(cur)
        if (i > 0) { e.preventDefault(); change(order[i - 1]) }
        return
      }
      if (e.key !== 'Tab' || !modal) return
      // Modal sheets trap focus like the desktop dialog.
      const node = panel.current
      if (!node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      if (!items.length) { e.preventDefault(); node.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!node.contains(active) || (active === node && !e.shiftKey)) { e.preventDefault(); (e.shiftKey ? last : first).focus() }
      else if (e.shiftKey && (active === first || active === node)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      const back = returnFocus.current
      if (back instanceof HTMLElement && back.isConnected && back !== document.body) back.focus({ preventScroll: true })
    }
  }, [open, modal])

  if (!mounted) return null

  const onDragEnd = (_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const projected = y.get() + info.velocity.y * 0.22
    const stops: { id: SheetSnap | 'closed'; y: number }[] = [
      ...snaps.map((s) => ({ id: s, y: yOf(s) })),
      ...(modal ? [{ id: 'closed' as const, y: closedY }] : []),
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

  const step = (dir: 1 | -1) => {
    const i = ordered.indexOf(snap)
    const next = ordered[Math.min(ordered.length - 1, Math.max(0, i + dir))]
    if (next !== undefined && next !== snap) onSnapChange(next)
  }
  const cycle = () => {
    const i = ordered.indexOf(snap)
    onSnapChange(ordered[(i + 1) % ordered.length])
  }
  const onGrabKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); step(1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(-1) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle() }
  }

  // The full-detent scrim starts below the app header so Undo / Info stay directly tappable.
  const headerBottom = !modal && snap === 'full' ? Math.max(0, Math.round(document.querySelector('[data-app-header]')?.getBoundingClientRect().bottom ?? 0)) : 0

  const sheet = (
    <>
      {modal && (
        <div
          className="fixed inset-0 z-[84] bg-black/55 transition-opacity duration-200"
          onPointerDown={onClose}
          aria-hidden="true"
        />
      )}
      {!modal && snap === 'full' && (
        <div
          className="fixed inset-x-0 z-[74] bg-black/45"
          style={{ top: headerBottom, bottom: bottomInset }}
          onPointerDown={() => onSnapChange('half')}
          aria-hidden="true"
          data-sheet-scrim="full"
        />
      )}
      <div className={`pointer-events-none fixed inset-x-0 top-0 overflow-hidden ${modal ? 'z-[85]' : 'z-[75]'}`} style={{ bottom: bottomInset }}>
      <motion.div
        ref={panel}
        tabIndex={-1}
        role={modal ? 'dialog' : 'complementary'}
        aria-modal={modal || undefined}
        aria-label={ariaLabel}
        drag="y"
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: Math.min(...snaps.map(yOf)), bottom: modal ? closedY : Math.max(...snaps.map(yOf)) }}
        dragElastic={0.03}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        style={{ y, height: sheetH }}
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-[14px] border-x border-t border-line-strong bg-surface-1 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] outline-none"
      >
        <div
          className="flex shrink-0 touch-none flex-col items-stretch px-4 pb-2 pt-2"
          onPointerDown={(e) => { if (!(e.target as HTMLElement).closest('button')) controls.start(e) }}
        >
          <div
            role="button"
            tabIndex={0}
            aria-label={t('sheet.grabber', { detent: t(`sheet.detent.${snap}` as TrKey) })}
            onKeyDown={onGrabKey}
            onPointerDown={(e) => { grabDown.current = { x: e.clientX, y: e.clientY } }}
            onClick={(e) => {
              const d = grabDown.current
              grabDown.current = null
              // a tap (not the end of a drag) steps through the detents; keyboard "clicks" have no pointer-down position
              if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4) cycle()
            }}
            className="-mb-2 -mt-2 mx-auto flex h-11 w-16 shrink-0 cursor-grab items-center justify-center rounded-ctl focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          >
            <span aria-hidden="true" className="block h-1 w-9 rounded-full bg-line-strong" />
          </div>
          <div className="flex min-h-11 items-center gap-2">
            <div className="min-w-0 flex-1">{title}</div>
            {modal && (
              <button
                type="button"
                aria-label={t('sheet.close')}
                onClick={onClose}
                className="inline-flex size-11 items-center justify-center rounded-ctl text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <X size={18} aria-hidden />
              </button>
            )}
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
      </div>
    </>
  )
  return createPortal(sheet, document.body)
}
