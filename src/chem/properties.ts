/**
 * Molecular properties: per-atom / per-bond / whole-molecule values that are CALCULATED from the
 * molecule graph (never looked up for the specific molecule and never invented).
 *
 * Honesty notes (SPEC sections 5, 8):
 *  - No dipole moment, no logP, no melting/boiling point is computed anywhere in this module.
 *  - Gasteiger-Marsili partial charges are an empirical estimate (PEOE, 6 iterations) and are
 *    labelled approximate by the UI. Only parameters of the cited 1980 table are used (H, C, N, O, F, Cl, Br, I and divalent
 *    sp3 S); an atom without such a parameter, and its neighbours, get `partialCharge: null` instead of an extrapolated value.
 *  - VSEPR (steric number, lone pairs, conjugated N) comes from geometry.ts `electronDomains` (SPEC A4.2): there is no second
 *    implementation here; the only local addition is the aromatic O / S lone pair delocalised into the ring.
 *  - Lipinski's rule of five normally has four rules (MW <= 500, HBD <= 5, HBA <= 10, logP <= 5).
 *    logP is NOT computed here, so only the three computable rules are evaluated and
 *    `lipinski.rulesEvaluated` says so (3, never 4).
 *  - Hydrogen counts for donors / functional groups use the explicit hydrogens of the molecule.
 *
 * Results of the graph analysis (rings, aromaticity, hybridization) and the topology-only part of
 * `molProperties` are cached by a structural signature (atoms, charges, bonds, orders), so a cloned
 * molecule with the same topology (drag / relax frames) is analysed once. Coordinate-dependent values
 * (size, overlap scan, lengths, positions) are always computed from the molecule that is passed in.
 * Stored values are never rounded (SPEC A2.3): rounding is the formatter's job.
 */
import { BOND_NAMES, BOND_NAMES_EN, VALENCE_ELECTRONS, el } from './elements'
import { bondTargetLength, electronDomains } from './geometry'
import {
  type Atom,
  type Bond,
  type Molecule,
  type Vec3,
  allowedValences,
  cloneMolecule,
  dist,
  formula,
  formulaCounts,
  hillOrder,
  missingHydrogens,
  molarMass,
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
  /**
   * Hybridisation as it may be SHOWN (SPEC A4.2): sp / sp2 / sp3 only for complete C, N, O and B atoms;
   * '—' for everything else (halogens, S, P, Si, metals, H, incomplete atoms). 's' is never returned.
   */
  hybridization: 'sp' | 'sp2' | 'sp3' | 's' | '—'
  /** true when the hybridisation row may be rendered (hybridization is sp / sp2 / sp3) */
  showHybridization: boolean
  /** true when steric number / lone pairs / geometry rows are meaningful (central atom, >= 2 neighbours, complete, not a metal / ion) */
  showVsepr: boolean
  /** Turkish VSEPR geometry name */
  geometry: string
  /** English VSEPR geometry name (additive, for the English UI) */
  geometryEn: string
  stericNumber: number
  /** lone pairs that count as VSEPR electron domains: steric number = sigma + lonePairs (drives AX_nE_m, ideal angle) */
  lonePairs: number
  /**
   * ALL lone pairs by the A4.2 formula LP = (VE - q - sum of bond orders) / 2. Equals lonePairs except where one pair is
   * delocalised into a pi system (aniline / amide / pyrrole N, furan O, thiophene S): there lonePairsTotal - lonePairs pairs
   * are not counted as domains. The Inspector should show lonePairsTotal and qualify the difference.
   */
  lonePairsTotal: number
  /** lone pairs delocalised into pi (lonePairsTotal - lonePairs); 0 for ordinary centres */
  lonePairsDelocalised: number
  /**
   * Ready-to-render lone pair label that follows the A4.2 formula (total pairs) and qualifies delocalised pairs, e.g. aniline N
   * "1 (π sistemine delokalize)", furan O "2 (1 tanesi π sistemine delokalize)", water O "2". "—" when not computable.
   */
  lonePairsText: string
  lonePairsTextEn: string
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
  /** pi bond order: 0 / 1 / 2 for Kekule bonds, 0.5 for every aromatic bond (order 1.5 = sigma 1 + pi 0.5) */
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
  /**
   * Lipinski rule-of-five counts. logP is not computed: only 3 of 4 rules are evaluated (see file header),
   * so NO overall pass / fail verdict is returned. `qualifier` is the text that must accompany the counts.
   */
  lipinski: { violations: number; rulesEvaluated: number; rulesTotal: number; qualifier: string; qualifierEn: string }
  /** Sum of implicit hydrogens still missing (SPEC A2.2); formula, mass and composition count drawn atoms only. */
  missingHydrogenCount: number
  /** Turkish incomplete-structure note ("Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir"), null when complete. */
  incompleteNote: string | null
  /** English incomplete-structure note, null when complete. */
  incompleteNoteEn: string | null
  /** Turkish human-readable valence / geometry problems */
  issues: string[]
  /** Structured form of `issues`, same order (additive; lets the UI translate) */
  issueDetails: IssueDetail[]
}

