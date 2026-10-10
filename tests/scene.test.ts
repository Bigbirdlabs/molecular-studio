import { describe, expect, it } from 'vitest'
import { angleDeg, dihedralDeg, dist, emptyMolecule, methane, type BondOrder, type Molecule, type Vec3 } from '../src/chem/molecule'
import { el } from '../src/chem/elements'
import { computeFit } from '../src/scene/cameraMath'
import { buildAdjacency, bondStrands, offsetDirection } from '../src/scene/bondLayout'
import { buildMeasureViz, dashSegments, formatAngle, formatDistance } from '../src/scene/measureGeometry'
import { SceneModel } from '../src/scene/sceneModel'
import { STYLE_TARGETS, atomRadius } from '../src/scene/styleParams'
import { writeCylinder } from '../src/scene/instancing'

const build = (atoms: [string, Vec3][], bonds: [number, number, BondOrder, boolean?][]): Molecule => {
  const m = emptyMolecule('t')
  atoms.forEach(([symbol, pos], i) => m.atoms.push({ id: i + 1, symbol, pos, charge: 0 }))
  bonds.forEach(([a, b, order, aromatic], i) => m.bonds.push({ id: 100 + i, a, b, order, aromatic }))
  m.nextId = 200
  return m
}

const settle = (model: SceneModel, animate: boolean, frames = 240) => {
  for (let i = 0; i < frames; i++) model.step(1 / 60, animate)
}

describe('style radii (M3.3)', () => {
  it('space filling uses Bondi van der Waals radii', () => {
    const p = STYLE_TARGETS.spacefill
    expect(atomRadius(p, 'C')).toBeCloseTo(1.7, 2)
    expect(atomRadius(p, 'H')).toBeCloseTo(1.2, 2)
    expect(atomRadius(p, 'N')).toBeCloseTo(1.55, 2)
    expect(atomRadius(p, 'O')).toBeCloseTo(1.52, 2)
  })
  it('ball-and-stick atoms are much smaller than vdW and hydrogens are smaller than carbon', () => {
    const p = STYLE_TARGETS.ballstick
    for (const s of ['C', 'H', 'N', 'O']) expect(atomRadius(p, s)).toBeLessThan(el(s).vdw * 0.4)
    expect(atomRadius(p, 'H')).toBeLessThan(atomRadius(p, 'C'))
  })
  it('stick radius is uniform, wireframe has no sphere radius', () => {
    const p = STYLE_TARGETS.stick
    expect(atomRadius(p, 'C')).toBeCloseTo(atomRadius(p, 'H'), 6)
    expect(atomRadius(STYLE_TARGETS.wireframe, 'C')).toBe(0)
    expect(STYLE_TARGETS.wireframe.wire).toBe(1)
  })
  it('the four styles are pairwise different in their parameters', () => {
    const keys = Object.keys(STYLE_TARGETS) as (keyof typeof STYLE_TARGETS)[]
    for (let i = 0; i < keys.length; i++)
      for (let j = i + 1; j < keys.length; j++)
        expect(JSON.stringify(STYLE_TARGETS[keys[i]])).not.toBe(JSON.stringify(STYLE_TARGETS[keys[j]]))
  })
})

