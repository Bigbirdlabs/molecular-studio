import { allowedValences, type Atom, type BondOrder, type Molecule, type Vec3 } from '../chem/molecule'
import type { RenderStyle } from '../store'
import {
  BOND_GROW_TAU, BOND_SHRINK_SECONDS, MAX_DT, PICK_MIN_ATOM_RADIUS, PICK_MIN_BOND_RADIUS, POP_DAMPING, POP_STIFFNESS,
  POS_DAMPING, POS_STIFFNESS, SHRINK_SECONDS, STYLE_TAU,
} from './theme'
import { PARAM_KEYS, STYLE_TARGETS, atomRadius, bondOuterRadius, cloneParams, type StyleParams } from './styleParams'

/**
 * Presentation state of one atom. The molecule in the store is the single source of truth; entries only add what the
 * eye needs on top of it: an eased position, a pop-in / shrink-out scale and a few derived flags.
 */
export interface AtomEntry {
  id: number
  symbol: string
  charge: number
  p: Vec3 // displayed position (springs towards t)
  v: Vec3 // velocity
  t: Vec3 // target position = the molecule's position
  s: number // displayed scale 0..~1.1
  sv: number // scale velocity
  st: number // scale target: 1 visible, 0 hidden / dying
  dying: boolean // removed from the molecule, shrinking out
  hidden: boolean // terminal hydrogen hidden by the "show hydrogens" render toggle
  termH: boolean // hydrogen with exactly one bond, to a non-hydrogen
  valence: 0 | 1 | 2 // 0 ok, 1 under, 2 over
  partial: number // Gasteiger partial charge (approximate) when charge colouring is on
}

export interface BondEntry {
  id: number
  a: AtomEntry
  b: AtomEntry
  order: BondOrder
  aromatic: boolean
  s: number
  st: number
  dying: boolean
}

export type Pick = { kind: 'atom'; id: number; t: number } | { kind: 'bond'; id: number; t: number } | null

const v3 = (p: Vec3): Vec3 => [p[0], p[1], p[2]]

export class SceneModel {
  atoms: AtomEntry[] = [] // live + dying
  bonds: BondEntry[] = []
  params: StyleParams = cloneParams(STYLE_TARGETS.ballstick)
  target: StyleParams = cloneParams(STYLE_TARGETS.ballstick)
  style: RenderStyle = 'ballstick'
  mol: Molecule | null = null
  hideH = false
  /** True while the user drags an atom: positions follow the pointer 1:1 instead of springing. */
  snap = false
  /** Rubber-band end point of the bond tool (world space) or null. */
  rubberTo: Vec3 | null = null
  settled = false

  private liveAtoms = new Map<number, AtomEntry>()
  private liveBonds = new Map<number, BondEntry>()
  private loadNonce = -1

  liveAtom(id: number): AtomEntry | undefined {
    return this.liveAtoms.get(id)
  }

