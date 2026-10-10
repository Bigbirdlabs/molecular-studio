import * as lib from '../../chem/library'
import type { LibraryEntry } from '../../chem/library'
import type { Molecule } from '../../chem/molecule'
import { useStudio } from '../../store'

/**
 * Coordinate-source attribution for the molecule card (B.12).
 * Library molecules carry the stable id `lib-<entry id>`. PubChem and file imports are registered by the code that loads
 * them (`markPubChemMolecule(id)` / `markImportedMolecule(id)` before `loadMolecule`); a molecule value holds no source
 * flag, so the registry also keeps a structure snapshot taken when the molecule arrives. Comparing against that snapshot
 * tells an untouched import from an edited one, and the registry is persisted so a reload (the autosave keeps `mol.id`)
 * does not turn a measured source into an "idealised" one. Molecules whose atoms were dragged by hand are flagged too:
 * after a drag the geometry is neither a placement constant nor a measurement (A3.2).
 */
type Kind = 'pubchem' | 'imported'
interface Snap { atoms: { symbol: string; charge: number; pos: [number, number, number] }[]; bonds: { a: number; b: number; order: number }[] }
interface Rec { kind?: Kind; snap?: Snap; moved?: boolean }

const STORE_KEY = 'ms:prov:v1'
const MAX_RECORDS = 8
const MAX_PERSIST_ATOMS = 400

const registry = new Map<string, Rec>()
const pending = new Map<string, Kind>()
let loaded = false
let wired = false

function persist(): void {
  try {
    const out: Record<string, Rec> = {}
    for (const [id, r] of registry) if (!r.snap || r.snap.atoms.length <= MAX_PERSIST_ATOMS) out[id] = r
    localStorage.setItem(STORE_KEY, JSON.stringify(out))
  } catch { /* storage unavailable: provenance then lasts for this session only */ }
}

function prune(): void {
  while (registry.size > MAX_RECORDS) {
    const first = registry.keys().next()
    if (first.done) break
    registry.delete(first.value)
  }
}

function ensureLoaded(): void {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, Rec>
      for (const [id, r] of Object.entries(obj)) if (r && typeof r === 'object') registry.set(id, r)
    }
  } catch { /* corrupt or unavailable: start empty */ }
  wire()
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4

function snapshotOf(m: Molecule): Snap {
  return {
    atoms: m.atoms.map((a) => ({ symbol: a.symbol, charge: a.charge, pos: [round4(a.pos[0]), round4(a.pos[1]), round4(a.pos[2])] })),
    bonds: m.bonds.map((b) => ({ a: b.a, b: b.b, order: b.order })),
  }
}

/** Same graph (elements, charges, bond endpoints and orders); only positions may differ: a drag, not an edit of the graph. */
function sameTopology(a: Molecule, b: Molecule): boolean {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length) return false
  for (let i = 0; i < a.atoms.length; i++) {
    if (a.atoms[i].id !== b.atoms[i].id || a.atoms[i].symbol !== b.atoms[i].symbol || a.atoms[i].charge !== b.atoms[i].charge) return false
  }
  for (let i = 0; i < a.bonds.length; i++) {
    if (a.bonds[i].a !== b.bonds[i].a || a.bonds[i].b !== b.bonds[i].b || a.bonds[i].order !== b.bonds[i].order) return false
  }
  return true
}

function anyMoved(a: Molecule, b: Molecule): boolean {
  for (let i = 0; i < a.atoms.length; i++) for (let k = 0; k < 3; k++) if (Math.abs(a.atoms[i].pos[k] - b.atoms[i].pos[k]) > 1e-4) return true
  return false
}

/** Listens to the store: captures the baseline of registered imports and flags dragged molecules. Installed once. */
function wire(): void {
  if (wired || typeof window === 'undefined') return
  wired = true
  useStudio.subscribe((s, p) => {
    const m = s.mol
    if (m === p.mol) return
    const wait = pending.get(m.id)
    if (wait) {
      pending.delete(m.id)
      registry.delete(m.id)
      registry.set(m.id, { kind: wait, snap: snapshotOf(m) })
      prune()
      persist()
      return
    }
    if (p.mol.id !== m.id) {
      // A different molecule arrived. A forward action (load / new / replace) must not inherit a stale record under a reused id;
      // undo / redo walks back to a molecule whose record is still valid.
      const history = s.past.length < p.past.length || s.future.length < p.future.length
      const replaced = s.past.length === 0 && s.future.length === 0
      if ((replaced || !history) && registry.delete(m.id)) persist()
      return
    }
    // same molecule, same graph, only positions changed, no history entry and no clean-up running: an atom drag
    if (!s.relaxing && !p.relaxing && s.past === p.past && s.future === p.future && sameTopology(p.mol, m) && anyMoved(p.mol, m)) {
      const r = registry.get(m.id)
      if (!r?.moved) {
        registry.set(m.id, { ...r, moved: true })
        prune()
        persist()
      }
    }
  })
}

export function markPubChemMolecule(id: string): void {
  ensureLoaded()
  pending.set(id, 'pubchem')
}

/** Molecules loaded from a user file keep the coordinates of that file (neither library nor editor-placed geometry). */
export function markImportedMolecule(id: string): void {
  ensureLoaded()
  pending.set(id, 'imported')
}

