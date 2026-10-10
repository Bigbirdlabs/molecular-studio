import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MutableRefObject, ReactElement } from 'react'
import { AnimatePresence, motion, useAnimationFrame, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'

const SURFACE = '#0a0b0d'
const LINE = '#323640'
const INK = '#e6e8eb'
const INK_DIM = '#9aa1ab'
const INK_FAINT = '#6f7681'
const ACCENT = '#5ec8e5'
const CPK_C = '#909090'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'
const EASE: [number, number, number, number] = [0.76, 0, 0.24, 1]
const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Tetrahedral directions (unit vectors)
const K = 1 / Math.sqrt(3)
const DIRS: ReadonlyArray<readonly [number, number, number]> = [
  [K, K, K],
  [K, -K, -K],
  [-K, K, -K],
  [-K, -K, K],
]
const TILT = 0.38
const ARC_SAMPLES = 24

type V3 = readonly [number, number, number]

interface ExitCustom {
  fast: boolean
  rm: boolean
}

type Lang = 'tr' | 'en'

const COPY: Record<Lang, { sub: string; caption: string; skip: string; skipAria: string; dialog: string }> = {
  tr: {
    sub: 'Moleküler Modelleme Stüdyosu',
    caption: 'CH₄ · METAN',
    skip: 'Atla',
    skipAria: 'Girişi atla / Skip intro',
    dialog: 'Molecular Studio',
  },
  en: {
    sub: 'Molecular Modeling Studio',
    caption: 'CH₄ · METHANE',
    skip: 'Skip',
    skipAria: 'Skip intro',
    dialog: 'Molecular Studio',
  },
}

// Rotate about Y by a, then tilt about X. Returns [x, y(up), z(toward viewer)].
function rot(a: number, v: V3): V3 {
  const [x, y, z] = v
  const xr = x * Math.cos(a) + z * Math.sin(a)
  const zr = -x * Math.sin(a) + z * Math.cos(a)
  const yr = y * Math.cos(TILT) - zr * Math.sin(TILT)
  const zt = y * Math.sin(TILT) + zr * Math.cos(TILT)
  return [xr, yr, zt]
}

function slerp(u1: V3, u2: V3, t: number): V3 {
  const dot = Math.min(1, Math.max(-1, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]))
  const om = Math.acos(dot)
  const s = Math.sin(om) || 1
  const w1 = Math.sin((1 - t) * om) / s
  const w2 = Math.sin(t * om) / s
  return [w1 * u1[0] + w2 * u2[0], w1 * u1[1] + w2 * u2[1], w1 * u1[2] + w2 * u2[2]]
}

const clamp01 = (p: number): number => Math.min(1, Math.max(0, p))
const prog = (t: number, delay: number, dur: number): number => clamp01((t - delay) / dur)
const easeOut = (p: number): number => 1 - Math.pow(1 - p, 3)
const easeBack = (p: number): number => {
  const c1 = 1.70158
  const q = p - 1
  return 1 + (c1 + 1) * q * q * q + c1 * q * q
}

