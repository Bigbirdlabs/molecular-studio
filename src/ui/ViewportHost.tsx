import { Component, lazy, Suspense, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react'
import { Loader2, Maximize, MonitorX, RotateCcw, TriangleAlert, ZoomIn, ZoomOut } from 'lucide-react'
import { useStudio, type RenderStyle } from '../store'
import { useT, type TrKey } from './i18n'
import { IconButton, PrimaryButton, Segmented } from './controls'
import { useCoarsePointer, useShortScreen, type Layout } from './layout'

// The 3D scene (three.js + R3F) is a separate chunk: the workspace chrome paints first.
const Viewport = lazy(() => import('../scene/Viewport'))

function Message({ icon, title, body, action, alert = true }: { icon: ReactNode; title: string; body: string; action?: ReactNode; alert?: boolean }) {
  return (
    <div role={alert ? 'alert' : undefined} className="absolute inset-0 flex items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <span className="text-ink-dim">{icon}</span>
        <h2 className="m-0 text-title font-medium text-ink">{title}</h2>
        <p className="m-0 text-ui text-ink-dim">{body}</p>
        {action}
      </div>
    </div>
  )
}

function ViewError() {
  const t = useT()
  return (
    <Message
      icon={<TriangleAlert size={28} aria-hidden />}
      title={t('app.viewError.title')}
      body={t('app.viewError.body')}
      action={<PrimaryButton variant="quiet" onClick={() => window.location.reload()}>{t('app.reload')}</PrimaryButton>}
    />
  )
}

class ViewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Viewport crashed', error, info.componentStack) }
  render() { return this.state.failed ? <ViewError /> : this.props.children }
}

function Loading() {
  const t = useT()
  return (
    <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-ui text-ink-dim">
      <Loader2 size={16} aria-hidden className="animate-spin" />
      {t('app.loading3d')}
    </div>
  )
}

function EmptyHint() {
  const t = useT()
  const empty = useStudio((s) => s.mol.atoms.length === 0)
  const tool = useStudio((s) => s.tool)
  const coarse = useCoarsePointer()
  if (!empty) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-8 text-center">
      <p className="m-0 text-ui text-ink-dim">{tool === 'atom' ? t(coarse ? 'mol.empty.canvasHintTouch' : 'mol.empty.canvasHint') : t('mol.empty.canvasHintOther')}</p>
    </div>
  )
}

const STYLES: RenderStyle[] = ['ballstick', 'spacefill', 'stick', 'wireframe']

/**
 * On-canvas HUD: render-style control plus zoom / fit / reset. Desktop and tablet pin it to the bottom edge
 * (style left, camera right); phones keep it at the top so it never competes with the info sheet.
 */
function Hud({ layout }: { layout: Layout }) {
  const t = useT()
  const style = useStudio((s) => s.style)
  const setStyle = useStudio((s) => s.setStyle)
  const empty = useStudio((s) => s.mol.atoms.length === 0)
  const mobile = layout === 'mobile'
  const short = useShortScreen()
  const run = (f: (st: ReturnType<typeof useStudio.getState>) => void) => () => f(useStudio.getState())
  const reason = t('act.reason.empty')
  const camera = (
    <div
      role="group"
      aria-label={t('hud.cameraGroup')}
      className={`pointer-events-auto flex rounded-panel border border-hud-line bg-hud p-0.5 ${mobile || short ? 'flex-col' : ''} ${short ? 'hud-compact' : ''}`}
    >
      <IconButton label={t('act.zoomIn')} tip={mobile ? false : short ? 'left' : 'top'} icon={<ZoomIn size={18} aria-hidden />} disabled={empty} disabledReason={reason} onClick={run((st) => st.zoomBy(1.25))} />
      <IconButton label={t('act.zoomOut')} tip={mobile ? false : short ? 'left' : 'top'} icon={<ZoomOut size={18} aria-hidden />} disabled={empty} disabledReason={reason} onClick={run((st) => st.zoomBy(0.8))} />
      <IconButton
        label={t('hud.fit')}
        tip={mobile ? false : short ? 'left' : 'top'}
        icon={<Maximize size={18} aria-hidden />}
        disabled={empty}
        disabledReason={reason}
        onClick={() => useStudio.setState((s) => ({ fitNonce: s.fitNonce + 1 }))}
      />
      <IconButton label={t('act.resetCamera')} shortcut="F" tip={mobile ? false : short ? 'left' : 'top'} icon={<RotateCcw size={18} aria-hidden />} onClick={run((st) => st.resetCamera())} />
    </div>
  )
  const styles = (
    <div className={`pointer-events-auto ${mobile ? 'w-full' : ''} ${short ? 'hud-compact' : ''}`}>
      <Segmented<RenderStyle>
        hud
        fill={mobile}
        vertical={short && !mobile}
        ariaLabel={t('hud.styleGroup')}
        value={style}
        onChange={setStyle}
        options={STYLES.map((s) => ({ value: s, label: t(`style.${s}` as TrKey) }))}
      />
    </div>
  )
  if (mobile) {
    return (
      <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex flex-col items-end gap-2">
        {styles}
        {camera}
      </div>
    )
  }
  if (short) {
    // Phone landscape: two narrow columns on the left / right edges (the fitted molecule is centred and width is the spare dimension),
    // so the HUD never wraps into rows that sit on top of it.
    return (
      <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex items-end justify-between gap-2">
        {styles}
        {camera}
      </div>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-10 flex flex-wrap items-end justify-between gap-2">
      {styles}
      {camera}
    </div>
  )
}

/** True while the scene reports that WebGL is unavailable (the scene probes once and renders our fallback). */
function useWebglUnavailable(host: React.RefObject<HTMLElement | null>): boolean {
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    const node = host.current
    if (!node) return
    const check = () => setUnavailable(!!node.querySelector('[data-viewport-state="webgl-unavailable"]'))
    check()
    const mo = new MutationObserver(check)
    mo.observe(node, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [host])
  return unavailable
}

/**
 * Hosts the 3D scene. The scene is mounted once and never remounted by layout changes, so the camera survives
 * panel toggles, rotation and breakpoint changes. `children` are overlays (tool options ...) positioned over it.
 */
export function ViewportHost({ layout, children }: { layout: Layout; children?: ReactNode }) {
  const t = useT()
  const tool = useStudio((s) => s.tool)
  const host = useRef<HTMLElement>(null)
  const noWebgl = useWebglUnavailable(host)
  // One WebGL probe and one context-loss overlay, both owned by the scene (scene/Viewport.tsx); the UI only supplies the fallback text.
  const fallback = <Message alert={false} icon={<MonitorX size={28} aria-hidden />} title={t('app.webgl.title')} body={t('app.webgl.body')} />
  return (
    <main
      ref={host}
      id="viewport"
      data-tool={tool}
      aria-label={t('app.viewport')}
      className="viewport-bg relative min-h-0 min-w-0 flex-1 overflow-hidden"
    >
      <div className="absolute inset-0">
        <ViewBoundary>
          <Suspense fallback={<Loading />}>
            <Viewport fallback={fallback} />
          </Suspense>
        </ViewBoundary>
      </div>
      <EmptyHint />
      {!noWebgl && <Hud layout={layout} />}
      {children}
    </main>
  )
}
