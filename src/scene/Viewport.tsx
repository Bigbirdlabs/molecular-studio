import './consoleFilter'
import { Component, useState, type CSSProperties, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { Background } from './Background'
import { CameraRig } from './CameraRig'
import { Interaction } from './Interaction'
import { Lighting } from './Lighting'
import { MoleculeLayer } from './MoleculeLayer'
import { SceneCtx, createSceneContext } from './sceneContext'
import { FOV } from './theme'

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
 */
export default function Viewport({ fallback, label }: ViewportProps) {
  const [ctx] = useState(createSceneContext)
  const [supported] = useState(webglAvailable)

  if (!supported) return <Unavailable>{fallback}</Unavailable>

  return (
    <div style={FILL} data-viewport="3d" role={label ? 'group' : undefined} aria-label={label}>
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
            el.addEventListener('webglcontextlost', (e) => e.preventDefault()) // allow the browser to restore it
            el.addEventListener('webglcontextrestored', () => { ctx.dirty.current = true; invalidate() })
          }}
        >
          <SceneCtx.Provider value={ctx}>
            <Background />
            <Lighting />
            <MoleculeLayer />
            <CameraRig />
            <Interaction />
          </SceneCtx.Provider>
        </Canvas>
      </SceneBoundary>
    </div>
  )
}
