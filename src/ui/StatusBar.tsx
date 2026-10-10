import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useStudio } from '../store'
import { atomById, bondById } from '../chem/molecule'
import { fmtNum, useT, type TrKey } from './i18n'
import type { Layout } from './layout'

const SETTLE_MS = 1300 // camera status updates during a reset/fit animation do not count as a custom view

function useCameraState(): 'reset' | 'custom' {
  const resetNonce = useStudio((s) => s.cameraResetNonce)
  const fitNonce = useStudio((s) => s.fitNonce)
  const distance = useStudio((s) => s.cameraStatus.distance)
  const mode = useStudio((s) => s.cameraStatus.mode)
  const [state, setState] = useState<'reset' | 'custom'>('reset')
  const stamp = useRef(typeof performance !== 'undefined' ? performance.now() : 0)

  useEffect(() => {
    stamp.current = performance.now()
    setState('reset')
  }, [resetNonce, fitNonce])

  useEffect(() => {
    if (performance.now() - stamp.current > SETTLE_MS) setState('custom')
  }, [distance, mode])
  return state
}

function Sep() {
  return <span aria-hidden="true" className="text-line-strong">·</span>
}

/** Subtle bottom status bar. Every value is read from the store; nothing is hardcoded. */
export function StatusBar({ layout }: { layout: Layout }) {
  const t = useT()
  const style = useStudio((s) => s.style)
  const atoms = useStudio((s) => s.mol.atoms.length)
  const bonds = useStudio((s) => s.mol.bonds.length)
  const tool = useStudio((s) => s.tool)
  const element = useStudio((s) => s.element)
  const pending = useStudio((s) => s.pendingBondFrom)
  const relaxing = useStudio((s) => s.relaxing)
  const lang = useStudio((s) => s.language)
  const selection = useStudio((s) => s.selection)
  const selectedBond = useStudio((s) => s.selectedBond)
  const mol = useStudio((s) => s.mol)
  const cam = useStudio((s) => s.cameraStatus)
  const camState = useCameraState()

  let selText = t('st.noSelection')
  if (selection.length === 1) {
    const a = atomById(mol, selection[0])
    if (a) selText = t('st.selAtom', { symbol: a.symbol, id: a.id })
  } else if (selection.length > 1) selText = t('st.selAtoms', { n: selection.length })
  else if (selectedBond !== null) {
    const b = bondById(mol, selectedBond)
    const a1 = b && atomById(mol, b.a)
    const a2 = b && atomById(mol, b.b)
    if (b && a1 && a2) selText = t('st.selBond', { label: `${a1.symbol}${['-', '=', '≡'][b.order - 1] ?? '-'}${a2.symbol}` })
  }

  const hint = relaxing
    ? t('st.relaxing')
    : tool === 'bond' && pending !== null
      ? t('tool.hint.bondPending')
      : t(`tool.hint.${tool}` as TrKey, { symbol: element })
  const camText = `${t(`st.cam.${cam.mode}` as TrKey)}${cam.distance > 0 ? ` · ${t('st.cam.distance', { d: fmtNum(lang, cam.distance, 2) })}` : ''} · ${camState === 'reset' ? t('st.cam.reset') : t('st.cam.custom')}`

  if (layout === 'mobile') {
    return (
      <footer className="flex h-7 shrink-0 items-center gap-2 overflow-hidden border-t border-line bg-surface-1 px-3 text-label text-ink-faint">
        <span className="shrink-0 text-ink-dim">{t(`tool.${tool}` as TrKey)}</span>
        <Sep />
        <span className="shrink-0 tabular-nums">{t('st.atoms', { n: atoms })}</span>
        <Sep />
        <span className="shrink-0 tabular-nums">{t('st.bonds', { n: bonds })}</span>
        <Sep />
        <span className="min-w-0 truncate">{selText}</span>
      </footer>
    )
  }
  return (
    <footer className="flex h-[26px] shrink-0 items-center gap-3 border-t border-line bg-surface-1 px-3 text-label text-ink-faint">
      <span className="shrink-0 text-ink-dim">{t(`style.${style}` as TrKey)}</span>
      <Sep />
      <span className="shrink-0 tabular-nums">{t('st.atoms', { n: atoms })}</span>
      <Sep />
      <span className="shrink-0 tabular-nums">{t('st.bonds', { n: bonds })}</span>
      <Sep />
      <span className="min-w-0 truncate">{selText}</span>
      <span className="min-w-4 flex-1" />
      <span className="flex min-w-0 items-center gap-1.5 truncate">
        {relaxing && <Loader2 size={12} aria-hidden className="shrink-0 animate-spin" />}
        <span className="truncate">{t(`tool.${tool}` as TrKey)}: {hint}</span>
      </span>
      {layout === 'desktop' && (
        <>
          <Sep />
          <span className="shrink-0 tabular-nums">{t('st.camera')}: {camText}</span>
        </>
      )}
    </footer>
  )
}
