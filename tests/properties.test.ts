import { describe, expect, it } from 'vitest'
import { atomInfo, bondInfo, molProperties, perceiveAromaticity, perceiveRings } from '../src/chem/properties'
import { type Molecule, angleDeg, bondLength } from '../src/chem/molecule'
import { build, fromSmiles } from './fixtures-smiles'

const props = (smiles: string) => molProperties(fromSmiles(smiles))
const heavyAtom = (m: Molecule, symbol: string, nth = 0) => m.atoms.filter((a) => a.symbol === symbol)[nth]

describe('formula, mass, composition (GOAL section 8.1)', () => {
  const cases: [string, string, string, number, number?][] = [
    ['water', 'O', 'H2O', 18.015],
    ['methane', 'C', 'CH4', 16.043],
    ['ammonia', 'N', 'H3N', 17.031],
    ['carbon dioxide', 'O=C=O', 'CO2', 44.009],
    ['ethanol', 'CCO', 'C2H6O', 46.069],
    ['benzene', 'C1=CC=CC=C1', 'C6H6', 78.114],
    ['glucose', 'OCC1OC(O)C(O)C(O)C1O', 'C6H12O6', 180.156],
    ['aspirin', 'CC(=O)OC1=CC=CC=C1C(=O)O', 'C9H8O4', 180.158],
    ['caffeine', 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 'C8H10N4O2', 194.19, 0.02],
    ['hydrogen chloride', 'Cl', 'ClH', 36.458],
  ]
  for (const [name, smiles, hill, mass, tol] of cases) {
    it(`${name}: ${hill}, ${mass} g/mol`, () => {
      const p = props(smiles)
      expect(p.formulaPlain).toBe(hill)
      expect(Math.abs(p.mass - mass)).toBeLessThanOrEqual(tol ?? 0.01)
    })
  }

  it('pretty formula uses subscripts', () => {
    expect(props('CN1C=NC2=C1C(=O)N(C)C(=O)N2C').formula).toBe('C₈H₁₀N₄O₂')
  })

  it('charged species: NH4+ is H4N+ with net charge +1', () => {
    const p = molProperties(fromSmiles('[NH4+]'))
    expect(p.formulaPlain).toBe('H4N+')
    expect(p.netCharge).toBe(1)
    expect(p.issues).toEqual([])
  })

  it('monoisotopic masses: water 18.0106, caffeine 194.0804', () => {
    expect(props('O').exactMass).toBeCloseTo(18.0106, 3)
    expect(props('CN1C=NC2=C1C(=O)N(C)C(=O)N2C').exactMass).toBeCloseTo(194.0804, 3)
  })

  it('composition percentages add up to 100 and follow Hill order', () => {
    const p = props('CCO')
    expect(p.composition.map((c) => c.symbol)).toEqual(['C', 'H', 'O'])
    expect(p.composition.map((c) => c.count)).toEqual([2, 6, 1])
    expect(p.composition.reduce((s, c) => s + c.percent, 0)).toBeCloseTo(100, 1)
    expect(p.composition[0].percent).toBeCloseTo(52.14, 1) // 24.022 / 46.069
  })

  it('counts, components, heavy atoms', () => {
    const p = props('CCO')
    expect(p.atomCount).toBe(9)
    expect(p.heavyAtomCount).toBe(3)
    expect(p.bondCount).toBe(8)
    expect(p.components).toBe(1)
    expect(molProperties(fromSmiles('O.O')).components).toBe(2)
    expect(p.bondCounts).toEqual({ single: 8, double: 0, triple: 0, aromatic: 0 })
  })
})

describe('H-bond donors / acceptors (Lipinski convention)', () => {
  const cases: [string, string, number, number][] = [
    ['water', 'O', 1, 1],
    ['ethanol', 'CCO', 1, 1],
    ['caffeine', 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 0, 6],
    ['aspirin', 'CC(=O)OC1=CC=CC=C1C(=O)O', 1, 4],
    ['glucose', 'OCC1OC(O)C(O)C(O)C1O', 5, 6],
  ]
  for (const [name, smiles, d, a] of cases) {
    it(`${name}: ${d} donors / ${a} acceptors`, () => {
      const p = props(smiles)
      expect(p.hDonors).toBe(d)
      expect(p.hAcceptors).toBe(a)
    })
  }
})