describe('camera fit (M3.1 / C4.2)', () => {
  const project = (pts: number[], dir: Vec3, dist: number, center: Vec3, vfov: number, aspect: number) => {
    // camera at center + dir*dist looking at center, up = y
    const z = dir.map((v) => v / Math.hypot(...dir)) as Vec3
    const xr: Vec3 = [z[2], 0, -z[0]]
    const xl = Math.hypot(...xr)
    const x = xr.map((v) => v / xl) as Vec3
    const y: Vec3 = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]]
    const t = Math.tan((vfov * Math.PI) / 360)
    let ex = 0, ey = 0
    for (let i = 0; i < pts.length; i += 4) {
      const p = [pts[i] - center[0], pts[i + 1] - center[1], pts[i + 2] - center[2]]
      const vx = p[0] * x[0] + p[1] * x[1] + p[2] * x[2]
      const vy = p[0] * y[0] + p[1] * y[1] + p[2] * y[2]
      const vz = p[0] * z[0] + p[1] * z[1] + p[2] * z[2]
      const depth = dist - vz
      ex = Math.max(ex, (Math.abs(vx) + pts[i + 3]) / (depth * t * aspect))
      ey = Math.max(ey, (Math.abs(vy) + pts[i + 3]) / (depth * t))
    }
    return { ex, ey }
  }

  it('methane fills 80-90 % of the limiting dimension, in landscape and portrait', () => {
    const m = methane()
    const pts: number[] = []
    for (const a of m.atoms) pts.push(...a.pos, atomRadius(STYLE_TARGETS.ballstick, a.symbol))
    for (const aspect of [1.6, 0.46]) {
      const dir: Vec3 = [0.62, 0.42, 1]
      const fit = computeFit(pts, dir, 35, aspect, 0.84)
      const { ex, ey } = project(pts, dir, fit.distance, fit.center, 35, aspect)
      const limit = Math.max(ex, ey)
      expect(limit).toBeGreaterThan(0.8)
      expect(limit).toBeLessThan(0.9)
    }
  })
  it('is stable for an empty molecule', () => {
    const f = computeFit([], [0, 0, 1], 35, 1.5, 0.84)
    expect(Number.isFinite(f.distance)).toBe(true)
  })
})

describe('measurement geometry (E5.10)', () => {
  const a: Vec3 = [1.2, 0.3, -0.4], b: Vec3 = [0, 0, 0], c: Vec3 = [-0.5, 1.3, 0.2], d: Vec3 = [-1.4, 1.5, 1.1]
  it('distance label agrees with an independent calculation', () => {
    const v = buildMeasureViz([a, b])
    expect(v.kind).toBe('distance')
    expect(v.value).toBeCloseTo(Math.hypot(1.2, 0.3, 0.4), 9)
    expect(v.label?.text).toBe(formatDistance(dist(a, b)))
  })
  it('angle label and arc lie on the right side', () => {
    const v = buildMeasureViz([a, b, c])
    expect(v.kind).toBe('angle')
    expect(v.value).toBeCloseTo(angleDeg(a, b, c), 9)
    expect(v.label?.text).toBe(formatAngle(angleDeg(a, b, c)))
    expect(v.arc.length).toBeGreaterThan(10)
    // every arc point is at the same distance from the vertex
    const r0 = dist(v.arc[0], b)
    for (const p of v.arc) expect(dist(p, b)).toBeCloseTo(r0, 6)
  })
  it('dihedral arc sweeps from the first substituent direction to the last', () => {
    const v = buildMeasureViz([a, b, c, d])
    expect(v.kind).toBe('dihedral')
    expect(v.value).toBeCloseTo(dihedralDeg(a, b, c, d), 9)
    const axis = [c[0] - b[0], c[1] - b[1], c[2] - b[2]]
    const al = Math.hypot(...axis)
    const k = axis.map((x) => x / al)
    const perp = (p: Vec3): number[] => {
      const dp = p[0] * k[0] + p[1] * k[1] + p[2] * k[2]
      const w = [p[0] - dp * k[0], p[1] - dp * k[1], p[2] - dp * k[2]]
      const l = Math.hypot(...w)
      return w.map((x) => x / l)
    }
    const mid: Vec3 = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2, (b[2] + c[2]) / 2]
    const first = perp([v.arc[0][0] - mid[0], v.arc[0][1] - mid[1], v.arc[0][2] - mid[2]])
    const last = perp([v.arc[v.arc.length - 1][0] - mid[0], v.arc[v.arc.length - 1][1] - mid[1], v.arc[v.arc.length - 1][2] - mid[2]])
    const v1 = perp([a[0] - b[0], a[1] - b[1], a[2] - b[2]])
    const v4 = perp([d[0] - c[0], d[1] - c[1], d[2] - c[2]])
    for (let i = 0; i < 3; i++) {
      expect(first[i]).toBeCloseTo(v1[i], 6)
      expect(last[i]).toBeCloseTo(v4[i], 6)
    }
  })
  it('dashes cover both ends of the line', () => {
    const segs = dashSegments([0, 0, 0], [1.37, 0, 0])
    expect(segs[0][0][0]).toBeCloseTo(0, 9)
    expect(segs[segs.length - 1][1][0]).toBeLessThanOrEqual(1.37 + 1e-9)
    expect(segs.length).toBeGreaterThan(4)
  })
})

