import { create } from 'zustand'
import {
  type Atom, type BondOrder, type Molecule, type Vec3,
  add, atomById, bondBetween, bondById, centroid, cloneMolecule, emptyMolecule, methane, neighbours, scale, sub, norm,
  missingHydrogens, valenceState, reserveMoleculeId,
} from './chem/molecule'
import { adjustHydrogens, idealizeAround, bondTargetLength, addAllHydrogens, removeAllHydrogens, placeNewAtom, relaxStep, centerMolecule } from './chem/geometry'
import { el } from './chem/elements'

/**
 * 'select'  – click to select atoms/bonds; dragging an atom moves it (beginDrag / dragAtom / endDrag).
 * 'rotate' | 'pan' | 'zoom' – camera tools: left-drag orbits / pans / zooms; clicks never edit or select.
 * 'atom' | 'bond' | 'erase' | 'measure' – editing tools.
 */
export type Tool = 'select' | 'rotate' | 'pan' | 'zoom' | 'atom' | 'bond' | 'erase' | 'measure'
export type RenderStyle = 'ballstick' | 'spacefill' | 'stick' | 'wireframe'
export type ToastKind = 'info' | 'success' | 'warn' | 'error'
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'
export type Language = 'tr' | 'en'
export type CameraMode = 'orbit' | 'pan' | 'zoom'
export interface CameraStatus { distance: number; mode: CameraMode }

/**
 * Store-originated notifications carry a stable `code` (+ `params`) so the UI can translate them via i18n.
 * `text` is always a Turkish fallback, to be shown only when the UI has no translation for the code.
 *   hydrogenSingleBond – hydrogen can only form one bond
 *   noFreeValence      – params.symbol: the atom has no free valence
 *   valenceExceeded    – params.symbol: valence exceeded
 *   geometryOptimized  – clean-up (relaxation) finished
 *   saveFailed         – autosave to localStorage failed
 */
export type ToastCode = 'hydrogenSingleBond' | 'noFreeValence' | 'valenceExceeded' | 'geometryOptimized' | 'saveFailed'
export interface Toast {
  id: number
  text: string
  kind: ToastKind
  code: ToastCode | null
  params?: Record<string, string | number>
}

export interface StudioState {
  mol: Molecule
  past: Molecule[]
  future: Molecule[]
  tool: Tool
  element: string
  bondOrder: BondOrder
  style: RenderStyle
  selection: number[] // selected atom ids
  selectedBond: number | null
  hovered: number | null
  hoveredBond: number | null
  pendingBondFrom: number | null // bond tool: first atom picked
  measure: number[] // measure tool: up to 4 atom ids (distance / angle / dihedral)
  autoH: boolean // keep hydrogens in sync with valence automatically
  showLabels: boolean
  showCharges: boolean
  autoRotate: boolean
  showHydrogens: boolean // render toggle only: hides hydrogens (and their bonds) in the scene; data is untouched
  relaxing: boolean
  fitNonce: number // incremented when the camera should re-frame the molecule (load / clean-up / recenter)
  loadNonce: number // incremented when a whole new molecule is loaded (entrance animation)
  toast: Toast | null

  // camera control – the scene implements these; UI only calls the actions below
  cameraResetNonce: number // scene: return to the default view of the current molecule
  zoomNonce: number // scene: apply zoomFactor once per change
  zoomFactor: number // > 1 zooms in (distance /= factor), < 1 zooms out
  cameraStatus: CameraStatus // reported by the scene (throttled) – shown in the status bar

  // project / autosave
  projectName: string
  saveStatus: SaveStatus
  lastSavedAt: number | null // epoch ms of the last successful write; null = nothing has been written yet

  // settings
  language: Language
  reducedMotion: boolean // effective value (system preference unless overridden)
  reducedMotionOverride: boolean | null // null = follow the system preference
  inspectorOpen: boolean // tablet/mobile: inspector drawer / bottom sheet visibility (desktop ignores it)

