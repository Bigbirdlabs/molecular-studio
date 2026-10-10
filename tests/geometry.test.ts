import { describe, expect, it } from 'vitest'
import {
  type Molecule, type Vec3,
  add, angleDeg, atomById, bondBetween, cloneMolecule, dihedralDeg, dist, emptyMolecule, formula, methane, neighbours,
  norm, scale, sub, valenceState, valenceUsed, idealBondLength,
} from '../src/chem/molecule'
import {
  addAllHydrogens, adjustHydrogens, bondTargetLength, centerMolecule, placeNewAtom, relaxStep, removeAllHydrogens,
} from '../src/chem/geometry'

// ---------- helpers that mimic what the store does ----------
function lone(symbol: string): Molecule {
  const m = emptyMolecule('t')
  const id = m.nextId++
  m.atoms.push({ id, symbol, pos: [0, 0, 0], charge: 0 })
  return adjustHydrogens(m, [id])
}
/** Add `symbol` to `parentId` like the store's growFrom (re-using a hydrogen position when there is one). */
function grow(m0: Molecule, parentId: number, symbol: string, order: 1 | 2 | 3 = 1): { m: Molecule; id: number } {
  const m = cloneMolecule(m0)
  const parent = atomById(m, parentId)!
  const h = neighbours(m, parentId).find((n) => n.atom.symbol === 'H' && neighbours(m, n.atom.id).length === 1)
  let pos: Vec3
  if (h) {
    pos = h.atom.pos
    m.atoms = m.atoms.filter((a) => a.id !== h.atom.id)
    m.bonds = m.bonds.filter((b) => b.id !== h.bond.id)
    pos = add(parent.pos, scale(norm(sub(pos, parent.pos)), idealBondLength(parent.symbol, symbol, order)))
  } else pos = placeNewAtom(m, parentId, symbol, order)
  const id = m.nextId++
  m.atoms.push({ id, symbol, pos, charge: 0 })
  m.bonds.push({ id: m.nextId++, a: parentId, b: id, order })
  return { m: adjustHydrogens(m, [parentId, id]), id }
}
const f = (m: Molecule) => formula(m, false)
const heavy = (m: Molecule) => m.atoms.filter((a) => a.symbol !== 'H')
const angle = (m: Molecule, a: number, c: number, b: number) => angleDeg(atomById(m, a)!.pos, atomById(m, c)!.pos, atomById(m, b)!.pos)
const len = (m: Molecule, a: number, b: number) => dist(atomById(m, a)!.pos, atomById(m, b)!.pos)
const hOf = (m: Molecule, id: number) => neighbours(m, id).filter((n) => n.atom.symbol === 'H').map((n) => n.atom.id)
function minDistance(m: Molecule) {
  let best = Infinity
  for (let i = 0; i < m.atoms.length; i++) for (let j = i + 1; j < m.atoms.length; j++) best = Math.min(best, dist(m.atoms[i].pos, m.atoms[j].pos))
  return best
}
/** max distance of any atom from the best-fit plane through the first three non-collinear atoms */
function outOfPlane(m: Molecule): number {
  const p = m.atoms.map((a) => a.pos)
  const a = p[0]
  let n: Vec3 = [0, 0, 0]
  for (let i = 1; i < p.length && Math.hypot(...n) < 1e-3; i++)
    for (let j = i + 1; j < p.length; j++) {
      const u = sub(p[i], a), v = sub(p[j], a)
      n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      if (Math.hypot(...n) > 1e-3) break
    }
  n = norm(n)
  return Math.max(...p.map((q) => Math.abs((q[0] - a[0]) * n[0] + (q[1] - a[1]) * n[1] + (q[2] - a[2]) * n[2])))
}
function hasNaN(m: Molecule) { return m.atoms.some((a) => a.pos.some((c) => !Number.isFinite(c))) }
/** deterministic pseudo-random in [-1, 1] */
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 0xffffffff) * 2 - 1 } }
function jitter(m: Molecule, amp: number, seed: number): Molecule {
  const r = rng(seed)
  const out = cloneMolecule(m)
  for (const a of out.atoms) a.pos = [a.pos[0] + r() * amp, a.pos[1] + r() * amp, a.pos[2] + r() * amp]
  return out
}
function bondDeviation(m: Molecule): number {
  let worst = 0
  for (const b of m.bonds) {
    const A = atomById(m, b.a)!, B = atomById(m, b.b)!
    worst = Math.max(worst, Math.abs(dist(A.pos, B.pos) - bondTargetLength(A.symbol, B.symbol, b.order, !!b.aromatic)))
  }
  return worst
}

