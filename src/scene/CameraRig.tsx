import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Molecule } from '../chem/molecule'
import { useStudio, type CameraMode, type RenderStyle, type Tool } from '../store'
import { clamp, computeFit, easeInOutCubic, wheelPixels } from './cameraMath'
import { useSceneContext } from './sceneContext'
import { CAMERA_TWEEN_MS, DEFAULT_VIEW_DIR, FIT_FILL, FOV, ZOOM_IN_FACTOR } from './theme'

interface Tween {
  t0: number
  dur: number
  fromTarget: THREE.Vector3
  toTarget: THREE.Vector3
  fromDir: THREE.Vector3
  toDir: THREE.Vector3
  fromDist: number
  toDist: number
}

interface RigState {
  controls: OrbitControls | null
  tween: Tween | null
  chase: number | null // smoothed distance target (wheel / zoomBy)
  initialized: boolean
  pristineUntil: number // layout settling may still re-frame until this time (unless the user touched the camera)
  pendingFit: 'none' | 'fit' | 'reset'
  zoomRequest: number | null
  styleFrom: RenderStyle | null
  mode: CameraMode
  lastDist: number
  lastMode: CameraMode
  limitMol: Molecule | null
  limitStyle: RenderStyle | null
  limitAspect: number
  limitHide: boolean
  publish: () => void
  setDistance: (d: number) => void
}

const WHEEL_TAU = 0.085 // seconds: smoothing of wheel / zoomBy distance changes
const PRISTINE_MS = 1500
const DEFAULT_DIR = new THREE.Vector3(...DEFAULT_VIEW_DIR).normalize()
const dirTuple = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z]

const modeForTool = (tool: Tool): CameraMode => (tool === 'pan' ? 'pan' : tool === 'zoom' ? 'zoom' : 'orbit')