  setTool: (t: Tool) => void
  setElement: (s: string) => void
  setBondOrder: (o: BondOrder) => void
  setStyle: (s: RenderStyle) => void
  toggle: (key: 'autoH' | 'showLabels' | 'showCharges' | 'autoRotate' | 'showHydrogens') => void
  setHovered: (id: number | null) => void
  setHoveredBond: (id: number | null) => void
  notify: (text: string, kind?: ToastKind, code?: ToastCode | null, params?: Record<string, string | number>) => void

  resetCamera: () => void
  zoomBy: (factor: number) => void
  setCameraStatus: (s: CameraStatus) => void

  setProjectName: (name: string) => void
  saveNow: () => void
  setLanguage: (l: Language) => void
  setReducedMotion: (v: boolean | null) => void // null = follow the system preference again
  setInspectorOpen: (open: boolean) => void
  setSelection: (ids: number[]) => void
  selectAll: () => void

  clickAtom: (id: number, additive?: boolean) => void
  clickBond: (id: number) => void
  clickEmpty: (point: Vec3) => void
  beginDrag: () => void
  dragAtom: (id: number, pos: Vec3) => void
  endDrag: () => void

  loadMolecule: (m: Molecule) => void // undoable (library pick, import, new)
  replaceMolecule: (m: Molecule) => void // NOT undoable, clears history (App startup, ?m=<id>)
  newMolecule: () => void
  setName: (name: string) => void
  changeElement: (id: number, symbol: string) => void
  setCharge: (id: number, charge: number) => void
  setBondOrderOf: (bondId: number, order: BondOrder) => void
  deleteAtoms: (ids: number[]) => void
  deleteBond: (id: number) => void
  deleteSelection: () => void
  addHydrogens: () => void
  removeHydrogens: () => void
  cleanUp: () => void // animated geometry optimisation
  recenter: () => void
  clearMeasure: () => void
  undo: () => void
  redo: () => void
}

export const DEFAULT_PROJECT_NAME = 'Adsız proje'

// ---------- persistence (all access guarded: private mode / blocked storage / node tests) ----------
const PROJECT_KEY = 'molecular-studio:project:v1'
const SETTINGS_KEY = 'molecular-studio:settings:v1'
const SAVE_DEBOUNCE_MS = 800
const CAMERA_STATUS_INTERVAL_MS = 150

function readJSON(key: string): unknown {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

const isVec3 = (v: unknown): v is Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number' && Number.isFinite(x))

/** Defensive structural validation of a molecule read back from storage. */
function parseStoredMolecule(raw: unknown): Molecule | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Partial<Molecule>
  if (!Array.isArray(m.atoms) || !Array.isArray(m.bonds) || typeof m.nextId !== 'number' || typeof m.name !== 'string') return null
  const ids = new Set<number>()
  for (const a of m.atoms) {
    if (!a || typeof a.id !== 'number' || typeof a.symbol !== 'string' || !isVec3(a.pos) || typeof a.charge !== 'number') return null
    if (el(a.symbol).symbol !== a.symbol) return null // unknown element
    ids.add(a.id)
  }
  for (const b of m.bonds) {
    if (!b || typeof b.id !== 'number' || !ids.has(b.a) || !ids.has(b.b) || ![1, 2, 3].includes(b.order)) return null
  }
  return cloneMolecule(m as Molecule) // cloneMolecule assigns an id if the stored record had none
}

interface StoredSettings { language?: unknown; reducedMotionOverride?: unknown; showHydrogens?: unknown }
const storedSettings = (): StoredSettings => {
  const raw = readJSON(SETTINGS_KEY)
  return raw && typeof raw === 'object' ? (raw as StoredSettings) : {}
}

const hasWindow = typeof window !== 'undefined'

/** Did the user ask for a specific molecule via ?m=<library id>? Then the stored project must not override it. */
const urlSpecifiesMolecule = (() => {
  try {
    return hasWindow && new URLSearchParams(window.location.search).has('m')
  } catch {
    return false
  }
})()

const reducedMotionQuery = (): MediaQueryList | null => {
  try {
    return hasWindow && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
  } catch {
    return null
  }
}

