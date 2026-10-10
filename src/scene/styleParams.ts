import { el } from '../chem/elements'
import type { RenderStyle } from '../store'

/**
 * Continuous parameters describing how a render style looks. The scene eases these numbers towards the target style
 * so a style switch is an animated morph (radii grow / shrink, bonds thicken / thin) instead of a pop.
 *
 * atom radius = a * vdW(symbol) * (H ? hScale : 1) + b
 */
export interface StyleParams {
  a: number // fraction of the van der Waals radius
  b: number // constant radius (stick style)
  hScale: number // extra factor for hydrogens
  bondR: number // radius of a single bond / the main strand
  multiR: number // radius of each strand of a double / triple bond
  multiOff: number // half spacing of the strands of a double bond
  wire: number // 0..1: atoms are drawn as points (wireframe) instead of spheres
}

export const STYLE_TARGETS: Record<RenderStyle, StyleParams> = {
  // ~0.27 x vdW (C 0.46 A), hydrogens smaller (0.23 A)
  ballstick: { a: 0.27, b: 0, hScale: 0.7, bondR: 0.11, multiR: 0.07, multiOff: 0.125, wire: 0 },
  // true Bondi van der Waals radii; bonds are fully buried so they are not drawn
  spacefill: { a: 1, b: 0, hScale: 1, bondR: 0, multiR: 0, multiOff: 0.1, wire: 0 },
  // uniform joined sticks
  stick: { a: 0, b: 0.14, hScale: 1, bondR: 0.14, multiR: 0.06, multiOff: 0.085, wire: 0 },
  // thin lines + small points, no spheres
  wireframe: { a: 0, b: 0, hScale: 1, bondR: 0.03, multiR: 0.024, multiOff: 0.065, wire: 1 },
}

export const PARAM_KEYS = ['a', 'b', 'hScale', 'bondR', 'multiR', 'multiOff', 'wire'] as const satisfies readonly (keyof StyleParams)[]

export const cloneParams = (p: StyleParams): StyleParams => ({ ...p })

/** Visual radius (Å) of an atom under the given (possibly mid-transition) style parameters. */
export function atomRadius(p: StyleParams, symbol: string): number {
  const e = el(symbol)
  return p.a * e.vdw * (symbol === 'H' ? p.hScale : 1) + p.b
}

/** Half-width of the whole strand bundle of a bond (used for picking and the selection shell). */
export function bondOuterRadius(p: StyleParams, order: number, aromatic: boolean): number {
  if (aromatic) return Math.max(p.bondR, p.multiOff * 1.5 + p.multiR * 0.6)
  if (order === 2) return p.multiOff + p.multiR
  if (order === 3) return p.multiOff * 1.4 + p.multiR
  return p.bondR
}
