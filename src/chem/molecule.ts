import { el } from './elements'

export type Vec3 = [number, number, number]
export type BondOrder = 1 | 2 | 3
export interface Atom { id: number; symbol: string; pos: Vec3; charge: number }
export interface Bond { id: number; a: number; b: number; order: BondOrder; aromatic?: boolean }
/** `nextId` is a single counter shared by atoms and bonds, so atom and bond ids never collide and stay stable. */
export interface Molecule { id: string; name: string; atoms: Atom[]; bonds: Bond[]; nextId: number }

// ---------- molecule identity ----------
let moleculeCounter = 0
/** Deterministic unique molecule id ("mol-1", "mol-2", ...). */
export const newMoleculeId = (): string => `mol-${++moleculeCounter}`
/** Make sure future generated ids never collide with an id that was loaded from outside (storage, library). */
export function reserveMoleculeId(id: string): void {
  const n = /^mol-(\d+)$/.exec(id)
  if (n) moleculeCounter = Math.max(moleculeCounter, Number(n[1]))
}

export const emptyMolecule = (name = 'Yeni molekül'): Molecule => ({ id: newMoleculeId(), name, atoms: [], bonds: [], nextId: 1 })

/** Atomic number of an atom (or element symbol). */
export const atomicNumber = (a: Atom | string): number => el(typeof a === 'string' ? a : a.symbol).z

/** Methane with real tetrahedral coordinates: C at the origin, C-H 1.09 A, H-C-H 109.47 deg. */
export function methane(): Molecule {
  const h = 1.09 / Math.sqrt(3) // 0.6293 A per axis -> |C-H| = 1.09 A
  const m = emptyMolecule('Metan')
  m.atoms = [
    { id: 1, symbol: 'C', pos: [0, 0, 0], charge: 0 },
    { id: 2, symbol: 'H', pos: [h, h, h], charge: 0 },
    { id: 3, symbol: 'H', pos: [h, -h, -h], charge: 0 },
    { id: 4, symbol: 'H', pos: [-h, h, -h], charge: 0 },
    { id: 5, symbol: 'H', pos: [-h, -h, h], charge: 0 },
  ]
  m.bonds = [2, 3, 4, 5].map((b, i) => ({ id: 6 + i, a: 1, b, order: 1 as BondOrder }))
  m.nextId = 10
  return m
}

// ---------- vector helpers ----------
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
export const norm = (a: Vec3): Vec3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
export const dist = (a: Vec3, b: Vec3) => len(sub(a, b))
/** Any unit vector perpendicular to v. */
export function perpendicular(v: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(v[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]
  return norm(cross(v, ref))
}

// ---------- graph queries ----------
export const atomById = (m: Molecule, id: number) => m.atoms.find((a) => a.id === id)
export const bondById = (m: Molecule, id: number) => m.bonds.find((b) => b.id === id)
export const bondBetween = (m: Molecule, a: number, b: number) =>
  m.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))

export function neighbours(m: Molecule, id: number): { atom: Atom; bond: Bond }[] {
  const out: { atom: Atom; bond: Bond }[] = []
  for (const b of m.bonds) {
    const other = b.a === id ? b.b : b.b === id ? b.a : -1
    if (other < 0) continue
    const atom = atomById(m, other)
    if (atom) out.push({ atom, bond: b })
  }
  return out
}

/** Sum of bond orders on an atom (aromatic bonds count with their Kekulé order). */
export function valenceUsed(m: Molecule, id: number): number {
  let v = 0
  for (const b of m.bonds) if (b.a === id || b.b === id) v += b.order
  return v
}

/** Allowed valences for an atom, adjusted for its formal charge. */
export function allowedValences(a: Atom): number[] {
  const e = el(a.symbol)
  const q = a.charge
  let list: number[]
  if (['N', 'P', 'O', 'S', 'F', 'Cl', 'Br', 'I'].includes(a.symbol)) list = e.valences.map((v) => v + q) // NH4+ → 4, O- → 1
  else if (a.symbol === 'C' || a.symbol === 'Si') list = e.valences.map((v) => v - Math.abs(q)) // carbocation/carbanion → 3
  else if (a.symbol === 'B') list = e.valences.map((v) => v - q) // BH4- → 4
  else list = e.valences.map((v) => v - Math.abs(q)) // metals: Na+ → 0
  return list.filter((v) => v >= 0)
}

