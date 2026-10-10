import { describe, expect, it } from 'vitest'
import { ChemIOError, fetchPubChem, parseMolfile, parseXYZ, toMolfile, toXYZ } from '../src/chem/io'
import { type Molecule, type Vec3, angleDeg, bondBetween, bondLength, dist, emptyMolecule, formula, methane, molarMass } from '../src/chem/molecule'
import { molProperties } from '../src/chem/properties'
import { fromSmiles } from './fixtures-smiles'

/** Build a molecule from raw symbols and coordinates (no bonds). */
function atomsOnly(name: string, rows: [string, Vec3][]): Molecule {
  const m = emptyMolecule(name)
  for (const [symbol, pos] of rows) m.atoms.push({ id: m.nextId++, symbol, pos, charge: 0 })
  return m
}
const orders = (m: Molecule) => m.bonds.map((b) => b.order).sort()
const bondKeys = (m: Molecule) =>
  m.bonds.map((b) => {
    const ia = m.atoms.findIndex((a) => a.id === b.a), ib = m.atoms.findIndex((a) => a.id === b.b)
    return `${Math.min(ia, ib)}-${Math.max(ia, ib)}:${b.order}`
  }).sort()

// ---- reference geometries (experimental / textbook values) ----
const WATER: [string, Vec3][] = [['O', [0, 0, 0]], ['H', [0.7569, 0.5859, 0]], ['H', [-0.7569, 0.5859, 0]]]
const ETHYLENE: [string, Vec3][] = [
  ['C', [0.667, 0, 0]], ['C', [-0.667, 0, 0]],
  ['H', [1.2298, 0.93, 0]], ['H', [1.2298, -0.93, 0]], ['H', [-1.2298, 0.93, 0]], ['H', [-1.2298, -0.93, 0]],
]
const ACETYLENE: [string, Vec3][] = [['C', [0.6, 0, 0]], ['C', [-0.6, 0, 0]], ['H', [1.66, 0, 0]], ['H', [-1.66, 0, 0]]]
const CO2: [string, Vec3][] = [['C', [0, 0, 0]], ['O', [1.16, 0, 0]], ['O', [-1.16, 0, 0]]]
const FORMALDEHYDE: [string, Vec3][] = [['C', [0, 0, 0]], ['O', [0, 0, 1.21]], ['H', [0.94, 0, -0.59]], ['H', [-0.94, 0, -0.59]]]
const NITROMETHANE: [string, Vec3][] = [
  ['C', [0, 0, 0]], ['N', [1.49, 0, 0]], ['O', [2.1, 1.056, 0]], ['O', [2.1, -1.056, 0]],
  ['H', [-0.36, 1.03, 0]], ['H', [-0.36, -0.51, 0.89]], ['H', [-0.36, -0.51, -0.89]],
]
function benzeneRows(): [string, Vec3][] {
  const rows: [string, Vec3][] = []
  for (let k = 0; k < 6; k++) rows.push(['C', [1.397 * Math.cos((k * Math.PI) / 3), 1.397 * Math.sin((k * Math.PI) / 3), 0]])
  for (let k = 0; k < 6; k++) rows.push(['H', [2.481 * Math.cos((k * Math.PI) / 3), 2.481 * Math.sin((k * Math.PI) / 3), 0]])
  return rows
}
/** acetic acid, planar-ish textbook geometry */
const ACETIC_ACID: [string, Vec3][] = [
  ['C', [0, 0, 0]], ['C', [1.52, 0, 0]], ['O', [2.12, 1.05, 0]], ['O', [2.17, -1.18, 0]],
  ['H', [-0.38, 1.02, 0]], ['H', [-0.38, -0.51, 0.89]], ['H', [-0.38, -0.51, -0.89]], ['H', [3.13, -1.05, 0]],
]
/** ethanol (staggered) */
const ETHANOL: [string, Vec3][] = [
  ['C', [0, 0, 0]], ['C', [1.52, 0, 0]], ['O', [2.03, 1.33, 0]],
  ['H', [-0.37, 1.02, 0]], ['H', [-0.37, -0.51, 0.89]], ['H', [-0.37, -0.51, -0.89]],
  ['H', [1.88, -0.52, 0.89]], ['H', [1.88, -0.52, -0.89]], ['H', [2.99, 1.26, 0]],
]

