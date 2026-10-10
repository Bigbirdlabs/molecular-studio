import { describe, expect, it } from 'vitest'
import { LIBRARY, CATEGORY_EN, getEntry } from '../src/chem/library'
import {
  angleDeg, atomById, bondLength, centroid, cloneMolecule, connectedComponents, dihedralDeg, dist, formula, idealBondLength,
  molarMass, valenceState,
} from '../src/chem/molecule'

const REQUIRED = [
  'metan', 'su', 'amonyak', 'karbondioksit', 'hidrojen-peroksit', 'bor-triflorur', 'kukurt-heksaflorur', 'etanol', 'metanol',
  'asetik-asit', 'aseton', 'formaldehit', 'etilen', 'asetilen', 'benzen', 'siklohekzan', 'naftalin', 'glikoz', 'glisin', 'ure',
  'adenin', 'kafein', 'aspirin', 'parasetamol', 'ibuprofen', 'nikotin', 'askorbik-asit', 'kolesterol',
]

// Hill formula and average molar mass (g/mol, IUPAC standard weights, +-0.02) of well-known molecules
const EXPECTED: Record<string, [string, number]> = {
  metan: ['CH4', 16.04], su: ['H2O', 18.015], amonyak: ['H3N', 17.031], karbondioksit: ['CO2', 44.009],
  'hidrojen-peroksit': ['H2O2', 34.014], 'bor-triflorur': ['BF3', 67.81], 'kukurt-heksaflorur': ['F6S', 146.055],
  'kukurt-dioksit': ['O2S', 64.06], etanol: ['C2H6O', 46.069], metanol: ['CH4O', 32.042], 'asetik-asit': ['C2H4O2', 60.052],
  aseton: ['C3H6O', 58.08], formaldehit: ['CH2O', 30.026], etilen: ['C2H4', 28.054], asetilen: ['C2H2', 26.038],
  benzen: ['C6H6', 78.114], siklohekzan: ['C6H12', 84.162], naftalin: ['C10H8', 128.174], glikoz: ['C6H12O6', 180.156],
  glisin: ['C2H5NO2', 75.067], ure: ['CH4N2O', 60.056], adenin: ['C5H5N5', 135.13], kafein: ['C8H10N4O2', 194.19],
  aspirin: ['C9H8O4', 180.157], parasetamol: ['C8H9NO2', 151.165], ibuprofen: ['C13H18O2', 206.28], nikotin: ['C10H14N2', 162.23],
  'askorbik-asit': ['C6H8O6', 176.124], kolesterol: ['C27H46O', 386.65], sukroz: ['C12H22O11', 342.297],
  'vitamin-e': ['C29H50O2', 430.71], tristearin: ['C57H110O6', 891.5], morfin: ['C17H19NO3', 285.34],
  'penisilin-g': ['C16H18N2O4S', 334.39], 'sulfurik-asit': ['H2O4S', 98.07], 'fosforik-asit': ['H3O4P', 97.99],
}

const at = (e: (typeof LIBRARY)[number], i: number) => e.molecule.atoms[i - 1].pos
const firstOf = (e: (typeof LIBRARY)[number], symbol: string) => e.molecule.atoms.find((a) => a.symbol === symbol)!

describe('library: catalogue', () => {
  it('has at least 40 entries in at least 7 categories', () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(40)
    expect(new Set(LIBRARY.map((e) => e.category)).size).toBeGreaterThanOrEqual(7)
  })

  it('contains every required id, and getEntry resolves them', () => {
    for (const id of REQUIRED) expect(getEntry(id), id).toBeDefined()
    expect(getEntry('metan')?.molecule.atoms.length).toBe(5)
    expect(getEntry('does-not-exist')).toBeUndefined()
  })

  it('has unique, stable, ascii entry ids and unique molecule ids', () => {
    const ids = LIBRARY.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    const mids = LIBRARY.map((e) => e.molecule.id)
    expect(new Set(mids).size).toBe(mids.length)
    for (const e of LIBRARY) expect(e.molecule.id).toBe(`lib-${e.id}`)
  })

  it('has Turkish and English names, descriptions and a category label for every entry', () => {
    for (const e of LIBRARY) {
      expect(e.name.length, e.id).toBeGreaterThan(1)
      expect(e.nameEn.length, e.id).toBeGreaterThan(1)
      expect(e.description.length, e.id).toBeGreaterThan(40)
      expect(e.descriptionEn.length, e.id).toBeGreaterThan(40)
      expect(e.description, e.id).not.toBe(e.descriptionEn)
      expect(CATEGORY_EN[e.category], `${e.id}: ${e.category}`).toBeTruthy()
      expect(e.molecule.name).toBe(e.name)
    }
  })

  it('states the computed Hill formula in both descriptions', () => {
    for (const e of LIBRARY) {
      const f = formula(e.molecule, true)
      expect(e.description, e.id).toContain(f)
      expect(e.descriptionEn, e.id).toContain(f)
    }
  })

  it('includes a >= 70-atom and a >= 100-atom entry', () => {
    const sizes = LIBRARY.map((e) => e.molecule.atoms.length)
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(100)
    expect(sizes.filter((n) => n >= 70).length).toBeGreaterThanOrEqual(2)
  })
})

