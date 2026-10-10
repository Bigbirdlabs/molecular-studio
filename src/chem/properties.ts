/**
 * Molecular properties: per-atom / per-bond / whole-molecule values that are CALCULATED from the
 * molecule graph (never looked up for the specific molecule and never invented).
 *
 * Honesty notes (SPEC sections 5, 8):
 *  - No dipole moment, no logP, no melting/boiling point is computed anywhere in this module.
 *  - Gasteiger-Marsili partial charges are an empirical estimate (PEOE, 6 iterations) and are
 *    labelled approximate by the UI.
 *  - Lipinski's rule of five normally has four rules (MW <= 500, HBD <= 5, HBA <= 10, logP <= 5).
 *    logP is NOT computed here, so only the three computable rules are evaluated and
 *    `lipinski.rulesEvaluated` says so (3, never 4).
 *  - Hydrogen counts for donors / functional groups use the explicit hydrogens of the molecule.
 *
 * Results of the graph analysis (rings, aromaticity, hybridization) are cached per molecule
 * object and invalidated by a structural signature, so the same molecule is analysed once.
 */
import { BOND_NAMES, BOND_NAMES_EN, el } from './elements'
import { bondTargetLength } from './geometry'
import {
  type Atom,
  type Bond,
  type Molecule,
  type Vec3,
  allowedValences,
  cloneMolecule,
  connectedComponents,
  dist,
  formula,
  formulaCounts,
  hillOrder,
  inRing,
  missingHydrogens,
  molarMass,
  ringCount,
  targetValence,
  valenceState,
  valenceUsed,
  unsaturation as unsaturationOf,
} from './molecule'

// ---------------------------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------------------------

export interface AtomInfo {
  id: number
  symbol: string
  name: string
  z: number
  hybridization: 'sp' | 'sp2' | 'sp3' | 's' | '—'
  /** Turkish VSEPR geometry name */
  geometry: string
  /** English VSEPR geometry name (additive, for the English UI) */
  geometryEn: string
  stericNumber: number
  lonePairs: number
  valenceUsed: number
  valence: number
  formalCharge: number
  neighbours: string[]
  mass: number
  en: number
  covalentRadius: number
  position: Vec3
  state: 'ok' | 'under' | 'over'
  /** True when the atom has missing H / is under- or over-valent: hybridization, geometry and lone pairs are not computable. */
  incomplete: boolean
  /** Gasteiger-Marsili (PEOE) partial charge. APPROXIMATE; the UI must label it so. null = not computable. */
  partialCharge: number | null
}

export interface BondInfo {
  id: number
  label: string
  order: number
  orderName: string
  /** English bond-order name (additive, for the English UI) */
  orderNameEn: string
  length: number
  idealLength: number
  deltaEN: number
  polarity: 'apolar' | 'polar' | 'ionic'
  aromatic: boolean
  inRing: boolean
  sigma: number
  pi: number
}

export interface MolProperties {
  formula: string
  formulaPlain: string
  mass: number
  exactMass: number
  atomCount: number
  heavyAtomCount: number
  bondCount: number
  bondCounts: { single: number; double: number; triple: number; aromatic: number }
  rings: number
  aromaticRings: number
  /** Degrees of unsaturation; null unless the molecule is a complete neutral C/H/N/O/halogen structure. */
  unsaturation: number | null
  hDonors: number
  hAcceptors: number
  rotatableBonds: number
  composition: { symbol: string; count: number; percent: number }[]
  netCharge: number
  components: number
  sizeAng: number
  /** Turkish functional-group names */
  functionalGroups: string[]
  /** Stable language-neutral ids, same order as `functionalGroups` (additive) */
  functionalGroupIds: string[]
  /** Lipinski rule-of-five verdict. logP is not computed: only 3 rules are evaluated (see file header). */
  lipinski: { passes: boolean; violations: number; rulesEvaluated: number }
  /** Turkish human-readable valence / geometry problems */
  issues: string[]
  /** Structured form of `issues`, same order (additive; lets the UI translate) */
  issueDetails: IssueDetail[]
}

export interface IssueDetail {
  code: 'valenceOver' | 'valenceUnder' | 'valenceInvalid' | 'overlap'
  atomId: number
  symbol: string
  used?: number
  allowed?: number[]
  otherAtomId?: number
  distance?: number
}

/** One ring of the smallest set of smallest rings (additive helper for the scene's ring depiction). */
export interface RingInfo {
  /** atom ids in cycle order */
  atoms: number[]
  /** bond ids of the ring, in cycle order */
  bonds: number[]
  aromatic: boolean
}

// ---------------------------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------------------------

/** Valence (outer-shell) electrons per neutral atom. */
const VALENCE_ELECTRONS: Record<string, number> = {
  H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Na: 1, Mg: 2, Si: 4, P: 5, S: 6, Cl: 7, Br: 7, I: 7,
}

/** Monoisotopic masses (u) of the most abundant isotope (IUPAC / NIST). */
const MONO_MASS: Record<string, number> = {
  H: 1.00782503207, B: 11.0093054, C: 12, N: 14.0030740048, O: 15.99491461956, F: 18.99840322,
  Na: 22.9897692809, Mg: 23.985041700, Si: 27.9769265325, P: 30.97376163, S: 31.972071,
  Cl: 34.96885268, Br: 78.9183371, I: 126.904473,
}
const ELECTRON_MASS = 0.00054857990946