export interface IssueDetail {
  code: 'valenceOver' | 'valenceUnder' | 'valenceInvalid' | 'overlap'
  /**
   * Refines 'valenceInvalid'. 'needsOF': the bond count is numerically one of the element's valences but a hypervalent S / P /
   * halogen needs an O or F neighbour (SPEC A1.3); `allowed` then lists only the valence(s) that ARE valid for this atom, and
   * `message` / `messageEn` carry ready-made text (the UI can show them instead of the generic 'invalid valence' sentence).
   */
  reason?: 'needsOF'
  message?: string
  messageEn?: string
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

/** CODATA 2018 electron mass in u (SPEC A2.5). */
const ELECTRON_MASS = 0.000548579909065

// ---------------------------------------------------------------------------------------------
// Analysis cache
// ---------------------------------------------------------------------------------------------

type Hyb = AtomInfo['hybridization']
interface Nb { id: number; bond: Bond }
interface GeoInfo {
  /** internal hybridisation (also drives the PEOE parameter choice); NOT what the UI shows */
  hyb: Hyb
  /** shown hybridisation: sp / sp2 / sp3 for complete C, N, O, B only, else '—' (SPEC A4.2) */
  hybShown: Hyb
  /** VSEPR rows (steric number, lone pairs, geometry) are meaningful */
  vsepr: boolean
  sn: number
  /** lone pairs that count as VSEPR domains (sn = sigma + lp) */
  lp: number
  /** all lone pairs by the A4.2 formula LP = (VE - q - sum of bond orders) / 2 (includes pairs delocalised into pi) */
  lpTotal: number
  geometry: string
  geometryEn: string
  incomplete: boolean
}
interface Analysis {
  sig: string
  nAtoms: number
  nBonds: number
  /** atoms of the molecule this analysis was built from: use ONLY for symbol / charge (positions may be stale) */
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
  /** topology-only molecule view built lazily for geometry.ts electronDomains */
  mol?: Molecule
  charges: Map<number, number> | null
  /** atoms whose PEOE charge is not computable (whole connected components containing a blocked atom), built lazily */
  chargeBlockedIds?: Set<number>
  /** ids of bonds that lie on a ring (union of the SSSR bonds) */
  ringBonds: Set<number>
  /** number of connected components (over all atoms) */
  components: number
}

const cache = new WeakMap<Molecule, Analysis>()
/** Small LRU by topology signature: a cloned molecule with identical topology re-uses the analysis. */
const bySig = new Map<string, Analysis>()
const SIG_CACHE_MAX = 8

/**
 * Structural signature of a molecule: atom ids, symbols, charges, bond ids / endpoints / orders. Two
 * independent 32-bit FNV-style hashes + counts make an accidental collision practically impossible.
 * Coordinates are NOT part of it. Exported so callers can memoise on topology instead of object identity.
 */
export function topologyKey(m: Molecule): string {
  let h1 = 2166136261
  let h2 = 5381
  const mix = (n: number) => {
    const v = n | 0
    h1 ^= v
    h1 = Math.imul(h1, 16777619)
    h2 = (Math.imul(h2, 33) + v + 0x9e3779b9) | 0
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
  return `${(h1 >>> 0).toString(36)}.${(h2 >>> 0).toString(36)}.${m.atoms.length}.${m.bonds.length}`
}

function analyze(m: Molecule): Analysis {
  const sig = topologyKey(m)
  const hit = cache.get(m)
  if (hit && hit.sig === sig) return hit
  const shared = bySig.get(sig)
  if (shared && shared.nAtoms === m.atoms.length && shared.nBonds === m.bonds.length) {
    bySig.delete(sig)
    bySig.set(sig, shared) // refresh LRU position
    cache.set(m, shared)
    return shared
  }

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
    sig, nAtoms: m.atoms.length, nBonds: m.bonds.length, byId, adj, bonds, rings: [], ringAtoms: new Set(),
    aromaticAtoms: new Set(), aromaticBonds: new Set(), heteroAromaticAtoms: new Set(), geo: new Map(), charges: null,
    ringBonds: new Set(), components: 0,
  }
  an.rings = findRings(m, an).map((r) => ({ ...r, aromatic: false }))
  for (const r of an.rings) {
    for (const id of r.atoms) an.ringAtoms.add(id)
    for (const b of r.bonds) if (b >= 0) an.ringBonds.add(b)
  }
  perceiveAromatic(an)
  // connected components over adjacency (molecule.ts connectedComponents is O(n^3) on big molecules)
  const seen = new Set<number>()
  for (const a of m.atoms) {
    if (seen.has(a.id)) continue
    an.components++
    const st = [a.id]
    seen.add(a.id)
    while (st.length) {
      const u = st.pop()!
      for (const nb of adj.get(u)!) if (!seen.has(nb.id)) { seen.add(nb.id); st.push(nb.id) }
    }
  }
  cache.set(m, an)
  bySig.set(sig, an)
  if (bySig.size > SIG_CACHE_MAX) bySig.delete(bySig.keys().next().value as string)
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
  '3:0': ['Düzlem üçgen', 'Trigonal planar'],
  '3:1': ['Kırık doğru (açısal)', 'Bent'],
  '4:0': ['Düzgün dörtyüzlü', 'Tetrahedral'],
  '4:1': ['Üçgen piramit', 'Trigonal pyramidal'],
  '4:2': ['Kırık doğru (açısal)', 'Bent'],
  // SN 5 and 6 (SPEC A4.3): only the lone-pair-free shapes are named; the lone-pair variants are "hesaplanamadı".
  '5:0': ['Üçgen çift piramit', 'Trigonal bipyramidal'],
  '6:0': ['Düzgün sekizyüzlü', 'Octahedral'],
}

const NOT_COMPUTABLE: [string, string] = ['hesaplanamadı', 'not computable']

/** Minimal molecule view of the analysis (topology only) so geometry.ts `electronDomains` can classify an atom. */
function topologyMolecule(an: Analysis): Molecule {
  if (an.mol) return an.mol
  const bonds = an.bonds.map((b) => (an.aromaticBonds.has(b.id) ? { ...b, aromatic: true } : b))
  an.mol = { id: 'analysis', name: 'analysis', atoms: [...an.byId.values()], bonds, nextId: 1 }
  return an.mol
}

/** Lone pair label from the A4.2 total with the pi-delocalised part qualified (one rule for N, aromatic O and aromatic S). */
function lonePairLabels(g: GeoInfo): { lonePairsText: string; lonePairsTextEn: string } {
  if (g.incomplete) return { lonePairsText: '—', lonePairsTextEn: '—' }
  const deloc = Math.max(0, g.lpTotal - g.lp)
  if (deloc === 0) return { lonePairsText: String(g.lpTotal), lonePairsTextEn: String(g.lpTotal) }
  const all = deloc === g.lpTotal
  return {
    lonePairsText: `${g.lpTotal} (${all ? '' : `${deloc} tanesi `}π sistemine delokalize)`,
    lonePairsTextEn: `${g.lpTotal} (${all ? '' : `${deloc} of them `}delocalised into the π system)`,
  }
}

function geoOf(an: Analysis, id: number): GeoInfo {
  const hit = an.geo.get(id)
  if (hit) return hit
  const a = an.byId.get(id)!
  const nbs = an.adj.get(id)!
  const deg = nbs.length
  let used = 0
  for (const nb of nbs) used += nb.bond.order
  // The ONE VSEPR classification lives in geometry.ts (SPEC A4.2): sigma neighbours, lone pairs, steric number = sigma + lp.
  const dom = electronDomains(topologyMolecule(an), a)
  let sn = dom.sn
  let lp = dom.lp
  // all lone pairs by the A4.2 formula (geometry.ts forces 0 for a conjugated N: its pair is counted as pi there)
  const ve = VALENCE_ELECTRONS[a.symbol]
  const lpTotal = dom.lpExact && ve !== undefined ? Math.max(0, Math.floor((ve - a.charge - dom.target) / 2)) : lp
  let g: GeoInfo
  const metal = a.symbol === 'Na' || a.symbol === 'Mg'
  // Missing H / under- or over-valent: hybridization, geometry and lone pairs cannot be derived honestly.
  let incomplete = false
  if (!metal && a.symbol !== 'H') {
    const allowed = allowedValences(a)
    // lone-pair count that is not a non-negative integer (odd electron count, unsupported charge) is never clamped to something invented
    incomplete = (allowed.length > 0 && !allowed.includes(used)) || !dom.lpExact
  } else if (a.symbol === 'H') {
    incomplete = used > 1
  }
  // Hypervalent S / P (more bonds than the standard valence): sp3 label would be wrong
  const hypervalent = (a.symbol === 'S' && used > 2 + Math.abs(a.charge)) || (a.symbol === 'P' && used > 3 + Math.abs(a.charge))

  if (metal) {
    g = { hyb: '—', hybShown: '—', vsepr: false, sn, lp, lpTotal, geometry: 'Metal (iyonik)', geometryEn: 'Metal (ionic)', incomplete }
  } else if (deg === 0) {
    g = { hyb: a.symbol === 'H' ? 's' : '—', hybShown: '—', vsepr: false, sn, lp, lpTotal, geometry: 'Tek atom', geometryEn: 'Single atom', incomplete }
  } else if (a.symbol === 'H') {
    g = { hyb: 's', hybShown: '—', vsepr: false, sn, lp, lpTotal, geometry: 'Uç atom (tek komşu)', geometryEn: 'Terminal atom (one neighbour)', incomplete }
  } else if (incomplete) {
    g = { hyb: '—', hybShown: '—', vsepr: false, sn: deg, lp: 0, lpTotal: 0, geometry: 'hesaplanamadı (yapı eksik)', geometryEn: 'not computable (incomplete structure)', incomplete }
  } else {
    let tr: string, en: string
    if (deg === 1) {
      tr = 'Uç atom (tek komşu)'
      en = 'Terminal atom (one neighbour)'
    } else {
      const names = GEOMETRY[`${sn}:${lp}`] ?? NOT_COMPUTABLE
      tr = names[0]
      en = names[1]
    }
    let hyb: Hyb = sn === 2 ? 'sp' : sn === 3 ? 'sp2' : sn === 4 ? 'sp3' : '—'
    if (dom.conjugated) {
      // N lone pair delocalised into a pi system (amide / aniline / pyrrole / sulfonamide): planar sp2. geometry.ts already
      // counts that lone pair as pi (lp 0, sn 3), so sn = sigma + lp holds and the geometry is trigonal planar.
      hyb = 'sp2'
      tr = 'Düzlem üçgen (konjugasyon, tahmini)'
      en = 'Trigonal planar (conjugation, estimated)'
    } else if (
      sn === 4 && lp === 2 && deg === 2 && (a.symbol === 'O' || a.symbol === 'S') && !hypervalent &&
      an.aromaticAtoms.has(id) && !nbs.some((nb) => nb.bond.order >= 2)
    ) {
      // furan O / thiophene S: one of the two lone pairs sits in the aromatic pi system; the in-plane one remains a domain,
      // so sn = sigma (2) + lp (1) = 3.
      hyb = 'sp2'
      lp = 1
      sn = 3
      tr = 'Kırık doğru (konjugasyon, tahmini)'
      en = 'Bent (conjugation, estimated)'
    }
    if (hypervalent) hyb = '—'
    // Hybridisation is only reported for C, N, O and B (SPEC A4.2); sp3 for Cl / F / S / P would be wrong or meaningless.
    const hybShown: Hyb = (a.symbol === 'C' || a.symbol === 'N' || a.symbol === 'O' || a.symbol === 'B') && (hyb === 'sp' || hyb === 'sp2' || hyb === 'sp3') ? hyb : '—'
    g = { hyb, hybShown, vsepr: deg >= 2, sn, lp, lpTotal, geometry: tr, geometryEn: en, incomplete }
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
    // Only the divalent (thiol / thioether) sulfur parameters of the cited 1980 table are used. Sulfur sp2 (thiophene, C=S),
    // hypervalent S(IV) / S(VI) (sulfoxide, sulfone, SF6, sulfate) and phosphorus have no parameters in that source -> null.
    case 'S': return h === 'sp3' ? [10.14, 9.13, 1.38] : null
    default: return null // P, B, Na, Mg, Si, hypervalent S: no parameters in Gasteiger & Marsili 1980 -> charge not computable (null)
  }
}

/**
 * true when the PEOE charge of this atom is not computable. Charge equalisation spreads over the WHOLE connected component, so
 * if any atom in it lacks parameters (or is incomplete) every atom of that component is blocked: a truncated network would
 * silently show the charge of an isolated fragment (e.g. the H of H2SO4 as if it were an OH group).
 */
function chargeBlocked(an: Analysis, id: number): boolean {
  if (!an.chargeBlockedIds) {
    const bad = (x: number) => peoeParams(an.byId.get(x)!, geoOf(an, x), an.aromaticAtoms.has(x)) === null || geoOf(an, x).incomplete
    const blocked = new Set<number>()
    const seen = new Set<number>()
    for (const start of an.byId.keys()) {
      if (seen.has(start)) continue
      const comp: number[] = []
      const stack = [start]
      seen.add(start)
      let anyBad = false
      while (stack.length) {
        const x = stack.pop()!
        comp.push(x)
        if (bad(x)) anyBad = true
        for (const nb of an.adj.get(x)!) {
          if (!seen.has(nb.id)) {
            seen.add(nb.id)
            stack.push(nb.id)
          }
        }
      }
      if (anyBad) for (const x of comp) blocked.add(x)
    }
    an.chargeBlockedIds = blocked
  }
  return an.chargeBlockedIds.has(id)
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
  // the cached analysis may come from a clone with other coordinates: take the position from THIS molecule
  const here = m.atoms.find((x) => x.id === id) ?? a
  return {
    id,
    symbol: a.symbol,
    name: e.name,
    z: e.z,
    hybridization: g.hybShown,
    showHybridization: g.hybShown !== '—',
    showVsepr: g.vsepr,
    geometry: g.geometry,
    geometryEn: g.geometryEn,
    stericNumber: g.sn,
    lonePairs: g.lp,
    lonePairsTotal: g.lpTotal,
    lonePairsDelocalised: Math.max(0, g.lpTotal - g.lp),
    ...lonePairLabels(g),
    valenceUsed: used,
    valence,
    formalCharge: a.charge,
    neighbours: an.adj.get(id)!.map((nb) => `${an.byId.get(nb.id)!.symbol}${nb.id}`),
    mass: e.mass,
    en: e.en,
    covalentRadius: e.covalent,
    position: [...here.pos] as Vec3,
    state: valenceState(m, a),
    incomplete: g.incomplete,
    partialCharge: chargeBlocked(an, id) ? null : gasteiger(an).get(id) ?? a.charge,
  }
}

export function bondInfo(m: Molecule, id: number): BondInfo | null {
  const an = analyze(m)
  const b = an.bonds.find((x) => x.id === id)
  if (!b) return null
  const A = an.byId.get(b.a)!, B = an.byId.get(b.b)!
  // positions must come from THIS molecule (the cached analysis may belong to a clone)
  const posA = m.atoms.find((x) => x.id === b.a)?.pos ?? A.pos
  const posB = m.atoms.find((x) => x.id === b.b)?.pos ?? B.pos
  const aromatic = an.aromaticBonds.has(b.id)
  const order = aromatic ? 1.5 : b.order
  const sym = aromatic ? ':' : b.order === 1 ? '-' : b.order === 2 ? '=' : '≡'
  const [first, second] =
    labelRank(A.symbol) < labelRank(B.symbol) || (labelRank(A.symbol) === labelRank(B.symbol) && A.symbol <= B.symbol) ? [A, B] : [B, A]
  const ea = el(A.symbol), eb = el(B.symbol)
  const deltaEN = Math.abs(ea.en - eb.en) // stored unrounded (SPEC A2.3)
  const dEnCmp = Math.round(deltaEN * 1e9) / 1e9 // float-noise guard for the class thresholds only
  const idealLength = bondTargetLength(A.symbol, B.symbol, b.order, aromatic)
  return {
    id,
    label: `${first.symbol}${sym}${second.symbol}`,
    order,
    orderName: aromatic ? 'Aromatik bağ (σ + delokalize π)' : BOND_NAMES[b.order] ?? '',
    orderNameEn: aromatic ? 'Aromatic bond (σ + delocalised π)' : BOND_NAMES_EN[b.order] ?? '',
    length: dist(posA, posB),
    idealLength,
    deltaEN,
    polarity: dEnCmp < 0.4 ? 'apolar' : dEnCmp <= 1.7 ? 'polar' : 'ionic',
    aromatic,
    inRing: an.ringBonds.has(b.id),
    sigma: 1,
    // Aromatic bonds are equivalent: order 1.5 = sigma 1 + delocalised pi 0.5 (never the alternating Kekule 1 / 0).
    pi: aromatic ? 0.5 : b.order - 1,
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
function countRotatable(an: Analysis): number {
  const atom = (id: number) => an.byId.get(id)!
  const heavy = (id: number) => an.adj.get(id)!.filter((nb) => atom(nb.id).symbol !== 'H')
  let n = 0
  for (const b of an.bonds) {
    if (b.order !== 1 || an.aromaticBonds.has(b.id) || an.ringBonds.has(b.id)) continue
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

/** Largest interatomic distance (A). Exact up to 1500 atoms; above that, exact among the extreme points of 26 directions. */
function sizeOf(m: Molecule): number {
  const n = m.atoms.length
  let pts: Vec3[] = m.atoms.map((a) => a.pos)
  if (n > 1500) {
    const dirs: Vec3[] = []
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) if (x || y || z) dirs.push([x, y, z])
    const pick = new Set<number>()
    for (const d of dirs) {
      let hi = -Infinity, lo = Infinity, ih = 0, il = 0
      for (let i = 0; i < n; i++) {
        const p = pts[i]
        const v = p[0] * d[0] + p[1] * d[1] + p[2] * d[2]
        if (v > hi) { hi = v; ih = i }
        if (v < lo) { lo = v; il = i }
      }
      pick.add(ih)
      pick.add(il)
    }
    pts = [...pick].map((i) => m.atoms[i].pos)
  }
  let best2 = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    for (let j = i + 1; j < pts.length; j++) {
      const q = pts[j]
      const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2]
      const d2 = dx * dx + dy * dy + dz * dz
      if (d2 > best2) best2 = d2
    }
  }
  return Math.sqrt(best2)
}

/** Atom pairs closer than 0.5 A (index pairs i < j, sorted), found with a 0.5 A spatial hash: O(n). */
function overlappingPairs(m: Molecule): [number, number][] {
  const cell = 0.5
  const atoms = m.atoms
  const grid = new Map<string, number[]>()
  const finite = (p: Vec3) => Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2])
  const keyOf = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`
  for (let i = 0; i < atoms.length; i++) {
    const p = atoms[i].pos
    if (!finite(p)) continue
    const k = keyOf(p[0], p[1], p[2])
    const l = grid.get(k)
    if (l) l.push(i)
    else grid.set(k, [i])
  }
  const out: [number, number][] = []
  for (let i = 0; i < atoms.length; i++) {
    const p = atoms[i].pos
    if (!finite(p)) continue
    const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const l = grid.get(`${cx + dx},${cy + dy},${cz + dz}`)
      if (!l) continue
      for (const j of l) {
        if (j <= i) continue
        if (dist(p, atoms[j].pos) < 0.5) out.push([i, j])
      }
    }
  }
  out.sort((p, q) => p[0] - q[0] || p[1] - q[1])
  return out
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

/** Everything that depends only on the topology (atoms, charges, bonds, orders) - cached by `topologyKey`. */
type TopoProps = Omit<MolProperties, 'sizeAng'>

const topoCache = new Map<string, TopoProps>()
const TOPO_CACHE_MAX = 8

function computeTopo(m: Molecule, an: Analysis): TopoProps {
  const counts = formulaCounts(m)
  const netCharge = m.atoms.reduce((s, a) => s + a.charge, 0)

  let exact = 0
  for (const a of m.atoms) exact += el(a.symbol).mono // AME2020 monoisotopic masses (elements.ts, SPEC A1.5)
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

  // Mass composition (SPEC A2.6): count * mass / M, UNROUNDED; M is the sum of the very same terms, so the
  // percentages add up to 100 within floating-point noise.
  const symbols = hillOrder(counts)
  let total = 0
  for (const symbol of symbols) total += counts[symbol] * el(symbol).mass
  const composition = symbols.map((symbol) => ({
    symbol,
    count: counts[symbol],
    percent: total > 0 ? ((counts[symbol] * el(symbol).mass) / total) * 100 : 0,
  }))
  const mass = molarMass(m)

  const fg = functionalGroupIds(m, an)
  const groups = FG_ORDER.filter(([id]) => fg.has(id))

  // Lipinski: only the 3 computable rules (logP is not computed)
  const violations = (mass > 500 ? 1 : 0) + (hDonors > 5 ? 1 : 0) + (hAcceptors > 10 ? 1 : 0)

  const issueDetails: IssueDetail[] = []
  const issues: string[] = []
  let missingH = 0
  for (const a of m.atoms) {
    missingH += missingHydrogens(m, a)
    const state = valenceState(m, a)
    if (state === 'ok') continue
    const used = valenceUsed(m, a.id)
    const allowed = allowedValences(a)
    const max = Math.max(0, ...allowed)
    if (state === 'over') {
      issueDetails.push({ code: 'valenceOver', atomId: a.id, symbol: a.symbol, used, allowed })
      issues.push(`Geçersiz değerlik: ${a.symbol} (${used}/${max}) — atom ${a.id}`)
    } else if (allowed.some((v) => v > used) && !allowed.some((v) => v < used)) {
      issueDetails.push({ code: 'valenceUnder', atomId: a.id, symbol: a.symbol, used, allowed })
      issues.push(`Eksik değerlik: ${a.symbol} ${used} bağ yapıyor, ${allowed.join(' veya ')} olmalı (atom ${a.id})`)
    } else if (allowed.includes(used)) {
      // SH4 / PH5 / (CH3)3SH: the count is a listed valence but S / P / halogen above the lowest valence needs an O or F neighbour,
      // so without one only the lowest valence is valid. Never print "4 bonds is invalid; valid: 2 / 4 / 6".
      const valid = [allowed[0]]
      const message = `${a.symbol} #${a.id}: ${used} bağ yalnızca O veya F komşusu varsa geçerli; bu atom için geçerli değerlik: ${valid.join(' / ')}`
      const messageEn = `${a.symbol} #${a.id}: ${used} bonds is only valid with an O or F neighbour; valid valence for this atom: ${valid.join(' / ')}`
      issueDetails.push({ code: 'valenceInvalid', reason: 'needsOF', atomId: a.id, symbol: a.symbol, used, allowed: valid, message, messageEn })
      issues.push(`Geçersiz değerlik: ${a.symbol} ${used} bağ yapıyor; O veya F komşusu olmadan yalnızca ${valid.join(' / ')} geçerli (atom ${a.id})`)
    } else {
      issueDetails.push({ code: 'valenceInvalid', atomId: a.id, symbol: a.symbol, used, allowed })
      issues.push(`Geçersiz değerlik: ${a.symbol} ${used} bağ yapıyor; geçerli değerlikler ${allowed.join(' veya ')} (atom ${a.id})`)
    }
  }

  const incomplete = missingH > 0

  return {
    formula: formula(m, true),
    formulaPlain: formula(m, false),
    mass,
    exactMass: exact,
    atomCount: m.atoms.length,
    heavyAtomCount: m.atoms.filter((a) => a.symbol !== 'H').length,
    bondCount: m.bonds.length,
    bondCounts,
    rings: an.bonds.length - m.atoms.length + an.components,
    aromaticRings: an.rings.filter((r) => r.aromatic).length,
    unsaturation: safeUnsaturation(m),
    hDonors,
    hAcceptors,
    rotatableBonds: countRotatable(an),
    composition,
    netCharge,
    components: an.components,
    functionalGroups: groups.map(([, tr]) => tr),
    functionalGroupIds: groups.map(([id]) => id),
    lipinski: {
      violations,
      rulesEvaluated: 3,
      rulesTotal: 4,
      qualifier: '3 / 4 kural değerlendirildi (logP hesaplanmıyor)',
      qualifierEn: '3 / 4 rules evaluated (logP is not computed)',
    },
    missingHydrogenCount: missingH,
    incompleteNote: incomplete ? `Yapı eksik: ${missingH} H eksik — değerler çizilen atomlar içindir` : null,
    incompleteNoteEn: incomplete ? `Incomplete structure: ${missingH} H missing — values are for the drawn atoms only` : null,
    issues,
    issueDetails,
  }
}

