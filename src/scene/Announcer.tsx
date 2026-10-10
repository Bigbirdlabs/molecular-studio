import { useEffect, useState, type CSSProperties } from 'react'
import { getElement } from '../chem/elements'
import type { Molecule } from '../chem/molecule'
import { useStudio, type Language, type StudioState } from '../store'
import { bondInfo } from '../chem/properties'
import { bondOrderName } from '../ui/i18n'

/** Visually hidden but available to assistive technology (the same pattern as Tailwind's `sr-only`). */
const SR_ONLY: CSSProperties = {
  position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}

const bondCount = (m: Molecule, id: number) => m.bonds.reduce((n, b) => n + (b.a === id || b.b === id ? 1 : 0), 0)

const MSG = {
  tr: {
    atom: (sym: string, name: string, n: number) => `Seçildi: ${sym}, ${name}, ${n} bağ`,
    atoms: (n: number) => `${n} atom seçildi`,
    bond: (a: string, b: string, order: string) => `Seçildi: ${a}–${b} bağı, ${order}`,
    cleared: 'Seçim temizlendi',
    added: (sym: string) => `${sym} atomu eklendi`,
    removed: 'Atom silindi',
    bondAdded: 'Bağ eklendi',
    bondRemoved: 'Bağ silindi',
    changed: (sym: string, name: string) => `Element değişti: ${sym}, ${name}`,
  },
  en: {
    atom: (sym: string, name: string, n: number) => `Selected: ${sym}, ${name}, ${n} ${n === 1 ? 'bond' : 'bonds'}`,
    atoms: (n: number) => `${n} atoms selected`,
    bond: (a: string, b: string, order: string) => `Selected: ${a}–${b} bond, ${order}`,
    cleared: 'Selection cleared',
    added: (sym: string) => `${sym} atom added`,
    removed: 'Atom deleted',
    bondAdded: 'Bond added',
    bondRemoved: 'Bond deleted',
    changed: (sym: string, name: string) => `Element changed: ${sym}, ${name}`,
  },
} satisfies Record<Language, unknown>

/**
 * What did this edit do? Derived from the atom / bond id sets and element changes, not from the atom-count delta: a click
 * with auto-hydrogen on adds the chosen atom plus its hydrogens (count +3), and replacing an H by O keeps the id (O) and adds
 * an H (count +1). The announced atom is the one the user chose: a hydrogen replaced by another element, else the selected
 * new atom, else the first new non-hydrogen, else the first new atom.
 */
function describeEdit(prev: Molecule, next: Molecule, selection: readonly number[], language: Language): string | null {
  const m = MSG[language]
  const before = new Map(prev.atoms.map((a) => [a.id, a]))
  const after = new Map(next.atoms.map((a) => [a.id, a]))
  const added = next.atoms.filter((a) => !before.has(a.id))
  const removed = prev.atoms.filter((a) => !after.has(a.id))
  const retyped = next.atoms.filter((a) => {
    const was = before.get(a.id)
    return was !== undefined && was.symbol !== a.symbol
  })

  // a hydrogen replaced by the chosen element reads as "<element> atom added" (it took the hydrogen's slot)
  const filled = retyped.find((a) => before.get(a.id)!.symbol === 'H' && a.symbol !== 'H')
  if (filled) return m.added(filled.symbol)
  if (added.length > 0) {
    const chosen = added.find((a) => selection.includes(a.id)) ?? added.find((a) => a.symbol !== 'H') ?? added[0]
    return m.added(chosen.symbol)
  }
  if (removed.length > 0) return m.removed
  if (retyped.length > 0) {
    const a = retyped.find((x) => selection.includes(x.id)) ?? retyped[0]
    const e = getElement(a.symbol) // never throws inside the store listener: an unknown symbol is announced by its symbol alone
    return m.changed(a.symbol, e ? (language === 'en' ? e.nameEn : e.name) : a.symbol)
  }
  const dBonds = next.bonds.length - prev.bonds.length
  if (dBonds > 0) return m.bondAdded
  if (dBonds < 0) return m.bondRemoved
  return null
}

/**
 * Polite live region for the 3D workspace (SPEC B.4): announces selection and edits, since the canvas itself is opaque
 * to a screen reader. Subscribes to the store; only this tiny component re-renders, never the scene.
 */
export function Announcer() {
  const [text, setText] = useState('')

  useEffect(() => {
    let flip = false
    const announce = (s: StudioState, p: StudioState) => {
      if (s.loadNonce !== p.loadNonce) { setText(''); return }
      const m = MSG[s.language]
      let msg: string | null = null
      if (s.mol !== p.mol) msg = describeEdit(p.mol, s.mol, s.selection, s.language)
      if (msg === null && (s.selection !== p.selection || s.selectedBond !== p.selectedBond)) {
        if (s.selectedBond !== null) {
          const b = s.mol.bonds.find((x) => x.id === s.selectedBond)
          const a = b && s.mol.atoms.find((x) => x.id === b.a)
          const c = b && s.mol.atoms.find((x) => x.id === b.b)
          if (b && a && c) {
            // aromaticity-aware, like the inspector: a benzene bond is announced as aromatic, not as single or double
            const info = bondInfo(s.mol, b.id)
            const name = info ? (s.language === 'en' ? info.orderNameEn : info.orderName) : bondOrderName(b.order, s.language)
            msg = m.bond(a.symbol, c.symbol, name)
          }
        } else if (s.selection.length === 1) {
          const a = s.mol.atoms.find((x) => x.id === s.selection[0])
          if (a) {
            const e = getElement(a.symbol)
            msg = m.atom(a.symbol, e ? (s.language === 'en' ? e.nameEn : e.name) : a.symbol, bondCount(s.mol, a.id))
          }
        } else if (s.selection.length > 1) msg = m.atoms(s.selection.length)
        else if (p.selection.length > 0 || p.selectedBond !== null) msg = m.cleared
      }
      if (msg !== null) {
        flip = !flip
        setText(flip ? msg : `${msg}​`) // an identical message still changes the node, so it is announced again
      }
    }
    return useStudio.subscribe((s, p) => {
      // a throwing listener would make zustand skip every listener after it (autosave...): the announcer must never throw
      try { announce(s, p) } catch { /* nothing sensible to announce */ }
    })
  }, [])

  return (
    <div role="status" aria-live="polite" aria-atomic="true" data-testid="scene-announcer" style={SR_ONLY}>
      {text}
    </div>
  )
}