function restoreProject(): { mol: Molecule; projectName: string; savedAt: number | null } | null {
  if (urlSpecifiesMolecule) return null
  const raw = readJSON(PROJECT_KEY) as { mol?: unknown; projectName?: unknown; savedAt?: unknown } | null
  if (!raw || typeof raw !== 'object') return null
  const mol = parseStoredMolecule(raw.mol)
  if (!mol || mol.atoms.length === 0) return null // never restore a blank canvas over the launch molecule
  reserveMoleculeId(mol.id)
  return {
    mol,
    projectName: typeof raw.projectName === 'string' && raw.projectName.trim() ? raw.projectName : DEFAULT_PROJECT_NAME,
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : null,
  }
}

const HISTORY_LIMIT = 100
let toastId = 0
let relaxToken = 0
let dragBase: Molecule | null = null // molecule at drag start; a history entry is created only if something moved
let dragMoved = false

/** Replace one hydrogen on `parentId` (if any) and return its position, removing it from `m`. */
function takeHydrogen(m: Molecule, parentId: number): Vec3 | null {
  const h = neighbours(m, parentId).find((n) => n.atom.symbol === 'H' && neighbours(m, n.atom.id).length === 1)
  if (!h) return null
  const pos = h.atom.pos
  m.atoms = m.atoms.filter((a) => a.id !== h.atom.id)
  m.bonds = m.bonds.filter((b) => b.id !== h.bond.id)
  return pos
}

function freeValence(m: Molecule, a: Atom) {
  return missingHydrogens(m, a)
}