export function molProperties(m: Molecule): MolProperties {
  const an = analyze(m)
  let topo = topoCache.get(an.sig)
  if (topo) {
    topoCache.delete(an.sig)
    topoCache.set(an.sig, topo)
  } else {
    topo = computeTopo(m, an)
    topoCache.set(an.sig, topo)
    if (topoCache.size > TOPO_CACHE_MAX) topoCache.delete(topoCache.keys().next().value as string)
  }

  // coordinate-dependent parts are always computed from the molecule that was passed in
  const issueDetails = topo.issueDetails.map((d) => ({ ...d, ...(d.allowed ? { allowed: d.allowed.slice() } : {}) }))
  const issues = topo.issues.slice()
  for (const [i, j] of overlappingPairs(m)) {
    const A = m.atoms[i], B = m.atoms[j]
    const d = dist(A.pos, B.pos)
    issueDetails.push({ code: 'overlap', atomId: A.id, symbol: A.symbol, otherAtomId: B.id, distance: d })
    issues.push(`Çakışan atomlar: ${A.symbol}${A.id} ve ${B.symbol}${B.id} arası ${d.toFixed(3)} Å`)
  }

  // fresh containers so callers can never mutate the cached copy
  return {
    ...topo,
    bondCounts: { ...topo.bondCounts },
    composition: topo.composition.map((c) => ({ ...c })),
    functionalGroups: topo.functionalGroups.slice(),
    functionalGroupIds: topo.functionalGroupIds.slice(),
    lipinski: { ...topo.lipinski },
    sizeAng: sizeOf(m),
    issues,
    issueDetails,
  }
}