/** Lowest allowed valence that accommodates the current bonding. */
export function targetValence(m: Molecule, a: Atom): number {
  const used = valenceUsed(m, a.id)
  const list = allowedValences(a)
  for (const v of list) if (used <= v) return v
  return list[list.length - 1] ?? 0
}

export type ValenceState = 'ok' | 'under' | 'over'
/** Elements whose higher valences only make sense next to O or a halogen (SPEC A1.3): S, P and the halogens. */
const NEEDS_OF_ABOVE_LOWEST = new Set(['S', 'P', 'F', 'Cl', 'Br', 'I'])
/**
 * Neighbours that make a raised S / P valence plausible: O (SO₂, H₂SO₄, H₃PO₄) and the halogens (SF₆, PF₅, PCl₅, PBr₅,
 * SCl₄). SPEC A1.3 literally says "O or F"; Cl / Br / I are admitted too because PCl₅, PBr₅ and SCl₄ are real
 * compounds (and CONVENTIONAL_FORMULA lists Cl₅P). SH₄, PH₅ and (CH₃)₃SH, with no such neighbour, stay 'under'.
 * DELIBERATE DEVIATION from SPEC A1.3 (recorded here; SPEC.md should be amended to "O or a halogen"): the wording of the
 * hypervalence message in properties.ts still says "O or F" and should follow this rule.
 */
const HYPERVALENT_PARTNERS = new Set(['O', 'F', 'Cl', 'Br', 'I'])

export function valenceState(m: Molecule, a: Atom): ValenceState {
  const used = valenceUsed(m, a.id)
  const list = allowedValences(a)
  if (list.includes(used)) {
    // SH4, PH5, (CH3)3SH: allowed numerically, but an S / P / halogen above its lowest valence needs O or halogen neighbours
    if (NEEDS_OF_ABOVE_LOWEST.has(a.symbol) && used > list[0] && !neighbours(m, a.id).some((n) => HYPERVALENT_PARTNERS.has(n.atom.symbol))) return 'under'
    return 'ok'
  }
  if (used > Math.max(0, ...list)) return 'over'
  return 'under'
}

/** Implicit hydrogens needed to satisfy the lowest fitting valence. */
export function missingHydrogens(m: Molecule, a: Atom): number {
  if (a.symbol === 'H') return 0
  // H-filling uses the LOWEST valence only: S/P already at or beyond it never get extra H.
  const lowest = allowedValences(a)[0]
  if (lowest === undefined) return 0
  return Math.max(0, lowest - valenceUsed(m, a.id))
}

// ---------- formula / mass ----------
export function formulaCounts(m: Molecule): Record<string, number> {
  const c: Record<string, number> = {}
  for (const a of m.atoms) c[a.symbol] = (c[a.symbol] ?? 0) + 1
  return c
}

/** Hill order: C first, then H, then the rest alphabetically; no carbon → all alphabetical. */
export function hillOrder(counts: Record<string, number>): string[] {
  const keys = Object.keys(counts)
  if (!counts.C) return keys.sort()
  return ['C', ...(counts.H ? ['H'] : []), ...keys.filter((k) => k !== 'C' && k !== 'H').sort()]
}

const SUB = '₀₁₂₃₄₅₆₇₈₉'
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const digits = (n: number, set: string) => String(n).split('').map((d) => set[+d]).join('')

/** Hill formula. pretty=true uses Unicode subscripts (C₂H₆O), false gives plain text (C2H6O). */
export function formula(m: Molecule, pretty = true): string {
  return buildFormula(m, hillOrder(formulaCounts(m)), pretty)
}

/**
 * Exact conventional-formula lookup for carbon-free species (SPEC A2.1), keyed by the plain Hill string including the
 * charge (`formula(m, false)`). Everything not listed keeps its strict Hill formula (e.g. BF₃, H₃O⁺, H₂O, NO₂ and every
 * carbon-containing species). The value is the pretty (Unicode) conventional formula.
 */
