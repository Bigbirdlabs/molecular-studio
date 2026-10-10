/**
 * Import / export of molecules: Molfile V2000 (+ first SDF record), XYZ and PubChem PUG REST.
 *
 * Errors are thrown as `ChemIOError` whose `code` is language neutral; the UI maps the code to a
 * translated message (`io.<code>` style). `message` equals the code so it never leaks a single language.
 */
import { ELEMENTS, el, isKnownElement } from './elements'
import {
  type Atom,
  type Bond,
  type BondOrder,
  type Molecule,
  type Vec3,
  allowedValences,
  dist,
  emptyMolecule,
  sub,
} from './molecule'
import { perceiveAromaticity } from './properties'

export type IoErrorCode =
  | 'emptyInput'
  | 'invalidMolfile'
  | 'v3000Unsupported'
  | 'unsupportedElement'
  | 'invalidXYZ'
  | 'noAtoms'
  | 'tooLarge'
  | 'pubchemNotFound'
  | 'pubchemNo3D'
  | 'pubchemNetwork'
  | 'pubchemTimeout'
  | 'pubchemBusy'
  | 'pubchemBadResponse'
  | 'aborted'

export class ChemIOError extends Error {
  readonly code: IoErrorCode
  readonly params: Record<string, string | number>
  constructor(code: IoErrorCode, params: Record<string, string | number> = {}) {
    super(code)
    this.name = 'ChemIOError'
    this.code = code
    this.params = params
  }
}

const MAX_ATOMS = 5000

/** Normalise an element symbol ("CL" -> "Cl", "D"/"T" -> "H"); throws for elements the app does not model. */
function normaliseSymbol(raw: string): string {
  const t = raw.trim()
  if (!t) throw new ChemIOError('invalidMolfile')
  const s = t[0].toUpperCase() + t.slice(1).toLowerCase()
  // D/T (isotopes) are not modelled: reject instead of silently turning them into H.
  // UI message: "Desteklenmeyen element/izotop: X" (toast.importElement with this symbol).
  if (!isKnownElement(s)) throw new ChemIOError('unsupportedElement', { symbol: s })
  return s
}

// ---------------------------------------------------------------------------------------------
// Double-bond assignment (Kekule structures) shared by Molfile aromatic bonds and XYZ perception
// ---------------------------------------------------------------------------------------------

interface DblEdge { a: number; b: number; bondId: number }

/**
 * Chooses a set of candidate bonds to become double bonds so that atoms in `need` get exactly one.
 * Atoms in `required` should be matched with priority (carbon, charged atoms); optional atoms
 * (pyridine vs pyrrole nitrogen) are matched when possible. Backtracking with a step budget.
 */
function matchDoubleBonds(need: Set<number>, required: Set<number>, edges: DblEdge[]): Set<number> {
  const inc = new Map<number, number[]>()
  for (const id of need) inc.set(id, [])
  edges.forEach((e, i) => {
    inc.get(e.a)?.push(i)
    inc.get(e.b)?.push(i)
  })
  const maxScore = [...need].reduce((s, id) => s + (required.has(id) ? 1000 : 1), 0)
  const matched = new Set<number>()
  const dead = new Set<number>()
  const chosen: number[] = []
  let best: number[] = []
  let bestScore = -1
  let steps = 0

  const score = () => {
    let s = 0
    for (const id of matched) s += required.has(id) ? 1000 : 1
    return s
  }
  const other = (e: DblEdge, id: number) => (e.a === id ? e.b : e.a)
  const options = (id: number) =>
    inc.get(id)!.filter((i) => {
      const o = other(edges[i], id)
      return !matched.has(o) && !dead.has(o)
    })

  const rec = (): void => {
    if (bestScore >= maxScore || ++steps > 200000) return
    let pick = -1
    let pickOpts: number[] = []
    let pickKey = Infinity
    for (const id of need) {
      if (matched.has(id) || dead.has(id)) continue
      const opts = options(id)
      if (opts.length === 0) continue
      const key = opts.length - (required.has(id) ? 0.5 : 0)
      if (key < pickKey) { pick = id; pickOpts = opts; pickKey = key }
    }
    if (pick < 0) {
      const s = score()
      if (s > bestScore) { bestScore = s; best = [...chosen] }
      return
    }
    for (const i of pickOpts) {
      const o = other(edges[i], pick)
      matched.add(pick); matched.add(o); chosen.push(i)
      rec()
      matched.delete(pick); matched.delete(o); chosen.pop()
      if (bestScore >= maxScore) return
    }
    // leave this atom without a double bond
    dead.add(pick)
    rec()
    dead.delete(pick)
  }
  rec()
  return new Set(best.map((i) => edges[i].bondId))
}

