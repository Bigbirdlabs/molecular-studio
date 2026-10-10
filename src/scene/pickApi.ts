/**
 * Small bridge so the UI (which owns menus / sheets) can ask the 3D scene what is under a screen point without
 * importing three.js. The scene registers its picker while the Viewport is mounted.
 */
export type PickResult = { kind: 'atom' | 'bond'; id: number } | null

let picker: ((clientX: number, clientY: number) => PickResult) | null = null

export function registerPicker(fn: ((clientX: number, clientY: number) => PickResult) | null): void {
  picker = fn
}

/** Atom or bond under a client (viewport) coordinate, or null. Null as well while no scene is mounted. */
export function pickAtClient(clientX: number, clientY: number): PickResult {
  return picker ? picker(clientX, clientY) : null
}

/** Fired on `window` when a touch press on an atom is held (~0.5 s) without moving. The atom is selected first. */
export const ATOM_LONG_PRESS_EVENT = 'molecular:atom-longpress'
export interface AtomLongPressDetail {
  id: number
  clientX: number
  clientY: number
}
