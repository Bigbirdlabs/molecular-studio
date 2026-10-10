import { useEffect, useRef, useState, type RefObject } from 'react'
import { el } from '../chem/elements'
import { allowedValences, dist, type Atom, type Molecule } from '../chem/molecule'
import { useStudio } from '../store'
import { bondInfo } from '../chem/properties'
import { bondOrderName, fmtNum } from '../ui/i18n'

const DELAY_MS = 350
const MOVE_TO_REVEAL_PX = 4

function usedValence(m: Molecule, id: number): number {
  let n = 0
  for (const b of m.bonds) if (b.a === id || b.b === id) n += b.order
  return n
}

/** "O · Oksijen · 2/2 bağ" (+ "· yük -1") or "C–H · Tekli bağ (σ) · 1,090 Å" (SPEC B.4). */
function describe(): string | null {
  const s = useStudio.getState()
  const { mol, language: lang } = s
  if (s.hovered !== null) {
    const a = mol.atoms.find((x) => x.id === s.hovered) as Atom | undefined
    if (!a) return null
    const e = el(a.symbol)
    const max = Math.max(0, ...allowedValences(a))
    const bonds = lang === 'en' ? 'bonds' : 'bağ'
    const charge = a.charge !== 0 ? ` · ${lang === 'en' ? 'charge' : 'yük'} ${a.charge > 0 ? '+' : '-'}${Math.abs(a.charge)}` : ''
    return `${a.symbol} · ${lang === 'en' ? e.nameEn : e.name} · ${usedValence(mol, a.id)}/${max} ${bonds}${charge}`
  }
  if (s.hoveredBond !== null) {
    const b = mol.bonds.find((x) => x.id === s.hoveredBond)
    const a = b && mol.atoms.find((x) => x.id === b.a)
    const c = b && mol.atoms.find((x) => x.id === b.b)
    if (!b || !a || !c) return null
    // the same aromaticity-aware name the inspector shows (an aromatic bond is neither "single" nor "double")
    const info = bondInfo(mol, b.id)
    const name = info ? (lang === 'en' ? info.orderNameEn : info.orderName) : bondOrderName(b.order, lang)
    return `${a.symbol}–${c.symbol} · ${name} · ${fmtNum(lang, dist(a.pos, c.pos), 3)} Å`
  }
  return null
}

/**
 * Hover tooltip for fine pointers (~350 ms delay, hidden while a button is down). Touch has no hover: a tap selects and
 * the inspector shows the same data. Only this component re-renders on hover; the scene layers do not.
 */
export function HoverTip({ host }: { host: RefObject<HTMLElement | null> }) {
  const hovered = useStudio((s) => s.hovered)
  const hoveredBond = useStudio((s) => s.hoveredBond)
  const mol = useStudio((s) => s.mol)
  const language = useStudio((s) => s.language)
  const [shown, setShown] = useState(false)
  const tip = useRef<HTMLDivElement>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const pressed = useRef(false)
  /** Pointer position of the last press: the tip stays away from the atom just clicked (it would cover its measurement label) until the pointer moves. */
  const downAt = useRef<{ x: number; y: number } | null>(null)
  const [suppressed, setSuppressed] = useState(false)

  const place = () => {
    const t = tip.current, h = host.current
    if (!t || !h) return
    const r = h.getBoundingClientRect()
    const w = t.offsetWidth
    const x = Math.min(Math.max(4, pointer.current.x - r.left + 14), Math.max(4, r.width - w - 4))
    const y = Math.max(4, pointer.current.y - r.top + 16)
    t.style.transform = `translate(${x}px, ${y}px)`
  }

  useEffect(() => {
    const h = host.current
    if (!h) return
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY }
      const d = downAt.current
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > MOVE_TO_REVEAL_PX) { downAt.current = null; setSuppressed(false) }
      place()
    }
    const onDown = (e: PointerEvent) => {
      pressed.current = true
      downAt.current = { x: e.clientX, y: e.clientY }
      setSuppressed(true)
      setShown(false)
    }
    const onUp = () => { pressed.current = false }
    h.addEventListener('pointermove', onMove)
    h.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      h.removeEventListener('pointermove', onMove)
      h.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host])

  useEffect(() => {
    setShown(false)
    if ((hovered === null && hoveredBond === null) || pressed.current || suppressed) return
    const id = window.setTimeout(() => setShown(true), DELAY_MS)
    return () => window.clearTimeout(id)
  }, [hovered, hoveredBond, suppressed])

  const text = shown ? describe() : null
  useEffect(() => { if (text) place() })
  void mol
  void language
  if (!text) return null
  return (
    <div
      ref={tip}
      role="tooltip"
      className="pointer-events-none absolute left-0 top-0 z-10 whitespace-nowrap rounded-ctl border border-line-strong bg-surface-1 px-2 py-1 text-label text-ink"
    >
      {text}
    </div>
  )
}