/** Lowest allowed valence >= the sum of the bond orders already present. */
function valenceTarget(symbol: string, charge: number, sum: number): number {
  const list = allowedValences({ id: 0, symbol, pos: [0, 0, 0], charge })
  return list.find((v) => v >= sum) ?? list[list.length - 1] ?? sum
}

/**
 * Molfile bond type 4 (aromatic): turn the flagged bonds into a Kekule structure.
 * Unmatched optional atoms (pyrrole-type N-H) stay single-bonded.
 */
function kekulize(m: Molecule, aromaticBondIds: Set<number>): void {
  const byId = new Map(m.atoms.map((a) => [a.id, a]))
  const sumOther = new Map<number, number>()
  for (const a of m.atoms) sumOther.set(a.id, 0)
  const inArom = new Set<number>()
  for (const b of m.bonds) {
    sumOther.set(b.a, sumOther.get(b.a)! + b.order)
    sumOther.set(b.b, sumOther.get(b.b)! + b.order)
    if (aromaticBondIds.has(b.id)) { inArom.add(b.a); inArom.add(b.b) }
  }
  const need = new Set<number>()
  const required = new Set<number>()
  for (const id of inArom) {
    const a = byId.get(id)!
    if (valenceTarget(a.symbol, a.charge, sumOther.get(id)!) - sumOther.get(id)! >= 1) {
      need.add(id)
      if (a.symbol === 'C' || a.charge !== 0) required.add(id)
    }
  }
  const edges: DblEdge[] = m.bonds
    .filter((b) => aromaticBondIds.has(b.id) && need.has(b.a) && need.has(b.b))
    .map((b) => ({ a: b.a, b: b.b, bondId: b.id }))
  const doubles = matchDoubleBonds(need, required, edges)
  for (const b of m.bonds) if (doubles.has(b.id)) b.order = 2
}

// ---------------------------------------------------------------------------------------------
// Molfile V2000
// ---------------------------------------------------------------------------------------------

const CHARGE_CODES: Record<number, number> = { 1: 3, 2: 2, 3: 1, 4: 0, 5: -1, 6: -2, 7: -3 }

const num = (s: string): number => (s.trim() === '' ? NaN : Number(s))

function intField(line: string, from: number, to: number): number {
  return Math.trunc(num(line.slice(from, to)))
}