// ---------- molecule builders ----------
function ethanol(): Molecule {
  let { m, id: c1 } = grow(lone('C'), 1, 'C')
  const g1 = grow(m, c1, 'O')
  return g1.m
}
function benzene(): Molecule {
  const m = emptyMolecule('benzen')
  const ids: number[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    const id = m.nextId++
    m.atoms.push({ id, symbol: 'C', pos: [1.39 * Math.cos(a), 1.39 * Math.sin(a), 0], charge: 0 })
    ids.push(id)
  }
  for (let i = 0; i < 6; i++) m.bonds.push({ id: m.nextId++, a: ids[i], b: ids[(i + 1) % 6], order: (i % 2 ? 2 : 1) as 1 | 2, aromatic: true })
  return addAllHydrogens(m)
}
/** caffeine skeleton (heavy atoms only, ideal planar coordinates are NOT needed: relax builds them) */
function caffeineLike(): Molecule {
  // purine-2,6-dione core with three methyls, hand-placed on a rough grid, hydrogens added afterwards
  const m = emptyMolecule('kafein')
  const A = (symbol: string, x: number, y: number) => { const id = m.nextId++; m.atoms.push({ id, symbol, pos: [x, y, 0], charge: 0 }); return id }
  const B = (a: number, b: number, order: 1 | 2 = 1, aromatic = false) => m.bonds.push({ id: m.nextId++, a, b, order, aromatic })
  const n1 = A('N', 0, 0), c2 = A('C', 1.3, 0.75), n3 = A('N', 2.6, 0), c4 = A('C', 2.6, -1.5), c5 = A('C', 1.3, -2.25), c6 = A('C', 0, -1.5)
  const n7 = A('N', 1.5, -3.6), c8 = A('C', 2.9, -3.7), n9 = A('N', 3.4, -2.4)
  const o2 = A('O', 1.3, 2.1), o6 = A('O', -1.2, -2.2)
  const me1 = A('C', -1.2, 0.7), me3 = A('C', 3.8, 0.7), me7 = A('C', 0.5, -4.7)
  B(n1, c2); B(c2, n3); B(n3, c4); B(c4, c5, 2); B(c5, c6); B(c6, n1); B(c5, n7); B(n7, c8); B(c8, n9, 2); B(n9, c4)
  B(c2, o2, 2); B(c6, o6, 2); B(n1, me1); B(n3, me3); B(n7, me7)
  return addAllHydrogens(m)
}