describe('rings and aromaticity', () => {
  const cases: [string, string, number, number][] = [
    ['benzene', 'C1=CC=CC=C1', 1, 1],
    ['naphthalene', 'C1=CC=C2C=CC=CC2=C1', 2, 2],
    ['cyclohexane', 'C1CCCCC1', 1, 0],
    ['cyclohexene', 'C1=CCCCC1', 1, 0],
    ['cyclopentadiene', 'C1C=CC=C1', 1, 0],
    ['pyridine', 'C1=CC=NC=C1', 1, 1],
    ['pyrrole', 'C1=CNC=C1', 1, 1],
    ['furan', 'C1=COC=C1', 1, 1],
    ['thiophene', 'C1=CSC=C1', 1, 1],
    ['imidazole', 'C1=CNC=N1', 1, 1],
    ['azulene', 'C1=CC2=CC=CC=CC2=C1', 2, 2],
    ['p-benzoquinone', 'O=C1C=CC(=O)C=C1', 1, 0],
    ['ethane', 'CC', 0, 0],
    ['caffeine', 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 2, 2],
    ['indole', 'C1=CC=C2C(=C1)C=CN2', 2, 2],
    ['cubane-like bicycle (norbornane)', 'C1CC2CCC1C2', 2, 0],
  ]
  for (const [name, smiles, rings, arom] of cases) {
    it(`${name}: ${rings} ring(s), ${arom} aromatic`, () => {
      const p = props(smiles)
      expect(p.rings).toBe(rings)
      expect(p.aromaticRings).toBe(arom)
      expect(perceiveRings(fromSmiles(smiles)).length).toBe(rings)
    })
  }

  it('perceiveAromaticity flags exactly the ring bonds of aromatic rings, keeps Kekule orders', () => {
    const m = fromSmiles('CC1=CC=CC=C1')
    const out = perceiveAromaticity(m)
    const flagged = out.bonds.filter((b) => b.aromatic)
    expect(flagged.length).toBe(6)
    expect(out.bonds.map((b) => b.order)).toEqual(m.bonds.map((b) => b.order))
    expect(m.bonds.some((b) => b.aromatic)).toBe(false) // input untouched
    const p = molProperties(out)
    expect(p.bondCounts.aromatic).toBe(6)
  })

  it('substituted benzene stays aromatic, quinone ring does not', () => {
    expect(props('OC1=CC=CC=C1').aromaticRings).toBe(1)
    expect(props('O=C1C=CC(=O)C=C1').bondCounts.aromatic).toBe(0)
  })
})

describe('unsaturation, rotatable bonds, Lipinski', () => {
  it('degrees of unsaturation', () => {
    expect(props('C1=CC=CC=C1').unsaturation).toBe(4)
    expect(props('C=C').unsaturation).toBe(1)
    expect(props('C#C').unsaturation).toBe(2)
    expect(props('CN1C=NC2=C1C(=O)N(C)C(=O)N2C').unsaturation).toBe(6)
    expect(props('CC').unsaturation).toBe(0)
  })

  it('rotatable bonds', () => {
    expect(props('CCO').rotatableBonds).toBe(0)
    expect(props('C1=CC=CC=C1').rotatableBonds).toBe(0)
    const aspirin = props('CC(=O)OC1=CC=CC=C1C(=O)O').rotatableBonds
    expect(aspirin).toBeGreaterThanOrEqual(3)
    expect(aspirin).toBeLessThanOrEqual(4)
    expect(props('CCCCC').rotatableBonds).toBe(2) // butane-like core of pentane: C2-C3 and C3-C4
    expect(props('CC(F)(F)F').rotatableBonds).toBe(0)
  })

  it('Lipinski: aspirin passes, hand-built C40 alkane violates (only 3 computable rules evaluated)', () => {
    const asp = props('CC(=O)OC1=CC=CC=C1C(=O)O')
    expect(asp.lipinski.passes).toBe(true)
    expect(asp.lipinski.violations).toBe(0)
    expect(asp.lipinski.rulesEvaluated).toBe(3)
    const c40 = props('C'.repeat(40))
    expect(c40.mass).toBeGreaterThan(500)
    expect(c40.lipinski.passes).toBe(false)
    expect(c40.lipinski.violations).toBeGreaterThanOrEqual(1)
  })
})

