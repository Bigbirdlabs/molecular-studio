import { useEffect, useRef } from 'react'
import type { ReactElement } from 'react'
import { getEntry } from '../../chem/library'
import { el } from '../../chem/elements'

/* Variant D — "Layers": raster print -> z-slice parallax stack -> 3D point cloud -> solid atoms. */

interface IntroProps {
  onDone: () => void
  reducedMotion?: boolean
  language?: 'tr' | 'en'
  /** ms on the timeline; renders exactly that frame, never exits or calls onDone. */
  freezeAt?: number
}

const SURFACE = '#0a0b0d'
const INK = '#e6e8eb'
const INK_DIM = '#9aa1ab'
const INK_FAINT = '#6f7681'
const LINE = '#323640'
const LINE_DIM = '#23262c'
const ACCENT = '#5ec8e5'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SANS = 'Inter, system-ui, -apple-system, "Segoe UI", sans-serif'

const TOTAL = 10
const FADE_AT = 8.8
const RT = 8.0 // reduced-motion frame time
const G = 0.09 // texel pitch in Å
const LEVELS = 25
const MAX_SPLATS = 7600
const PERSP = 22
const LIGHT: readonly [number, number, number] = [-0.45, 0.65, 0.62]
const BOND_COLOR = '#aab0b9'

const COPY = {
  tr: {
    sub: 'Moleküler Modelleme Stüdyosu',
    skip: 'Atla',
    aria: 'Girişi atla',
    atoms: 'ATOM',
    hudRaster: 'TARAMA · SATIR',
    hudStack: 'Z-YIĞINI',
    hudLayers: 'KATMAN',
    hudResample: 'YENİDEN ÖRNEKLEME',
    splats: 'SPLAT',
  },
  en: {
    sub: 'Molecular Modeling Studio',
    skip: 'Skip',
    aria: 'Skip intro',
    atoms: 'ATOMS',
    hudRaster: 'RASTER · ROW',
    hudStack: 'Z-STACK',
    hudLayers: 'LAYERS',
    hudResample: 'RESAMPLE',
    splats: 'SPLATS',
  },
} as const

const clamp01 = (p: number): number => (p < 0 ? 0 : p > 1 ? 1 : p)
const prog = (t: number, d: number, dur: number): number => clamp01((t - d) / dur)
const easeOut = (p: number): number => 1 - Math.pow(1 - p, 3)
const easeIO = (p: number): number => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉'
const subscript = (n: number): string => (n === 1 ? '' : String(n).split('').map((d) => SUBS[Number(d)]).join(''))

interface Scene {
  n: number
  nBase: number
  nSlices: number
  atomCount: number
  formula: string
  nameTr: string
  nameEn: string
  x1: Float32Array
  y1: Float32Array
  z1: Float32Array
  x2: Float32Array
  y2: Float32Array
  z2: Float32Array
  nx: Float32Array
  ny: Float32Array
  nz: Float32Array
  side2: Float32Array
  stamp: Float32Array
  dly: Float32Array
  slice: Uint8Array
  col: Uint8Array
  ext: Uint8Array
  sliceZ: Float32Array
  palette: string[]
  R: number
  fx0: number
  fx1: number
  fy0: number
  fy1: number
  shiftX: number
  shiftY: number
  gridTop: number
  gridH: number
  rows: number
}

let cached: Scene | null = null

