import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useStudio } from '../store'
import { useT } from './i18n'
import { useLayout } from './layout'
import { BottomSheet } from './BottomSheet'
import type { SheetSnap } from './uiStore'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Tailwind max-width class for the desktop/tablet dialog. */
  widthClass?: string
  /** Full-height dialog body (library). */
  tall?: boolean
}

const FOCUSABLE = 'a[href],button:not([disabled]):not([aria-disabled="true"]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'

/** Dialog on desktop and tablet, bottom sheet on phones. */
export function Modal({ open, onClose, title, children, widthClass = 'max-w-[560px]', tall }: ModalProps) {
  const layout = useLayout()
  const [snap, setSnap] = useState<SheetSnap>(tall ? 'full' : 'half')
  const t = useT()

  if (layout === 'mobile') {
    return (
      <BottomSheet
        open={open}
        onClose={onClose}
        ariaLabel={title}
        modal
        snap={snap}
        onSnapChange={setSnap}
        snaps={['half', 'full']}
        title={<h2 className="m-0 truncate text-title font-medium text-ink">{title}</h2>}
      >
        {children}
      </BottomSheet>
    )
  }
  return <DesktopDialog open={open} onClose={onClose} title={title} widthClass={widthClass} tall={tall} closeLabel={t('dlg.close')}>{children}</DesktopDialog>
}

function DesktopDialog({
  open, onClose, title, children, widthClass, tall, closeLabel,
}: ModalProps & { closeLabel: string; widthClass: string }) {
  const reduced = useStudio((s) => s.reducedMotion)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const dur = reduced ? 0 : 0.18

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const node = panel.current
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? node)?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab' || !node) return
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null)
      if (!items.length) { e.preventDefault(); return }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true })
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur }}
            onPointerDown={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: dur, ease: [0.2, 0, 0, 1] }}
            className={`relative flex max-h-[min(88vh,820px)] w-full flex-col overflow-hidden rounded-panel border border-line-strong bg-surface-1 shadow-xl shadow-black/60 outline-none ${widthClass} ${tall ? 'h-[min(88vh,820px)]' : ''}`}
          >
            <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2.5">
              <h2 id={titleId} className="m-0 flex-1 text-title font-medium text-ink">{title}</h2>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={onClose}
                className="inline-flex size-(--hit) items-center justify-center rounded-ctl text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <X size={16} aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
