import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStudio, type StudioState } from '../store'
import { MoleculeRig, type ViewState } from './moleculeRig'
import { useSceneContext } from './sceneContext'
import { installTestHook } from './testHook'

/** Store fields that change what is drawn. Anything else (camera status, toasts, save status...) is ignored. */
const WATCHED: (keyof StudioState)[] = [
  'mol', 'style', 'selection', 'selectedBond', 'hovered', 'hoveredBond', 'pendingBondFrom', 'measure',
  'showLabels', 'showCharges', 'showHydrogens', 'tool', 'autoH', 'reducedMotion', 'loadNonce',
]

/**
 * Bridges the store to the THREE objects without React re-renders: a store subscription marks the rig dirty and asks
 * for a frame; the frame syncs the model, advances the springs and rewrites the instance buffers only when needed.
 */
export function MoleculeLayer() {
  const ctx = useSceneContext()
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const rigRef = useRef<MoleculeRig | null>(null)
  const cache = useRef<{ selection: readonly number[] | null; set: ReadonlySet<number> }>({ selection: null, set: new Set() })

  useEffect(() => {
    const rig = new MoleculeRig()
    scene.add(rig.root)
    rigRef.current = rig
    ctx.dirty.current = true
    const unsub = useStudio.subscribe((s, prev) => {
      for (const k of WATCHED) {
        if (s[k] !== prev[k]) { ctx.dirty.current = true; invalidate(); return }
      }
    })
    const removeHook = installTestHook(ctx, rig, gl, camera)
    invalidate()
    return () => {
      removeHook()
      unsub()
      scene.remove(rig.root)
      rig.dispose()
      rigRef.current = null
    }
  }, [scene, gl, camera, invalidate, ctx])

  useFrame((state, delta) => {
    const rig = rigRef.current
    if (!rig) return
    ctx.sync()
    const s = useStudio.getState()
    const active = ctx.model.step(delta, !s.reducedMotion)
    if (ctx.dirty.current || active) {
      ctx.dirty.current = false
      if (cache.current.selection !== s.selection) cache.current = { selection: s.selection, set: new Set(s.selection) }
      const view: ViewState = {
        selection: cache.current.set,
        selectedBond: s.selectedBond,
        hovered: s.tool === 'rotate' || s.tool === 'pan' || s.tool === 'zoom' ? null : s.hovered,
        hoveredBond: s.tool === 'rotate' || s.tool === 'pan' || s.tool === 'zoom' ? null : s.hoveredBond,
        pendingFrom: s.pendingBondFrom,
        measure: s.measure,
        showLabels: s.showLabels,
        showCharges: s.showCharges,
        autoH: s.autoH,
      }
      rig.update(ctx.model, view)
    }
    if (active) state.invalidate()
  })

  return null
}