describe('library: graph integrity', () => {
  it('has valid bond indices, no self/duplicate bonds, unique ids and a consistent id counter', () => {
    for (const e of LIBRARY) {
      const m = e.molecule
      const ids = new Set<number>()
      for (const a of m.atoms) { expect(ids.has(a.id), `${e.id} atom id`).toBe(false); ids.add(a.id) }
      const pairs = new Set<string>()
      for (const b of m.bonds) {
        expect(ids.has(b.id), `${e.id} bond id`).toBe(false); ids.add(b.id)
        expect(atomById(m, b.a), `${e.id} bond ${b.id}.a`).toBeDefined()
        expect(atomById(m, b.b), `${e.id} bond ${b.id}.b`).toBeDefined()
        expect(b.a, e.id).not.toBe(b.b)
        expect([1, 2, 3]).toContain(b.order)
        const key = [b.a, b.b].sort((x, y) => x - y).join('-')
        expect(pairs.has(key), `${e.id} duplicate bond ${key}`).toBe(false); pairs.add(key)
      }
      expect(m.nextId, e.id).toBeGreaterThan(Math.max(...ids))
    }
  })

  it('has a single connected component per molecule', () => {
    for (const e of LIBRARY) expect(connectedComponents(e.molecule).length, e.id).toBe(1)
  })

  it('has finite coordinates, no atom pair closer than 0.7 A, and is centered on its centroid', () => {
    for (const e of LIBRARY) {
      const atoms = e.molecule.atoms
      for (const a of atoms) for (const c of a.pos) expect(Number.isFinite(c), e.id).toBe(true)
      for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
        expect(dist(atoms[i].pos, atoms[j].pos), `${e.id} ${i + 1}-${j + 1}`).toBeGreaterThan(0.7)
      }
      const c = centroid(e.molecule)
      expect(Math.hypot(...c), e.id).toBeLessThan(0.01)
    }
  })

  it('has no valence violations (every atom in state ok)', () => {
    for (const e of LIBRARY) {
      for (const a of e.molecule.atoms) expect(valenceState(e.molecule, a), `${e.id} ${a.symbol}${a.id}`).toBe('ok')
    }
  })

  it('has plausible bond lengths (0.9-1.9 A) and stays near ideal single/double/triple lengths', () => {
    for (const e of LIBRARY) {
      const m = e.molecule
      for (const b of m.bonds) {
        const L = bondLength(m, b)
        const A = atomById(m, b.a)!, B = atomById(m, b.b)!
        expect(L, `${e.id} ${A.symbol}-${B.symbol}`).toBeGreaterThan(0.9)
        expect(L, `${e.id} ${A.symbol}-${B.symbol}`).toBeLessThan(1.9)
        // Kekule orders on conjugated/aromatic systems legitimately deviate, so compare those with a looser bound
        const tol = b.aromatic ? 0.2 : 0.15
        expect(Math.abs(L - idealBondLength(A.symbol, B.symbol, b.order)), `${e.id} ${A.symbol}${A.id}-${B.symbol}${B.id} order ${b.order} L=${L.toFixed(3)}`).toBeLessThan(tol)
      }
    }
  })

  it('does not share mutable state: clones are independent of the library copy', () => {
    const e = getEntry('su')!
    const c = cloneMolecule(e.molecule)
    c.atoms[0].pos[0] += 5
    expect(e.molecule.atoms[0].pos[0]).not.toBe(c.atoms[0].pos[0])
  })
})

describe('library: formulas and masses', () => {
  for (const [id, [f, mass]] of Object.entries(EXPECTED)) {
    it(`${id} is ${f}`, () => {
      const e = getEntry(id)!
      expect(e, id).toBeDefined()
      expect(formula(e.molecule, false)).toBe(f)
      expect(molarMass(e.molecule)).toBeCloseTo(mass, 1)
    })
  }
})

