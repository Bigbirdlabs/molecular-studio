/**
 * Molecular geometry: VSEPR-based placement, automatic hydrogens and a small, stable force-field relaxation.
 *
 * Everything here is pure: molecules are never mutated, new molecules are returned (ids are preserved).
 *
 *  - placeNewAtom      direction for a new neighbour of an atom (VSEPR, staggered / planar torsion rules)
 *  - adjustHydrogens   add / remove / re-seat terminal hydrogens so listed atoms satisfy valence
 *  - addAllHydrogens / removeAllHydrogens
 *  - relaxStep         damped, energy-monotone force-field relaxation (bonds, angles, planarity, repulsion)
 *  - centerMolecule    centroid -> origin
 *  - bondTargetLength  reference bond length in Å (exported helper; used by the force field and placement)
 *
 * The force-field energy is an indicative number (arbitrary units); it is only meaningful as "lower is better".
 */
import {
  type Atom,
  type Bond,
  type Molecule,
  type Vec3,
  add,
  allowedValences,
  atomById,
  centroid,
  cloneMolecule,
  cross,
  dist,
  dot,
  idealBondLength,
  inRing,
  len,
  neighbours,
  norm,
  perpendicular,
  scale,
  sub,
  valenceUsed,
} from './molecule'

const DEG = Math.PI / 180
const TETRA = Math.acos(-1 / 3) // 109.4712206 deg

// ===================================================================================================================
// Reference bond lengths
// ===================================================================================================================

/** [a, b, order (4 = aromatic), length in Å] — experimental / textbook values. */
const LENGTHS: [string, string, number, number][] = [
  ['C', 'C', 1, 1.54], ['C', 'C', 2, 1.34], ['C', 'C', 3, 1.2], ['C', 'C', 4, 1.39],
  ['C', 'H', 1, 1.09], ['C', 'N', 1, 1.47], ['C', 'N', 2, 1.28], ['C', 'N', 3, 1.16], ['C', 'N', 4, 1.34],
  ['C', 'O', 1, 1.43], ['C', 'O', 2, 1.21], ['C', 'O', 3, 1.13], ['C', 'O', 4, 1.36],
  ['C', 'S', 1, 1.82], ['C', 'S', 2, 1.61], ['C', 'S', 4, 1.72],
  ['C', 'F', 1, 1.35], ['C', 'Cl', 1, 1.77], ['C', 'Br', 1, 1.94], ['C', 'I', 1, 2.14],
  ['C', 'P', 1, 1.84], ['C', 'P', 2, 1.67], ['C', 'Si', 1, 1.87], ['C', 'B', 1, 1.56], ['C', 'Mg', 1, 2.1],
  ['N', 'H', 1, 1.01], ['N', 'N', 1, 1.45], ['N', 'N', 2, 1.25], ['N', 'N', 3, 1.1], ['N', 'N', 4, 1.35],
  ['N', 'O', 1, 1.4], ['N', 'O', 2, 1.21], ['N', 'O', 4, 1.37], ['N', 'F', 1, 1.36], ['N', 'Cl', 1, 1.75],
  ['N', 'S', 1, 1.65], ['N', 'P', 1, 1.68], ['N', 'B', 1, 1.4],
  ['O', 'H', 1, 0.96], ['O', 'O', 1, 1.48], ['O', 'O', 2, 1.21], ['O', 'S', 1, 1.58], ['O', 'S', 2, 1.43],
  ['O', 'P', 1, 1.61], ['O', 'P', 2, 1.48], ['O', 'Si', 1, 1.64], ['O', 'B', 1, 1.37], ['O', 'B', 2, 1.36],
  ['O', 'Cl', 1, 1.7], ['O', 'Na', 1, 2.1], ['O', 'Mg', 1, 2.0],
  ['S', 'H', 1, 1.34], ['S', 'S', 1, 2.05], ['S', 'F', 1, 1.58], ['S', 'Cl', 1, 2.07],
  ['P', 'H', 1, 1.42], ['P', 'Cl', 1, 2.04], ['P', 'F', 1, 1.56],
  ['Si', 'H', 1, 1.48], ['Si', 'Cl', 1, 2.05], ['Si', 'F', 1, 1.6],
  ['B', 'H', 1, 1.19], ['B', 'F', 1, 1.31], ['B', 'Cl', 1, 1.75],
  ['H', 'H', 1, 0.74], ['F', 'F', 1, 1.42], ['Cl', 'Cl', 1, 1.99], ['Br', 'Br', 1, 2.28], ['I', 'I', 1, 2.67],
  ['Na', 'Cl', 1, 2.36], ['Na', 'F', 1, 1.93], ['Na', 'Br', 1, 2.5], ['Na', 'I', 1, 2.71], ['Mg', 'Cl', 1, 2.2],
  ['Cl', 'F', 1, 1.63],
]
const lenKey = (a: string, b: string, o: number) => (a < b ? `${a}|${b}|${o}` : `${b}|${a}|${o}`)
const LEN = new Map<string, number>(LENGTHS.map(([a, b, o, l]) => [lenKey(a, b, o), l]))

/** Reference bond length (Å). Aromatic bonds use aromatic values; unknown pairs fall back to covalent radii. */
export function bondTargetLength(sa: string, sb: string, order: number, aromatic = false): number {
  if (aromatic) {
    const v = LEN.get(lenKey(sa, sb, 4))
    if (v) return v
    const s = LEN.get(lenKey(sa, sb, 1)) ?? idealBondLength(sa, sb, 1)
    const d = LEN.get(lenKey(sa, sb, 2)) ?? idealBondLength(sa, sb, 2)
    return (s + d) / 2
  }
  return LEN.get(lenKey(sa, sb, order)) ?? idealBondLength(sa, sb, order)
}

// ===================================================================================================================
// Electron-domain analysis
// ===================================================================================================================

const VALENCE_ELECTRONS: Record<string, number> = {
  H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Na: 1, Mg: 2, Si: 4, P: 5, S: 6, Cl: 7, Br: 7, I: 7,
}

/** Lowest allowed valence >= used (or the largest one when the atom is over-saturated). */
function targetFor(a: Atom, used: number): { target: number; missing: number } {
  const list = allowedValences(a)
  if (!list.length) return { target: 0, missing: 0 }
  let target = list[list.length - 1]
  for (const v of list) if (used <= v) { target = v; break }
  return { target, missing: Math.max(0, target - used) }
}

function lonePairs(a: Atom, target: number): number {
  const ve = VALENCE_ELECTRONS[a.symbol]
  if (ve === undefined) return 0
  return Math.max(0, Math.floor((ve - a.charge - target) / 2))
}

