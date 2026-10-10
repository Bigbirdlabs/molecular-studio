import { describe, expect, it } from 'vitest'
import { dictionaries, translate, groupLabel, type TrKey } from '../src/ui/i18n'

const tr = dictionaries.tr
const en = dictionaries.en
const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)(?::[^|}]*\|[^}]*)?\}/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort()

describe('i18n dictionaries', () => {
  it('tr and en have identical key sets', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(tr).sort())
  })

  it('no empty strings', () => {
    for (const lang of [tr, en]) for (const [k, v] of Object.entries(lang)) expect(v.trim().length, k).toBeGreaterThan(0)
  })

  it('placeholders match between languages', () => {
    for (const k of Object.keys(tr) as TrKey[]) expect(placeholders(en[k]), k).toEqual(placeholders(tr[k]))
  })

  it('translate interpolates and pluralises', () => {
    expect(translate('en', 'st.atoms', { n: 1 })).toBe('1 atom')
    expect(translate('en', 'st.atoms', { n: 5 })).toBe('5 atoms')
    expect(translate('tr', 'st.atoms', { n: 5 })).toBe('5 atom')
    expect(translate('tr', 'toast.noFreeValence', { symbol: 'C' })).toContain('C')
  })

  it('functional-group ids resolve in both languages', () => {
    expect(groupLabel('alcohol', 'x', 'tr')).toBe('Alkol')
    expect(groupLabel('alcohol', 'x', 'en')).toBe('Alcohol')
    expect(groupLabel('unknownGroup', 'fallback', 'en')).toBe('fallback')
  })

  it('every literal t("...") key used in the UI source exists', () => {
    const sources = import.meta.glob(['../src/ui/**/*.{ts,tsx}', '../src/App.tsx'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    expect(Object.keys(sources).length).toBeGreaterThan(10)
    const call = new RegExp('\\bt\\(\\s*\'([A-Za-z0-9_.]+)\'', 'g')
    const missing: string[] = []
    for (const [file, src] of Object.entries(sources)) {
      for (const m of src.matchAll(call)) if (!(m[1] in tr)) missing.push(`${file}: ${m[1]}`)
    }
    expect(missing).toEqual([])
  })

  it('has no dipole-moment wording (no fabricated quantities)', () => {
    const all = JSON.stringify([tr, en]).toLowerCase()
    expect(all).not.toMatch(/dipol|dipole/)
  })
})