export const isPubChemMolecule = (m: Molecule): boolean => { ensureLoaded(); return registry.get(m.id)?.kind === 'pubchem' }

interface Struct { atoms: { symbol: string; charge: number; pos: readonly number[] }[]; bonds: { a: number; b: number; order: number }[] }

function sameStructure(a: Struct, b: Struct): boolean {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length) return false
  const ca = centroidOf(a)
  const cb = centroidOf(b)
  for (let i = 0; i < a.atoms.length; i++) {
    const p = a.atoms[i]
    const q = b.atoms[i]
    if (p.symbol !== q.symbol || p.charge !== q.charge) return false
    for (let k = 0; k < 3; k++) if (Math.abs(p.pos[k] - ca[k] - (q.pos[k] - cb[k])) > 2e-3) return false
  }
  for (let i = 0; i < a.bonds.length; i++) {
    const p = a.bonds[i]
    const q = b.bonds[i]
    if (p.a !== q.a || p.b !== q.b || p.order !== q.order) return false
  }
  return true
}

function centroidOf(m: Struct): [number, number, number] {
  const c: [number, number, number] = [0, 0, 0]
  for (const a of m.atoms) for (let k = 0; k < 3; k++) c[k] += a.pos[k]
  const n = Math.max(1, m.atoms.length)
  return [c[0] / n, c[1] / n, c[2] / n]
}

export interface CoordSource { entry: LibraryEntry | null; pubchem: boolean; edited: boolean }

/** Whether the molecule differs from the coordinates it was loaded with (library entry, PubChem record or imported file). */
function editedSince(mol: Molecule, rec: Rec | undefined, entry: LibraryEntry | null): boolean {
  if (entry) return !sameStructure(mol, entry.molecule)
  return rec?.snap ? !sameStructure(mol, rec.snap) : false
}

/** Resolves where the current molecule's coordinates come from, or null for a hand-built / imported molecule. */
export function useCoordSource(mol: Molecule): CoordSource | null {
  ensureLoaded()
  const rec = registry.get(mol.id)
  if (rec?.kind === 'pubchem') return { entry: null, pubchem: true, edited: editedSince(mol, rec, null) }
  if (!mol.id.startsWith('lib-')) return null
  const entry = lib.getEntry(mol.id.slice(4))
  if (!entry) return null
  return { entry, pubchem: entry.coordSource === 'pubchem', edited: editedSince(mol, rec, entry) }
}

/**
 * Where the numbers of the geometry rows come from. Coordinates of a hand-built molecule are placed by the editor from
 * fixed idealised constants (A3.2: idealised geometry, not an energy minimisation), so they are never presented as measured.
 *  - source:    untouched library / PubChem coordinates
 *  - imported:  untouched file coordinates
 *  - idealized: hand-built, or a source molecule edited afterwards (placement constants / clean-up)
 *  - moved:     atoms were dragged by hand: neither a placement constant nor a measurement
 */
export type GeometryOrigin = 'source' | 'imported' | 'idealized' | 'moved'

export function useGeometryOrigin(mol: Molecule): GeometryOrigin {
  ensureLoaded()
  const rec = registry.get(mol.id)
  if (rec?.moved) return 'moved'
  if (rec?.kind) return editedSince(mol, rec, null) ? 'idealized' : rec.kind === 'imported' ? 'imported' : 'source'
  if (mol.id.startsWith('lib-')) {
    const entry = lib.getEntry(mol.id.slice(4))
    return entry && !editedSince(mol, rec, entry) ? 'source' : 'idealized'
  }
  return 'idealized'
}

/** True when an imported (file) molecule no longer matches the coordinates of the file. */
export function useImportedEdited(mol: Molecule): boolean {
  ensureLoaded()
  const rec = registry.get(mol.id)
  return rec?.kind === 'imported' && editedSince(mol, rec, null)
}

/** Experimental bond angle at a centre atom for the A4.1 molecules only; `edited` molecules get none (A4.4). */
interface ExpRow { symbol: string; angle: number; /** which angle at the centre atom the reference is (when the centre has several) */ qualifier?: string }
const EXPERIMENTAL_ANGLE: Record<string, ExpRow> = {
  metan: { symbol: 'C', angle: 109.471 },
  su: { symbol: 'O', angle: 104.478 },
  amonyak: { symbol: 'N', angle: 106.67 },
  karbondioksit: { symbol: 'C', angle: 180 },
  asetilen: { symbol: 'C', angle: 180 },
  etilen: { symbol: 'C', angle: 117.6, qualifier: 'H–C–H' },
  benzen: { symbol: 'C', angle: 120, qualifier: 'C–C–C' },
  'bor-triflorur': { symbol: 'B', angle: 120, qualifier: 'F–B–F' },
}

export interface ExperimentalAngle { angle: number; qualifier: string | null; origin: 'cccbdb' | 'gas' }

export function experimentalAngle(source: CoordSource | null, symbol: string): ExperimentalAngle | null {
  if (!source || !source.entry || source.edited) return null
  const kind = source.entry.coordSource
  if (kind !== 'cccbdb' && kind !== 'experimental') return null
  const row = EXPERIMENTAL_ANGLE[source.entry.id]
  return row && row.symbol === symbol ? { angle: row.angle, qualifier: row.qualifier ?? null, origin: kind === 'cccbdb' ? 'cccbdb' : 'gas' } : null
}

if (typeof window !== 'undefined') ensureLoaded()
