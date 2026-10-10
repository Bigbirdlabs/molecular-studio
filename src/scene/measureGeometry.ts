import { useStudio } from '../store'
import { fmtNum } from '../ui/i18n'
import { angleDeg, cross, dihedralDeg, dist, dot, len, norm, scale, sub, add, type Vec3 } from '../chem/molecule'

/** Drawable description of a measurement, derived from 1-4 positions. All lengths in Å. */
export interface MeasureViz {
  kind: 'none' | 'point' | 'distance' | 'angle' | 'dihedral'
  /** Straight guide lines (drawn dashed). */
  lines: [Vec3, Vec3][]
  /** Arc polyline (angle / dihedral), empty otherwise. */
  arc: Vec3[]
  /** Value label and where to put it. */
  label: { text: string; pos: Vec3 } | null
  /** Per-pair distance labels at the midpoint of each guide line (angle / dihedral chains; a plain distance uses `label`). */
  segLabels: { text: string; pos: Vec3 }[]
  value: number | null
}

const NONE: MeasureViz = { kind: 'none', lines: [], arc: [], label: null, segLabels: [], value: null }

const segLabelsOf = (lines: [Vec3, Vec3][]) =>
  lines.map(([a, b]) => ({ text: formatDistance(dist(a, b)), pos: scale(add(a, b), 0.5) }))

/**
 * Formatting is fixed here (3 decimals for Å, 1 for degrees) and goes through the shared locale formatter, so the Turkish
 * UI reads '1,090 Å' / '109,5°'. Scene labels can only draw the glyphs of the atlas, hence the ASCII hyphen-minus.
 */
const sceneNum = (n: number, digits: number): string => fmtNum(useStudio.getState().language, n, digits).replace('−', '-')
export const formatDistance = (d: number) => `${sceneNum(d, 3)} Å`
export const formatAngle = (a: number) => `${sceneNum(a, 1)}°`

/** Point on the unit arc between unit vectors u and v (angle theta apart), fraction f. */
function slerp(u: Vec3, v: Vec3, theta: number, f: number): Vec3 {
  const s = Math.sin(theta)
  if (s < 1e-6) return u
  return add(scale(u, Math.sin((1 - f) * theta) / s), scale(v, Math.sin(f * theta) / s))
}

export function buildMeasureViz(pts: Vec3[], arcSegments = 28): MeasureViz {
  if (pts.length === 0) return NONE
  if (pts.length === 1) return { ...NONE, kind: 'point' }

  if (pts.length === 2) {
    const d = dist(pts[0], pts[1])
    const mid = scale(add(pts[0], pts[1]), 0.5)
    return { kind: 'distance', lines: [[pts[0], pts[1]]], arc: [], label: { text: formatDistance(d), pos: mid }, segLabels: [], value: d }
  }

  if (pts.length === 3) {
    const [a, b, c] = pts
    const u = sub(a, b), v = sub(c, b)
    const lu = len(u), lv = len(v)
    const theta = (angleDeg(a, b, c) * Math.PI) / 180
    const value = (theta * 180) / Math.PI
    const lines: [Vec3, Vec3][] = [[a, b], [b, c]]
    if (lu < 1e-6 || lv < 1e-6) return { kind: 'angle', lines, arc: [], label: null, segLabels: segLabelsOf(lines), value }
    const uh = norm(u), vh = norm(v)
    const rho = 0.35 * Math.min(lu, lv) // SPEC B.6: arc radius = 0.35 x the shorter arm
    const arc: Vec3[] = []
    if (theta > 1e-3 && Math.PI - theta > 1e-3) {
      for (let i = 0; i <= arcSegments; i++) arc.push(add(b, scale(slerp(uh, vh, theta, i / arcSegments), rho)))
    } else if (theta >= Math.PI - 1e-3) {
      // straight angle: arc through any perpendicular
      const n = norm(cross(uh, Math.abs(uh[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]))
      for (let i = 0; i <= arcSegments; i++) {
        const t = (i / arcSegments) * Math.PI
        arc.push(add(b, scale(add(scale(uh, Math.cos(t)), scale(n, Math.sin(t))), rho)))
      }
    }
    const bis = len(add(uh, vh)) > 1e-6 ? norm(add(uh, vh)) : norm(cross(uh, [0, 1, 0]))
    return { kind: 'angle', lines, arc, label: { text: formatAngle(value), pos: add(b, scale(bis, rho + 0.32)) }, segLabels: segLabelsOf(lines), value }
  }

  const [a, b, c, d] = pts.slice(0, 4)
  const value = dihedralDeg(a, b, c, d)
  const lines: [Vec3, Vec3][] = [[a, b], [b, c], [c, d]]
  const axis = sub(c, b)
  const segLabels = segLabelsOf(lines)
  if (len(axis) < 1e-6) return { kind: 'dihedral', lines, arc: [], label: null, segLabels, value }
  const k = norm(axis)
  const perp = (v: Vec3): Vec3 => sub(v, scale(k, dot(v, k)))
  const v1 = perp(sub(a, b))
  const mid = scale(add(b, c), 0.5)
  if (len(v1) < 1e-4 || len(perp(sub(d, c))) < 1e-4) return { kind: 'dihedral', lines, arc: [], label: { text: formatAngle(value), pos: mid }, segLabels, value }
  const v1h = norm(v1)
  const kx = cross(k, v1h)
  const phi = (value * Math.PI) / 180
  const rho = 0.5
  const arc: Vec3[] = []
  for (let i = 0; i <= arcSegments; i++) {
    const t = (i / arcSegments) * phi
    arc.push(add(mid, scale(add(scale(v1h, Math.cos(t)), scale(kx, Math.sin(t))), rho)))
  }
  const tm = phi / 2
  const out = add(scale(v1h, Math.cos(tm)), scale(kx, Math.sin(tm)))
  return { kind: 'dihedral', lines, arc, label: { text: formatAngle(value), pos: add(mid, scale(out, rho + 0.3)) }, segLabels, value }
}

/** Break a segment into dashes [start, end] (world). */
export function dashSegments(a: Vec3, b: Vec3, dash = 0.13, gap = 0.09, out: [Vec3, Vec3][] = []): [Vec3, Vec3][] {
  const d = sub(b, a)
  const L = len(d)
  if (L < 1e-6) return out
  const dir = scale(d, 1 / L)
  const period = dash + gap
  const n = Math.max(1, Math.round(L / period))
  const p = L / n // stretch the pattern so both ends carry a dash
  const dl = p * (dash / period)
  for (let i = 0; i < n; i++) {
    const s = i * p
    out.push([add(a, scale(dir, s)), add(a, scale(dir, s + dl))])
  }
  return out
}
