import { vi } from 'vitest'

/**
 * Loads a brand-new copy of the store module against a scripted browser: localStorage backed by a Map (with an optional
 * write-failure switch), and an optional window / document so the ?m= deep-link code path runs for real.
 * The store reads storage, the URL and the stored project at import time, so every scenario needs its own module graph.
 */
export interface Env {
  mem: Map<string, string>
  failWrites: { on: boolean }
  replaceState: ReturnType<typeof vi.fn>
}

export interface FreshOptions {
  /** location.search of the page, e.g. '?m=benzene'. When omitted there is no window at all (plain node, no deep link). */
  search?: string
  /** pre-seeded storage entries (values are JSON-encoded) */
  storage?: Record<string, unknown>
  failWrites?: boolean
}

export const PROJECT_KEY = 'molecular-studio:project:v1'
export const BACKUPS_KEY = `${PROJECT_KEY}:backups`
export const REJECTED_KEY = `${PROJECT_KEY}:rejected`

export async function freshStore(opts: FreshOptions = {}) {
  vi.resetModules()
  const mem = new Map<string, string>()
  for (const [k, v] of Object.entries(opts.storage ?? {})) mem.set(k, JSON.stringify(v))
  const failWrites = { on: opts.failWrites ?? false }
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites.on) throw new Error('QuotaExceededError')
      mem.set(k, v)
    },
  })
  const replaceState = vi.fn()
  if (opts.search !== undefined) {
    const href = `http://localhost/${opts.search}#h`
    const loc = new URL(href)
    vi.stubGlobal('window', {
      location: { search: loc.search, href, pathname: loc.pathname },
      history: { state: null, replaceState },
      addEventListener: () => {},
    })
    vi.stubGlobal('document', { addEventListener: () => {}, documentElement: { lang: '' }, visibilityState: 'visible' })
  } else {
    vi.unstubAllGlobals()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (failWrites.on) throw new Error('QuotaExceededError')
        mem.set(k, v)
      },
    })
  }
  const store = await import('../../src/store')
  const mol = await import('../../src/chem/molecule')
  await Promise.resolve() // the store subscribes to itself in a microtask
  const env: Env = { mem, failWrites, replaceState }
  return { ...store, ...mol, env, get: store.useStudio.getState }
}

/** A stored project record exactly as the autosave writes it. */
export const projectRecord = (mol: unknown, projectName: string, savedAt: number) => ({ v: 1, mol, projectName, savedAt })

/** Water, as a plain serialisable molecule (what a library entry or a stored project looks like). */
export const waterJson = (id = 'mol-water-test') => ({
  id,
  name: 'Su',
  atoms: [
    { id: 1, symbol: 'O', pos: [0, 0, 0], charge: 0 },
    { id: 2, symbol: 'H', pos: [0.76, 0.59, 0], charge: 0 },
    { id: 3, symbol: 'H', pos: [-0.76, 0.59, 0], charge: 0 },
  ],
  bonds: [
    { id: 4, a: 1, b: 2, order: 1 },
    { id: 5, a: 1, b: 3, order: 1 },
  ],
  nextId: 6,
})

export const storedJson = (env: Env, key: string): any => {
  const raw = env.mem.get(key)
  return raw ? JSON.parse(raw) : null
}
