import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { centroid, type Vec3 } from '../chem/molecule'
import { useStudio, type Tool } from '../store'
import { CLICK_SLOP_PX } from './theme'
import { useSceneContext } from './sceneContext'
import { ATOM_LONG_PRESS_EVENT, registerPicker, type AtomLongPressDetail } from './pickApi'
import type { Pick } from './sceneModel'

const LONG_PRESS_MS = 500

type Gesture =
  | { kind: 'pending' } // a press that may become a click
  | { kind: 'atom-drag'; id: number; plane: THREE.Plane; offset: THREE.Vector3 }
  | { kind: 'bond-drag'; from: number }

interface Down {
  id: number
  x: number
  y: number
  pick: Pick
  moved: boolean
  gesture: Gesture
  /** Atom this press may drag (select tool) or start a bond from (bond tool). */
  candidate: number | null
  longPressed: boolean
}

const isCameraTool = (t: Tool) => t === 'rotate' || t === 'pan' || t === 'zoom'

function cursorFor(tool: Tool, hit: Pick, busy: boolean): string {
  switch (tool) {
    case 'rotate': return busy ? 'grabbing' : 'grab'
    case 'pan': return busy ? 'grabbing' : 'move'
    case 'zoom': return 'zoom-in'
    case 'select': return hit ? 'pointer' : 'default'
    case 'atom': return hit?.kind === 'atom' ? 'pointer' : hit ? 'default' : 'crosshair'
    case 'bond': return hit?.kind === 'atom' ? 'pointer' : 'default'
    case 'erase': return hit ? 'pointer' : 'default'
    case 'measure': return hit?.kind === 'atom' ? 'pointer' : 'crosshair'
  }
}

/**
 * Pointer interaction with the molecule: hover, click routing to the store, atom dragging (select tool), drag-to-bond
 * (bond tool) and the bond rubber band. Camera gestures stay with OrbitControls; this layer only disables them while
 * an atom is being dragged. Everything is imperative (no React state), and hover work is coalesced per animation frame.
 */
