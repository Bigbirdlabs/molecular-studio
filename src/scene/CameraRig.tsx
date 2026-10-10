import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Molecule } from '../chem/molecule'
import { useStudio, type CameraMode, type RenderStyle, type Tool } from '../store'
import { useUI } from '../ui/uiStore'
import { boundingRadius, clamp, computeFit, easeInOutCubic, wheelPixels } from './cameraMath'
import { useSceneContext } from './sceneContext'
import { STYLE_TARGETS, atomRadius } from './styleParams'
import {
  AUTOFRAME_EDGE, CAMERA_TWEEN_MS, DEFAULT_VIEW_DIR, FIT_FILL, FIT_FILL_DEFAULT, FOV, MAX_DISTANCE_RADII, MIN_CAMERA_DISTANCE,
  REFIT_WIDTH_FRACTION,
} from './theme'

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
  mode: CameraMode
  lastDist: number
  lastMode: CameraMode
  limitMol: Molecule | null
  limitAspect: number
  limitHide: boolean
  /** Pixels of the canvas hidden by the mobile info sheet (smoothed / target / as last applied to the projection). */
  cover: number
  coverTarget: number
  coverApplied: number
  coverSize: string
  /** Canvas size (CSS px) at the last framing: a later resize of more than 20 % of the width (or a landscape / portrait flip) re-fits. */
  fitW: number
  fitH: number
  resizeTimer: number
  /** Molecule the auto-frame check last looked at (edits that push atoms out of view re-frame). */
  checkedMol: Molecule | null
  checkedNonce: number
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
    controls: null, tween: null, chase: null, initialized: false, pristineUntil: 0, pendingFit: 'none', zoomRequest: null,
    mode: 'orbit', lastDist: -1, lastMode: 'orbit', limitMol: null, limitAspect: 0, limitHide: true,
    cover: 0, coverTarget: 0, coverApplied: 0, coverSize: '',
    fitW: 0, fitH: 0, resizeTimer: 0, checkedMol: null, checkedNonce: -1,
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

    /** Pixels at the bottom of the canvas hidden by the mobile molecule-info sheet at its current snap (0 elsewhere). */
    const sheetCover = (): number => {
      if (!useStudio.getState().inspectorOpen || typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 767.98px)').matches) return 0
      const vh = window.visualViewport?.height ?? window.innerHeight
      const { infoSnap: snap, chromeBottom } = useUI.getState()
      // mirrors BottomSheet: a non-modal sheet rests on top of the bottom chrome and its detents are fractions of what is left
      const inset = Math.min(chromeBottom, Math.round(vh * 0.4))
      const base = vh - inset
      const sheetH = snap === 'peek' ? 132 : Math.round(base * (snap === 'half' ? 0.5 : 0.9))
      const rect = canvas.getBoundingClientRect()
      return clamp(rect.bottom - (vh - inset - sheetH), 0, rect.height * 0.62)
    }
    s.coverTarget = sheetCover()
    const unsubUI = useUI.subscribe((next, prev) => {
      if (next.infoSnap === prev.infoSnap && next.chromeBottom === prev.chromeBottom) return
      s.coverTarget = sheetCover()
      invalidate()
    })
    const onResizeWin = () => { s.coverTarget = sheetCover(); invalidate() }
    window.addEventListener('resize', onResizeWin)
    window.visualViewport?.addEventListener('resize', onResizeWin)

    const unsub = useStudio.subscribe((next, prev) => {
      let touched = false
      if (next.cameraResetNonce !== prev.cameraResetNonce) { s.pendingFit = 'reset'; touched = true }
      else if (next.fitNonce !== prev.fitNonce && s.pendingFit !== 'reset') { s.pendingFit = 'fit'; touched = true }
      if (next.zoomNonce !== prev.zoomNonce) { s.zoomRequest = next.zoomFactor; touched = true }
      // A style switch never moves the camera (SPEC C1 / acceptance 8); the Fit control re-frames for the new style.
      if (next.style !== prev.style) touched = true
      if (next.inspectorOpen !== prev.inspectorOpen) { s.coverTarget = sheetCover(); touched = true }
      if (next.tool !== prev.tool) { applyTool(next.tool); s.publish(); touched = true }
      if (next.reducedMotion !== prev.reducedMotion) { controls.enableDamping = !next.reducedMotion; touched = true }
      if (next.autoRotate !== prev.autoRotate) touched = true
      if (touched) invalidate()
    })

    invalidate()
    return () => {
      window.clearTimeout(s.resizeTimer)
      s.resizeTimer = 0
      unsub()
      unsubUI()
      window.removeEventListener('resize', onResizeWin)
      window.visualViewport?.removeEventListener('resize', onResizeWin)
      camera.clearViewOffset()
      camera.zoom = 1
      s.cover = s.coverApplied = 0
      s.coverSize = ''
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
    if (s.limitMol === store.mol && s.limitAspect === camera.aspect && s.limitHide === hide) return
    s.limitMol = store.mol
    s.limitAspect = camera.aspect
    s.limitHide = hide
    const pts = scratch.current.pts
    // Limits come from the largest style (space filling) so a style switch never changes them, hence never the camera.
    ctx.model.collectFit('spacefill', pts)
    const fit = computeFit(pts, dirTuple(DEFAULT_DIR), FOV, camera.aspect, FIT_FILL)
    c.minDistance = MIN_CAMERA_DISTANCE // absolute, from the orbit target (SPEC B.1 / E13)
    c.maxDistance = Math.max(MAX_DISTANCE_RADII * boundingRadius(pts), fit.distance * 2)
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
    // Default framing uses the space-filling radii (the largest style) so that a style switch, which never moves the camera,
    // cannot clip the molecule; ball-and-stick then sits comfortably inside the frame with room for edits.
    ctx.model.collectFit('spacefill', pts)
    const fit = computeFit(pts, dirTuple(dir), FOV, camera.aspect, FIT_FILL_DEFAULT)
    s.fitW = gl.domElement.clientWidth || width
    s.fitH = gl.domElement.clientHeight || height
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

  /** Has the canvas changed enough since the last framing to need a new one (> 20 % of the width, or landscape <-> portrait)? */
  const needsRefit = (): boolean => {
    const s = st.current
    const w = gl.domElement.clientWidth, h = gl.domElement.clientHeight
    if (s.fitW < 2 || w < 2 || h < 2) return false
    return Math.abs(w - s.fitW) / s.fitW > REFIT_WIDTH_FRACTION || (w >= h) !== (s.fitW >= s.fitH)
  }

  // viewport resize: re-frame while the scene is still settling right after the first framing, and afterwards whenever the
  // canvas width changes by more than 20 % or the orientation flips (debounced, so a panel animation re-fits once, at its end)
  useEffect(() => {
    const s = st.current
    if (!s.controls || !s.initialized || width < 2 || height < 2) return
    camera.aspect = width / height // R3F does this too; doing it here makes the ordering irrelevant
    camera.updateProjectionMatrix()
    refreshLimits()
    if (performance.now() < s.pristineUntil) { frame('fit', true); return }
    if (!needsRefit()) return
    window.clearTimeout(s.resizeTimer)
    s.resizeTimer = window.setTimeout(() => {
      s.resizeTimer = 0
      if (!s.controls || !needsRefit()) return
      s.pristineUntil = 0
      frame('fit', false)
      invalidate()
    }, 140)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  /**
   * Projected silhouette of the visible atoms (final positions, the given style's radii; optionally only some atom ids) in NDC at zoom 1 and no view offset:
   * [minX, maxX, minY, maxY] relative to the canvas centre, or null when nothing is visible / behind the camera.
   */
  const silhouette = (style: RenderStyle, only?: ReadonlySet<number>): [number, number, number, number] | null => {
    camera.updateMatrixWorld()
    const inv = camera.matrixWorldInverse
    const e = inv.elements
    const tanV = Math.tan((camera.fov * Math.PI) / 360)
    const tanH = tanV * camera.aspect
    let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity
    const radii = STYLE_TARGETS[style]
    for (const atom of ctx.model.atoms) {
      if (!ctx.model.isVisible(atom) || (only && !only.has(atom.id))) continue
      const x = atom.t[0], y = atom.t[1], z = atom.t[2], r = Math.max(atomRadius(radii, atom.symbol), 0.2)
      const vx = e[0] * x + e[4] * y + e[8] * z + e[12]
      const vy = e[1] * x + e[5] * y + e[9] * z + e[13]
      const depth = -(e[2] * x + e[6] * y + e[10] * z + e[14])
      if (depth <= r + 1e-3) return null // the camera is inside / past this atom: let the distance limits sort it out
      mnx = Math.min(mnx, vx / (depth * tanH) - r / (depth * tanH)); mxx = Math.max(mxx, vx / (depth * tanH) + r / (depth * tanH))
      mny = Math.min(mny, vy / (depth * tanV) - r / (depth * tanV)); mxy = Math.max(mxy, vy / (depth * tanV) + r / (depth * tanV))
    }
    return mnx === Infinity ? null : [mnx, mxx, mny, mxy]
  }

  const step = (state: { invalidate: () => void }, delta: number, s: RigState, c: OrbitControls) => {
    ctx.sync()
    const store = useStudio.getState()
    refreshLimits()

    // An edit that adds atoms outside the visible (uncovered) area re-frames with an animated fit. Loads and clean-up have their
    // own fit, an atom drag never re-frames, and atoms that were already there are ignored (the user may have zoomed in on purpose).
    if (s.initialized && (store.mol !== s.checkedMol || store.loadNonce !== s.checkedNonce)) {
      const prev = s.checkedMol
      const loaded = store.loadNonce !== s.checkedNonce
      s.checkedMol = store.mol
      s.checkedNonce = store.loadNonce
      if (prev && !loaded && s.pendingFit === 'none' && !store.relaxing && !ctx.model.snap && store.mol.atoms.length > prev.atoms.length) {
        const known = new Set(prev.atoms.map((a) => a.id))
        const fresh = new Set(store.mol.atoms.filter((a) => !known.has(a.id)).map((a) => a.id))
        const sil = fresh.size > 0 ? silhouette(store.style, fresh) : null
        if (sil) {
          const z = camera.zoom, shift = s.coverApplied / height
          const lo = -1 + (2 * s.coverApplied) / height + (1 - AUTOFRAME_EDGE)
          if (sil[1] * z > AUTOFRAME_EDGE || sil[0] * z < -AUTOFRAME_EDGE || sil[3] * z + shift > AUTOFRAME_EDGE || sil[2] * z + shift < lo) s.pendingFit = 'fit'
        }
      }
    }

    if (!s.initialized) {
      s.initialized = true
      frame('reset', true)
      s.pristineUntil = performance.now() + PRISTINE_MS
      s.pendingFit = 'none'
      s.checkedMol = store.mol
      s.checkedNonce = store.loadNonce
    } else if (s.pendingFit !== 'none') {
      const kind = s.pendingFit
      s.pendingFit = 'none'
      s.pristineUntil = 0
      frame(kind, false)
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

    // keep the molecule visible above the mobile info sheet: shift the view into the uncovered part of the canvas. The scale is
    // left alone (no zoom jump, SPEC D.8) unless the molecule is taller than the uncovered part, then it shrinks just enough.
    if (Math.abs(s.cover - s.coverTarget) > 0.5) {
      s.cover = store.reducedMotion ? s.coverTarget : s.cover + (s.coverTarget - s.cover) * (1 - Math.exp(-Math.min(delta, 0.05) / 0.09))
      state.invalidate()
    } else s.cover = s.coverTarget
    const sizeKey = `${width}x${height}`
    if (s.cover !== s.coverApplied || (s.cover > 0 && sizeKey !== s.coverSize)) {
      s.coverApplied = s.cover
      s.coverSize = sizeKey
      if (s.cover < 0.5) { camera.clearViewOffset(); camera.zoom = 1 }
      else {
        const sil = silhouette(store.style)
        const extent = sil ? Math.max(Math.abs(sil[2]), Math.abs(sil[3])) : 0
        const free = (height - s.cover) / height // half-height of the uncovered part in NDC units
        camera.zoom = extent > 1e-6 ? clamp((free * 0.94) / extent, 0.38, 1) : 1
        camera.setViewOffset(width, height, 0, s.cover / 2, width, height)
      }
      camera.updateProjectionMatrix()
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
  }

  useFrame((state, delta) => {
    const s = st.current
    const c = s.controls
    if (!c || width < 2 || height < 2 || ctx.failure.current !== null) return
    try {
      step(state, delta, s, c)
    } catch (e) {
      ctx.fail(e)
    }
  }, -1)

  return null
}