export const CONVENTIONAL_FORMULA: Readonly<Record<string, string>> = {
  H3N: 'NH₃', O2S: 'SO₂', F6S: 'SF₆', H2O4S: 'H₂SO₄', H3O4P: 'H₃PO₄', ClH: 'HCl', ClNa: 'NaCl', 'H4N+': 'NH₄⁺',
  HNaO: 'NaOH', BrH: 'HBr', FH: 'HF', H4Si: 'SiH₄', O3S: 'SO₃', H2O3S: 'H₂SO₃', H3P: 'PH₃', F5P: 'PF₅',
  Cl3P: 'PCl₃', Cl5P: 'PCl₅', Cl2Mg: 'MgCl₂', FNa: 'NaF', BrNa: 'NaBr', INa: 'NaI', H4N2: 'N₂H₄', ClHO: 'HClO',
  ClHO4: 'HClO₄', O2Si: 'SiO₂', Cl4Si: 'SiCl₄', F4S: 'SF₄', Cl2S: 'SCl₂', BH3O3: 'H₃BO₃',
  'O4S2-': 'SO₄²⁻', 'HO4S-': 'HSO₄⁻', 'H4P+': 'PH₄⁺',
}

const toPlain = (s: string): string =>
  s.replace(/[₀-₉]/g, (d) => String(SUB.indexOf(d))).replace(/[⁰-⁹]/g, (d) => String(SUP.indexOf(d))).replace('⁺', '+').replace('⁻', '-')

/**
 * Conventional formula: the exact CONVENTIONAL_FORMULA entry when the current composition matches a key (NH₃, SO₂,
 * H₃PO₄, NaCl, ...), otherwise the strict Hill formula. `formula()` itself always stays Hill.
 */
export function conventionalFormula(m: Molecule, pretty = true): string {
  const key = formula(m, false)
  if (Object.hasOwn(CONVENTIONAL_FORMULA, key)) return pretty ? CONVENTIONAL_FORMULA[key] : toPlain(CONVENTIONAL_FORMULA[key])
  return formula(m, pretty)
}

function buildFormula(m: Molecule, order: string[], pretty: boolean): string {
  const counts = formulaCounts(m)
  const net = m.atoms.reduce((s, a) => s + a.charge, 0)
  let s = order
    .map((k) => k + (counts[k] > 1 ? (pretty ? digits(counts[k], SUB) : String(counts[k])) : ''))
    .join('')
  if (net !== 0) {
    const mag = Math.abs(net) > 1 ? Math.abs(net) : ''
    s += pretty ? (mag === '' ? '' : digits(mag as number, SUP)) + (net > 0 ? '⁺' : '⁻') : `${mag}${net > 0 ? '+' : '-'}`
  }
  return s
}

/** Average molar mass in g/mol (IUPAC standard atomic weights). */
export function molarMass(m: Molecule): number {
  return m.atoms.reduce((s, a) => s + el(a.symbol).mass, 0)
}

// ---------- topology ----------
export function connectedComponents(m: Molecule): number[][] {
  const seen = new Set<number>()
  const comps: number[][] = []
  for (const a of m.atoms) {
    if (seen.has(a.id)) continue
    const stack = [a.id]
    const comp: number[] = []
    seen.add(a.id)
    while (stack.length) {
      const id = stack.pop()!
      comp.push(id)
      for (const n of neighbours(m, id)) if (!seen.has(n.atom.id)) { seen.add(n.atom.id); stack.push(n.atom.id) }
    }
    comps.push(comp)
  }
  return comps
}

/** Number of independent rings (cycle rank) = E − V + C. */
export function ringCount(m: Molecule): number {
  if (!m.atoms.length) return 0
  return m.bonds.length - m.atoms.length + connectedComponents(m).length
}

/** True when removing the bond keeps its endpoints connected. */
export function inRing(m: Molecule, b: Bond): boolean {
  const seen = new Set<number>([b.a])
  const stack = [b.a]
  while (stack.length) {
    const id = stack.pop()!
    for (const n of neighbours(m, id)) {
      if (n.bond.id === b.id) continue
      if (n.atom.id === b.b) return true
      if (!seen.has(n.atom.id)) { seen.add(n.atom.id); stack.push(n.atom.id) }
    }
  }
  return false
}

