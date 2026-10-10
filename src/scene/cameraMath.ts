import { cross, norm, type Vec3 } from '../chem/molecule'

export interface Fit {
  /** Point the camera should orbit around (centre of the projected silhouette). */
  center: Vec3
  /** Camera distance from `center`. */
  distance: number
}

/**
 * Smallest camera distance at which every sphere (flat [x, y, z, r, ...]) fits inside `fill` of the viewport when
 * looking at the molecule from direction `dir` (target -> camera). The target is shifted so the silhouette is centred.
 */
export function computeFit(spheres: number[], dir: Vec3, vfovDeg: number, aspect: number, fill: number): Fit {
  const tanV = Math.tan((vfovDeg * Math.PI) / 360)
  const tanH = tanV * Math.max(aspect, 0.05)
  const n = Math.floor(spheres.length / 4)
  if (n === 0) return { center: [0, 0, 0], distance: 2.2 / (fill * Math.min(tanV, tanH)) }

  const z = norm(dir)
  const x = norm(cross([0, 1, 0], Math.abs(z[1]) > 0.999 ? [0, 0, 1] : z)) // right
  const y = cross(z, x) // up

  let mnx = Infinity, mxx = -Infinity, mny = Infinity, mxy = -Infinity
  let cx = 0, cy = 0, cz = 0
  const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < n; i++) {
    const px = spheres[i * 4], py = spheres[i * 4 + 1], pz = spheres[i * 4 + 2], r = spheres[i * 4 + 3]
    const vx = px * x[0] + py * x[1] + pz * x[2]
    const vy = px * y[0] + py * y[1] + pz * y[2]
    mnx = Math.min(mnx, vx - r); mxx = Math.max(mxx, vx + r)
    mny = Math.min(mny, vy - r); mxy = Math.max(mxy, vy + r)
    for (let k = 0; k < 3; k++) {
      const c = spheres[i * 4 + k]
      lo[k] = Math.min(lo[k], c); hi[k] = Math.max(hi[k], c)
    }
  }
  // centre the silhouette on screen, keep the depth centre at the middle of the extent
  const midx = (mnx + mxx) / 2, midy = (mny + mxy) / 2
  const midz = ((lo[0] + hi[0]) / 2) * z[0] + ((lo[1] + hi[1]) / 2) * z[1] + ((lo[2] + hi[2]) / 2) * z[2]
  cx = midx * x[0] + midy * y[0] + midz * z[0]
  cy = midx * x[1] + midy * y[1] + midz * z[1]
  cz = midx * x[2] + midy * y[2] + midz * z[2]

  let dist = 0
  for (let i = 0; i < n; i++) {
    const px = spheres[i * 4] - cx, py = spheres[i * 4 + 1] - cy, pz = spheres[i * 4 + 2] - cz, r = spheres[i * 4 + 3]
    const vx = px * x[0] + py * x[1] + pz * x[2]
    const vy = px * y[0] + py * y[1] + pz * y[2]
    const vz = px * z[0] + py * z[1] + pz * z[2] // towards the camera
    const need = vz + Math.max((Math.abs(vx) + r) / (fill * tanH), (Math.abs(vy) + r) / (fill * tanV))
    if (need > dist) dist = need
  }
  return { center: [cx, cy, cz], distance: dist }
}

export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Normalise wheel deltas across pixel / line / page modes to "pixels". */
export function wheelPixels(e: { deltaY: number; deltaMode: number }): number {
  return e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
}