describe('XYZ export / import', () => {
  it('toXYZ writes count, name line and one row per atom', () => {
    const lines = toXYZ(methane()).trimEnd().split('\n')
    expect(lines[0]).toBe('5')
    expect(lines[1]).toBe('Metan')
    expect(lines.length).toBe(7)
    expect(lines[2].trim().split(/\s+/)[0]).toBe('C')
  })

  it('round trip keeps symbols and coordinates (1e-6) and re-perceives the bonds', () => {
    const m = methane()
    const back = parseXYZ(toXYZ(m))
    expect(back.atoms.map((a) => a.symbol)).toEqual(m.atoms.map((a) => a.symbol))
    back.atoms.forEach((a, i) => {
      for (let k = 0; k < 3; k++) expect(Math.abs(a.pos[k] - m.atoms[i].pos[k])).toBeLessThan(1e-6)
    })
    expect(back.bonds.length).toBe(4)
    expect(formula(back, false)).toBe('CH4')
    expect(back.name).toBe('Metan')
  })

  const perceived: [string, [string, Vec3][], string, number, number[]][] = [
    ['water', WATER, 'H2O', 2, [1, 1]],
    ['ethylene', ETHYLENE, 'C2H4', 5, [1, 1, 1, 1, 2]],
    ['acetylene', ACETYLENE, 'C2H2', 3, [1, 1, 3]],
    ['carbon dioxide', CO2, 'CO2', 2, [2, 2]],
    ['formaldehyde', FORMALDEHYDE, 'CH2O', 3, [1, 1, 2]],
    ['benzene', benzeneRows(), 'C6H6', 12, [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2]],
    ['ethanol', ETHANOL, 'C2H6O', 8, [1, 1, 1, 1, 1, 1, 1, 1]],
    ['acetic acid', ACETIC_ACID, 'C2H4O2', 7, [1, 1, 1, 1, 1, 1, 2]],
  ]
  for (const [name, rows, hill, nb, ords] of perceived) {
    it(`perceives ${name}: ${hill}, ${nb} bonds, orders ${ords.join('')}`, () => {
      const m = parseXYZ(toXYZ(atomsOnly(name, rows)))
      expect(formula(m, false)).toBe(hill)
      expect(m.bonds.length).toBe(nb)
      expect(orders(m)).toEqual([...ords].sort())
      expect(molProperties(m).issues.filter((i) => !i.startsWith('Çakışan'))).toEqual([])
    })
  }

  it('benzene is perceived as one aromatic ring with alternating Kekule bonds', () => {
    const m = parseXYZ(toXYZ(atomsOnly('benzene', benzeneRows())))
    const p = molProperties(m)
    expect(p.aromaticRings).toBe(1)
    expect(m.bonds.filter((b) => b.aromatic).length).toBe(6)
    expect(p.unsaturation).toBe(4)
  })

  it('nitro group becomes N+(=O)O-', () => {
    const m = parseXYZ(toXYZ(atomsOnly('nitromethane', NITROMETHANE)))
    expect(formula(m, false)).toBe('CH3NO2')
    expect(m.atoms.find((a) => a.symbol === 'N')!.charge).toBe(1)
    expect(m.atoms.filter((a) => a.symbol === 'O').map((a) => a.charge).sort()).toEqual([-1, 0])
    expect(molProperties(m).netCharge).toBe(0)
    expect(molProperties(m).issues).toEqual([])
    expect(molProperties(m).functionalGroups).toEqual(['nitro'])
  })

  it('a hydrogen never gets two bonds', () => {
    const m = parseXYZ('3\nH-bridge\nC 0 0 0\nC 1.5 0 0\nH 0.75 0.3 0\n')
    const h = m.atoms.find((a) => a.symbol === 'H')!
    expect(m.bonds.filter((b) => b.a === h.id || b.b === h.id).length).toBe(1)
  })

  it('accepts atomic numbers, header-less files and CRLF', () => {
    const m = parseXYZ('8 0 0 0\r\n1 0.9572 0 0\r\n1 -0.24 0.927 0\r\n')
    expect(formula(m, false)).toBe('H2O')
    expect(m.bonds.length).toBe(2)
  })

  it('error codes', () => {
    const code = (fn: () => unknown) => {
      try { fn() } catch (e) { return (e as ChemIOError).code }
      return 'none'
    }
    expect(code(() => parseXYZ(''))).toBe('emptyInput')
    expect(code(() => parseXYZ('2\nx\nC 0 0 0\n'))).toBe('invalidXYZ')
    expect(code(() => parseXYZ('1\nx\nC 0 0\n'))).toBe('invalidXYZ')
    expect(code(() => parseXYZ('1\nx\nFe 0 0 0\n'))).toBe('unsupportedElement')
    expect(code(() => parseXYZ('1\nx\nC a b c\n'))).toBe('invalidXYZ')
  })
})

