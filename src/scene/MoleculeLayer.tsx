import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStudio, type StudioState } from '../store'
import { MoleculeRig, type ViewState } from './moleculeRig'
import { useSceneContext } from './sceneContext'
import { installTestHook } from './testHook'

/** Store fields that change what is drawn. Anything else (camera status, toasts, save status...) is ignored. */
const WATCHED: (keyof StudioState)[] = ['mol', 'style', 'showLabels', 'showCharges', 'showHydrogens', 'reducedMotion', 'loadNonce', 'language']
/** Fields that only change the overlays (shells, rings, measurement, labels); the atom / bond buffers are not rewritten. */
const OVERLAY_ONLY: (keyof StudioState)[] = ['selection', 'selectedBond', 'hovered', 'hoveredBond', 'pendingBondFrom', 'measure', 'tool', 'autoH']

/**
 * Bridges the store to the THREE objects without React re-renders: a store subscription marks the rig dirty and asks
 * for a frame; the frame syncs the model, advances the springs and rewrites the instance buffers only when needed.
 *
 * WebGL context loss: every GPU object of the rig is disposed WHILE the context is lost (deleting on a lost context is
 * silent) and a fresh rig is built when it is restored. Disposing pre-loss objects after the restore would hit three's
 * stale per-context bookkeeping and log "object does not belong to this context" for each buffer.
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
    const canvas = gl.domElement
    let removeHook: () => void = () => {}
    const build = () => {
      if (rigRef.current) return
      const rig = new MoleculeRig()
      scene.add(rig.root)
      rigRef.current = rig
      removeHook = installTestHook(ctx, rig, gl, camera)
      ctx.dirty.current = true
      ctx.shellDirty.current = true
      invalidate()
    }
    const teardown = () => {
      removeHook()
      removeHook = () => {}
      const rig = rigRef.current
      rigRef.current = null
      if (!rig) return
      scene.remove(rig.root)
      rig.dispose()
    }
    build()
    const unsub = useStudio.subscribe((s, prev) => {
      for (const k of WATCHED) {
        if (s[k] !== prev[k]) { ctx.dirty.current = true; invalidate(); return }
      }
      for (const k of OVERLAY_ONLY) {
        if (s[k] !== prev[k]) { ctx.shellDirty.current = true; invalidate(); return }
      }
    })
    canvas.addEventListener('webglcontextlost', teardown)
    canvas.addEventListener('webglcontextrestored', build)
    return () => {
      canvas.removeEventListener('webglcontextlost', teardown)
      canvas.removeEventListener('webglcontextrestored', build)
      unsub()
      teardown()
    }
  }, [scene, gl, camera, invalidate, ctx])

  useFrame((state, delta) => {
    if (ctx.failure.current !== null) return
    try {
      const rig = rigRef.current
      if (!rig) return
      ctx.sync()
      const s = useStudio.getState()
      const active = ctx.model.step(delta, !s.reducedMotion)
      const bodies = ctx.dirty.current || active
      if (bodies || ctx.shellDirty.current) {
        ctx.dirty.current = false
        ctx.shellDirty.current = false
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
          tool: s.tool,
        }
        rig.update(ctx.model, view, { bodies, overlays: true })
      }
      if (active) state.invalidate()
    } catch (e) {
      ctx.fail(e)
    }
  })

  return null
}