const round = (x: number, d: number): number => {
  const f = 10 ** d
  const r = Math.round(x * f) / f
  return r === 0 ? 0 : r // no "-0"
}

// ---------------------------------------------------------------------------------------------
// Analysis cache
// ---------------------------------------------------------------------------------------------

type Hyb = AtomInfo['hybridization']
interface Nb { id: number; bond: Bond }
interface GeoInfo {
  hyb: Hyb
  sn: number
  lp: number
  geometry: string
  geometryEn: string
  incomplete: boolean
}
interface Analysis {
  sig: number
  byId: Map<number, Atom>
  adj: Map<number, Nb[]>
  /** valid bonds only (both endpoints exist, no self loops, no duplicates) */
  bonds: Bond[]
  rings: RingInfo[]
  ringAtoms: Set<number>
  aromaticAtoms: Set<number>
  aromaticBonds: Set<number>
  /** atoms that belong to an aromatic ring containing at least one non-carbon atom */
  heteroAromaticAtoms: Set<number>
  geo: Map<number, GeoInfo>
  charges: Map<number, number> | null
}

const cache = new WeakMap<Molecule, Analysis>()

function signature(m: Molecule): number {
  let h = 2166136261
  const mix = (n: number) => {
    h ^= n | 0
    h = Math.imul(h, 16777619)
  }
  for (const a of m.atoms) {
    mix(a.id)
    for (let i = 0; i < a.symbol.length; i++) mix(a.symbol.charCodeAt(i))
    mix(a.charge)
  }
  mix(-7)
  for (const b of m.bonds) {
    mix(b.id)
    mix(b.a)
    mix(b.b)
    mix(b.order)
  }
  mix(m.atoms.length)
  mix(m.bonds.length)
  return h >>> 0
}

function analyze(m: Molecule): Analysis {
  const sig = signature(m)
  const hit = cache.get(m)
  if (hit && hit.sig === sig) return hit

  const byId = new Map<number, Atom>()
  for (const a of m.atoms) byId.set(a.id, a)
  const adj = new Map<number, Nb[]>()
  for (const a of m.atoms) adj.set(a.id, [])
  const bonds: Bond[] = []
  const seenPair = new Set<string>()
  for (const b of m.bonds) {
    if (b.a === b.b || !byId.has(b.a) || !byId.has(b.b)) continue
    const key = b.a < b.b ? `${b.a}:${b.b}` : `${b.b}:${b.a}`
    if (seenPair.has(key)) continue
    seenPair.add(key)
    bonds.push(b)
    adj.get(b.a)!.push({ id: b.b, bond: b })
    adj.get(b.b)!.push({ id: b.a, bond: b })
  }

  const an: Analysis = {
    sig, byId, adj, bonds, rings: [], ringAtoms: new Set(), aromaticAtoms: new Set(),
    aromaticBonds: new Set(), heteroAromaticAtoms: new Set(), geo: new Map(), charges: null,
  }
  an.rings = findRings(m, an).map((r) => ({ ...r, aromatic: false }))
  for (const r of an.rings) for (const id of r.atoms) an.ringAtoms.add(id)
  perceiveAromatic(an)
  cache.set(m, an)
  return an
}

// ---------------------------------------------------------------------------------------------
// Ring perception: SSSR via Horton candidates + GF(2) elimination
// ---------------------------------------------------------------------------------------------

