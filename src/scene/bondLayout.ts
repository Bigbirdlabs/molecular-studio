import type { AtomEntry, BondEntry } from './sceneModel'
import type { StyleParams } from './styleParams'

/** One parallel cylinder of a bond: offset from the bond axis (world) and radius. */
export interface Strand {
  ox: number
  oy: number
  oz: number
  r: number
}

export type Adjacency = Map<AtomEntry, BondEntry[]>

export function buildAdjacency(bonds: BondEntry[]): Adjacency {
  const adj: Adjacency = new Map()
  for (const b of bonds) {
    if (b.dying) continue
    let la = adj.get(b.a)
    if (!la) adj.set(b.a, (la = []))
    la.push(b)
    let lb = adj.get(b.b)
    if (!lb) adj.set(b.b, (lb = []))
    lb.push(b)
  }
  return adj
}

const MIN_PERP = 0.15

/**
 * Unit vector perpendicular to the bond axis along which the extra strands of a multiple bond are spread.
 *  - aromatic: towards the ring interior (sum of the in-ring neighbours' perpendicular components)
 *  - otherwise: in the plane of the neighbouring atoms (so ethylene / carbonyl strands lie in the molecular plane)
 *  - nothing to go by (isolated bond, linear chain): any stable perpendicular
 */
export function offsetDirection(bond: BondEntry, adj: Adjacency, out: [number, number, number]): void {
  const A = bond.a.p, B = bond.b.p
  let ax = B[0] - A[0], ay = B[1] - A[1], az = B[2] - A[2]
  const al = Math.hypot(ax, ay, az)
  if (al < 1e-9) { out[0] = 1; out[1] = 0; out[2] = 0; return }
  ax /= al; ay /= al; az /= al

  let sx = 0, sy = 0, sz = 0 // accumulated perpendicular components
  let fx = 0, fy = 0, fz = 0 // first usable one (fallback when the sum cancels)
  let have = false

  const gather = (centre: AtomEntry, aromaticOnly: boolean) => {
    for (const nb of adj.get(centre) ?? []) {
      if (nb === bond) continue
      if (aromaticOnly && !nb.aromatic) continue
      const other = nb.a === centre ? nb.b : nb.a
      let vx = other.p[0] - centre.p[0], vy = other.p[1] - centre.p[1], vz = other.p[2] - centre.p[2]
      const vl = Math.hypot(vx, vy, vz)
      if (vl < 1e-9) continue
      vx /= vl; vy /= vl; vz /= vl
      const along = vx * ax + vy * ay + vz * az
      let px = vx - along * ax, py = vy - along * ay, pz = vz - along * az
      const pl = Math.hypot(px, py, pz)
      if (pl < MIN_PERP) continue
      px /= pl; py /= pl; pz /= pl
      if (!have) { fx = px; fy = py; fz = pz; have = true }
      if (aromaticOnly) { sx += px; sy += py; sz += pz }
      else if (!(sx || sy || sz)) { sx = px; sy = py; sz = pz } // sp2 centres: one substituent defines the plane
      else if (sx * px + sy * py + sz * pz > 0) { sx += px; sy += py; sz += pz } // keep the sign consistent across both ends
      else { sx -= px; sy -= py; sz -= pz }
    }
  }

  if (bond.aromatic) { gather(bond.a, true); gather(bond.b, true) }
  if (!have) { sx = sy = sz = 0; gather(bond.a, false); gather(bond.b, false) }

  let l = Math.hypot(sx, sy, sz)
  if (!have || l < 0.2) {
    if (have) { sx = fx; sy = fy; sz = fz; l = 1 }
    else {
      // stable arbitrary perpendicular
      const rx = Math.abs(ax) < 0.9 ? 1 : 0, ry = rx ? 0 : 1
      sx = ay * 0 - az * ry; sy = az * rx - ax * 0; sz = ax * ry - ay * rx
      l = Math.hypot(sx, sy, sz) || 1
    }
  }
  out[0] = sx / l; out[1] = sy / l; out[2] = sz / l
}

const POOL: Strand[] = [
  { ox: 0, oy: 0, oz: 0, r: 0 },
  { ox: 0, oy: 0, oz: 0, r: 0 },
  { ox: 0, oy: 0, oz: 0, r: 0 },
]
const DIR: [number, number, number] = [0, 0, 0]

const setStrand = (s: Strand, k: number, d: [number, number, number], r: number) => {
  s.ox = d[0] * k; s.oy = d[1] * k; s.oz = d[2] * k; s.r = r
}

/**
 * Strands of one bond under the given style parameters. Returns the (reused) strand list and its length.
 * Single: 1 cylinder. Double: 2 parallel. Triple: 3 parallel. Aromatic: solid main cylinder + thinner inner strand.
 */
export function bondStrands(bond: BondEntry, adj: Adjacency, p: StyleParams): { strands: Strand[]; n: number } {
  if (bond.aromatic) {
    offsetDirection(bond, adj, DIR)
    setStrand(POOL[0], 0, DIR, p.bondR)
    setStrand(POOL[1], p.multiOff * 1.5, DIR, p.multiR * 0.6)
    return { strands: POOL, n: 2 }
  }
  if (bond.order === 1) {
    setStrand(POOL[0], 0, DIR, p.bondR)
    return { strands: POOL, n: 1 }
  }
  offsetDirection(bond, adj, DIR)
  if (bond.order === 2) {
    setStrand(POOL[0], -p.multiOff, DIR, p.multiR)
    setStrand(POOL[1], p.multiOff, DIR, p.multiR)
    return { strands: POOL, n: 2 }
  }
  setStrand(POOL[0], 0, DIR, p.multiR)
  setStrand(POOL[1], -p.multiOff * 1.4, DIR, p.multiR)
  setStrand(POOL[2], p.multiOff * 1.4, DIR, p.multiR)
  return { strands: POOL, n: 3 }
}