describe('Molfile V2000', () => {
  const sample = ['CCO', 'C1=CC=CC=C1', 'CN1C=NC2=C1C(=O)N(C)C(=O)N2C', 'C[N+](=O)[O-]', '[NH4+]', 'CC(=O)OC1=CC=CC=C1C(=O)O', '[Na+].[Cl-]']
  for (const smiles of sample) {
    it(`round trip ${smiles}`, () => {
      const m = fromSmiles(smiles, 'Test molekülü')
      const text = toMolfile(m)
      expect(text).toContain('V2000')
      expect(text.trimEnd().endsWith('M  END')).toBe(true)
      const back = parseMolfile(text)
      expect(back.name).toBe('Test molekülü')
      expect(back.atoms.length).toBe(m.atoms.length)
      expect(back.bonds.length).toBe(m.bonds.length)
      expect(formula(back, false)).toBe(formula(m, false))
      expect(back.atoms.map((a) => a.charge)).toEqual(m.atoms.map((a) => a.charge))
      expect(back.atoms.map((a) => a.symbol)).toEqual(m.atoms.map((a) => a.symbol))
      expect(back.bonds.map((b) => b.order)).toEqual(m.bonds.map((b) => b.order))
      back.atoms.forEach((a, i) => {
        for (let k = 0; k < 3; k++) expect(Math.abs(a.pos[k] - m.atoms[i].pos[k])).toBeLessThan(0.001)
      })
      expect(molarMass(back)).toBeCloseTo(molarMass(m), 6)
      expect(bondKeys(back)).toEqual(bondKeys(m))
    })
  }

  it('aromaticity is re-perceived after import', () => {
    const back = parseMolfile(toMolfile(fromSmiles('C1=CC=CC=C1')))
    expect(back.bonds.filter((b) => b.aromatic).length).toBe(6)
  })

  it('ids are unique and nextId is above every id', () => {
    const back = parseMolfile(toMolfile(fromSmiles('CCO')))
    const ids = [...back.atoms.map((a) => a.id), ...back.bonds.map((b) => b.id)]
    expect(new Set(ids).size).toBe(ids.length)
    expect(back.nextId).toBeGreaterThan(Math.max(...ids))
    expect(back.id).toMatch(/^mol-\d+$/)
  })

  const pubchemWater = [
    '962',
    '  -OEChem-05242608053D',
    '',
    '  3  2  0     0  0  0  0  0  0999 V2000',
    '    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0',
    '    0.7570    0.5860    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0',
    '   -0.7570    0.5860    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0',
    '  1  2  1  0  0  0  0',
    '  1  3  1  0  0  0  0',
    'M  END',
    '> <PUBCHEM_COMPOUND_CID>',
    '962',
    '',
    '> <PUBCHEM_CONFORMER_RMSD>',
    '0.4',
    '',
    '$$$$',
    '',
  ].join('\n')

  it('parses a PubChem 3D SDF record (data block, $$$$ and numeric title ignored)', () => {
    const m = parseMolfile(pubchemWater)
    expect(formula(m, false)).toBe('H2O')
    expect(m.bonds.length).toBe(2)
    expect(angleDeg(m.atoms[1].pos, m.atoms[0].pos, m.atoms[2].pos)).toBeGreaterThan(100)
    expect(angleDeg(m.atoms[1].pos, m.atoms[0].pos, m.atoms[2].pos)).toBeLessThan(108)
    expect(bondLength(m, m.bonds[0])).toBeCloseTo(0.958, 2)
    expect(m.name).not.toBe('962')
  })

  it('parses CRLF line endings and PubChem M  CHG blocks (ammonium)', () => {
    const sdf = [
      '223', '  -OEChem-05242608053D', '',
      '  5  4  0     0  0  0  0  0  0999 V2000',
      '    0.0000    0.0000    0.0000 N   0  3  0  0  0  0  0  0  0  0  0  0',
      '    0.6293    0.6293    0.6293 H   0  0  0  0  0  0  0  0  0  0  0  0',
      '    0.6293   -0.6293   -0.6293 H   0  0  0  0  0  0  0  0  0  0  0  0',
      '   -0.6293    0.6293   -0.6293 H   0  0  0  0  0  0  0  0  0  0  0  0',
      '   -0.6293   -0.6293    0.6293 H   0  0  0  0  0  0  0  0  0  0  0  0',
      '  1  2  1  0  0  0  0', '  1  3  1  0  0  0  0', '  1  4  1  0  0  0  0', '  1  5  1  0  0  0  0',
      'M  CHG  1   1   1', 'M  END', '$$$$',
    ].join('\r\n')
    const m = parseMolfile(sdf)
    expect(formula(m, false)).toBe('H4N+')
    expect(m.atoms[0].charge).toBe(1)
    expect(molProperties(m).issues).toEqual([])
  })

  it('atom-block charge codes are honoured when there is no M  CHG line', () => {
    const txt = ['x', '', '', '  1  0  0  0  0  0  0  0  0  0999 V2000', '    0.0000    0.0000    0.0000 Cl  0  5  0  0  0  0  0  0  0  0  0  0', 'M  END'].join('\n')
    expect(parseMolfile(txt).atoms[0].charge).toBe(-1)
  })

  it('aromatic bond type 4 is kekulized (benzene without hydrogens)', () => {
    const rows: string[] = ['benzene 2D', '', '', '  6  6  0  0  0  0  0  0  0  0999 V2000']
    for (let k = 0; k < 6; k++) {
      const x = (1.4 * Math.cos((k * Math.PI) / 3)).toFixed(4).padStart(10)
      const y = (1.4 * Math.sin((k * Math.PI) / 3)).toFixed(4).padStart(10)
      rows.push(`${x}${y}    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0`)
    }
    for (let k = 1; k <= 6; k++) rows.push(`${String(k).padStart(3)}${String((k % 6) + 1).padStart(3)}  4  0`)
    rows.push('M  END')
    const m = parseMolfile(rows.join('\n'))
    expect(m.bonds.map((b) => b.order).filter((o) => o === 2).length).toBe(3)
    expect(m.bonds.every((b) => b.aromatic)).toBe(true)
    expect(molProperties(m).aromaticRings).toBe(1)
  })

  it('aromatic bond type 4: pyrrole-type N-H stays single', () => {
    // pyrrole ring C4N; N is atom 1
    const rows: string[] = ['pyrrole 2D', '', '', '  5  5  0  0  0  0  0  0  0  0999 V2000']
    const syms = ['N', 'C', 'C', 'C', 'C']
    for (let k = 0; k < 5; k++) {
      const a = (k * 2 * Math.PI) / 5
      rows.push(`${(1.2 * Math.cos(a)).toFixed(4).padStart(10)}${(1.2 * Math.sin(a)).toFixed(4).padStart(10)}    0.0000 ${syms[k].padEnd(3)} 0  0  0  0  0  0  0  0  0  0  0  0`)
    }
    for (let k = 1; k <= 5; k++) rows.push(`${String(k).padStart(3)}${String((k % 5) + 1).padStart(3)}  4  0`)
    rows.push('M  END')
    const m = parseMolfile(rows.join('\n'))
    const n = m.atoms[0]
    expect(m.bonds.filter((b) => (b.a === n.id || b.b === n.id)).every((b) => b.order === 1)).toBe(true)
    expect(m.bonds.filter((b) => b.order === 2).length).toBe(2)
  })

  it('error codes', () => {
    const code = (fn: () => unknown) => {
      try { fn() } catch (e) { return e instanceof ChemIOError ? e.code : 'other' }
      return 'none'
    }
    expect(code(() => parseMolfile(''))).toBe('emptyInput')
    expect(code(() => parseMolfile('a\nb\nc\n  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END'))).toBe('noAtoms')
    expect(code(() => parseMolfile('a\nb\nc\n  0  0  0  0  0  0  0  0  0  0999 V3000\n'))).toBe('v3000Unsupported')
    expect(code(() => parseMolfile('not a molfile at all'))).toBe('invalidMolfile')
    const fe = ['x', '', '', '  1  0  0  0  0  0  0  0  0  0999 V2000', '    0.0000    0.0000    0.0000 Fe  0  0  0  0  0  0  0  0  0  0  0  0', 'M  END'].join('\n')
    expect(code(() => parseMolfile(fe))).toBe('unsupportedElement')
    const badBond = ['x', '', '', '  2  1  0  0  0  0  0  0  0  0999 V2000', '    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0', '    1.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0', '  1  7  1  0', 'M  END'].join('\n')
    expect(code(() => parseMolfile(badBond))).toBe('invalidMolfile')
  })

  it('ChemIOError carries a language-neutral message', () => {
    try { parseMolfile('') } catch (e) {
      expect((e as Error).message).toBe('emptyInput')
      expect((e as Error).name).toBe('ChemIOError')
    }
  })
})