/** True when the atom takes part in a double / triple / aromatic bond. */
function hasPi(m: Molecule, id: number): boolean {
  for (const b of m.bonds) if ((b.a === id || b.b === id) && (b.order >= 2 || b.aromatic)) return true
  return false
}

interface Geo {
  /** number of electron domains (neighbours + implicit hydrogens + lone pairs) */
  D: number
  lp: number
  target: number
  /** hydrogens still missing on top of the neighbours counted in `nbIds` */
  missing: number
}

/**
 * Electron-domain geometry of atom `a`.
 * `nbIds`  neighbours that are (or will stay) bonded; `used` their summed bond order;
 * `added`  extra neighbours that will be bonded but are not in `nbIds` (a new atom).
 */
function geoFor(m: Molecule, a: Atom, nbIds: number[], used: number, added: number): Geo {
  const { target, missing } = targetFor(a, used)
  let lp = lonePairs(a, target)
  let D = nbIds.length + added + missing + lp
  // A nitrogen lone pair conjugated with a pi system (amide, aniline, pyrrole) makes the centre planar.
  if (a.symbol === 'N' && lp === 1 && D === 4 && nbIds.some((id) => hasPi(m, id))) {
    D = 3
    lp = 0
  }
  return { D, lp, target, missing }
}

/** Bond angle (deg) between bonds of a four-domain centre that carries lone pairs. */
function lonePairAngle(symbol: string, lp: number, anyHeavy: boolean): number {
  if (lp <= 0) return TETRA / DEG
  if (lp === 1) return symbol === 'P' ? 94 : symbol === 'S' ? 106 : 107
  if (symbol === 'S') return anyHeavy ? 99 : 92
  return anyHeavy ? 109 : 104.5
}

// ===================================================================================================================
// Free direction ("slot") generation
// ===================================================================================================================

const TBP: Vec3[] = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-0.5, Math.sqrt(3) / 2, 0], [-0.5, -Math.sqrt(3) / 2, 0]]
const OCT: Vec3[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]

const neg = (v: Vec3): Vec3 => [-v[0], -v[1], -v[2]]
function unitFrom(from: Vec3, to: Vec3): Vec3 | null {
  const v = sub(to, from)
  const l = len(v)
  return l < 1e-6 ? null : scale(v, 1 / l)
}

/** Orthonormal pair (e1, e2) perpendicular to `axis`; e1 follows the projection of `ref` when given. */
function basis(axis: Vec3, ref: Vec3 | null): [Vec3, Vec3] {
  let e1: Vec3 | null = null
  if (ref) {
    const p = sub(ref, scale(axis, dot(ref, axis)))
    if (len(p) > 1e-3) e1 = norm(p)
  }
  if (!e1) e1 = perpendicular(axis)
  return [e1, cross(axis, e1)]
}

function conePoint(axis: Vec3, e1: Vec3, e2: Vec3, half: number, az: number): Vec3 {
  const ring = add(scale(e1, Math.cos(az)), scale(e2, Math.sin(az)))
  return add(scale(axis, Math.cos(half)), scale(ring, Math.sin(half)))
}

/** Reference vector for torsion: a substituent of `parent` other than `center` (heavy atoms first). */
function torsionRef(m: Molecule, center: Atom, parent: Atom, axis: Vec3): Vec3 | null {
  const subs = neighbours(m, parent.id)
    .filter((n) => n.atom.id !== center.id)
    .sort((x, y) => Number(x.atom.symbol === 'H') - Number(y.atom.symbol === 'H') || x.atom.id - y.atom.id)
  for (const s of subs) {
    const v = sub(s.atom.pos, parent.pos)
    const p = sub(v, scale(axis, dot(v, axis)))
    if (len(p) > 1e-3) return v
  }
  return null
}

/** Slots around a centre that already has exactly one neighbour direction `axis` (or none: axis is then free). */
function singleAxisSlots(D: number, lp: number, symbol: string, anyHeavy: boolean, axis: Vec3, ref: Vec3 | null, anti: boolean): Vec3[] {
  const [e1, e2] = basis(axis, ref)
  const start = anti ? Math.PI : 0
  if (D === 3) {
    const half = 120 * DEG
    return [conePoint(axis, e1, e2, half, start), conePoint(axis, e1, e2, half, start + Math.PI)]
  }
  // four domains
  const alpha = lonePairAngle(symbol, lp, anyHeavy) * DEG
  const ca = Math.cos(alpha)
  const phi = Math.acos(Math.max(-1, Math.min(1, ca / (1 + ca))))
  return [0, 1, 2].map((j) => conePoint(axis, e1, e2, alpha, start + (j === 0 ? 0 : j === 1 ? phi : 2 * Math.PI - phi)))
}

/** Rotation frame from two non-parallel vectors. */
function frame(a: Vec3, b: Vec3 | null): [Vec3, Vec3, Vec3] {
  const x = norm(a)
  let z = b ? cross(x, b) : [0, 0, 0] as Vec3
  if (len(z) < 1e-4) z = cross(x, perpendicular(x))
  z = norm(z)
  return [x, cross(z, x), z]
}

/** Free directions of a 5- or 6-domain centre (template fit, greedy assignment). */
function templateSlots(D: number, lp: number, dirs: Vec3[]): Vec3[] {
  const template = (D === 5 ? TBP : OCT).slice(0, Math.max(0, D - lp))
  if (!dirs.length) return template
  const used: number[] = []
  const ang = (a: Vec3, b: Vec3) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))))
  for (let i = 0; i < dirs.length; i++) {
    let best = -1
    let bestCost = Infinity
    for (let j = 0; j < template.length; j++) {
      if (used.includes(j)) continue
      let cost = 0
      for (let q = 0; q < i; q++) cost += Math.abs(ang(dirs[i], dirs[q]) - ang(template[j], template[used[q]]))
      if (cost < bestCost - 1e-9) { bestCost = cost; best = j }
    }
    if (best < 0) return []
    used.push(best)
  }
  const ft = frame(template[used[0]], dirs.length > 1 ? template[used[1]] : null)
  const fe = frame(dirs[0], dirs.length > 1 ? dirs[1] : null)
  const rot = (v: Vec3): Vec3 => {
    const c: Vec3 = [dot(v, ft[0]), dot(v, ft[1]), dot(v, ft[2])]
    return add(add(scale(fe[0], c[0]), scale(fe[1], c[1])), scale(fe[2], c[2]))
  }
  return template.filter((_, j) => !used.includes(j)).map(rot)
}

