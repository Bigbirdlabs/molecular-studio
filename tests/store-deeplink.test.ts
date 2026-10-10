import { afterEach, describe, expect, it, vi } from 'vitest'
import { BACKUPS_KEY, PROJECT_KEY, REJECTED_KEY, freshStore, projectRecord, storedJson, waterJson } from './helpers/freshStore'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// a stored project from an earlier session, under a recognisable name
const oldProject = (savedAt = 1000) => {
  const m = waterJson('mol-old-project')
  m.name = 'Eski molekül'
  return projectRecord(m, 'Eski proje', savedAt)
}

describe('?m= deep link (round-3 fixes)', () => {
  it('still restores the stored project at start: the URL never hides the users work', async () => {
    const s = await freshStore({ search: '?m=benzene', storage: { [PROJECT_KEY]: oldProject() } })
    expect(s.get().mol.name).toBe('Eski molekül')
    expect(s.get().projectName).toBe('Eski proje')
    expect(s.get().lastSavedAt).toBe(1000)
    expect(s.get().saveStatus).toBe('saved')
  })

  it('applying the deep link strips ?m= from the address bar, keeping other params and the hash', async () => {
    const s = await freshStore({ search: '?m=benzene&x=1', storage: { [PROJECT_KEY]: oldProject() } })
    s.get().replaceMolecule(waterJson('mol-lib-benzene') as never)
    expect(s.env.replaceState).toHaveBeenCalledTimes(1)
    expect(s.env.replaceState.mock.calls[0][2]).toBe('/?x=1#h')
  })

  it('the deep-link molecule is a new document: default project name, empty history, nothing written yet', async () => {
    const s = await freshStore({ search: '?m=benzene', storage: { [PROJECT_KEY]: oldProject() } })
    s.get().replaceMolecule(waterJson('mol-lib-benzene') as never)
    const st = s.get()
    expect(st.projectName).toBe(s.DEFAULT_PROJECT_NAME)
    expect(st.past).toEqual([])
    expect(st.future).toEqual([])
    expect(st.mol.atoms).toHaveLength(3)
    // save status stays truthful: the replace itself writes nothing, so storage still holds the previous project untouched
    expect(st.saveStatus).not.toBe('error')
    expect(storedJson(s.env, PROJECT_KEY).projectName).toBe('Eski proje')
    expect(s.env.mem.has(BACKUPS_KEY)).toBe(false)
  })

  it('only the first replaceMolecule is the deep link: later replaces keep the name and do not strip again', async () => {
    const s = await freshStore({ search: '?m=benzene', storage: { [PROJECT_KEY]: oldProject() } })
    s.get().replaceMolecule(waterJson('mol-a') as never)
    s.get().setProjectName('Benim projem')
    s.get().replaceMolecule(waterJson('mol-b') as never)
    expect(s.get().projectName).toBe('Benim projem')
    expect(s.env.replaceState).toHaveBeenCalledTimes(1)
  })

  it('the first autosave after a deep link sets the previous project aside as a backup, then overwrites it', async () => {
    vi.useFakeTimers()
    const s = await freshStore({ search: '?m=benzene', storage: { [PROJECT_KEY]: oldProject(1234) } })
    s.get().replaceMolecule(waterJson('mol-lib-benzene') as never)
    s.get().setProjectName('Yeni')
    vi.advanceTimersByTime(900)
    expect(s.get().saveStatus).toBe('saved')
    expect(storedJson(s.env, PROJECT_KEY).projectName).toBe('Yeni')
    const backups = s.listProjectBackups()
    expect(backups).toHaveLength(1)
    expect(backups[0].projectName).toBe('Eski proje')
    expect(backups[0].savedAt).toBe(1234)
    expect(backups[0].mol.name).toBe('Eski molekül')
    expect(backups[0].backedUpAt).toBeGreaterThan(0)
    // a second save does not back the (now new) record up again
    s.get().setProjectName('Yeni 2')
    vi.advanceTimersByTime(900)
    expect(s.listProjectBackups()).toHaveLength(1)
  })

  it('the same stored record is never backed up twice (two deep-link visits before the first edit)', async () => {
    vi.useFakeTimers()
    const s = await freshStore({
      search: '?m=benzene',
      storage: { [PROJECT_KEY]: oldProject(1000), [BACKUPS_KEY]: [{ backedUpAt: 5, projectName: 'Eski proje', savedAt: 1000, mol: waterJson('mol-old-project') }] },
    })
    s.get().replaceMolecule(waterJson('mol-lib') as never)
    s.get().setProjectName('Yeni')
    vi.advanceTimersByTime(900)
    expect(s.listProjectBackups()).toHaveLength(1)
  })

  it('backups are a ring of five, newest first', async () => {
    vi.useFakeTimers()
    const old = Array.from({ length: 5 }, (_, i) => ({ backedUpAt: 10 + i, projectName: `Eski ${i}`, savedAt: 100 + i, mol: waterJson(`mol-b${i}`) }))
    const s = await freshStore({ search: '?m=x', storage: { [PROJECT_KEY]: oldProject(2000), [BACKUPS_KEY]: old } })
    s.get().replaceMolecule(waterJson('mol-lib') as never)
    s.get().setProjectName('Yeni')
    vi.advanceTimersByTime(900)
    const list = s.listProjectBackups()
    expect(list).toHaveLength(5)
    expect(list[0].projectName).toBe('Eski proje') // the record that was just set aside
    expect(list[4].projectName).toBe('Eski 3') // the oldest of the previous ring fell off the end
  })

  it('without ?m= nothing is stripped, renamed or backed up', async () => {
    vi.useFakeTimers()
    const s = await freshStore({ search: '', storage: { [PROJECT_KEY]: oldProject() } })
    s.get().replaceMolecule(waterJson('mol-x') as never)
    expect(s.env.replaceState).not.toHaveBeenCalled()
    expect(s.get().projectName).toBe('Eski proje')
    s.get().setProjectName('Başka')
    vi.advanceTimersByTime(900)
    expect(s.listProjectBackups()).toEqual([])
  })

  it('listProjectBackups skips damaged entries and restoreBackup is an undoable load', async () => {
    const good = { backedUpAt: 9, projectName: 'Kurtarılan', savedAt: 7, mol: waterJson('mol-restore') }
    const s = await freshStore({
      storage: { [BACKUPS_KEY]: [{ backedUpAt: 1, projectName: 'bozuk', savedAt: 1, mol: { atoms: 'nope' } }, null, good] },
    })
    expect(s.listProjectBackups()).toHaveLength(1)
    const before = s.get().mol
    s.get().restoreBackup(5) // out of range: nothing happens
    expect(s.get().mol).toBe(before)
    const nonce = s.get().loadNonce
    s.get().restoreBackup(0)
    expect(s.get().projectName).toBe('Kurtarılan')
    expect(s.get().mol.atoms).toHaveLength(3)
    expect(s.get().loadNonce).toBe(nonce + 1)
    s.get().undo()
    expect(s.get().mol).toBe(before)
  })
})

describe('stored project that fails validation', () => {
  it('shows the rejection toast, keeps the record under :rejected and falls back to methane', async () => {
    const bad = waterJson()
    bad.atoms[0].symbol = 'Xx'
    const s = await freshStore({ storage: { [PROJECT_KEY]: projectRecord(bad, 'Bozuk', 1) } })
    expect(s.get().toast?.code).toBe('unsupportedElement')
    expect(s.get().toast?.kind).toBe('error')
    expect(s.get().mol.atoms).toHaveLength(5)
    expect(storedJson(s.env, REJECTED_KEY).projectName).toBe('Bozuk')
  })
})