function findRings(m: Molecule, an: Analysis): { atoms: number[]; bonds: number[] }[] {
  // 2-core: iteratively strip atoms with fewer than two ring neighbours.
  const deg = new Map<number, number>()
  const removed = new Set<number>()
  for (const a of m.atoms) deg.set(a.id, an.adj.get(a.id)!.length)
  const stack: number[] = []
  for (const [id, d] of deg) if (d <= 1) stack.push(id)
  while (stack.length) {
    const id = stack.pop()!
    if (removed.has(id)) continue
    removed.add(id)
    for (const nb of an.adj.get(id)!) {
      if (removed.has(nb.id)) continue
      const d = deg.get(nb.id)! - 1
      deg.set(nb.id, d)
      if (d <= 1) stack.push(nb.id)
    }
  }
  const core = m.atoms.filter((a) => !removed.has(a.id)).map((a) => a.id)
  if (core.length < 3) return []

  // core edges
  const edgeIndex = new Map<string, number>()
  const edges: { a: number; b: number; bondId: number }[] = []
  const cadj = new Map<number, { id: number; edge: number }[]>()
  for (const id of core) cadj.set(id, [])
  for (const b of an.bonds) {
    if (removed.has(b.a) || removed.has(b.b)) continue
    const idx = edges.length
    edges.push({ a: b.a, b: b.b, bondId: b.id })
    edgeIndex.set(b.a < b.b ? `${b.a}:${b.b}` : `${b.b}:${b.a}`, idx)
    cadj.get(b.a)!.push({ id: b.b, edge: idx })
    cadj.get(b.b)!.push({ id: b.a, edge: idx })
  }

  // cycle rank = E - V + C of the core
  const seen = new Set<number>()
  let comps = 0
  for (const id of core) {
    if (seen.has(id)) continue
    comps++
    const st = [id]
    seen.add(id)
    while (st.length) {
      const u = st.pop()!
      for (const nb of cadj.get(u)!) if (!seen.has(nb.id)) { seen.add(nb.id); st.push(nb.id) }
    }
  }
  const rank = edges.length - core.length + comps
  if (rank <= 0) return []

  // Horton candidate cycles
  interface Cand { len: number; edgeSet: number[]; atoms: number[] }
  const cands: Cand[] = []
  const dedupe = new Set<string>()
  for (const root of core) {
    const parent = new Map<number, number>()
    const parentEdge = new Map<number, number>()
    const depth = new Map<number, number>()
    const branch = new Map<number, number>()
    depth.set(root, 0)
    branch.set(root, root)
    const queue = [root]
    for (let qi = 0; qi < queue.length; qi++) {
      const u = queue[qi]
      for (const nb of cadj.get(u)!) {
        if (depth.has(nb.id)) continue
        depth.set(nb.id, depth.get(u)! + 1)
        parent.set(nb.id, u)
        parentEdge.set(nb.id, nb.edge)
        branch.set(nb.id, u === root ? nb.id : branch.get(u)!)
        queue.push(nb.id)
      }
    }
    for (let ei = 0; ei < edges.length; ei++) {
      const { a, b } = edges[ei]
      if (!depth.has(a) || !depth.has(b)) continue
      if (parent.get(a) === b || parent.get(b) === a) continue
      if (a === root || b === root) continue
      if (branch.get(a) === branch.get(b)) continue
      const pathA: number[] = []
      for (let x: number | undefined = a; x !== undefined; x = parent.get(x)) pathA.push(x) // a ... root
      const pathB: number[] = []
      for (let x: number | undefined = b; x !== undefined && x !== root; x = parent.get(x)) pathB.push(x) // b ... child
      const edgeSet: number[] = [ei]
      for (let x = a; x !== root; x = parent.get(x)!) edgeSet.push(parentEdge.get(x)!)
      for (let x = b; x !== root; x = parent.get(x)!) edgeSet.push(parentEdge.get(x)!)
      const key = [...edgeSet].sort((p, q) => p - q).join(',')
      if (dedupe.has(key)) continue
      dedupe.add(key)
      cands.push({ len: edgeSet.length, edgeSet, atoms: [...pathA.reverse(), ...pathB] })
    }
  }
  cands.sort((p, q) => p.len - q.len)

  // GF(2) elimination, smallest first
  const words = Math.ceil(edges.length / 32)
  const basis: { vec: Uint32Array; pivot: number }[] = []
  const picked: Cand[] = []
  for (const c of cands) {
    const vec = new Uint32Array(words)
    for (const e of c.edgeSet) vec[e >>> 5] ^= 1 << (e & 31)
    for (const bs of basis) {
      if (vec[bs.pivot >>> 5] & (1 << (bs.pivot & 31))) for (let w = 0; w < words; w++) vec[w] ^= bs.vec[w]
    }
    let pivot = -1
    for (let w = 0; w < words && pivot < 0; w++) {
      if (vec[w] !== 0) {
        for (let bit = 0; bit < 32; bit++) if (vec[w] & (1 << bit)) { pivot = w * 32 + bit; break }
      }
    }
    if (pivot < 0) continue
    basis.push({ vec, pivot })
    picked.push(c)
    if (picked.length >= rank) break
  }

  return picked.map((c) => {
    const bondIds: number[] = []
    for (let i = 0; i < c.atoms.length; i++) {
      const u = c.atoms[i]
      const v = c.atoms[(i + 1) % c.atoms.length]
      const idx = edgeIndex.get(u < v ? `${u}:${v}` : `${v}:${u}`)
      bondIds.push(idx === undefined ? -1 : edges[idx].bondId)
    }
    return { atoms: c.atoms, bonds: bondIds }
  })
}

// ---------------------------------------------------------------------------------------------
// Aromaticity: Hueckel 4n+2 on rings whose atoms are all sp2-type pi contributors
// ---------------------------------------------------------------------------------------------

/**
 * Pi electrons an atom contributes to a ring (given as the set R of atoms of the ring or ring system),
 * or null when the atom cannot take part in an aromatic pi system (sp3, cumulated, triple bonded...).
 * Conventions (same as RDKit / CDK):
 *  - ring double bond: 1;  exocyclic C=O, C=N (more electronegative partner): 0;
 *  - double bond to the neighbouring ring of a fused system: 1;
 *  - pyrrole-type N (3 sigma bonds or N-H), furan/thiophene O/S with a lone pair: 2;
 *  - carbanion: 2, carbocation / planar B: 0.
 */
function piElectrons(an: Analysis, a: Atom, R: Set<number>): number | null {
  const nbs = an.adj.get(a.id)!
  let dbl: Nb | null = null
  let nd = 0
  for (const nb of nbs) {
    if (nb.bond.order === 3) return null
    if (nb.bond.order === 2) { nd++; dbl = nb }
  }
  if (nd > 1) return null
  if (dbl) {
    const x = an.byId.get(dbl.id)!
    if (R.has(x.id)) return 1
    const fused = an.rings.some((r) => r.atoms.includes(x.id) && r.atoms.filter((id) => R.has(id)).length >= 2)
    if (fused) return 1
    if (el(x.symbol).en > el(a.symbol).en) return 0
    return null
  }
  const deg = nbs.length
  switch (a.symbol) {
    case 'C':
      if (a.charge === -1 && deg <= 3) return 2
      if (a.charge === 1 && deg <= 3) return 0
      return null
    case 'B':
      return a.charge === 0 && deg <= 3 ? 0 : null
    case 'N':
      return a.charge === 0 && deg <= 3 ? 2 : null
    case 'O':
    case 'S':
      return a.charge === 0 && deg === 2 ? 2 : null
    default:
      return null
  }
}

