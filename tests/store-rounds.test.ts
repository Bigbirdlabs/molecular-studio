import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROJECT_KEY, freshStore, storedJson, waterJson } from './helpers/freshStore'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

type Fresh = Awaited<ReturnType<typeof freshStore>>
const posOf = (s: Fresh, id: number) => s.get().mol.atoms.find((a) => a.id === id)!.pos

describe('rejected external molecules (round 3)', () => {
  it('loadMolecule with an unknown element keeps the molecule, history and nonces; the error toast is the only effect', async () => {
    const s = await freshStore()
    const before = s.get()
    const bad = waterJson()
    bad.atoms[1].symbol = 'Xx'
    s.get().loadMolecule(bad as never)
    const after = s.get()
    expect(after.mol).toBe(before.mol)
    expect(after.past).toHaveLength(0)
    expect(after.loadNonce).toBe(before.loadNonce)
    expect(after.toast?.kind).toBe('error')
    expect(after.toast?.code).toBe('unsupportedElement')
    expect(after.toast?.params?.symbol).toBe('Xx')
  })
  it('a structurally broken molecule is rejected as invalidMolecule', async () => {
    const s = await freshStore()
    const bad = waterJson()
    bad.bonds[1].b = 99 // dangling bond
    s.get().loadMolecule(bad as never)
    expect(s.get().toast?.code).toBe('invalidMolecule')
    expect(s.get().mol.atoms).toHaveLength(5)
  })
  it('replaceMolecule rejects the same way and does not consume the deep link', async () => {
    const s = await freshStore({ search: '?m=x' })
    const bad = waterJson()
    bad.atoms[0].charge = 7
    s.get().replaceMolecule(bad as never)
    expect(s.get().toast?.code).toBe('invalidMolecule')
    expect(s.env.replaceState).not.toHaveBeenCalled()
    s.get().replaceMolecule(waterJson() as never)
    expect(s.env.replaceState).toHaveBeenCalledTimes(1)
  })
})

describe('drag + commit chronology (round 3)', () => {
  it('a commit while the mouse is still held keeps history chronological: pre-drag, dragged, then the commit', async () => {
    const s = await freshStore()
    const name0 = s.get().mol.name
    const x0 = posOf(s, 2)[0]
    s.get().beginDrag()
    s.get().dragAtom(2, [2, 2, 2])
    s.get().setName('Yeniden adlandı') // commits while the drag is held
    expect(s.get().past).toHaveLength(2)
    s.get().endDrag() // nothing moved since the commit: no third entry
    expect(s.get().past).toHaveLength(2)
    s.get().undo() // back to the dragged state, old name
    expect(s.get().mol.name).toBe(name0)
    expect(posOf(s, 2)).toEqual([2, 2, 2])
    s.get().undo() // back to before the drag
    expect(posOf(s, 2)[0]).toBeCloseTo(x0, 6)
    expect(s.get().past).toHaveLength(0)
  })
  it('a drag that keeps going after the commit starts from the committed molecule', async () => {
    const s = await freshStore()
    const name0 = s.get().mol.name
    s.get().beginDrag()
    s.get().dragAtom(2, [2, 2, 2])
    s.get().setName('Ad')
    s.get().dragAtom(2, [3, 3, 3])
    s.get().endDrag()
    expect(s.get().past).toHaveLength(3)
    s.get().undo()
    expect(s.get().mol.name).toBe('Ad')
    expect(posOf(s, 2)).toEqual([2, 2, 2])
    s.get().undo()
    expect(s.get().mol.name).toBe(name0)
    expect(posOf(s, 2)).toEqual([2, 2, 2])
    s.get().undo()
    expect(posOf(s, 2)[0]).toBeCloseTo(0.629, 2)
  })
  it('undo with the mouse still held reverts only the drag in progress and leaves history alone', async () => {
    const s = await freshStore()
    const home = s.get().mol
    s.get().beginDrag()
    s.get().dragAtom(2, [2, 2, 2])
    s.get().undo()
    expect(s.get().mol).toBe(home)
    expect(s.get().past).toHaveLength(0)
    s.get().endDrag()
    expect(s.get().past).toHaveLength(0)
  })
})