  /** Adopt a new molecule value from the store. Cheap diff by ids; safe to call every frame of a relax. */
  sync(mol: Molecule, loadNonce: number, animate: boolean): void {
    const loadChanged = loadNonce !== this.loadNonce
    this.loadNonce = loadNonce
    this.mol = mol
    this.settled = false
    if (loadChanged) this.retireAll()

    const oldIds = new Set(this.liveAtoms.keys())
    const used = new Map<number, number>()
    const deg = new Map<number, number>()
    const bump = (m: Map<number, number>, id: number, n: number) => m.set(id, (m.get(id) ?? 0) + n)
    for (const b of mol.bonds) {
      bump(used, b.a, b.order); bump(used, b.b, b.order)
      bump(deg, b.a, 1); bump(deg, b.b, 1)
    }

    let nbrs: Map<number, number[]> | null = null
    if (oldIds.size > 0 && mol.atoms.some((a) => !oldIds.has(a.id))) {
      nbrs = new Map()
      for (const b of mol.bonds) {
        const la = nbrs.get(b.a) ?? []; la.push(b.b); nbrs.set(b.a, la)
        const lb = nbrs.get(b.b) ?? []; lb.push(b.a); nbrs.set(b.b, lb)
      }
    }

    const seen = new Set<number>()
    const symOf = new Map<number, string>()
    for (const a of mol.atoms) {
      symOf.set(a.id, a.symbol)
      seen.add(a.id)
      let e = this.liveAtoms.get(a.id)
      if (!e) {
        let start: Vec3 = a.pos
        if (nbrs && animate) {
          // new atoms emerge from the atom they are bonded to
          for (const nid of nbrs.get(a.id) ?? []) {
            if (!oldIds.has(nid)) continue
            const parent = this.liveAtoms.get(nid)
            if (parent) { start = parent.p; break }
          }
        }
        e = {
          id: a.id, symbol: a.symbol, charge: a.charge,
          p: v3(animate ? start : a.pos), v: [0, 0, 0], t: v3(a.pos),
          s: animate ? 0 : 1, sv: 0, st: 1, dying: false, hidden: false, termH: false, valence: 0, partial: 0,
        }
        this.liveAtoms.set(a.id, e)
        this.atoms.push(e)
      } else {
        e.t = v3(a.pos)
        e.symbol = a.symbol
        e.charge = a.charge
        if (!animate) e.p = v3(a.pos)
      }
      const u = used.get(a.id) ?? 0
      const list = allowedValences(a as Atom)
      e.valence = list.includes(u) ? 0 : u > Math.max(0, ...list) ? 2 : 1
    }
    for (const [id, e] of this.liveAtoms) {
      if (seen.has(id)) continue
      this.liveAtoms.delete(id)
      this.kill(e)
    }

    // terminal hydrogens (for the show-hydrogens toggle)
    for (const e of this.liveAtoms.values()) e.termH = false
    for (const b of mol.bonds) {
      const sa = symOf.get(b.a), sb = symOf.get(b.b)
      if (sa === 'H' && sb !== 'H' && deg.get(b.a) === 1) { const e = this.liveAtoms.get(b.a); if (e) e.termH = true }
      if (sb === 'H' && sa !== 'H' && deg.get(b.b) === 1) { const e = this.liveAtoms.get(b.b); if (e) e.termH = true }
    }

    const seenB = new Set<number>()
    for (const b of mol.bonds) {
      seenB.add(b.id)
      const ea = this.liveAtoms.get(b.a), eb = this.liveAtoms.get(b.b)
      if (!ea || !eb) continue
      let e = this.liveBonds.get(b.id)
      if (e && (e.a !== ea || e.b !== eb)) { this.liveBonds.delete(b.id); this.killBond(e); e = undefined }
      if (!e) {
        e = { id: b.id, a: ea, b: eb, order: b.order, aromatic: !!b.aromatic, s: animate ? 0 : 1, st: 1, dying: false }
        this.liveBonds.set(b.id, e)
        this.bonds.push(e)
      } else {
        e.order = b.order
        e.aromatic = !!b.aromatic
      }
    }
    for (const [id, e] of this.liveBonds) {
      if (seenB.has(id)) continue
      this.liveBonds.delete(id)
      this.killBond(e)
    }
    this.applyVisibility()
  }

  private kill(e: AtomEntry): void {
    e.dying = true
    e.st = 0
  }
  private killBond(e: BondEntry): void {
    e.dying = true
    e.st = 0
  }
  private retireAll(): void {
    for (const e of this.liveAtoms.values()) this.kill(e)
    for (const e of this.liveBonds.values()) this.killBond(e)
    this.liveAtoms.clear()
    this.liveBonds.clear()
  }

  setHideH(hide: boolean): void {
    if (hide === this.hideH) return
    this.hideH = hide
    this.applyVisibility()
  }

  private applyVisibility(): void {
    for (const e of this.atoms) {
      if (e.dying) continue
      e.hidden = this.hideH && e.termH
      e.st = e.hidden ? 0 : 1
    }
    for (const b of this.bonds) {
      if (b.dying) continue
      b.st = b.a.hidden || b.b.hidden ? 0 : 1
    }
    this.settled = false
  }

  /** Switch style; the parameters ease towards it unless `immediate` (first adoption of the store's style). */
  setStyle(style: RenderStyle, immediate = false): void {
    if (style === this.style && !immediate) return
    this.style = style
    this.target = cloneParams(STYLE_TARGETS[style])
    if (immediate) this.params = cloneParams(this.target)
    this.settled = false
  }

  /** Charge colouring input (approximate Gasteiger charges); null clears it. */
  setPartialCharges(map: Map<number, number> | null): void {
    for (const e of this.liveAtoms.values()) e.partial = map?.get(e.id) ?? 0
  }

  radius(e: AtomEntry): number {
    return atomRadius(this.params, e.symbol)
  }