describe('library: geometry facts', () => {
  it('methane is a regular tetrahedron (H-C-H 109.5 +- 0.5, C-H 1.09)', () => {
    const m = getEntry('metan')!.molecule
    const c = m.atoms.find((a) => a.symbol === 'C')!
    const hs = m.atoms.filter((a) => a.symbol === 'H')
    expect(hs.length).toBe(4)
    for (const h of hs) expect(dist(c.pos, h.pos)).toBeCloseTo(1.087, 2)
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(Math.abs(angleDeg(hs[i].pos, c.pos, hs[j].pos) - 109.5)).toBeLessThan(0.5)
  })

  it('water is bent (~104 deg), CO2 linear, ammonia pyramidal, H2O2 non-planar', () => {
    const w = getEntry('su')!
    expect(angleDeg(at(w, 2), firstOf(w, 'O').pos, at(w, 3))).toBeGreaterThan(102)
    expect(angleDeg(at(w, 2), firstOf(w, 'O').pos, at(w, 3))).toBeLessThan(107)
    const co2 = getEntry('karbondioksit')!
    const os = co2.molecule.atoms.filter((a) => a.symbol === 'O')
    expect(angleDeg(os[0].pos, firstOf(co2, 'C').pos, os[1].pos)).toBeGreaterThan(179)
    const nh3 = getEntry('amonyak')!
    const hs = nh3.molecule.atoms.filter((a) => a.symbol === 'H')
    const hnh = angleDeg(hs[0].pos, firstOf(nh3, 'N').pos, hs[1].pos)
    expect(hnh).toBeGreaterThan(104); expect(hnh).toBeLessThan(110)
    const hp = getEntry('hidrojen-peroksit')!.molecule
    const [o1, o2] = hp.atoms.filter((a) => a.symbol === 'O')
    const h1 = hp.atoms.find((a) => a.symbol === 'H' && hp.bonds.some((b) => (b.a === a.id && b.b === o1.id) || (b.b === a.id && b.a === o1.id)))!
    const h2 = hp.atoms.find((a) => a.symbol === 'H' && hp.bonds.some((b) => (b.a === a.id && b.b === o2.id) || (b.b === a.id && b.a === o2.id)))!
    const d = Math.abs(dihedralDeg(h1.pos, o1.pos, o2.pos, h2.pos))
    expect(d).toBeGreaterThan(80); expect(d).toBeLessThan(150)
  })

  it('water, ammonia, CO2 and methane match CCCBDB experimental geometry', () => {
    const L = (id: string, s1: string, s2: string) => { const e = getEntry(id)!; return dist(firstOf(e, s1).pos, e.molecule.atoms.filter((a) => a.symbol === s2)[0].pos) }
    const w = getEntry('su')!
    expect(Math.abs(L('su', 'O', 'H') - 0.9578)).toBeLessThan(0.005)
    expect(Math.abs(angleDeg(at(w, 2), firstOf(w, 'O').pos, at(w, 3)) - 104.48)).toBeLessThan(0.3)
    const n = getEntry('amonyak')!; const nh = n.molecule.atoms.filter((a) => a.symbol === 'H')
    for (const h of nh) expect(Math.abs(dist(firstOf(n, 'N').pos, h.pos) - 1.012)).toBeLessThan(0.005)
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(Math.abs(angleDeg(nh[i].pos, firstOf(n, 'N').pos, nh[j].pos) - 106.67)).toBeLessThan(0.3)
    const c = getEntry('karbondioksit')!; const os = c.molecule.atoms.filter((a) => a.symbol === 'O')
    for (const o of os) expect(Math.abs(dist(firstOf(c, 'C').pos, o.pos) - 1.16)).toBeLessThan(0.005)
    expect(Math.abs(angleDeg(os[0].pos, firstOf(c, 'C').pos, os[1].pos) - 180)).toBeLessThan(0.3)
    const m = getEntry('metan')!
    for (const h of m.molecule.atoms.filter((a) => a.symbol === 'H')) expect(Math.abs(dist(firstOf(m, 'C').pos, h.pos) - 1.087)).toBeLessThan(0.005)
  })

  it('BF3 is trigonal planar and SF6 octahedral', () => {
    const bf3 = getEntry('bor-triflorur')!
    const b = firstOf(bf3, 'B'); const fs = bf3.molecule.atoms.filter((a) => a.symbol === 'F')
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(angleDeg(fs[i].pos, b.pos, fs[j].pos)).toBeCloseTo(120, 1)
    const sf6 = getEntry('kukurt-heksaflorur')!
    const s = firstOf(sf6, 'S'); const f6 = sf6.molecule.atoms.filter((a) => a.symbol === 'F')
    const angles = []
    for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) angles.push(angleDeg(f6[i].pos, s.pos, f6[j].pos))
    expect(angles.filter((a) => Math.abs(a - 90) < 0.1).length).toBe(12)
    expect(angles.filter((a) => Math.abs(a - 180) < 0.1).length).toBe(3)
  })

  it('planar molecules lie flat in the xy plane after principal-axis alignment', () => {
    for (const id of ['benzen', 'naftalin', 'formaldehit', 'etilen', 'adenin', 'bor-triflorur']) {
      const m = getEntry(id)!.molecule
      const maxZ = Math.max(...m.atoms.map((a) => Math.abs(a.pos[2])))
      expect(maxZ, id).toBeLessThan(0.15)
    }
  })

  it('flags aromatic rings only where they exist', () => {
    const arom = (id: string) => getEntry(id)!.molecule.bonds.filter((b) => b.aromatic).length
    expect(arom('benzen')).toBe(6)
    expect(arom('naftalin')).toBe(11)
    expect(arom('piridin')).toBe(6)
    for (const id of ['siklohekzan', 'etilen', 'glikoz', 'kolesterol', 'adamantan', 'metan']) expect(arom(id), id).toBe(0)
    // aromatic flags sit on ring C-C/C-N bonds, never on C-H bonds
    for (const e of LIBRARY) for (const b of e.molecule.bonds) if (b.aromatic) {
      expect(atomById(e.molecule, b.a)!.symbol, e.id).not.toBe('H')
      expect(atomById(e.molecule, b.b)!.symbol, e.id).not.toBe('H')
    }
  })
})
