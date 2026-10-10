import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Transition } from 'motion/react'

/* Variant B — "Periodic -> Molecule". ~4.5 s. See gauntlet/intro/variantB-notes.md */

const SURFACE = '#0a0b0d'
const LINE = '#23262c'
const LINE_HI = '#323640'
const INK = '#e6e8eb'
const DIM = '#9aa1ab'
const ACCENT = '#5ec8e5'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SANS = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'

type Ease = [number, number, number, number]
const EASE: Ease = [0.22, 1, 0.36, 1]
const WIPE: Ease = [0.76, 0, 0.24, 1]

const EXIT_AT_MS = 4000
const WIPE_MS = 500
const SKIP_WIPE_MS = 260

type Element = 'H' | 'C' | 'O'
interface Cell { sym: string; col: number; row: number }
interface Origin { x: number; y: number }
interface Geo { w: number; h: number; cell: number; origins: Record<Element, Origin> }

/* 18 x 4 slice of the periodic table */
const ROWS: ReadonlyArray<{ syms: string[]; cols: number[] }> = [
  { syms: ['H', 'He'], cols: [1, 18] },
  { syms: ['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'], cols: [1, 2, 13, 14, 15, 16, 17, 18] },
  { syms: ['Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar'], cols: [1, 2, 13, 14, 15, 16, 17, 18] },
  {
    syms: ['K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'],
    cols: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  },
]
const CELLS: Cell[] = ROWS.flatMap((r, ri) => r.syms.map((sym, i) => ({ sym, col: r.cols[i], row: ri + 1 })))

const HIGHLIGHT: Record<Element, number> = { H: 1.0, C: 1.2, O: 1.4 }
const CPK: Record<Element, string> = { C: '#909090', H: '#ffffff', O: '#ff0d0d' }
const RAD: Record<Element, number> = { C: 0.3, H: 0.17, O: 0.28 }

/* Ethanol skeleton, 2D projection in angstrom. C-C 1.54, C-O 1.43, O-H 0.96, C-O-H ~108.5 deg */
interface Atom { id: string; el: Element; x: number; y: number }
const polar = (deg: number, len: number): [number, number] => [Math.cos((deg * Math.PI) / 180) * len, Math.sin((deg * Math.PI) / 180) * len]
const C1: [number, number] = [0, 0]
const C2: [number, number] = [polar(-30, 1.54)[0], polar(-30, 1.54)[1]]
const OO: [number, number] = [C2[0] + polar(30, 1.43)[0], C2[1] + polar(30, 1.43)[1]]
const hAt = (base: [number, number], deg: number, len: number): [number, number] => [base[0] + polar(deg, len)[0], base[1] + polar(deg, len)[1]]
const ATOMS: Atom[] = [
  { id: 'C1', el: 'C', x: C1[0], y: C1[1] },
  { id: 'C2', el: 'C', x: C2[0], y: C2[1] },
  { id: 'O', el: 'O', x: OO[0], y: OO[1] },
  { id: 'HO', el: 'H', ...toXY(hAt(OO, -41.5, 0.96)) },
  { id: 'H1a', el: 'H', ...toXY(hAt(C1, 150, 1.09)) },
  { id: 'H1b', el: 'H', ...toXY(hAt(C1, 90, 1.09)) },
  { id: 'H1c', el: 'H', ...toXY(hAt(C1, 210, 1.09)) },
  { id: 'H2a', el: 'H', ...toXY(hAt(C2, -60, 1.09)) },
  { id: 'H2b', el: 'H', ...toXY(hAt(C2, -120, 1.09)) },
]
function toXY(p: [number, number]): { x: number; y: number } { return { x: p[0], y: p[1] } }
const BONDS: ReadonlyArray<[string, string]> = [
  ['C1', 'C2'], ['C2', 'O'], ['O', 'HO'], ['C1', 'H1a'], ['C1', 'H1b'], ['C1', 'H1c'], ['C2', 'H2a'], ['C2', 'H2b'],
]

const fullStyle: CSSProperties = { position: 'absolute', inset: 0 }

