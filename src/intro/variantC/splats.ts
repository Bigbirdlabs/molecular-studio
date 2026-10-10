import { getEntry } from '../../chem/library'
import { el } from '../../chem/elements'

type RGB = readonly [number, number, number]

const N_ATOM = 2800
const N_BOND = 2200
const N_DUST_MIN = 1300
const TUBE_R = 0.05
const BOND_SEP = 0.17
const INK_DIM: RGB = [154, 161, 171]

/** Scan line timing (seconds). Splat lift is keyed to when the line crosses its screen x. */
export const SCAN_T0 = 2.8
export const SCAN_DUR = 1.8

export interface MolMeta {
  formula: string
  name: string
  nameEn: string
  atomCount: number
}

export interface SplatData {
  n: number
  nStruct: number
  rMax: number
  meta: MolMeta
  /** 0 atom, 1 bond, 2 dust */
  kind: Uint8Array
  // flat (2D drawing) positions, world Å (y up)
  fx: Float32Array
  fy: Float32Array
  // 3D "cloud" (fuzzy) positions
  cx3: Float32Array
  cy3: Float32Array
  cz3: Float32Array
  // true positions (on sphere / tube)
  tx: Float32Array
  ty: Float32Array
  tz: Float32Array
  // surface normals
  nx: Float32Array
  ny: Float32Array
  nz: Float32Array
  flatR: Float32Array
  flatG: Float32Array
  flatB: Float32Array
  solR: Float32Array
  solG: Float32Array
  solB: Float32Array
  flatA: Float32Array
  solSz: Float32Array // world size of a solid splat
  dur: Float32Array
  curl: Float32Array
  phase: Float32Array
  freq: Float32Array
  grain: Float32Array
  // flat tone points for the "unfocused" field: x, y, weight
  tonePts: Float32Array
  // layout-dependent
  sx: Float32Array // field position, world Å
  sy: Float32Array
  fr: Float32Array // field texel colour
  fg: Float32Array
  fb: Float32Array
  delay: Float32Array
  tLift: Float32Array
}

export interface Layout {
  W: number
  H: number
  scale: number
  cx: number
  cy: number
  cell: number
}

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

