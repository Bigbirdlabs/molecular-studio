import { useEffect, useRef } from 'react'
import { getSplats, layoutSplats, SCAN_DUR, SCAN_T0 } from './splats'
import type { Layout } from './splats'

const SURFACE = '#0a0b0d'
const INK = '#e6e8eb'
const INK_DIM = '#9aa1ab'
const ACCENT = '#5ec8e5'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

type Lang = 'tr' | 'en'
interface Props {
  onDone: () => void
  reducedMotion?: boolean
  language?: Lang
  /** Debug/capture: render exactly the frame at this timeline time (ms); never exits. */
  freezeAt?: number
}

const COPY: Record<Lang, { sub: string; skip: string; aria: string; atoms: string; stages: [string, string, string] }> = {
  tr: { sub: 'Moleküler Modelleme Stüdyosu', skip: 'Atla', aria: 'Girişi atla', atoms: 'atom', stages: ['TARAMA', 'KALDIRMA', 'GÖLGELEME'] },
  en: { sub: 'Molecular Modeling Studio', skip: 'Skip', aria: 'Skip intro', atoms: 'atoms', stages: ['SCAN', 'LIFT', 'SHADE'] },
}
const INK_FAINT = '#6f7681'
const LINE = '#323640'

const TOTAL = 10.0
const EXIT_AT = 8.8
const EXIT_DUR = TOTAL - EXIT_AT
const REDUCED_SCENE_T = 8.4
const TILT_MAX = (35 * Math.PI) / 180
const PERSP = 26
const DEPTH_BUCKETS = 512
const DEPTH_RANGE = 12

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x)
const ss = (x: number): number => {
  const c = clamp01(x)
  return c * c * (3 - 2 * c)
}
const eio = (x: number): number => {
  const c = clamp01(x)
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

const colorCache: string[] = new Array<string>(262144)
function colorStr(key: number): string {
  let s = colorCache[key]
  if (s === undefined) {
    s = `rgb(${((key >> 12) & 63) * 4 + 2},${((key >> 6) & 63) * 4 + 2},${(key & 63) * 4 + 2})`
    colorCache[key] = s
  }
  return s
}
const q6 = (v: number): number => {
  const c = v < 0 ? 0 : v > 255 ? 255 : v
  return c >> 2
}

const CSS = `.msi-c-skip{transition:color .2s,border-color .2s}
.msi-c-skip:hover{color:${INK};border-color:#6f7681}
.msi-c-skip:focus-visible{outline:2px solid ${ACCENT};outline-offset:3px}`

export default function Intro({ onDone, reducedMotion, language = 'tr', freezeAt }: Props) {
  const onDoneRef = useRef(onDone)
  const doneRef = useRef(false)
  const skipFnRef = useRef<() => void>(() => undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wordRef = useRef<HTMLDivElement>(null)
  const ruleRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const stagesRef = useRef<[string, string, string]>(COPY.tr.stages)
  const skipBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    onDoneRef.current = onDone
  })

  const lang: Lang = language === 'en' ? 'en' : 'tr'
  const copy = COPY[lang]
  stagesRef.current = copy.stages
  const data = getSplats()
  const caption = `${data.meta.formula} · ${data.meta.name} / ${data.meta.nameEn} · ${data.meta.atomCount} ${copy.atoms}`

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      // No 2D canvas: never leave a blocking overlay up.
      if (freezeAt === undefined && !doneRef.current) {
        doneRef.current = true
        onDoneRef.current()
      }
      return
    }

    const rm =
      reducedMotion ??
      (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    const frozen = freezeAt !== undefined
    const ft = frozen ? Math.max(0, freezeAt) / 1000 : 0
    const staticScene = rm || frozen

    const d = getSplats()
    const n = d.n
    const px = new Float32Array(n)
    const py = new Float32Array(n)
    const pz = new Float32Array(n)
    const psz = new Float32Array(n)
    const pa = new Float32Array(n)
    const pk = new Uint32Array(n)
    const pb = new Uint16Array(n)
    const order = new Uint32Array(n)
    const bucket = new Uint32Array(DEPTH_BUCKETS + 1)

    // flat-plate extent (A, molecule-centred) for the 2D-phase ruler
    let ex0 = Infinity
    let ex1 = -Infinity
    let ey0 = Infinity
    let ey1 = -Infinity
    for (let i = 0; i < n; i++) {
      if (d.kind[i] === 2) continue
      const fx = d.fx[i]
      const fy = d.fy[i]
      if (fx < ex0) ex0 = fx
      if (fx > ex1) ex1 = fx
      if (fy < ey0) ey0 = fy
      if (fy > ey1) ey1 = fy
    }
    if (!(ex1 > ex0)) {
      ex0 = -1
      ex1 = 1
      ey0 = -1
      ey1 = 1
    }
    ex0 -= 0.45
    ex1 += 0.45
    ey0 -= 0.45
    ey1 += 0.45

    let lay: Layout = { W: 1, H: 1, scale: 1, cx: 0, cy: 0, cell: 1 }
    let dpr = 1
    let dirty = true

    const doLayout = (): void => {
      const r = root.getBoundingClientRect()
      const W = Math.max(1, Math.round(r.width))
      const H = Math.max(1, Math.round(r.height))
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(W * dpr)
      canvas.height = Math.round(H * dpr)
      lay = layoutSplats(d, W, H)
      const tx = textRef.current
      if (tx) tx.style.top = `${Math.round(lay.cy + d.rMax * lay.scale + 28)}px`
      dirty = true
    }
    doLayout()

    let raf = 0
    let t0 = -1
    let parkTimer = 0
    let exitStart = -1
    let exitDur = EXIT_DUR
    let exitFrom = 1

    const finish = (): void => {
      if (doneRef.current) return
      doneRef.current = true
      cancelAnimationFrame(raf)
      window.clearTimeout(parkTimer)
      onDoneRef.current()
    }

    let twNow = 0
    let kick = (): void => undefined
    const skip = (): void => {
      if (doneRef.current || frozen) return
      if (t0 >= 0) twNow = (performance.now() - t0) / 1000
      const p = exitStart >= 0 ? clamp01((twNow - exitStart) / exitDur) : 0
      const cur = exitStart >= 0 ? exitFrom * (1 - eio(p)) : 1
      const remaining = exitStart >= 0 ? (1 - p) * exitDur : Infinity
      if (remaining <= 0.3) return
      exitFrom = cur
      exitStart = twNow
      exitDur = 0.3
      kick()
    }
    skipFnRef.current = skip

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault()
        skip()
      }
    }
    window.addEventListener('keydown', onKey)
    const onResize = (): void => {
      doLayout()
      kick()
    }
    window.addEventListener('resize', onResize)

    const frame = (t: number): void => {
      const { W, H, scale, cx, cy, cell } = lay
      const fs = cell * 0.84
      const flatSz = Math.max(2.2, 0.042 * scale)
      const dustSz = Math.max(1.5, 0.03 * scale)

      const tilt = TILT_MAX * ss((t - 2.8) / 2.6)
      const u = clamp01((t - 3.0) / 5.6)
      const yaw = 0.6 * (0.5 - 0.5 * Math.cos(Math.PI * u))
      const cyw = Math.cos(yaw)
      const syw = Math.sin(yaw)
      const ct = Math.cos(tilt)
      const st = Math.sin(tilt)
      const intro = ss(t / 0.6)
      const gd = ss((t - 0.5) / 2.0)
      const dustFade = 1 - ss((t - 2.0) / 1.5)
      // fixed view-space light
      const lx = -0.5
      const ly = 0.55
      const lz = 0.67
      const DK = 0.6 // darker start colour for the opening tile field
      const ll = Math.hypot(lx, ly, lz)
      const Lx = lx / ll
      const Ly = ly / ll
      const Lz = lz / ll

      bucket.fill(0)
      for (let i = 0; i < n; i++) {
        const kind = d.kind[i]
        const tl = d.tLift[i]
        const lf = ss((t - tl) / 0.9)
        let X: number
        let Y: number
        let Z = 0
        let r: number
        let g: number
        let b: number
        let a: number
        let sz: number
        const ph = d.phase[i]
        if (kind === 2) {
          X = d.sx[i] + Math.sin(t * 0.6 + ph) * 0.05
          Y = d.sy[i] + Math.cos(t * 0.5 + ph * 1.3) * 0.05
          Z = d.cz3[i] * lf
          const dr = d.fr[i] * DK
          const dg = d.fg[i] * DK
          const db = d.fb[i] * DK
          r = dr + (130 - dr) * gd
          g = dg + (140 - dg) * gd
          b = db + (152 - db) * gd
          a = 0.5 * (0.7 + (0.12 - 0.7) * gd) * dustFade * intro
          sz = fs + (dustSz - fs) * gd
        } else {
          const mg = eio((t - d.delay[i]) / d.dur[i])
          const sxi = d.sx[i]
          const syi = d.sy[i]
          const fxi = d.fx[i]
          const fyi = d.fy[i]
          const ddx = fxi - sxi
          const ddy = fyi - syi
          const sw = Math.sin(Math.PI * mg)
          const kc = d.curl[i] * sw
          const wob = 0.12 * sw
          const drift = (1 - mg) * 0.05
          X = sxi + ddx * mg - ddy * kc + Math.sin(ph + t * d.freq[i]) * wob + Math.sin(t * 0.6 + ph) * drift
          Y = syi + ddy * mg + ddx * kc + Math.cos(ph + t * d.freq[i]) * wob + Math.cos(t * 0.5 + ph * 1.3) * drift
          const cf = ss((t - tl - 0.5) / 1.6)
          if (lf > 0) {
            X += (d.cx3[i] - fxi) * lf
            Y += (d.cy3[i] - fyi) * lf
            Z = d.cz3[i] * lf
          }
          if (cf > 0) {
            X += (d.tx[i] - X) * cf
            Y += (d.ty[i] - Y) * cf
            Z += (d.tz[i] - Z) * cf
          }
          // shading
          let sh = 1
          if (lf > 0) {
            const nx0 = d.nx[i]
            const ny0 = d.ny[i]
            const nz0 = d.nz[i]
            const nx1 = nx0 * cyw + nz0 * syw
            const nz1 = -nx0 * syw + nz0 * cyw
            const ny2 = ny0 * ct + nz1 * st
            const nz2 = -ny0 * st + nz1 * ct
            const dif = nx1 * Lx + ny2 * Ly + nz2 * Lz
            const shade = 0.3 + 0.7 * (dif > 0 ? dif : 0)
            sh = 1 + (shade - 1) * lf
          }
          const sR = d.solR[i] * sh
          const sG = d.solG[i] * sh
          const sB = d.solB[i] * sh
          const tr = d.flatR[i] + (sR - d.flatR[i]) * lf
          const tg = d.flatG[i] + (sG - d.flatG[i]) * lf
          const tb = d.flatB[i] + (sB - d.flatB[i]) * lf
          const dr = d.fr[i] * DK
          const dg = d.fg[i] * DK
          const db = d.fb[i] * DK
          r = dr + (tr - dr) * mg
          g = dg + (tg - dg) * mg
          b = db + (tb - db) * mg
          let aa = 0.35 + (d.flatA[i] - 0.35) * mg
          aa += (0.96 - aa) * lf
          a = aa * intro
          sz = fs + (flatSz - fs) * mg
          const sk = Math.max(lf * 0.4, cf)
          sz += (d.solSz[i] * scale - sz) * sk
        }
        // camera: yaw about Y, then tilt about X (top recedes), mild perspective
        const x1 = X * cyw + Z * syw
        const z1 = -X * syw + Z * cyw
        const y2 = Y * ct + z1 * st
        const z2 = -Y * st + z1 * ct
        const pf = PERSP / (PERSP - z2)
        px[i] = cx + x1 * scale * pf
        py[i] = cy - y2 * scale * pf
        pz[i] = z2
        psz[i] = sz * pf
        pa[i] = a
        pk[i] = (q6(r) << 12) | (q6(g) << 6) | q6(b)
        let bk = ((z2 + DEPTH_RANGE) * (DEPTH_BUCKETS / (2 * DEPTH_RANGE))) | 0
        if (bk < 0) bk = 0
        else if (bk >= DEPTH_BUCKETS) bk = DEPTH_BUCKETS - 1
        pb[i] = bk
        bucket[bk + 1]++
      }
      for (let k = 0; k < DEPTH_BUCKETS; k++) bucket[k + 1] += bucket[k]
      for (let i = 0; i < n; i++) order[bucket[pb[i]]++] = i

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      let lastKey = -1
      let lastA = -1
      let drawn = 0
      for (let k = 0; k < n; k++) {
        const i = order[k]
        const a = pa[i]
        if (a < 0.01) continue
        const s = psz[i]
        const x = px[i]
        const y = py[i]
        if (x < -s || y < -s || x > W + s || y > H + s) continue
        const key = pk[i]
        if (key !== lastKey) {
          ctx.fillStyle = colorStr(key)
          lastKey = key
        }
        if (a !== lastA) {
          ctx.globalAlpha = a
          lastA = a
        }
        const h = s * 0.5
        ctx.fillRect(x - h, y - h, s, s)
        drawn++
      }

      // accent scan line
      const su = (t - SCAN_T0) / SCAN_DUR
      if (su > -0.02 && su < 1.03) {
        const sx = W * (-0.02 + 1.04 * su)
        const fade = Math.min(ss(su * 12 + 0.5), ss((1.03 - su) * 12))
        ctx.fillStyle = ACCENT
        ctx.globalAlpha = 0.6 * fade
        ctx.fillRect(sx - 0.5, 0, 1, H)
      }

      // 2D-phase ruler: corner brackets + ticks around the flat plate
      const rulerA = ss((t - 0.2) / 0.6) * (1 - ss((t - 2.3) / 1.2))
      if (rulerA > 0.01) {
        const X0 = cx + ex0 * scale
        const X1 = cx + ex1 * scale
        const Y0 = cy - ey1 * scale
        const Y1 = cy - ey0 * scale
        const bl = Math.min(0.7 * scale, 40)
        ctx.globalAlpha = rulerA
        ctx.fillStyle = LINE
        const hl = (x: number, y: number, w: number): void => {
          ctx.fillRect(Math.round(Math.min(x, x + w)), Math.round(y), Math.abs(w), 1)
        }
        const vl = (x: number, y: number, h: number): void => {
          ctx.fillRect(Math.round(x), Math.round(Math.min(y, y + h)), 1, Math.abs(h))
        }
        hl(X0, Y0, bl)
        vl(X0, Y0, bl)
        hl(X1, Y0, -bl)
        vl(X1, Y0, bl)
        hl(X0, Y1, bl)
        vl(X0, Y1, -bl)
        hl(X1, Y1, -bl)
        vl(X1, Y1, -bl)
        // ticks every 0.5 A (long on whole A) along the bottom and left edges
        const k0x = Math.ceil(ex0 * 2)
        const k1x = Math.floor(ex1 * 2)
        for (let k = k0x; k <= k1x; k++) vl(cx + (k / 2) * scale, Y1, k % 2 === 0 ? 7 : 4)
        const k0y = Math.ceil(ey0 * 2)
        const k1y = Math.floor(ey1 * 2)
        for (let k = k0y; k <= k1y; k++) hl(X0, cy - (k / 2) * scale, k % 2 === 0 ? -7 : -4)
        ctx.fillStyle = INK_FAINT
        ctx.font = `9px ${MONO}`
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        for (let k = k0x; k <= k1x; k++) {
          if (k % 4 !== 0) continue
          ctx.fillText(k === 0 ? '0' : String(k / 2).replace('-', '\u2212'), cx + (k / 2) * scale, Y1 + 17)
        }
        ctx.textAlign = 'right'
        for (let k = k0y; k <= k1y; k++) {
          if (k % 4 !== 0) continue
          ctx.fillText(k === 0 ? '0' : String(k / 2).replace('-', '\u2212'), X0 - 12, cy - (k / 2) * scale)
        }
        ctx.textAlign = 'left'
        ctx.fillText('\u00C5', X1 + 6, Y1 + 17)
      }

      // HUD stage label (top-left)
      const hudA = ss((t - 0.1) / 0.4) * (1 - ss((t - 6.2) / 0.5))
      if (hudA > 0.01) {
        const st2 = stagesRef.current
        const stage = t < SCAN_T0 ? st2[0] : t < 5.0 ? st2[1] : st2[2]
        ctx.globalAlpha = hudA
        ctx.fillStyle = INK_FAINT
        ctx.font = `11px ${MONO}`
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'left'
        ctx.fillText(`${stage} \u00B7 ${drawn} SPLAT`, 20, 38)
      }
      ctx.globalAlpha = 1
    }

    const loop = (now: number): void => {
      raf = 0
      if (t0 < 0) t0 = now
      const tw = (now - t0) / 1000
      twNow = tw
      const t = frozen ? ft : rm ? REDUCED_SCENE_T : tw

      if (!frozen && exitStart < 0) {
        if (rm && tw >= 0.6) {
          exitStart = 0.6
          exitDur = 0.3
        } else if (!rm && tw >= EXIT_AT) {
          exitStart = EXIT_AT
          exitDur = EXIT_DUR
        }
      }

      if (!staticScene || dirty) {
        frame(t)
        dirty = false
      }

      // DOM overlay
      let op = 1
      if (exitStart >= 0) {
        const p = clamp01((tw - exitStart) / exitDur)
        op = exitFrom * (1 - eio(p))
        root.style.pointerEvents = p > 0.5 ? 'none' : 'auto'
      }
      root.style.opacity = String(op)
      const setT = (el: HTMLElement | null, o: number, dy: number): void => {
        if (!el) return
        el.style.opacity = String(o)
        el.style.transform = `translateY(${((1 - o) * dy).toFixed(2)}px)`
      }
      setT(wordRef.current, ss((t - 6.5) / 0.8), 12)
      setT(subRef.current, ss((t - 7.1) / 0.8), 8)
      setT(capRef.current, ss((t - 7.5) / 0.8), 6)
      const rule = ruleRef.current
      if (rule) {
        rule.style.opacity = String(ss((t - 6.9) / 0.4))
        rule.style.transform = `scaleX(${ss((t - 6.9) / 0.8).toFixed(3)})`
      }
      const sb = skipBtnRef.current
      if (sb) sb.style.opacity = String(ss(((frozen ? t : tw) - 0.5) / 0.6))

      if (exitStart >= 0 && tw >= exitStart + exitDur) {
        finish()
        return
      }
      if (staticScene && exitStart < 0 && !dirty) {
        // parked: nothing changes until resize / skip / reduced-motion auto-exit
        if (rm && !frozen) {
          window.clearTimeout(parkTimer)
          parkTimer = window.setTimeout(kick, Math.max(0, (0.6 - tw) * 1000) + 30)
        }
        return
      }
      raf = requestAnimationFrame(loop)
    }
    kick = (): void => {
      if (raf === 0 && !doneRef.current) raf = requestAnimationFrame(loop)
    }
    kick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(parkTimer)
      window.removeEventListener('resize', onResize)
      skipFnRef.current = () => undefined
    }
  }, [reducedMotion, freezeAt])

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Molecular Studio — ${copy.sub}`}
      onClick={() => skipFnRef.current()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: SURFACE,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      <style>{CSS}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      <div
        ref={textRef}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '70%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={wordRef}
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 'min(48px, 9vw)',
            letterSpacing: '-0.025em',
            color: INK,
            lineHeight: 1.1,
            opacity: 0,
          }}
        >
          Molecular Studio
        </div>
        <div
          ref={ruleRef}
          style={{ width: 40, height: 1, background: ACCENT, margin: '14px 0 12px', opacity: 0, transform: 'scaleX(0)' }}
        />
        <div
          ref={subRef}
          style={{
            fontFamily: SANS,
            fontSize: 'min(15px, 4vw)',
            letterSpacing: '0.04em',
            color: INK_DIM,
            opacity: 0,
          }}
        >
          {copy.sub}
        </div>
        <div
          ref={capRef}
          style={{
            fontFamily: MONO,
            fontSize: 'min(12px, 3.2vw)',
            letterSpacing: '0.02em',
            color: '#6f7681',
            marginTop: 12,
            maxWidth: '92vw',
            opacity: 0,
          }}
        >
          {caption}
        </div>
      </div>
      <button
        ref={skipBtnRef}
        type="button"
        className="msi-c-skip"
        aria-label={copy.aria}
        onClick={(e) => {
          e.stopPropagation()
          skipFnRef.current()
        }}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          minWidth: 44,
          minHeight: 44,
          padding: '0 16px',
          background: 'transparent',
          border: '1px solid #323640',
          borderRadius: 6,
          color: INK_DIM,
          fontFamily: SANS,
          fontSize: 13,
          cursor: 'pointer',
          opacity: 0,
        }}
      >
        {copy.skip}
      </button>
    </div>
  )
}
