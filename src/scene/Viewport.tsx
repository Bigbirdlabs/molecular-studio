import './consoleFilter'
import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useStudio } from '../store'
import { hasKey, t as translate } from '../ui/i18n'
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

/** Keyboard focus ring for the canvas (SPEC B.4): 2 px accent, inset, only for keyboard focus. */
const FOCUS_CSS = `[data-viewport="3d"] canvas:focus{outline:none}[data-viewport="3d"] canvas:focus-visible{outline:2px solid ${ACCENT};outline-offset:-2px}`

const RESTART_FALLBACK = { tr: 'Görünüm yeniden başlatılıyor…', en: 'Restarting the 3D view…' }
const RELOAD_FALLBACK = { tr: 'Yeniden yükle', en: 'Reload' }
/** After this long without a restored context the overlay offers a manual reload. */
const RESTORE_GRACE_MS = 3000

function Unavailable({ children }: { children?: ReactNode }) {
  return (
    <div role="alert" data-viewport-state="webgl-unavailable" style={{ ...FILL, display: 'grid', placeItems: 'center' }}>
      {children}
    </div>
  )
}

/** Shown while the WebGL context is lost (SPEC B.9 / acceptance 23); the molecule itself lives in the store and is untouched. */
function RestartOverlay({ stuck }: { stuck: boolean }) {
  const lang = useStudio((s) => s.language)
  const text = hasKey('app.viewRestarting') ? translate('app.viewRestarting') : RESTART_FALLBACK[lang]
  const reload = hasKey('app.reload') ? translate('app.reload') : RELOAD_FALLBACK[lang]
  return (
    <div
      role="status"
      data-viewport-state="context-lost"
      style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgb(10 11 13 / 0.88)', zIndex: 20 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#c9ced6', fontSize: 14 }}>
        <span>{text}</span>
        {stuck && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-ctl border border-line-strong bg-surface-2 px-3 text-ui text-ink"
            style={{ minHeight: 40 }}
          >
            {reload}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * The 3D workspace. Fills its parent. Everything inside is imperative and driven by the store: UI state changes never
 * re-render the scene (`frameloop="demand"`, store subscriptions instead of React state).
 */
export default function Viewport({ fallback, label }: ViewportProps) {
  const [ctx] = useState(createSceneContext)
  const [supported] = useState(webglAvailable)
  const [lost, setLost] = useState(false)
  const [stuck, setStuck] = useState(false)
  /** Bumped on every restored context: the one-shot environment map must be rebuilt (its render target died with the context). */
  const [epoch, setEpoch] = useState(0)
  const host = useRef<HTMLDivElement>(null)
  const timer = useRef(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; window.clearTimeout(timer.current) }
  }, [])

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
            el.tabIndex = 0 // keyboard-reachable viewport (Tab order: top bar, rail, viewport, HUD, inspector)
            el.setAttribute('aria-label', label ?? translate('app.viewport'))
            el.style.backgroundColor = SURFACE_0
            el.addEventListener('webglcontextlost', (e) => {
              e.preventDefault() // allow the browser to restore it
              if (!alive.current) return
              setLost(true)
              setStuck(false)
              window.clearTimeout(timer.current)
              timer.current = window.setTimeout(() => { if (alive.current) setStuck(true) }, RESTORE_GRACE_MS)
            })
            el.addEventListener('webglcontextrestored', () => {
              window.clearTimeout(timer.current)
              if (alive.current) { setLost(false); setStuck(false); setEpoch((n) => n + 1) }
              ctx.dirty.current = true
              ctx.shellDirty.current = true
              invalidate()
            })
          }}
        >
          <SceneCtx.Provider value={ctx}>
            <Background />
            <Lighting key={epoch} />
            <MoleculeLayer />
            <CameraRig />
            <Interaction />
          </SceneCtx.Provider>
        </Canvas>
      </SceneBoundary>
      <HoverTip host={host} />
      <Announcer />
      {lost && <RestartOverlay stuck={stuck} />}
    </div>
  )
}
