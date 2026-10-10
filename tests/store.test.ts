import { describe, expect, it, vi } from 'vitest'

// minimal browser-ish globals so the store's autosave runs for real
const mem = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
})

import { useStudio } from '../src/store'
import { methane, formula, molarMass, angleDeg, bondLength, atomicNumber, cloneMolecule, emptyMolecule } from '../src/chem/molecule'
import { el } from '../src/chem/elements'

describe('contract: molecule', () => {
  it('methane is a real tetrahedron', () => {
    const m = methane()
    expect(formula(m, false)).toBe('CH4')
    expect(molarMass(m)).toBeCloseTo(16.043, 2)
    for (const b of m.bonds) expect(bondLength(m, b)).toBeCloseTo(1.09, 3)
    const hs = m.atoms.filter((a) => a.symbol === 'H')
    expect(angleDeg(hs[0].pos, m.atoms[0].pos, hs[1].pos)).toBeCloseTo(109.47, 1)
  })
  it('ids are unique, preserved by clone, and atomic numbers exist', () => {
    const a = emptyMolecule(), b = emptyMolecule()
    expect(a.id).not.toBe(b.id)
    expect(cloneMolecule(a).id).toBe(a.id)
    expect(atomicNumber('Cl')).toBe(17)
    expect(el('Br').z).toBe(35)
  })
})

describe('contract: store', () => {
  it('starts on methane with the select tool', () => {
    const s = useStudio.getState()
    expect(s.mol.atoms).toHaveLength(5)
    expect(s.tool).toBe('select')
  })
  it('camera tools do not select; select tool does', () => {
    const s = useStudio.getState()
    s.setTool('rotate'); s.clickAtom(1)
    expect(useStudio.getState().selection).toEqual([])
    s.setTool('select'); s.clickAtom(1)
    expect(useStudio.getState().selection).toEqual([1])
  })
  it('camera actions bump nonces', () => {
    const s = useStudio.getState()
    const r = s.cameraResetNonce, z = s.zoomNonce
    s.resetCamera(); s.zoomBy(1.2)
    expect(useStudio.getState().cameraResetNonce).toBe(r + 1)
    expect(useStudio.getState().zoomNonce).toBe(z + 1)
    expect(useStudio.getState().zoomFactor).toBe(1.2)
  })
  it('drag creates one undo step only when something moved', () => {
    const s = useStudio.getState()
    const n = s.past.length
    s.beginDrag(); s.endDrag()
    expect(useStudio.getState().past.length).toBe(n)
    s.beginDrag(); s.dragAtom(2, [2, 2, 2]); s.dragAtom(2, [2.5, 2, 2]); s.endDrag()
    expect(useStudio.getState().past.length).toBe(n + 1)
    s.undo()
    expect(useStudio.getState().mol.atoms.find((a) => a.id === 2)!.pos[0]).toBeCloseTo(0.629, 2)
  })
  it('autosave transitions: unsaved -> saved, payload is real', async () => {
    vi.useFakeTimers()
    const s = useStudio.getState()
    s.setProjectName('Deneme')
    await Promise.resolve()
    expect(useStudio.getState().saveStatus).toBe('unsaved')
    vi.advanceTimersByTime(900)
    expect(useStudio.getState().saveStatus).toBe('saved')
    expect(useStudio.getState().lastSavedAt).not.toBeNull()
    const saved = JSON.parse(mem.get('molecular-studio:project:v1')!)
    expect(saved.projectName).toBe('Deneme')
    expect(saved.mol.atoms.length).toBe(5)
    vi.useRealTimers()
  })
  it('language persists', () => {
    useStudio.getState().setLanguage('en')
    expect(JSON.parse(mem.get('molecular-studio:settings:v1')!).language).toBe('en')
  })
})
