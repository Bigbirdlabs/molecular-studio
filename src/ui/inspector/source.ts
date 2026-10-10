import * as lib from '../../chem/library'
import type { LibraryEntry } from '../../chem/library'
import type { Molecule } from '../../chem/molecule'

/**
 * Coordinate-source attribution for the molecule card (B.12).
 * Library molecules carry the stable id `lib-<entry id>`; PubChem imports are registered by the code that loads them
 * (`markPubChemMolecule(mol.id)` before `loadMolecule`), because a molecule value itself holds no source flag.
 */
const pubchemIds = new Set<string>()

export function markPubChemMolecule(id: string): void {
  pubchemIds.add(id)
}

export const isPubChemMolecule = (m: Molecule): boolean => pubchemIds.has(m.id)

function sameStructure(a: Molecule, b: Molecule): boolean {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length) return false
  const ca = centroidOf(a)
  const cb = centroidOf(b)
  for (let i = 0; i < a.atoms.length; i++) {
    const p = a.atoms[i]
    const q = b.atoms[i]
    if (p.symbol !== q.symbol || p.charge !== q.charge) return false
    for (let k = 0; k < 3; k++) if (Math.abs(p.pos[k] - ca[k] - (q.pos[k] - cb[k])) > 1e-3) return false
  }
  for (let i = 0; i < a.bonds.length; i++) {
    const p = a.bonds[i]
    const q = b.bonds[i]
    if (p.a !== q.a || p.b !== q.b || p.order !== q.order) return false
  }
  return true
}

function centroidOf(m: Molecule): [number, number, number] {
  const c: [number, number, number] = [0, 0, 0]
  for (const a of m.atoms) for (let k = 0; k < 3; k++) c[k] += a.pos[k]
  const n = Math.max(1, m.atoms.length)
  return [c[0] / n, c[1] / n, c[2] / n]
}

export interface CoordSource { entry: LibraryEntry | null; pubchem: boolean; edited: boolean }

/** Resolves where the current molecule's coordinates come from, or null for a hand-built / imported molecule. */
export function useCoordSource(mol: Molecule): CoordSource | null {
  const isLib = mol.id.startsWith('lib-')
  const pubchem = pubchemIds.has(mol.id)
  if (pubchem) return { entry: null, pubchem: true, edited: false }
  if (!isLib) return null
  const entry = lib.getEntry(mol.id.slice(4))
  if (!entry) return null
  return { entry, pubchem: entry.coordSource === 'pubchem', edited: !sameStructure(mol, entry.molecule) }
}