describe('instance matrices', () => {
  it('a cylinder instance maps its endpoints and has the requested radius', () => {
    const arr = new Float32Array(16)
    expect(writeCylinder(arr, 0, 0, 0, 0, 0, 2, 0, 0.3)).toBe(true)
    // Y axis column = full segment vector, translation = midpoint
    expect([arr[4], arr[5], arr[6]]).toEqual([0, 2, 0])
    expect([arr[12], arr[13], arr[14]]).toEqual([0, 1, 0])
    expect(Math.hypot(arr[0], arr[1], arr[2])).toBeCloseTo(0.3, 6)
    expect(Math.hypot(arr[8], arr[9], arr[10])).toBeCloseTo(0.3, 6)
    expect(arr[0] * arr[8] + arr[1] * arr[9] + arr[2] * arr[10]).toBeCloseTo(0, 6)
    // right-handed basis (positive determinant): a mirrored instance would render with inverted winding
    const det =
      arr[0] * (arr[5] * arr[10] - arr[6] * arr[9]) - arr[4] * (arr[1] * arr[10] - arr[2] * arr[9]) + arr[8] * (arr[1] * arr[6] - arr[2] * arr[5])
    expect(det).toBeGreaterThan(0)
  })
  it('refuses degenerate segments', () => {
    expect(writeCylinder(new Float32Array(16), 0, 1, 1, 1, 1, 1, 1, 0.1)).toBe(false)
  })
})

describe('bond strands (M3.4)', () => {
  const ethylene = () => {
    const h = 1.09 * 0.85
    return build(
      [['C', [-0.667, 0, 0]], ['C', [0.667, 0, 0]], ['H', [-1.24, h, 0]], ['H', [-1.24, -h, 0]], ['H', [1.24, h, 0]], ['H', [1.24, -h, 0]]],
      [[1, 2, 2], [1, 3, 1], [1, 4, 1], [2, 5, 1], [2, 6, 1]],
    )
  }
  const modelOf = (m: Molecule) => {
    const model = new SceneModel()
    model.sync(m, 1, false)
    settle(model, false, 2)
    return model
  }

  it('single / double / triple give 1 / 2 / 3 strands, aromatic gives a thinner second strand', () => {
    const model = modelOf(build([['C', [0, 0, 0]], ['C', [1.2, 0, 0]], ['C', [2.4, 0.2, 0]]], [[1, 2, 1], [2, 3, 3]]))
    const adj = buildAdjacency(model.bonds)
    const p = STYLE_TARGETS.ballstick
    const counts = model.bonds.map((b) => bondStrands(b, adj, p).n)
    expect(counts).toEqual([1, 3])
    const dbl = modelOf(build([['C', [0, 0, 0]], ['C', [1.3, 0, 0]]], [[1, 2, 2]]))
    expect(bondStrands(dbl.bonds[0], buildAdjacency(dbl.bonds), p).n).toBe(2)
    const aro = modelOf(build([['C', [0, 0, 0]], ['C', [1.4, 0, 0]]], [[1, 2, 1, true]]))
    const r = bondStrands(aro.bonds[0], buildAdjacency(aro.bonds), p)
    expect(r.n).toBe(2)
    expect(r.strands[1].r).toBeLessThan(r.strands[0].r)
  })

  it('double-bond strands lie in the plane of the substituents (ethylene, plane z = 0)', () => {
    const model = modelOf(ethylene())
    const dir: [number, number, number] = [0, 0, 0]
    offsetDirection(model.bonds[0], buildAdjacency(model.bonds), dir)
    expect(Math.abs(dir[2])).toBeLessThan(1e-6)
    expect(Math.abs(dir[1])).toBeCloseTo(1, 6)
    expect(Math.hypot(...dir)).toBeCloseTo(1, 6)
  })

  it('aromatic second strand points towards the ring centre (benzene)', () => {
    const pos: [string, Vec3][] = []
    const bonds: [number, number, BondOrder, boolean][] = []
    for (let i = 0; i < 6; i++) {
      const t = (i * Math.PI) / 3
      pos.push(['C', [1.4 * Math.cos(t), 1.4 * Math.sin(t), 0]])
      pos.push(['H', [2.48 * Math.cos(t), 2.48 * Math.sin(t), 0]])
    }
    for (let i = 0; i < 6; i++) {
      bonds.push([2 * i + 1, 2 * ((i + 1) % 6) + 1, i % 2 === 0 ? 2 : 1, true])
      bonds.push([2 * i + 1, 2 * i + 2, 1, false])
    }
    const model = modelOf(build(pos, bonds))
    const adj = buildAdjacency(model.bonds)
    for (const b of model.bonds.filter((x) => x.aromatic)) {
      const d: [number, number, number] = [0, 0, 0]
      offsetDirection(b, adj, d)
      const mid = [(b.a.p[0] + b.b.p[0]) / 2, (b.a.p[1] + b.b.p[1]) / 2, (b.a.p[2] + b.b.p[2]) / 2]
      expect(d[0] * -mid[0] + d[1] * -mid[1]).toBeGreaterThan(0.5)
    }
  })
})