/** Direction that stays as far as possible from all given directions (fallback for crowded / odd centres). */
function bestFreeDirection(dirs: Vec3[]): Vec3 {
  if (!dirs.length) return [1, 0, 0]
  let best: Vec3 = [1, 0, 0]
  let bestScore = Infinity
  const N = 96
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N
    const r = Math.sqrt(1 - y * y)
    const c: Vec3 = [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r]
    let worst = -Infinity
    for (const d of dirs) worst = Math.max(worst, dot(c, d))
    if (worst < bestScore) { bestScore = worst; best = c }
  }
  return best
}

interface Fixed { atom: Atom; dir: Vec3 }

/**
 * Directions (unit vectors, in priority order, bond slots first and lone-pair slots last) still free around `center`
 * given the neighbours that stay where they are.
 */
function freeSlots(m: Molecule, center: Atom, fixed: Fixed[], D: number, lp: number): Vec3[] {
  const k = fixed.length
  const dirs = fixed.map((f) => f.dir)
  if (D - k <= 0) return []
  const anyHeavy = fixed.some((f) => f.atom.symbol !== 'H')
  if (D <= 1) return k === 0 ? [[1, 0, 0]] : []
  if (D === 2) return k === 0 ? [[1, 0, 0], [-1, 0, 0]] : k === 1 ? [neg(dirs[0])] : []
  if (D >= 5) return templateSlots(Math.min(D, 6), lp, dirs)

  if (k === 0) {
    const axis: Vec3 = [1, 0, 0]
    return [axis, ...singleAxisSlots(D, lp, center.symbol, anyHeavy, axis, null, false)]
  }
  if (k === 1) {
    const axis = dirs[0]
    const ref = torsionRef(m, center, fixed[0].atom, axis)
    return singleAxisSlots(D, lp, center.symbol, anyHeavy, axis, ref, true)
  }
  if (D === 3) {
    if (k === 2) {
      const s = add(dirs[0], dirs[1])
      return [len(s) > 0.15 ? neg(norm(s)) : perpendicular(dirs[0])]
    }
    return []
  }
  // D === 4
  if (k === 2) {
    const alpha = lonePairAngle(center.symbol, lp, anyHeavy) * DEG
    const s = add(dirs[0], dirs[1])
    let w: Vec3
    let n: Vec3
    if (len(s) > 0.15) {
      w = neg(norm(s))
      n = cross(dirs[0], dirs[1])
      n = len(n) > 1e-4 ? norm(n) : perpendicular(w)
    } else {
      w = perpendicular(dirs[0])
      n = norm(cross(dirs[0], w))
    }
    const h = Math.acos(Math.max(-1, Math.min(1, dot(dirs[0], dirs[1])))) / 2
    const cosg = Math.max(-1, Math.min(1, -Math.cos(alpha) / Math.max(Math.cos(h), 0.05)))
    const g = Math.acos(cosg)
    const a = add(scale(w, Math.cos(g)), scale(n, Math.sin(g)))
    const b = add(scale(w, Math.cos(g)), scale(n, -Math.sin(g)))
    return [a, b]
  }
  if (k === 3) {
    const s = add(add(dirs[0], dirs[1]), dirs[2])
    if (len(s) > 0.2) return [neg(norm(s))]
    let n = cross(sub(dirs[1], dirs[0]), sub(dirs[2], dirs[0]))
    n = len(n) > 1e-4 ? norm(n) : perpendicular(dirs[0])
    return [dot(n, s) > 0 ? neg(n) : n]
  }
  return []
}

function fixedOf(m: Molecule, center: Atom, ids: Iterable<number> | null): Fixed[] {
  const allow = ids ? new Set(ids) : null
  const out: Fixed[] = []
  for (const n of neighbours(m, center.id)) {
    if (allow && !allow.has(n.atom.id)) continue
    const dir = unitFrom(center.pos, n.atom.pos)
    if (dir) out.push({ atom: n.atom, dir })
  }
  return out
}

// ===================================================================================================================
// placeNewAtom
// ===================================================================================================================

/**
 * Position for a new atom `symbol` bonded to `parentId` with `order`: VSEPR-correct direction away from the existing
 * neighbours (tetrahedral 109.5, trigonal 120, linear 180, lone-pair centres 104.5 / 107), staggered for sp3 chains,
 * coplanar next to pi systems, at the reference bond length.
 */
export function placeNewAtom(m: Molecule, parentId: number, symbol: string, order: number): Vec3 {
  const p = atomById(m, parentId)
  if (!p) return [0, 0, 0]
  const nbs = neighbours(m, parentId)
  const g = geoFor(m, p, nbs.map((n) => n.atom.id), valenceUsed(m, parentId) + order, 1)
  const fixed = fixedOf(m, p, null)
  let dir = freeSlots(m, p, fixed, g.D, g.lp)[0]
  if (!dir) dir = bestFreeDirection(fixed.map((f) => f.dir))
  return add(p.pos, scale(dir, bondTargetLength(p.symbol, symbol, order)))
}

// ===================================================================================================================
// Hydrogens
// ===================================================================================================================

const isTerminalH = (m: Molecule, id: number) => {
  const a = atomById(m, id)
  return !!a && a.symbol === 'H' && neighbours(m, id).length === 1
}

function terminalHydrogens(m: Molecule, id: number) {
  return neighbours(m, id)
    .filter((n) => isTerminalH(m, n.atom.id))
    .sort((x, y) => x.atom.id - y.atom.id)
}

/** Component of `start` after cutting `cut`; returns the atom ids. */
function componentWithout(m: Molecule, start: number, cut: Bond): Set<number> {
  const seen = new Set<number>([start])
  const stack = [start]
  while (stack.length) {
    const id = stack.pop()!
    for (const n of neighbours(m, id)) {
      if (n.bond.id === cut.id || seen.has(n.atom.id)) continue
      seen.add(n.atom.id)
      stack.push(n.atom.id)
    }
  }
  return seen
}

/** Bonds between listed atoms whose length is clearly off get rigidly shifted (smaller side moves) to the reference length. */
function fixBondLengths(m: Molecule, ids: Set<number>) {
  for (const b of m.bonds) {
    if (!ids.has(b.a) || !ids.has(b.b)) continue
    const A = atomById(m, b.a)
    const B = atomById(m, b.b)
    if (!A || !B) continue
    const target = bondTargetLength(A.symbol, B.symbol, b.order, !!b.aromatic)
    const cur = dist(A.pos, B.pos)
    if (cur < 1e-6 || Math.abs(cur - target) <= 0.04) continue
    const sideB = componentWithout(m, b.b, b)
    if (sideB.has(b.a)) continue // ring bond: leave it to relaxStep
    const sideA = componentWithout(m, b.a, b)
    const dir = scale(sub(B.pos, A.pos), 1 / cur)
    const moveB = sideB.size <= sideA.size
    const shift = scale(dir, (moveB ? 1 : -1) * (target - cur))
    for (const at of m.atoms) if ((moveB ? sideB : sideA).has(at.id)) at.pos = add(at.pos, shift)
  }
}