/**
 * Degree of unsaturation from the graph: rings + π bonds = ringCount + Σ(order − 1), aromatic bonds at their Kekulé
 * order, no clamp. Only meaningful for neutral C/H/N/O/halogen molecules at standard valence (gate in properties.ts).
 */
export function unsaturation(m: Molecule): number {
  return ringCount(m) + m.bonds.reduce((s, b) => s + (b.order - 1), 0)
}

// ---------- geometry measurements ----------
export function angleDeg(a: Vec3, center: Vec3, b: Vec3): number {
  const u = norm(sub(a, center))
  const v = norm(sub(b, center))
  return (Math.acos(Math.max(-1, Math.min(1, dot(u, v)))) * 180) / Math.PI
}

export function dihedralDeg(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3): number {
  const b0 = sub(p0, p1)
  const b1 = norm(sub(p2, p1))
  const b2 = sub(p3, p2)
  const v = sub(b0, scale(b1, dot(b0, b1)))
  const w = sub(b2, scale(b1, dot(b2, b1)))
  return (Math.atan2(dot(cross(b1, v), w), dot(v, w)) * 180) / Math.PI
}

export function bondLength(m: Molecule, b: Bond): number {
  return dist(atomById(m, b.a)!.pos, atomById(m, b.b)!.pos)
}

// ---------- reference bond lengths (the single table; geometry.ts re-exports bondTargetLength) ----------

/** Source family of a reference-length row. */
type LengthSource = 'A' | 'C' | 'T'
/**
 * Display text per source family and language. The strings that reach the UI go through here (never hard-coded English
 * in a Turkish interface). The 'T' text deliberately starts with "typical": Inspector swaps that row for its own
 * translated t('bond.refSrc.typical') label.
 */
const LENGTH_SOURCE_TEXT: Record<LengthSource, { tr: string; en: string }> = {
  A: { tr: 'Allen 1987 (yuvarlatılmış)', en: 'Allen 1987 (rounded)' }, // Allen et al., J. Chem. Soc. Perkin Trans. 2 1987, S1
  C: { tr: 'CCCBDB gaz fazı', en: 'CCCBDB gas-phase' }, // NIST Computational Chemistry Comparison and Benchmark Database, experimental geometry page
  T: { tr: 'typical (tek tablo kaynağı yok, yaklaşık ±0,05 Å)', en: 'typical reference value (no single table source, about ±0.05 Å)' }, // textbook-typical value rounded to 0.01 Å; CCCBDB has no usable entry for this bond type
}
/** UI language as the store publishes it on <html lang>; Turkish (the default language) when there is no document. */
const uiLang = (): 'tr' | 'en' => (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'tr')
/**
 * [a, b, order (4 = aromatic), length in Å, source]. Typical reference lengths rounded to 0.01 Å. Each row carries its
 * source family (A = Allen 1987 rounded, C = CCCBDB experimental gas-phase, T = typical value without a single table source).
 * Key values asserted by tests: C–C 1.54, C=C 1.34, C≡C 1.20, C⋯C aromatic 1.39, C–H 1.09, C–O 1.43, C=O 1.21, O–H 0.96, N–H 1.01.
 *
 * Rows re-verified against CCCBDB experimental geometries (page cccbdb.nist.gov/exp2x.asp, retrieved 2026-10-10):
 *   S–F 1.56 SF6 rSF 1.561 · O=S 1.43 SO2 rSO 1.432 · O–S 1.57 H2SO4 S–OH 1.574 · O–Cl 1.70 Cl2O rClO 1.696
 *   P–F 1.56 PF3 rFP 1.561 · P–Cl 2.04 PCl3 rPCl 2.043 · Si–Cl 2.02 SiCl4 rSiCl 2.019 · Si–F 1.55 SiF4 rSiF 1.554
 *   S–Cl 2.01 SCl2 rSCl 2.013 · B–Cl 1.74 BCl3 rBCl 1.742 · N–F 1.36 NF3 rNF 1.365 · Mg–Cl 2.18 MgCl2 rMgCl 2.180
 *   C–Si 1.87 CH3SiH3 rSiC 1.869 · C–B 1.58 B(CH3)3 rBC 1.578 · B–H 1.20 B2H6 terminal rBH 1.200
 *   C=S 1.61 H2C=S rCS 1.611 (CCCBDB; Allen 1987 gives about 1.67, so this row is tagged C, not A)
 * Rows still tagged T had no usable CCCBDB entry (page empty or defaulted to another molecule).
 */
