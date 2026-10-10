import * as THREE from 'three'
import { el } from '../chem/elements'
import type { Vec3 } from '../chem/molecule'
import { buildAdjacency, bondStrands } from './bondLayout'
import { GlyphLabels, tintOf } from './glyphLabels'
import { InstancePool, PointCloud, writeCylinder, writeSphere } from './instancing'
import { buildMeasureViz, dashSegments } from './measureGeometry'
import { bindPointUniforms, createPointMaterial } from './pointMaterials'
import type { AtomEntry, SceneModel } from './sceneModel'
import { ACCENT, DANGER, DASH_COLOR, LABEL_COLOR, SHELL_THICKNESS, WARN } from './theme'

/** Everything the rig needs to know that does not live in the SceneModel (read from the store by the caller). */
export interface ViewState {
  selection: ReadonlySet<number>
  selectedBond: number | null
  hovered: number | null
  hoveredBond: number | null
  pendingFrom: number | null
  measure: readonly number[]
  showLabels: boolean
  showCharges: boolean
  autoH: boolean
}

export interface RigStats {
  atomInstances: number
  bondInstances: number
  shellInstances: number
  dashInstances: number
  wirePoints: number
  badges: number
  labelGlyphs: number
}

const WHITE = new THREE.Color(1, 1, 1)
const NEUTRAL = new THREE.Color('#9aa3ad')
const POSITIVE = new THREE.Color('#4c7dff')
const NEGATIVE = new THREE.Color('#ff5a4d')
const ACCENT_TINT = tintOf(ACCENT)
const LABEL_TINT = tintOf(LABEL_COLOR)

/** Diverging colour for a (approximate) partial charge: red negative, grey neutral, blue positive. */
export function chargeColor(q: number, out: THREE.Color): THREE.Color {
  const t = Math.max(-1, Math.min(1, q / 0.45))
  return t >= 0 ? out.copy(NEUTRAL).lerp(POSITIVE, t) : out.copy(NEUTRAL).lerp(NEGATIVE, -t)
}

/**
 * Owns every THREE object of the molecule: instanced atoms / bonds, selection shells, measurement dashes, wireframe
 * points, valence badges, glyph labels. `update` rewrites the instance buffers from the SceneModel; nothing here
 * allocates per frame beyond small temporaries, and nothing goes through React.
 */
export class MoleculeRig {
  readonly root = new THREE.Group()
  readonly stats: RigStats = { atomInstances: 0, bondInstances: 0, shellInstances: 0, dashInstances: 0, wirePoints: 0, badges: 0, labelGlyphs: 0 }