/**
 * Camera behaviour: OrbitControls (damped), tool-dependent mouse mapping, smooth wheel zoom, animated fit / reset /
 * zoomBy, framing from the molecule's projected silhouette, and a throttled status report. Imperative throughout:
 * the camera never goes through React state.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const invalidate = useThree((s) => s.invalidate)
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  const ctx = useSceneContext()

  const st = useRef<RigState>({
    controls: null, tween: null, chase: null, initialized: false, pristineUntil: 0, pendingFit: 'none', zoomRequest: null, styleFrom: null,
    mode: 'orbit', lastDist: -1, lastMode: 'orbit', limitMol: null, limitStyle: null, limitAspect: 0, limitHide: true,
    publish: () => {}, setDistance: () => {},
  })
  const scratch = useRef({ pts: [] as number[], q: new THREE.Quaternion(), qi: new THREE.Quaternion() })

  useEffect(() => {
    const s = st.current
    const canvas = gl.domElement
    const host = canvas.parentElement ?? canvas
    const controls = new OrbitControls(camera, canvas)
    s.controls = controls
    ctx.controls.current = controls
    controls.enableDamping = !useStudio.getState().reducedMotion
    controls.dampingFactor = 0.1
    controls.rotateSpeed = 0.85
    controls.panSpeed = 0.9
    controls.zoomSpeed = 0.9
    controls.screenSpacePanning = true
    controls.autoRotateSpeed = 1.5

    const applyTool = (tool: Tool) => {
      controls.mouseButtons = {
        LEFT: tool === 'pan' ? THREE.MOUSE.PAN : tool === 'zoom' ? null : THREE.MOUSE.ROTATE, // zoom-tool drags are handled below
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }
      controls.touches = { ONE: tool === 'pan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
      s.mode = modeForTool(tool)
    }
    applyTool(useStudio.getState().tool)

    const distance = () => camera.position.distanceTo(controls.target)
    s.publish = () => {
      const d = distance()
      if (Math.abs(d - s.lastDist) < 0.005 && s.mode === s.lastMode) return
      s.lastDist = d
      s.lastMode = s.mode
      useStudio.getState().setCameraStatus({ distance: d, mode: s.mode })
    }
    s.setDistance = (d: number) => {
      const dir = camera.position.clone().sub(controls.target)
      if (dir.lengthSq() < 1e-12) dir.set(0, 0, 1)
      dir.normalize()
      camera.position.copy(controls.target).addScaledVector(dir, d)
      controls.update()
    }

    const onChange = () => { invalidate(); s.publish() }
    const onStart = () => { s.tween = null; s.chase = null; s.pristineUntil = 0 }
    const onEnd = () => { s.mode = modeForTool(useStudio.getState().tool); s.publish() }
    controls.addEventListener('change', onChange)
    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)

    // what is a mouse drag about to do? (reported in the status bar)
    const onDownCapture = (e: PointerEvent) => {
      const tool = useStudio.getState().tool
      if (e.pointerType === 'mouse') {
        if (e.button === 1) s.mode = 'zoom'
        else if (e.button === 2) s.mode = 'pan'
        else s.mode = e.shiftKey || e.ctrlKey || e.metaKey ? 'pan' : modeForTool(tool)
      } else s.mode = modeForTool(tool)
    }

    // smooth wheel zoom replaces OrbitControls' stepped one (capture phase on the host, so it wins)
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      s.tween = null
      s.pristineUntil = 0
      const factor = Math.exp(wheelPixels(e) * (e.ctrlKey ? 0.012 : 0.0016)) // > 1 zooms out
      const cur = s.chase ?? distance()
      const next = clamp(cur * factor, controls.minDistance, controls.maxDistance)
      s.mode = 'zoom'
      if (useStudio.getState().reducedMotion) s.setDistance(next)
      else s.chase = next
      invalidate()
    }
    const onContextMenu = (e: Event) => e.preventDefault()

    // zoom tool: dragging up zooms in, down zooms out (exponential in the drag length, so it feels proportional)
    let zoomDrag: { id: number; y: number } | null = null
    const onZoomDown = (e: PointerEvent) => {
      if (e.target !== canvas || e.button !== 0 || e.pointerType === 'touch' || useStudio.getState().tool !== 'zoom') return
      zoomDrag = { id: e.pointerId, y: e.clientY }
      s.tween = null
      s.chase = null
      s.pristineUntil = 0
      try { canvas.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
    }
    const onZoomMove = (e: PointerEvent) => {
      if (!zoomDrag || e.pointerId !== zoomDrag.id) return
      const dy = e.clientY - zoomDrag.y
      zoomDrag.y = e.clientY
      if (dy === 0) return
      s.setDistance(clamp(distance() * Math.exp(dy * 0.006), controls.minDistance, controls.maxDistance))
      s.publish()
      invalidate()
    }
    const onZoomUp = (e: PointerEvent) => {
      if (zoomDrag && e.pointerId === zoomDrag.id) zoomDrag = null
    }
    host.addEventListener('pointerdown', onZoomDown, true)
    canvas.addEventListener('pointermove', onZoomMove)
    canvas.addEventListener('pointerup', onZoomUp)
    canvas.addEventListener('pointercancel', onZoomUp)

    host.addEventListener('pointerdown', onDownCapture, true)
    host.addEventListener('wheel', onWheel, { capture: true, passive: false })
    host.addEventListener('contextmenu', onContextMenu)

    const unsub = useStudio.subscribe((next, prev) => {
      let touched = false
      if (next.cameraResetNonce !== prev.cameraResetNonce) { s.pendingFit = 'reset'; touched = true }
      else if (next.fitNonce !== prev.fitNonce && s.pendingFit !== 'reset') { s.pendingFit = 'fit'; touched = true }
      if (next.zoomNonce !== prev.zoomNonce) { s.zoomRequest = next.zoomFactor; touched = true }
      if (next.style !== prev.style) { s.styleFrom = prev.style; touched = true }
      if (next.tool !== prev.tool) { applyTool(next.tool); s.publish(); touched = true }
      if (next.reducedMotion !== prev.reducedMotion) { controls.enableDamping = !next.reducedMotion; touched = true }
      if (next.autoRotate !== prev.autoRotate) touched = true
      if (touched) invalidate()
    })

    invalidate()
    return () => {
      unsub()
      controls.removeEventListener('change', onChange)
      controls.removeEventListener('start', onStart)
      controls.removeEventListener('end', onEnd)
      host.removeEventListener('pointerdown', onDownCapture, true)
      host.removeEventListener('pointerdown', onZoomDown, true)
      canvas.removeEventListener('pointermove', onZoomMove)
      canvas.removeEventListener('pointerup', onZoomUp)
      canvas.removeEventListener('pointercancel', onZoomUp)
      host.removeEventListener('wheel', onWheel, true)
      host.removeEventListener('contextmenu', onContextMenu)
      controls.dispose()
      s.controls = null
      s.initialized = false
      s.tween = null
      s.chase = null
      s.limitMol = null
      ctx.controls.current = null
    }
  }, [camera, gl, invalidate, ctx])

  /** Keep distance limits / near / far in step with the molecule and the viewport. Never moves the camera. */
  const refreshLimits = () => {
    const s = st.current
    const c = s.controls
    if (!c) return
    const store = useStudio.getState()
    const hide = !store.showHydrogens
    if (s.limitMol === store.mol && s.limitStyle === store.style && s.limitAspect === camera.aspect && s.limitHide === hide) return
    s.limitMol = store.mol
    s.limitStyle = store.style
    s.limitAspect = camera.aspect
    s.limitHide = hide
    const pts = scratch.current.pts
    ctx.model.collectFit(store.style, pts)
    const fit = computeFit(pts, dirTuple(DEFAULT_DIR), FOV, camera.aspect, FIT_FILL)
    c.minDistance = fit.distance / ZOOM_IN_FACTOR
    c.maxDistance = fit.distance * ZOOM_IN_FACTOR
    camera.near = clamp(c.minDistance * 0.08, 0.02, 0.5)
    camera.far = fit.distance * 40 + 100
    camera.updateProjectionMatrix()
  }

  const setView = (target: THREE.Vector3, dir: THREE.Vector3, dist: number) => {
    const c = st.current.controls!
    c.target.copy(target)
    camera.position.copy(target).addScaledVector(dir, dist)
    camera.lookAt(target)
    c.update()
  }

  /** Frame the molecule. 'fit' keeps the viewing direction, 'reset' returns to the default 3/4 view. */
  const frame = (kind: 'fit' | 'reset', instant: boolean) => {
    const s = st.current
    const c = s.controls!
    const store = useStudio.getState()
    refreshLimits()
    const cur = camera.position.clone().sub(c.target)
    const dir = kind === 'reset' || cur.lengthSq() < 1e-9 ? DEFAULT_DIR.clone() : cur.clone().normalize()
    const pts = scratch.current.pts
    ctx.model.collectFit(store.style, pts)
    const fit = computeFit(pts, dirTuple(dir), FOV, camera.aspect, FIT_FILL)
    const toTarget = new THREE.Vector3(fit.center[0], fit.center[1], fit.center[2])
    const toDist = clamp(fit.distance, c.minDistance, c.maxDistance)
    s.chase = null
    if (instant || store.reducedMotion) {
      s.tween = null
      setView(toTarget, dir, toDist)
      return
    }
    s.tween = {
      t0: performance.now(), dur: CAMERA_TWEEN_MS,
      fromTarget: c.target.clone(), toTarget,
      fromDir: cur.clone().normalize(), toDir: dir,
      fromDist: Math.max(cur.length(), 1e-3), toDist,
    }
  }

  // viewport resize: only re-frame while the scene is still settling right after the first framing
  useEffect(() => {
    const s = st.current
    if (!s.controls || !s.initialized || width < 2 || height < 2) return
    camera.aspect = width / height // R3F does this too; doing it here makes the ordering irrelevant
    camera.updateProjectionMatrix()
    refreshLimits()
    if (performance.now() < s.pristineUntil) frame('fit', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  useFrame((state, delta) => {
    const s = st.current
    const c = s.controls
    if (!c || width < 2 || height < 2) return
    ctx.sync()
    const store = useStudio.getState()
    refreshLimits()

    if (!s.initialized) {
      s.initialized = true
      frame('reset', true)
      s.pristineUntil = performance.now() + PRISTINE_MS
      s.pendingFit = 'none'
    } else if (s.pendingFit !== 'none') {
      const kind = s.pendingFit
      s.pendingFit = 'none'
      s.pristineUntil = 0
      frame(kind, false)
    }

    if (s.styleFrom !== null) {
      // A new style changes the silhouette (space filling is much larger). Re-frame when the molecule would overflow,
      // or when the camera was sitting at the fitted distance of the previous style; a deliberate zoom is left alone.
      const from = s.styleFrom
      s.styleFrom = null
      if (s.pendingFit === 'none' && !s.tween) {
        const cur = camera.position.clone().sub(c.target)
        const dir = cur.clone().normalize()
        const pts = scratch.current.pts
        ctx.model.collectFit(store.style, pts)
        const fitNew = computeFit(pts, dirTuple(dir), FOV, camera.aspect, FIT_FILL)
        ctx.model.collectFit(from, pts)
        const fitOld = computeFit(pts, dirTuple(dir), FOV, camera.aspect, FIT_FILL)
        if (cur.length() < fitNew.distance * 0.97 || Math.abs(cur.length() / fitOld.distance - 1) < 0.2) frame('fit', false)
      }
    }

    if (s.zoomRequest !== null) {
      const f = s.zoomRequest
      s.zoomRequest = null
      s.tween = null
      s.pristineUntil = 0
      const cur = s.chase ?? camera.position.distanceTo(c.target)
      const next = clamp(cur / f, c.minDistance, c.maxDistance)
      s.mode = 'zoom'
      if (store.reducedMotion) { s.chase = null; s.setDistance(next) }
      else s.chase = next
    }

    const { q, qi } = scratch.current
    if (s.tween) {
      const tw = s.tween
      const t = clamp((performance.now() - tw.t0) / tw.dur, 0, 1)
      const e = easeInOutCubic(t)
      q.setFromUnitVectors(tw.fromDir, tw.toDir)
      qi.identity().slerp(q, e)
      const dir = tw.fromDir.clone().applyQuaternion(qi)
      const target = tw.fromTarget.clone().lerp(tw.toTarget, e)
      const dist = Math.exp(Math.log(tw.fromDist) * (1 - e) + Math.log(tw.toDist) * e)
      setView(target, dir, dist)
      if (t >= 1) s.tween = null
      state.invalidate()
    } else if (s.chase !== null) {
      const cur = camera.position.distanceTo(c.target)
      const to = s.chase
      const next = Math.abs(to - cur) < 0.0008 * cur ? to : cur + (to - cur) * (1 - Math.exp(-Math.min(delta, 0.05) / WHEEL_TAU))
      s.setDistance(next)
      if (next === to) s.chase = null
      state.invalidate()
    }

    c.autoRotate = store.autoRotate && !store.reducedMotion
    if (c.autoRotate) state.invalidate()
    c.update(delta)
    s.publish()
  }, -1)

  return null
}
