/**
 * SPEC.md A.7 scientific test oracles #1-#14 (checklist #1). Two-decimal checks use the A2.3 formatter
 * (`fmtNum('tr', x, d)`, TR strings with decimal comma).
 */
import { describe, expect, it, vi } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
})

import { useStudio } from '../src/store'
import {
  methane, formula, conventionalFormula, molarMass, angleDeg, dihedralDeg, dist, valenceState, missingHydrogens,
  emptyMolecule, cloneMolecule, neighbours, bondLength, idealBondLength,
} from '../src/chem/molecule'
import type { Atom, Bond, BondOrder, Molecule, Vec3 } from '../src/chem/molecule'
import * as Elements from '../src/chem/elements'
import { ELEMENTS, PALETTE, el, getElement, isKnownElement, VALENCE_ELECTRONS } from '../src/chem/elements'
import { LIBRARY, getEntry } from '../src/chem/library'
import { atomInfo, bondInfo, molProperties } from '../src/chem/properties'
import { adjustHydrogens, bondTargetLength, relaxStep } from '../src/chem/geometry'
import { ChemIOError, parseMolfile, parseXYZ, toMolfile, toXYZ } from '../src/chem/io'
import { fmtNum } from '../src/ui/i18n'

const lib = (id: string): Molecule => {
  const e = getEntry(id)
  if (!e) throw new Error(`library entry ${id} missing`)
  return e.molecule
}
const f = (n: number, d: number) => fmtNum('tr', n, d)
/** Case-insensitive (Turkish) comparison: the card string may be sentence-cased for display. */
const lc = (s: string) => s.toLocaleLowerCase('tr-TR')

/** Build a molecule from symbols + bonds `[i, j, order]` (0-based indices); positions are a spread-out spiral. */
function mk(symbols: string[], bonds: [number, number, BondOrder?][], charges: Record<number, number> = {}): Molecule {
  const m = emptyMolecule('t')
  symbols.forEach((symbol, i) => {
    const pos: Vec3 = [1.4 * i, 0.5 * Math.sin(i), 0.3 * Math.cos(i)]
    m.atoms.push({ id: m.nextId++, symbol, pos, charge: charges[i] ?? 0 })
  })
  for (const [i, j, o] of bonds) m.bonds.push({ id: m.nextId++, a: m.atoms[i].id, b: m.atoms[j].id, order: o ?? 1 })
  return m
}
const bySym = (m: Molecule, s: string): Atom[] => m.atoms.filter((a) => a.symbol === s)
const bondsBetween = (m: Molecule, sa: string, sb: string): Bond[] =>
  m.bonds.filter((b) => {
    const x = m.atoms.find((a) => a.id === b.a)!.symbol, y = m.atoms.find((a) => a.id === b.b)!.symbol
    return (x === sa && y === sb) || (x === sb && y === sa)
  })
/** All neighbour-centre-neighbour angles at one atom. */
function anglesAt(m: Molecule, id: number): number[] {
  const c = m.atoms.find((a) => a.id === id)!
  const nb = neighbours(m, id).map((n) => n.atom.pos)
  const out: number[] = []
  for (let i = 0; i < nb.length; i++) for (let j = i + 1; j < nb.length; j++) out.push(angleDeg(nb[i], c.pos, nb[j]))
  return out
}

// ---------------------------------------------------------------------------------------------
describe('A.7 #1 molar mass', () => {
  const cases: [string, Molecule | (() => Molecule), string][] = [
    ['CH4', () => methane(), '16,04'],
    ['H2O', () => lib('su'), '18,02'],
    ['NH3', () => lib('amonyak'), '17,03'],
    ['CO2', () => lib('karbondioksit'), '44,01'],
    ['C2H4', () => lib('etilen'), '28,05'],
    ['C2H2', () => lib('asetilen'), '26,04'],
    ['C6H6', () => lib('benzen'), '78,11'],
    ['C2H5OH', () => lib('etanol'), '46,07'],
    ['BF3', () => lib('bor-triflorur'), '67,80'],
    ['SF6', () => lib('kukurt-heksaflorur'), '146,05'],
  ]
  for (const [name, mol, expected] of cases) {
    it(`${name} = ${expected} g/mol`, () => {
      const m = typeof mol === 'function' ? mol() : mol
      expect(f(molarMass(m), 2)).toBe(expected)
      expect(f(molProperties(m).mass, 2)).toBe(expected)
    })
  }
  it('raw values are the unrounded sums of the table masses (1e-9)', () => {
    expect(Math.abs(molarMass(methane()) - (el('C').mass + 4 * el('H').mass))).toBeLessThan(1e-9)
    expect(Math.abs(molarMass(lib('su')) - (2 * el('H').mass + el('O').mass))).toBeLessThan(1e-9)
    expect(molarMass(methane())).toBeCloseTo(16.043, 9)
    expect(molarMass(lib('su'))).toBeCloseTo(18.015, 9)
  })
})