const idealPairAngle = (D: number, lp: number, symbol: string, anyHeavy: boolean) =>
  D <= 2 ? 180 : D === 3 ? 120 : D === 4 ? lonePairAngle(symbol, lp, anyHeavy) : 0

/** True when the neighbour directions of `a` already match the ideal geometry of a D-domain centre. */
function centerLooksRight(m: Molecule, a: Atom, D: number, lp: number, tol: number): boolean {
  if (D >= 5) return true
  const fixed = fixedOf(m, a, null)
  if (fixed.length < 2) return true
  const anyHeavy = fixed.some((f) => f.atom.symbol !== 'H')
  const ideal = idealPairAngle(D, lp, a.symbol, anyHeavy)
  let sum = 0
  let pairs = 0
  for (let i = 0; i < fixed.length; i++)
    for (let j = i + 1; j < fixed.length; j++) {
      const ang = Math.acos(Math.max(-1, Math.min(1, dot(fixed[i].dir, fixed[j].dir)))) / DEG
      if (Math.abs(ang - ideal) > tol) return false
      sum += ang
      pairs++
    }
  if (D === 3 && fixed.length === 3 && pairs === 3 && sum < 352) return false // planarity
  return true
}

/** Make the terminal hydrogens of heavy atom `id` match its valence (and move them to ideal positions when needed). */
function syncHydrogens(m: Molecule, id: number, addOnly: boolean) {
  const a = atomById(m, id)
  if (!a || a.symbol === 'H') return
  const hs = terminalHydrogens(m, id)
  const keep = neighbours(m, id).filter((n) => !hs.some((h) => h.atom.id === n.atom.id))
  const usedKeep = keep.reduce((s, n) => s + n.bond.order, 0)
  const desired = geoFor(m, a, keep.map((n) => n.atom.id), usedKeep, 0).missing
  if (hs.length === desired) return
  if (addOnly && hs.length > desired) return
  const hLen = bondTargetLength(a.symbol, 'H', 1)

  if (hs.length > desired) {
    const drop = new Set(hs.slice(desired).map((h) => h.atom.id))
    m.atoms = m.atoms.filter((x) => !drop.has(x.id))
    m.bonds = m.bonds.filter((b) => !drop.has(b.a) && !drop.has(b.b))
  } else {
    const all = neighbours(m, id)
    const g = geoFor(m, a, all.map((n) => n.atom.id), valenceUsed(m, id), 0)
    const fixed = fixedOf(m, a, null)
    const slots = freeSlots(m, a, fixed, g.D, g.lp)
    const dirsSoFar = fixed.map((f) => f.dir)
    for (let i = 0; i < desired - hs.length; i++) {
      const dir = slots[i] ?? bestFreeDirection(dirsSoFar)
      dirsSoFar.push(dir)
      const hid = m.nextId++
      m.atoms.push({ id: hid, symbol: 'H', pos: add(a.pos, scale(dir, hLen)), charge: 0 })
      m.bonds.push({ id: m.nextId++, a: id, b: hid, order: 1 })
    }
  }
  if (addOnly) return

  // verify the resulting geometry; if the hybridisation changed, re-seat every terminal hydrogen
  const now = terminalHydrogens(m, id)
  const keepNow = neighbours(m, id).filter((n) => !now.some((h) => h.atom.id === n.atom.id))
  const gAll = geoFor(m, a, neighbours(m, id).map((n) => n.atom.id), valenceUsed(m, id), 0)
  if (centerLooksRight(m, a, gAll.D, gAll.lp, 8)) return
  const gKeep = geoFor(m, a, keepNow.map((n) => n.atom.id), keepNow.reduce((s, n) => s + n.bond.order, 0), 0)
  const fixed = fixedOf(m, a, keepNow.map((n) => n.atom.id))
  const slots = freeSlots(m, a, fixed, gKeep.D, gKeep.lp)
  const dirsSoFar = fixed.map((f) => f.dir)
  now.forEach((h, i) => {
    const dir = slots[i] ?? bestFreeDirection(dirsSoFar)
    dirsSoFar.push(dir)
    const atom = atomById(m, h.atom.id)
    if (atom) atom.pos = add(a.pos, scale(dir, hLen))
  })
}

/**
 * For every listed heavy atom: remove surplus terminal hydrogens or add the missing ones at VSEPR positions
 * (and re-seat them when the hybridisation changed, e.g. single -> double bond). Bonds between two listed atoms are
 * shifted to their reference length first. Atoms already correct are left untouched.
 */
export function adjustHydrogens(m: Molecule, atomIds: number[]): Molecule {
  const out = cloneMolecule(m)
  const ids = new Set(atomIds)
  fixBondLengths(out, ids)
  for (const id of new Set(atomIds)) syncHydrogens(out, id, false)
  return out
}