describe('clean-up (relax) lock and cancel (round 3)', () => {
  /** methane with one hydrogen pulled far away: the force field has plenty to do. */
  const distorted = async () => {
    vi.useFakeTimers()
    const s = await freshStore()
    s.get().beginDrag()
    s.get().dragAtom(2, [2.4, 1.6, 0.9])
    s.get().endDrag()
    return s
  }

  it('editing actions are ignored while a clean-up runs', async () => {
    const s = await distorted()
    const base = s.get().mol
    const pastLen = s.get().past.length
    s.get().cleanUp()
    expect(s.get().relaxing).toBe(true)
    s.get().changeElement(2, 'F')
    s.get().deleteAtoms([3])
    s.get().recenter()
    s.get().dragAtom(2, [9, 9, 9])
    s.get().setTool('atom')
    s.get().clickEmpty([1, 1, 1])
    s.get().clickAtom(1)
    expect(s.get().mol).toBe(base)
    expect(s.get().past).toHaveLength(pastLen)
    expect(s.get().relaxing).toBe(true)
  })

  it('undo while tidying cancels it: the starting molecule returns, history is untouched and the late frame is a no-op', async () => {
    const s = await distorted()
    const base = s.get().mol
    const pastLen = s.get().past.length
    s.get().cleanUp()
    vi.advanceTimersByTime(1) // one animation frame: the molecule on screen is now a mid-relax snapshot
    expect(s.get().mol).not.toBe(base)
    s.get().undo()
    expect(s.get().relaxing).toBe(false)
    expect(s.get().mol).toBe(base)
    expect(s.get().past).toHaveLength(pastLen)
    expect(s.get().future).toHaveLength(0)
    vi.advanceTimersByTime(2000) // any frame still scheduled must do nothing
    expect(s.get().mol).toBe(base)
    expect(s.get().toast?.code).not.toBe('geometryOptimized')
  })

  it('loading a molecule during a clean-up puts the pre-relax molecule into history, not a mid-relax frame', async () => {
    const s = await distorted()
    const base = s.get().mol
    s.get().cleanUp()
    vi.advanceTimersByTime(1)
    s.get().loadMolecule(waterJson() as never)
    expect(s.get().relaxing).toBe(false)
    expect(s.get().past[s.get().past.length - 1]).toBe(base)
    s.get().undo()
    expect(s.get().mol).toBe(base)
  })

  it('a flush during a clean-up persists the molecule the clean-up started from', async () => {
    const s = await distorted()
    const base = s.get().mol
    s.get().cleanUp()
    vi.advanceTimersByTime(1)
    s.get().saveNow()
    const stored = storedJson(s.env, PROJECT_KEY)
    expect(stored.mol.atoms.find((a: { id: number }) => a.id === 2).pos).toEqual(base.atoms.find((a) => a.id === 2)!.pos)
  })

  it('a clean-up that completes is one undo step, announces itself and re-frames the camera', async () => {
    const s = await distorted()
    const base = s.get().mol
    const pastLen = s.get().past.length
    const fit = s.get().fitNonce
    s.get().cleanUp()
    for (let i = 0; i < 400 && s.get().relaxing; i++) vi.advanceTimersByTime(1)
    expect(s.get().relaxing).toBe(false)
    expect(s.get().past).toHaveLength(pastLen + 1)
    expect(s.get().past[pastLen]).toBe(base)
    expect(s.get().fitNonce).toBe(fit + 1)
    expect(s.get().toast?.code).toBe('geometryOptimized')
    s.get().undo()
    expect(s.get().mol).toBe(base)
  })

  it('a clean-up that starts while the mouse is held commits the drag first; the late endDrag adds nothing', async () => {
    vi.useFakeTimers()
    const s = await freshStore()
    const mol0 = s.get().mol
    s.get().beginDrag()
    s.get().dragAtom(2, [2.4, 1.6, 0.9])
    const dragged = s.get().mol
    s.get().cleanUp()
    expect(s.get().relaxing).toBe(true)
    expect(s.get().past).toEqual([mol0])
    s.get().endDrag() // ignored while relaxing
    expect(s.get().past).toHaveLength(1)
    s.get().undo() // cancels the clean-up
    expect(s.get().mol).toBe(dragged)
    s.get().undo()
    expect(s.get().mol).toBe(mol0)
  })
})

describe('autosave failure streak (round 3)', () => {
  const edit = (s: Fresh, name: string) => {
    s.get().setProjectName(name)
    vi.advanceTimersByTime(900)
  }

  it('shows one toast per failure streak, keeps the error status, and a success ends the streak', async () => {
    vi.useFakeTimers()
    const s = await freshStore({ failWrites: true })
    edit(s, 'bir')
    expect(s.get().saveStatus).toBe('error')
    expect(s.get().toast?.code).toBe('saveFailed')
    expect(s.get().toast?.kind).toBe('error')
    const firstId = s.get().toast!.id

    // the user dismisses it; the next failing autosave must not nag again
    s.useStudio.setState({ toast: null })
    edit(s, 'iki')
    expect(s.get().saveStatus).toBe('error')
    expect(s.get().toast).toBeNull()
    edit(s, 'üç')
    expect(s.get().toast).toBeNull()

    // storage comes back: saved, and a later failure is a new streak with a fresh toast
    s.env.failWrites.on = false
    edit(s, 'dört')
    expect(s.get().saveStatus).toBe('saved')
    expect(s.get().lastSavedAt).not.toBeNull()
    expect(storedJson(s.env, PROJECT_KEY).projectName).toBe('dört')
    s.env.failWrites.on = true
    edit(s, 'beş')
    expect(s.get().saveStatus).toBe('error')
    expect(s.get().toast?.code).toBe('saveFailed')
    expect(s.get().toast!.id).toBeGreaterThan(firstId)
  })

  it('a failed write never claims it saved: lastSavedAt stays null', async () => {
    vi.useFakeTimers()
    const s = await freshStore({ failWrites: true })
    edit(s, 'x')
    expect(s.get().lastSavedAt).toBeNull()
  })
})
