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
import { ACCENT, FOV, SURFACE_0 } from './theme'

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

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

const FILL: CSSProperties = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' }

/**
 * Keyboard focus ring for the canvas (SPEC B.4): 2 px accent, inset, only for keyboard focus. `!important` because the
 * app stylesheet resets `#viewport canvas { outline: none }` with an id selector that would otherwise win on specificity.
 */
const FOCUS_CSS = `[data-viewport="3d"] canvas:focus{outline:none}[data-viewport="3d"] canvas:focus-visible{outline:2px solid ${ACCENT} !important;outline-offset:-2px !important}`

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
 * WebGL context loss: this component only keeps the scene consistent (rebuilds the GPU resources on restore). The one
 * visible restart overlay / reload button lives in ViewportHost (SPEC B.9), so there is a single flow.
 */
export default function Viewport({ fallback, label }: ViewportProps) {
  const [ctx] = useState(createSceneContext)
  const [supported] = useState(webglAvailable)
  /** Bumped on every restored context: the one-shot environment map must be re-rendered (its render target died with the context). */
  const [epoch, setEpoch] = useState(0)
  const [fatal, setFatal] = useState<unknown>(null)
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

  if (fatal !== null) throw fatal instanceof Error ? fatal : new Error(String(fatal)) // caught by the boundary in ViewportHost
  if (!supported) return <Unavailable>{fallback}</Unavailable>

  return (
    <div ref={host} style={FILL} data-viewport="3d" role={label ? 'group' : undefined} aria-label={label}>
      <style>{FOCUS_CSS}</style>
      <SceneBoundary fallback={<Unavailable>{fallback}</Unavailable>}>
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
          camera={{ fov: FOV, near: 0.05, far: 600, position: [3, 2.2, 8] }}
          style={{ touchAction: 'none' }}
          onCreated={({ gl, invalidate }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
            const el = gl.domElement
            canvasEl.current = el
            el.tabIndex = 0 // keyboard-reachable viewport (Tab order: top bar, rail, viewport, HUD, inspector)
            el.setAttribute('aria-label', label ?? translate('app.viewport'))
            el.style.backgroundColor = SURFACE_0
            el.addEventListener('webglcontextlost', (e) => {
              e.preventDefault() // allow the browser to restore it
            })
            el.addEventListener('webglcontextrestored', () => {
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
      <HoverTip host={host} />
      <Announcer />
    </div>
  )
}