// =====================================================================================================================
describe('hydrogens and VSEPR placement', () => {
  it('a lone carbon becomes a regular tetrahedron (CH4)', () => {
    const m = lone('C')
    expect(f(m)).toBe('CH4')
    const hs = hOf(m, 1)
    expect(hs).toHaveLength(4)
    for (let i = 0; i < 4; i++) {
      expect(len(m, 1, hs[i])).toBeCloseTo(1.09, 2)
      for (let j = i + 1; j < 4; j++) expect(angle(m, hs[i], 1, hs[j])).toBeCloseTo(109.47, 1)
    }
  })

  it('methane in the library form is already a fixed point of adjustHydrogens', () => {
    const m = methane()
    const out = adjustHydrogens(m, [1])
    expect(out.atoms.map((a) => a.pos)).toEqual(m.atoms.map((a) => a.pos))
    expect(out.atoms).toHaveLength(5)
  })

  it('methane + a carbon in place of a hydrogen gives ethane C2H6 with staggered hydrogens', () => {
    const { m, id } = grow(methane(), 1, 'C')
    expect(f(m)).toBe('C2H6')
    expect(len(m, 1, id)).toBeCloseTo(1.54, 1)
    for (const b of m.bonds.filter((x) => x.a === 1 || x.b === 1)) if (b.order === 1) {
      const other = b.a === 1 ? b.b : b.a
      if (atomById(m, other)!.symbol === 'H') expect(Math.abs(len(m, 1, other) - 1.09)).toBeLessThan(0.05)
    }
    expect(minDistance(m)).toBeGreaterThan(0.8)
    const h1 = hOf(m, 1)[0]
    for (const h2 of hOf(m, id)) {
      const d = Math.abs(dihedralDeg(atomById(m, h1)!.pos, atomById(m, 1)!.pos, atomById(m, id)!.pos, atomById(m, h2)!.pos))
      expect([60, 180].some((t) => Math.abs(d - t) < 8)).toBe(true)
    }
    for (const c of [1, id]) {
      const hs = hOf(m, c)
      expect(angle(m, hs[0], c, hs[1])).toBeCloseTo(109.47, 0)
    }
  })

  it('two carbons from scratch via placeNewAtom give C2H6 with C-C 1.54 and C-H 1.09', () => {
    const m0 = emptyMolecule('t')
    m0.atoms.push({ id: 1, symbol: 'C', pos: [0, 0, 0], charge: 0 })
    m0.nextId = 2
    const id = m0.nextId++
    m0.atoms.push({ id, symbol: 'C', pos: placeNewAtom(m0, 1, 'C', 1), charge: 0 })
    m0.bonds.push({ id: m0.nextId++, a: 1, b: id, order: 1 })
    const m = adjustHydrogens(m0, [1, id])
    expect(f(m)).toBe('C2H6')
    expect(Math.abs(len(m, 1, id) - 1.54)).toBeLessThan(0.05)
    for (const c of [1, id]) for (const h of hOf(m, c)) expect(Math.abs(len(m, c, h) - 1.09)).toBeLessThan(0.05)
    expect(minDistance(m)).toBeGreaterThan(0.8)
    for (const c of [1, id]) for (const h of hOf(m, c)) expect(angle(m, h, c, c === 1 ? id : 1)).toBeCloseTo(109.47, 0)
  })

  it('chain growth is a staggered zig-zag (butane carbon backbone anti)', () => {
    let { m, id: c2 } = grow(lone('C'), 1, 'C')
    const g3 = grow(m, c2, 'C')
    const g4 = grow(g3.m, g3.id, 'C')
    expect(f(g4.m)).toBe('C4H10')
    const d = Math.abs(dihedralDeg(atomById(g4.m, 1)!.pos, atomById(g4.m, c2)!.pos, atomById(g4.m, g3.id)!.pos, atomById(g4.m, g4.id)!.pos))
    expect(Math.abs(d - 180)).toBeLessThan(10)
    expect(angle(g4.m, 1, c2, g3.id)).toBeCloseTo(109.47, 0)
  })

  it('ethane + double bond -> ethylene: planar, C=C 1.34, H-C-H ~117-122', () => {
    let { m, id } = grow(lone('C'), 1, 'C')
    m = cloneMolecule(m)
    bondBetween(m, 1, id)!.order = 2
    m = adjustHydrogens(m, [1, id])
    expect(f(m)).toBe('C2H4')
    expect(m.atoms).toHaveLength(6)
    expect(Math.abs(len(m, 1, id) - 1.34)).toBeLessThan(0.05)
    expect(outOfPlane(m)).toBeLessThan(0.1)
    for (const c of [1, id]) {
      const hs = hOf(m, c)
      expect(hs).toHaveLength(2)
      const a = angle(m, hs[0], c, hs[1])
      expect(a).toBeGreaterThan(116)
      expect(a).toBeLessThan(123)
      expect(valenceState(m, atomById(m, c)!)).toBe('ok')
    }
  })

  it('adjustHydrogens removes hydrogens when the bond order increases and restores them when it drops', () => {
    let { m, id } = grow(lone('C'), 1, 'C')
    expect(m.atoms.filter((a) => a.symbol === 'H')).toHaveLength(6)
    m = cloneMolecule(m)
    bondBetween(m, 1, id)!.order = 2
    m = adjustHydrogens(m, [1, id])
    expect(m.atoms.filter((a) => a.symbol === 'H')).toHaveLength(4)
    bondBetween(m, 1, id)!.order = 3
    m = adjustHydrogens(m, [1, id])
    expect(m.atoms.filter((a) => a.symbol === 'H')).toHaveLength(2)
    bondBetween(m, 1, id)!.order = 1
    m = adjustHydrogens(m, [1, id])
    expect(m.atoms.filter((a) => a.symbol === 'H')).toHaveLength(6)
    expect(f(m)).toBe('C2H6')
    for (const c of [1, id]) {
      const hs = hOf(m, c)
      for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) expect(angle(m, hs[i], c, hs[j])).toBeGreaterThan(105)
    }
    expect(Math.abs(len(m, 1, id) - 1.54)).toBeLessThan(0.05)
  })

  it('ethane + triple bond -> acetylene: linear H-C-C 180, C#C 1.20', () => {
    let { m, id } = grow(lone('C'), 1, 'C')
    m = cloneMolecule(m)
    bondBetween(m, 1, id)!.order = 3
    m = adjustHydrogens(m, [1, id])
    expect(f(m)).toBe('C2H2')
    expect(Math.abs(len(m, 1, id) - 1.2)).toBeLessThan(0.05)
    const h1 = hOf(m, 1)[0], h2 = hOf(m, id)[0]
    expect(angle(m, h1, 1, id)).toBeGreaterThan(177)
    expect(angle(m, 1, id, h2)).toBeGreaterThan(177)
  })

  it('water: O-H 0.96, H-O-H 104.5 ; ammonia: N-H 1.01, H-N-H ~107', () => {
    const w = lone('O')
    expect(f(w)).toBe('H2O')
    const hs = hOf(w, 1)
    expect(angle(w, hs[0], 1, hs[1])).toBeCloseTo(104.5, 0)
    expect(len(w, 1, hs[0])).toBeCloseTo(0.96, 2)
    const n = lone('N')
    expect(f(n)).toBe('H3N')
    const nh = hOf(n, 1)
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(angle(n, nh[i], 1, nh[j])).toBeCloseTo(107, 0)
    expect(len(n, 1, nh[0])).toBeCloseTo(1.01, 2)
  })

  it('heteroatoms on ethane: O gets 1 H, N gets 2 H, Cl gets none', () => {
    const { m: ethane, id: c2 } = grow(lone('C'), 1, 'C')
    const o = grow(ethane, c2, 'O')
    expect(f(o.m)).toBe('C2H6O')
    expect(hOf(o.m, o.id)).toHaveLength(1)
    const oh = hOf(o.m, o.id)[0]
    expect(Math.abs(len(o.m, o.id, oh) - 0.96)).toBeLessThan(0.05)
    expect(Math.abs(len(o.m, c2, o.id) - 1.43)).toBeLessThan(0.05)
    const coh = angle(o.m, c2, o.id, oh)
    expect(coh).toBeGreaterThan(103)
    expect(coh).toBeLessThan(111)
    const n = grow(ethane, c2, 'N')
    expect(hOf(n.m, n.id)).toHaveLength(2)
    expect(f(n.m)).toBe('C2H7N')
    const cl = grow(ethane, c2, 'Cl')
    expect(hOf(cl.m, cl.id)).toHaveLength(0)
    expect(f(cl.m)).toBe('C2H5Cl')
    for (const mm of [o.m, n.m, cl.m]) expect(minDistance(mm)).toBeGreaterThan(0.8)
  })

  it('formaldehyde (C=O on CH4) is planar with H-C-H ~116-122', () => {
    const { m, id } = grow(lone('C'), 1, 'O', 2)
    expect(f(m)).toBe('CH2O')
    expect(outOfPlane(m)).toBeLessThan(0.1)
    const hs = hOf(m, 1)
    expect(angle(m, hs[0], 1, hs[1])).toBeGreaterThan(114)
    expect(Math.abs(len(m, 1, id) - 1.21)).toBeLessThan(0.05)
  })

  it('CO2 is linear, BF3 trigonal planar, SF6 octahedral, NH4+ tetrahedral', () => {
    const co2 = emptyMolecule('co2')
    co2.atoms.push({ id: 1, symbol: 'C', pos: [0, 0, 0], charge: 0 })
    co2.nextId = 2
    let m = co2
    for (let i = 0; i < 2; i++) {
      m = cloneMolecule(m)
      const id = m.nextId++
      m.atoms.push({ id, symbol: 'O', pos: placeNewAtom(m, 1, 'O', 2), charge: 0 })
      m.bonds.push({ id: m.nextId++, a: 1, b: id, order: 2 })
    }
    expect(f(m)).toBe('CO2')
    const os = m.atoms.filter((a) => a.symbol === 'O').map((a) => a.id)
    expect(angle(m, os[0], 1, os[1])).toBeGreaterThan(178)

    let bf = lone('B')
    expect(f(bf)).toBe('BH3')
    bf = emptyMolecule('bf3')
    bf.atoms.push({ id: 1, symbol: 'B', pos: [0, 0, 0], charge: 0 })
    bf.nextId = 2
    for (let i = 0; i < 3; i++) {
      bf = cloneMolecule(bf)
      const id = bf.nextId++
      bf.atoms.push({ id, symbol: 'F', pos: placeNewAtom(bf, 1, 'F', 1), charge: 0 })
      bf.bonds.push({ id: bf.nextId++, a: 1, b: id, order: 1 })
    }
    expect(f(bf)).toBe('BF3')
    const fs = bf.atoms.filter((a) => a.symbol === 'F').map((a) => a.id)
    for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) expect(angle(bf, fs[a], 1, fs[b])).toBeCloseTo(120, 0)
    expect(outOfPlane(bf)).toBeLessThan(0.05)

    // SF6: ideal octahedron stays an octahedron under relaxation, and a jittered one returns to it
    let sf = emptyMolecule('sf6')
    sf.atoms.push({ id: 1, symbol: 'S', pos: [0, 0, 0], charge: 0 })
    sf.nextId = 2
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const id = sf.nextId++
      sf.atoms.push({ id, symbol: 'F', pos: scale(d as Vec3, 1.58), charge: 0 })
      sf.bonds.push({ id: sf.nextId++, a: 1, b: id, order: 1 })
    }
    const octAngles = (mm: Molecule) => {
      const fl = mm.atoms.filter((a) => a.symbol === 'F').map((a) => a.id)
      const out: number[] = []
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) out.push(angle(mm, fl[i], 1, fl[j]))
      return out
    }
    expect(octAngles(relaxStep(sf, 50).mol).filter((a) => Math.abs(a - 90) < 1)).toHaveLength(12)
    const back = relaxStep(jitter(sf, 0.3, 4), 400).mol
    expect(octAngles(back).filter((a) => Math.abs(a - 90) < 4)).toHaveLength(12)
    expect(octAngles(back).filter((a) => Math.abs(a - 180) < 4)).toHaveLength(3)

    const nh4 = emptyMolecule('nh4')
    nh4.atoms.push({ id: 1, symbol: 'N', pos: [0, 0, 0], charge: 1 })
    nh4.nextId = 2
    const out = adjustHydrogens(nh4, [1])
    expect(out.atoms).toHaveLength(5)
    const hs = hOf(out, 1)
    expect(angle(out, hs[0], 1, hs[1])).toBeCloseTo(109.47, 1)
  })

  it('addAllHydrogens / removeAllHydrogens round trip on ethanol', () => {
    const e = ethanol()
    expect(f(e)).toBe('C2H6O')
    expect(e.atoms).toHaveLength(9)
    const skeleton = removeAllHydrogens(e)
    expect(f(skeleton)).toBe('C2O')
    expect(skeleton.atoms).toHaveLength(3)
    const back = addAllHydrogens(skeleton)
    expect(f(back)).toBe('C2H6O')
    expect(back.atoms).toHaveLength(9)
    expect(minDistance(back)).toBeGreaterThan(0.8)
    for (const a of back.atoms) expect(valenceState(back, a)).toBe('ok')
  })

  it('benzene skeleton + addAllHydrogens gives planar C6H6 with in-plane hydrogens', () => {
    const b = benzene()
    expect(f(b)).toBe('C6H6')
    expect(outOfPlane(b)).toBeLessThan(0.01)
    for (const c of heavy(b)) for (const h of hOf(b, c.id)) expect(Math.abs(len(b, c.id, h) - 1.09)).toBeLessThan(0.02)
  })

  it('removing a neighbour and re-adjusting restores a tetrahedral centre', () => {
    const e = ethanol()
    const m = cloneMolecule(e)
    const o = m.atoms.find((a) => a.symbol === 'O')!
    const keepIds = new Set(m.atoms.filter((a) => a.id !== o.id && !hOf(m, o.id).includes(a.id)).map((a) => a.id))
    m.atoms = m.atoms.filter((a) => keepIds.has(a.id))
    m.bonds = m.bonds.filter((b) => keepIds.has(b.a) && keepIds.has(b.b))
    const carbons = m.atoms.filter((a) => a.symbol === 'C').map((a) => a.id)
    const out = adjustHydrogens(m, carbons)
    expect(f(out)).toBe('C2H6')
    for (const c of carbons) { const hs = hOf(out, c); expect(hs).toHaveLength(3); expect(angle(out, hs[0], c, hs[1])).toBeCloseTo(109.47, 0) }
  })

  it('does not mutate its input and keeps ids stable', () => {
    const e = ethanol()
    const snap = JSON.stringify(e)
    removeAllHydrogens(e)
    adjustHydrogens(e, e.atoms.map((a) => a.id))
    addAllHydrogens(e)
    relaxStep(e, 10)
    centerMolecule(e)
    expect(JSON.stringify(e)).toBe(snap)
    const r = relaxStep(e, 10).mol
    expect(r.atoms.map((a) => a.id)).toEqual(e.atoms.map((a) => a.id))
    expect(r.id).toBe(e.id)
  })
})

