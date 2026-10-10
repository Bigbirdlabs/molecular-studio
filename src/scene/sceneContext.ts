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
  /** Adopt the store's molecule / style / toggles into the model. Idempotent; call before reading the model. */
  sync(): void
}

export function createSceneContext(): SceneContext {
  const model = new SceneModel()
  let lastMol: Molecule | null = null
  let lastNonce = -1
  let chargeKey: number | null = null
  let charges: Map<number, number> | null = null
  let chargesOn = false

  const sync = () => {
    const s = useStudio.getState()
    let changed = false
    const first = lastMol === null
    if (s.mol !== lastMol || s.loadNonce !== lastNonce) {
      model.sync(s.mol, s.loadNonce, !s.reducedMotion)
      lastMol = s.mol
      lastNonce = s.loadNonce
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

  return { model, controls: { current: null }, dirty: { current: true }, sync }
}

export const SceneCtx = createContext<SceneContext | null>(null)

export function useSceneContext(): SceneContext {
  const ctx = useContext(SceneCtx)
  if (!ctx) throw new Error('SceneCtx missing: scene components must render inside <Viewport>')
  return ctx
}
