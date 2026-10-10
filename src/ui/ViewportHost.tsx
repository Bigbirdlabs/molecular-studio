import { Component, lazy, Suspense, useMemo, type ErrorInfo, type ReactNode } from 'react'
import { Loader2, MonitorX, TriangleAlert } from 'lucide-react'
import { useStudio } from '../store'
import { useT } from './i18n'
import { PrimaryButton } from './controls'

// The 3D scene (three.js + R3F) is a separate chunk: the workspace chrome paints first.
const Viewport = lazy(() => import('../scene/Viewport'))

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

function Message({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div role="alert" className="absolute inset-0 flex items-center justify-center p-6">
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
  if (!empty) return null
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-8 text-center">
      <p className="m-0 text-ui text-ink-dim">{tool === 'atom' ? t('mol.empty.canvasHint') : t('mol.empty.canvasHintOther')}</p>
    </div>
  )
}

/**
 * Hosts the 3D scene. The scene is mounted once and never remounted by layout changes, so the camera survives
 * panel toggles, rotation and breakpoint changes. `children` are overlays (tool options ...) positioned over it.
 */
export function ViewportHost({ children }: { children?: ReactNode }) {
  const t = useT()
  const tool = useStudio((s) => s.tool)
  const webgl = useMemo(detectWebGL, [])
  return (
    <main
      id="viewport"
      data-tool={tool}
      aria-label={t('app.viewport')}
      className="viewport-bg relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden"
    >
      <div className="absolute inset-0">
        {webgl ? (
          <ViewBoundary>
            <Suspense fallback={<Loading />}>
              <Viewport />
            </Suspense>
          </ViewBoundary>
        ) : (
          <Message icon={<MonitorX size={28} aria-hidden />} title={t('app.webgl.title')} body={t('app.webgl.body')} />
        )}
      </div>
      <EmptyHint />
      {children}
    </main>
  )
}