export function Interaction() {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const ctx = useSceneContext()

  useEffect(() => {
    const canvas = gl.domElement
    const host = canvas.parentElement ?? canvas
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const tmp = new THREE.Vector3()
    const tmp2 = new THREE.Vector3()
    const camDir = new THREE.Vector3()
    const pointers = new Set<number>()
    let down: Down | null = null
    let lastMove: PointerEvent | null = null
    let hoverRaf = 0
    let dragRaf = 0
    let dragPtr: { x: number; y: number } | null = null
    let lastCursor = ''
    let longTimer = 0
    const clearLong = () => { if (longTimer) { window.clearTimeout(longTimer); longTimer = 0 } }
    const { model } = ctx
    registerPicker((x, y) => {
      const h = pickAt(x, y)
      return h ? { kind: h.kind, id: h.id } : null
    })

    const setCursor = (c: string) => {
      if (c !== lastCursor) { lastCursor = c; canvas.style.cursor = c }
    }
    const touch = () => { ctx.dirty.current = true; invalidate() }

    const rayAt = (x: number, y: number): THREE.Ray => {
      const r = canvas.getBoundingClientRect()
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      return raycaster.ray
    }
    const pickAt = (x: number, y: number): Pick => {
      const r = rayAt(x, y)
      return model.pick(r.origin.x, r.origin.y, r.origin.z, r.direction.x, r.direction.y, r.direction.z)
    }
    const planeHit = (ray: THREE.Ray, plane: THREE.Plane, out: THREE.Vector3): boolean => ray.intersectPlane(plane, out) !== null
    const facingPlane = (through: THREE.Vector3): THREE.Plane => {
      camera.getWorldDirection(camDir)
      return new THREE.Plane().setFromNormalAndCoplanarPoint(camDir, through)
    }

    // ---------- hover + rubber band ----------
    const processHover = () => {
      hoverRaf = 0
      const e = lastMove
      if (!e) return
      const st = useStudio.getState()
      if (isCameraTool(st.tool)) {
        st.setHovered(null); st.setHoveredBond(null)
        setCursor(cursorFor(st.tool, null, !!down))
        return
      }
      const hit = pickAt(e.clientX, e.clientY)
      st.setHovered(hit?.kind === 'atom' ? hit.id : null)
      st.setHoveredBond(hit?.kind === 'bond' ? hit.id : null)
      setCursor(cursorFor(st.tool, hit, false))

      // rubber band from the pending bond atom to the cursor (snaps to the hovered atom)
      const from = st.pendingBondFrom !== null ? model.liveAtom(st.pendingBondFrom) : undefined
      if (from) {
        if (hit?.kind === 'atom' && hit.id !== st.pendingBondFrom) {
          const target = model.liveAtom(hit.id)
          model.rubberTo = target ? [target.p[0], target.p[1], target.p[2]] : null
        } else if (planeHit(rayAt(e.clientX, e.clientY), facingPlane(tmp2.set(from.p[0], from.p[1], from.p[2])), tmp)) {
          model.rubberTo = [tmp.x, tmp.y, tmp.z]
        }
        touch()
      } else if (model.rubberTo) {
        model.rubberTo = null
        touch()
      }
    }
    const scheduleHover = (e: PointerEvent) => {
      lastMove = e
      if (!hoverRaf) hoverRaf = requestAnimationFrame(processHover)
    }

    // ---------- atom drag ----------
    const applyDrag = () => {
      dragRaf = 0
      const d = down
      const p = dragPtr
      if (!d || d.gesture.kind !== 'atom-drag' || !p) return
      if (planeHit(rayAt(p.x, p.y), d.gesture.plane, tmp)) {
        tmp.add(d.gesture.offset)
        useStudio.getState().dragAtom(d.gesture.id, [tmp.x, tmp.y, tmp.z] as Vec3)
      }
    }
    const flushDrag = () => {
      if (dragRaf) { cancelAnimationFrame(dragRaf); dragRaf = 0 }
      applyDrag()
    }

    const endGestures = (commit: boolean) => {
      const d = down
      down = null
      if (ctx.controls.current) ctx.controls.current.enabled = true
      if (!d) return
      if (d.gesture.kind === 'atom-drag') {
        if (commit) flushDrag()
        useStudio.getState().endDrag()
        model.snap = false
        touch()
      } else if (d.gesture.kind === 'bond-drag') {
        const st = useStudio.getState()
        if (st.pendingBondFrom === d.gesture.from) st.clickAtom(d.gesture.from) // cancel: toggles the pending atom off
        model.rubberTo = null
        touch()
      }
    }

    // ---------- pointer events ----------
    const onDown = (e: PointerEvent) => {
      if (e.target !== canvas) return
      pointers.add(e.pointerId)
      if (pointers.size > 1) { clearLong(); endGestures(false); return } // second finger: camera gesture, abandon any edit gesture
      if (e.button !== 0) { down = null; return } // middle / right drag belong to the camera

      const st = useStudio.getState()
      const hit = isCameraTool(st.tool) ? null : pickAt(e.clientX, e.clientY)
      let candidate: number | null = null
      // touch: a one-finger drag always orbits (taps select); dragging atoms / drawing bonds is a mouse / pen gesture
      if (hit?.kind === 'atom' && e.pointerType !== 'touch') {
        if (st.tool === 'select') candidate = hit.id
        else if (st.tool === 'bond' && st.pendingBondFrom === null) candidate = hit.id
      }
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, pick: hit, moved: false, gesture: { kind: 'pending' }, candidate, longPressed: false }
      clearLong()
      if (e.pointerType === 'touch' && hit?.kind === 'atom') {
        // touch long-press on an atom: select it and tell the UI (quick actions: change element / delete)
        const id = hit.id, cx = e.clientX, cy = e.clientY
        longTimer = window.setTimeout(() => {
          longTimer = 0
          if (!down || down.moved || down.id !== e.pointerId) return
          down.longPressed = true
          useStudio.getState().setSelection([id])
          window.dispatchEvent(new CustomEvent<AtomLongPressDetail>(ATOM_LONG_PRESS_EVENT, { detail: { id, clientX: cx, clientY: cy } }))
        }, LONG_PRESS_MS)
      }
      if (candidate !== null) {
        if (ctx.controls.current) ctx.controls.current.enabled = false // before OrbitControls sees this press
        try { canvas.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
      } else if (isCameraTool(st.tool)) setCursor(cursorFor(st.tool, null, true))
    }

    const onMove = (e: PointerEvent) => {
      const d = down
      if (d && e.pointerId === d.id) {
        if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > CLICK_SLOP_PX) { d.moved = true; clearLong() }
        if (d.moved && d.candidate !== null) {
          const st = useStudio.getState()
          if (d.gesture.kind === 'pending') {
            const e0 = model.liveAtom(d.candidate)
            if (!e0) { endGestures(false); return }
            if (st.tool === 'select') {
              const through = new THREE.Vector3(e0.p[0], e0.p[1], e0.p[2])
              const plane = facingPlane(through)
              const start = new THREE.Vector3()
              const offset = planeHit(rayAt(e.clientX, e.clientY), plane, start) ? through.clone().sub(start) : new THREE.Vector3()
              st.beginDrag()
              model.snap = true
              d.gesture = { kind: 'atom-drag', id: d.candidate, plane, offset }
              setCursor('grabbing')
            } else if (st.tool === 'bond') {
              st.clickAtom(d.candidate) // marks the first atom as pending
              d.gesture = { kind: 'bond-drag', from: d.candidate }
            }
          }
          if (d.gesture.kind === 'atom-drag') {
            dragPtr = { x: e.clientX, y: e.clientY }
            if (!dragRaf) dragRaf = requestAnimationFrame(applyDrag)
            return
          }
          if (d.gesture.kind === 'bond-drag') scheduleHover(e)
        }
        return
      }
      if (e.pointerType === 'touch' || e.buttons !== 0) return
      scheduleHover(e)
    }

    const onUp = (e: PointerEvent) => {
      handleUp(e)
      applyBaseCursor()
    }

    const handleUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId)
      clearLong()
      const d = down
      if (!d || e.pointerId !== d.id) return
      if (e.type === 'pointercancel') { endGestures(false); return }

      if (d.gesture.kind === 'bond-drag') {
        const from = d.gesture.from
        const hit = pickAt(e.clientX, e.clientY)
        down = null
        if (ctx.controls.current) ctx.controls.current.enabled = true
        model.rubberTo = null
        const st = useStudio.getState()
        if (hit?.kind === 'atom' && hit.id !== from) st.clickAtom(hit.id) // completes the bond
        else if (st.pendingBondFrom === from) st.clickAtom(from) // released on nothing: cancel
        touch()
        return
      }
      if (d.gesture.kind === 'atom-drag') { endGestures(true); return }

      down = null
      if (ctx.controls.current) ctx.controls.current.enabled = true
      if (d.moved || d.longPressed) return // a camera drag, or a long-press that already did its job

      const st = useStudio.getState()
      if (st.tool === 'zoom') { st.zoomBy(e.altKey || e.shiftKey ? 1 / 1.5 : 1.5); return }
      if (isCameraTool(st.tool)) return
      const hit = pickAt(e.clientX, e.clientY)
      if (hit?.kind === 'atom') st.clickAtom(hit.id, e.shiftKey || e.ctrlKey || e.metaKey)
      else if (hit?.kind === 'bond') st.clickBond(hit.id)
      else {
        const c = centroid(st.mol)
        if (planeHit(rayAt(e.clientX, e.clientY), facingPlane(tmp2.set(c[0], c[1], c[2])), tmp)) st.clickEmpty([tmp.x, tmp.y, tmp.z])
      }
    }

    const onLeave = () => {
      lastMove = null
      const st = useStudio.getState()
      st.setHovered(null); st.setHoveredBond(null)
      if (model.rubberTo) { model.rubberTo = null; touch() }
    }

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    host.addEventListener('pointerdown', onDown, true) // capture: must run before OrbitControls to be able to disable it

    const applyBaseCursor = () => setCursor(cursorFor(useStudio.getState().tool, null, false))
    applyBaseCursor()
    const unsub = useStudio.subscribe((s, prev) => {
      if (s.tool !== prev.tool) {
        applyBaseCursor()
        if (model.rubberTo) { model.rubberTo = null; touch() }
      }
      if (s.pendingBondFrom !== prev.pendingBondFrom && s.pendingBondFrom === null && model.rubberTo) { model.rubberTo = null; touch() }
    })

    return () => {
      unsub()
      clearLong()
      registerPicker(null)
      if (hoverRaf) cancelAnimationFrame(hoverRaf)
      if (dragRaf) cancelAnimationFrame(dragRaf)
      if (down) endGestures(false)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      host.removeEventListener('pointerdown', onDown, true)
      canvas.style.cursor = ''
      model.rubberTo = null
    }
  }, [gl, camera, invalidate, ctx])

  return null
}