/** Parses the first record of a V2000 Molfile / SDF. Hydrogens are kept exactly as given. */
export function parseMolfile(text: string): Molecule {
  if (!text || !text.trim()) throw new ChemIOError('emptyInput')
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length < 4) throw new ChemIOError('invalidMolfile')
  if (/V3000/i.test(lines[3])) throw new ChemIOError('v3000Unsupported')

  const counts = lines[3]
  let nAtoms = intField(counts, 0, 3)
  let nBonds = intField(counts, 3, 6)
  if (!Number.isFinite(nAtoms) || !Number.isFinite(nBonds)) {
    const parts = counts.trim().split(/\s+/).map(Number)
    nAtoms = parts[0]
    nBonds = parts[1]
  }
  if (!Number.isInteger(nAtoms) || !Number.isInteger(nBonds) || nAtoms < 0 || nBonds < 0) throw new ChemIOError('invalidMolfile')
  if (nAtoms === 0) throw new ChemIOError('noAtoms')
  if (nAtoms > MAX_ATOMS) throw new ChemIOError('tooLarge')
  if (lines.length < 4 + nAtoms + nBonds) throw new ChemIOError('invalidMolfile')

  const title = lines[0].trim()
  const m = emptyMolecule(title && !/^\d+$/.test(title) ? title : undefined)
  const atoms: Atom[] = []
  for (let i = 0; i < nAtoms; i++) {
    const line = lines[4 + i]
    let x = num(line.slice(0, 10)), y = num(line.slice(10, 20)), z = num(line.slice(20, 30))
    let symRaw = line.slice(31, 34)
    let chargeCode = intField(line, 36, 39)
    if (![x, y, z].every(Number.isFinite) || !/[A-Za-z]/.test(symRaw)) {
      // free-format fallback
      const t = line.trim().split(/\s+/)
      x = Number(t[0]); y = Number(t[1]); z = Number(t[2]); symRaw = t[3] ?? ''
      chargeCode = Number.isFinite(Number(t[5])) ? Math.trunc(Number(t[5])) : 0
      if (![x, y, z].every(Number.isFinite)) throw new ChemIOError('invalidMolfile')
    }
    const charge = Number.isFinite(chargeCode) ? CHARGE_CODES[chargeCode] ?? 0 : 0
    atoms.push({ id: m.nextId++, symbol: normaliseSymbol(symRaw), pos: [x, y, z], charge })
  }
  m.atoms = atoms

  const aromaticIds = new Set<number>()
  const seenPair = new Set<string>()
  for (let i = 0; i < nBonds; i++) {
    const line = lines[4 + nAtoms + i]
    let ia = intField(line, 0, 3), ib = intField(line, 3, 6), type = intField(line, 6, 9)
    if (![ia, ib, type].every(Number.isFinite)) {
      const t = line.trim().split(/\s+/).map(Number)
      ia = t[0]; ib = t[1]; type = t[2]
    }
    if (!(ia >= 1 && ia <= nAtoms && ib >= 1 && ib <= nAtoms) || ia === ib || !Number.isFinite(type)) throw new ChemIOError('invalidMolfile')
    const key = ia < ib ? `${ia}:${ib}` : `${ib}:${ia}`
    if (seenPair.has(key)) continue
    seenPair.add(key)
    let order: BondOrder
    if (type === 1) order = 1
    else if (type === 2) order = 2
    else if (type === 3) order = 3
    else if (type === 4) order = 1
    else throw new ChemIOError('invalidMolfile')
    const bond: Bond = { id: m.nextId++, a: atoms[ia - 1].id, b: atoms[ib - 1].id, order }
    if (type === 4) aromaticIds.add(bond.id)
    m.bonds.push(bond)
  }

  // property block: M  CHG overrides atom-block charges; stop at M  END
  const chargeLines: string[] = []
  for (let i = 4 + nAtoms + nBonds; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('M  END')) break
    if (l.startsWith('M  CHG')) chargeLines.push(l)
  }
  if (chargeLines.length) {
    for (const a of atoms) a.charge = 0
    for (const l of chargeLines) {
      const n = Math.trunc(num(l.slice(6, 9)))
      for (let k = 0; k < n; k++) {
        const at = Math.trunc(num(l.slice(9 + k * 8, 13 + k * 8)))
        const ch = Math.trunc(num(l.slice(13 + k * 8, 17 + k * 8)))
        if (at >= 1 && at <= nAtoms && Number.isFinite(ch)) atoms[at - 1].charge = ch
      }
    }
  }

  if (aromaticIds.size) kekulize(m, aromaticIds)
  return perceiveAromaticity(m)
}

const pad = (n: number, w: number) => String(n).padStart(w, ' ')
const coord = (x: number) => (Number.isFinite(x) ? x : 0).toFixed(4).padStart(10, ' ')

/** Molfile V2000 text. Charges are written as `M  CHG`; aromatic bonds are written as their Kekule orders. */
export function toMolfile(m: Molecule): string {
  const index = new Map<number, number>()
  m.atoms.forEach((a, i) => index.set(a.id, i + 1))
  const bonds = m.bonds.filter((b) => index.has(b.a) && index.has(b.b))
  const out: string[] = []
  out.push((m.name || '').replace(/[\r\n]+/g, ' ').slice(0, 80))
  out.push('  MolecularStudio3D')
  out.push('')
  out.push(`${pad(m.atoms.length, 3)}${pad(bonds.length, 3)}  0  0  0  0  0  0  0  0999 V2000`)
  for (const a of m.atoms) {
    out.push(`${coord(a.pos[0])}${coord(a.pos[1])}${coord(a.pos[2])} ${a.symbol.padEnd(3, ' ')} 0  0  0  0  0  0  0  0  0  0  0  0`)
  }
  for (const b of bonds) out.push(`${pad(index.get(b.a)!, 3)}${pad(index.get(b.b)!, 3)}${pad(b.order, 3)}  0`)
  const charged = m.atoms.map((a, i) => ({ i: i + 1, c: a.charge })).filter((x) => x.c !== 0)
  for (let k = 0; k < charged.length; k += 8) {
    const chunk = charged.slice(k, k + 8)
    out.push(`M  CHG${pad(chunk.length, 3)}${chunk.map((x) => `${pad(x.i, 4)}${pad(x.c, 4)}`).join('')}`)
  }
  out.push('M  END')
  return out.join('\n') + '\n'
}

