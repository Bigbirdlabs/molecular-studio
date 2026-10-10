import './consoleFilter'
import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useStudio } from '../store'
import { t as translate } from '../ui/i18n'
import { Announcer } from './Announcer'
import { Background } from './Background'
import { CameraRig } from './CameraRig'
import { HoverTip } from './HoverTip'
import { Interaction } from './Interaction'
import { Lighting } from './Lighting'
import { MoleculeLayer } from './MoleculeLayer'
import { SceneCtx, createSceneContext } from './sceneContext'
import { ACCENT, FOV, LABEL_COLOR, SURFACE_0 } from './theme'

export interface ViewportProps {
  /** Shown instead of the canvas when WebGL is unavailable or the context cannot be created (UI supplies the translated message). */
  fallback?: ReactNode
  /** Accessible name of the 3D canvas region (translated by the UI). */
  label?: string
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext | null
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext() // do not hold a context slot for the probe
    return true
  } catch {
    return false
  }
}

/** Catches render-time errors inside the canvas tree (frame-loop errors arrive through `SceneContext.onFailure` instead). */
class SceneBoundary extends Component<{ fallback: ReactNode; onError: (error: unknown) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('Scene crashed', error)
    this.props.onError(error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const RELOAD_AFTER_MS = 3000

const FILL: CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' }

/**
 * Keyboard focus ring for the canvas (SPEC B.4): 2 px accent, inset, only for keyboard focus. `!important` because the
 * app stylesheet resets `#viewport canvas { outline: none }` with an id selector that would otherwise win on specificity.
 */
const FOCUS_CSS = `[data-viewport="3d"] canvas:focus{outline:none}[data-viewport="3d"] canvas:focus-visible{outline:2px solid ${ACCENT} !important;outline-offset:-2px !important}`

const OVERLAY: CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 12, padding: 24, textAlign: 'center', background: 'rgba(10, 11, 13, 0.85)', color: LABEL_COLOR, fontSize: 14,
}
const RELOAD_BTN: CSSProperties = {
  font: 'inherit', cursor: 'pointer', color: ACCENT, background: 'transparent', border: `1px solid ${ACCENT}`, borderRadius: 6, padding: '6px 14px',
}

/**
 * A scene failure that is NOT a missing WebGL (a render-time or frame-loop error): the app.viewError strings of SPEC B.9
 * with a button that rebuilds the 3D view in place. The molecule, the undo history and the camera survive; a page reload
 * would drop the history.
 */
function ViewFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" data-viewport-state="view-error" style={{ ...FILL, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', color: LABEL_COLOR }}>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>{translate('app.viewError.title')}</h2>
      <p style={{ margin: 0, maxWidth: 360, fontSize: 14, opacity: 0.8 }}>{translate('app.viewError.body')}</p>
      <button type="button" data-testid="view-error-reload" onClick={onRetry} style={RELOAD_BTN}>
        {translate('app.reload')}
      </button>
    </div>
  )
}

function Unavailable({ children }: { children?: ReactNode }) {
  return (
    <div role="alert" data-viewport-state="webgl-unavailable" style={{ ...FILL, display: 'grid', placeItems: 'center' }}>
      {children}
    </div>
  )
}

/**
 * The 3D workspace. Fills its parent. Everything inside is imperative and driven by the store: UI state changes never
 * re-render the scene (`frameloop="demand"`, store subscriptions instead of React state).
 *
 * WebGL context loss (SPEC B.9): the scene rebuilds its GPU resources on restore, and this component owns the one visible
 * flow: a "3B görünüm yeniden başlatılıyor…" overlay while the context is gone and, if it is not back within 3 s, a
 * "Yeniden yükle" button that remounts the canvas (fresh context, same molecule and camera) without reloading the page.
 */