  private readonly sphereGeo = new THREE.SphereGeometry(1, 32, 22)
  private readonly cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false)
  private readonly atomMat = new THREE.MeshPhysicalMaterial({ roughness: 0.34, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.35 })
  private readonly bondMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0 })
  private readonly shellMat = new THREE.MeshBasicMaterial({ color: ACCENT, side: THREE.BackSide, toneMapped: false })
  private readonly dashMat = new THREE.MeshBasicMaterial({ toneMapped: false })
  private readonly discMat = createPointMaterial('disc')
  private readonly ringMat = createPointMaterial('ring')
  private readonly badgeMat = createPointMaterial('badge')

  private readonly atoms: InstancePool
  private readonly bonds: InstancePool
  private readonly selAtoms: InstancePool
  private readonly selBonds: InstancePool
  private readonly dashes: InstancePool
  private readonly wire: PointCloud
  private readonly rings: PointCloud
  private readonly badges: PointCloud
  private readonly labels: GlyphLabels

  private readonly colors = new Map<string, THREE.Color>()
  private readonly tmp = new THREE.Color()
  private readonly tmp2 = new THREE.Color()

  constructor() {
    this.atoms = new InstancePool(this.root, this.sphereGeo, this.atomMat, true)
    this.bonds = new InstancePool(this.root, this.cylGeo, this.bondMat, true)
    this.selAtoms = new InstancePool(this.root, this.sphereGeo, this.shellMat, false, 1)
    this.selBonds = new InstancePool(this.root, this.cylGeo, this.shellMat, false, 1)
    this.dashes = new InstancePool(this.root, this.cylGeo, this.dashMat, true, 2)
    this.wire = new PointCloud(this.root, this.discMat, 3)
    this.rings = new PointCloud(this.root, this.ringMat, 8)
    this.badges = new PointCloud(this.root, this.badgeMat, 9)
    bindPointUniforms(this.wire.points, this.discMat)
    bindPointUniforms(this.rings.points, this.ringMat)
    bindPointUniforms(this.badges.points, this.badgeMat)
    this.labels = new GlyphLabels(this.root, 10)
  }

  private baseColor(symbol: string): THREE.Color {
    let c = this.colors.get(symbol)
    if (!c) { c = new THREE.Color(el(symbol).color); this.colors.set(symbol, c) }
    return c
  }

  /** Atom colour (CPK, or charge ramp), optionally lightened. Returned colour is a shared temporary. */
  private atomColor(e: AtomEntry, showCharges: boolean, lighten: number): THREE.Color {
    const c = showCharges ? chargeColor(e.partial, this.tmp) : this.tmp.copy(this.baseColor(e.symbol))
    return lighten > 0 ? c.lerp(WHITE, lighten) : c
  }

  update(model: SceneModel, v: ViewState): void {
    const p = model.params
    const st = this.stats
    const spheres = p.a > 1e-3 || p.b > 1e-3
    const wireOn = p.wire > 1e-3

    // ---------- atoms ----------
    const A = this.atoms
    A.ensure(model.atoms.length)
    A.begin()
    if (spheres) {
      const mats = A.matrices, cols = A.colors
      for (const e of model.atoms) {
        if (e.s < 0.004) continue
        const r = model.radius(e) * e.s
        if (r < 0.004) continue
        writeSphere(mats, A.count, e.p[0], e.p[1], e.p[2], r)
        const c = this.atomColor(e, v.showCharges, e.id === v.hovered && !e.dying ? 0.22 : 0)
        const o = A.count * 3
        cols[o] = c.r; cols[o + 1] = c.g; cols[o + 2] = c.b
        A.count++
      }
    }
    A.end()
    st.atomInstances = A.count

    // ---------- wireframe points ----------
    const W = this.wire
    W.ensure(model.atoms.length)
    W.begin()
    if (wireOn) {
      for (const e of model.atoms) {
        if (e.s < 0.004) continue
        const hov = e.id === v.hovered && !e.dying
        const c = this.atomColor(e, v.showCharges, hov ? 0.3 : 0)
        W.push(e.p[0], e.p[1], e.p[2], c.r, c.g, c.b, 0.15 * p.wire * e.s * (hov ? 1.35 : 1))
      }
    }
    W.end()
    st.wirePoints = W.count

    // ---------- bonds ----------
    const adj = buildAdjacency(model.bonds)
    const B = this.bonds
    B.ensure(model.bonds.length * 6)
    B.begin()
    {
      const mats = B.matrices, cols = B.colors
      for (const b of model.bonds) {
        if (b.s < 0.004) continue
        const { strands, n } = bondStrands(b, adj, p)
        const lighten = b.id === v.hoveredBond && !b.dying ? 0.3 : b.id === v.selectedBond && !b.dying ? 0.12 : 0
        const ca = this.atomColor(b.a, v.showCharges, lighten)
        const ar = ca.r, ag = ca.g, ab = ca.b
        const cb = this.atomColor(b.b, v.showCharges, lighten)
        const br = cb.r, bg = cb.g, bb = cb.b
        for (let i = 0; i < n; i++) {
          const s = strands[i]
          const r = s.r * b.s
          if (r < 0.003) continue
          const ax = b.a.p[0] + s.ox, ay = b.a.p[1] + s.oy, az = b.a.p[2] + s.oz
          const bx = b.b.p[0] + s.ox, by = b.b.p[1] + s.oy, bz = b.b.p[2] + s.oz
          const mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2
          if (writeCylinder(mats, B.count, ax, ay, az, mx, my, mz, r)) {
            const o = B.count * 3
            cols[o] = ar; cols[o + 1] = ag; cols[o + 2] = ab
            B.count++
          }
          if (writeCylinder(mats, B.count, mx, my, mz, bx, by, bz, r)) {
            const o = B.count * 3
            cols[o] = br; cols[o + 1] = bg; cols[o + 2] = bb
            B.count++
          }
        }
      }
    }
    B.end()
    st.bondInstances = B.count

    // ---------- selection ----------
    const useRings = p.wire >= 0.5
    const SA = this.selAtoms
    const SB = this.selBonds
    const R = this.rings
    SA.ensure(v.selection.size + 1)
    SB.ensure(4)
    R.ensure(v.selection.size + 1)
    SA.begin(); SB.begin(); R.begin()
    for (const e of model.atoms) {
      if (e.dying || e.hidden || e.s < 0.05 || !v.selection.has(e.id)) continue
      if (useRings) R.push(e.p[0], e.p[1], e.p[2], ACCENT_TINT[0], ACCENT_TINT[1], ACCENT_TINT[2], 24)
      else {
        const r = Math.max(model.radius(e), 0.08) * e.s
        writeSphere(SA.matrices, SA.count++, e.p[0], e.p[1], e.p[2], r * 1.03 + SHELL_THICKNESS)
      }
    }
    const bondsDrawn = p.bondR >= 0.02 || p.wire >= 0.5 // space filling buries the bonds: nothing to outline
    if (v.selectedBond !== null && bondsDrawn) {
      const b = model.bonds.find((x) => x.id === v.selectedBond && !x.dying)
      if (b && b.s > 0.05) {
        // one outline cylinder per strand, so double / triple / aromatic bonds are outlined strand by strand
        const { strands, n } = bondStrands(b, adj, p)
        for (let i = 0; i < n; i++) {
          const s = strands[i]
          const r = s.r * b.s + SHELL_THICKNESS * 0.85
          if (writeCylinder(SB.matrices, SB.count, b.a.p[0] + s.ox, b.a.p[1] + s.oy, b.a.p[2] + s.oz, b.b.p[0] + s.ox, b.b.p[1] + s.oy, b.b.p[2] + s.oz, r)) SB.count++
        }
      }
    }
    SA.end(); SB.end(); R.end()
    st.shellInstances = SA.count + SB.count + R.count

    // ---------- valence badges (icon + colour) ----------
    const G = this.badges
    G.ensure(model.atoms.length)
    G.begin()
    const dangerT = tintOf(DANGER), warnT = tintOf(WARN)
    for (const e of model.atoms) {
      if (e.dying || e.hidden || e.s < 0.5) continue
      const bad = e.valence === 2, low = e.valence === 1 && v.autoH
      if (!bad && !low) continue
      const t = bad ? dangerT : warnT
      G.push(e.p[0], e.p[1], e.p[2], t[0], t[1], t[2], Math.max(model.radius(e), 0.14) * e.s)
    }
    G.end()
    st.badges = G.count

    // ---------- measurement, rubber band, labels ----------
    this.drawOverlays(model, v)
  }

  private drawOverlays(model: SceneModel, v: ViewState): void {
    const segs: { a: Vec3; b: Vec3; r: number; col: [number, number, number] }[] = []
    const dashCol = tintOf(DASH_COLOR)

    const L = this.labels
    L.begin()

    if (v.showLabels) {
      for (const e of model.atoms) {
        if (e.dying || e.hidden || e.s < 0.5) continue
        L.add(e.symbol, e.p[0], e.p[1], e.p[2], { px: 15, tint: LABEL_TINT })
      }
    }

    const pts: Vec3[] = []
    for (let i = 0; i < v.measure.length; i++) {
      const e = model.liveAtom(v.measure[i])
      if (!e || e.hidden) continue
      pts.push(e.p)
      const r = Math.max(model.radius(e) * e.s, 0.18)
      L.add(String(i + 1), e.p[0], e.p[1], e.p[2], { px: 13, tint: ACCENT_TINT, disc: true, shift: [r * 0.78, r * 0.78] })
    }
    if (pts.length === v.measure.length && pts.length >= 2) {
      const viz = buildMeasureViz(pts)
      for (const [a, b] of viz.lines) for (const [d0, d1] of dashSegments(a, b)) segs.push({ a: d0, b: d1, r: 0.02, col: dashCol })
      for (let i = 1; i < viz.arc.length; i++) segs.push({ a: viz.arc[i - 1], b: viz.arc[i], r: 0.026, col: ACCENT_TINT })
      if (viz.label) L.add(viz.label.text, viz.label.pos[0], viz.label.pos[1], viz.label.pos[2], { px: 14, tint: LABEL_TINT })
    }

    if (v.pendingFrom !== null && model.rubberTo) {
      const e = model.liveAtom(v.pendingFrom)
      if (e) for (const [d0, d1] of dashSegments(e.p, model.rubberTo, 0.12, 0.08)) segs.push({ a: d0, b: d1, r: 0.022, col: ACCENT_TINT })
    }
    L.end()

    const D = this.dashes
    D.ensure(segs.length)
    D.begin()
    for (const s of segs) {
      if (writeCylinder(D.matrices, D.count, s.a[0], s.a[1], s.a[2], s.b[0], s.b[1], s.b[2], s.r)) {
        const o = D.count * 3
        const cols = D.colors
        cols[o] = s.col[0]; cols[o + 1] = s.col[1]; cols[o + 2] = s.col[2]
        D.count++
      }
    }
    D.end()
    this.stats.dashInstances = D.count
    this.stats.labelGlyphs = L.mesh.visible ? (L.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount : 0
  }

  /** True when atoms are currently drawn as spheres (false only for the fully-morphed wireframe style). */
  get spheresVisible(): boolean {
    return this.atoms.mesh.visible
  }

  dispose(): void {
    this.atoms.dispose(); this.bonds.dispose(); this.selAtoms.dispose(); this.selBonds.dispose(); this.dashes.dispose()
    this.wire.dispose(); this.rings.dispose(); this.badges.dispose()
    this.labels.dispose()
    this.sphereGeo.dispose(); this.cylGeo.dispose()
    this.atomMat.dispose(); this.bondMat.dispose(); this.shellMat.dispose(); this.dashMat.dispose()
    this.discMat.dispose(); this.ringMat.dispose(); this.badgeMat.dispose()
    this.root.parent?.remove(this.root)
  }
}