describe('functional groups (Turkish names)', () => {
  const cases: [string, string, string[]][] = [
    ['ethanol', 'CCO', ['alkol']],
    ['phenol', 'OC1=CC=CC=C1', ['fenol', 'aromatik halka']],
    ['diethyl ether', 'CCOCC', ['eter']],
    ['acetaldehyde', 'CC=O', ['aldehit']],
    ['formaldehyde', 'C=O', ['aldehit']],
    ['acetone', 'CC(=O)C', ['keton']],
    ['acetic acid', 'CC(=O)O', ['karboksilik asit']],
    ['methyl acetate', 'CC(=O)OC', ['ester']],
    ['methylamine', 'CN', ['amin']],
    ['acetamide', 'CC(=O)N', ['amit']],
    ['acetonitrile', 'CC#N', ['nitril']],
    ['propene', 'CC=C', ['alken']],
    ['propyne', 'CC#C', ['alkin']],
    ['benzene', 'C1=CC=CC=C1', ['aromatik halka']],
    ['chloroethane', 'CCCl', ['halojenür']],
    ['ethanethiol', 'CCS', ['tiyol']],
    ['nitromethane', 'C[N+](=O)[O-]', ['nitro']],
    ['glycine', 'NCC(=O)O', ['karboksilik asit', 'amin']],
    ['aspirin', 'CC(=O)OC1=CC=CC=C1C(=O)O', ['karboksilik asit', 'ester', 'aromatik halka']],
    ['paracetamol', 'CC(=O)NC1=CC=C(O)C=C1', ['fenol', 'amit', 'aromatik halka']],
    ['caffeine', 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C', ['amit', 'aromatik halka']],
    ['aniline', 'NC1=CC=CC=C1', ['amin', 'aromatik halka']],
    ['quinone', 'O=C1C=CC(=O)C=C1', ['keton', 'alken']],
    ['water', 'O', []],
    ['methane', 'C', []],
  ]
  for (const [name, smiles, groups] of cases) {
    it(`${name}: ${groups.join(', ') || 'none'}`, () => {
      const p = props(smiles)
      expect([...p.functionalGroups].sort()).toEqual([...groups].sort())
      expect(p.functionalGroupIds.length).toBe(p.functionalGroups.length)
    })
  }
})

describe('atomInfo: hybridization, VSEPR, valence (GOAL 8.3, 8.5)', () => {
  const info = (smiles: string, symbol: string, nth = 0) => {
    const m = fromSmiles(smiles)
    return atomInfo(m, heavyAtom(m, symbol, nth).id)!
  }

  it('methane C: sp3, tetrahedral, SN 4, 0 lone pairs', () => {
    const a = info('C', 'C')
    expect(a.hybridization).toBe('sp3')
    expect(a.stericNumber).toBe(4)
    expect(a.lonePairs).toBe(0)
    expect(a.geometry).toMatch(/Düzgün dörtyüzlü/)
    expect(a.z).toBe(6)
    expect(a.mass).toBeCloseTo(12.011, 3)
    expect(a.state).toBe('ok')
    expect(a.valenceUsed).toBe(4)
    expect(a.valence).toBe(4)
    expect(a.neighbours.length).toBe(4)
  })
  it('water O: sp3, bent, SN 4, 2 lone pairs', () => {
    const a = info('O', 'O')
    expect(a.hybridization).toBe('sp3')
    expect(a.stericNumber).toBe(4)
    expect(a.lonePairs).toBe(2)
    expect(a.geometry).toMatch(/Kırık doğru/)
    expect(a.geometryEn).toBe('Bent')
  })
  it('ammonia N: sp3, trigonal pyramidal, SN 4, 1 lone pair', () => {
    const a = info('N', 'N')
    expect(a.hybridization).toBe('sp3')
    expect(a.stericNumber).toBe(4)
    expect(a.lonePairs).toBe(1)
    expect(a.geometry).toMatch(/piramit/)
  })
  it('ammonium N: sp3, tetrahedral, 0 lone pairs, valence ok', () => {
    const m = fromSmiles('[NH4+]')
    const a = atomInfo(m, heavyAtom(m, 'N').id)!
    expect(a.lonePairs).toBe(0)
    expect(a.hybridization).toBe('sp3')
    expect(a.state).toBe('ok')
    expect(a.formalCharge).toBe(1)
  })
  it('BF3 B: sp2, trigonal planar, SN 3, 0 lone pairs', () => {
    const a = info('B(F)(F)F', 'B')
    expect(a.hybridization).toBe('sp2')
    expect(a.stericNumber).toBe(3)
    expect(a.lonePairs).toBe(0)
    expect(a.geometry).toMatch(/Üçgen düzlem/)
  })
  it('ethylene C sp2, acetylene C sp, CO2 C sp (linear), benzene C sp2', () => {
    expect(info('C=C', 'C').hybridization).toBe('sp2')
    expect(info('C#C', 'C').hybridization).toBe('sp')
    const co2 = info('O=C=O', 'C')
    expect(co2.hybridization).toBe('sp')
    expect(co2.geometry).toBe('Doğrusal')
    expect(info('C1=CC=CC=C1', 'C').hybridization).toBe('sp2')
  })
  it('carbonyl O is sp2 with 2 lone pairs, hydroxyl O sp3', () => {
    const o = info('CC=O', 'O')
    expect(o.hybridization).toBe('sp2')
    expect(o.lonePairs).toBe(2)
    expect(info('CCO', 'O').hybridization).toBe('sp3')
  })
  it('SF6 S: steric number 6, octahedral', () => {
    const a = info('S(F)(F)(F)(F)(F)F', 'S')
    expect(a.stericNumber).toBe(6)
    expect(a.lonePairs).toBe(0)
    expect(a.geometry).toMatch(/Sekizyüzlü/)
    expect(a.state).toBe('ok')
  })
  it('amide, aniline and pyrrole nitrogens are sp2 (lone pair delocalised); amine N stays sp3', () => {
    expect(info('CC(=O)N', 'N').hybridization).toBe('sp2')
    expect(info('NC1=CC=CC=C1', 'N').hybridization).toBe('sp2')
    expect(info('C1=CNC=C1', 'N').hybridization).toBe('sp2')
    expect(info('CCN', 'N').hybridization).toBe('sp3')
    expect(info('C1=CC=NC=C1', 'N').hybridization).toBe('sp2') // pyridine
    expect(info('C1=COC=C1', 'O').hybridization).toBe('sp2') // furan O
  })
  it('hydrogen is s, terminal', () => {
    const m = fromSmiles('C')
    const h = atomInfo(m, heavyAtom(m, 'H').id)!
    expect(h.hybridization).toBe('s')
    expect(h.valenceUsed).toBe(1)
  })
  it('returns null for unknown atom ids', () => {
    expect(atomInfo(fromSmiles('C'), 9999)).toBeNull()
    expect(bondInfo(fromSmiles('C'), 9999)).toBeNull()
  })
})

describe('Gasteiger-Marsili partial charges (approximate)', () => {
  const charges = (smiles: string) => {
    const m = fromSmiles(smiles)
    return m.atoms.map((a) => ({ symbol: a.symbol, q: atomInfo(m, a.id)!.partialCharge! }))
  }
  it('water: O negative, H positive, neutral overall, O about -0.4', () => {
    const c = charges('O')
    const o = c.find((x) => x.symbol === 'O')!.q
    expect(o).toBeLessThan(-0.3)
    expect(o).toBeGreaterThan(-0.5)
    for (const h of c.filter((x) => x.symbol === 'H')) expect(h.q).toBeGreaterThan(0.15)
    expect(c.reduce((s, x) => s + x.q, 0)).toBeCloseTo(0, 2)
  })
  it('methane carbon slightly negative, hydrogens slightly positive', () => {
    const c = charges('C')
    expect(c.find((x) => x.symbol === 'C')!.q).toBeLessThan(0)
    expect(c.find((x) => x.symbol === 'H')!.q).toBeGreaterThan(0)
  })
  it('ethanol: O most negative, hydroxyl H most positive', () => {
    const m = fromSmiles('CCO')
    const q = (id: number) => atomInfo(m, id)!.partialCharge!
    const o = heavyAtom(m, 'O')
    const hs = m.atoms.filter((a) => a.symbol === 'H')
    const ohH = hs.find((h) => m.bonds.some((b) => (b.a === o.id && b.b === h.id) || (b.b === o.id && b.a === h.id)))!
    expect(Math.min(...m.atoms.map((a) => q(a.id)))).toBe(q(o.id))
    expect(Math.max(...m.atoms.map((a) => q(a.id)))).toBe(q(ohH.id))
  })
  it('carbonyl carbon is positive and carbonyl O negative in formaldehyde', () => {
    const c = charges('C=O')
    expect(c.find((x) => x.symbol === 'C')!.q).toBeGreaterThan(0)
    expect(c.find((x) => x.symbol === 'O')!.q).toBeLessThan(-0.2)
  })
  it('never more than 3 decimals, never NaN', () => {
    for (const s of ['CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 'CC(=O)OC1=CC=CC=C1C(=O)O', 'S(F)(F)(F)(F)(F)F', 'ClCCBr', 'CS(=O)C']) {
      for (const x of charges(s)) {
        expect(Number.isFinite(x.q)).toBe(true)
        expect(Math.abs(x.q * 1000 - Math.round(x.q * 1000))).toBeLessThan(1e-6)
      }
    }
  })
})

describe('bondInfo', () => {
  it('C=O carbonyl: label, order, sigma/pi, polarity', () => {
    const m = fromSmiles('C=O')
    const b = m.bonds.find((x) => x.order === 2)!
    const info = bondInfo(m, b.id)!
    expect(info.label).toBe('C=O')
    expect(info.order).toBe(2)
    expect(info.sigma).toBe(1)
    expect(info.pi).toBe(1)
    expect(info.polarity).toBe('polar')
    expect(info.deltaEN).toBeCloseTo(0.89, 2)
    expect(info.inRing).toBe(false)
    expect(info.aromatic).toBe(false)
    expect(info.idealLength).toBeCloseTo(1.21, 2)
    expect(info.length).toBeCloseTo(bondLength(m, b), 6)
  })
  it('single / triple sigma-pi counts', () => {
    const e = fromSmiles('CC')
    expect(bondInfo(e, e.bonds[0].id)).toMatchObject({ sigma: 1, pi: 0, order: 1 })
    const a = fromSmiles('C#C')
    const t = a.bonds.find((x) => x.order === 3)!
    expect(bondInfo(a, t.id)).toMatchObject({ sigma: 1, pi: 2, order: 3, label: 'C≡C' })
  })
  it('polarity classes: C-H apolar, C-O polar, Na-Cl ionic', () => {
    const m = fromSmiles('CO')
    const ch = m.bonds.find((b) => m.atoms.find((a) => a.id === b.b)!.symbol === 'H' && m.atoms.find((a) => a.id === b.a)!.symbol === 'C')!
    expect(bondInfo(m, ch.id)!.polarity).toBe('apolar')
    expect(bondInfo(m, ch.id)!.label).toBe('C-H')
    const co = m.bonds.find((b) => m.atoms.find((a) => a.id === b.b)!.symbol === 'O' && m.atoms.find((a) => a.id === b.a)!.symbol === 'C')!
    expect(bondInfo(m, co.id)!.polarity).toBe('polar')
    const nacl = build(['Na', 'Cl'], [[0, 1, 1]])
    const i = bondInfo(nacl, nacl.bonds[0].id)!
    expect(i.polarity).toBe('ionic')
    expect(i.deltaEN).toBeCloseTo(2.23, 2)
    expect(atomInfo(nacl, nacl.atoms[0].id)!.hybridization).toBe('—')
  })
  it('benzene ring bonds: aromatic, in ring, order 1.5', () => {
    const m = fromSmiles('C1=CC=CC=C1')
    const ring = m.bonds.find((b) => m.atoms.find((a) => a.id === b.a)!.symbol === 'C' && m.atoms.find((a) => a.id === b.b)!.symbol === 'C')!
    const i = bondInfo(m, ring.id)!
    expect(i.aromatic).toBe(true)
    expect(i.inRing).toBe(true)
    expect(i.order).toBe(1.5)
    expect(i.idealLength).toBeGreaterThan(1.35)
    expect(i.idealLength).toBeLessThan(1.45)
  })
})

describe('valence issues (GOAL 8.5)', () => {
  const nonOverlap = (m: Molecule) => molProperties(m).issueDetails.filter((d) => d.code !== 'overlap')

  it('a complete molecule has no issues', () => {
    for (const s of ['CCO', 'C1=CC=CC=C1', 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 'C[N+](=O)[O-]', '[NH4+]']) {
      expect(nonOverlap(fromSmiles(s))).toEqual([])
    }
  })
  it('5-bonded carbon is over and reported in Turkish', () => {
    const m = build(['C', 'H', 'H', 'H', 'H', 'H'], [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1]])
    expect(atomInfo(m, m.atoms[0].id)!.state).toBe('over')
    const p = molProperties(m)
    expect(p.issues.some((t) => t.startsWith('Değerlik aşıldı: C en fazla 4 bağ yapabilir'))).toBe(true)
    expect(p.issueDetails.find((d) => d.code === 'valenceOver')).toMatchObject({ symbol: 'C', used: 5 })
  })
  it('hydrogen with two bonds is over; carbonyl O with 3 bonds is over', () => {
    const h2 = build(['H', 'H', 'H'], [[0, 1, 1], [0, 2, 1]])
    expect(atomInfo(h2, h2.atoms[0].id)!.state).toBe('over')
    const o3 = build(['C', 'O', 'H', 'H'], [[0, 1, 2], [1, 2, 1], [1, 3, 1]])
    expect(atomInfo(o3, o3.atoms[1].id)!.state).toBe('over')
  })
  it('carbon with three bonds and no hydrogen is under (unless charged)', () => {
    const m = build(['C', 'H', 'H', 'H'], [[0, 1, 1], [0, 2, 1], [0, 3, 1]])
    expect(atomInfo(m, m.atoms[0].id)!.state).toBe('under')
    expect(molProperties(m).issueDetails[0]).toMatchObject({ code: 'valenceUnder', symbol: 'C', used: 3 })
    const cation = build(['C', 'H', 'H', 'H'], [[0, 1, 1], [0, 2, 1], [0, 3, 1]], { 0: 1 })
    expect(atomInfo(cation, cation.atoms[0].id)!.state).toBe('ok')
  })
  it('overlapping atoms are reported', () => {
    const m = build(['C', 'C'], [])
    m.atoms[1].pos = [0.1, 0, 0]
    expect(molProperties(m).issueDetails.some((d) => d.code === 'overlap')).toBe(true)
  })
})

describe('robustness', () => {
  it('empty molecule', () => {
    const p = molProperties({ id: 'e', name: 'e', atoms: [], bonds: [], nextId: 1 })
    expect(p.atomCount).toBe(0)
    expect(p.mass).toBe(0)
    expect(p.sizeAng).toBe(0)
    expect(p.composition).toEqual([])
    expect(p.issues).toEqual([])
  })
  it('bonds that reference missing atoms are ignored, not thrown on', () => {
    const m = fromSmiles('CC')
    m.bonds.push({ id: 999, a: m.atoms[0].id, b: 12345, order: 1 })
    expect(() => molProperties(m)).not.toThrow()
    expect(bondInfo(m, 999)).toBeNull()
  })
  it('cache follows in-place edits of the same object', () => {
    const m = fromSmiles('C1=CC=CC=C1')
    expect(molProperties(m).aromaticRings).toBe(1)
    const ringBond = m.bonds.find((b) => b.order === 2)!
    ringBond.order = 1
    expect(molProperties(m).aromaticRings).toBe(0)
  })
  it('a 120-atom molecule is analysed quickly', () => {
    const t = performance.now()
    const p = molProperties(fromSmiles('C'.repeat(40) + 'C1=CC=CC=C1'.repeat(1)))
    expect(p.atomCount).toBeGreaterThan(100)
    expect(performance.now() - t).toBeLessThan(500)
  })
  it('geometry-based values: size and angle sanity on a built methane', () => {
    const m = fromSmiles('C')
    expect(molProperties(m).sizeAng).toBeGreaterThan(0)
    expect(angleDeg([1, 0, 0], [0, 0, 0], [0, 1, 0])).toBeCloseTo(90, 6)
  })
})

describe('incomplete structures and honest nulls (round-1 science fixes)', () => {
  it('missing H: hybridization/geometry not computed, no invented lone pairs', () => {
    const m = build(['C', 'O'], [[0, 1, 1]])
    const a = atomInfo(m, m.atoms[0].id)!
    expect(a.incomplete).toBe(true)
    expect(a.hybridization).toBe('—')
    expect(a.geometry).toBe('hesaplanamadı (yapı eksik)')
    expect(a.lonePairs).toBe(0)
    expect(a.partialCharge).toBeNull()
  })
  it('unsaturation is null for incomplete or non-CHNOX structures, number for complete ones', () => {
    expect(molProperties(build(['C', 'O'], [[0, 1, 1]])).unsaturation).toBeNull()
    expect(molProperties(fromSmiles('S(F)(F)(F)(F)(F)F')).unsaturation).toBeNull()
    expect(props('C=C').unsaturation).toBe(1)
  })
  it('B has no Gasteiger parameters -> null charge', () => {
    const m = fromSmiles('B(F)(F)F')
    expect(atomInfo(m, heavyAtom(m, 'B').id)!.partialCharge).toBeNull()
  })
  it('amide N: sp2 implies steric number 3', () => {
    const m = fromSmiles('CC(=O)N')
    const n = atomInfo(m, heavyAtom(m, 'N').id)!
    expect(n.hybridization).toBe('sp2')
    expect(n.stericNumber).toBe(3)
  })
})
