import * as THREE from 'three'
import { el } from '../chem/elements'
import type { Vec3 } from '../chem/molecule'
import type { Tool } from '../store'
import { buildAdjacency, bondStrands } from './bondLayout'
import { GlyphLabels, tintOf } from './glyphLabels'
import { InstancePool, PointCloud, writeCylinder, writeSphere } from './instancing'
import { buildMeasureViz, dashSegments } from './measureGeometry'
import { bindPointUniforms, createPointMaterial } from './pointMaterials'
import type { AtomEntry, BondEntry, SceneModel } from './sceneModel'
import { createLineMaterial, createShellMaterial } from './screenMaterials'
import {
  ACCENT, DANGER, DASH_COLOR, LABEL_COLOR, MEASURE_ARC_PX, MEASURE_LINE_PX, SHELL_HOVER_OPACITY, SHELL_HOVER_PX, SHELL_RIM_PX,
  SHELL_SELECT_PX, SURFACE_0, WARN,
} from './theme'

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
  /** Active tool: the delete tool tints the hover shell with the danger colour. */
  tool?: Tool
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

/** Which buffers to rewrite: hover / selection changes only need the overlays, never the atom and bond instances. */
export interface UpdateParts {
  bodies: boolean
  overlays: boolean
}

const NEUTRAL = new THREE.Color('#9aa3ad')
const POSITIVE = new THREE.Color('#4c7dff')
const NEGATIVE = new THREE.Color('#ff5a4d')
const ACCENT_TINT = tintOf(ACCENT)
const LABEL_TINT = tintOf(LABEL_COLOR)
const DASH_TINT = tintOf(DASH_COLOR)
const DANGER_TINT = tintOf(DANGER)
const WARN_TINT = tintOf(WARN)
const HOVER_RING_DIM = 0.55 // ring colour is scaled down for the 0.45-opacity look of hover (the ring shader has no alpha input)

/** Diverging colour for a (approximate) partial charge: red negative, grey neutral, blue positive. */
export function chargeColor(q: number, out: THREE.Color): THREE.Color {
  const t = Math.max(-1, Math.min(1, q / 0.45))
  return t >= 0 ? out.copy(NEUTRAL).lerp(POSITIVE, t) : out.copy(NEUTRAL).lerp(NEGATIVE, -t)
}

/**
 * Owns every THREE object of the molecule: instanced atoms / bonds, selection shells, measurement lines, wireframe
 * points, valence rings, glyph labels. `update` rewrites the instance buffers from the SceneModel; nothing here
 * allocates per frame beyond small temporaries, and nothing goes through React.
 *
 * Element colours are never altered by hover or selection (SPEC B.4 / D.2): those states only draw separate shells.
 */
export class MoleculeRig {
  readonly root = new THREE.Group()
  readonly stats: RigStats = { atomInstances: 0, bondInstances: 0, shellInstances: 0, dashInstances: 0, wirePoints: 0, badges: 0, labelGlyphs: 0 }