function hex(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

function buildScene(): Scene {
  if (cached) return cached
  const entry = getEntry('kafein')!
  const mol = entry.molecule
  const rng = mulberry32(7)
  const A = mol.atoms.length
  const idx = new Map<number, number>()
  mol.atoms.forEach((a, i) => idx.set(a.id, i))
  const info = mol.atoms.map((a) => {
    const e = el(a.symbol)
    return {
      sym: a.symbol,
      x: a.pos[0],
      y: a.pos[1],
      z: a.pos[2],
      r2: Math.max(0.22, 0.14 + 0.36 * e.covalent),
      r3: Math.max(0.2, e.covalent * 0.62),
    }
  })
  let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity
  for (const a of info) {
    minx = Math.min(minx, a.x - a.r2); maxx = Math.max(maxx, a.x + a.r2)
    miny = Math.min(miny, a.y - a.r2); maxy = Math.max(maxy, a.y + a.r2)
  }
  const shiftX = (minx + maxx) / 2
  const shiftY = (miny + maxy) / 2
  for (const a of info) { a.x -= shiftX; a.y -= shiftY }
  minx -= shiftX; maxx -= shiftX; miny -= shiftY; maxy -= shiftY
  let R = 0
  for (const a of info) R = Math.max(R, Math.hypot(a.x, a.y, a.z) + a.r3)

  const ox = Math.floor((minx - 0.01) / G) * G
  const oy = Math.floor((miny - 0.01) / G) * G
  const cols = Math.ceil((maxx - ox) / G) + 1
  const rows = Math.ceil((maxy - oy) / G) + 1
  const occ = new Uint8Array(cols * rows)

  const symList: string[] = []
  for (const a of info) if (!symList.includes(a.sym)) symList.push(a.sym)
  const bondCol = symList.length
  const palette: string[] = []
  const bases: [number, number, number][] = symList.map((s) => hex(el(s).color))
  bases.push(hex(BOND_COLOR))
  for (const b of bases) {
    for (let l = 0; l < LEVELS; l++) {
      const f = l / 20
      palette.push(`rgb(${Math.min(255, Math.round(b[0] * f))},${Math.min(255, Math.round(b[1] * f))},${Math.min(255, Math.round(b[2] * f))})`)
    }
  }

  interface Line { a: number; b: number; o: number; len: number; px: number; py: number; vx: number; vy: number; vz: number }
  const lines: Line[] = []
  for (const b of mol.bonds) {
    const ia = idx.get(b.a)
    const ib = idx.get(b.b)
    if (ia === undefined || ib === undefined) continue
    const A_ = info[ia], B_ = info[ib]
    const dx = B_.x - A_.x, dy = B_.y - A_.y, dz = B_.z - A_.z
    const len = Math.hypot(dx, dy, dz)
    const ux = dx / len, uy = dy / len, uz = dz / len
    const l2 = Math.hypot(ux, uy)
    const px = l2 < 1e-3 ? 1 : -uy / l2
    const py = l2 < 1e-3 ? 0 : ux / l2
    // v = u x (px, py, 0)
    const vx = -uz * py
    const vy = uz * px
    const vz = ux * py - uy * px
    const order = Math.min(3, Math.max(1, b.order))
    for (let k = 0; k < order; k++) {
      lines.push({ a: ia, b: ib, o: (k - (order - 1) / 2) * 0.17, len, px, py, vx, vy, vz })
    }
  }

  interface Tex { ent: number; x: number; y: number; z: number; t: number; fx: number; fy: number }
  const tex: Tex[] = []
  for (let ai = 0; ai < A; ai++) {
    const a = info[ai]
    const i0 = Math.max(0, Math.floor((a.x - a.r2 - ox) / G))
    const i1 = Math.min(cols - 1, Math.ceil((a.x + a.r2 - ox) / G))
    const j0 = Math.max(0, Math.floor((a.y - a.r2 - oy) / G))
    const j1 = Math.min(rows - 1, Math.ceil((a.y + a.r2 - oy) / G))
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const cx = ox + (i + 0.5) * G
        const cy = oy + (j + 0.5) * G
        if (Math.hypot(cx - a.x, cy - a.y) > a.r2) continue
        if (occ[j * cols + i]) continue
        occ[j * cols + i] = 1
        tex.push({ ent: ai, x: cx, y: cy, z: a.z, t: 0, fx: i / (cols - 1), fy: (rows - 1 - j) / (rows - 1) })
      }
    }
  }
  for (let li = 0; li < lines.length; li++) {
    const L = lines[li]
    const a = info[L.a], b = info[L.b]
    const dx = b.x - a.x, dy = b.y - a.y
    const len2 = Math.hypot(dx, dy)
    const steps = Math.max(1, Math.ceil(len2 / (G * 0.5)))
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = a.x + t * dx + L.px * L.o
      const y = a.y + t * dy + L.py * L.o
      const i = Math.floor((x - ox) / G)
      const j = Math.floor((y - oy) / G)
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue
      if (occ[j * cols + i]) continue
      occ[j * cols + i] = 1
      tex.push({
        ent: A + li, x: ox + (i + 0.5) * G, y: oy + (j + 0.5) * G, z: a.z + t * (b.z - a.z), t,
        fx: i / (cols - 1), fy: (rows - 1 - j) / (rows - 1),
      })
    }
  }
  const nBase = tex.length
  const nEnt = A + lines.length
  const baseCount = new Int32Array(nEnt)
  for (const t of tex) baseCount[t.ent]++

  const extraRaw = new Float64Array(nEnt)
  let rawTotal = 0
  for (let e = 0; e < nEnt; e++) {
    extraRaw[e] = e < A ? 1000 * info[e].r3 * info[e].r3 : 45 * lines[e - A].len
    rawTotal += extraRaw[e]
  }
  const fe = Math.min(1, Math.max(0, (MAX_SPLATS - nBase) / rawTotal))
  const extraCount = new Int32Array(nEnt)
  let nExtra = 0
  for (let e = 0; e < nEnt; e++) { extraCount[e] = Math.round(extraRaw[e] * fe); nExtra += extraCount[e] }
  const n = nBase + nExtra

  const x1 = new Float32Array(n), y1 = new Float32Array(n), z1 = new Float32Array(n)
  const x2 = new Float32Array(n), y2 = new Float32Array(n), z2 = new Float32Array(n)
  const nx = new Float32Array(n), ny = new Float32Array(n), nz = new Float32Array(n)
  const side2 = new Float32Array(n), stamp = new Float32Array(n), dly = new Float32Array(n)
  const sliceArr = new Uint8Array(n), col = new Uint8Array(n), ext = new Uint8Array(n)

  const perm: Int32Array[] = []
  const used = new Int32Array(nEnt)
  for (let ai = 0; ai < A; ai++) {
    const m = baseCount[ai] + extraCount[ai]
    const p = new Int32Array(m)
    for (let k = 0; k < m; k++) p[k] = k
    for (let k = m - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); const tmp = p[k]; p[k] = p[j]; p[j] = tmp }
    perm.push(p)
  }
  const nv: [number, number, number] = [0, 0, 0]
  const fibNormal = (k: number, m: number): void => {
    const y = 1 - (2 * (k + 0.5)) / m
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const ph = k * 2.399963229728653
    nv[0] = Math.cos(ph) * r
    nv[1] = y
    nv[2] = Math.sin(ph) * r
  }
  const RB = 0.055
  const setAtomP2 = (i: number, ai: number, k: number, m: number): void => {
    const a = info[ai]
    fibNormal(k, m)
    x2[i] = a.x + nv[0] * a.r3; y2[i] = a.y + nv[1] * a.r3; z2[i] = a.z + nv[2] * a.r3
    nx[i] = nv[0]; ny[i] = nv[1]; nz[i] = nv[2]
    side2[i] = Math.sqrt((4 * Math.PI * a.r3 * a.r3) / m) * 1.1
    col[i] = symList.indexOf(a.sym)
  }
  const setLineP2 = (i: number, li: number, t: number, phi: number, m: number): void => {
    const L = lines[li]
    const a = info[L.a], b = info[L.b]
    const c = Math.cos(phi), s = Math.sin(phi)
    const rx = L.px * c + L.vx * s, ry = L.py * c + L.vy * s, rz = L.vz * s
    x2[i] = a.x + t * (b.x - a.x) + L.px * L.o + RB * rx
    y2[i] = a.y + t * (b.y - a.y) + L.py * L.o + RB * ry
    z2[i] = a.z + t * (b.z - a.z) + RB * rz
    nx[i] = rx; ny[i] = ry; nz[i] = rz
    side2[i] = Math.max(0.06, Math.sqrt((2 * Math.PI * RB * L.len) / m) * 1.25)
    col[i] = bondCol
  }

  for (let i = 0; i < nBase; i++) {
    const t = tex[i]
    x1[i] = t.x; y1[i] = t.y; z1[i] = t.z
    stamp[i] = 0.12 + t.fy * 1.55 + t.fx * 0.06
    dly[i] = rng()
    const m = baseCount[t.ent] + extraCount[t.ent]
    if (t.ent < A) setAtomP2(i, t.ent, perm[t.ent][used[t.ent]++], m)
    else setLineP2(i, t.ent - A, t.t, rng() * Math.PI * 2, m)
  }
  let w = nBase
  for (let e = 0; e < nEnt; e++) {
    for (let k = 0; k < extraCount[e]; k++, w++) {
      ext[w] = 1
      stamp[w] = 4.4 + rng() * 1.5
      const m = baseCount[e] + extraCount[e]
      if (e < A) setAtomP2(w, e, perm[e][used[e]++], m)
      else setLineP2(w, e - A, 0.05 + rng() * 0.9, rng() * Math.PI * 2, m)
      x1[w] = x2[w]; y1[w] = y2[w]; z1[w] = z2[w]
    }
  }

  let zmin = Infinity, zmax = -Infinity
  for (let i = 0; i < nBase; i++) { zmin = Math.min(zmin, z1[i]); zmax = Math.max(zmax, z1[i]) }
  const NB = zmax - zmin < 1e-3 ? 1 : 5
  const binOf = (z: number): number => Math.min(NB - 1, Math.floor(((z - zmin) / (zmax - zmin + 1e-9)) * NB))
  const binCount = new Int32Array(NB)
  const binSum = new Float64Array(NB)
  for (let i = 0; i < nBase; i++) { const b = binOf(z1[i]); binCount[b]++; binSum[b] += z1[i] }
  const rank = new Int32Array(NB).fill(-1)
  let nSlices = 0
  const sliceZl: number[] = []
  for (let b = 0; b < NB; b++) if (binCount[b] > 0) { rank[b] = nSlices++; sliceZl.push(binSum[b] / binCount[b]) }
  for (let i = 0; i < nBase; i++) sliceArr[i] = rank[binOf(z1[i])]

  const counts = new Map<string, number>()
  for (const a of mol.atoms) counts.set(a.symbol, (counts.get(a.symbol) ?? 0) + 1)
  const order = [...counts.keys()].sort((p, q) => {
    const rk = (s: string): number => (s === 'C' ? 0 : s === 'H' ? 1 : 2)
    return rk(p) - rk(q) || p.localeCompare(q)
  })
  const formula = order.map((s) => s + subscript(counts.get(s) ?? 0)).join('')

  cached = {
    n, nBase, nSlices, atomCount: A, formula, nameTr: entry.name, nameEn: entry.nameEn,
    x1, y1, z1, x2, y2, z2, nx, ny, nz, side2, stamp, dly, slice: sliceArr, col, ext,
    sliceZ: Float32Array.from(sliceZl), palette, R,
    fx0: minx - 0.45, fx1: maxx + 0.45, fy0: miny - 0.45, fy1: maxy + 0.45,
    shiftX, shiftY, gridTop: oy + rows * G, gridH: rows * G, rows,
  }
  return cached
}