describe('SceneModel (C4.5 / C4.7)', () => {
  it('adopts a molecule, flags terminal hydrogens and valence', () => {
    const model = new SceneModel()
    model.sync(methane(), 1, false)
    expect(model.atoms.length).toBe(5)
    expect(model.bonds.length).toBe(4)
    expect(model.atoms.filter((e) => e.termH).length).toBe(4)
    expect(model.atoms.every((e) => e.valence === 0)).toBe(true)

    const over = build([['C', [0, 0, 0]], ['H', [1, 0, 0]], ['H', [-1, 0, 0]], ['H', [0, 1, 0]], ['H', [0, -1, 0]], ['H', [0, 0, 1]]], [[1, 2, 1], [1, 3, 1], [1, 4, 1], [1, 5, 1], [1, 6, 1]])
    const m2 = new SceneModel()
    m2.sync(over, 1, false)
    expect(m2.liveAtom(1)?.valence).toBe(2) // five bonds on carbon
  })

  it('new atoms pop in with an overshoot and settle at scale 1 within ~0.5 s', () => {
    const model = new SceneModel()
    model.sync(methane(), 1, false)
    settle(model, true, 120)
    const m = methane()
    const id = m.nextId++
    m.atoms.push({ id, symbol: 'C', pos: [2.5, 0, 0], charge: 0 })
    m.bonds.push({ id: m.nextId++, a: 2, b: id, order: 1 })
    model.sync(m, 1, true)
    const e = model.liveAtom(id)!
    expect(e.s).toBe(0)
    // emerges from its parent hydrogen
    expect(e.p[0]).toBeCloseTo(model.liveAtom(2)!.p[0], 6)
    let max = 0, frames = 0
    const seen = new Set<string>()
    while (model.step(1 / 60, true) && frames < 120) {
      frames++
      max = Math.max(max, e.s)
      seen.add(e.s.toFixed(2))
    }
    expect(max).toBeGreaterThan(1.03)
    expect(max).toBeLessThan(1.2)
    expect(frames / 60).toBeLessThan(0.8)
    expect(seen.size).toBeGreaterThanOrEqual(6) // distinct intermediate frames (C4.5)
    expect(e.s).toBe(1)
    expect(e.p[0]).toBeCloseTo(2.5, 2)
  })

  it('deleted atoms shrink out and are then removed; reduced motion removes them at once', () => {
    const model = new SceneModel()
    model.sync(methane(), 1, false)
    const m = methane()
    m.atoms = m.atoms.filter((a) => a.id !== 5)
    m.bonds = m.bonds.filter((b) => b.b !== 5)
    model.sync(m, 1, true)
    expect(model.atoms.length).toBe(5) // ghost still present
    model.step(0.05, true)
    const ghost = model.atoms.find((e) => e.dying)!
    expect(ghost.s).toBeLessThan(1)
    expect(ghost.s).toBeGreaterThan(0)
    settle(model, true, 40)
    expect(model.atoms.length).toBe(4)
    expect(model.bonds.length).toBe(3)

    const m2 = new SceneModel()
    m2.sync(methane(), 1, false)
    m2.sync(m, 1, false)
    m2.step(1 / 60, false)
    expect(m2.atoms.length).toBe(4)
  })

  it('a library switch (new loadNonce) retires the old molecule and grows the new one, even with equal ids', () => {
    const model = new SceneModel()
    model.sync(methane(), 1, false)
    model.sync(methane(), 2, true)
    expect(model.atoms.filter((e) => e.dying).length).toBe(5)
    expect(model.atoms.filter((e) => !e.dying).every((e) => e.s === 0)).toBe(true)
    settle(model, true, 120)
    expect(model.atoms.length).toBe(5)
    expect(model.atoms.every((e) => !e.dying && e.s === 1)).toBe(true)
  })

  it('style switch morphs smoothly and lands exactly on the target (and instantly with reduced motion)', () => {
    const model = new SceneModel()
    model.sync(methane(), 1, false)
    model.setStyle('spacefill')
    model.step(1 / 60, true)
    const mid = model.radius(model.liveAtom(1)!)
    expect(mid).toBeGreaterThan(atomRadius(STYLE_TARGETS.ballstick, 'C'))
    expect(mid).toBeLessThan(1.7)
    let t = 0
    while (model.step(1 / 60, true)) t += 1 / 60
    expect(t).toBeLessThan(0.4)
    expect(model.radius(model.liveAtom(1)!)).toBeCloseTo(1.7, 6)

    model.setStyle('wireframe')
    model.step(1 / 60, false)
    expect(model.radius(model.liveAtom(1)!)).toBe(0)
    expect(model.params.wire).toBe(1)
  })

  it('hiding hydrogens removes them from framing and picking', () => {
    const model = new SceneModel()
    model.sync(methane(), 1, false)
    model.setHideH(true)
    settle(model, true, 40)
    const pts: number[] = []
    model.collectFit('ballstick', pts)
    expect(pts.length / 4).toBe(1)
    // a ray straight through a hydrogen now finds nothing but (possibly) carbon
    const h = model.liveAtom(2)!
    const hit = model.pick(h.p[0], h.p[1], h.p[2] + 10, 0, 0, -1)
    expect(hit?.kind === 'atom' && hit.id === 2).toBe(false)
  })

  it('dragging snaps positions to the pointer without spring lag', () => {
    const model = new SceneModel()
    model.sync(methane(), 1, false)
    model.snap = true
    const m = methane()
    m.atoms[1].pos = [3, 3, 3]
    model.sync(m, 1, true)
    model.step(1 / 60, true)
    expect(model.liveAtom(2)!.p).toEqual([3, 3, 3])
  })

  it('picks atoms (front-most) and bonds, and nothing in empty space', () => {
    const model = new SceneModel()
    model.sync(build([['C', [0, 0, 0]], ['C', [3, 0, 0]], ['C', [1.5, 2, 0]]], [[1, 2, 1]]), 1, false)
    settle(model, false, 2)
    const front = model.pick(0, 0, 10, 0, 0, -1)
    expect(front).toMatchObject({ kind: 'atom', id: 1 })
    const bond = model.pick(1.5, 0, 10, 0, 0, -1)
    expect(bond).toMatchObject({ kind: 'bond', id: 100 })
    expect(model.pick(1.5, -2, 10, 0, 0, -1)).toBeNull()
    // atoms hide bonds behind them
    const two = new SceneModel()
    two.sync(build([['C', [0, 0, 0]], ['C', [0, 0, -3]]], [[1, 2, 1]]), 1, false)
    settle(two, false, 2)
    expect(two.pick(0.01, 0, 10, 0, 0, -1)).toMatchObject({ kind: 'atom', id: 1 })
  })

  it('space filling buries the bonds: they cannot be picked', () => {
    const model = new SceneModel()
    model.sync(build([['C', [0, 0, 0]], ['C', [3.6, 0, 0]]], [[1, 2, 1]]), 1, false)
    model.setStyle('spacefill')
    settle(model, false, 2)
    expect(model.pick(1.8, 0, 10, 0, 0, -1)).toBeNull()
  })

  it('survives 20 rapid edits with a correct final atom count (C4.7)', () => {
    const model = new SceneModel()
    const m = methane()
    model.sync(m, 1, true)
    for (let i = 0; i < 20; i++) {
      const id = m.nextId++
      m.atoms = [...m.atoms, { id, symbol: 'C', pos: [i * 0.3, 1, 0], charge: 0 }]
      model.sync({ ...m }, 1, true)
      model.step(1 / 60, true)
    }
    settle(model, true, 240)
    expect(model.atoms.length).toBe(25)
    expect(model.atoms.every((e) => e.s === 1 && !e.dying)).toBe(true)
  })
})