describe('A.7 #2 monoisotopic mass (u, 4 decimals)', () => {
  const cases: [string, () => Molecule, string][] = [
    ['CH4', () => methane(), '16,0313'],
    ['H2O', () => lib('su'), '18,0106'],
    ['NH3', () => lib('amonyak'), '17,0265'],
    ['CO2', () => lib('karbondioksit'), '43,9898'],
    ['C6H6', () => lib('benzen'), '78,0470'],
  ]
  for (const [name, mol, expected] of cases) {
    it(`${name} = ${expected} u`, () => {
      expect(f(molProperties(mol()).exactMass, 4)).toBe(expected)
    })
  }
  it('is the sum of the element `mono` values (A1.5), not of the average masses', () => {
    const m = lib('benzen')
    const expected = 6 * ELEMENTS.C.mono + 6 * ELEMENTS.H.mono
    expect(molProperties(m).exactMass).toBeCloseTo(expected, 9)
  })
  it('a charged species subtracts q x electron mass (0.000548579909065 u)', () => {
    const nh4 = mk(['N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]], { 0: 1 })
    const expected = ELEMENTS.N.mono + 4 * ELEMENTS.H.mono - 0.000548579909065
    expect(molProperties(nh4).exactMass).toBeCloseTo(expected, 9)
  })
})

describe('A.7 #3 composition', () => {
  const pct = (m: Molecule, s: string) => molProperties(m).composition.find((c) => c.symbol === s)!.percent
  it('CH4: C 74,87 % / H 25,13 %', () => {
    expect(f(pct(methane(), 'C'), 2)).toBe('74,87')
    expect(f(pct(methane(), 'H'), 2)).toBe('25,13')
  })
  it('H2O: H 11,19 %', () => {
    expect(f(pct(lib('su'), 'H'), 2)).toBe('11,19')
  })
  it('percentages are stored unrounded (A2.3)', () => {
    const p = pct(methane(), 'C')
    expect(p).not.toBe(Math.round(p * 100) / 100)
    expect(p).toBeCloseTo((12.011 / 16.043) * 100, 9)
  })
  it('unrounded percentages sum to 100 +- 1e-9 for every library molecule', () => {
    expect(LIBRARY.length).toBeGreaterThan(40)
    for (const e of LIBRARY) {
      const sum = molProperties(e.molecule).composition.reduce((s, c) => s + c.percent, 0)
      expect(Math.abs(sum - 100), e.id).toBeLessThan(1e-9)
    }
  })
})

describe('A.7 #4 formulas (primary / Hill)', () => {
  it('methane() -> CH₄ (pretty) and CH4 (plain)', () => {
    expect(formula(methane())).toBe('CH₄')
    expect(formula(methane(), false)).toBe('CH4')
  })
  it('glycine Hill C₂H₅NO₂', () => {
    expect(formula(lib('glisin'))).toBe('C₂H₅NO₂')
    expect(formula(lib('glisin'), false)).toBe('C2H5NO2')
  })
  it('ammonia: primary NH₃, Hill H₃N', () => {
    expect(conventionalFormula(lib('amonyak'))).toBe('NH₃')
    expect(formula(lib('amonyak'))).toBe('H₃N')
    expect(molProperties(lib('amonyak')).formulaPlain).toBe('H3N')
  })
  it('SO₂: primary SO₂, Hill O₂S', () => {
    expect(conventionalFormula(lib('kukurt-dioksit'))).toBe('SO₂')
    expect(formula(lib('kukurt-dioksit'))).toBe('O₂S')
  })
  it('BF₃ is Hill-correct and unchanged', () => {
    expect(formula(lib('bor-triflorur'))).toBe('BF₃')
    expect(conventionalFormula(lib('bor-triflorur'))).toBe('BF₃')
  })
  it('A2.1 conventional table: SF₆, H₂SO₄, H₃PO₄, HCl, NaCl, NH₄⁺', () => {
    expect(conventionalFormula(lib('kukurt-heksaflorur'))).toBe('SF₆')
    expect(conventionalFormula(lib('sulfurik-asit'))).toBe('H₂SO₄')
    expect(conventionalFormula(lib('fosforik-asit'))).toBe('H₃PO₄')
    expect(conventionalFormula(mk(['H', 'Cl'], [[0, 1]]))).toBe('HCl')
    expect(conventionalFormula(mk(['Na', 'Cl'], [[0, 1]]))).toBe('NaCl')
    expect(conventionalFormula(mk(['N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]], { 0: 1 }))).toBe('NH₄⁺')
  })
  it('carbon compounds keep the strict Hill formula as primary', () => {
    expect(conventionalFormula(lib('etanol'))).toBe('C₂H₆O')
    expect(conventionalFormula(lib('benzen'))).toBe('C₆H₆')
  })
  it('plain Hill formulas for the other library staples', () => {
    expect(formula(lib('su'), false)).toBe('H2O')
    expect(formula(lib('etanol'), false)).toBe('C2H6O')
    expect(formula(lib('benzen'), false)).toBe('C6H6')
    expect(formula(lib('kafein'), false)).toBe('C8H10N4O2')
    expect(formula(lib('aspirin'), false)).toBe('C9H8O4')
    expect(formula(lib('glikoz'), false)).toBe('C6H12O6')
  })
})

describe('A.7 #5 degree of unsaturation', () => {
  const dou = (m: Molecule) => molProperties(m).unsaturation
  it('CH4 0, C2H4 1, C2H2 2, C6H6 4, cyclohexane 1, CO2 2', () => {
    expect(dou(methane())).toBe(0)
    expect(dou(lib('etilen'))).toBe(1)
    expect(dou(lib('asetilen'))).toBe(2)
    expect(dou(lib('benzen'))).toBe(4)
    expect(dou(lib('siklohekzan'))).toBe(1)
    expect(dou(lib('karbondioksit'))).toBe(2)
  })
  it('H2SO4 -> hidden (null)', () => {
    expect(dou(lib('sulfurik-asit'))).toBeNull()
  })
  it('charged, metal and incomplete structures hide the row', () => {
    expect(dou(mk(['N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]], { 0: 1 }))).toBeNull()
    expect(dou(mk(['Na', 'Cl'], [[0, 1]]))).toBeNull()
    expect(dou(mk(['C', 'C'], [[0, 1]]))).toBeNull()
  })
})

describe('A.7 #6 methane()', () => {
  const m = methane()
  const c = m.atoms.find((a) => a.symbol === 'C')!
  const hs = m.atoms.filter((a) => a.symbol === 'H')
  it('four C-H = 1.090 +- 0.001 A', () => {
    expect(hs).toHaveLength(4)
    for (const h of hs) expect(Math.abs(dist(h.pos, c.pos) - 1.09)).toBeLessThan(0.001)
    for (const b of m.bonds) expect(Math.abs(bondLength(m, b) - 1.09)).toBeLessThan(0.001)
  })
  it('six H-C-H = 109.47 +- 0.01 deg', () => {
    const angles: number[] = []
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) angles.push(angleDeg(hs[i].pos, c.pos, hs[j].pos))
    expect(angles).toHaveLength(6)
    for (const a of angles) expect(Math.abs(a - 109.47)).toBeLessThan(0.01)
  })
  it('card: AX₄, düzgün dörtyüzlü, sp³, LP 0', () => {
    const info = atomInfo(m, c.id)!
    expect(info.neighbours).toHaveLength(4) // X = 4
    expect(info.lonePairs).toBe(0) // E = 0
    expect(info.stericNumber).toBe(4)
    expect(lc(info.geometry)).toBe('düzgün dörtyüzlü')
    expect(info.hybridization).toBe('sp3')
  })
})

describe('A.7 #7 A4.1 reference molecules match their table (+-0.005 A / +-0.3 deg)', () => {
  const near = (v: number, ref: number, tol: number, what: string) =>
    expect(Math.abs(v - ref), `${what}: ${v} vs ${ref}`).toBeLessThanOrEqual(tol)

  it('H2O: O-H 0.958, H-O-H 104.5', () => {
    const m = lib('su')
    for (const b of bondsBetween(m, 'O', 'H')) near(bondLength(m, b), 0.958, 0.005, 'O-H')
    near(anglesAt(m, bySym(m, 'O')[0].id)[0], 104.5, 0.3, 'H-O-H')
  })
  it('NH3: N-H 1.012, H-N-H 106.7', () => {
    const m = lib('amonyak')
    for (const b of bondsBetween(m, 'N', 'H')) near(bondLength(m, b), 1.012, 0.005, 'N-H')
    for (const a of anglesAt(m, bySym(m, 'N')[0].id)) near(a, 106.7, 0.3, 'H-N-H')
  })
  it('CO2: C=O 1.162, 180', () => {
    const m = lib('karbondioksit')
    for (const b of bondsBetween(m, 'C', 'O')) near(bondLength(m, b), 1.162, 0.005, 'C=O')
    near(anglesAt(m, bySym(m, 'C')[0].id)[0], 180, 0.3, 'O=C=O')
  })
  it('C2H4: C=C 1.339, C-H 1.086, H-C-H 117.6', () => {
    const m = lib('etilen')
    near(bondLength(m, bondsBetween(m, 'C', 'C')[0]), 1.339, 0.005, 'C=C')
    for (const b of bondsBetween(m, 'C', 'H')) near(bondLength(m, b), 1.086, 0.005, 'C-H')
    for (const c of bySym(m, 'C')) {
      const hh = neighbours(m, c.id).filter((n) => n.atom.symbol === 'H').map((n) => n.atom.pos)
      near(angleDeg(hh[0], c.pos, hh[1]), 117.6, 0.3, 'H-C-H')
    }
  })
  it('C2H2: C#C 1.203, C-H 1.063, 180', () => {
    const m = lib('asetilen')
    near(bondLength(m, bondsBetween(m, 'C', 'C')[0]), 1.203, 0.005, 'C#C')
    for (const b of bondsBetween(m, 'C', 'H')) near(bondLength(m, b), 1.063, 0.005, 'C-H')
    for (const c of bySym(m, 'C')) near(anglesAt(m, c.id)[0], 180, 0.3, 'H-C-C')
  })
  it('BF3: B-F 1.313, 120', () => {
    const m = lib('bor-triflorur')
    for (const b of bondsBetween(m, 'B', 'F')) near(bondLength(m, b), 1.313, 0.005, 'B-F')
    for (const a of anglesAt(m, bySym(m, 'B')[0].id)) near(a, 120, 0.3, 'F-B-F')
  })
  it('C6H6: C-C 1.397, C-H 1.084, 120', () => {
    const m = lib('benzen')
    for (const b of bondsBetween(m, 'C', 'C')) near(bondLength(m, b), 1.397, 0.005, 'C-C')
    for (const b of bondsBetween(m, 'C', 'H')) near(bondLength(m, b), 1.084, 0.005, 'C-H')
    for (const c of bySym(m, 'C')) for (const a of anglesAt(m, c.id)) near(a, 120, 0.3, 'angle at C')
  })
  it('CH4 (library): C-H within 0.005 of 1.087', () => {
    const m = lib('metan')
    for (const b of bondsBetween(m, 'C', 'H')) near(bondLength(m, b), 1.087, 0.005, 'C-H')
  })

  describe('VSEPR cards', () => {
    it('H2O O: AX₂E₂, LP 2, kırık doğru', () => {
      const m = lib('su')
      const i = atomInfo(m, bySym(m, 'O')[0].id)!
      expect([i.neighbours.length, i.lonePairs, i.stericNumber]).toEqual([2, 2, 4])
      expect(lc(i.geometry)).toMatch(/kırık doğru/)
    })
    it('NH3 N: AX₃E, LP 1', () => {
      const m = lib('amonyak')
      const i = atomInfo(m, bySym(m, 'N')[0].id)!
      expect([i.neighbours.length, i.lonePairs, i.stericNumber]).toEqual([3, 1, 4])
      expect(lc(i.geometry)).toMatch(/piramit/)
    })
    it('CO2 C: AX₂, doğrusal', () => {
      const m = lib('karbondioksit')
      const i = atomInfo(m, bySym(m, 'C')[0].id)!
      expect([i.neighbours.length, i.lonePairs, i.stericNumber]).toEqual([2, 0, 2])
      expect(lc(i.geometry)).toBe('doğrusal')
    })
    it('BF3 B: AX₃, düzlem üçgen', () => {
      const m = lib('bor-triflorur')
      const i = atomInfo(m, bySym(m, 'B')[0].id)!
      expect([i.neighbours.length, i.lonePairs, i.stericNumber]).toEqual([3, 0, 3])
      expect(lc(i.geometry)).toMatch(/düzlem üçgen/)
    })
    it('aniline N: düzlem üçgen (conjugation)', () => {
      const m = lib('anilin')
      const i = atomInfo(m, bySym(m, 'N')[0].id)!
      expect(lc(i.geometry)).toMatch(/düzlem üçgen/)
      expect(i.hybridization).toBe('sp2')
    })
  })
})

describe('A.7 #8 reference bond lengths (one table)', () => {
  it('bondTargetLength key values', () => {
    expect(bondTargetLength('C', 'C', 1, true)).toBe(1.39)
    expect(bondTargetLength('C', 'O', 2)).toBe(1.21)
    expect(bondTargetLength('C', 'H', 1)).toBe(1.09)
    expect(bondTargetLength('C', 'O', 1)).toBe(1.43)
    expect(bondTargetLength('C', 'C', 1)).toBe(1.54)
    expect(bondTargetLength('C', 'C', 2)).toBe(1.34)
    expect(bondTargetLength('C', 'C', 3)).toBe(1.2)
    expect(bondTargetLength('O', 'H', 1)).toBe(0.96)
    expect(bondTargetLength('N', 'H', 1)).toBe(1.01)
  })
  it('argument order does not matter', () => {
    expect(bondTargetLength('O', 'C', 2)).toBe(bondTargetLength('C', 'O', 2))
  })
  it('idealBondLength returns the same values (A3.1)', () => {
    expect(idealBondLength('C', 'O', 2)).toBe(1.21)
    expect(idealBondLength('C', 'H', 1)).toBe(1.09)
    expect(idealBondLength('C', 'O', 1)).toBe(1.43)
    expect(idealBondLength('C', 'C', 1)).toBe(1.54)
    for (const [a, b, o] of [['C', 'N', 1], ['N', 'O', 2], ['S', 'O', 2], ['P', 'O', 1], ['C', 'Cl', 1]] as [string, string, number][])
      expect(idealBondLength(a, b, o)).toBe(bondTargetLength(a, b, o))
  })
  it('BondInfo.idealLength uses the same table', () => {
    const m = lib('aseton')
    for (const b of m.bonds) {
      const sa = m.atoms.find((x) => x.id === b.a)!.symbol, sb = m.atoms.find((x) => x.id === b.b)!.symbol
      expect(bondInfo(m, b.id)!.idealLength, `${sa}-${sb}`).toBe(bondTargetLength(sa, sb, b.order, !!b.aromatic))
    }
  })
  it('missing pairs fall back to covalent sums x 1 / 0.875 / 0.79', () => {
    const sum = el('Si').covalent + el('Br').covalent
    expect(bondTargetLength('Si', 'Br', 1)).toBeCloseTo(sum, 9)
    expect(bondTargetLength('Si', 'Br', 2)).toBeCloseTo(sum * 0.875, 9)
    expect(bondTargetLength('Si', 'Br', 3)).toBeCloseTo(sum * 0.79, 9)
  })
})

describe('A.7 #9 dihedral', () => {
  it('dihedralDeg([1,0,0],[0,0,0],[0,0,1],[0,1,1]) = +90.0', () => {
    expect(Math.abs(dihedralDeg([1, 0, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]) - 90)).toBeLessThan(1e-9)
  })
  it('sign flips with the mirror image and trans = 180', () => {
    expect(Math.abs(dihedralDeg([1, 0, 0], [0, 0, 0], [0, 0, 1], [0, -1, 1]) + 90)).toBeLessThan(1e-9)
    expect(Math.abs(Math.abs(dihedralDeg([1, 0, 0], [0, 0, 0], [0, 0, 1], [-1, 0, 1])) - 180)).toBeLessThan(1e-9)
    expect(Math.abs(dihedralDeg([1, 0, 0], [0, 0, 0], [0, 0, 1], [1, 0, 1]))).toBeLessThan(1e-9)
  })
  it('methane H-C-H-H is +-120.0 and formats as "-120,0" / "120,0"', () => {
    const m = methane()
    const [c, ...h] = m.atoms
    const d = dihedralDeg(h[0].pos, c.pos, h[1].pos, h[2].pos)
    expect(Math.abs(Math.abs(d) - 120)).toBeLessThan(0.01)
    expect(f(-120, 1)).toBe('-120,0') // ASCII hyphen-minus, not U+2212 (glyph atlas has no U+2212)
  })
})

describe('A.7 #10 valence', () => {
  it('neutral 5-bond N -> over; NH4+ -> ok', () => {
    const n5 = mk(['N', 'H', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]])
    expect(valenceState(n5, n5.atoms[0])).toBe('over')
    const nh4 = mk(['N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4]], { 0: 1 })
    expect(valenceState(nh4, nh4.atoms[0])).toBe('ok')
  })
  it('neutral N with bond-order sum 5 through multiple bonds is over too', () => {
    const m = mk(['N', 'O', 'O'], [[0, 1, 2], [0, 2, 3]])
    expect(valenceState(m, m.atoms[0])).toBe('over')
  })
  it('5-bond carbon is over-valent', () => {
    const m: Molecule = cloneMolecule(emptyMolecule('over'))
    m.atoms.push({ id: 1, symbol: 'C', pos: [0, 0, 0], charge: 0 })
    for (let i = 0; i < 5; i++) {
      m.atoms.push({ id: 2 + i, symbol: 'H', pos: [i + 1, 0, 0], charge: 0 })
      m.bonds.push({ id: 100 + i, a: 1, b: 2 + i, order: 1 })
    }
    m.nextId = 200
    expect(valenceState(m, m.atoms[0])).toBe('over')
  })
  it('every atom of every library molecule is ok', () => {
    for (const e of LIBRARY) for (const a of e.molecule.atoms) expect(valenceState(e.molecule, a), `${e.id}#${a.id} ${a.symbol}`).toBe('ok')
  })
  it('a bare C with 2 bonds -> card "hesaplanamadı (yapı eksik)"', () => {
    const m = mk(['C', 'H', 'H'], [[0, 1], [0, 2]])
    const i = atomInfo(m, m.atoms[0].id)!
    expect(i.incomplete).toBe(true)
    expect(i.geometry).toBe('hesaplanamadı (yapı eksik)')
    expect(i.hybridization === 'sp' || i.hybridization === 'sp2' || i.hybridization === 'sp3').toBe(false) // never rendered
  })
  it('A1.2: nitro group N+(=O)O- on methyl has every atom ok', () => {
    const m = mk(['C', 'N', 'O', 'O', 'H', 'H', 'H'], [[0, 1], [1, 2, 2], [1, 3], [0, 4], [0, 5], [0, 6]], { 1: 1, 3: -1 })
    for (const a of m.atoms) expect(valenceState(m, a), `${a.symbol}`).toBe('ok')
    expect(molProperties(m).issues).toEqual([])
  })
  it('A1.3: R-Cl-R gets no hydrogens; H2SO4, H3PO4, SO2, SF6 atoms stay ok', () => {
    const rClR = mk(['C', 'Cl', 'C'], [[0, 1], [1, 2]])
    expect(missingHydrogens(rClR, rClR.atoms[1])).toBe(0)
    for (const id of ['sulfurik-asit', 'fosforik-asit', 'kukurt-dioksit', 'kukurt-heksaflorur']) {
      const m = lib(id)
      for (const a of m.atoms) {
        expect(valenceState(m, a), `${id} ${a.symbol}`).toBe('ok')
        expect(missingHydrogens(m, a), `${id} ${a.symbol}`).toBe(0)
      }
    }
  })
  it('A2.2: a bare C2 skeleton is flagged "6 H eksik" beside 24,02 g/mol', () => {
    const m = mk(['C', 'C'], [[0, 1]])
    expect(m.atoms.reduce((s, a) => s + missingHydrogens(m, a), 0)).toBe(6)
    expect(f(molarMass(m), 2)).toBe('24,02')
  })
})

describe('A.7 #11 unknown elements', () => {
  it("el('Fe') throws (no silent carbon fallback)", () => {
    expect(() => el('Fe')).toThrow()
    expect(() => el('Se')).toThrow()
    expect(() => el('__proto__')).toThrow()
    expect(() => el('toString')).toThrow()
  })
  it('UnknownElementError carries the symbol and the Turkish message', () => {
    const ctor = (Elements as Record<string, unknown>).UnknownElementError as new (s: string) => Error & { symbol: string }
    expect(typeof ctor).toBe('function')
    let err: unknown
    try { el('Fe') } catch (e) { err = e }
    expect(err).toBeInstanceOf(ctor)
    expect((err as { symbol: string }).symbol).toBe('Fe')
    expect((err as Error).message).toBe('Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I')
  })
  it("isKnownElement('Se') === false, ('__proto__') === false, own keys only", () => {
    expect(isKnownElement('Se')).toBe(false)
    expect(isKnownElement('Fe')).toBe(false)
    expect(isKnownElement('__proto__')).toBe(false)
    expect(isKnownElement('toString')).toBe(false)
    expect(isKnownElement('constructor')).toBe(false)
    expect(isKnownElement('hasOwnProperty')).toBe(false)
    expect(isKnownElement('D')).toBe(false)
    expect(isKnownElement('T')).toBe(false)
    expect(isKnownElement('')).toBe(false)
    expect(isKnownElement('c')).toBe(false)
  })
  it('exactly the 14 supported elements are known', () => {
    const sup = ['H', 'B', 'C', 'N', 'O', 'F', 'Na', 'Mg', 'Si', 'P', 'S', 'Cl', 'Br', 'I']
    for (const s of sup) expect(isKnownElement(s), s).toBe(true)
    expect(Object.keys(ELEMENTS)).toEqual(sup)
    expect([...PALETTE].sort()).toEqual([...sup].sort())
  })
  it('getElement returns undefined instead of throwing', () => {
    expect(getElement('Fe')).toBeUndefined()
    expect(getElement('__proto__')).toBeUndefined()
    expect(getElement('C')?.symbol).toBe('C')
  })
  it('parsers reject Fe / Se and the D / T isotopes and name the symbol', () => {
    const grab = (fn: () => unknown): ChemIOError | undefined => {
      try { fn() } catch (e) { return e as ChemIOError }
      return undefined
    }
    for (const sym of ['Fe', 'Se', 'D', 'T']) {
      const e = grab(() => parseXYZ(`1\nx\n${sym} 0 0 0\n`))
      expect(e, sym).toBeInstanceOf(ChemIOError)
      expect(e!.code, sym).toBe(sym === 'D' || sym === 'T' ? 'unsupportedIsotope' : 'unsupportedElement')
      expect(String(e!.params.symbol), sym).toBe(sym)
    }
  })
})

describe('A.7 #12 element snapshot (A.1 sources; edit fails until the citation is updated)', () => {
  // symbol: [mass (IUPAC CIAAW 2021), covalent (Cordero 2008), vdw (Bondi 1964 / Mantina 2009 for B), en (Pauling), mono (AME2020 via NIST)]
  const SNAPSHOT: Record<string, [number, number, number, number, number]> = {
    H: [1.008, 0.31, 1.2, 2.2, 1.00782503223],
    B: [10.81, 0.84, 1.92, 2.04, 11.00930536],
    C: [12.011, 0.76, 1.7, 2.55, 12],
    N: [14.007, 0.71, 1.55, 3.04, 14.00307400443],
    O: [15.999, 0.66, 1.52, 3.44, 15.99491461957],
    F: [18.998, 0.57, 1.47, 3.98, 18.99840316273],
    Na: [22.99, 1.66, 2.27, 0.93, 22.989769282],
    Mg: [24.305, 1.41, 1.73, 1.31, 23.985041697],
    Si: [28.085, 1.11, 2.1, 1.9, 27.97692653465],
    P: [30.974, 1.07, 1.8, 2.19, 30.97376199842],
    S: [32.06, 1.05, 1.8, 2.58, 31.9720711744],
    Cl: [35.45, 1.02, 1.75, 3.16, 34.968852682],
    Br: [79.904, 1.2, 1.85, 2.96, 78.9183376],
    I: [126.904, 1.39, 1.98, 2.66, 126.9044719],
  }
  it('14 elements, each field exactly equal', () => {
    expect(Object.keys(SNAPSHOT)).toHaveLength(14)
    for (const [s, [mass, covalent, vdw, en, mono]] of Object.entries(SNAPSHOT)) {
      const e = el(s)
      expect(e.mass, `${s} mass`).toBe(mass)
      expect(e.covalent, `${s} covalent`).toBe(covalent)
      expect(e.vdw, `${s} vdw`).toBe(vdw)
      expect(e.en, `${s} en`).toBe(en)
      expect(e.mono, `${s} mono`).toBe(mono)
    }
  })
  it('valences: neutral N is [3] (A1.2); halogens [1]; valence electrons table (A1.4)', () => {
    expect(el('N').valences).toEqual([3])
    for (const s of ['F', 'Cl', 'Br', 'I']) expect(el(s).valences).toEqual([1])
    expect(VALENCE_ELECTRONS).toEqual({ H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Na: 1, Mg: 2, Si: 4, P: 5, S: 6, Cl: 7, Br: 7, I: 7 })
  })
  it('atomic numbers', () => {
    const z: Record<string, number> = { H: 1, B: 5, C: 6, N: 7, O: 8, F: 9, Na: 11, Mg: 12, Si: 14, P: 15, S: 16, Cl: 17, Br: 35, I: 53 }
    for (const [s, n] of Object.entries(z)) expect(el(s).z, s).toBe(n)
  })
  it('colours follow the Jmol palette (H and O softened)', () => {
    expect(el('H').color.toLowerCase()).toBe('#f2f2f2')
    expect(el('O').color.toLowerCase()).toBe('#ff2d2d')
    expect(el('C').color.toLowerCase()).toBe('#909090')
    expect(el('N').color.toLowerCase()).toBe('#3050f8')
    expect(el('Cl').color.toLowerCase()).toBe('#1ff01f')
    expect(el('S').color.toLowerCase()).toBe('#ffff30')
  })
  it('formatter strings (TR): 12,011 u / 1,090 Å / 109,5° / 0,35 / -0,41 / 0,000', () => {
    expect(f(el('C').mass, 3)).toBe('12,011')
    expect(f(1.09, 3)).toBe('1,090')
    expect(f(109.4712, 1)).toBe('109,5')
    expect(f(Math.abs(el('C').en - el('H').en), 2)).toBe('0,35')
    expect(f(-0.41, 2)).toBe('-0,41')
    expect(f(0, 3)).toBe('0,000')
    expect(fmtNum('en', 1.09, 3)).toBe('1.090')
  })
})

describe('A.7 #13 geometry gate', () => {
  it('adjustHydrogens on a bare C returns 4 H at 1.09 +- 0.01 A', () => {
    const m = emptyMolecule('c')
    const id = m.nextId++
    m.atoms.push({ id, symbol: 'C', pos: [0, 0, 0], charge: 0 })
    const out = adjustHydrogens(m, [id])
    const hs = out.atoms.filter((a) => a.symbol === 'H')
    expect(hs).toHaveLength(4)
    const c = out.atoms.find((a) => a.id === id)!
    for (const h of hs) expect(Math.abs(dist(h.pos, c.pos) - 1.09)).toBeLessThanOrEqual(0.01)
    expect(formula(out, false)).toBe('CH4')
  })
  it('relaxStep energy does not increase over 50 steps on methanol (library and a jittered start)', () => {
    const jitter = (m: Molecule, amp: number): Molecule => {
      const c = cloneMolecule(m)
      let s = 12345
      const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 - 0.5 }
      for (const a of c.atoms) a.pos = [a.pos[0] + amp * rnd(), a.pos[1] + amp * rnd(), a.pos[2] + amp * rnd()]
      return c
    }
    for (const start of [lib('metanol'), jitter(lib('metanol'), 0.3)]) {
      let m = start
      let last = Infinity
      for (let i = 0; i < 50; i++) {
        const r = relaxStep(m, 1)
        expect(Number.isFinite(r.energy)).toBe(true)
        expect(r.energy, `step ${i}`).toBeLessThanOrEqual(last + 1e-6)
        last = r.energy
        m = r.mol
      }
    }
  })
})

describe('A.7 #14 I/O round trip', () => {
  const same = (a: Molecule, b: Molecule, tol: number) => {
    expect(b.atoms.map((x) => x.symbol)).toEqual(a.atoms.map((x) => x.symbol))
    a.atoms.forEach((x, i) => { for (let k = 0; k < 3; k++) expect(Math.abs(x.pos[k] - b.atoms[i].pos[k])).toBeLessThan(tol) })
  }
  it('Molfile: formula, bond list and coordinates (1e-4 A)', () => {
    const m = methane()
    const back = parseMolfile(toMolfile(m))
    expect(formula(back, false)).toBe(formula(m, false))
    const key = (mm: Molecule) => mm.bonds.map((b) => {
      const i = mm.atoms.findIndex((a) => a.id === b.a), j = mm.atoms.findIndex((a) => a.id === b.b)
      return `${Math.min(i, j)}-${Math.max(i, j)}:${b.order}`
    }).sort()
    expect(key(back)).toEqual(key(m))
    same(m, back, 1e-4)
  })
  it('XYZ: formula and coordinates (1e-4 A)', () => {
    const m = methane()
    const back = parseXYZ(toXYZ(m))
    expect(formula(back, false)).toBe(formula(m, false))
    expect(back.bonds).toHaveLength(m.bonds.length)
    same(m, back, 1e-4)
  })
  it('both formats keep every library molecule\'s formula', () => {
    for (const id of ['su', 'amonyak', 'etanol', 'benzen', 'glisin', 'kafein']) {
      const m = lib(id)
      expect(formula(parseMolfile(toMolfile(m)), false), `${id} mol`).toBe(formula(m, false))
      expect(formula(parseXYZ(toXYZ(m)), false), `${id} xyz`).toBe(formula(m, false))
    }
  })
})

// ---------------------------------------------------------------------------------------------
describe('science: library staples', () => {
  it('matches IUPAC masses', () => {
    expect(molarMass(lib('su'))).toBeCloseTo(18.015, 2)
    expect(molarMass(lib('etanol'))).toBeCloseTo(46.069, 2)
    expect(molarMass(lib('benzen'))).toBeCloseTo(78.114, 2)
    expect(Math.abs(molarMass(lib('kafein')) - 194.19)).toBeLessThan(0.01)
  })
})

describe('science: store auto-H', () => {
  it('two carbons give C2H6, a double bond gives C2H4', () => {
    const s = useStudio.getState()
    s.newMolecule()
    useStudio.setState({ autoH: true })
    s.setTool('atom')
    s.setElement('C')
    useStudio.getState().clickEmpty([0, 0, 0])
    const first = useStudio.getState().mol.atoms.find((a) => a.symbol === 'C')!
    expect(formula(useStudio.getState().mol, false)).toBe('CH4')
    useStudio.getState().clickAtom(first.id)
    const ethane = useStudio.getState().mol
    expect(ethane.atoms.filter((a) => a.symbol === 'C')).toHaveLength(2)
    expect(formula(ethane, false)).toBe('C2H6')
    const cc = ethane.bonds.find((b) => {
      const sa = ethane.atoms.find((a) => a.id === b.a)!.symbol
      const sb = ethane.atoms.find((a) => a.id === b.b)!.symbol
      return sa === 'C' && sb === 'C'
    })!
    useStudio.getState().setBondOrderOf(cc.id, 2)
    expect(formula(useStudio.getState().mol, false)).toBe('C2H4')
  })
})