/** Re-seat the neighbours of one heavy atom at the VSEPR-ideal directions (branches move rigidly). */
function idealizeAtom(m: Molecule, A: Atom) {
  const nbs = neighbours(m, A.id)
  if (nbs.length < 2) return
  const info = nbs.map((n) => {
    const side = componentWithout(m, n.atom.id, n.bond)
    return { n, side, ring: side.has(A.id) }
  })
  const g = geoFor(m, A, nbs.map((n) => n.atom.id), valenceUsed(m, A.id), 0)
  let fixedInfo = info.filter((x) => x.ring)
  if (!fixedInfo.length) {
    const root = [...info].sort((x, y) => y.side.size - x.side.size || x.n.atom.id - y.n.atom.id)[0]
    fixedInfo = [root]
  }
  const movable = info.filter((x) => !fixedInfo.includes(x))
  if (!movable.length) return
  const fixed: Fixed[] = []
  for (const f of fixedInfo) {
    const dir = unitFrom(A.pos, f.n.atom.pos)
    if (dir) fixed.push({ atom: f.n.atom, dir })
  }
  const slots = freeSlots(m, A, fixed, g.D, g.lp)
  const usedSlot = new Set<number>()
  const dirsSoFar = fixed.map((f) => f.dir)
  const rot = (d: Vec3, s: Vec3) => {
    let k = cross(d, s)
    const c = Math.max(-1, Math.min(1, dot(d, s)))
    if (len(k) < 1e-6) {
      if (c > 0) return (v: Vec3) => v
      k = perpendicular(d)
    }
    k = norm(k)
    const th = len(cross(d, s)) < 1e-6 ? Math.PI : Math.acos(c)
    const ct = Math.cos(th)
    const st = Math.sin(th)
    return (v: Vec3): Vec3 => add(add(scale(v, ct), scale(cross(k, v), st)), scale(k, dot(k, v) * (1 - ct)))
  }
  for (const x of movable) {
    const cur = unitFrom(A.pos, x.n.atom.pos) ?? [1, 0, 0]
    let bi = -1
    let bd = -Infinity
    slots.forEach((sl, i) => {
      if (usedSlot.has(i)) return
      const d = dot(sl, cur)
      if (d > bd) { bd = d; bi = i }
    })
    let s: Vec3
    if (bi >= 0) { usedSlot.add(bi); s = slots[bi] } else s = bestFreeDirection(dirsSoFar)
    dirsSoFar.push(s)
    const L = bondTargetLength(A.symbol, x.n.atom.symbol, x.n.bond.order, !!x.n.bond.aromatic)
    const R = rot(cur, s)
    const curLen = dist(A.pos, x.n.atom.pos)
    for (const at of m.atoms) {
      if (!x.side.has(at.id)) continue
      const rel = R(sub(at.pos, A.pos))
      at.pos = add(add(A.pos, rel), scale(s, L - (curLen < 1e-6 ? 0 : curLen)))
    }
    if (curLen < 1e-6) {
      const na = atomById(m, x.n.atom.id)
      if (na) na.pos = add(A.pos, scale(s, L))
    }
  }
}

/** Re-idealise the local geometry (sp / sp2 / sp3) around the listed heavy atoms: neighbours go to VSEPR directions and reference lengths. */
export function idealizeAround(m: Molecule, atomIds: number[]): Molecule {
  const out = cloneMolecule(m)
  for (const id of new Set(atomIds)) {
    const a = atomById(out, id)
    if (a && a.symbol !== 'H') idealizeAtom(out, a)
  }
  return out
}

/** Saturate every heavy atom with hydrogens (existing hydrogens stay where they are). */
export function addAllHydrogens(m: Molecule): Molecule {
  const out = cloneMolecule(m)
  for (const id of out.atoms.filter((a) => a.symbol !== 'H').map((a) => a.id)) syncHydrogens(out, id, true)
  return out
}

/** Remove all terminal hydrogens (hydrogens bonded to exactly one non-hydrogen atom). */
export function removeAllHydrogens(m: Molecule): Molecule {
  const out = cloneMolecule(m)
  const drop = new Set<number>()
  for (const a of out.atoms) {
    if (a.symbol !== 'H') continue
    const nb = neighbours(out, a.id)
    if (nb.length === 1 && nb[0].atom.symbol !== 'H') drop.add(a.id)
  }
  out.atoms = out.atoms.filter((a) => !drop.has(a.id))
  out.bonds = out.bonds.filter((b) => !drop.has(b.a) && !drop.has(b.b))
  return out
}

// ===================================================================================================================
// Force field
// ===================================================================================================================

const KB = 300 // bond stretch
const KA = 80 // angle bend (per rad^2)
const KI = 60 // planarity of trigonal centres (per Å^6 of the signed volume)
const KT = 60 // planarity across double / aromatic bonds
const KN = 40 // soft repulsion
const NB_SCALE = 0.6 // repulsion starts below 0.6 * (vdW_i + vdW_j)
const MAX_DISP = 0.25 // Å per iteration
const VDW: Record<string, number> = {
  H: 1.2, B: 1.92, C: 1.7, N: 1.55, O: 1.52, F: 1.47, Na: 2.27, Mg: 1.73, Si: 2.1, P: 1.8, S: 1.8, Cl: 1.75, Br: 1.85, I: 1.98,
}

interface BondTerm { i: number; j: number; r0: number }
interface AngleTerm { i: number; c: number; k: number; theta0: number; linear: boolean }
interface ImproperTerm { c: number; a: number; b: number; d: number }
interface TorsionTerm { i: number; j: number; k: number; l: number }
interface PairTerm { i: number; j: number; d0: number }
interface System {
  n: number
  bonds: BondTerm[]
  angles: AngleTerm[]
  impropers: ImproperTerm[]
  torsions: TorsionTerm[]
  pairs: PairTerm[]
}

/** Size of the smallest ring through p - centre - q (0 when none up to `maxSize`). */
function ringSize(adj: number[][], centre: number, p: number, q: number, maxSize: number): number {
  if (p === q) return 0
  let frontier = [p]
  const seen = new Set<number>([centre, p])
  for (let depth = 1; depth <= maxSize - 2; depth++) {
    const next: number[] = []
    for (const u of frontier)
      for (const v of adj[u]) {
        if (v === q) return depth + 2
        if (seen.has(v)) continue
        seen.add(v)
        next.push(v)
      }
    frontier = next
  }
  return 0
}

function ringAngle(size: number): number | null {
  return size === 3 ? 60 : size === 4 ? 90 : size === 5 ? 108 : null
}