export default function Viewport({ fallback, label }: ViewportProps) {
  const [ctx, setCtx] = useState(createSceneContext)
  const [supported] = useState(webglAvailable)
  /** Bumped on every restored context: the one-shot environment map must be re-rendered (its render target died with the context). */
  const [epoch, setEpoch] = useState(0)
  const [fatal, setFatal] = useState<unknown>(null)
  /** WebGL context currently lost (overlay shown) and whether the 3 s grace period has passed (reload button shown). */
  const [lost, setLost] = useState(false)
  const [stuck, setStuck] = useState(false)
  /** Bumped by "Yeniden yükle": remounts the canvas for a brand new context while the store's molecule stays untouched. */
  const [canvasKey, setCanvasKey] = useState(0)
  const stuckTimer = useRef(0)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const language = useStudio((s) => s.language)
  const host = useRef<HTMLDivElement>(null)
  const canvasEl = useRef<HTMLCanvasElement | null>(null)

  // frame-loop errors cannot reach a React boundary by themselves: the first one is re-thrown from render (see below)
  useEffect(() => {
    ctx.onFailure = (e) => setFatal(e ?? new Error('Scene failure'))
    if (ctx.failure.current !== null) setFatal(ctx.failure.current)
    return () => { ctx.onFailure = undefined }
  }, [ctx])

  // the canvas is a Tab stop: keep its accessible name in the current language (also after a live TR <-> EN switch)
  useEffect(() => {
    canvasEl.current?.setAttribute('aria-label', label ?? translate('app.viewport'))
  }, [label, language])

  useEffect(() => () => window.clearTimeout(stuckTimer.current), [])

  const reloadView = () => {
    // keep the viewpoint: the new camera adopts it on its first frame (CameraRig)
    const cam = cameraRef.current, controls = ctx.controls.current
    if (cam && controls) {
      ctx.savedView = {
        position: [cam.position.x, cam.position.y, cam.position.z],
        target: [controls.target.x, controls.target.y, controls.target.z],
      }
    }
    window.clearTimeout(stuckTimer.current)
    canvasEl.current = null // the outgoing canvas' own context-loss event (torn down by the remount) must not re-open the overlay
    setStuck(false)
    setCanvasKey((k) => k + 1)
  }

  /** Rebuild the 3D view after a scene error: a fresh scene context (no half-broken model) and canvas, same molecule and camera. */
  const retryAfterError = () => {
    const next = createSceneContext()
    const cam = cameraRef.current, controls = ctx.controls.current
    next.savedView = ctx.savedView ?? (cam && controls
      ? { position: [cam.position.x, cam.position.y, cam.position.z], target: [controls.target.x, controls.target.y, controls.target.z] }
      : null)
    window.clearTimeout(stuckTimer.current)
    canvasEl.current = null
    setLost(false)
    setStuck(false)
    setFatal(null)
    setCtx(next)
    setCanvasKey((k) => k + 1)
  }

  if (!supported) return <Unavailable>{fallback}</Unavailable>

  return (
    <div ref={host} style={FILL} data-viewport="3d" role={label ? 'group' : undefined} aria-label={label}>
      <style>{FOCUS_CSS}</style>
      {fatal !== null ? <ViewFailed onRetry={retryAfterError} /> : (
      <SceneBoundary key={canvasKey} fallback={<ViewFailed onRetry={retryAfterError} />} onError={setFatal}>
        <Canvas
          key={canvasKey}
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
          camera={{ fov: FOV, near: 0.05, far: 600, position: [3, 2.2, 8] }}
          style={{ touchAction: 'none' }}
          onCreated={({ gl, camera, invalidate }) => {
            // Shader info-log checking makes three print the driver's compiler notes (ANGLE / D3D11 reports X4122 constant-folding
            // warnings for three's own PBR shaders). Nothing in the app can act on them, so they are only read on request in dev.
            gl.debug.checkShaderErrors = Boolean(import.meta.env.DEV) && new URLSearchParams(window.location.search).has('shaderlog')
            cameraRef.current = camera
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
            const el = gl.domElement
            canvasEl.current = el
            el.tabIndex = 0 // keyboard-reachable viewport (Tab order: top bar, rail, viewport, HUD, inspector)
            el.setAttribute('aria-label', label ?? translate('app.viewport'))
            el.style.backgroundColor = SURFACE_0
            // a keyed remount produced a healthy canvas: the previous loss (and its pending reload timer) no longer applies
            window.clearTimeout(stuckTimer.current)
            setLost(false)
            setStuck(false)
            el.addEventListener('webglcontextlost', (e) => {
              e.preventDefault() // allow the browser to restore it
              if (canvasEl.current !== el) return // a replaced canvas being torn down (forceContextLoss) is not a loss
              setLost(true)
              setStuck(false)
              window.clearTimeout(stuckTimer.current)
              stuckTimer.current = window.setTimeout(() => setStuck(true), RELOAD_AFTER_MS)
            })
            el.addEventListener('webglcontextrestored', () => {
              if (canvasEl.current !== el) return
              window.clearTimeout(stuckTimer.current)
              setLost(false)
              setStuck(false)
              setEpoch((n) => n + 1)
              ctx.dirty.current = true
              ctx.shellDirty.current = true
              invalidate()
            })
          }}
        >
          <SceneCtx.Provider value={ctx}>
            <Background />
            <Lighting epoch={epoch} />
            <MoleculeLayer />
            <CameraRig />
            <Interaction />
          </SceneCtx.Provider>
        </Canvas>
      </SceneBoundary>
      )}
      <HoverTip host={host} />
      <Announcer />
      {lost && (
        <div role="status" data-testid="view-restarting" style={OVERLAY}>
          <p style={{ margin: 0 }}>{translate('app.viewRestarting')}</p>
          {stuck && (
            <button type="button" data-testid="view-reload" onClick={reloadView} style={RELOAD_BTN}>
              {translate('app.reload')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
