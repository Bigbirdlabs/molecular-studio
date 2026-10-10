import type { Molecule } from '../chem/molecule'
import { atomInfo } from '../chem/properties'

/** Cheap numeric fingerprint of everything a Gasteiger charge depends on (elements, formal charges, connectivity). */
export function chargeTopologyKey(m: Molecule): number {
  let h = 17
  for (const a of m.atoms) {
    h = (Math.imul(h, 31) + a.id) | 0
    h = (Math.imul(h, 31) + a.charge + 7) | 0
    for (let i = 0; i < a.symbol.length; i++) h = (Math.imul(h, 31) + a.symbol.charCodeAt(i)) | 0
  }
  for (const b of m.bonds) {
    h = (Math.imul(h, 31) + b.a) | 0
    h = (Math.imul(h, 31) + b.b) | 0
    h = (Math.imul(h, 31) + b.order + (b.aromatic ? 8 : 0)) | 0
  }
  return h
}

/** Approximate (Gasteiger) partial charge per atom id, from the properties module. Never throws. */
export function computePartialCharges(m: Molecule): Map<number, number> {
  const out = new Map<number, number>()
  for (const a of m.atoms) {
    let q = 0
    try {
      const info = atomInfo(m, a.id)
      if (info && info.partialCharge !== null && Number.isFinite(info.partialCharge)) q = info.partialCharge
    } catch {
      q = 0
    }
    out.set(a.id, q)
  }
  return out
}