// =====================================================================================================================
describe('relaxStep', () => {
  it('leaves an already ideal molecule essentially unchanged', () => {
    const m = methane()
    const { mol, maxForce, energy } = relaxStep(m, 50)
    expect(maxForce).toBeLessThan(0.01)
    expect(energy).toBeLessThan(0.5)
    m.atoms.forEach((a, i) => expect(dist(a.pos, mol.atoms[i].pos)).toBeLessThan(0.02))
    const e = ethanol()
    const r = relaxStep(e, 100).mol
    e.atoms.forEach((a, i) => expect(dist(a.pos, r.atoms[i].pos)).toBeLessThan(0.15))
  })

  it('repairs a messy molecule: no NaN, energy decreases monotonically, bonds near ideal', () => {
    const ref = ethanol()
    const messy = jitter(ref, 0.5, 11)
    let m = messy
    let last = Infinity
    let first = NaN
    for (let i = 0; i < 40; i++) {
      const r = relaxStep(m, 6)
      expect(hasNaN(r.mol)).toBe(false)
      expect(Number.isFinite(r.energy)).toBe(true)
      expect(r.energy).toBeLessThanOrEqual(last * 1.01 + 1e-9)
      if (i === 0) first = r.energy
      last = r.energy
      m = r.mol
    }
    expect(last).toBeLessThan(first)
    expect(bondDeviation(m)).toBeLessThan(0.06)
    // tetrahedral carbons again
    for (const c of m.atoms.filter((a) => a.symbol === 'C')) {
      const nb = neighbours(m, c.id).map((n) => n.atom.pos)
      for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) expect(Math.abs(angleDeg(nb[i], c.pos, nb[j]) - 109.5)).toBeLessThan(8)
    }
  })

  it('jittered benzene returns to a planar hexagon with aromatic bond lengths', () => {
    const m0 = jitter(benzene(), 0.4, 5)
    const { mol, maxForce } = relaxStep(m0, 800)
    expect(hasNaN(mol)).toBe(false)
    expect(maxForce).toBeLessThan(0.02)
    expect(bondDeviation(mol)).toBeLessThan(0.04)
    expect(outOfPlane(mol)).toBeLessThan(0.1)
    for (const b of mol.bonds.filter((x) => atomById(mol, x.a)!.symbol === 'C' && atomById(mol, x.b)!.symbol === 'C'))
      expect(Math.abs(len(mol, b.a, b.b) - 1.39)).toBeLessThan(0.04)
  })

  it('jittered ethylene stays planar after relaxation (including the twist about C=C)', () => {
    let { m, id } = grow(lone('C'), 1, 'C')
    m = cloneMolecule(m)
    bondBetween(m, 1, id)!.order = 2
    m = adjustHydrogens(m, [1, id])
    const r = relaxStep(jitter(m, 0.4, 3), 600).mol
    expect(outOfPlane(r)).toBeLessThan(0.06)
    expect(Math.abs(len(r, 1, id) - 1.34)).toBeLessThan(0.04)
  })

  it('caffeine-like molecule jittered by 0.5 A relaxes to bond lengths within 0.1 A, quickly and without NaN', () => {
    const base = caffeineLike()
    expect(base.atoms.length).toBeGreaterThan(20)
    const m0 = jitter(base, 0.5, 21)
    let m = m0
    let energyBefore = relaxStep(m0, 1).energy
    const t0 = performance.now()
    let frames = 0
    for (; frames < 240; frames++) {
      const r = relaxStep(m, 6)
      m = r.mol
      if (r.maxForce <= 0.01) break
    }
    const ms = performance.now() - t0
    expect(hasNaN(m)).toBe(false)
    expect(bondDeviation(m)).toBeLessThan(0.1)
    expect(relaxStep(m, 1).energy).toBeLessThan(energyBefore)
    expect(frames).toBeLessThan(240)
    expect(ms).toBeLessThan(4000)
    expect(minDistance(m)).toBeGreaterThan(0.8)
    // the fused aromatic core ends up flat (heavy atoms only)
    const core = { ...m, atoms: m.atoms.filter((a) => a.symbol !== 'H' && ['N', 'C', 'O'].includes(a.symbol)).slice(0, 9) } as Molecule
    expect(outOfPlane(core)).toBeLessThan(0.25)
  })

  it('1000-style robustness: random jitter up to 1 A never gives NaN and never moves an atom more than 0.5 A per step', () => {
    const bases = [ethanol(), benzene(), caffeineLike(), methane()]
    let trials = 0
    for (const base of bases)
      for (let seed = 1; seed <= 12; seed++) {
        const m0 = jitter(base, 1.0, seed * 7 + trials)
        const r = relaxStep(m0, 1)
        expect(hasNaN(r.mol)).toBe(false)
        m0.atoms.forEach((a, i) => expect(dist(a.pos, r.mol.atoms[i].pos)).toBeLessThanOrEqual(0.5))
        const r2 = relaxStep(m0, 60)
        expect(hasNaN(r2.mol)).toBe(false)
        expect(Number.isFinite(r2.energy)).toBe(true)
        trials++
      }
    expect(trials).toBe(48)
  })

  it('overlapping atoms are handled without NaN', () => {
    const m = cloneMolecule(ethanol())
    m.atoms[3].pos = [...m.atoms[4].pos]
    const r = relaxStep(m, 100)
    expect(hasNaN(r.mol)).toBe(false)
    expect(Number.isFinite(r.energy)).toBe(true)
    expect(minDistance(r.mol)).toBeGreaterThan(0.5)
  })

  it('tiny molecules and degenerate input are safe', () => {
    const one = lone('C')
    const single = { ...emptyMolecule('x') }
    expect(relaxStep(single, 5).maxForce).toBe(0)
    expect(hasNaN(relaxStep(one, 5).mol)).toBe(false)
    expect(relaxStep(ethanol(), 0).mol).toBeTruthy()
  })

  it('one relax step on 50 atoms is fast (median under 16 ms) and so is adjustHydrogens', () => {
    let m = lone('C')
    let tip = 1
    for (let i = 0; i < 16; i++) { const g = grow(m, tip, 'C'); m = g.m; tip = g.id }
    expect(m.atoms.length).toBeGreaterThanOrEqual(50)
    const times: number[] = []
    let cur = jitter(m, 0.05, 2)
    for (let i = 0; i < 15; i++) { const t = performance.now(); cur = relaxStep(cur, 1).mol; times.push(performance.now() - t) }
    times.sort((a, b) => a - b)
    expect(times[7]).toBeLessThan(16)
    const t = performance.now()
    adjustHydrogens(m, m.atoms.map((a) => a.id))
    expect(performance.now() - t).toBeLessThan(50)
  })
})

describe('bond lengths and helpers', () => {
  it('reference lengths match textbook values', () => {
    expect(bondTargetLength('C', 'C', 1)).toBe(1.54)
    expect(bondTargetLength('H', 'O', 1)).toBe(0.96)
    expect(bondTargetLength('C', 'C', 1, true)).toBe(1.39)
    expect(bondTargetLength('C', 'O', 2)).toBe(1.21)
    expect(Number.isFinite(bondTargetLength('Si', 'S', 1))).toBe(true)
  })
  it('centerMolecule puts the centroid at the origin', () => {
    const c = centerMolecule(ethanol())
    const s = c.atoms.reduce((acc, a) => add(acc, a.pos), [0, 0, 0] as Vec3)
    expect(Math.hypot(...s)).toBeLessThan(1e-9)
    expect(valenceUsed(c, 1)).toBeGreaterThan(0)
  })
})