describe('XYZ perception on a molfile-derived geometry', () => {
  it('exporting a molfile molecule to XYZ and back keeps the heavy-atom bonds', () => {
    const m = parseMolfile(
      ['962', '', '', '  3  2  0  0  0  0  0  0  0  0999 V2000',
        '    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0',
        '    0.7570    0.5860    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0',
        '   -0.7570    0.5860    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0',
        '  1  2  1  0', '  1  3  1  0', 'M  END'].join('\n'),
    )
    const back = parseXYZ(toXYZ(m))
    expect(back.bonds.length).toBe(2)
    expect(dist(back.atoms[0].pos, back.atoms[1].pos)).toBeCloseTo(dist(m.atoms[0].pos, m.atoms[1].pos), 5)
  })
})

describe('PubChem (mocked network)', () => {
  const sdf = [
    '2244', '  -OEChem-', '',
    '  3  2  0     0  0  0  0  0  0999 V2000',
    '    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0',
    '    0.7570    0.5860    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0',
    '   -0.7570    0.5860    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0',
    '  1  2  1  0  0  0  0', '  1  3  1  0  0  0  0', 'M  END', '$$$$', '',
  ].join('\n')
  const resp = (status: number, body = '') => new Response(body, { status })
  const codeOf = async (p: Promise<unknown>) => {
    try { await p } catch (e) { return (e as ChemIOError).code }
    return 'none'
  }

  it('fetches a name and builds the URL for the 3D record', async () => {
    const urls: string[] = []
    const f = (async (url: string) => { urls.push(String(url)); return resp(200, sdf) }) as unknown as typeof fetch
    const m = await fetchPubChem('aspirin', { fetchImpl: f })
    expect(urls[0]).toBe('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/aspirin/SDF?record_type=3d')
    expect(m.name).toBe('Aspirin')
    expect(formula(m, false)).toBe('H2O')
  })
  it('numeric input is a CID', async () => {
    const urls: string[] = []
    const f = (async (url: string) => { urls.push(String(url)); return resp(200, sdf) }) as unknown as typeof fetch
    const m = await fetchPubChem('2244', { fetchImpl: f })
    expect(urls[0]).toContain('/compound/cid/2244/SDF')
    expect(m.name).toBe('PubChem CID 2244')
  })
  it('encodes names', async () => {
    const urls: string[] = []
    const f = (async (url: string) => { urls.push(String(url)); return resp(200, sdf) }) as unknown as typeof fetch
    await fetchPubChem('acetic acid/2', { fetchImpl: f })
    expect(urls[0]).toContain('acetic%20acid%2F2')
  })
  it('unknown compound -> pubchemNotFound', async () => {
    const f = (async () => resp(404, 'Status: 404')) as unknown as typeof fetch
    expect(await codeOf(fetchPubChem('zzzzzz', { fetchImpl: f }))).toBe('pubchemNotFound')
  })
  it('known compound without 3D conformer -> pubchemNo3D', async () => {
    const f = (async (url: string) => (String(url).includes('/cids/TXT') ? resp(200, '123') : resp(404, 'no 3d'))) as unknown as typeof fetch
    expect(await codeOf(fetchPubChem('sodium chloride', { fetchImpl: f }))).toBe('pubchemNo3D')
  })
  it('network failure -> pubchemNetwork, busy -> pubchemBusy, garbage -> pubchemBadResponse', async () => {
    const down = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    expect(await codeOf(fetchPubChem('water', { fetchImpl: down }))).toBe('pubchemNetwork')
    const busy = (async () => resp(503)) as unknown as typeof fetch
    expect(await codeOf(fetchPubChem('water', { fetchImpl: busy }))).toBe('pubchemBusy')
    const junk = (async () => resp(200, '<html>oops</html>')) as unknown as typeof fetch
    expect(await codeOf(fetchPubChem('water', { fetchImpl: junk }))).toBe('pubchemBadResponse')
  })
  it('timeout -> pubchemTimeout, empty input -> emptyInput', async () => {
    const hang = ((_: string, init?: RequestInit) =>
      new Promise((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))) as unknown as typeof fetch
    expect(await codeOf(fetchPubChem('water', { fetchImpl: hang, timeoutMs: 20 }))).toBe('pubchemTimeout')
    expect(await codeOf(fetchPubChem('   '))).toBe('emptyInput')
  })
})
