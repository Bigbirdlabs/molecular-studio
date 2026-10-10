import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Drop OrbitControls' residual damping (inertia) without moving the camera. After an orbit drag the controls keep a tiny
 * rotation / pan remainder that the next `update()` would apply, nudging the camera during an unrelated gesture such as
 * an atom drag (SPEC checklist 13: the camera is identical during an atom drag). The remainder lives in private fields, so
 * it is flushed by one undamped update whose result is then thrown away: position, orientation and target are restored.
 */
export function cancelInertia(c: OrbitControls | null): void {
  if (!c || !c.enableDamping) return
  const cam = c.object
  const pos = cam.position.clone()
  const quat = cam.quaternion.clone()
  const target = c.target.clone()
  c.enableDamping = false
  try {
    c.update()
  } finally {
    c.enableDamping = true
    cam.position.copy(pos)
    cam.quaternion.copy(quat)
    c.target.copy(target)
    cam.updateMatrixWorld()
  }
}