  private readonly sphereGeo = new THREE.SphereGeometry(1, 32, 22)
  private readonly cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20, 1, false)
  private readonly atomMat = new THREE.MeshPhysicalMaterial({ roughness: 0.34, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.35 })
  private readonly bondMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0 })
  // two-tone selection: 1 px surface-0 rim inside a 2 px accent rim (widths are screen-constant), hover: 1.5 px accent at 45 %
  private readonly outerSphereMat = createShellMaterial('sphere', ACCENT, SHELL_SELECT_PX)
  private readonly rimSphereMat = createShellMaterial('sphere', SURFACE_0, SHELL_RIM_PX)
  private readonly outerCylMat = createShellMaterial('cylinder', ACCENT, SHELL_SELECT_PX)
  private readonly rimCylMat = createShellMaterial('cylinder', SURFACE_0, SHELL_RIM_PX)
  private readonly hoverSphereMat = createShellMaterial('sphere', ACCENT, SHELL_HOVER_PX, SHELL_HOVER_OPACITY)
  private readonly hoverCylMat = createShellMaterial('cylinder', ACCENT, SHELL_HOVER_PX, SHELL_HOVER_OPACITY)
  private readonly lineMat = createLineMaterial(MEASURE_LINE_PX)
  private readonly arcMat = createLineMaterial(MEASURE_ARC_PX)
  private readonly discMat = createPointMaterial('disc')
  private readonly ringMat = createPointMaterial('ring')
  private readonly valenceMat = createPointMaterial('valence')

  private readonly atoms: InstancePool
  private readonly bonds: InstancePool
  private readonly selOuterAtoms: InstancePool
  private readonly selRimAtoms: InstancePool
  private readonly selOuterBonds: InstancePool
  private readonly selRimBonds: InstancePool
  private readonly hoverAtoms: InstancePool
  private readonly hoverBonds: InstancePool
  private readonly dashes: InstancePool
  private readonly arcs: InstancePool
  private readonly wire: PointCloud
  private readonly rings: PointCloud
  private readonly valence: PointCloud
  private readonly labels: GlyphLabels

  private readonly colors = new Map<string, THREE.Color>()
  private readonly tmp = new THREE.Color()

  constructor() {
    this.atoms = new InstancePool(this.root, this.sphereGeo, this.atomMat, true)
    this.bonds = new InstancePool(this.root, this.cylGeo, this.bondMat, true)
    this.selOuterAtoms = new InstancePool(this.root, this.sphereGeo, this.outerSphereMat, false, 1)
    this.selRimAtoms = new InstancePool(this.root, this.sphereGeo, this.rimSphereMat, false, 1)
    this.selOuterBonds = new InstancePool(this.root, this.cylGeo, this.outerCylMat, false, 1)
    this.selRimBonds = new InstancePool(this.root, this.cylGeo, this.rimCylMat, false, 1)
    this.hoverAtoms = new InstancePool(this.root, this.sphereGeo, this.hoverSphereMat, false, 1)
    this.hoverBonds = new InstancePool(this.root, this.cylGeo, this.hoverCylMat, false, 1)
    this.dashes = new InstancePool(this.root, this.cylGeo, this.lineMat, true, 4)
    this.arcs = new InstancePool(this.root, this.cylGeo, this.arcMat, true, 4)
    this.wire = new PointCloud(this.root, this.discMat, 3)
    this.rings = new PointCloud(this.root, this.ringMat, 8)
    this.valence = new PointCloud(this.root, this.valenceMat, 9)
    bindPointUniforms(this.wire.points, this.discMat)
    bindPointUniforms(this.rings.points, this.ringMat)
    bindPointUniforms(this.valence.points, this.valenceMat)
    this.labels = new GlyphLabels(this.root, 10)
  }

  private baseColor(symbol: string): THREE.Color {
    let c = this.colors.get(symbol)
    if (!c) { c = new THREE.Color(el(symbol).color); this.colors.set(symbol, c) }
    return c
  }

  /** Atom colour: CPK, or the charge ramp. Returned colour is a shared temporary. */
  private atomColor(e: AtomEntry, showCharges: boolean): THREE.Color {
    return showCharges ? chargeColor(e.partial, this.tmp) : this.tmp.copy(this.baseColor(e.symbol))
  }

  update(model: SceneModel, v: ViewState, parts: UpdateParts = { bodies: true, overlays: true }): void {
    if (parts.bodies) this.updateBodies(model, v)
    if (parts.overlays) this.updateOverlays(model, v)
  }

  // ---------- atoms, wireframe points, bonds (depend on the model and the colour scheme only) ----------
  private updateBodies(model: SceneModel, v: ViewState): void {
    const p = model.params
    const st = this.stats
    const spheres = p.a > 1e-3 || p.b > 1e-3
    const wireOn = p.wire > 1e-3

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
        const c = this.atomColor(e, v.showCharges)
        const o = A.count * 3
        cols[o] = c.r; cols[o + 1] = c.g; cols[o + 2] = c.b
        A.count++
      }
    }
    A.end()
    st.atomInstances = A.count

    const W = this.wire
    W.ensure(model.atoms.length)
    W.begin()
    if (wireOn) {
      for (const e of model.atoms) {
        if (e.s < 0.004) continue
        const c = this.atomColor(e, v.showCharges)
        W.push(e.p[0], e.p[1], e.p[2], c.r, c.g, c.b, 0.15 * p.wire * e.s)
      }
    }
    W.end()
    st.wirePoints = W.count

    const adj = buildAdjacency(model.bonds)
    const B = this.bonds
    B.ensure(model.bonds.length * 6)
    B.begin()
    {
      const mats = B.matrices, cols = B.colors
      for (const b of model.bonds) {
        if (b.s < 0.004) continue
        const { strands, n } = bondStrands(b, adj, p)
        const ca = this.atomColor(b.a, v.showCharges)
        const ar = ca.r, ag = ca.g, ab = ca.b
        const cb = this.atomColor(b.b, v.showCharges)
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
  }

  /** One outline cylinder per strand, so double / triple / aromatic bonds are outlined strand by strand. */
  private writeBondShells(model: SceneModel, b: BondEntry, adj: ReturnType<typeof buildAdjacency>, pools: InstancePool[]): void {
    const p = model.params
    const { strands, n } = bondStrands(b, adj, p)
    for (let k = 0; k < pools.length; k++) {
      const pool = pools[k]
      pool.ensure(pool.count + n)
      for (let i = 0; i < n; i++) {
        const s = strands[i]
        // the shader adds `px` screen pixels; the world radius here is the bare strand radius
        const r = Math.max(s.r * b.s, 1e-3)
        if (writeCylinder(pool.matrices, pool.count, b.a.p[0] + s.ox, b.a.p[1] + s.oy, b.a.p[2] + s.oz, b.b.p[0] + s.ox, b.b.p[1] + s.oy, b.b.p[2] + s.oz, r)) pool.count++
      }
    }
  }

  private writeAtomShell(model: SceneModel, e: AtomEntry, pools: InstancePool[]): void {
    const r = Math.max(model.radius(e), 0.08) * e.s
    for (const pool of pools) {
      pool.ensure(pool.count + 1)
      writeSphere(pool.matrices, pool.count++, e.p[0], e.p[1], e.p[2], r)
    }
  }

  // ---------- selection / hover shells, valence rings, measurement, labels ----------
  private updateOverlays(model: SceneModel, v: ViewState): void {
    const p = model.params
    const st = this.stats
    const useRings = p.wire >= 0.5
    const bondsDrawn = p.bondR >= 0.02 || p.wire >= 0.5 // space filling buries the bonds: nothing to outline
    const erase = v.tool === 'erase'

    const SOA = this.selOuterAtoms, SRA = this.selRimAtoms, SOB = this.selOuterBonds, SRB = this.selRimBonds
    const HA = this.hoverAtoms, HB = this.hoverBonds
    const R = this.rings
    for (const pool of [SOA, SRA, SOB, SRB, HA, HB]) pool.begin()
    R.ensure(v.selection.size + 2)
    R.begin()

    // hover shell colour: accent, or danger under the delete tool
    const hoverColor = erase ? DANGER : ACCENT
    this.hoverSphereMat.uniforms.uColor.value.set(hoverColor)
    this.hoverCylMat.uniforms.uColor.value.set(hoverColor)
    const hoverTint = erase ? DANGER_TINT : ACCENT_TINT

    for (const e of model.atoms) {
      if (e.dying || e.hidden || e.s < 0.05) continue
      if (v.selection.has(e.id)) {
        if (useRings) R.push(e.p[0], e.p[1], e.p[2], ACCENT_TINT[0], ACCENT_TINT[1], ACCENT_TINT[2], 24)
        else this.writeAtomShell(model, e, [SOA, SRA])
      } else if (e.id === v.hovered) {
        if (useRings) R.push(e.p[0], e.p[1], e.p[2], hoverTint[0] * HOVER_RING_DIM, hoverTint[1] * HOVER_RING_DIM, hoverTint[2] * HOVER_RING_DIM, 22)
        else this.writeAtomShell(model, e, [HA])
      }
    }

    if ((v.selectedBond !== null || v.hoveredBond !== null) && bondsDrawn) {
      const adj = buildAdjacency(model.bonds)
      if (v.selectedBond !== null) {
        const b = model.bonds.find((x) => x.id === v.selectedBond && !x.dying)
        if (b && b.s > 0.05) this.writeBondShells(model, b, adj, [SOB, SRB])
      }
      if (v.hoveredBond !== null && v.hoveredBond !== v.selectedBond) {
        const b = model.bonds.find((x) => x.id === v.hoveredBond && !x.dying)
        if (b && b.s > 0.05) this.writeBondShells(model, b, adj, [HB])
      }
    }
    for (const pool of [SOA, SRA, SOB, SRB, HA, HB]) pool.end()
    R.end()
    st.shellInstances = SOA.count + SRA.count + SOB.count + SRB.count + HA.count + HB.count + R.count

    // ---------- valence rings: thin danger ring when over-valent, dashed warn ring when under-valent and autoH is off ----------
    const G = this.valence
    G.ensure(model.atoms.length)
    G.begin()
    for (const e of model.atoms) {
      if (e.dying || e.hidden || e.s < 0.5) continue
      const over = e.valence === 2, under = e.valence === 1 && !v.autoH
      if (!over && !under) continue
      const t = over ? DANGER_TINT : WARN_TINT
      const r = Math.max(model.radius(e), 0.14) * e.s
      G.push(e.p[0], e.p[1], e.p[2], t[0], t[1], t[2], over ? r : -r)
    }
    G.end()
    st.badges = G.count

    this.drawOverlays(model, v)
  }

  private drawOverlays(model: SceneModel, v: ViewState): void {
    const lineSegs: { a: Vec3; b: Vec3; col: [number, number, number] }[] = []
    const arcSegs: { a: Vec3; b: Vec3; col: [number, number, number] }[] = []

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
      // numbered badge on the atom's silhouette; they alternate sides so a vertex badge does not sit on its neighbour
      const r = Math.max(model.radius(e) * e.s, 0.18)
      const side = i % 2 === 0 ? 1 : -1
      L.add(String(i + 1), e.p[0], e.p[1], e.p[2], { px: 13, tint: ACCENT_TINT, disc: true, shift: [r * 0.7 * side, r * 0.8] })
    }
    if (pts.length === v.measure.length && pts.length >= 2) {
      const viz = buildMeasureViz(pts)
      for (const [a, b] of viz.lines) for (const [d0, d1] of dashSegments(a, b)) lineSegs.push({ a: d0, b: d1, col: DASH_TINT })
      for (let i = 1; i < viz.arc.length; i++) arcSegs.push({ a: viz.arc[i - 1], b: viz.arc[i], col: ACCENT_TINT })
      if (viz.label) L.add(viz.label.text, viz.label.pos[0], viz.label.pos[1], viz.label.pos[2], { px: 14, tint: LABEL_TINT })
      for (const s of viz.segLabels) L.add(s.text, s.pos[0], s.pos[1], s.pos[2], { px: 12, tint: LABEL_TINT, offsetPx: [0, -13] })
    }

    if (v.pendingFrom !== null && model.rubberTo) {
      const e = model.liveAtom(v.pendingFrom)
      if (e) for (const [d0, d1] of dashSegments(e.p, model.rubberTo, 0.12, 0.08)) lineSegs.push({ a: d0, b: d1, col: ACCENT_TINT })
    }
    L.end()

    this.fillLines(this.dashes, lineSegs)
    this.fillLines(this.arcs, arcSegs)
    this.stats.dashInstances = this.dashes.count + this.arcs.count
    this.stats.labelGlyphs = (L.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount
  }

  /** Unit-radius instances: the line material turns them into screen-constant strokes. */
  private fillLines(pool: InstancePool, segs: { a: Vec3; b: Vec3; col: [number, number, number] }[]): void {
    pool.ensure(segs.length)
    pool.begin()
    for (const s of segs) {
      if (writeCylinder(pool.matrices, pool.count, s.a[0], s.a[1], s.a[2], s.b[0], s.b[1], s.b[2], 1)) {
        const o = pool.count * 3
        const cols = pool.colors
        cols[o] = s.col[0]; cols[o + 1] = s.col[1]; cols[o + 2] = s.col[2]
        pool.count++
      }
    }
    pool.end()
  }

  /** True when atoms are currently drawn as spheres (false only for the fully-morphed wireframe style). */
  get spheresVisible(): boolean {
    return this.atoms.count > 0
  }

  dispose(): void {
    for (const pool of [
      this.atoms, this.bonds, this.selOuterAtoms, this.selRimAtoms, this.selOuterBonds, this.selRimBonds, this.hoverAtoms,
      this.hoverBonds, this.dashes, this.arcs,
    ]) pool.dispose()
    this.wire.dispose(); this.rings.dispose(); this.valence.dispose()
    this.labels.dispose()
    this.sphereGeo.dispose(); this.cylGeo.dispose()
    for (const m of [
      this.atomMat, this.bondMat, this.outerSphereMat, this.rimSphereMat, this.outerCylMat, this.rimCylMat, this.hoverSphereMat,
      this.hoverCylMat, this.lineMat, this.arcMat, this.discMat, this.ringMat, this.valenceMat,
    ]) m.dispose()
    this.root.parent?.remove(this.root)
  }
}