export const useStudio = create<StudioState>((set, get) => {
  const restored = restoreProject()
  const settings = storedSettings()
  const language: Language = settings.language === 'en' ? 'en' : 'tr'
  const reducedMotionOverride = typeof settings.reducedMotionOverride === 'boolean' ? settings.reducedMotionOverride : null
  const mq = reducedMotionQuery()

  const persistSettings = () => {
    const s = get()
    writeJSON(SETTINGS_KEY, { language: s.language, reducedMotionOverride: s.reducedMotionOverride, showHydrogens: s.showHydrogens })
  }

  /** Push the current molecule onto the undo stack and install `next`. */
  const commit = (next: Molecule, extra: Partial<StudioState> = {}) => {
    const { mol, past } = get()
    set({ mol: next, past: [...past, mol].slice(-HISTORY_LIMIT), future: [], ...extra })
  }
  const fixH = (m: Molecule, ids: number[]) => (get().autoH ? adjustHydrogens(m, ids) : m)
  const prune = (m: Molecule, s: Partial<StudioState> = {}) => {
    const ids = new Set(m.atoms.map((a) => a.id))
    const st = get()
    return {
      selection: st.selection.filter((i) => ids.has(i)),
      measure: st.measure.filter((i) => ids.has(i)),
      pendingBondFrom: st.pendingBondFrom !== null && ids.has(st.pendingBondFrom) ? st.pendingBondFrom : null,
      selectedBond: st.selectedBond !== null && bondById(m, st.selectedBond) ? st.selectedBond : null,
      hovered: st.hovered !== null && ids.has(st.hovered) ? st.hovered : null,
      hoveredBond: null,
      ...s,
    }
  }
  const warnValence = (m: Molecule, ids: number[]) => {
    for (const x of ids) {
      const at = atomById(m, x)
      if (at && valenceState(m, at) === 'over')
        get().notify(`${el(at.symbol).name}: değerlik aşıldı`, 'warn', 'valenceExceeded', { symbol: at.symbol })
    }
  }

  /** Add a new atom of `symbol` bonded to `parentId` with `order`. */
  const growFrom = (parentId: number, symbol: string, order: BondOrder) => {
    const m = cloneMolecule(get().mol)
    const parent = atomById(m, parentId)
    if (!parent) return
    // Prefer to take the place of an existing hydrogen so geometry stays clean.
    let pos = parent.symbol !== 'H' ? takeHydrogen(m, parentId) : null
    if (pos) {
      const dir = norm(sub(pos, parent.pos))
      pos = add(parent.pos, scale(dir, bondTargetLength(parent.symbol, symbol, order)))
    } else {
      if (parent.symbol === 'H' && neighbours(m, parentId).length > 0) {
        get().notify('Hidrojen yalnızca bir bağ yapabilir.', 'warn', 'hydrogenSingleBond')
        return
      }
      pos = placeNewAtom(m, parentId, symbol, order)
    }
    const id = m.nextId++
    m.atoms.push({ id, symbol, pos, charge: 0 })
    m.bonds.push({ id: m.nextId++, a: parentId, b: id, order })
    const fixed = idealizeAround(fixH(m, [parentId, id]), [parentId, id])
    warnValence(fixed, [parentId])
    commit(fixed, { selection: [id], selectedBond: null })
  }

  // ---------- autosave: debounced, status reflects what really happened ----------
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let suppressSave = false
  const writeProject = () => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
    set({ saveStatus: 'saving' })
    const { mol, projectName } = get()
    const savedAt = Date.now()
    const ok = writeJSON(PROJECT_KEY, { v: 1, mol, projectName, savedAt })
    if (ok) set({ saveStatus: 'saved', lastSavedAt: savedAt })
    else {
      const wasError = get().saveStatus === 'error'
      set({ saveStatus: 'error' })
      if (!wasError) get().notify('Otomatik kayıt başarısız oldu (tarayıcı depolaması kullanılamıyor).', 'error', 'saveFailed')
    }
  }
  const scheduleSave = () => {
    if (get().saveStatus !== 'unsaved') set({ saveStatus: 'unsaved' })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(writeProject, SAVE_DEBOUNCE_MS)
  }
  queueMicrotask(() => {
    // subscribe after the store exists; ignore the initial state
    useStudio.subscribe((s, prev) => {
      if (suppressSave) { suppressSave = false; return } // pristine open (replaceMolecule): nothing to save yet
      if (s.mol !== prev.mol || s.projectName !== prev.projectName) scheduleSave()
    })
    if (hasWindow) {
      const flush = () => { if (saveTimer) writeProject() }
      window.addEventListener('pagehide', flush)
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
    }
    if (mq) {
      const query = mq
      query.addEventListener('change', () => {
        if (get().reducedMotionOverride === null) set({ reducedMotion: query.matches })
      })
    }
  })

  // ---------- camera status throttle (leading + trailing) ----------
  let camTimer: ReturnType<typeof setTimeout> | null = null
  let camLast = 0
  let camPending: CameraStatus | null = null

  if (typeof document !== 'undefined') document.documentElement.lang = language

  return {
    mol: restored?.mol ?? methane(),
    past: [],
    future: [],
    tool: 'select',
    element: 'C',
    bondOrder: 1,
    style: 'ballstick',
    selection: [],
    selectedBond: null,
    hovered: null,
    hoveredBond: null,
    pendingBondFrom: null,
    measure: [],
    autoH: true,
    showLabels: false,
    showCharges: false,
    autoRotate: false,
    showHydrogens: typeof settings.showHydrogens === 'boolean' ? settings.showHydrogens : true,
    relaxing: false,
    fitNonce: 0,
    loadNonce: 0,
    toast: null,

    cameraResetNonce: 0,
    zoomNonce: 0,
    zoomFactor: 1,
    cameraStatus: { distance: 0, mode: 'orbit' },

    projectName: restored?.projectName ?? DEFAULT_PROJECT_NAME,
    saveStatus: 'saved',
    lastSavedAt: restored?.savedAt ?? null,

    language,
    reducedMotion: reducedMotionOverride ?? mq?.matches ?? false,
    reducedMotionOverride,
    inspectorOpen: false,

    setTool: (tool) => set({ tool, pendingBondFrom: null, measure: tool === 'measure' ? get().measure : [] }),
    setElement: (element) => set({ element, tool: 'atom' }),
    setBondOrder: (bondOrder) => set({ bondOrder }),
    setStyle: (style) => set({ style }),
    toggle: (key) => {
      set({ [key]: !get()[key] } as Partial<StudioState>)
      if (key === 'showHydrogens') persistSettings()
    },
    setHovered: (hovered) => { if (get().hovered !== hovered) set({ hovered }) },
    setHoveredBond: (hoveredBond) => { if (get().hoveredBond !== hoveredBond) set({ hoveredBond }) },
    notify: (text, kind = 'info', code = null, params) => set({ toast: { id: ++toastId, text, kind, code, params } }),

    resetCamera: () => set({ cameraResetNonce: get().cameraResetNonce + 1 }),
    zoomBy: (factor) => {
      if (!Number.isFinite(factor) || factor <= 0) return
      set({ zoomFactor: factor, zoomNonce: get().zoomNonce + 1 })
    },
    setCameraStatus: (next) => {
      const cur = get().cameraStatus
      const distance = Math.round(next.distance * 100) / 100
      if (cur.mode === next.mode && Math.abs(cur.distance - distance) < 0.01) { camPending = null; return }
      const status: CameraStatus = { distance, mode: next.mode }
      const wait = CAMERA_STATUS_INTERVAL_MS - (performance.now() - camLast)
      if (wait <= 0) {
        camLast = performance.now()
        camPending = null
        set({ cameraStatus: status })
        return
      }
      camPending = status
      if (!camTimer) {
        camTimer = setTimeout(() => {
          camTimer = null
          if (camPending) { camLast = performance.now(); set({ cameraStatus: camPending }); camPending = null }
        }, wait)
      }
    },

    setProjectName: (name) => set({ projectName: name.trim() || DEFAULT_PROJECT_NAME }),
    saveNow: () => writeProject(),
    setLanguage: (language) => {
      set({ language })
      if (typeof document !== 'undefined') document.documentElement.lang = language
      persistSettings()
    },
    setReducedMotion: (v) => {
      set({ reducedMotionOverride: v, reducedMotion: v ?? mq?.matches ?? false })
      persistSettings()
    },
    setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
    setSelection: (ids) => {
      const valid = new Set(get().mol.atoms.map((a) => a.id))
      set({ selection: ids.filter((i) => valid.has(i)), selectedBond: null })
    },
    selectAll: () => set({ selection: get().mol.atoms.map((a) => a.id), selectedBond: null }),

    clickAtom: (id, additive = false) => {
      const st = get()
      const atom = atomById(st.mol, id)
      if (!atom) return
      switch (st.tool) {
        case 'select':
          set({
            selection: additive ? (st.selection.includes(id) ? st.selection.filter((i) => i !== id) : [...st.selection, id]) : [id],
            selectedBond: null,
          })
          return
        case 'rotate':
        case 'pan':
        case 'zoom':
          return // camera tools never edit or select
        case 'atom':
          if (atom.symbol === 'H' && st.element !== 'H') {
            st.changeElement(id, st.element) // replace hydrogen with the chosen element
          } else if (freeValence(st.mol, atom) === 0 && !neighbours(st.mol, id).some((n) => n.atom.symbol === 'H')) {
            get().notify(`${el(atom.symbol).name} atomunun boş değerliği yok.`, 'warn', 'noFreeValence', { symbol: atom.symbol })
          } else {
            growFrom(id, st.element, st.bondOrder)
          }
          return
        case 'bond': {
          if (st.pendingBondFrom === null || st.pendingBondFrom === id) {
            set({ pendingBondFrom: st.pendingBondFrom === id ? null : id, selection: st.pendingBondFrom === id ? [] : [id] })
            return
          }
          const a = st.pendingBondFrom
          const m = cloneMolecule(st.mol)
          const existing = bondBetween(m, a, id)
          if (existing) existing.order = st.bondOrder
          else m.bonds.push({ id: m.nextId++, a, b: id, order: st.bondOrder })
          const fixed = fixH(m, [a, id])
          warnValence(fixed, [a, id])
          commit(fixed, { pendingBondFrom: null, selection: [] })
          return
        }
        case 'erase':
          st.deleteAtoms([id])
          return
        case 'measure': {
          const cur = st.measure.includes(id) || st.measure.length >= 4 ? [] : st.measure
          set({ measure: [...cur, id] })
          return
        }
      }
    },

    clickBond: (id) => {
      const st = get()
      const b = bondById(st.mol, id)
      if (!b) return
      if (st.tool === 'rotate' || st.tool === 'pan' || st.tool === 'zoom' || st.tool === 'measure') return
      if (st.tool === 'erase') return st.deleteBond(id)
      if (st.tool === 'bond' || st.tool === 'atom') {
        const next = (b.order === 3 ? 1 : b.order + 1) as BondOrder
        return st.setBondOrderOf(id, st.tool === 'bond' && b.order !== st.bondOrder ? st.bondOrder : next)
      }
      set({ selectedBond: id, selection: [] })
    },

    clickEmpty: (point) => {
      const st = get()
      if (st.tool === 'atom') {
        const m = cloneMolecule(st.mol)
        const id = m.nextId++
        m.atoms.push({ id, symbol: st.element, pos: m.atoms.length ? point : [0, 0, 0], charge: 0 })
        commit(fixH(m, [id]), { selection: [id], selectedBond: null })
        if (st.mol.atoms.length === 0) set({ fitNonce: get().fitNonce + 1 })
        return
      }
      if (st.tool === 'rotate' || st.tool === 'pan' || st.tool === 'zoom') return // a camera drag must not clear the selection
      set({ selection: [], selectedBond: null, pendingBondFrom: null, measure: st.tool === 'measure' ? [] : st.measure })
    },

    beginDrag: () => {
      dragBase = get().mol
      dragMoved = false
    },
    dragAtom: (id, pos) => {
      const m = cloneMolecule(get().mol)
      const a = atomById(m, id)
      if (!a) return
      const delta = sub(pos, a.pos)
      a.pos = pos
      // terminal hydrogens follow their heavy atom
      if (a.symbol !== 'H')
        for (const n of neighbours(m, id))
          if (n.atom.symbol === 'H' && neighbours(m, n.atom.id).length === 1) n.atom.pos = add(n.atom.pos, delta)
      dragMoved = true
      set({ mol: m })
    },
    endDrag: () => {
      // one undo step per completed drag, and none for a click without movement
      if (dragBase && dragMoved) set({ past: [...get().past, dragBase].slice(-HISTORY_LIMIT), future: [] })
      dragBase = null
      dragMoved = false
    },

    loadMolecule: (m) => {
      relaxToken++
      const next = centerMolecule(cloneMolecule(m))
      reserveMoleculeId(next.id)
      commit(next, {
        selection: [], selectedBond: null, measure: [], pendingBondFrom: null, hovered: null, hoveredBond: null,
        relaxing: false, fitNonce: get().fitNonce + 1, loadNonce: get().loadNonce + 1,
      })
    },
    replaceMolecule: (m) => {
      relaxToken++
      const next = centerMolecule(cloneMolecule(m))
      reserveMoleculeId(next.id)
      suppressSave = true
      set({
        mol: next, past: [], future: [],
        selection: [], selectedBond: null, measure: [], pendingBondFrom: null, hovered: null, hoveredBond: null,
        relaxing: false, fitNonce: get().fitNonce + 1, loadNonce: get().loadNonce + 1,
      })
    },
    newMolecule: () => get().loadMolecule(emptyMolecule()),
    setName: (name) => commit({ ...cloneMolecule(get().mol), name }),

    changeElement: (id, symbol) => {
      const m = cloneMolecule(get().mol)
      const a = atomById(m, id)
      if (!a || a.symbol === symbol) return
      a.symbol = symbol
      a.charge = 0
      // re-seat at the ideal distance from a single neighbour
      const nb = neighbours(m, id)
      if (nb.length === 1) {
        const p = nb[0].atom
        a.pos = add(p.pos, scale(norm(sub(a.pos, p.pos)), bondTargetLength(p.symbol, symbol, nb[0].bond.order)))
      }
      const ids = [id, ...nb.map((n) => n.atom.id)]
      commit(idealizeAround(fixH(m, ids), ids), prune(m))
    },

    setCharge: (id, charge) => {
      const m = cloneMolecule(get().mol)
      const a = atomById(m, id)
      if (!a) return
      a.charge = Math.max(-3, Math.min(3, Math.round(charge)))
      const fixed = fixH(m, [id])
      commit(fixed, prune(fixed))
    },

    setBondOrderOf: (bondId, order) => {
      const m = cloneMolecule(get().mol)
      const b = bondById(m, bondId)
      if (!b) return
      b.order = order
      b.aromatic = false
      const fixed = idealizeAround(fixH(m, [b.a, b.b]), [b.a, b.b])
      warnValence(fixed, [b.a, b.b])
      commit(fixed, prune(fixed, { selectedBond: bondId }))
    },

    deleteAtoms: (ids) => {
      const m = cloneMolecule(get().mol)
      const kill = new Set(ids)
      // take terminal hydrogens of deleted heavy atoms with them
      for (const id of ids) {
        const a = atomById(m, id)
        if (a && a.symbol !== 'H')
          for (const n of neighbours(m, id)) if (n.atom.symbol === 'H' && neighbours(m, n.atom.id).length === 1) kill.add(n.atom.id)
      }
      const touched = new Set<number>()
      for (const id of kill) for (const n of neighbours(m, id)) if (!kill.has(n.atom.id)) touched.add(n.atom.id)
      m.atoms = m.atoms.filter((a) => !kill.has(a.id))
      m.bonds = m.bonds.filter((b) => !kill.has(b.a) && !kill.has(b.b))
      const fixed = fixH(m, [...touched])
      commit(fixed, prune(fixed))
    },

    deleteBond: (id) => {
      const m = cloneMolecule(get().mol)
      const b = bondById(m, id)
      if (!b) return
      m.bonds = m.bonds.filter((x) => x.id !== id)
      const fixed = fixH(m, [b.a, b.b])
      commit(fixed, prune(fixed, { selectedBond: null }))
    },

    deleteSelection: () => {
      const st = get()
      if (st.selection.length) st.deleteAtoms(st.selection)
      else if (st.selectedBond !== null) st.deleteBond(st.selectedBond)
    },

    addHydrogens: () => {
      const next = addAllHydrogens(cloneMolecule(get().mol))
      commit(next, prune(next))
    },
    removeHydrogens: () => {
      const next = removeAllHydrogens(cloneMolecule(get().mol))
      commit(next, prune(next, { autoH: false }))
    },

    cleanUp: () => {
      const st = get()
      if (st.relaxing || st.mol.atoms.length < 2) return
      const token = ++relaxToken
      if (st.reducedMotion) {
        let cur = st.mol
        for (let f = 0; f < 240; f++) {
          const r = relaxStep(cur, 6)
          cur = r.mol
          if (!(r.maxForce > 0.01 && Number.isFinite(r.energy))) break
        }
        commit(centerMolecule(cur), { fitNonce: st.fitNonce + 1 })
        get().notify('Geometri düzenlendi (basit kuvvet alanı, yaklaşık)', 'success', 'geometryOptimized')
        return
      }
      commit(cloneMolecule(st.mol), { relaxing: true })
      let frame = 0
      const tick = () => {
        if (token !== relaxToken) return
        const { mol, energy, maxForce } = relaxStep(get().mol, 6)
        frame++
        set({ mol })
        if (frame < 240 && maxForce > 0.01 && Number.isFinite(energy)) requestAnimationFrame(tick)
        else {
          set({ relaxing: false, mol: centerMolecule(get().mol), fitNonce: get().fitNonce + 1 })
          get().notify('Geometri düzenlendi (basit kuvvet alanı, yaklaşık)', 'success', 'geometryOptimized')
        }
      }
      requestAnimationFrame(tick)
    },

    recenter: () => set({ mol: centerMolecule(cloneMolecule(get().mol)), fitNonce: get().fitNonce + 1 }),
    clearMeasure: () => set({ measure: [] }),

    undo: () => {
      const { past, mol, future } = get()
      if (!past.length) return
      relaxToken++
      const prev = past[past.length - 1]
      set({ mol: prev, past: past.slice(0, -1), future: [mol, ...future], relaxing: false, ...prune(prev) })
    },
    redo: () => {
      const { past, mol, future } = get()
      if (!future.length) return
      const next = future[0]
      set({ mol: next, past: [...past, mol], future: future.slice(1), ...prune(next) })
    },
  }
})

/** Camera-independent centre of the current molecule (for UI that needs it). */
export const moleculeCenter = () => centroid(useStudio.getState().mol)