function useViewport(): { w: number; h: number } {
  const get = (): { w: number; h: number } =>
    typeof window === 'undefined' ? { w: 1280, h: 800 } : { w: window.innerWidth, h: window.innerHeight }
  const [vp, setVp] = useState(get)
  useEffect(() => {
    const on = (): void => setVp(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

interface Item {
  key: string
  depth: number
  node: ReactElement
}

function Molecule({
  vw,
  vh,
  rm,
  exitingRef,
  caption,
}: {
  vw: number
  vh: number
  rm: boolean
  exitingRef: MutableRefObject<boolean>
  caption: string
}): ReactElement {
  const [time, setTime] = useState(0)
  const rmRef = useRef(rm)
  rmRef.current = rm

  useAnimationFrame((t) => {
    if (rmRef.current || exitingRef.current) return
    setTime(t / 1000)
  })

  const t = rm ? 99 : time
  const a = rm ? 0.6 : 0.6 + time * 0.45

  // Sizes derived from the viewport so nothing clips on narrow screens
  const fw = Math.max(110, Math.min(250, vw / 2 - 20))
  const fh = Math.max(70, Math.min(170, vh * 0.19))
  const S = Math.min(150, fh * 0.88, fw * 0.6)
  const k = Math.max(0.5, S / 150)

  const rotated = DIRS.map((d) => rot(a, d))
  const scr = (v: V3, r: number): { x: number; y: number } => ({ x: v[0] * r, y: -v[1] * r })

  const items: Item[] = []
  rotated.forEach((u, i) => {
    const f = (u[2] + 1) / 2 // 0 rear .. 1 front
    const p = scr(u, S)
    const bp = easeOut(prog(t, 0.8 + i * 0.12, 0.7))
    items.push({
      key: `b${i}`,
      depth: u[2] / 2,
      node: (
        <line
          x1={0}
          y1={0}
          x2={p.x * bp}
          y2={p.y * bp}
          stroke={INK_DIM}
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.3 + 0.7 * f}
        />
      ),
    })
    const sc = Math.max(0, easeBack(prog(t, 1.25 + i * 0.12, 0.6)))
    const g = Math.round(196 + 59 * f)
    items.push({
      key: `h${i}`,
      depth: u[2],
      node: <circle cx={p.x} cy={p.y} r={15 * k * (0.85 + 0.25 * f) * sc} fill={`rgb(${g},${g},${g})`} />,
    })
  })
  items.push({
    key: 'c',
    depth: 0,
    node: <circle r={24 * k * Math.max(0, easeBack(prog(t, 0.25, 0.7)))} fill={CPK_C} />,
  })
  items.sort((x, y) => x.depth - y.depth)

  // Projected 3D great-circle arc between H1 and H2 bond vectors
  const arcR = S * 0.37
  const pts: string[] = []
  for (let n = 0; n <= ARC_SAMPLES; n++) {
    const q = scr(slerp(rotated[1], rotated[2], n / ARC_SAMPLES), arcR)
    pts.push(`${q.x.toFixed(2)},${q.y.toFixed(2)}`)
  }
  const lab = scr(slerp(rotated[1], rotated[2], 0.5), S * 0.6)
  const p0 = scr(rotated[0], S)
  const len0 = Math.hypot(p0.x, p0.y) || 1
  const lx = p0.x / 2 + (-p0.y / len0) * 16
  const ly = p0.y / 2 + (p0.x / len0) * 16

  const arcO = prog(t, 2.0, 0.6)
  const aLabO = prog(t, 2.15, 0.6)
  const lLabO = prog(t, 2.3, 0.6)
  const capO = prog(t, 2.2, 0.6)
  const frameO = prog(t, 0.1, 0.8)

  const text: CSSProperties = { fontFamily: MONO, fontSize: 12, letterSpacing: '0.04em' }
  const tick = Math.min(50, fw * 0.2)
  const br = 16
  const W = fw * 2
  const H = fh * 2 + 64

  return (
    <svg viewBox={`${-fw} ${-fh - 8} ${W} ${H}`} width={W} height={H} style={{ overflow: 'visible', display: 'block', maxWidth: '100%' }} aria-hidden>
      <g stroke={LINE} strokeWidth={1} fill="none" opacity={frameO}>
        <path
          d={`M${-fw} ${-fh + br} V${-fh} H${-fw + br} M${fw - br} ${-fh} H${fw} V${-fh + br} M${-fw} ${fh - br} V${fh} H${-fw + br} M${fw - br} ${fh} H${fw} V${fh - br}`}
        />
        <path d={`M${-fw} 0 h${tick} M${fw} 0 h${-tick} M0 ${-fh} v${tick * 0.6} M0 ${fh} v${-tick * 0.6}`} />
      </g>
      {items.map((it) => (
        <g key={it.key}>{it.node}</g>
      ))}
      <polyline points={pts.join(' ')} fill="none" stroke={ACCENT} strokeWidth={1} strokeDasharray="3 3" opacity={arcO} />
      <text x={lab.x} y={lab.y + 4} textAnchor="middle" fill={ACCENT} style={text} opacity={aLabO}>
        109.5°
      </text>
      <text x={lx} y={ly + 4} textAnchor="middle" fill={INK_DIM} style={text} opacity={lLabO}>
        1.09 Å
      </text>
      <text x={-fw} y={fh + 34} fill={INK_DIM} style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em' }} opacity={capO}>
        {caption}
        <tspan dx={14} fill={INK_FAINT}>
          C–H 1.09 Å · H–C–H 109.5°
        </tspan>
      </text>
    </svg>
  )
}

function Wordmark({ rm, sub }: { rm: boolean; sub: string }): ReactElement {
  const word = 'Molecular Studio'
  return (
    <div style={{ marginTop: 24, width: '100%', boxSizing: 'border-box', padding: '0 16px', textAlign: 'center' }}>
      <h1
        aria-label={word}
        style={{
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: SANS,
          fontWeight: 300,
          fontSize: 'clamp(28px, 7.4vw, 72px)',
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
          color: INK,
        }}
      >
        {word.split('').map((ch, i) => (
          <span key={i} aria-hidden style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.12em' }}>
            <motion.span
              style={{ display: 'inline-block', whiteSpace: 'pre' }}
              initial={rm ? false : { y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 0.7, delay: 2.5 + i * 0.045, ease: OUT }}
            >
              {ch}
            </motion.span>
          </span>
        ))}
      </h1>
      <div style={{ overflow: 'hidden', marginTop: 10 }}>
        <motion.p
          style={{
            margin: 0,
            textAlign: 'center',
            textIndent: '0.14em',
            fontFamily: SANS,
            fontSize: 'clamp(11px, 3vw, 16px)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: INK_DIM,
          }}
          initial={rm ? false : { y: '120%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{ duration: 0.7, delay: 3.2, ease: OUT }}
        >
          {sub}
        </motion.p>
      </div>
    </div>
  )
}

const variants: Variants = {
  show: { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' },
  exit: (c: ExitCustom) =>
    c.rm
      ? { opacity: 0, transition: { duration: 0.4 } }
      : {
          opacity: 0,
          scale: 1.04,
          clipPath: 'inset(50% 0% 50% 0%)',
          transition: { duration: c.fast ? 0.25 : 0.6, ease: EASE },
        },
}

export default function Intro({
  onDone,
  reducedMotion,
  language,
}: {
  onDone: () => void
  reducedMotion?: boolean
  language?: 'tr' | 'en'
}): ReactElement {
  const mq = useReducedMotion() ?? false
  const rm = Boolean(reducedMotion) || mq
  const copy = COPY[language === 'en' ? 'en' : 'tr']
  const vp = useViewport()
  const [exiting, setExiting] = useState(false)
  const [fast, setFast] = useState(false)
  const [focused, setFocused] = useState(false)
  const exitingRef = useRef(false)
  const doneRef = useRef(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const beginExit = useCallback((quick: boolean) => {
    if (exitingRef.current) return
    exitingRef.current = true
    setFast(quick)
    setExiting(true)
  }, [])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    onDoneRef.current()
  }, [])

  const skip = useCallback(() => beginExit(true), [beginExit])

  useEffect(() => {
    const id = window.setTimeout(() => beginExit(false), rm ? 600 : 4000)
    return () => window.clearTimeout(id)
  }, [rm, beginExit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter') skip()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skip])

  const custom: ExitCustom = { fast, rm }

  return (
    <AnimatePresence custom={custom} onExitComplete={finish}>
      {!exiting && (
        <motion.div
          key="intro-a"
          custom={custom}
          variants={variants}
          initial="show"
          animate="show"
          exit="exit"
          onClick={skip}
          role="dialog"
          aria-label={copy.dialog}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: SURFACE,
            color: INK,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <Molecule vw={vp.w} vh={vp.h} rm={rm} exitingRef={exitingRef} caption={copy.caption} />
          <Wordmark rm={rm} sub={copy.sub} />
          <button
            type="button"
            aria-label={copy.skipAria}
            onClick={(e) => {
              e.stopPropagation()
              skip()
            }}
            onFocus={(e) => {
              let visible = true
              try {
                visible = e.currentTarget.matches(':focus-visible')
              } catch {
                visible = true
              }
              setFocused(visible)
            }}
            onBlur={() => setFocused(false)}
            style={{
              position: 'absolute',
              right: 12,
              bottom: 12,
              minWidth: 44,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              padding: '0 14px',
              color: INK_DIM,
              fontFamily: MONO,
              fontSize: 12,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              outline: focused ? `2px solid ${ACCENT}` : 'none',
              outlineOffset: 2,
            }}
          >
            {copy.skip}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