const LENGTHS: [string, string, number, number, LengthSource][] = [
  ['C', 'C', 1, 1.54, 'A'], ['C', 'C', 2, 1.34, 'A'], ['C', 'C', 3, 1.2, 'C'],
  ['C', 'C', 4, 1.39, 'A'], ['C', 'H', 1, 1.09, 'A'], ['C', 'N', 1, 1.47, 'A'],
  ['C', 'N', 2, 1.28, 'A'], ['C', 'N', 3, 1.16, 'C'], ['C', 'N', 4, 1.34, 'A'],
  ['C', 'O', 1, 1.43, 'A'], ['C', 'O', 2, 1.21, 'A'], ['C', 'O', 3, 1.13, 'C'],
  ['C', 'O', 4, 1.36, 'A'], ['C', 'S', 1, 1.82, 'A'], ['C', 'S', 2, 1.61, 'C'],
  ['C', 'S', 4, 1.72, 'A'], ['C', 'F', 1, 1.35, 'A'], ['C', 'Cl', 1, 1.77, 'A'],
  ['C', 'Br', 1, 1.94, 'A'], ['C', 'I', 1, 2.14, 'A'], ['C', 'P', 1, 1.84, 'T'],
  ['C', 'P', 2, 1.67, 'T'], ['C', 'Si', 1, 1.87, 'C'], ['C', 'B', 1, 1.58, 'C'],
  ['C', 'Mg', 1, 2.1, 'T'], ['N', 'H', 1, 1.01, 'A'], ['N', 'N', 1, 1.45, 'A'],
  ['N', 'N', 2, 1.25, 'A'], ['N', 'N', 3, 1.1, 'C'], ['N', 'N', 4, 1.35, 'A'],
  ['N', 'O', 1, 1.4, 'A'], ['N', 'O', 2, 1.21, 'A'], ['N', 'O', 4, 1.37, 'A'],
  ['N', 'F', 1, 1.36, 'C'], ['N', 'Cl', 1, 1.75, 'T'], ['N', 'S', 1, 1.65, 'T'],
  ['N', 'P', 1, 1.68, 'T'], ['N', 'B', 1, 1.4, 'T'], ['O', 'H', 1, 0.96, 'A'],
  ['O', 'O', 1, 1.48, 'A'], ['O', 'O', 2, 1.21, 'C'], ['O', 'S', 1, 1.57, 'C'],
  ['O', 'S', 2, 1.43, 'C'], ['O', 'P', 1, 1.61, 'T'], ['O', 'P', 2, 1.48, 'T'],
  ['O', 'Si', 1, 1.64, 'T'], ['O', 'B', 1, 1.37, 'T'], ['O', 'B', 2, 1.36, 'T'],
  ['O', 'Cl', 1, 1.7, 'C'], ['O', 'Na', 1, 2.1, 'T'], ['O', 'Mg', 1, 2.0, 'T'],
  ['S', 'H', 1, 1.34, 'C'], ['S', 'S', 1, 2.05, 'A'], ['S', 'F', 1, 1.56, 'C'],
  ['S', 'Cl', 1, 2.01, 'C'], ['P', 'H', 1, 1.42, 'C'], ['P', 'Cl', 1, 2.04, 'C'],
  ['P', 'F', 1, 1.56, 'C'], ['Si', 'H', 1, 1.48, 'C'], ['Si', 'Cl', 1, 2.02, 'C'],
  ['Si', 'F', 1, 1.55, 'C'], ['B', 'H', 1, 1.2, 'C'], ['B', 'F', 1, 1.31, 'C'],
  ['B', 'Cl', 1, 1.74, 'C'], ['H', 'H', 1, 0.74, 'C'], ['F', 'F', 1, 1.42, 'C'],
  ['Cl', 'Cl', 1, 1.99, 'C'], ['Br', 'Br', 1, 2.28, 'C'], ['I', 'I', 1, 2.67, 'C'],
  ['Na', 'Cl', 1, 2.36, 'C'], ['Na', 'F', 1, 1.93, 'C'], ['Na', 'Br', 1, 2.5, 'C'],
  ['Na', 'I', 1, 2.71, 'C'], ['Mg', 'Cl', 1, 2.18, 'C'], ['Cl', 'F', 1, 1.63, 'C'],
]
const lenKey = (a: string, b: string, o: number) => (a < b ? `${a}|${b}|${o}` : `${b}|${a}|${o}`)
const LEN = new Map<string, { length: number; source: LengthSource }>(LENGTHS.map(([a, b, o, l, s]) => [lenKey(a, b, o), { length: l, source: s }]))