export default function Intro({ onDone, reducedMotion, language, freezeAt }: IntroProps): ReactElement {
  const lang = language ?? 'tr'
  const copy = COPY[lang]
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const doneRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLDivElement>(null)
  const ruleRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)
  const capRef = useRef<HTMLDivElement>(null)

  const scene = buildScene()
  const caption = `${scene.formula} · ${(lang === 'tr' ? scene.nameTr : scene.nameEn).toLocaleUpperCase(lang)} · ${scene.atomCount} ${copy.atoms}`

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const ctx = canvas ? canvas.getContext('2d') : null
    if (!root || !canvas || !ctx) return
    const S = buildScene()
    const rm = reducedMotion ?? (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

    const N = S.n
    const sxA = new Float32Array(N), syA = new Float32Array(N), ssA = new Float32Array(N), alA = new Float32Array(N)
    const lvA = new Uint16Array(N), bkA = new Uint8Array(N), order = new Uint16Array(N)
    const NBK = 96
    const cnt = new Int32Array(NBK + 1)
    const sliceDelay = new Float32Array(S.nSlices)
    for (let k = 0; k < S.nSlices; k++) sliceDelay[k] = 2.05 + k * 0.14
    const P = new Float64Array(3)

    let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, scale = 1, pad = 20
    let raf = 0
    let exiting = false
    let fading = false
    const timers: number[] = []

    const layout = (): void => {
      w = window.innerWidth
      h = window.innerHeight
      dpr = Math.min(3, window.devicePixelRatio || 1)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const rad = Math.min(w * 0.42, h * 0.3)
      cx = Math.round(w / 2)
      cy = Math.round(h * 0.4)
      const cell = Math.max(3, Math.floor((G * rad) / S.R))
      scale = cell / G
      pad = Math.max(16, Math.min(32, Math.round(Math.min(w, h) * 0.04)))
      const text = textRef.current
      if (text) text.style.top = `${Math.round(cy + S.R * scale + 30)}px`
      const word = wordRef.current
      if (word) word.style.fontSize = `${Math.max(26, Math.min(52, Math.round(Math.min(w, h) * 0.058)))}px`
    }

    const project = (x: number, y: number, z: number, yaw: number, pitch: number): void => {
      const c = Math.cos(yaw), s = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
      const xr = x * c + z * s
      const zr = -x * s + z * c
      const yr = y * cp - zr * sp
      const zc = y * sp + zr * cp
      const k = PERSP / (PERSP - zc)
      P[0] = cx + xr * scale * k
      P[1] = cy - yr * scale * k
      P[2] = zc
    }

    const setText = (t: number): void => {
      const a = (e: HTMLElement | null, p: number): void => {
        if (!e) return
        e.style.opacity = String(p)
        e.style.transform = `translateY(${(1 - p) * 8}px)`
      }
      a(wordRef.current, easeOut(prog(t, 6.5, 0.7)))
      a(subRef.current, easeOut(prog(t, 6.75, 0.7)))
      a(capRef.current, easeOut(prog(t, 7.0, 0.7)))
      const rule = ruleRef.current
      if (rule) rule.style.transform = `scaleX(${easeOut(prog(t, 6.6, 0.8))})`
    }

    const line = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, yaw: number, pitch: number): void => {
      project(x0, y0, z0, yaw, pitch)
      ctx.moveTo(P[0], P[1])
      project(x1, y1, z1, yaw, pitch)
      ctx.lineTo(P[0], P[1])
    }

    const render = (t: number): void => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const camP = easeIO(prog(t, 2.0, 2.5))
      const yaw = 0.75 * camP + 0.2 * Math.max(0, t - 4.0)
      const pitch = 0.36 * camP
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cpt = Math.cos(pitch), spt = Math.sin(pitch)
      const snap = t < 2.0
      const shadeA = easeIO(prog(t, 4.3, 2.2))
      const R = S.R

      // rulers / frame (plane z = 0)
      const rulerA = easeOut(prog(t, 0.0, 0.6)) * (1 - easeIO(prog(t, 3.2, 2.2)))
      if (rulerA > 0.01) {
        ctx.globalAlpha = rulerA
        ctx.lineWidth = 1
        ctx.strokeStyle = LINE
        ctx.beginPath()
        const bl = 0.7
        const { fx0, fx1, fy0, fy1 } = S
        line(fx0, fy1 - bl, 0, fx0, fy1, 0, yaw, pitch); line(fx0, fy1, 0, fx0 + bl, fy1, 0, yaw, pitch)
        line(fx1 - bl, fy1, 0, fx1, fy1, 0, yaw, pitch); line(fx1, fy1, 0, fx1, fy1 - bl, 0, yaw, pitch)
        line(fx0, fy0 + bl, 0, fx0, fy0, 0, yaw, pitch); line(fx0, fy0, 0, fx0 + bl, fy0, 0, yaw, pitch)
        line(fx1 - bl, fy0, 0, fx1, fy0, 0, yaw, pitch); line(fx1, fy0, 0, fx1, fy0 + bl, 0, yaw, pitch)
        const tx0 = Math.ceil((fx0 + S.shiftX) / 0.5)
        const tx1 = Math.floor((fx1 + S.shiftX) / 0.5)
        for (let k = tx0; k <= tx1; k++) {
          const x = k * 0.5 - S.shiftX
          line(x, fy1, 0, x, fy1 + (k % 2 === 0 ? 0.2 : 0.1), 0, yaw, pitch)
        }
        const ty0 = Math.ceil((fy0 + S.shiftY) / 0.5)
        const ty1 = Math.floor((fy1 + S.shiftY) / 0.5)
        for (let k = ty0; k <= ty1; k++) {
          const y = k * 0.5 - S.shiftY
          line(fx0, y, 0, fx0 - (k % 2 === 0 ? 0.2 : 0.1), y, 0, yaw, pitch)
        }
        ctx.stroke()
        ctx.fillStyle = INK_FAINT
        ctx.font = `9px ${MONO}`
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'
        for (let k = tx0; k <= tx1; k++) {
          if (k % 4 !== 0) continue
          project(k * 0.5 - S.shiftX, fy1 + 0.42, 0, yaw, pitch)
          ctx.fillText(String(k / 2).replace('-', '−'), P[0], P[1])
        }
        ctx.textAlign = 'right'
        for (let k = ty0; k <= ty1; k++) {
          if (k % 4 !== 0) continue
          project(fx0 - 0.3, k * 0.5 - S.shiftY, 0, yaw, pitch)
          ctx.fillText(String(k / 2).replace('-', '−'), P[0], P[1])
        }
      }

      // scan line
      const f = clamp01((t - 0.12) / 1.55)
      const scanA = t > 0.1 && t < 1.95 ? 1 - prog(t, 1.7, 0.25) : 0
      if (scanA > 0.01) {
        const yy = S.gridTop - f * S.gridH
        ctx.globalAlpha = 0.65 * scanA
        ctx.strokeStyle = ACCENT
        ctx.lineWidth = 1
        ctx.beginPath()
        project(S.fx0 - 0.25, yy, 0, 0, 0)
        const sy = Math.round(P[1]) + 0.5
        ctx.moveTo(P[0], sy)
        project(S.fx1, yy, 0, 0, 0)
        ctx.lineTo(P[0], sy)
        ctx.stroke()
      }

      // z-slice sheets
      const sheetA = prog(t, 2.0, 0.4) * (1 - prog(t, 4.0, 0.9))
      if (sheetA > 0.01) {
        ctx.globalAlpha = 0.85 * sheetA
        ctx.strokeStyle = LINE
        ctx.lineWidth = 1
        ctx.fillStyle = INK_FAINT
        ctx.font = `9px ${MONO}`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        for (let k = 0; k < S.nSlices; k++) {
          const z = S.sliceZ[k] * easeIO(prog(t, sliceDelay[k], 1.1))
          ctx.beginPath()
          line(S.fx0, S.fy0, z, S.fx1, S.fy0, z, yaw, pitch)
          line(S.fx1, S.fy0, z, S.fx1, S.fy1, z, yaw, pitch)
          line(S.fx1, S.fy1, z, S.fx0, S.fy1, z, yaw, pitch)
          line(S.fx0, S.fy1, z, S.fx0, S.fy0, z, yaw, pitch)
          ctx.stroke()
          project(S.fx0, S.fy0, z, yaw, pitch)
          const zv = S.sliceZ[k]
          ctx.fillText(`z ${zv < 0 ? '−' : '+'}${Math.abs(zv).toFixed(2)} Å`, Math.max(6, P[0]), P[1] + 12)
        }
      }

      // splats
      cnt.fill(0)
      let live = 0
      for (let i = 0; i < N; i++) {
        const isExt = S.ext[i] === 1
        const dt = t - S.stamp[i]
        if (dt <= 0) { bkA[i] = 255; continue }
        let w1 = 1, m2 = 1, pop: number
        if (isExt) {
          pop = clamp01(dt / 0.5)
        } else {
          pop = easeOut(clamp01(dt / 0.14))
          w1 = easeIO(prog(t, sliceDelay[S.slice[i]], 1.1))
          m2 = easeIO(prog(t, 3.75 + S.dly[i] * 0.95, 1.0))
        }
        const x = S.x1[i] + (S.x2[i] - S.x1[i]) * m2
        const y = S.y1[i] + (S.y2[i] - S.y1[i]) * m2
        const zb = S.z1[i] * w1
        const z = zb + (S.z2[i] - zb) * m2
        const xr = x * cyw + z * syw
        const zr = -x * syw + z * cyw
        const yr = y * cpt - zr * spt
        const zc = y * spt + zr * cpt
        const nx0 = S.nx[i] * m2, ny0 = S.ny[i] * m2, nz0 = 1 + (S.nz[i] - 1) * m2
        const nxr = nx0 * cyw + nz0 * syw
        const nzr = -nx0 * syw + nz0 * cyw
        const nyr = ny0 * cpt - nzr * spt
        const nzc = ny0 * spt + nzr * cpt
        if (m2 > 0.99 && nzc < -0.2) { bkA[i] = 255; continue }
        const dl = nxr * LIGHT[0] + nyr * LIGHT[1] + nzc * LIGHT[2]
        const lam = 0.28 + 0.95 * (dl > 0 ? dl : 0)
        const zn = clamp01((zc + R) / (2 * R))
        let bri = 0.95 + (lam - 0.95) * shadeA * m2
        bri *= 1 - shadeA * 0.16 * (1 - zn)
        const k = PERSP / (PERSP - zc)
        let sx = cx + xr * scale * k
        let sy = cy - yr * scale * k
        let ss = (G + (S.side2[i] - G) * m2) * scale * k * pop
        if (snap) { sx = Math.round(sx); sy = Math.round(sy); ss = ss < 1 ? 0 : Math.max(2, Math.round(ss)) }
        else if (ss < 1.2) ss = 1.2
        let lv = Math.round(bri * 20)
        if (lv < 0) lv = 0
        else if (lv >= LEVELS) lv = LEVELS - 1
        sxA[i] = sx; syA[i] = sy; ssA[i] = ss
        alA[i] = isExt ? 0.92 * pop : 0.92
        lvA[i] = S.col[i] * LEVELS + lv
        let bk = Math.floor(zn * (NBK - 1))
        if (bk < 0) bk = 0
        bkA[i] = bk
        cnt[bk + 1]++
        live++
      }
      for (let b = 0; b < NBK; b++) cnt[b + 1] += cnt[b]
      for (let i = 0; i < N; i++) {
        const b = bkA[i]
        if (b === 255) continue
        order[cnt[b]++] = i
      }
      let lastFill = -1
      let lastAl = -1
      for (let q = 0; q < live; q++) {
        const i = order[q]
        const s = ssA[i]
        if (s <= 0) continue
        const c = lvA[i]
        if (c !== lastFill) { ctx.fillStyle = S.palette[c]; lastFill = c }
        const a = alA[i]
        if (a !== lastAl) { ctx.globalAlpha = a; lastAl = a }
        if (snap) ctx.fillRect(sxA[i] - Math.floor(s / 2), syA[i] - Math.floor(s / 2), s, s)
        else ctx.fillRect(sxA[i] - s / 2, syA[i] - s / 2, s, s)
      }

      // HUD (mono, top-left)
      const c = COPY[lang]
      let hud: string
      let hudP: number
      if (t < 2.0) {
        const row = Math.min(S.rows, Math.floor(f * S.rows) + 1)
        hud = `${c.hudRaster} ${String(row).padStart(3, '0')}/${String(S.rows).padStart(3, '0')}`
        hudP = prog(t, 0.0, 0.4)
      } else if (t < 4.5) {
        hud = `${c.hudStack} · ${S.nSlices} ${c.hudLayers}`
        hudP = prog(t, 2.0, 0.4)
      } else if (t < 6.5) {
        hud = `${c.hudResample} · ${N} ${c.splats}`
        hudP = prog(t, 4.5, 0.4)
      } else {
        hud = `${N} ${c.splats} · ${S.atomCount} ${c.atoms}`
        hudP = prog(t, 6.5, 0.4)
      }
      ctx.globalAlpha = hudP
      ctx.fillStyle = INK_FAINT
      ctx.font = `11px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(hud, pad, pad + 22)
      ctx.globalAlpha = 1
    }

    const finish = (): void => {
      if (doneRef.current) return
      doneRef.current = true
      onDoneRef.current()
    }

    const skip = (): void => {
      if (exiting) return
      exiting = true
      cancelAnimationFrame(raf)
      root.style.transition = 'opacity 300ms ease-out'
      root.style.opacity = '0'
      timers.push(window.setTimeout(finish, 300))
    }

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' || e.key === 'Enter') skip()
    }
    const frozen = freezeAt !== undefined ? freezeAt / 1000 : null
    const onResize = (): void => {
      layout()
      if (frozen !== null) { render(frozen); setText(frozen) }
      else if (rm) render(RT)
    }

    layout()
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    if (frozen === null) root.addEventListener('click', skip)

    if (frozen !== null) {
      render(frozen)
      setText(frozen)
    } else if (rm) {
      render(RT)
      setText(RT)
      timers.push(
        window.setTimeout(() => {
          if (exiting) return
          exiting = true
          root.style.transition = 'opacity 300ms ease-out'
          root.style.opacity = '0'
          timers.push(window.setTimeout(finish, 300))
        }, 600),
      )
    } else {
      const t0 = performance.now()
      const loop = (now: number): void => {
        const t = (now - t0) / 1000
        render(t)
        setText(t)
        if (t >= FADE_AT && !fading) {
          fading = true
          root.style.transition = `opacity ${Math.round((TOTAL - FADE_AT) * 1000)}ms ease-in`
          root.style.opacity = '0'
        }
        if (t >= TOTAL) { finish(); return }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      for (const id of timers) window.clearTimeout(id)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      root.removeEventListener('click', skip)
      root.style.transition = ''
      root.style.opacity = '1'
    }
  }, [reducedMotion, lang, freezeAt])

  const hidden = { opacity: 0 } as const
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Molecular Studio"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: SURFACE, overflow: 'hidden', cursor: 'pointer', fontFamily: SANS }}
    >
      <canvas ref={canvasRef} aria-hidden style={{ position: 'absolute', inset: 0, display: 'block' }} />
      <div
        ref={textRef}
        style={{ position: 'absolute', left: 0, right: 0, top: '70%', textAlign: 'center', pointerEvents: 'none', padding: '0 16px' }}
      >
        <div ref={wordRef} style={{ ...hidden, color: INK, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.1, fontFamily: SANS }}>
          Molecular Studio
        </div>
        <div
          ref={ruleRef}
          style={{ width: 'min(220px, 40vw)', height: 1, background: LINE, margin: '14px auto 12px', transform: 'scaleX(0)', transformOrigin: 'center' }}
        />
        <div ref={subRef} style={{ ...hidden, color: INK_DIM, fontSize: 15, letterSpacing: '0.02em', fontFamily: SANS }}>
          {copy.sub}
        </div>
        <div ref={capRef} style={{ ...hidden, color: INK_FAINT, fontSize: 11, letterSpacing: '0.08em', marginTop: 12, fontFamily: MONO }}>
          {caption}
        </div>
      </div>
      <button
        type="button"
        aria-label={copy.aria}
        className="intro-d-skip"
        style={{
          position: 'absolute', top: 'max(16px, 3vmin)', right: 'max(16px, 3vmin)', minWidth: 44, minHeight: 44, padding: '0 14px',
          background: 'transparent', color: INK_DIM, border: `1px solid ${LINE_DIM}`, borderRadius: 4, cursor: 'pointer',
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
      >
        {copy.skip}
      </button>
      <style>{`.intro-d-skip:focus-visible{outline:2px solid ${ACCENT};outline-offset:2px}.intro-d-skip:hover{color:${INK};border-color:${LINE}}`}</style>
    </div>
  )
}