function electronSum(an: Analysis, atomIds: number[]): number | null {
  const R = new Set(atomIds)
  let sum = 0
  for (const id of atomIds) {
    const e = piElectrons(an, an.byId.get(id)!, R)
    if (e === null) return null
    sum += e
  }
  return sum
}

const isHueckel = (n: number) => n >= 2 && (n - 2) % 4 === 0

function perceiveAromatic(an: Analysis): void {
  const { rings } = an
  for (const r of rings) {
    if (r.atoms.length < 3 || r.atoms.length > 7) continue
    const s = electronSum(an, r.atoms)
    if (s !== null && isHueckel(s)) r.aromatic = true
  }
  // fused envelopes (azulene-like): two non-aromatic rings sharing one bond
  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      const ri = rings[i], rj = rings[j]
      if (ri.aromatic || rj.aromatic) continue
      const shared = ri.atoms.filter((id) => rj.atoms.includes(id))
      if (shared.length !== 2) continue
      const union = [...new Set([...ri.atoms, ...rj.atoms])]
      if (union.length > 11) continue
      const s = electronSum(an, union)
      if (s !== null && isHueckel(s)) { ri.aromatic = true; rj.aromatic = true }
    }
  }
  for (const r of rings) {
    if (!r.aromatic) continue
    for (const id of r.atoms) an.aromaticAtoms.add(id)
    for (const b of r.bonds) if (b >= 0) an.aromaticBonds.add(b)
    if (r.atoms.some((id) => an.byId.get(id)!.symbol !== 'C')) for (const id of r.atoms) an.heteroAromaticAtoms.add(id)
  }
}

/** Rings (SSSR) of the molecule with their aromatic flag. */
export function perceiveRings(m: Molecule): RingInfo[] {
  return analyze(m).rings.map((r) => ({ atoms: [...r.atoms], bonds: [...r.bonds], aromatic: r.aromatic }))
}

/**
 * Returns a copy of the molecule whose bonds carry `aromatic: true` exactly for the bonds of
 * aromatic rings (Hueckel 4n+2 perception on the Kekule bond orders). Orders are not changed.
 */
