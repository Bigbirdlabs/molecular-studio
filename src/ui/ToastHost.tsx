import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useStudio, type ToastKind } from '../store'
import { hasKey, useT } from './i18n'
import type { Layout } from './layout'

const ICONS: Record<ToastKind, typeof Info> = { info: Info, success: CheckCircle2, warn: AlertTriangle, error: XCircle }
const TONE: Record<ToastKind, string> = { info: 'text-accent', success: 'text-ok', warn: 'text-warn', error: 'text-danger' }

/** Renders the store's current toast, translated through its code when one is provided. */
export function ToastHost({ layout }: { layout: Layout }) {
  const t = useT()
  const toast = useStudio((s) => s.toast)
  const reduced = useStudio((s) => s.reducedMotion)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => {
      if (useStudio.getState().toast?.id === toast.id) useStudio.setState({ toast: null })
    }, toast.kind === 'error' ? 7000 : 4000)
    return () => clearTimeout(id)
  }, [toast])

  const key = toast?.code ? `toast.${toast.code}` : null
  const text = toast ? (key && hasKey(key) ? t(key, toast.params) : toast.text) : ''
  const Icon = toast ? ICONS[toast.kind] : Info

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 z-[95] flex justify-center px-3 ${layout === 'mobile' ? 'bottom-[calc(132px+env(safe-area-inset-bottom))]' : 'bottom-10'}`}
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduced ? 0 : 6 }}
            transition={{ duration: reduced ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
            className="pointer-events-auto flex max-w-[min(520px,100%)] items-start gap-2.5 rounded-panel border border-line-strong bg-surface-2 py-2 pl-3 pr-1.5 text-ui text-ink shadow-lg shadow-black/50"
          >
            <Icon size={16} aria-hidden className={`mt-0.5 shrink-0 ${TONE[toast.kind]}`} />
            <span className="min-w-0 flex-1 py-px">{text}</span>
            <button
              type="button"
              aria-label={t('toast.dismiss')}
              onClick={() => useStudio.setState({ toast: null })}
              className="inline-flex size-(--hit) shrink-0 -my-1 items-center justify-center rounded-ctl text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
            >
              <X size={14} aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