function buildSystem(m: Molecule, x: Float64Array): System {
  const n = m.atoms.length
  const index = new Map<number, number>()
  m.atoms.forEach((a, i) => index.set(a.id, i))
  const adj: number[][] = Array.from({ length: n }, () => [])
  const bonds: BondTerm[] = []
  const bondInfo: { i: number; j: number; b: Bond }[] = []
  const seenPair = new Set<string>()
  for (const b of m.bonds) {
    const i = index.get(b.a)
    const j = index.get(b.b)
    if (i === undefined || j === undefined || i === j) continue
    const key = i < j ? `${i}|${j}` : `${j}|${i}`
    if (seenPair.has(key)) continue
    seenPair.add(key)
    adj[i].push(j)
    adj[j].push(i)
    bonds.push({ i, j, r0: bondTargetLength(m.atoms[i].symbol, m.atoms[j].symbol, b.order, !!b.aromatic) })
    bondInfo.push({ i, j, b })
  }

  // per-atom electron-domain analysis
  const domain: number[] = new Array(n).fill(0)
  const angles: AngleTerm[] = []
  const impropers: ImproperTerm[] = []
  const atomAngle = (i: number, a: number, b: number) => {
    const ax = x[a * 3] - x[i * 3], ay = x[a * 3 + 1] - x[i * 3 + 1], az = x[a * 3 + 2] - x[i * 3 + 2]
    const bx = x[b * 3] - x[i * 3], by = x[b * 3 + 1] - x[i * 3 + 1], bz = x[b * 3 + 2] - x[i * 3 + 2]
    const c = (ax * bx + ay * by + az * bz) / ((Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz)) || 1)
    return Math.acos(Math.max(-1, Math.min(1, c))) / DEG
  }
  for (let i = 0; i < n; i++) {
    const atom = m.atoms[i]
    const nb = adj[i]
    const nbIds = nb.map((j) => m.atoms[j].id)
    const used = valenceUsed(m, atom.id)
    const g = geoFor(m, atom, nbIds, used, 0)
    domain[i] = g.D
    if (nb.length < 2) continue
    const anyHeavy = nb.some((j) => m.atoms[j].symbol !== 'H')
    const pairs: [number, number][] = []
    for (let p = 0; p < nb.length; p++) for (let q = p + 1; q < nb.length; q++) pairs.push([nb[p], nb[q]])
    const thetas: number[] = []
    if (g.D >= 5) {
      const set = g.D === 5 ? [90, 120, 180] : [90, 180]
      for (const [p, q] of pairs) {
        const cur = atomAngle(i, p, q)
        thetas.push(set.reduce((best, s) => (Math.abs(s - cur) < Math.abs(best - cur) ? s : best), set[0]))
      }
    } else if (g.D === 3 && nb.length === 3) {
      // trigonal centre: ring angles first, the remaining angles share what is left of 360 deg
      const fixedTheta: (number | null)[] = pairs.map(([p, q]) => {
        const s = ringSize(adj, i, p, q, 6)
        return s === 6 ? 120 : ringAngle(s)
      })
      const sumFixed = fixedTheta.reduce<number>((s, t) => s + (t ?? 0), 0)
      const free = fixedTheta.filter((t) => t === null).length
      const rest = free ? Math.max(90, Math.min(150, (360 - sumFixed) / free)) : 0
      fixedTheta.forEach((t) => thetas.push(t ?? rest))
      impropers.push({ c: i, a: nb[0], b: nb[1], d: nb[2] })
    } else {
      const base = g.D <= 2 ? 180 : g.D === 3 ? 120 : lonePairAngle(atom.symbol, g.lp, anyHeavy)
      for (const [p, q] of pairs) {
        const ra = g.D >= 3 ? ringAngle(ringSize(adj, i, p, q, 5)) : null
        thetas.push(ra ?? base)
      }
    }
    pairs.forEach(([p, q], idx) => angles.push({ i: p, c: i, k: q, theta0: thetas[idx] * DEG, linear: thetas[idx] >= 179.9 }))
  }

  // planarity across double / aromatic bonds between trigonal centres
  const torsions: TorsionTerm[] = []
  for (const { i: j, j: k, b } of bondInfo) {
    if (domain[j] !== 3 || domain[k] !== 3) continue
    // pi bonds, ring bonds between trigonal centres and bonds to a conjugated nitrogen (amide) stay flat
    const flat = b.order >= 2 || b.aromatic || m.atoms[j].symbol === 'N' || m.atoms[k].symbol === 'N' || inRing(m, b)
    if (!flat) continue
    for (const i of adj[j]) {
      if (i === k) continue
      for (const l of adj[k]) {
        if (l === j || l === i) continue
        torsions.push({ i, j, k, l })
      }
    }
  }

  // non-bonded repulsion for pairs further than two bonds apart
  const near: Set<number>[] = adj.map((nb, i) => {
    const s = new Set<number>([i])
    for (const j of nb) { s.add(j); for (const q of adj[j]) s.add(q) }
    return s
  })
  const pairs: PairTerm[] = []
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (near[i].has(j)) continue
      const d0 = NB_SCALE * ((VDW[m.atoms[i].symbol] ?? 1.7) + (VDW[m.atoms[j].symbol] ?? 1.7))
      pairs.push({ i, j, d0 })
    }
  return { n, bonds, angles, impropers, torsions, pairs }
}

