import { useDeferredValue, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { LIBRARY, CATEGORY_EN, type LibraryEntry } from '../chem/library'
import { formula } from '../chem/molecule'
import { useStudio } from '../store'
import { useT } from './i18n'
import { Formula } from './Formula'
import { useUI } from './uiStore'

/** Case-, diacritic- and Turkish-dotless-i-insensitive text for searching. */
const fold = (s: string): string => s.toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/\p{M}/gu, '')

interface Indexed { entry: LibraryEntry; pretty: string; haystack: string }

const INDEX: Indexed[] = LIBRARY.map((entry) => {
  const pretty = formula(entry.molecule, true)
  const plain = formula(entry.molecule, false)
  return {
    entry,
    pretty,
    haystack: fold([entry.id, entry.name, entry.nameEn, entry.category, CATEGORY_EN[entry.category] ?? '', plain, entry.description, entry.descriptionEn].join(' ')),
  }
})

const CATEGORIES: string[] = Array.from(new Set(LIBRARY.map((e) => e.category)))

/** Library content: search + category filter + a dense list (default export so it can be lazy-loaded with the data). */
export default function LibraryBody() {
  const t = useT()
  const lang = useStudio((s) => s.language)
  const closeDialog = useUI((s) => s.closeDialog)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const deferred = useDeferredValue(query)

  const rows = useMemo(() => {
    const q = fold(deferred.trim())
    return INDEX.filter((r) => (category === null || r.entry.category === category) && (q === '' || r.haystack.includes(q)))
  }, [deferred, category])

  const catLabel = (c: string) => (lang === 'en' ? CATEGORY_EN[c] ?? c : c)
  const open = (e: LibraryEntry) => {
    useStudio.getState().loadMolecule(e.molecule)
    closeDialog()
  }

  const chip = (active: boolean) =>
    `inline-flex min-h-(--hit) shrink-0 items-center rounded-ctl border px-2.5 text-ui transition-colors duration-150 ease-ui ${
      active ? 'border-accent-dim bg-accent/10 text-ink' : 'border-line text-ink-dim hover:border-line-strong hover:text-ink'
    }`

  return (
    <div>
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-line bg-surface-1 px-4 pb-3 pt-3">
        <label className="relative block">
          <span className="sr-only">{t('lib.search')}</span>
          <Search size={15} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            data-autofocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('lib.search')}
            autoComplete="off"
            spellCheck={false}
            className="h-(--hit) w-full rounded-ctl border border-line bg-surface-0 pl-8 pr-3 text-ui text-ink placeholder:text-ink-faint hover:border-line-strong focus:border-accent-dim"
          />
        </label>
        <div role="group" aria-label={t('lib.categories')} className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={chip(category === null)}>{t('lib.all')}</button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>{catLabel(c)}</button>
          ))}
        </div>
        <div className="text-label text-ink-faint" aria-live="polite">{t('lib.count', { n: rows.length })}</div>
      </div>

      {rows.length === 0 ? (
        <p className="m-0 p-6 text-center text-ui text-ink-dim">{t('lib.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {rows.map(({ entry, pretty }) => (
            <li key={entry.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => open(entry)}
                className="flex min-h-14 w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors duration-100 hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <span className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-ui font-medium text-ink">{lang === 'en' ? entry.nameEn : entry.name}</span>
                  <span className="shrink-0 text-ui text-ink"><Formula text={pretty} /></span>
                </span>
                <span className="line-clamp-2 text-label text-ink-dim">{lang === 'en' ? entry.descriptionEn : entry.description}</span>
                <span className="flex gap-2 text-label text-ink-faint">
                  <span>{catLabel(entry.category)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{t('lib.atoms', { n: entry.molecule.atoms.length })}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