/** Covalent-radius fallback (Cordero 2008) for pairs missing from the table: sum x 1 / 0.875 / 0.79 for single / double / triple. */
const covalentEstimate = (sa: string, sb: string, order: number): number =>
  (el(sa).covalent + el(sb).covalent) * (order === 1 ? 1 : order === 2 ? 0.875 : 0.79)

/** Reference bond length (Å). Aromatic bonds use aromatic values; unknown pairs fall back to covalent radii. */
export function bondTargetLength(sa: string, sb: string, order: number, aromatic = false): number {
  if (aromatic) {
    const v = LEN.get(lenKey(sa, sb, 4))
    if (v) return v.length
    const s = LEN.get(lenKey(sa, sb, 1))?.length ?? covalentEstimate(sa, sb, 1)
    const d = LEN.get(lenKey(sa, sb, 2))?.length ?? covalentEstimate(sa, sb, 2)
    return (s + d) / 2
  }
  return LEN.get(lenKey(sa, sb, order))?.length ?? covalentEstimate(sa, sb, order)
}

/**
 * Reference length (Å) of a concrete bond in a molecule. Same table as bondTargetLength, plus one context rule: in a
 * nitro-type group the two N–O bonds are resonance-equivalent (about 1.22 Å in real nitro compounds), so an N⁺–O⁻
 * single bond whose N⁺ also carries an N⁺=O double bond gets the N=O length instead of the isolated N–O single (1.40 Å).
 */
export function bondLengthFor(m: Molecule, b: Bond): number {
  const A = atomById(m, b.a)
  const B = atomById(m, b.b)
  if (!A || !B) return 0
  const aromatic = !!b.aromatic
  if (!aromatic && b.order === 1) {
    const N = A.symbol === 'N' && A.charge === 1 && B.symbol === 'O' && B.charge === -1 ? A
      : B.symbol === 'N' && B.charge === 1 && A.symbol === 'O' && A.charge === -1 ? B : null
    if (N) {
      const O = N === A ? B : A
      if (neighbours(m, N.id).some((n) => n.atom.id !== O.id && n.atom.symbol === 'O' && n.bond.order === 2 && !n.bond.aromatic)) {
        return bondTargetLength('N', 'O', 2)
      }
    }
  }
  return bondTargetLength(A.symbol, B.symbol, b.order, aromatic)
}

/**
 * Source text of the reference-length row used for this bond, or null when the covalent-radius fallback applies.
 * Localised: `lang` defaults to the active UI language (<html lang>, kept in sync by the store).
 */
export function bondLengthSource(sa: string, sb: string, order: number, aromatic = false, lang: 'tr' | 'en' = uiLang()): string | null {
  const row = LEN.get(lenKey(sa, sb, aromatic ? 4 : order))
  return row ? LENGTH_SOURCE_TEXT[row.source][lang] : null
}

/** Ideal bond length (Å): delegates to the single reference table (bondTargetLength). */
export const idealBondLength = (sa: string, sb: string, order: number): number => bondTargetLength(sa, sb, order)

export const centroid = (m: Molecule): Vec3 => {
  if (!m.atoms.length) return [0, 0, 0]
  const s = m.atoms.reduce<Vec3>((acc, a) => add(acc, a.pos), [0, 0, 0])
  return scale(s, 1 / m.atoms.length)
}

/** Deep clone (molecules are treated as immutable values in the store). */
export const cloneMolecule = (m: Molecule): Molecule => ({
  id: m.id ?? newMoleculeId(),
  name: m.name,
  nextId: m.nextId,
  atoms: m.atoms.map((a) => ({ ...a, pos: [...a.pos] as Vec3 })),
  bonds: m.bonds.map((b) => ({ ...b })),
})