export default function Intro({ onDone }: { onDone: () => void }): ReactElement {
  const rm = useReducedMotion() === true
  const [geo, setGeo] = useState<Geo | null>(null)
  const [exit, setExit] = useState<{ ms: number; fade: boolean } | null>(null)
  const doneRef = useRef(false)
  const timers = useRef<number[]>([])
  const cellRefs = useRef<Partial<Record<Element, HTMLDivElement | null>>>({})
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const tr = useCallback(
    (delay: number, duration: number, ease: Ease = EASE): Transition => (rm ? { duration: 0 } : { delay, duration, ease }),
    [rm],
  )

  const finish = useCallback((ms: number, fade: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    setExit({ ms, fade })
    timers.current.push(window.setTimeout(() => onDoneRef.current(), ms + 40))
  }, [])

  useLayoutEffect(() => {
    const measure = (): void => {
      const o = {} as Record<Element, Origin>
      let cell = 20
      for (const el of ['H', 'C', 'O'] as const) {
        const node = cellRefs.current[el]
        if (!node) return
        const r = node.getBoundingClientRect()
        o[el] = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        cell = r.width
      }
      setGeo({ w: window.innerWidth, h: window.innerHeight, cell, origins: o })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    const list = timers.current
    list.push(window.setTimeout(() => (rm ? finish(300, true) : finish(WIPE_MS, false)), rm ? 600 : EXIT_AT_MS))
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter') finish(SKIP_WIPE_MS, false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      list.forEach((t) => window.clearTimeout(t))
    }
  }, [rm, finish])

  /* molecule layout in px */
  const mol = useMemo(() => {
    if (!geo) return null
    const s = Math.max(28, Math.min(geo.w / 7.5, geo.h / 9, 80))
    const xs = ATOMS.map((a) => a.x), ys = ATOMS.map((a) => a.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const cx = geo.w / 2, cy = geo.h * 0.55
    const px = new Map<string, { x: number; y: number; el: Element }>()
    for (const a of ATOMS) {
      px.set(a.id, { x: cx + (a.x - (minX + maxX) / 2) * s, y: cy + (a.y - (minY + maxY) / 2) * s, el: a.el })
    }
    return { s, px, bottom: cy + ((maxY - minY) / 2 + RAD.O + 0.2) * s }
  }, [geo])

  const exitStyle = exit
  const gridExit = exitStyle && !exitStyle.fade

  return (
    <motion.div
      role="dialog"
      aria-label="Molecular Studio"
      onClick={() => finish(SKIP_WIPE_MS, false)}
      initial={false}
      animate={
        exit
          ? exit.fade
            ? { opacity: 0, clipPath: 'inset(0% 0% 0% 0%)' }
            : { opacity: 1, clipPath: 'inset(50% 0% 50% 0%)' }
          : { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }
      }
      transition={exit ? { duration: exit.ms / 1000, ease: exit.fade ? 'easeOut' : WIPE } : { duration: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: SURFACE, color: INK, fontFamily: SANS, overflow: 'hidden', cursor: 'pointer' }}
    >
      {/* periodic grid */}
      <motion.div
        initial={false}
        animate={{ opacity: rm ? 0.3 : 0.3, scaleY: gridExit ? 0 : 1 }}
        transition={gridExit ? { duration: exit.ms / 1000, ease: WIPE } : rm ? { duration: 0 } : { delay: 1.7, duration: 0.6 }}
        style={{ position: 'absolute', left: '50%', top: '9%', width: 'min(94vw, 960px)', translate: '-50% 0', transformOrigin: '50% 50%' }}
      >
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(18, 1fr)', gap: 'clamp(1px, 0.3vw, 3px)', position: 'relative' }}
        >
          {CELLS.map((c) => {
            const hl = c.sym === 'H' || c.sym === 'C' || c.sym === 'O' ? (c.sym as Element) : null
            const base = 0.025 * c.col + 0.04 * c.row
            return (
              <motion.div
                key={c.sym}
                ref={hl ? (n) => { cellRefs.current[hl] = n } : undefined}
                initial={rm ? false : { opacity: 0 }}
                animate={{
                  opacity: 1,
                  borderColor: hl ? [LINE, LINE, ACCENT, ACCENT] : LINE,
                  color: hl ? [DIM, DIM, INK, DIM] : DIM,
                }}
                transition={
                  rm
                    ? { duration: 0 }
                    : {
                        opacity: { delay: base, duration: 0.5, ease: EASE },
                        borderColor: hl ? { delay: HIGHLIGHT[hl] - 0.05, duration: 0.9, times: [0, 0.05, 0.2, 1] } : { duration: 0 },
                        color: hl ? { delay: HIGHLIGHT[hl] - 0.05, duration: 0.9, times: [0, 0.05, 0.2, 1] } : { duration: 0 },
                      }
                }
                style={{
                  gridColumn: c.col,
                  gridRow: c.row,
                  aspectRatio: '1 / 1.15',
                  border: `1px solid ${LINE}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: MONO,
                  fontSize: 'clamp(6px, 1.45vw, 14px)',
                  letterSpacing: 0,
                }}
              >
                <motion.span
                  initial={false}
                  animate={{ opacity: hl && !rm ? [1, 1, 0.15] : 1 }}
                  transition={hl && !rm ? { delay: 0, duration: 1.9, times: [0, 0.88, 1] } : { duration: 0 }}
                >
                  {c.sym}
                </motion.span>
              </motion.div>
            )
          })}
          {/* scanner */}
          {!rm && (
            <motion.div
              aria-hidden
              initial={{ left: '0%', opacity: 0 }}
              animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
              transition={{ delay: 0.6, duration: 1.0, ease: [0.45, 0, 0.55, 1], opacity: { delay: 0.6, duration: 1.0, times: [0, 0.1, 0.9, 1] } }}
              style={{ position: 'absolute', top: -10, bottom: -10, width: 1, background: ACCENT, pointerEvents: 'none' }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* molecule layer */}
      {geo && mol && (
        <svg aria-hidden style={fullStyle} width="100%" height="100%" viewBox={`0 0 ${geo.w} ${geo.h}`} preserveAspectRatio="none">
          {BONDS.map(([a, b], i) => {
            const pa = mol.px.get(a), pb = mol.px.get(b)
            if (!pa || !pb) return null
            return (
              <motion.line
                key={`${a}-${b}`}
                x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                stroke={DIM}
                strokeWidth={Math.max(2, mol.s * 0.05)}
                strokeLinecap="round"
                initial={rm ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={rm ? { duration: 0 } : { delay: 2.55 + i * 0.05, duration: 0.4, ease: EASE }}
              />
            )
          })}
          {ATOMS.map((a, i) => {
            const p = mol.px.get(a.id)
            if (!p) return null
            const o = geo.origins[a.el]
            const r = RAD[a.el] * mol.s
            const d = 1.7 + i * 0.045
            return (
              <g key={a.id}>
                <motion.circle
                  fill={CPK[a.el]}
                  stroke={SURFACE}
                  strokeWidth={1.5}
                  initial={rm ? false : { cx: o.x, cy: o.y, r: geo.cell * 0.28, opacity: 0 }}
                  animate={{ cx: p.x, cy: p.y, r, opacity: 1 }}
                  transition={
                    rm
                      ? { duration: 0 }
                      : { cx: { delay: d, duration: 0.7, ease: EASE }, cy: { delay: d, duration: 0.7, ease: EASE }, r: { delay: d, duration: 0.7, ease: EASE }, opacity: { delay: d, duration: 0.2 } }
                  }
                />
                {a.el !== 'H' && (
                  <motion.text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily={MONO}
                    fontSize={r * 0.95}
                    fontWeight={600}
                    fill={a.el === 'O' ? '#ffffff' : SURFACE}
                    initial={rm ? false : { x: o.x, y: o.y, opacity: 0 }}
                    animate={{ x: p.x, y: p.y, opacity: 1 }}
                    transition={
                      rm
                        ? { duration: 0 }
                        : { x: { delay: d, duration: 0.7, ease: EASE }, y: { delay: d, duration: 0.7, ease: EASE }, opacity: { delay: d + 0.35, duration: 0.3 } }
                    }
                  >
                    {a.el}
                  </motion.text>
                )}
              </g>
            )
          })}
        </svg>
      )}

      {/* caption */}
      {mol && (
        <motion.div
          initial={rm ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={tr(2.9, 0.5)}
          style={{ position: 'absolute', left: 0, right: 0, top: mol.bottom, textAlign: 'center', fontFamily: MONO, fontSize: 'clamp(9px, 2.6vw, 11px)', color: DIM, padding: '0 16px' }}
        >
          C₂H₅OH · O–H 0.96 Å · C–O 1.43 Å · C–O–H 108.5°
        </motion.div>
      )}

      {/* wordmark */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '9%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px', pointerEvents: 'none' }}>
        <div style={{ position: 'relative', display: 'inline-block', paddingBottom: 10 }}>
          <motion.h1
            initial={rm ? false : { opacity: 0, letterSpacing: '-0.07em', y: 6 }}
            animate={{ opacity: 1, letterSpacing: '-0.01em', y: 0 }}
            transition={tr(3.0, 0.7)}
            style={{ margin: 0, fontFamily: SANS, fontWeight: 600, fontSize: 'clamp(28px, 8vw, 56px)', lineHeight: 1.1, color: INK, whiteSpace: 'nowrap' }}
          >
            Molecular Studio
          </motion.h1>
          <motion.div
            initial={rm ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={tr(3.3, 0.5)}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: ACCENT, transformOrigin: '0% 50%' }}
          />
        </div>
        <motion.p
          initial={rm ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={tr(3.5, 0.5)}
          style={{ margin: '14px 0 0', fontSize: 'clamp(12px, 3.4vw, 16px)', color: DIM, textAlign: 'center' }}
        >
          Moleküler Modelleme Stüdyosu
        </motion.p>
      </div>

      {/* skip */}
      <button
        type="button"
        aria-label="Atla / Skip"
        onClick={(e) => { e.stopPropagation(); finish(SKIP_WIPE_MS, false) }}
        style={{
          position: 'absolute', right: 16, bottom: 16, background: 'transparent', border: `1px solid ${LINE_HI}`, color: DIM,
          fontFamily: MONO, fontSize: 11, padding: '6px 10px', borderRadius: 2, cursor: 'pointer',
        }}
      >
        Atla / Skip
      </button>
    </motion.div>
  )
}
