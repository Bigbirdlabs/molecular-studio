import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react'
import { Loader2, Search } from 'lucide-react'
import { useStudio } from '../store'
import { useT, type TrKey } from './i18n'
import { Modal } from './Modal'
import { PrimaryButton, Segmented, Switch } from './controls'
import { useUI } from './uiStore'
import { searchPubChem } from './actions'
import { MOD, TOOL_KEYS } from './shortcuts'

const LibraryBody = lazy(() => import('./LibraryBody'))

export function LibraryDialog() {
  const t = useT()
  const open = useUI((s) => s.dialog === 'library')
  const close = useUI((s) => s.closeDialog)
  return (
    <Modal open={open} onClose={close} title={t('lib.title')} widthClass="max-w-[640px]" tall>
      {open && (
        <Suspense fallback={<div role="status" className="flex items-center gap-2 p-6 text-ui text-ink-dim"><Loader2 size={16} aria-hidden className="animate-spin" />{t('lib.loading')}</div>}>
          <LibraryBody />
        </Suspense>
      )}
    </Modal>
  )
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="m-0 text-label font-medium text-ink">{title}</h4>
      <p className="m-0 mt-0.5 text-label text-ink-dim">{body}</p>
    </div>
  )
}

export function SettingsDialog() {
  const t = useT()
  const open = useUI((s) => s.dialog === 'settings')
  const close = useUI((s) => s.closeDialog)
  const openDialog = useUI((s) => s.openDialog)
  const language = useStudio((s) => s.language)
  const setLanguage = useStudio((s) => s.setLanguage)
  const override = useStudio((s) => s.reducedMotionOverride)
  const setReducedMotion = useStudio((s) => s.setReducedMotion)
  const autoH = useStudio((s) => s.autoH)
  const toggle = useStudio((s) => s.toggle)
  const motionValue = override === null ? 'system' : override ? 'reduce' : 'full'
  return (
    <Modal open={open} onClose={close} title={t('set.title')}>
      <div className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-ink-dim">{t('set.language')}</span>
          <Segmented<'tr' | 'en'>
            ariaLabel={t('set.language')}
            value={language}
            onChange={setLanguage}
            options={[{ value: 'tr', label: t('set.language.tr') }, { value: 'en', label: t('set.language.en') }]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-ink-dim">{t('set.motion')}</span>
          <Segmented<'system' | 'reduce' | 'full'>
            ariaLabel={t('set.motion')}
            value={motionValue}
            onChange={(v) => setReducedMotion(v === 'system' ? null : v === 'reduce')}
            options={[
              { value: 'system', label: t('set.motion.system') },
              { value: 'reduce', label: t('set.motion.reduce') },
              { value: 'full', label: t('set.motion.full') },
            ]}
          />
          <p className="m-0 text-label text-ink-dim">{t('set.motion.help')}</p>
        </div>
        <Switch checked={autoH} onChange={() => toggle('autoH')} label={t('set.autoH')} description={t('set.autoH.help')} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-ui text-ink">{t('set.shortcuts')}</span>
          <PrimaryButton variant="quiet" onClick={() => openDialog('shortcuts')}>{t('set.shortcuts.open')}</PrimaryButton>
        </div>
        <section className="flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="m-0 text-ui font-medium text-ink">{t('set.about')}</h3>
          <p className="m-0 text-label text-ink-dim">{t('set.about.intro')}</p>
          <Note title={t('set.about.computed')} body={t('set.about.computed.body')} />
          <Note title={t('set.about.approx')} body={t('set.about.approx.body')} />
          <Note title={t('set.about.none')} body={t('set.about.none.body')} />
        </section>
      </div>
    </Modal>
  )
}

function Kbd({ children }: { children: string }) {
  return <kbd className="rounded-[4px] border border-line-strong bg-surface-2 px-1.5 py-px font-mono text-label text-ink-dim">{children}</kbd>
}

export function ShortcutsDialog() {
  const t = useT()
  const open = useUI((s) => s.dialog === 'shortcuts')
  const close = useUI((s) => s.closeDialog)
  const groups: { title: string; rows: { label: string; keys: string[] }[] }[] = [
    {
      title: t('sc.tools'),
      rows: [
        { label: t('sc.select'), keys: [TOOL_KEYS.select] },
        { label: t('sc.rotate'), keys: [TOOL_KEYS.rotate] },
        { label: t('sc.pan'), keys: [TOOL_KEYS.pan] },
        { label: t('sc.zoom'), keys: [TOOL_KEYS.zoom] },
        { label: t('sc.atom'), keys: [TOOL_KEYS.atom] },
        { label: t('sc.bond'), keys: [TOOL_KEYS.bond] },
        { label: t('sc.erase'), keys: [TOOL_KEYS.erase, 'E'] },
        { label: t('sc.measure'), keys: [TOOL_KEYS.measure] },
        { label: t('sc.element'), keys: ['H', 'C', 'N', 'O', 'Cl'] },
      ],
    },
    {
      title: t('sc.edit'),
      rows: [
        { label: t('sc.undo'), keys: [`${MOD}+Z`] },
        { label: t('sc.redo'), keys: [`${MOD}+Shift+Z`, `${MOD}+Y`] },
        { label: t('sc.delete'), keys: ['Del'] },
        { label: t('sc.selectAll'), keys: [`${MOD}+A`] },
        { label: t('sc.save'), keys: [`${MOD}+S`] },
        { label: t('sc.esc'), keys: ['Esc'] },
      ],
    },
    { title: t('sc.view'), rows: [{ label: t('sc.fit'), keys: ['F'] }] },
  ]
  return (
    <Modal open={open} onClose={close} title={t('sc.title')}>
      <div className="flex flex-col gap-4 p-4">
        {groups.map((g) => (
          <section key={g.title}>
            <h3 className="m-0 mb-1 text-label font-medium text-ink-dim">{g.title}</h3>
            <dl className="m-0">
              {g.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-4 border-b border-line py-1.5 last:border-b-0">
                  <dt className="text-ui text-ink">{r.label}</dt>
                  <dd className="m-0 flex flex-wrap justify-end gap-1">{r.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <p className="m-0 text-label text-ink-dim">{t('sc.note.atomMode')}</p>
      </div>
    </Modal>
  )
}

export function PubChemDialog() {
  const t = useT()
  const open = useUI((s) => s.dialog === 'pubchem')
  const close = useUI((s) => s.closeDialog)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TrKey | null>(null)
  const token = useRef(0)

  // A closed dialog abandons any in-flight request (its result is ignored).
  useEffect(() => {
    if (!open) { token.current++; setBusy(false); setError(null) }
  }, [open])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    const mine = ++token.current
    setBusy(true)
    setError(null)
    const res = await searchPubChem(query)
    if (mine !== token.current) return
    setBusy(false)
    if (res.ok) {
      useStudio.getState().loadMolecule(res.mol)
      useStudio.getState().notify(t('toast.pubchemOk', { name: res.mol.name }), 'success')
      setQuery('')
      close()
    } else setError(res.error)
  }

  return (
    <Modal open={open} onClose={close} title={t('pc.title')}>
      <form onSubmit={submit} className="flex flex-col gap-3 p-4">
        <p className="m-0 text-ui text-ink-dim">{t('pc.help')}</p>
        <label className="relative block">
          <span className="sr-only">{t('pc.title')}</span>
          <Search size={15} aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            data-autofocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setError(null) }}
            placeholder={t('pc.placeholder')}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            className="h-(--hit) w-full rounded-ctl border border-line bg-surface-0 pl-8 pr-3 text-ui text-ink placeholder:text-ink-faint hover:border-line-strong focus:border-accent-dim"
          />
        </label>
        {error && <p role="alert" className="m-0 text-ui text-danger">{t(error)}</p>}
        <div className="flex justify-end">
          <PrimaryButton type="submit" busy={busy} icon={busy ? <Loader2 size={15} aria-hidden className="animate-spin" /> : <Search size={15} aria-hidden />}>
            {busy ? t('pc.searching') : t('pc.search')}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
