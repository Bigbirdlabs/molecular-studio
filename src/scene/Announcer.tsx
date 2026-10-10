import { useEffect, useState, type CSSProperties } from 'react'
import { el } from '../chem/elements'
import type { Molecule } from '../chem/molecule'
import { useStudio, type Language } from '../store'
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
 * Polite live region for the 3D workspace (SPEC B.4): announces selection and edits, since the canvas itself is opaque
 * to a screen reader. Subscribes to the store; only this tiny component re-renders, never the scene.
 */
export function Announcer() {
  const [text, setText] = useState('')

  useEffect(() => {
    let flip = false
    return useStudio.subscribe((s, p) => {
      if (s.loadNonce !== p.loadNonce) { setText(''); return }
      const m = MSG[s.language]
      let msg: string | null = null
      if (s.mol !== p.mol) {
        const dAtoms = s.mol.atoms.length - p.mol.atoms.length
        const dBonds = s.mol.bonds.length - p.mol.bonds.length
        if (dAtoms === 1) {
          const prevIds = new Set(p.mol.atoms.map((a) => a.id))
          const added = s.mol.atoms.find((a) => !prevIds.has(a.id))
          if (added) msg = m.added(added.symbol)
        } else if (dAtoms < 0) msg = m.removed
        else if (dBonds > 0 && dAtoms === 0) msg = m.bondAdded
        else if (dBonds < 0 && dAtoms === 0) msg = m.bondRemoved
        else if (dAtoms === 0 && dBonds === 0 && s.selection.length === 1 && s.selection === p.selection) {
          const now = s.mol.atoms.find((a) => a.id === s.selection[0])
          const was = p.mol.atoms.find((a) => a.id === s.selection[0])
          if (now && was && now.symbol !== was.symbol) {
            const e = el(now.symbol)
            msg = m.changed(now.symbol, s.language === 'en' ? e.nameEn : e.name)
          }
        }
      }
      if (msg === null && (s.selection !== p.selection || s.selectedBond !== p.selectedBond)) {
        if (s.selectedBond !== null) {
          const b = s.mol.bonds.find((x) => x.id === s.selectedBond)
          const a = b && s.mol.atoms.find((x) => x.id === b.a)
          const c = b && s.mol.atoms.find((x) => x.id === b.b)
          if (b && a && c) msg = m.bond(a.symbol, c.symbol, bondOrderName(b.order, s.language))
        } else if (s.selection.length === 1) {
          const a = s.mol.atoms.find((x) => x.id === s.selection[0])
          if (a) {
            const e = el(a.symbol)
            msg = m.atom(a.symbol, s.language === 'en' ? e.nameEn : e.name, bondCount(s.mol, a.id))
          }
        } else if (s.selection.length > 1) msg = m.atoms(s.selection.length)
        else if (p.selection.length > 0 || p.selectedBond !== null) msg = m.cleared
      }
      if (msg !== null) {
        flip = !flip
        setText(flip ? msg : `${msg}​`) // an identical message still changes the node, so it is announced again
      }
    })
  }, [])

  return (
    <div role="status" aria-live="polite" aria-atomic="true" data-testid="scene-announcer" style={SR_ONLY}>
      {text}
    </div>
  )
}