function hex(c: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(c)
  if (!m) return [144, 144, 144]
  const v = parseInt(m[1], 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

const SUB = '₀₁₂₃₄₅₆₇₈₉'
function sub(n: number): string {
  if (n === 1) return ''
  return String(n).replace(/\d/g, (d) => SUB[Number(d)])
}

const F32 = (n: number): Float32Array => new Float32Array(n)

let cache: SplatData | null = null

export function getSplats(): SplatData {
  if (cache) return cache
  cache = buildSplats()
  return cache
}

function buildSplats(): SplatData {
  const entry = getEntry('kafein')
  if (!entry) throw new Error('kafein entry missing')
  const mol = entry.molecule
  const rng = mulberry32(0x5eed1e)

  let mx = 0
  let my = 0
  let mz = 0
  for (const a of mol.atoms) {
    mx += a.pos[0]
    my += a.pos[1]
    mz += a.pos[2]
  }
  const na = mol.atoms.length
  mx /= na
  my /= na
  mz /= na

  const A = mol.atoms.map((a) => {
    const e = el(a.symbol)
    return {
      x: a.pos[0] - mx,
      y: a.pos[1] - my,
      z: a.pos[2] - mz,
      sym: a.symbol,
      r: 0.12 + 0.38 * e.covalent,
      col: hex(e.color),
    }
  })
  const idx = new Map<number, number>()
  mol.atoms.forEach((a, i) => idx.set(a.id, i))

  let rMax = 0
  for (const a of A) rMax = Math.max(rMax, Math.hypot(a.x, a.y, a.z) + 0.45)

  // formula (Hill)
  const counts = new Map<string, number>()
  for (const a of mol.atoms) counts.set(a.symbol, (counts.get(a.symbol) ?? 0) + 1)
  const order = [...counts.keys()].sort((p, q) => {
    if (p === 'C') return -1
    if (q === 'C') return 1
    if (p === 'H') return -1
    if (q === 'H') return 1
    return p < q ? -1 : 1
  })
  const formula = order.map((s) => s + sub(counts.get(s) ?? 0)).join('')

  // allocation counts
  const aw = A.map((a) => a.r * a.r)
  const awSum = aw.reduce((s, v) => s + v, 0)
  const nPerAtom = aw.map((v) => Math.max(40, Math.round((N_ATOM * v) / awSum)))

  interface BondInfo { a: number; b: number; lines: number; len: number }
  const bonds: BondInfo[] = []
  for (const b of mol.bonds) {
    const ia = idx.get(b.a)
    const ib = idx.get(b.b)
    if (ia === undefined || ib === undefined) continue
    const len = Math.hypot(A[ia].x - A[ib].x, A[ia].y - A[ib].y, A[ia].z - A[ib].z)
    bonds.push({ a: ia, b: ib, lines: b.order, len })
  }
  const bwSum = bonds.reduce((s, b) => s + b.len * b.lines, 0)
  const nPerBond = bonds.map((b) => Math.max(14, Math.round((N_BOND * b.len * b.lines) / bwSum)))

  const nAtomSplats = nPerAtom.reduce((s, v) => s + v, 0)
  const nBondSplats = nPerBond.reduce((s, v) => s + v, 0)
  const nStruct = nAtomSplats + nBondSplats
  const nDust = Math.max(N_DUST_MIN, 6400 - nStruct)
  const n = nStruct + nDust

  const d: SplatData = {
    n, nStruct, rMax,
    meta: { formula, name: entry.name, nameEn: entry.nameEn, atomCount: na },
    kind: new Uint8Array(n),
    fx: F32(n), fy: F32(n),
    cx3: F32(n), cy3: F32(n), cz3: F32(n),
    tx: F32(n), ty: F32(n), tz: F32(n),
    nx: F32(n), ny: F32(n), nz: F32(n),
    flatR: F32(n), flatG: F32(n), flatB: F32(n),
    solR: F32(n), solG: F32(n), solB: F32(n),
    flatA: F32(n), solSz: F32(n),
    dur: F32(n), curl: F32(n), phase: F32(n), freq: F32(n), grain: F32(n),
    tonePts: F32((na + bonds.length) * 3),
    sx: F32(n), sy: F32(n), fr: F32(n), fg: F32(n), fb: F32(n), delay: F32(n), tLift: F32(n),
  }

  // tone points (foreshadow the structure in the unfocused field)
  let tp = 0
  for (const a of A) {
    d.tonePts[tp++] = a.x
    d.tonePts[tp++] = a.y
    d.tonePts[tp++] = a.sym === 'H' ? 0.45 : 1
  }
  for (const b of bonds) {
    d.tonePts[tp++] = (A[b.a].x + A[b.b].x) / 2
    d.tonePts[tp++] = (A[b.a].y + A[b.b].y) / 2
    d.tonePts[tp++] = 0.55
  }

  let k = 0
  // ---- atoms ----
  const GOLD = 2.399963229728653
  for (let ai = 0; ai < A.length; ai++) {
    const at = A[ai]
    const cnt = nPerAtom[ai]
    const sz = Math.max(0.06, 1.5 * Math.sqrt((4 * Math.PI * at.r * at.r) / cnt))
    const isH = at.sym === 'H'
    const isC = at.sym === 'C'
    const flatCol: RGB = isH || isC ? INK_DIM : [
      Math.round(at.col[0] * 0.78 + 255 * 0.22),
      Math.round(at.col[1] * 0.78 + 255 * 0.22),
      Math.round(at.col[2] * 0.78 + 255 * 0.22),
    ]
    for (let j = 0; j < cnt; j++, k++) {
      const yy = 1 - (2 * (j + 0.5 + (rng() - 0.5) * 0.6)) / cnt
      const rad = Math.sqrt(Math.max(0, 1 - yy * yy))
      const phi = j * GOLD + (rng() - 0.5) * 0.5
      const dx = Math.cos(phi) * rad
      const dy = yy
      const dz = Math.sin(phi) * rad
      const rho = 1 + (rng() - 0.35) * 0.9
      d.kind[k] = 0
      d.tx[k] = at.x + dx * at.r
      d.ty[k] = at.y + dy * at.r
      d.tz[k] = at.z + dz * at.r
      d.cx3[k] = at.x + dx * at.r * rho
      d.cy3[k] = at.y + dy * at.r * rho
      d.cz3[k] = at.z + dz * at.r * rho
      d.fx[k] = at.x + dx * at.r * rho * 0.5
      d.fy[k] = at.y + dy * at.r * rho * 0.5
      d.nx[k] = dx
      d.ny[k] = dy
      d.nz[k] = dz
      d.solR[k] = at.col[0]
      d.solG[k] = at.col[1]
      d.solB[k] = at.col[2]
      d.flatR[k] = flatCol[0]
      d.flatG[k] = flatCol[1]
      d.flatB[k] = flatCol[2]
      d.flatA[k] = isH ? 0 : isC ? 0.2 : 0.8
      d.solSz[k] = sz
    }
  }
  // ---- bonds ----
  for (let bi = 0; bi < bonds.length; bi++) {
    const bd = bonds[bi]
    const pa = A[bd.a]
    const pb = A[bd.b]
    const ux = (pb.x - pa.x) / bd.len
    const uy = (pb.y - pa.y) / bd.len
    const uz = (pb.z - pa.z) / bd.len
    // p1 = normalize(u x zhat)
    let p1x = uy
    let p1y = -ux
    let p1z = 0
    let pl = Math.hypot(p1x, p1y)
    if (pl < 1e-3) {
      p1x = 0
      p1y = uz
      p1z = -uy
      pl = Math.hypot(p1y, p1z) || 1
    }
    p1x /= pl
    p1y /= pl
    p1z /= pl
    // p2 = u x p1
    const p2x = uy * p1z - uz * p1y
    const p2y = uz * p1x - ux * p1z
    const p2z = ux * p1y - uy * p1x
    const cnt = nPerBond[bi]
    for (let j = 0; j < cnt; j++, k++) {
      const t = (j + rng()) / cnt
      const li = j % bd.lines
      const off = (li - (bd.lines - 1) / 2) * BOND_SEP
      const bx = pa.x + ux * bd.len * t + p1x * off
      const by = pa.y + uy * bd.len * t + p1y * off
      const bz = pa.z + uz * bd.len * t + p1z * off
      const phi = rng() * Math.PI * 2
      const c = Math.cos(phi)
      const s = Math.sin(phi)
      const nnx = c * p1x + s * p2x
      const nny = c * p1y + s * p2y
      const nnz = c * p1z + s * p2z
      const jit = (): number => (rng() + rng() + rng() - 1.5) * 0.1
      d.kind[k] = 1
      d.tx[k] = bx + nnx * TUBE_R
      d.ty[k] = by + nny * TUBE_R
      d.tz[k] = bz + nnz * TUBE_R
      d.cx3[k] = d.tx[k] + jit()
      d.cy3[k] = d.ty[k] + jit()
      d.cz3[k] = d.tz[k] + jit()
      d.fx[k] = bx + (rng() - 0.5) * 0.02
      d.fy[k] = by + (rng() - 0.5) * 0.02
      d.nx[k] = nnx
      d.ny[k] = nny
      d.nz[k] = nnz
      const src = t < 0.5 ? pa : pb
      d.solR[k] = src.col[0]
      d.solG[k] = src.col[1]
      d.solB[k] = src.col[2]
      d.flatR[k] = INK_DIM[0]
      d.flatG[k] = INK_DIM[1]
      d.flatB[k] = INK_DIM[2]
      d.flatA[k] = 0.85
      d.solSz[k] = 0.12
    }
  }
  // ---- dust ----
  for (; k < n; k++) {
    d.kind[k] = 2
    d.cz3[k] = (rng() * 2 - 1) * 7.5
  }
  for (let i = 0; i < n; i++) {
    d.dur[i] = 1.1 + rng() * 0.25
    d.curl[i] = (rng() - 0.5) * 0.7
    d.phase[i] = rng() * Math.PI * 2
    d.freq[i] = 0.8 + rng() * 1.6
    d.grain[i] = rng()
  }
  return d
}

function hash2(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const e = hash2(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + e) * ux * uy
}

/** (Re)compute everything that depends on the viewport. Deterministic. */
export function layoutSplats(d: SplatData, W: number, H: number): Layout {
  const n = d.n
  const scale = Math.min(W * 0.9, H * 0.6) / (2 * d.rMax)
  const cx = W / 2
  const cy = H * 0.43

  let cell = Math.sqrt((W * H) / n)
  let cols = 0
  let rows = 0
  for (let g = 0; g < 200; g++) {
    cols = Math.ceil(W / cell) + 1
    rows = Math.ceil(H / cell) + 1
    if (cols * rows >= n) break
    cell *= 0.99
  }
  const M = cols * rows
  const sel = new Uint32Array(M)
  for (let i = 0; i < M; i++) sel[i] = i
  const rng = mulberry32(0xc0ffee)
  for (let i = M - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = sel[i]
    sel[i] = sel[j]
    sel[j] = t
  }
  const ox = (W - cols * cell) / 2 + cell / 2
  const oy = (H - rows * cell) / 2 + cell / 2
  const maxD = Math.hypot(W, H) / scale
  const tp = d.tonePts
  const nTone = tp.length / 3
  const sigma2 = 2 * 0.8 * 0.8

  for (let i = 0; i < n; i++) {
    const c = sel[i]
    const ix = c % cols
    const iy = (c / cols) | 0
    const px = ox + ix * cell + (d.grain[i] - 0.5) * cell * 0.1
    const py = oy + iy * cell + (d.grain[(i * 7 + 3) % n] - 0.5) * cell * 0.1
    const wx = (px - cx) / scale
    const wy = (cy - py) / scale
    d.sx[i] = wx
    d.sy[i] = wy
    // unfocused image tone: blurred structure + low-frequency noise + grain
    let blob = 0
    for (let p = 0; p < nTone; p++) {
      const ddx = wx - tp[p * 3]
      const ddy = wy - tp[p * 3 + 1]
      blob += tp[p * 3 + 2] * Math.exp(-(ddx * ddx + ddy * ddy) / sigma2)
    }
    const nz = vnoise(ix * 0.07, iy * 0.07) * 0.65 + vnoise(ix * 0.23 + 9, iy * 0.23 + 4) * 0.35
    const v = 22 + 20 * nz + 88 * Math.min(1, blob) + 14 * (hash2(ix, iy) - 0.5)
    d.fr[i] = v * 0.96
    d.fg[i] = v
    d.fb[i] = v * 1.06
    const kind = d.kind[i]
    const dist = kind === 2 ? 0 : Math.hypot(wx - d.fx[i], wy - d.fy[i])
    d.delay[i] = 0.5 + 0.5 * Math.min(1, dist / (0.6 * maxD)) + 0.2 * d.grain[i]
    const sxScreen = kind === 2 ? px : cx + d.fx[i] * scale
    const u = Math.min(1, Math.max(0, sxScreen / W))
    d.tLift[i] = SCAN_T0 + (SCAN_DUR * (u + 0.02)) / 1.04
  }
  return { W, H, scale, cx, cy, cell }
}
