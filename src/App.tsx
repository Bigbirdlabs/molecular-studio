import { useEffect, useRef } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { PanelRightClose, X } from 'lucide-react'
import { useStudio } from './store'
import { useLayout, type Layout } from './ui/layout'
import { useT } from './ui/i18n'
import { useShortcuts } from './ui/shortcuts'
import { loadFromUrl } from './ui/actions'
import { TopBar } from './ui/TopBar'
import { Dock, Toolbar, ToolOptions } from './ui/Toolbar'
import { ViewportHost } from './ui/ViewportHost'
import { StatusBar } from './ui/StatusBar'
import { ToastHost } from './ui/ToastHost'
import { InspectorBody, InspectorSummaryLine } from './ui/Inspector'
import { BottomSheet } from './ui/BottomSheet'
import { LibraryDialog, PubChemDialog, SettingsDialog, ShortcutsDialog } from './ui/Dialogs'
import { useUI } from './ui/uiStore'
import { IconButton } from './ui/controls'

const INSPECTOR_KEY = 'ms:inspector'

const readDesktopInspector = (): boolean => {
  try {
    return sessionStorage.getItem(INSPECTOR_KEY) !== '0'
  } catch {
    return true
  }
}

/** Desktop and tablet inspector chrome (persistent column / overlay drawer). */
function InspectorPanel({ layout }: { layout: Layout }) {
  const t = useT()
  const open = useStudio((s) => s.inspectorOpen)
  const setOpen = useStudio((s) => s.setInspectorOpen)
  const reduced = useStudio((s) => s.reducedMotion)
  const overlay = layout === 'tablet'
  const dur = reduced ? 0 : 0.2
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="inspector"
          aria-label={t('insp.title')}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: dur, ease: [0.2, 0, 0, 1] }}
          className={
            overlay
              ? 'absolute inset-y-0 right-0 z-20 flex w-[min(360px,92%)] flex-col border-l border-line-strong bg-surface-1 shadow-[-8px_0_24px_rgba(0,0,0,0.4)]'
              : 'flex w-80 shrink-0 flex-col border-l border-line bg-surface-1'
          }
        >
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-line pl-4 pr-1">
            <h2 className="m-0 text-label font-medium text-ink-dim">{t('insp.title')}</h2>
            <IconButton
              label={overlay ? t('insp.close') : t('insp.collapse')}
              tip="left"
              icon={overlay ? <X size={16} aria-hidden /> : <PanelRightClose size={16} aria-hidden />}
              onClick={() => setOpen(false)}
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <InspectorBody />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function MobileInfoSheet() {
  const t = useT()
  const open = useStudio((s) => s.inspectorOpen)
  const setOpen = useStudio((s) => s.setInspectorOpen)
  const snap = useUI((s) => s.infoSnap)
  const setSnap = useUI((s) => s.setInfoSnap)
  return (
    <BottomSheet
      open={open}
      onClose={() => setOpen(false)}
      ariaLabel={t('insp.title')}
      snap={snap}
      onSnapChange={setSnap}
      title={<h2 className="m-0 text-title font-medium text-ink">{t('insp.title')}</h2>}
      summary={<InspectorSummaryLine />}
    >
      <InspectorBody sheet />
    </BottomSheet>
  )
}

export default function App() {
  const layout = useLayout()
  const reduced = useStudio((s) => s.reducedMotion)
  useShortcuts()

  // Reduced-motion switch for CSS transitions (the store resolves system preference + user override).
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reduced)
  }, [reduced])
  // Layout model on <html>: portaled UI (menus, dialogs, sheets) reads the same touch-target size.
  useEffect(() => {
    document.documentElement.dataset.layout = layout
  }, [layout])

  // ?m=<library id> deep link (the stored project is skipped by the store when ?m= is present).
  useEffect(() => { void loadFromUrl() }, [])

  // Inspector default per layout model; desktop remembers its state for the session.
  const lastLayout = useRef<Layout | null>(null)
  const layoutDriven = useRef(false)
  useEffect(() => {
    if (lastLayout.current === layout) return
    lastLayout.current = layout
    layoutDriven.current = true
    useStudio.getState().setInspectorOpen(layout === 'desktop' ? readDesktopInspector() : false)
    layoutDriven.current = false
  }, [layout])
  useEffect(
    () =>
      useStudio.subscribe((s, p) => {
        if (s.inspectorOpen === p.inspectorOpen || layoutDriven.current || lastLayout.current !== 'desktop') return
        try { sessionStorage.setItem(INSPECTOR_KEY, s.inspectorOpen ? '1' : '0') } catch { /* storage unavailable */ }
      }),
    [],
  )

  // Phones: picking something with the Select tool reveals its details in the sheet's peek position.
  useEffect(
    () =>
      useStudio.subscribe((s, p) => {
        if (lastLayout.current !== 'mobile' || s.tool !== 'select' || s.inspectorOpen) return
        const picked = (s.selection.length > 0 && s.selection !== p.selection) || (s.selectedBond !== null && s.selectedBond !== p.selectedBond)
        if (!picked) return
        useUI.getState().setInfoSnap('peek')
        s.setInspectorOpen(true)
      }),
    [],
  )

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-0 text-ink">
        <TopBar layout={layout} />
        <div className="relative flex min-h-0 flex-1">
          {layout !== 'mobile' && <Toolbar layout={layout} />}
          <ViewportHost>{layout !== 'mobile' && <ToolOptions layout={layout} />}</ViewportHost>
          {layout !== 'mobile' && <InspectorPanel layout={layout} />}
        </div>
        {layout === 'mobile' && <ToolOptions layout="mobile" />}
        <StatusBar layout={layout} />
        {layout === 'mobile' && <Dock />}
        {layout === 'mobile' && <MobileInfoSheet />}
        <LibraryDialog />
        <SettingsDialog />
        <ShortcutsDialog />
        <PubChemDialog />
        <ToastHost layout={layout} />
      </div>
    </MotionConfig>
  )
}