// ---------------------------------------------------------------------------------------------
// XYZ
// ---------------------------------------------------------------------------------------------

const SYMBOL_BY_Z = new Map(Object.values(ELEMENTS).map((e) => [e.z, e.symbol]))

/** Plain XYZ (Angstrom). */
export function toXYZ(m: Molecule): string {
  const lines = [String(m.atoms.length), (m.name || '').replace(/[\r\n]+/g, ' ')]
  for (const a of m.atoms) {
    lines.push(`${a.symbol.padEnd(2, ' ')} ${a.pos[0].toFixed(6).padStart(12)} ${a.pos[1].toFixed(6).padStart(12)} ${a.pos[2].toFixed(6).padStart(12)}`)
  }
  return lines.join('\n') + '\n'
}

/** Bond tolerance (A) added to the sum of covalent radii when perceiving connectivity. */
const BOND_TOLERANCE = 0.4

/** Parses XYZ text; connectivity, bond orders, simple formal charges and aromaticity are perceived from the geometry. */
export function parseXYZ(text: string): Molecule {
  if (!text || !text.trim()) throw new ChemIOError('emptyInput')
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let start = 0
  let name: string | undefined
  const first = lines[0].trim()
  let declared = -1
  if (/^\d+$/.test(first)) {
    declared = Number(first)
    start = 2
    name = (lines[1] ?? '').trim() || undefined
  }
  const m = emptyMolecule(name)
  for (let i = start; i < lines.length; i++) {
    const l = lines[i].trim()
    if (!l) { if (declared >= 0 && m.atoms.length >= declared) break; continue }
    if (declared >= 0 && m.atoms.length >= declared) break
    const t = l.split(/\s+/)
    if (t.length < 4) throw new ChemIOError('invalidXYZ')
    const sym = /^\d+$/.test(t[0]) ? SYMBOL_BY_Z.get(Number(t[0])) : normaliseSymbol(t[0])
    if (!sym) throw new ChemIOError('unsupportedElement', { symbol: t[0] })
    const p = [Number(t[1]), Number(t[2]), Number(t[3])]
    if (!p.every(Number.isFinite)) throw new ChemIOError('invalidXYZ')
    m.atoms.push({ id: m.nextId++, symbol: sym, pos: p as Vec3, charge: 0 })
  }
  if (m.atoms.length === 0) throw new ChemIOError('noAtoms')
  if (m.atoms.length > MAX_ATOMS) throw new ChemIOError('tooLarge')
  if (declared >= 0 && m.atoms.length < declared) throw new ChemIOError('invalidXYZ')
  perceiveBonds(m)
  return perceiveAromaticity(m)
}

