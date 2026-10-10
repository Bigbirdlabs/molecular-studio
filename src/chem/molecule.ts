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
export function valenceState(m: Molecule, a: Atom): ValenceState {
  const used = valenceUsed(m, a.id)
  const list = allowedValences(a)
  if (list.includes(used)) return 'ok'
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

/** IUPAC-style electropositive → electronegative order for carbon-free species (metals first). */
const CONVENTIONAL_ORDER = ['Na', 'Mg', 'B', 'Si', 'P', 'N', 'H', 'S', 'I', 'Br', 'Cl', 'O', 'F']

/**
 * Conventional formula: NH3, H2O, SO2, NaCl, H2SO4 for carbon-free species; carbon-containing
 * species fall back to the Hill formula (C2H6O). The Hill formula itself (`formula`) is unchanged.
 */
export function conventionalFormula(m: Molecule, pretty = true): string {
  const counts = formulaCounts(m)
  if (counts.C) return formula(m, pretty)
  const rank = (k: string) => { const i = CONVENTIONAL_ORDER.indexOf(k); return i < 0 ? -1 : i }
  const keys = Object.keys(counts).sort((x, y) => rank(x) - rank(y) || x.localeCompare(y))
  return buildFormula(m, keys, pretty)
}

/** True when the degree of unsaturation is meaningful: only C/H/N/O/F/Cl/Br/I, all neutral, standard valence, no missing H. */
export function canComputeUnsaturation(m: Molecule): boolean {
  if (!m.atoms.length) return false
  const ok = new Set(['C', 'H', 'N', 'O', 'F', 'Cl', 'Br', 'I'])
  return m.atoms.every((a) => ok.has(a.symbol) && a.charge === 0 && valenceState(m, a) === 'ok' && missingHydrogens(m, a) === 0)
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

/** Degree of unsaturation from the formula (halogens count as H, N/P add half). */
export function unsaturation(m: Molecule): number {
  const c = formulaCounts(m)
  const g = (s: string) => c[s] ?? 0
  const C = g('C') + g('Si')
  const N = g('N') + g('P') + g('B')
  const X = g('H') + g('F') + g('Cl') + g('Br') + g('I') + g('Na')
  return Math.max(0, (2 * C + 2 + N - X) / 2)
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

/** Ideal bond length (Å) from covalent radii; multiple bonds shortened (C–C 1.52, C=C 1.33, C≡C 1.20). */
export function idealBondLength(sa: string, sb: string, order: number): number {
  const base = el(sa).covalent + el(sb).covalent
  return base * (order === 1 ? 1 : order === 2 ? 0.875 : 0.79)
}

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