/** Deterministic pseudo-direction for coincident atoms. */
function pseudoDir(i: number, j: number): Vec3 {
  const s = Math.sin((i + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453
  const t = Math.sin((i + 1) * 39.346 + (j + 1) * 11.135) * 24634.6345
  const a = (s - Math.floor(s)) * 2 * Math.PI
  const z = (t - Math.floor(t)) * 2 - 1
  const r = Math.sqrt(1 - z * z)
  return [r * Math.cos(a), r * Math.sin(a), z]
}

/** Energy, gradient and a Gauss-Newton diagonal curvature estimate (per atom). */
function evaluate(S: System, x: Float64Array, g: Float64Array, h: Float64Array): number {
  g.fill(0)
  h.fill(0)
  let E = 0

  for (const t of S.bonds) {
    const i3 = t.i * 3, j3 = t.j * 3
    let dx = x[i3] - x[j3], dy = x[i3 + 1] - x[j3 + 1], dz = x[i3 + 2] - x[j3 + 2]
    let r = Math.hypot(dx, dy, dz)
    if (r < 1e-9) { const u = pseudoDir(t.i, t.j); dx = u[0]; dy = u[1]; dz = u[2]; r = 0 } else { dx /= r; dy /= r; dz /= r }
    const d = r - t.r0
    E += 0.5 * KB * d * d
    const c = KB * d
    g[i3] += c * dx; g[i3 + 1] += c * dy; g[i3 + 2] += c * dz
    g[j3] -= c * dx; g[j3 + 1] -= c * dy; g[j3 + 2] -= c * dz
    h[t.i] += KB
    h[t.j] += KB
  }

  for (const t of S.angles) {
    const i3 = t.i * 3, c3 = t.c * 3, k3 = t.k * 3
    const ux = x[i3] - x[c3], uy = x[i3 + 1] - x[c3 + 1], uz = x[i3 + 2] - x[c3 + 2]
    const vx = x[k3] - x[c3], vy = x[k3 + 1] - x[c3 + 1], vz = x[k3 + 2] - x[c3 + 2]
    const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz)
    if (lu < 1e-9 || lv < 1e-9) continue
    const cs = Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / (lu * lv)))
    let dEdc: number
    if (t.linear) {
      E += KA * (1 + cs)
      dEdc = KA
    } else {
      const th = Math.acos(cs)
      const d = th - t.theta0
      E += 0.5 * KA * d * d
      dEdc = (-KA * d) / Math.max(Math.sin(th), 1e-3)
    }
    // d cos / d u and d cos / d v
    const a1 = 1 / (lu * lv), a2 = cs / (lu * lu), a3 = cs / (lv * lv)
    const gix = dEdc * (vx * a1 - ux * a2), giy = dEdc * (vy * a1 - uy * a2), giz = dEdc * (vz * a1 - uz * a2)
    const gkx = dEdc * (ux * a1 - vx * a3), gky = dEdc * (uy * a1 - vy * a3), gkz = dEdc * (uz * a1 - vz * a3)
    g[i3] += gix; g[i3 + 1] += giy; g[i3 + 2] += giz
    g[k3] += gkx; g[k3 + 1] += gky; g[k3 + 2] += gkz
    g[c3] -= gix + gkx; g[c3 + 1] -= giy + gky; g[c3 + 2] -= giz + gkz
    h[t.i] += KA / (lu * lu)
    h[t.k] += KA / (lv * lv)
    h[t.c] += KA * (1 / (lu * lu) + 1 / (lv * lv))
  }

  for (const t of S.impropers) {
    const c3 = t.c * 3, a3 = t.a * 3, b3 = t.b * 3, d3 = t.d * 3
    const ux = x[a3] - x[c3], uy = x[a3 + 1] - x[c3 + 1], uz = x[a3 + 2] - x[c3 + 2]
    const vx = x[b3] - x[c3], vy = x[b3 + 1] - x[c3 + 1], vz = x[b3 + 2] - x[c3 + 2]
    const wx = x[d3] - x[c3], wy = x[d3 + 1] - x[c3 + 1], wz = x[d3 + 2] - x[c3 + 2]
    // T = u . (v x w)
    const vwx = vy * wz - vz * wy, vwy = vz * wx - vx * wz, vwz = vx * wy - vy * wx
    const T = ux * vwx + uy * vwy + uz * vwz
    E += 0.5 * KI * T * T
    const wux = wy * uz - wz * uy, wuy = wz * ux - wx * uz, wuz = wx * uy - wy * ux
    const uvx = uy * vz - uz * vy, uvy = uz * vx - ux * vz, uvz = ux * vy - uy * vx
    const f = KI * T
    g[a3] += f * vwx; g[a3 + 1] += f * vwy; g[a3 + 2] += f * vwz
    g[b3] += f * wux; g[b3 + 1] += f * wuy; g[b3 + 2] += f * wuz
    g[d3] += f * uvx; g[d3 + 1] += f * uvy; g[d3 + 2] += f * uvz
    g[c3] -= f * (vwx + wux + uvx); g[c3 + 1] -= f * (vwy + wuy + uvy); g[c3 + 2] -= f * (vwz + wuz + uvz)
    const na = vwx * vwx + vwy * vwy + vwz * vwz
    const nb = wux * wux + wuy * wuy + wuz * wuz
    const nd = uvx * uvx + uvy * uvy + uvz * uvz
    const sx = vwx + wux + uvx, sy = vwy + wuy + uvy, sz = vwz + wuz + uvz
    h[t.a] += KI * na
    h[t.b] += KI * nb
    h[t.d] += KI * nd
    h[t.c] += KI * (sx * sx + sy * sy + sz * sz)
  }

  for (const t of S.torsions) {
    const i3 = t.i * 3, j3 = t.j * 3, k3 = t.k * 3, l3 = t.l * 3
    const ax = x[j3] - x[i3], ay = x[j3 + 1] - x[i3 + 1], az = x[j3 + 2] - x[i3 + 2]
    const bx = x[k3] - x[j3], by = x[k3 + 1] - x[j3 + 1], bz = x[k3 + 2] - x[j3 + 2]
    const cx = x[l3] - x[k3], cy = x[l3 + 1] - x[k3 + 1], cz = x[l3 + 2] - x[k3 + 2]
    const bcx = by * cz - bz * cy, bcy = bz * cx - bx * cz, bcz = bx * cy - by * cx
    const cax = cy * az - cz * ay, cay = cz * ax - cx * az, caz = cx * ay - cy * ax
    const abx = ay * bz - az * by, aby = az * bx - ax * bz, abz = ax * by - ay * bx
    const T = ax * bcx + ay * bcy + az * bcz
    E += 0.5 * KT * T * T
    const f = KT * T
    // dT/dxi = -bc ; dT/dxj = bc - ca ; dT/dxk = ca - ab ; dT/dxl = ab
    g[i3] -= f * bcx; g[i3 + 1] -= f * bcy; g[i3 + 2] -= f * bcz
    g[j3] += f * (bcx - cax); g[j3 + 1] += f * (bcy - cay); g[j3 + 2] += f * (bcz - caz)
    g[k3] += f * (cax - abx); g[k3 + 1] += f * (cay - aby); g[k3 + 2] += f * (caz - abz)
    g[l3] += f * abx; g[l3 + 1] += f * aby; g[l3 + 2] += f * abz
    h[t.i] += KT * (bcx * bcx + bcy * bcy + bcz * bcz)
    h[t.j] += KT * ((bcx - cax) ** 2 + (bcy - cay) ** 2 + (bcz - caz) ** 2)
    h[t.k] += KT * ((cax - abx) ** 2 + (cay - aby) ** 2 + (caz - abz) ** 2)
    h[t.l] += KT * (abx * abx + aby * aby + abz * abz)
  }

  for (const t of S.pairs) {
    const i3 = t.i * 3, j3 = t.j * 3
    let dx = x[i3] - x[j3]
    if (dx > t.d0 || dx < -t.d0) continue
    let dy = x[i3 + 1] - x[j3 + 1]
    if (dy > t.d0 || dy < -t.d0) continue
    let dz = x[i3 + 2] - x[j3 + 2]
    if (dz > t.d0 || dz < -t.d0) continue
    let r = Math.hypot(dx, dy, dz)
    if (r >= t.d0) continue
    if (r < 1e-9) { const u = pseudoDir(t.i, t.j); dx = u[0]; dy = u[1]; dz = u[2]; r = 0 } else { dx /= r; dy /= r; dz /= r }
    const d = t.d0 - r
    E += 0.5 * KN * d * d
    const c = -KN * d
    g[i3] += c * dx; g[i3 + 1] += c * dy; g[i3 + 2] += c * dz
    g[j3] -= c * dx; g[j3 + 1] -= c * dy; g[j3 + 2] -= c * dz
    h[t.i] += KN
    h[t.j] += KN
  }
  return E
}

