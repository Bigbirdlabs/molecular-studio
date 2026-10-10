import { createContext, useContext } from 'react'
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Molecule } from '../chem/molecule'
import { useStudio } from '../store'
import { chargeTopologyKey, computePartialCharges } from './partialCharges'
import { SceneModel } from './sceneModel'

/**
 * Plain (non-React) state shared by the scene components of one Viewport. Nothing in here is React state: the scene
 * reacts to the store imperatively, so UI changes never re-render the 3D tree.
 */
export interface SceneContext {
  model: SceneModel
  controls: { current: OrbitControls | null }
  /** Set by anything that changed the overlay (rubber band...) so the rig rewrites its buffers on the next frame. */
  dirty: { current: boolean }
  /**
   * Set when only the overlays (rubber band, hover / selection shells, measurement) changed: the rig then leaves the atom
   * and bond instance buffers alone (SPEC C4 render isolation).
   */
  shellDirty: { current: boolean }
  /** Adopt the store's molecule / style / toggles into the model. Idempotent; call before reading the model. */
  sync(): void
  /** First error thrown from a frame callback (null while healthy). Frame callbacks stop once it is set. */
  failure: { current: unknown }
  /** Set by the Viewport: surfaces a frame-loop error to the React error boundary (React cannot catch useFrame errors). */
  onFailure?: (error: unknown) => void
  /** Viewpoint to adopt on the next camera initialisation (set before a canvas remount so the view survives it); consumed once. */
  savedView: { position: [number, number, number]; target: [number, number, number] } | null
  /** Record a frame-loop error exactly once and hand it to the boundary instead of throwing on every frame. */
  fail(error: unknown): void
}

export function createSceneContext(): SceneContext {
  const model = new SceneModel()
  let lastMol: Molecule | null = null
  let lastNonce = -1
  let lastId: string | null = null
  /** Scene-side load counter: bumps on a store load AND whenever the molecule identity changes (undo / redo across a library load). */
  let sceneNonce = 0
  let chargeKey: number | null = null
  let charges: Map<number, number | null> | null = null
  let chargesOn = false

  const sync = () => {
    const s = useStudio.getState()
    let changed = false
    const first = lastMol === null
    if (s.mol !== lastMol || s.loadNonce !== lastNonce) {
      // Undo / redo that crosses a library load swaps in a different molecule whose atom ids coincide with the old one's: the old
      // entries must be retired (not morphed in place), exactly as for a load, so the identity change counts as one here.
      if (s.loadNonce !== lastNonce || (lastId !== null && s.mol.id !== lastId)) sceneNonce++
      model.sync(s.mol, sceneNonce, !s.reducedMotion)
      lastMol = s.mol
      lastNonce = s.loadNonce
      lastId = s.mol.id
      changed = true
    }
    model.setHideH(!s.showHydrogens)
    model.setStyle(s.style, first) // the very first adoption must not morph from the default style

    if (s.showCharges) {
      const key = chargeTopologyKey(s.mol)
      if (key !== chargeKey || !chargesOn) {
        charges = computePartialCharges(s.mol)
        chargeKey = key
        changed = true
      }
      if (changed || !chargesOn) model.setPartialCharges(charges)
      chargesOn = true
    } else if (chargesOn) {
      model.setPartialCharges(null)
      chargesOn = false
      chargeKey = null
      charges = null
    }
  }

  const ctx: SceneContext = {
    model, controls: { current: null }, dirty: { current: true }, shellDirty: { current: true }, sync,
    failure: { current: null },
    savedView: null,
    fail(error: unknown) {
      if (ctx.failure.current !== null) return
      ctx.failure.current = error ?? new Error('Scene failure')
      ctx.onFailure?.(ctx.failure.current)
    },
  }
  return ctx
}

export const SceneCtx = createContext<SceneContext | null>(null)

export function useSceneContext(): SceneContext {
  const ctx = useContext(SceneCtx)
  if (!ctx) throw new Error('SceneCtx missing: scene components must render inside <Viewport>')
  return ctx
}
