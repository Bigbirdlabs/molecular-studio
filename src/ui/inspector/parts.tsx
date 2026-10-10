import type { ReactNode } from 'react'
import { useStudio } from '../../store'
import { useT, type TrKey } from '../i18n'

/**
 * Provenance tag at 12 px (the inspector never sets lowercase text below 12 px, D.3) with the same
 * Calculated / Measured / Estimated vocabulary as the shared Prov pill.
 */
export function ProvTag({ kind }: { kind: 'calc' | 'meas' | 'est' }) {
  const t = useT()
  return (
    <span className="ml-1.5 inline-block rounded-[4px] border border-line px-1 text-label font-normal text-ink-dim">
      {t(`prov.${kind}` as TrKey)}
    </span>
  )
}

/** Inspector value row at about 28 px (D.4). `sub` is a secondary caption under the value (e.g. a table-row source). */
export function IRow({ label, children, hint, mono = true, sub }: { label: ReactNode; children: ReactNode; hint?: string; mono?: boolean; sub?: ReactNode }) {
  return (
    <div className="flex min-h-7 items-baseline justify-between gap-3 py-1" title={hint}>
      <dt className="min-w-0 text-label text-ink-dim">{label}</dt>
      <dd className={`m-0 min-w-0 text-right text-ui text-ink ${mono ? 'whitespace-nowrap tabular-nums' : ''}`}>
        {children}
        {sub && <span className="block whitespace-normal text-label text-ink-dim">{sub}</span>}
      </dd>
    </div>
  )
}

/** True while the geometry clean-up runs: every editing action in the store is a silent no-op then. */
export const useEditLocked = (): boolean => useStudio((s) => s.relaxing)

/** States why the editing controls are unavailable (D.6.2: a disabled control always names its reason). */
export function LockNote() {
  const t = useT()
  return (
    <p role="status" className="m-0 border-t border-line px-4 py-2 text-label text-warn">
      {t('act.reason.relaxing')}
    </p>
  )
}

/** Disables every native control inside (buttons of the element picker, segmented control ...) with a reduced-opacity look. */
export function LockableGroup({ locked, children }: { locked: boolean; children: ReactNode }) {
  return (
    <fieldset disabled={locked} aria-disabled={locked || undefined} className="m-0 min-w-0 border-0 p-0 disabled:opacity-50">
      {children}
    </fieldset>
  )
}