/** Persistent L-BFGS memory, keyed by the molecule object a previous call returned (pure performance cache). */
interface Memory { x: Float64Array; s: Float64Array[]; y: Float64Array[]; rho: number[] }
const MEMORY = new WeakMap<Molecule, Memory>()
const HISTORY = 8

/**
 * Relax the geometry with up to `steps` L-BFGS iterations (Jacobi-preconditioned, Armijo line search).
 * - the energy never increases (a step that would raise it is shrunk or rejected); no NaN/Infinity ever escapes;
 * - per-iteration displacement is capped at 0.25 Å;
 * - `energy` is an indicative force-field value (arbitrary units, lower is better);
 * - `maxForce` is the largest force on any atom (same units per Å): already relaxed molecules report ~0 and a
 *   caller can stop once it drops below ~0.01.
 * Repeated calls that pass back the molecule returned by the previous call continue with the same curvature memory,
 * so an animated clean-up (a few steps per frame) converges like one long run.
 */
export function relaxStep(m: Molecule, steps: number): { mol: Molecule; energy: number; maxForce: number } {
  const n = m.atoms.length
  if (n < 2 || !(steps >= 1)) return { mol: m, energy: 0, maxForce: 0 }
  let x = new Float64Array(n * 3)
  m.atoms.forEach((a, i) => { x[i * 3] = a.pos[0]; x[i * 3 + 1] = a.pos[1]; x[i * 3 + 2] = a.pos[2] })
  if (!x.every(Number.isFinite)) return { mol: m, energy: 0, maxForce: 0 }

  const S = buildSystem(m, x)
  let g = new Float64Array(n * 3), h = new Float64Array(n)
  let xt = new Float64Array(n * 3), gt = new Float64Array(n * 3), ht = new Float64Array(n)
  let E = evaluate(S, x, g, h)
  if (!Number.isFinite(E)) return { mol: m, energy: 0, maxForce: 0 }

  const prev = MEMORY.get(m)
  const mem: Memory = prev && prev.x.length === x.length && prev.x.every((v, i) => v === x[i])
    ? { x, s: prev.s.slice(), y: prev.y.slice(), rho: prev.rho.slice() }
    : { x, s: [], y: [], rho: [] }

  const maxForceOf = () => {
    let mf = 0
    for (let i = 0; i < n * 3; i += 3) {
      const f = Math.hypot(g[i], g[i + 1], g[i + 2])
      if (f > mf) mf = f
    }
    return mf
  }
  const dir = new Float64Array(n * 3)
  const q = new Float64Array(n * 3)
  const total = Math.min(Math.floor(steps), 5000)
  for (let it = 0; it < total; it++) {
    if (maxForceOf() < 1e-4) break
    let accepted = false
    for (let retry = 0; retry < 2 && !accepted; retry++) {
      // two-loop recursion with a diagonal (Gauss-Newton) initial Hessian
      q.set(g)
      const hist = mem.s.length
      const alpha = new Array<number>(hist)
      for (let k = hist - 1; k >= 0; k--) {
        let d = 0
        for (let i = 0; i < q.length; i++) d += mem.s[k][i] * q[i]
        alpha[k] = mem.rho[k] * d
        for (let i = 0; i < q.length; i++) q[i] -= alpha[k] * mem.y[k][i]
      }
      for (let i = 0; i < n; i++) { const inv = 1 / Math.max(h[i], 1); q[i * 3] *= inv; q[i * 3 + 1] *= inv; q[i * 3 + 2] *= inv }
      for (let k = 0; k < hist; k++) {
        let d = 0
        for (let i = 0; i < q.length; i++) d += mem.y[k][i] * q[i]
        const beta = mem.rho[k] * d
        for (let i = 0; i < q.length; i++) q[i] += mem.s[k][i] * (alpha[k] - beta)
      }
      let gd = 0
      for (let i = 0; i < q.length; i++) { dir[i] = -q[i]; gd += g[i] * dir[i] }
      if (!(gd < 0)) {
        mem.s.length = 0; mem.y.length = 0; mem.rho.length = 0
        gd = 0
        for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { dir[i * 3 + c] = -g[i * 3 + c] / Math.max(h[i], 1); gd += g[i * 3 + c] * dir[i * 3 + c] }
        if (!(gd < 0)) break
      }
      let big = 0
      for (let i = 0; i < n; i++) big = Math.max(big, Math.hypot(dir[i * 3], dir[i * 3 + 1], dir[i * 3 + 2]))
      let t = big > MAX_DISP ? MAX_DISP / big : 1
      for (let ls = 0; ls < 12; ls++) {
        for (let i = 0; i < x.length; i++) xt[i] = x[i] + t * dir[i]
        const Et = evaluate(S, xt, gt, ht)
        if (Number.isFinite(Et) && Et <= E + 1e-4 * t * gd + 1e-12 * Math.abs(E)) {
          const sv = new Float64Array(x.length), yv = new Float64Array(x.length)
          let sy = 0
          for (let i = 0; i < x.length; i++) { sv[i] = xt[i] - x[i]; yv[i] = gt[i] - g[i]; sy += sv[i] * yv[i] }
          if (sy > 1e-12) {
            mem.s.push(sv); mem.y.push(yv); mem.rho.push(1 / sy)
            if (mem.s.length > HISTORY) { mem.s.shift(); mem.y.shift(); mem.rho.shift() }
          }
          ;[x, xt] = [xt, x]
          ;[g, gt] = [gt, g]
          ;[h, ht] = [ht, h]
          E = Et
          accepted = true
          break
        }
        // quadratic interpolation for the next trial, safeguarded
        const denom = 2 * (Et - E - gd * t)
        const tq = Number.isFinite(denom) && denom > 0 ? (-gd * t * t) / denom : t * 0.5
        t = Math.min(0.5 * t, Math.max(0.05 * t, tq))
      }
      if (!accepted) { mem.s.length = 0; mem.y.length = 0; mem.rho.length = 0 }
    }
    if (!accepted) break
  }

  const out = cloneMolecule(m)
  out.atoms.forEach((a, i) => { a.pos = [x[i * 3], x[i * 3 + 1], x[i * 3 + 2]] })
  mem.x = x
  MEMORY.set(out, mem)
  return { mol: out, energy: E, maxForce: maxForceOf() }
}

// ===================================================================================================================
// Centering
// ===================================================================================================================

/** Translate the molecule so its centroid is at the origin. */
export function centerMolecule(m: Molecule): Molecule {
  const out = cloneMolecule(m)
  const c = centroid(out)
  for (const a of out.atoms) a.pos = sub(a.pos, c)
  return out
}