export function perceiveAromaticity(m: Molecule): Molecule {
  const out = cloneMolecule(m)
  const an = analyze(m)
  for (const b of out.bonds) {
    if (an.aromaticBonds.has(b.id)) b.aromatic = true
    else delete b.aromatic
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Hybridization and VSEPR geometry
// ---------------------------------------------------------------------------------------------

const GEOMETRY: Record<string, [string, string]> = {
  // key "<steric number>:<lone pairs>"
  '2:0': ['Doğrusal', 'Linear'],
  '3:0': ['Üçgen düzlem', 'Trigonal planar'],
  '3:1': ['Kırık doğru (açısal)', 'Bent'],
  '4:0': ['Düzgün dörtyüzlü', 'Tetrahedral'],
  '4:1': ['Üçgen piramit', 'Trigonal pyramidal'],
  '4:2': ['Kırık doğru (açısal)', 'Bent'],
  '5:0': ['Üçgen çift piramit', 'Trigonal bipyramidal'],
  '5:1': ['Tahterevalli (see-saw)', 'Seesaw'],
  '5:2': ['T şekilli', 'T-shaped'],
  '5:3': ['Doğrusal', 'Linear'],
  '6:0': ['Sekizyüzlü (oktahedral)', 'Octahedral'],
  '6:1': ['Kare piramit', 'Square pyramidal'],
  '6:2': ['Kare düzlem', 'Square planar'],
}

function geoOf(an: Analysis, id: number): GeoInfo {
  const hit = an.geo.get(id)
  if (hit) return hit
  const a = an.byId.get(id)!
  const nbs = an.adj.get(id)!
  const deg = nbs.length
  let used = 0
  for (const nb of nbs) used += nb.bond.order
  const V = VALENCE_ELECTRONS[a.symbol] ?? 4
  const lp = Math.max(0, Math.floor((V - a.charge - used) / 2))
  let sn = deg + lp
  let g: GeoInfo
  const metal = a.symbol === 'Na' || a.symbol === 'Mg'
  // Missing H / under- or over-valent: hybridization, geometry and lone pairs cannot be derived honestly.
  let incomplete = false
  if (!metal && a.symbol !== 'H') {
    const allowed = allowedValences(a)
    incomplete = allowed.length > 0 && !allowed.includes(used)
  } else if (a.symbol === 'H') {
    incomplete = used > 1
  }
  // Hypervalent S / P (more bonds than the standard valence): sp3 label would be wrong
  const hypervalent = (a.symbol === 'S' && used > 2 + Math.abs(a.charge)) || (a.symbol === 'P' && used > 3 + Math.abs(a.charge))

  if (metal) {
    g = { hyb: '—', sn, lp, geometry: 'Metal (iyonik)', geometryEn: 'Metal (ionic)', incomplete }
  } else if (deg === 0) {
    g = { hyb: a.symbol === 'H' ? 's' : '—', sn, lp, geometry: 'Tek atom', geometryEn: 'Single atom', incomplete }
  } else if (a.symbol === 'H') {
    g = { hyb: 's', sn, lp, geometry: 'Uç atom (tek komşu)', geometryEn: 'Terminal atom (one neighbour)', incomplete }
  } else if (incomplete) {
    g = { hyb: '—', sn: deg, lp: 0, geometry: 'hesaplanamadı (yapı eksik)', geometryEn: 'not computable (incomplete structure)', incomplete }
  } else {
    let hyb: Hyb = sn === 2 ? 'sp' : sn === 3 ? 'sp2' : sn === 4 ? 'sp3' : '—'
    let tr: string, en: string
    if (deg === 1) {
      tr = 'Uç atom (tek komşu)'
      en = 'Terminal atom (one neighbour)'
    } else {
      const names = GEOMETRY[`${sn}:${lp}`]
      tr = names ? names[0] : '—'
      en = names ? names[1] : '—'
    }
    // Lone pair delocalised into a pi system -> planar, sp2 (amide / aniline / pyrrole N, furan O, thiophene S).
    if (sn === 4 && lp >= 1 && !nbs.some((nb) => nb.bond.order >= 2)) {
      const aromaticLP = an.aromaticAtoms.has(id) && (a.symbol === 'N' || a.symbol === 'O' || a.symbol === 'S')
      const conjugatedN =
        a.symbol === 'N' && lp === 1 && deg === 3 &&
        nbs.some((nb) => {
          const x = an.byId.get(nb.id)!
          return (x.symbol === 'C' || x.symbol === 'N') && an.adj.get(x.id)!.some((o) => o.id !== id && o.bond.order >= 2)
        })
      if (aromaticLP || conjugatedN) {
        hyb = 'sp2'
        // one lone pair sits in the p orbital (delocalised): it is not a steric domain of the planar sigma frame
        sn = sn - 1
        if (deg === 3) { tr = 'Üçgen düzlem (konjuge)'; en = 'Trigonal planar (conjugated)' }
        else { tr = 'Kırık doğru (konjuge)'; en = 'Bent (conjugated)' }
      }
    }
    if (hypervalent) hyb = '—'
    g = { hyb, sn, lp, geometry: tr, geometryEn: en, incomplete }
  }
  an.geo.set(id, g)
  return g
}

// ---------------------------------------------------------------------------------------------
// Gasteiger-Marsili PEOE partial charges (approximate)
// ---------------------------------------------------------------------------------------------

/** Orbital electronegativity chi(q) = a + b q + c q^2, Gasteiger & Marsili, Tetrahedron 36 (1980) 3219. */
type Peoe = [number, number, number]
function peoeParams(a: Atom, geo: GeoInfo, aromatic: boolean): Peoe | null {
  const h = aromatic && geo.hyb === 'sp3' ? 'sp2' : geo.hyb
  switch (a.symbol) {
    case 'H': return [7.17, 6.24, -0.56]
    case 'C': return h === 'sp' ? [10.39, 9.45, 0.73] : h === 'sp2' ? [8.79, 9.32, 1.51] : [7.98, 9.18, 1.88]
    case 'N': return h === 'sp' ? [15.68, 11.7, -0.27] : h === 'sp2' ? [12.87, 11.15, 0.85] : [11.54, 10.82, 1.36]
    case 'O': return h === 'sp2' || h === 'sp' ? [17.07, 13.79, 0.47] : [14.18, 12.92, 1.39]
    case 'F': return [14.66, 13.85, 2.31]
    case 'Cl': return [11.0, 9.69, 1.35]
    case 'Br': return [10.08, 8.47, 1.16]
    case 'I': return [9.9, 7.96, 0.96]
    case 'S': return h === 'sp2' ? [10.88, 9.49, 1.33] : [10.14, 9.13, 1.38]
    case 'P': return [8.9, 8.24, 0.96]
    default: return null // B, Na, Mg, Si: no published PEOE parameters -> exchange skipped, charge stays formal
  }
}

/** true when the PEOE charge of this atom is not computable (no parameters / incomplete / blocked by such a partner) */
function chargeBlocked(an: Analysis, id: number): boolean {
  const bad = (x: number) => peoeParams(an.byId.get(x)!, geoOf(an, x), an.aromaticAtoms.has(x)) === null || geoOf(an, x).incomplete
  if (bad(id)) return true
  return an.adj.get(id)!.some((nb) => bad(nb.id))
}

function gasteiger(an: Analysis): Map<number, number> {
  if (an.charges) return an.charges
  const q = new Map<number, number>()
  const params = new Map<number, Peoe>()
  for (const a of an.byId.values()) {
    q.set(a.id, a.charge)
    const p = peoeParams(a, geoOf(an, a.id), an.aromaticAtoms.has(a.id))
    if (p) params.set(a.id, p)
  }
  const chi = (id: number): number => {
    const [A, B, C] = params.get(id)!
    const x = q.get(id)!
    return A + B * x + C * x * x
  }
  for (let it = 1; it <= 6; it++) {
    const damp = 0.5 ** it
    const dq = new Map<number, number>()
    for (const b of an.bonds) {
      const pa = params.get(b.a), pb = params.get(b.b)
      if (!pa || !pb) continue
      const xa = chi(b.a), xb = chi(b.b)
      if (xa === xb) continue
      const donor = xa < xb ? b.a : b.b
      const acceptor = donor === b.a ? b.b : b.a
      const pd = params.get(donor)!
      const chiPlus = an.byId.get(donor)!.symbol === 'H' ? 20.02 : pd[0] + pd[1] + pd[2]
      const t = ((donor === b.a ? xb - xa : xa - xb) / chiPlus) * damp
      dq.set(donor, (dq.get(donor) ?? 0) + t)
      dq.set(acceptor, (dq.get(acceptor) ?? 0) - t)
    }
    for (const [id, d] of dq) q.set(id, q.get(id)! + d)
  }
  an.charges = q
  return q
}

// ---------------------------------------------------------------------------------------------
// Atom / bond info
// ---------------------------------------------------------------------------------------------

const labelRank = (s: string) => (s === 'H' ? 2 : s === 'C' ? 0 : 1)

export function atomInfo(m: Molecule, id: number): AtomInfo | null {
  const an = analyze(m)
  const a = an.byId.get(id)
  if (!a) return null
  const e = el(a.symbol)
  const g = geoOf(an, id)
  const used = valenceUsed(m, id)
  // target valence: lowest allowed valence that accommodates the current bonding
  const valence = targetValence(m, a)
  return {
    id,
    symbol: a.symbol,
    name: e.name,
    z: e.z,
    hybridization: g.hyb,
    geometry: g.geometry,
    geometryEn: g.geometryEn,
    stericNumber: g.sn,
    lonePairs: g.lp,
    valenceUsed: used,
    valence,
    formalCharge: a.charge,
    neighbours: an.adj.get(id)!.map((nb) => `${an.byId.get(nb.id)!.symbol}${nb.id}`),
    mass: e.mass,
    en: e.en,
    covalentRadius: e.covalent,
    position: [...a.pos] as Vec3,
    state: valenceState(m, a),
    incomplete: g.incomplete,
    partialCharge: chargeBlocked(an, id) ? null : round(gasteiger(an).get(id) ?? a.charge, 3),
  }
}

export function bondInfo(m: Molecule, id: number): BondInfo | null {
  const an = analyze(m)
  const b = an.bonds.find((x) => x.id === id)
  if (!b) return null
  const A = an.byId.get(b.a)!, B = an.byId.get(b.b)!
  const aromatic = an.aromaticBonds.has(b.id)
  const order = aromatic ? 1.5 : b.order
  const sym = aromatic ? ':' : b.order === 1 ? '-' : b.order === 2 ? '=' : '≡'
  const [first, second] =
    labelRank(A.symbol) < labelRank(B.symbol) || (labelRank(A.symbol) === labelRank(B.symbol) && A.symbol <= B.symbol) ? [A, B] : [B, A]
  const ea = el(A.symbol), eb = el(B.symbol)
  const deltaEN = round(Math.abs(ea.en - eb.en), 2)
  const idealLength = bondTargetLength(A.symbol, B.symbol, b.order, aromatic)
  return {
    id,
    label: `${first.symbol}${sym}${second.symbol}`,
    order,
    orderName: aromatic ? 'Aromatik bağ (σ + delokalize π)' : BOND_NAMES[b.order] ?? '',
    orderNameEn: aromatic ? 'Aromatic bond (σ + delocalised π)' : BOND_NAMES_EN[b.order] ?? '',
    length: dist(A.pos, B.pos),
    idealLength,
    deltaEN,
    polarity: deltaEN < 0.4 ? 'apolar' : deltaEN <= 1.7 ? 'polar' : 'ionic',
    aromatic,
    inRing: inRing(m, b),
    sigma: 1,
    // Kekule pi count (order 2 -> 1, order 1 -> 0); aromaticity is reported separately via `aromatic`
    pi: b.order - 1,
  }
}

// ---------------------------------------------------------------------------------------------
// Molecule properties
// ---------------------------------------------------------------------------------------------

const FG_ORDER: [string, string][] = [
  ['alcohol', 'alkol'],
  ['phenol', 'fenol'],
  ['ether', 'eter'],
  ['aldehyde', 'aldehit'],
  ['ketone', 'keton'],
  ['carboxylicAcid', 'karboksilik asit'],
  ['ester', 'ester'],
  ['amine', 'amin'],
  ['amide', 'amit'],
  ['nitrile', 'nitril'],
  ['alkene', 'alken'],
  ['alkyne', 'alkin'],
  ['aromaticRing', 'aromatik halka'],
  ['halide', 'halojenür'],
  ['thiol', 'tiyol'],
  ['nitro', 'nitro'],
]

function functionalGroupIds(m: Molecule, an: Analysis): Set<string> {
  const found = new Set<string>()
  const atom = (id: number) => an.byId.get(id)!
  const heavy = (id: number) => an.adj.get(id)!.filter((nb) => atom(nb.id).symbol !== 'H')
  const hCount = (a: Atom) => an.adj.get(a.id)!.filter((nb) => atom(nb.id).symbol === 'H').length + missingHydrogens(m, a)
  const hasMultiple = (id: number) => an.adj.get(id)!.some((nb) => nb.bond.order >= 2)
  /** the oxygen of a C=O, if the carbon is a carbonyl carbon */
  const carbonylO = (c: Atom): number | null => {
    if (c.symbol !== 'C') return null
    for (const nb of an.adj.get(c.id)!) if (nb.bond.order === 2 && atom(nb.id).symbol === 'O') return nb.id
    return null
  }

  for (const a of m.atoms) {
    if (!an.adj.has(a.id)) continue
    const nbs = an.adj.get(a.id)!
    const hv = heavy(a.id)

    if (a.symbol === 'C') {
      const oDouble = carbonylO(a)
      if (oDouble !== null) {
        const others = hv.filter((nb) => nb.id !== oDouble)
        for (const nb of others) {
          if (nb.bond.order !== 1) continue
          const x = atom(nb.id)
          if (x.symbol === 'O' && x.charge === 0) {
            const xh = hCount(x)
            const xother = heavy(x.id).filter((o) => o.id !== a.id)
            if (xh >= 1 && xother.length === 0) found.add('carboxylicAcid')
            else if (xother.some((o) => atom(o.id).symbol === 'C')) found.add('ester')
          } else if (x.symbol === 'N') {
            found.add('amide')
          }
        }
        const allCarbon = others.every((nb) => atom(nb.id).symbol === 'C')
        if (allCarbon) {
          if (hCount(a) >= 1 && others.length <= 1) found.add('aldehyde')
          else if (others.length === 2) found.add('ketone')
        }
      }
    } else if (a.symbol === 'O') {
      if (a.charge !== 0 || hasMultiple(a.id) || an.aromaticAtoms.has(a.id)) continue
      const h = hCount(a)
      if (hv.length === 1 && h === 1) {
        const c = atom(hv[0].id)
        if (c.symbol === 'C' && carbonylO(c) === null) {
          if (an.aromaticAtoms.has(c.id)) found.add('phenol')
          else if (!hasMultiple(c.id)) found.add('alcohol')
        }
      } else if (hv.length === 2 && h === 0) {
        const [c1, c2] = [atom(hv[0].id), atom(hv[1].id)]
        if (c1.symbol === 'C' && c2.symbol === 'C' && carbonylO(c1) === null && carbonylO(c2) === null) found.add('ether')
      }
    } else if (a.symbol === 'N') {
      const terminalO = hv.filter((nb) => atom(nb.id).symbol === 'O' && heavy(nb.id).length === 1)
      if (terminalO.length >= 2) {
        found.add('nitro')
        continue
      }
      if (nbs.some((nb) => nb.bond.order === 3 && atom(nb.id).symbol === 'C')) found.add('nitrile')
      if (a.charge === 0 && !hasMultiple(a.id) && !an.aromaticAtoms.has(a.id) && hv.some((nb) => atom(nb.id).symbol === 'C')) {
        const acylLike = hv.some((nb) => {
          const x = atom(nb.id)
          if (x.symbol === 'S' || x.symbol === 'P') return hasMultiple(x.id)
          if (x.symbol !== 'C') return false
          if (an.heteroAromaticAtoms.has(x.id)) return true
          return an.adj.get(x.id)!.some((o) => o.bond.order === 2 && atom(o.id).symbol !== 'C')
        })
        if (!acylLike) found.add('amine')
      }
    } else if (a.symbol === 'S') {
      if (a.charge === 0 && hv.length === 1 && hCount(a) === 1 && atom(hv[0].id).symbol === 'C') found.add('thiol')
    } else if (a.symbol === 'F' || a.symbol === 'Cl' || a.symbol === 'Br' || a.symbol === 'I') {
      if (hv.length === 1 && atom(hv[0].id).symbol === 'C') found.add('halide')
    }
  }
  for (const b of an.bonds) {
    const A = atom(b.a), B = atom(b.b)
    if (A.symbol !== 'C' || B.symbol !== 'C') continue
    if (b.order === 2 && !an.aromaticBonds.has(b.id)) found.add('alkene')
    if (b.order === 3) found.add('alkyne')
  }
  if (an.rings.some((r) => r.aromatic)) found.add('aromaticRing')
  return found
}

/** Rotatable bonds: single, acyclic, non-aromatic bonds between two atoms that each have >= 2 heavy neighbours,
 *  excluding amide C-N, bonds next to triple bonds and rotors with 3 identical terminal substituents (CF3, tBu). */
function countRotatable(m: Molecule, an: Analysis): number {
  const atom = (id: number) => an.byId.get(id)!
  const heavy = (id: number) => an.adj.get(id)!.filter((nb) => atom(nb.id).symbol !== 'H')
  let n = 0
  for (const b of an.bonds) {
    if (b.order !== 1 || an.aromaticBonds.has(b.id) || inRing(m, b)) continue
    const A = atom(b.a), B = atom(b.b)
    if (A.symbol === 'H' || B.symbol === 'H') continue
    const ha = heavy(A.id), hb = heavy(B.id)
    if (ha.length < 2 || hb.length < 2) continue
    if (an.adj.get(A.id)!.some((nb) => nb.bond.order === 3) || an.adj.get(B.id)!.some((nb) => nb.bond.order === 3)) continue
    const isCarbonylC = (x: Atom) => x.symbol === 'C' && an.adj.get(x.id)!.some((nb) => nb.bond.order === 2 && atom(nb.id).symbol === 'O')
    if ((isCarbonylC(A) && B.symbol === 'N') || (isCarbonylC(B) && A.symbol === 'N')) continue
    const symmetricTop = (x: Atom, other: number) => {
      const terminals = heavy(x.id).filter((nb) => nb.id !== other && heavy(nb.id).length === 1)
      if (terminals.length < 3) return false
      const first = atom(terminals[0].id).symbol
      return terminals.filter((t) => atom(t.id).symbol === first).length >= 3
    }
    if (symmetricTop(A, B.id) || symmetricTop(B, A.id)) continue
    n++
  }
  return n
}

function sizeOf(m: Molecule): number {
  let best = 0
  for (let i = 0; i < m.atoms.length; i++) {
    for (let j = i + 1; j < m.atoms.length; j++) {
      const d = dist(m.atoms[i].pos, m.atoms[j].pos)
      if (d > best) best = d
    }
  }
  return best
}

const STD_VALENCE: Record<string, number> = { C: 4, H: 1, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1 }

/** Degrees of unsaturation, only for complete neutral C/H/N/O/halogen structures at standard valence; else null. */
function safeUnsaturation(m: Molecule): number | null {
  if (m.atoms.length === 0) return null
  for (const a of m.atoms) {
    const std = STD_VALENCE[a.symbol]
    if (std === undefined || a.charge !== 0) return null
    if (valenceUsed(m, a.id) !== std || missingHydrogens(m, a) !== 0) return null
  }
  return unsaturationOf(m)
}

export function molProperties(m: Molecule): MolProperties {
  const an = analyze(m)
  const counts = formulaCounts(m)
  const mass = molarMass(m)
  const netCharge = m.atoms.reduce((s, a) => s + a.charge, 0)

  let exact = 0
  for (const a of m.atoms) exact += MONO_MASS[a.symbol] ?? el(a.symbol).mass
  exact -= netCharge * ELECTRON_MASS

  const bondCounts = { single: 0, double: 0, triple: 0, aromatic: 0 }
  for (const b of an.bonds) {
    if (an.aromaticBonds.has(b.id)) bondCounts.aromatic++
    else if (b.order === 1) bondCounts.single++
    else if (b.order === 2) bondCounts.double++
    else bondCounts.triple++
  }

  const hasH = (a: Atom) => an.adj.get(a.id)!.some((nb) => an.byId.get(nb.id)!.symbol === 'H')
  // Lipinski convention: donors = N/O atoms bearing at least one H, acceptors = all N and O atoms.
  const hDonors = m.atoms.filter((a) => (a.symbol === 'N' || a.symbol === 'O') && hasH(a)).length
  const hAcceptors = m.atoms.filter((a) => a.symbol === 'N' || a.symbol === 'O').length

  const composition = hillOrder(counts).map((symbol) => ({
    symbol,
    count: counts[symbol],
    percent: mass > 0 ? round(((counts[symbol] * el(symbol).mass) / mass) * 100, 2) : 0,
  }))

  const fg = functionalGroupIds(m, an)
  const groups = FG_ORDER.filter(([id]) => fg.has(id))

  // Lipinski: only the 3 computable rules (logP is not computed)
  const violations = (mass > 500 ? 1 : 0) + (hDonors > 5 ? 1 : 0) + (hAcceptors > 10 ? 1 : 0)

  const issueDetails: IssueDetail[] = []
  const issues: string[] = []
  for (const a of m.atoms) {
    const state = valenceState(m, a)
    if (state === 'ok') continue
    const used = valenceUsed(m, a.id)
    const allowed = allowedValences(a)
    const max = Math.max(0, ...allowed)
    if (state === 'over') {
      issueDetails.push({ code: 'valenceOver', atomId: a.id, symbol: a.symbol, used, allowed })
      issues.push(`Değerlik aşıldı: ${a.symbol} en fazla ${max} bağ yapabilir (atom ${a.id}, şu an ${used})`)
    } else if (allowed.some((v) => v > used) && !allowed.some((v) => v < used)) {
      issueDetails.push({ code: 'valenceUnder', atomId: a.id, symbol: a.symbol, used, allowed })
      issues.push(`Eksik değerlik: ${a.symbol} ${used} bağ yapıyor, ${allowed.join(' veya ')} olmalı (atom ${a.id})`)
    } else {
      issueDetails.push({ code: 'valenceInvalid', atomId: a.id, symbol: a.symbol, used, allowed })
      issues.push(`Geçersiz değerlik: ${a.symbol} ${used} bağ yapıyor; geçerli değerlikler ${allowed.join(' veya ')} (atom ${a.id})`)
    }
  }
  for (let i = 0; i < m.atoms.length; i++) {
    for (let j = i + 1; j < m.atoms.length; j++) {
      const d = dist(m.atoms[i].pos, m.atoms[j].pos)
      if (d < 0.5) {
        issueDetails.push({ code: 'overlap', atomId: m.atoms[i].id, symbol: m.atoms[i].symbol, otherAtomId: m.atoms[j].id, distance: round(d, 3) })
        issues.push(`Çakışan atomlar: ${m.atoms[i].symbol}${m.atoms[i].id} ve ${m.atoms[j].symbol}${m.atoms[j].id} arası ${round(d, 3)} Å`)
      }
    }
  }

  return {
    formula: formula(m, true),
    formulaPlain: formula(m, false),
    mass,
    exactMass: exact,
    atomCount: m.atoms.length,
    heavyAtomCount: m.atoms.filter((a) => a.symbol !== 'H').length,
    bondCount: m.bonds.length,
    bondCounts,
    rings: ringCount(m),
    aromaticRings: an.rings.filter((r) => r.aromatic).length,
    unsaturation: safeUnsaturation(m),
    hDonors,
    hAcceptors,
    rotatableBonds: countRotatable(m, an),
    composition,
    netCharge,
    components: connectedComponents(m).length,
    sizeAng: sizeOf(m),
    functionalGroups: groups.map(([, tr]) => tr),
    functionalGroupIds: groups.map(([id]) => id),
    lipinski: { passes: violations === 0, violations, rulesEvaluated: 3 },
    issues,
    issueDetails,
  }
}
