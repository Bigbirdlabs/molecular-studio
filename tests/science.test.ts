import { describe, expect, it, vi } from 'vitest'

const mem = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
})

import { useStudio } from '../src/store'
import {
  methane, formula, molarMass, angleDeg, valenceState, emptyMolecule, cloneMolecule,
} from '../src/chem/molecule'
import type { Molecule } from '../src/chem/molecule'
import { getEntry } from '../src/chem/library'

const lib = (id: string): Molecule => getEntry(id)!.molecule

describe('science A.7 #1 molar mass', () => {
  it('matches IUPAC masses', () => {
    expect(molarMass(lib('su'))).toBeCloseTo(18.015, 2)
    expect(molarMass(lib('etanol'))).toBeCloseTo(46.069, 2)
    expect(molarMass(lib('benzen'))).toBeCloseTo(78.114, 2)
    expect(Math.abs(molarMass(lib('kafein')) - 194.19)).toBeLessThan(0.01)
    expect(molarMass(methane())).toBeCloseTo(16.043, 2)
  })
})

describe('science A.7 #4 Hill formulas', () => {
  it('plain Hill formulas', () => {
    expect(formula(methane(), false)).toBe('CH4')
    expect(formula(lib('su'), false)).toBe('H2O')
    expect(formula(lib('etanol'), false)).toBe('C2H6O')
    expect(formula(lib('benzen'), false)).toBe('C6H6')
    expect(formula(lib('glisin'), false)).toBe('C2H5NO2')
  })
})

describe('science A.7 #6 methane geometry', () => {
  it('all six H-C-H angles are tetrahedral', () => {
    const m = methane()
    const c = m.atoms.find((a) => a.symbol === 'C')!
    const hs = m.atoms.filter((a) => a.symbol === 'H')
    expect(hs).toHaveLength(4)
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++)
        expect(Math.abs(angleDeg(hs[i].pos, c.pos, hs[j].pos) - 109.47)).toBeLessThan(0.3)
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

describe('science A.7 #10 valence', () => {
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
  it('library atoms for caffeine, aspirin and glucose are ok', () => {
    for (const id of ['kafein', 'aspirin', 'glikoz']) {
      const m = lib(id)
      for (const a of m.atoms) expect(valenceState(m, a), `${id}#${a.id}`).toBe('ok')
    }
  })
})

describe('science: library formulas', () => {
  it('kafein, aspirin, glikoz', () => {
    expect(formula(lib('kafein'), false)).toBe('C8H10N4O2')
    expect(formula(lib('aspirin'), false)).toBe('C9H8O4')
    expect(formula(lib('glikoz'), false)).toBe('C6H12O6')
  })
})