  /** Advance springs / eases. Returns true while anything is still moving (caller keeps requesting frames). */
  step(dtRaw: number, animate: boolean): boolean {
    if (this.settled && animate) return false
    const dt = Math.min(Math.max(dtRaw, 0), MAX_DT)
    let active = false

    // style morph
    const k = animate ? 1 - Math.exp(-dt / STYLE_TAU) : 1
    for (const key of PARAM_KEYS) {
      const d = this.target[key] - this.params[key]
      if (Math.abs(d) < 2e-3) this.params[key] = this.target[key]
      else { this.params[key] += d * k; active = true }
    }

    const snap = this.snap || !animate
    for (const e of this.atoms) {
      if (snap) {
        e.p[0] = e.t[0]; e.p[1] = e.t[1]; e.p[2] = e.t[2]
        e.v[0] = e.v[1] = e.v[2] = 0
      } else {
        let moving = false
        for (let i = 0; i < 3; i++) {
          const d = e.t[i] - e.p[i]
          if (Math.abs(d) > 1e-3 || Math.abs(e.v[i]) > 0.01) {
            e.v[i] += (POS_STIFFNESS * d - POS_DAMPING * e.v[i]) * dt
            e.p[i] += e.v[i] * dt
            moving = true
          }
        }
        if (moving) active = true
        else { e.p[0] = e.t[0]; e.p[1] = e.t[1]; e.p[2] = e.t[2]; e.v[0] = e.v[1] = e.v[2] = 0 }
      }

      if (!animate) { e.s = e.dying || e.st === 0 ? 0 : 1; e.sv = 0 }
      else if (e.dying || e.st === 0) {
        if (e.s > 0) { e.s = Math.max(0, e.s - dt / SHRINK_SECONDS); active = true }
        e.sv = 0
      } else if (Math.abs(1 - e.s) > 1e-3 || Math.abs(e.sv) > 0.01) {
        e.sv += (POP_STIFFNESS * (1 - e.s) - POP_DAMPING * e.sv) * dt
        e.s += e.sv * dt
        active = true
      } else { e.s = 1; e.sv = 0 }
    }

    for (const b of this.bonds) {
      if (!animate) b.s = b.dying || b.st === 0 ? 0 : 1
      else if (b.dying || b.st === 0) {
        if (b.s > 0) { b.s = Math.max(0, b.s - dt / BOND_SHRINK_SECONDS); active = true }
      } else if (Math.abs(1 - b.s) > 1e-3) {
        b.s += (1 - b.s) * (1 - Math.exp(-dt / BOND_GROW_TAU))
        active = true
      } else b.s = 1
    }

    // cull finished ghosts
    if (this.atoms.some((e) => e.dying && e.s <= 0.002)) this.atoms = this.atoms.filter((e) => !(e.dying && e.s <= 0.002))
    if (this.bonds.some((b) => b.dying && b.s <= 0.002)) this.bonds = this.bonds.filter((b) => !(b.dying && b.s <= 0.002))

    this.settled = !active
    return active
  }

  // ---------- queries ----------
  isVisible(e: AtomEntry): boolean {
    return !e.dying && !e.hidden
  }

  /** Flat [x, y, z, r, ...] of the atoms that count for framing (final positions, final style radii). */
  collectFit(style: RenderStyle, out: number[]): void {
    out.length = 0
    const p = STYLE_TARGETS[style]
    for (const e of this.atoms) {
      if (!this.isVisible(e)) continue
      out.push(e.t[0], e.t[1], e.t[2], Math.max(atomRadius(p, e.symbol), 0.2))
    }
  }

  /** Nearest atom (sphere) or bond (tube) hit by a ray, using the displayed positions. Atoms win over bonds. */
  pick(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number): Pick {
    let bestAtom: AtomEntry | null = null
    let bestT = Infinity
    for (const e of this.atoms) {
      if (e.dying || e.hidden || e.s < 0.5) continue
      const r = Math.max(atomRadius(this.params, e.symbol) * e.s, PICK_MIN_ATOM_RADIUS)
      const cx = e.p[0] - ox, cy = e.p[1] - oy, cz = e.p[2] - oz
      const tca = cx * dx + cy * dy + cz * dz
      const d2 = cx * cx + cy * cy + cz * cz - tca * tca
      if (d2 > r * r) continue
      const t = tca - Math.sqrt(r * r - d2)
      if (t < bestT) { bestT = t; bestAtom = e }
    }
    if (bestAtom) return { kind: 'atom', id: bestAtom.id, t: bestT }

    if (this.params.bondR < 0.02 && this.params.wire < 0.5) return null // bonds are not drawn (space filling)
    let bestBond: BondEntry | null = null
    let bestS = Infinity
    for (const b of this.bonds) {
      if (b.dying || b.st === 0 || b.s < 0.5) continue
      const thr = Math.max(bondOuterRadius(this.params, b.order, b.aromatic) * b.s, PICK_MIN_BOND_RADIUS)
      const ax = b.a.p[0], ay = b.a.p[1], az = b.a.p[2]
      const ux = b.b.p[0] - ax, uy = b.b.p[1] - ay, uz = b.b.p[2] - az
      const wx = ox - ax, wy = oy - ay, wz = oz - az
      const bb = dx * ux + dy * uy + dz * uz
      const cc = ux * ux + uy * uy + uz * uz
      if (cc < 1e-9) continue
      const dd = dx * wx + dy * wy + dz * wz
      const ee = ux * wx + uy * wy + uz * wz
      const den = cc - bb * bb
      let tq = den < 1e-9 ? ee / cc : (ee - bb * dd) / den
      tq = tq < 0 ? 0 : tq > 1 ? 1 : tq
      let sq = bb * tq - dd
      if (sq < 0) sq = 0
      const px = ox + dx * sq - (ax + ux * tq)
      const py = oy + dy * sq - (ay + uy * tq)
      const pz = oz + dz * sq - (az + uz * tq)
      if (px * px + py * py + pz * pz <= thr * thr && sq < bestS) { bestS = sq; bestBond = b }
    }
    return bestBond ? { kind: 'bond', id: bestBond.id, t: bestS } : null
  }
}
