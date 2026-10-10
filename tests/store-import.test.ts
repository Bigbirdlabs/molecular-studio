import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_KEY, freshStore, projectRecord, waterJson } from './helpers/freshStore'

// What the molfile parser hands back is controlled by the test; the store is the real one.
let parsed: unknown = null
vi.mock('../src/chem/io', () => ({
  parseMolfile: () => parsed,
  parseXYZ: () => parsed,
  toMolfile: () => '',
  toXYZ: () => '',
}))

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const molFile = (name = 'su.mol') => new File(['x'], name, { type: 'chemical/x-mdl-molfile' })

describe('file import goes through the store validation (round 3)', () => {
  it('a molecule the store rejects keeps its error toast: no success toast, no rename, nothing loaded', async () => {
    const s = await freshStore()
    const actions = await import('../src/ui/actions')
    const bad = waterJson('mol-bad')
    bad.atoms[0].symbol = 'Xx'
    parsed = bad
    const nonce = s.get().loadNonce
    const before = s.get().mol
    await actions.importFile(molFile())
    expect(s.get().toast?.kind).toBe('error')
    expect(s.get().toast?.code).toBe('unsupportedElement')
    expect(s.get().loadNonce).toBe(nonce)
    expect(s.get().mol).toBe(before)
    expect(s.get().projectName).toBe(s.DEFAULT_PROJECT_NAME)
  })

  it('an accepted import loads, names the project after the molecule and reports success', async () => {
    const s = await freshStore()
    const actions = await import('../src/ui/actions')
    parsed = waterJson('mol-good')
    const nonce = s.get().loadNonce
    await actions.importFile(molFile())
    expect(s.get().loadNonce).toBe(nonce + 1)
    expect(s.get().mol.atoms).toHaveLength(3)
    expect(s.get().projectName).toBe('Su')
    expect(s.get().toast?.kind).toBe('success')
  })

  it('an empty parse result is a warning and loads nothing', async () => {
    const s = await freshStore()
    const actions = await import('../src/ui/actions')
    parsed = { ...waterJson('mol-empty'), atoms: [], bonds: [] }
    const before = s.get().mol
    await actions.importFile(molFile())
    expect(s.get().mol).toBe(before)
    expect(s.get().toast?.kind).toBe('warn')
  })
})

describe('loadFromUrl and the save status after a deep link (round 3)', () => {
  it('a known ?m= id replaces the opening molecule, strips the param and leaves the stored project in place', async () => {
    const stored = waterJson('mol-stored')
    stored.name = 'Saklı'
    const s = await freshStore({ search: '?m=su', storage: { [PROJECT_KEY]: projectRecord(stored, 'Kayıtlı proje', 42) } })
    const actions = await import('../src/ui/actions')
    expect(s.get().mol.name).toBe('Saklı')
    await actions.loadFromUrl()
    expect(s.get().mol.name).not.toBe('Saklı')
    expect(s.get().projectName).toBe(s.DEFAULT_PROJECT_NAME)
    expect(s.get().past).toEqual([])
    expect(s.env.replaceState).toHaveBeenCalledTimes(1)
    expect(s.env.replaceState.mock.calls[0][2]).toBe('/#h')
    expect(JSON.parse(s.env.mem.get(PROJECT_KEY)!).projectName).toBe('Kayıtlı proje')
  })

  it('an unknown ?m= id leaves the stored project on screen and the address bar alone', async () => {
    const stored = waterJson('mol-stored')
    stored.name = 'Saklı'
    const s = await freshStore({ search: '?m=yok-boyle-bir-sey', storage: { [PROJECT_KEY]: projectRecord(stored, 'Kayıtlı proje', 42) } })
    const actions = await import('../src/ui/actions')
    await actions.loadFromUrl()
    expect(s.get().mol.name).toBe('Saklı')
    expect(s.get().projectName).toBe('Kayıtlı proje')
    expect(s.env.replaceState).not.toHaveBeenCalled()
  })

  it('saveProjectNow reports success only when the write really happened', async () => {
    const s = await freshStore({ failWrites: true })
    const actions = await import('../src/ui/actions')
    actions.saveProjectNow()
    expect(s.get().saveStatus).toBe('error')
    expect(s.get().toast?.code).toBe('saveFailed')
    expect(s.get().toast?.kind).toBe('error')
    s.env.failWrites.on = false
    actions.saveProjectNow()
    expect(s.get().saveStatus).toBe('saved')
    expect(s.get().toast?.kind).toBe('success')
  })
})