function perceiveBonds(m: Molecule): void {
  const atoms = m.atoms
  const n = atoms.length
  const radius = atoms.map((a) => el(a.symbol).covalent)

  // 1. connectivity (spatial hash keeps this near-linear for big molecules)
  const pairs: { i: number; j: number; d: number }[] = []
  const cell = 2.4
  const grid = new Map<string, number[]>()
  const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  atoms.forEach((a, i) => {
    const k = key(a.pos[0], a.pos[1], a.pos[2])
    const list = grid.get(k)
    if (list) list.push(i)
    else grid.set(k, [i])
  })
  for (let i = 0; i < n; i++) {
    const [x, y, z] = atoms[i].pos
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`)
      if (!list) continue
      for (const j of list) {
        if (j <= i) continue
        const d = dist(atoms[i].pos, atoms[j].pos)
        if (d > 0.4 && d <= radius[i] + radius[j] + BOND_TOLERANCE) pairs.push({ i, j, d })
      }
    }
  }
  pairs.sort((p, q) => p.d - q.d || p.i - q.i || p.j - q.j)

  // a hydrogen forms at most one bond: keep the shortest
  const hBonded = new Set<number>()
  const accepted: { i: number; j: number; d: number }[] = []
  for (const p of pairs) {
    const hi = atoms[p.i].symbol === 'H', hj = atoms[p.j].symbol === 'H'
    if ((hi && hBonded.has(p.i)) || (hj && hBonded.has(p.j))) continue
    if (hi) hBonded.add(p.i)
    if (hj) hBonded.add(p.j)
    accepted.push(p)
  }
  accepted.sort((p, q) => p.i - q.i || p.j - q.j)
  for (const p of accepted) m.bonds.push({ id: m.nextId++, a: atoms[p.i].id, b: atoms[p.j].id, order: 1 })

  // 2. bond orders
  const idx = new Map(atoms.map((a, i) => [a.id, i]))
  const deg = new Array<number>(n).fill(0)
  for (const b of m.bonds) { deg[idx.get(b.a)!]++; deg[idx.get(b.b)!]++ }
  const ratio = (b: Bond) => {
    const A = atoms[idx.get(b.a)!], B = atoms[idx.get(b.b)!]
    return dist(A.pos, B.pos) / (el(A.symbol).covalent + el(B.symbol).covalent)
  }
  const multiCapable = (s: string) => ['C', 'N', 'O', 'S', 'P', 'B', 'Si'].includes(s)

  // triple bonds: very short bonds between atoms with two missing bonds that are collinear
  const sums = new Array<number>(n).fill(0)
  for (const b of m.bonds) { sums[idx.get(b.a)!] += b.order; sums[idx.get(b.b)!] += b.order }
  const deficiency = (i: number) => valenceTarget(atoms[i].symbol, 0, sums[i]) - sums[i]
  const bondsAt = (i: number) => m.bonds.filter((b) => idx.get(b.a) === i || idx.get(b.b) === i)
  const angleAt = (center: number, o1: number, o2: number) => {
    const u = sub(atoms[o1].pos, atoms[center].pos), v = sub(atoms[o2].pos, atoms[center].pos)
    const c = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (Math.hypot(...u) * Math.hypot(...v) || 1)
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI
  }
  const otherIdx = (b: Bond, i: number) => (idx.get(b.a) === i ? idx.get(b.b)! : idx.get(b.a)!)

  const isLinear = (i: number): boolean => {
    const nb = bondsAt(i).map((b) => otherIdx(b, i))
    return nb.length === 1 || (nb.length === 2 && angleAt(i, nb[0], nb[1]) > 160)
  }
  for (const b of m.bonds) {
    const ia = idx.get(b.a)!, ib = idx.get(b.b)!
    if (!multiCapable(atoms[ia].symbol) || !multiCapable(atoms[ib].symbol)) continue
    if (ratio(b) < 0.86 && deficiency(ia) >= 2 && deficiency(ib) >= 2 && isLinear(ia) && isLinear(ib)) {
      b.order = 3
      sums[ia] += 2
      sums[ib] += 2
    }
  }

  // double bonds: short bonds, chosen so that each deficient atom gets one (cumulenes like CO2 get two)
  const cand: Bond[] = m.bonds.filter((b) => {
    const ia = idx.get(b.a)!, ib = idx.get(b.b)!
    return b.order === 1 && multiCapable(atoms[ia].symbol) && multiCapable(atoms[ib].symbol) && ratio(b) < 0.95
  })
  cand.sort((p, q) => ratio(p) - ratio(q))
  const need = new Set<number>()
  const required = new Set<number>()
  for (const b of cand) {
    for (const i of [idx.get(b.a)!, idx.get(b.b)!]) {
      if (deficiency(i) >= 1) {
        need.add(atoms[i].id)
        if (atoms[i].symbol === 'C') required.add(atoms[i].id)
      }
    }
  }
  const edges: DblEdge[] = cand.filter((b) => need.has(b.a) && need.has(b.b)).map((b) => ({ a: b.a, b: b.b, bondId: b.id }))
  const doubles = matchDoubleBonds(need, required, edges)
  for (const b of m.bonds) if (doubles.has(b.id)) { b.order = 2; sums[idx.get(b.a)!]++; sums[idx.get(b.b)!]++ }

  // cumulated systems (O=C=O, allene): a linear atom that still lacks a bond takes a second double bond
  for (let i = 0; i < n; i++) {
    if (!multiCapable(atoms[i].symbol) || !isLinear(i)) continue
    for (const b of bondsAt(i).filter((x) => x.order === 1)) {
      const o = otherIdx(b, i)
      if (deficiency(i) >= 1 && multiCapable(atoms[o].symbol) && deficiency(o) >= 1 && ratio(b) < 0.95) {
        b.order = 2
        sums[i]++
        sums[o]++
      }
    }
  }

  // 3. simple formal charges (only meaningful when hydrogens are present in the file)
  const hasH = atoms.some((a) => a.symbol === 'H')
  const terminalO = (i: number) => atoms[i].symbol === 'O' && deg[i] === 1
  for (let i = 0; i < n; i++) {
    const a = atoms[i]
    if (a.symbol === 'N') {
      const nb = bondsAt(i)
      const oxy = nb.filter((b) => terminalO(otherIdx(b, i)) && b.order === 1)
      if (nb.length === 3 && oxy.length === 2 && sums[i] === 3) {
        // nitro group: N+(=O)O-
        oxy[0].order = 2
        a.charge = 1
        atoms[otherIdx(oxy[1], i)].charge = -1
        sums[i] = 4
        sums[otherIdx(oxy[0], i)] = 2
        sums[otherIdx(oxy[1], i)] = 1
        continue
      }
      if (nb.length === 4 && sums[i] === 4) a.charge = 1
    }
  }
  if (hasH) {
    for (let i = 0; i < n; i++) {
      const a = atoms[i]
      if (a.charge === 0 && a.symbol === 'O' && deg[i] === 1 && sums[i] === 1) a.charge = -1 // oxide / carboxylate O-
    }
  }
}

// ---------------------------------------------------------------------------------------------
// PubChem
// ---------------------------------------------------------------------------------------------

export interface PubChemOptions {
  signal?: AbortSignal
  /** injectable for tests */
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const PUG = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound'

/**
 * Fetches a 3D conformer from PubChem PUG REST by compound name or CID.
 * Throws ChemIOError ('pubchemNotFound' | 'pubchemNo3D' | 'pubchemNetwork' | 'pubchemTimeout' | ...).
 */
export async function fetchPubChem(nameOrCid: string | number, opts: PubChemOptions = {}): Promise<Molecule> {
  const query = String(nameOrCid).trim()
  if (!query) throw new ChemIOError('emptyInput')
  const doFetch = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined)
  if (!doFetch) throw new ChemIOError('pubchemNetwork')

  const isCid = /^\d+$/.test(query)
  const base = `${PUG}/${isCid ? 'cid' : 'name'}/${encodeURIComponent(query)}`

  const request = async (url: string): Promise<Response> => {
    const ctl = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => { timedOut = true; ctl.abort() }, opts.timeoutMs ?? 15000)
    const onAbort = () => ctl.abort()
    opts.signal?.addEventListener('abort', onAbort)
    try {
      if (opts.signal?.aborted) throw new ChemIOError('aborted')
      return await doFetch(url, { signal: ctl.signal, headers: { Accept: 'chemical/x-mdl-sdfile, text/plain, */*' } })
    } catch (e) {
      if (e instanceof ChemIOError) throw e
      if (timedOut) throw new ChemIOError('pubchemTimeout')
      if (opts.signal?.aborted) throw new ChemIOError('aborted')
      throw new ChemIOError('pubchemNetwork')
    } finally {
      clearTimeout(timer)
      opts.signal?.removeEventListener('abort', onAbort)
    }
  }

  const res = await request(`${base}/SDF?record_type=3d`)
  if (res.status === 404) {
    // is it an unknown compound, or a known one without a 3D conformer?
    let known = false
    try {
      const probe = await request(`${base}/cids/TXT`)
      known = probe.ok
    } catch {
      known = false
    }
    throw new ChemIOError(known ? 'pubchemNo3D' : 'pubchemNotFound')
  }
  if (res.status === 429 || res.status === 503 || res.status === 504) throw new ChemIOError('pubchemBusy')
  if (!res.ok) throw new ChemIOError(res.status === 400 ? 'pubchemNotFound' : 'pubchemBadResponse')

  let text: string
  try {
    text = await res.text()
  } catch {
    throw new ChemIOError('pubchemNetwork')
  }
  let mol: Molecule
  try {
    mol = parseMolfile(text)
  } catch (e) {
    if (e instanceof ChemIOError && e.code === 'unsupportedElement') throw e
    throw new ChemIOError('pubchemBadResponse')
  }
  mol.name = isCid ? `PubChem CID ${query}` : query.charAt(0).toUpperCase() + query.slice(1)
  return mol
}
