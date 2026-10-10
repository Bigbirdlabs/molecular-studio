import * as THREE from 'three'
import type { MoleculeRig, RigStats, ViewState } from './moleculeRig'
import type { SceneContext } from './sceneContext'

/**
 * Read-only introspection for automated verification (instance radii, draw calls, framing ratio, camera).
 * Installed only in dev builds or when the build is made with VITE_TEST_HOOK=1; absent in the production bundle.
 */
export interface SceneSnapshot {
  style: string
  settled: boolean
  params: Record<string, number>
  atoms: { id: number; symbol: string; x: number; y: number; z: number; radius: number; drawnAs: 'sphere' | 'point' | 'hidden'; screen: [number, number] }[]
  stats: RigStats
  render: { calls: number; triangles: number; geometries: number; textures: number; frame: number }
  camera: { position: [number, number, number]; target: [number, number, number]; distance: number; near: number; far: number }
  /** Screen-space bounding box of the visible atoms (incl. radii) as a fraction of the canvas. */
  bbox: { width: number; height: number; centerX: number; centerY: number } | null
}

declare global {
  interface Window {
    __MOLECULAR_SCENE__?: { snapshot: () => SceneSnapshot; benchUpdate: (iterations: number) => number }
  }
}

const enabled = (): boolean => {
  try {
    return Boolean(import.meta.env.DEV) || import.meta.env.VITE_TEST_HOOK === '1'
  } catch {
    return false
  }
}

export function installTestHook(ctx: SceneContext, rig: MoleculeRig, gl: THREE.WebGLRenderer, camera: THREE.Camera): () => void {
  if (!enabled() || typeof window === 'undefined') return () => {}
  const v = new THREE.Vector3()
  const right = new THREE.Vector3()
  const upv = new THREE.Vector3()

  const snapshot = (): SceneSnapshot => {
    const { model } = ctx
    const wire = model.params.wire >= 0.5
    camera.updateMatrixWorld()
    const rect = gl.domElement.getBoundingClientRect()
    const atoms = model.atoms.map((e) => ({
      id: e.id, symbol: e.symbol, x: e.p[0], y: e.p[1], z: e.p[2],
      radius: model.radius(e) * e.s,
      screen: ((): [number, number] => {
        v.set(e.p[0], e.p[1], e.p[2]).project(camera)
        return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height]
      })(),
      drawnAs: (e.hidden || e.dying && e.s < 0.01 ? 'hidden' : wire ? 'point' : 'sphere') as 'sphere' | 'point' | 'hidden',
    }))

    let bbox: SceneSnapshot['bbox'] = null
    camera.updateMatrixWorld()
    right.setFromMatrixColumn(camera.matrixWorld, 0)
    upv.setFromMatrixColumn(camera.matrixWorld, 1)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const e of model.atoms) {
      if (!model.isVisible(e)) continue
      const r = Math.max(model.radius(e) * e.s, 0.05)
      for (const sign of [-1, 1]) {
        v.set(e.p[0], e.p[1], e.p[2]).addScaledVector(right, sign * r).project(camera)
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x)
      }
      for (const sign of [-1, 1]) {
        v.set(e.p[0], e.p[1], e.p[2]).addScaledVector(upv, sign * r).project(camera)
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y)
      }
    }
    if (Number.isFinite(minX)) {
      bbox = { width: (maxX - minX) / 2, height: (maxY - minY) / 2, centerX: (maxX + minX) / 2, centerY: (maxY + minY) / 2 }
    }

    const target = ctx.controls.current?.target ?? new THREE.Vector3()
    const info = gl.info
    return {
      style: model.style,
      settled: model.settled,
      params: { ...model.params },
      atoms,
      stats: { ...rig.stats },
      render: { frame: info.render.frame, calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures },
      camera: {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
        distance: camera.position.distanceTo(target),
        near: (camera as THREE.PerspectiveCamera).near,
        far: (camera as THREE.PerspectiveCamera).far,
      },
      bbox,
    }
  }

  /** Average milliseconds of one full instance-buffer rewrite (CPU side) for the current molecule. */
  const benchUpdate = (iterations: number): number => {
    const view: ViewState = {
      selection: new Set(), selectedBond: null, hovered: null, hoveredBond: null, pendingFrom: null, measure: [],
      showLabels: false, showCharges: false, autoH: true,
    }
    const t0 = performance.now()
    for (let i = 0; i < iterations; i++) rig.update(ctx.model, view)
    ctx.dirty.current = true
    return (performance.now() - t0) / Math.max(1, iterations)
  }

  window.__MOLECULAR_SCENE__ = { snapshot, benchUpdate }
  return () => {
    if (window.__MOLECULAR_SCENE__?.snapshot === snapshot) delete window.__MOLECULAR_SCENE__
  }
}
