import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, Check, CircleAlert, Library, Minus, Plus, Ruler, Trash2, X } from 'lucide-react'
import { useStudio } from '../store'
import { el } from '../chem/elements'
import {
  angleDeg, atomById, bondById, bondLengthSource, conventionalFormula, dihedralDeg, dist, formula, missingHydrogens, molarMass,
  type Molecule, type BondOrder,
} from '../chem/molecule'
import { atomInfo, bondInfo, molProperties, type AtomInfo, type BondInfo, type MolProperties } from '../chem/properties'
import {
  elementCategory, elementName, groupLabel, hybridLabel, translate, useT, type TFn, type TrKey,
} from './i18n'
import { Badge, PrimaryButton, Section, Segmented } from './controls'
import { ElementPicker } from './ElementPicker'
import { Formula } from './Formula'
import { useUI } from './uiStore'
import { AtomPlusIcon } from './icons'
import { idealAngle, signedInt, tabulatedDecimals, useNum, vseprNotation } from './inspector/format'
import { InspectorBoundary } from './inspector/InspectorBoundary'
import { IRow as Row, LockNote, LockableGroup, ProvTag as Prov, useEditLocked } from './inspector/parts'
import { useCoordSource } from './inspector/source'

// ---------- localised molecule title ----------
let englishNames: Map<string, string> | null = null
let englishNamesLoading = false

/** Library molecules carry their Turkish name; resolve the English name lazily (only when the UI is English). */
function useMoleculeTitle(name: string): string {
  const t = useT()
  const lang = useStudio((s) => s.language)
  const [map, setMap] = useState(englishNames)
  useEffect(() => {
    if (lang !== 'en' || englishNames || englishNamesLoading) return
    englishNamesLoading = true
    void import('../chem/library')
      .then((lib) => {
        englishNames = new Map(lib.LIBRARY.map((e) => [e.name, e.nameEn]))
        setMap(englishNames)
      })
      .catch(() => { englishNamesLoading = false })
  }, [lang])
  if (name === translate('tr', 'mol.untitled')) return t('mol.untitled')
  return lang === 'en' ? map?.get(name) ?? name : name
}

const signed = signedInt

// ---------- section open-state memory (per session, per section) ----------
function useOpen(key: string, initial: boolean): [boolean, () => void] {
  const [open, setOpen] = useState(() => {
    try {
      const v = sessionStorage.getItem('ms:sec:' + key)
      return v === null ? initial : v === '1'
    } catch {
      return initial
    }
  })
  return [open, () => setOpen((o) => {
    try { sessionStorage.setItem('ms:sec:' + key, o ? '0' : '1') } catch { /* storage unavailable */ }
    return !o
  })]
}

function Sec({ id, title, initial = true, trailing, children }: { id: string; title: string; initial?: boolean; trailing?: ReactNode; children: ReactNode }) {
  const [open, toggle] = useOpen(id, initial)
  return <Section title={title} open={open} onToggle={toggle} trailing={trailing}>{children}</Section>
}

// ---------- molecule summary ----------
function CompositionBars({ items }: { items: MolProperties['composition'] }) {
  const fix = useNum()
  const lang = useStudio((s) => s.language)
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {items.map((c) => (
        <li key={c.symbol} className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-2 text-ui">
          <span className="flex items-center gap-1.5 font-medium">
            <span aria-hidden="true" className="inline-block size-2 shrink-0 rounded-full" style={{ background: el(c.symbol).color }} />
            {c.symbol}
          </span>
          <span aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-surface-3">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(2, c.percent)}%`, background: el(c.symbol).color }} />
          </span>
          <span className="text-right tabular-nums text-ink-dim">
            {c.count} · {fix(c.percent, 2)}{lang === 'tr' ? ' %' : '%'}
          </span>
        </li>
      ))}
    </ul>
  )
}

function LipinskiRule({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2 py-[3px] text-ui">
      {ok ? <Check size={14} aria-hidden className="shrink-0 text-ok" /> : <AlertTriangle size={14} aria-hidden className="shrink-0 text-warn" />}
      <span className="flex-1 text-ink-dim">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </li>
  )
}

function issueText(t: TFn, fix: (n: number, d: number) => string, d: MolProperties['issueDetails'][number]): string {
  const base = { symbol: d.symbol, id: d.atomId }
  const allowed = d.allowed ?? []
  switch (d.code) {
    case 'valenceOver': return t('issue.over', { ...base, used: d.used ?? 0, allowed: allowed.length ? Math.max(...allowed) : 0 })
    case 'valenceUnder': return t('issue.under', { ...base, used: d.used ?? 0, allowed: allowed.join(' / ') })
    case 'valenceInvalid': return t('issue.invalid', { ...base, used: d.used ?? 0, allowed: allowed.join(' / ') })
    case 'overlap': return t('issue.overlap', { ...base, other: d.otherAtomId ?? '?', d: fix(d.distance ?? 0, 2) })
  }
}

function MoleculeSummary({ mol, layout }: { mol: Molecule; layout: 'panel' | 'sheet' }) {
  const t = useT()
  const fix = useNum()
  const lang = useStudio((s) => s.language)
  const title = useMoleculeTitle(mol.name)
  const openDialog = useUI((s) => s.openDialog)
  const props = useMemo(() => (mol.atoms.length ? molProperties(mol) : null), [mol])
  const conventional = useMemo(() => conventionalFormula(mol, true), [mol])
  const hill = useMemo(() => formula(mol, true), [mol])
  const missingTotal = useMemo(() => mol.atoms.reduce((s, a) => s + missingHydrogens(mol, a), 0), [mol])
  const source = useCoordSource(mol)

  if (!props) {
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <h2 className="m-0 text-title font-medium text-ink">{t('insp.empty.title')}</h2>
        <p className="m-0 text-ui text-ink-dim">{t('mol.empty.body')}</p>
        <p className="m-0 text-label tabular-nums text-ink-dim">{t('st.atoms', { n: 0 })} · {t('st.bonds', { n: 0 })}</p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton variant="solid" icon={<AtomPlusIcon size={16} />} onClick={() => useStudio.getState().setTool('atom')}>{t('mol.empty.add')}</PrimaryButton>
          <PrimaryButton variant="quiet" icon={<Library size={16} aria-hidden />} onClick={() => openDialog('library')}>{t('mol.empty.library')}</PrimaryButton>
        </div>
      </div>
    )
  }

  const bc = props.bondCounts
  const overValent = props.issueDetails.filter((d) => d.code === 'valenceOver')
  const hasHalogenIsotopes = mol.atoms.some((a) => a.symbol === 'Cl' || a.symbol === 'Br')
  const exactHint = hasHalogenIsotopes ? `${t('mol.exactTip')} ${t('mol.exactTipHalo')}` : t('mol.exactTip')
  const rules = [
    { label: t('mol.lipMassM'), ok: props.mass <= 500, value: `${fix(props.mass, 2)} g/mol` },
    { label: t('mol.lip.donors'), ok: props.hDonors <= 5, value: String(props.hDonors) },
    { label: t('mol.lip.acceptors'), ok: props.hAcceptors <= 10, value: String(props.hAcceptors) },
  ]

  return (
    <div>
      <div className="px-4 pb-3 pt-3">
        <h2 className="m-0 truncate text-title font-medium text-ink" title={title}>{title}</h2>
        <div className="mt-2 text-label text-ink-dim">{t('mol.formulaConv')}</div>
        <div className="mt-0.5 break-words text-formula font-medium text-ink" title={t('mol.formulaHillTip', { hill })}>
          <Formula text={conventional} />
        </div>
        {source && (
          <div className="mt-2 flex flex-col gap-0.5 text-label text-ink-dim">
            <span>{source.entry ? (lang === 'en' ? source.entry.coordSourceTextEn : source.entry.coordSourceText) : t('mol.src.pubchemCoords')}</span>
            {source.pubchem && <span>{t('mol.src.pubchem')}</span>}
            {source.edited && <span>{t('mol.src.edited')}</span>}
          </div>
        )}
        {(missingTotal > 0 || overValent.length > 0) && (
          <div role="status" className="mt-3 flex flex-col items-start gap-2 rounded-ctl border border-warn/40 p-2.5 text-ui text-ink">
            {missingTotal > 0 && (
              <>
                <p className="m-0 flex items-start gap-2"><AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-warn" /><span>{t('mol.incompleteNote', { n: missingTotal })}</span></p>
                <PrimaryButton variant="quiet" onClick={() => useStudio.getState().addHydrogens()}>{t('mol.completeH')}</PrimaryButton>
              </>
            )}
            {overValent.map((d) => (
              <p key={d.atomId} className="m-0 flex items-start gap-2 text-danger">
                <CircleAlert size={14} aria-hidden className="mt-0.5 shrink-0" />
                <span>{t('mol.invalidValence', { symbol: d.symbol, used: d.used ?? 0, max: d.allowed?.length ? Math.max(...d.allowed) : 0 })}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <Sec id="mol.general" title={t('mol.section.general')}>
        <dl className="m-0">
          <Row label={t('mol.massM')} hint={t('mol.massTip')}>{fix(props.mass, 2)} g/mol</Row>
          <Row label={t('mol.exactM')} hint={exactHint}>{fix(props.exactMass, 4)} u</Row>
          <Row label={t('mol.atoms')} hint={t('prov.tipCalc')}>{props.atomCount}</Row>
          <Row label={t('mol.heavy')} hint={t('prov.tipCalc')}>{props.heavyAtomCount}</Row>
          <Row label={t('mol.bonds')} hint={t('prov.tipCalc')}>{props.bondCount}</Row>
          <Row label={t('mol.size')} hint={t('prov.tipMeas')}>{fix(props.sizeAng, 3)} Å</Row>
          <Row label={t('mol.netCharge')} hint={t('prov.tipCalc')}>{signed(props.netCharge)}</Row>
          {props.components > 1 && <Row label={t('mol.components')} hint={t('prov.tipCalc')}>{props.components}</Row>}
        </dl>
      </Sec>

      <Sec id="mol.structure" title={t('mol.section.structure')}>
        <dl className="m-0">
          <Row label={t('mol.single')}>{bc.single}</Row>
          {bc.double > 0 && <Row label={t('mol.double')}>{bc.double}</Row>}
          {bc.triple > 0 && <Row label={t('mol.triple')}>{bc.triple}</Row>}
          {bc.aromatic > 0 && <Row label={t('mol.aromatic')}>{bc.aromatic}</Row>}
          <Row label={t('mol.rings')} hint={t('prov.tipCalc')}>{props.rings}</Row>
          <Row label={<>{t('mol.aromaticRings')}<Prov kind="est" /></>}>{props.aromaticRings}</Row>
          {props.unsaturation !== null && props.unsaturation !== undefined && <Row label={t('mol.unsatM')} hint={t('mol.helpUnsatM')}>{props.unsaturation}</Row>}
          <Row label={t('mol.rotatable')} hint={t('mol.helpRotatableM')}>{props.rotatableBonds}</Row>
        </dl>
      </Sec>

      <Sec id="mol.hbond" title={t('mol.section.hbond')}>
        <dl className="m-0">
          <Row label={<>{t('mol.donors')}<Prov kind="est" /></>} hint={t('mol.hbondNote')}>{props.hDonors}</Row>
          <Row label={<>{t('mol.acceptors')}<Prov kind="est" /></>} hint={t('mol.hbondNote')}>{props.hAcceptors}</Row>
        </dl>
        <p className="mb-0 mt-2 text-label text-ink-dim">{t('mol.hbondNote')}</p>
      </Sec>

      <Sec id="mol.composition" title={t('mol.sectionCompositionM')}>
        <CompositionBars items={props.composition} />
      </Sec>

      <Sec id="mol.groups" title={t('mol.section.groups')} trailing={<Prov kind="est" />}>
        {props.functionalGroups.length === 0 ? (
          <p className="m-0 text-ui text-ink-dim">{t('mol.noGroups')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {props.functionalGroups.map((g, i) => (
              <li key={props.functionalGroupIds[i] ?? g}>
                <Badge tone="neutral">{groupLabel(props.functionalGroupIds[i] ?? '', g, lang)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Sec>

      <Sec id="mol.lipinski" title={t('mol.section.lipinski')} initial={false}>
        <p className="m-0 mb-1.5 text-label text-ink-dim">{t('mol.lipQualifier')}</p>
        <ul className="m-0 list-none p-0">
          {rules.map((r) => <LipinskiRule key={r.label} {...r} />)}
        </ul>
      </Sec>

      <Sec id="mol.issues" title={t('mol.section.issues')} trailing={props.issueDetails.length > 0 ? <Badge tone="danger" icon={<CircleAlert size={12} aria-hidden />}>{props.issueDetails.length}</Badge> : undefined}>
        {props.issueDetails.length === 0 ? (
          <p className="m-0 flex items-center gap-1.5 text-ui text-ink-dim"><Check size={14} aria-hidden className="text-ok" />{t('mol.noIssues')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {props.issueDetails.map((d, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => useStudio.getState().setSelection([d.atomId])}
                  className="flex min-h-(--hit) w-full items-start gap-2 rounded-ctl border border-danger/30 px-2 py-1.5 text-left text-ui text-ink hover:bg-surface-2"
                >
                  <AlertTriangle size={14} aria-hidden className="mt-0.5 shrink-0 text-danger" />
                  <span>{issueText(t, fix, d)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sec>
      {layout === 'sheet' && <div className="h-2" />}
    </div>
  )
}

// ---------- atom ----------
function ParsedChip({ token }: { token: string }) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(token)
  const symbol = m?.[1] ?? token
  const id = m ? Number(m[2]) : null
  return (
    <button
      type="button"
      disabled={id === null}
      onClick={() => id !== null && useStudio.getState().setSelection([id])}
      className="inline-flex min-h-(--hit) items-center gap-1.5 rounded-ctl border border-line bg-surface-2 px-2 text-ui hover:border-line-strong hover:bg-surface-3"
    >
      <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: el(symbol).color }} />
      {symbol}
      {id !== null && <span className="text-label text-ink-dim tabular-nums">#{id}</span>}
    </button>
  )
}

function ElementTile({ symbol }: { symbol: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-ctl border border-line-strong bg-surface-2 text-title font-semibold"
      style={{ color: el(symbol).color }}
    >
      {symbol}
    </div>
  )
}

function ChargeStepper({ id, charge }: { id: number; charge: number }) {
  const t = useT()
  const setCharge = useStudio((s) => s.setCharge)
  const locked = useEditLocked()
  const btn = 'inline-flex size-(--hit) items-center justify-center rounded-ctl border border-line text-ink-dim hover:border-line-strong hover:bg-surface-3 hover:text-ink aria-disabled:opacity-40'
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={t('atom.chargeDown')} aria-disabled={charge <= -2 || locked} onClick={() => charge > -2 && !locked && setCharge(id, charge - 1)} className={btn}><Minus size={14} aria-hidden /></button>
      <span className="min-w-8 text-center text-ui tabular-nums" aria-live="polite">{signed(charge)}</span>
      <button type="button" aria-label={t('atom.chargeUp')} aria-disabled={charge >= 2 || locked} onClick={() => charge < 2 && !locked && setCharge(id, charge + 1)} className={btn}><Plus size={14} aria-hidden /></button>
    </div>
  )
}

function ValenceBadge({ info }: { info: AtomInfo }) {
  const t = useT()
  if (info.state === 'ok') return <Badge tone="ok" icon={<Check size={12} aria-hidden />}>{t('atom.valence.ok')}</Badge>
  if (info.state === 'under') return <Badge tone="warn" icon={<AlertTriangle size={12} aria-hidden />}>{t('atom.valence.under')}</Badge>
  return <Badge tone="danger" icon={<CircleAlert size={12} aria-hidden />}>{t('atom.valence.over')}</Badge>
}

function AtomPanel({ info, mol }: { info: AtomInfo; mol: Molecule }) {
  const t = useT()
  const fix = useNum()
  const lang = useStudio((s) => s.language)
  const changeElement = useStudio((s) => s.changeElement)
  const deleteAtoms = useStudio((s) => s.deleteAtoms)
  const locked = useEditLocked()
  const atom = atomById(mol, info.id)
  // Only real missing hydrogens count (A1.3): a 3-bonded S or 4-bonded P is "not computable", not "1 H missing".
  const missingH = atom ? missingHydrogens(mol, atom) : 0
  const sn = info.stericNumber
  // VSEPR block (A4.2): absent for H; "structure incomplete" only when H are really missing; "not computable" otherwise outside SN 2-4.
  const vsepr: 'hidden' | 'missingH' | 'na' | 'ok' =
    info.symbol === 'H' ? 'hidden' : missingH > 0 ? 'missingH' : info.incomplete || sn < 2 || sn > 4 ? 'na' : 'ok'
  // The Turkish name carries an English gloss in parentheses; the Turkish UI shows only the Turkish part.
  const geometry = lang === 'en' ? info.geometryEn : info.geometry.replace(/\s*\([^)]*\)\s*$/, '')
  const showHybrid = vsepr === 'ok' && ['C', 'N', 'O', 'B'].includes(info.symbol) && /^sp[23]?$/.test(info.hybridization)
  // A bond angle only exists at an atom with at least two bonds: terminal atoms (F in CH3F, carbonyl O) get no ideal angle / AXE notation.
  const central = vsepr === 'ok' && info.showVsepr
  const ideal = central ? idealAngle(sn, info.lonePairs) : null
  const measured = useMemo(() => {
    if (!central || !atom) return null
    const pts = info.neighbours
      .map((tok) => /^[A-Za-z]+(\d+)$/.exec(tok))
      .map((m) => (m ? atomById(mol, Number(m[1]))?.pos : undefined))
      .filter((p): p is NonNullable<typeof p> => !!p)
    const angles: number[] = []
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) angles.push(angleDeg(pts[i], atom.pos, pts[j]))
    if (!angles.length) return null
    return { mean: angles.reduce((s, x) => s + x, 0) / angles.length, min: Math.min(...angles), max: Math.max(...angles) }
  }, [central, atom, info.neighbours, mol])
  const naText = vsepr === 'missingH' ? t('calc.incomplete') : t('calc.failed')
  return (
    <div>
      <div className="flex items-center gap-3 px-4 pb-3 pt-3">
        <ElementTile symbol={info.symbol} />
        <div className="min-w-0">
          <h2 className="m-0 truncate text-title font-medium text-ink">{elementName(info.symbol, lang)} <span className="text-ink-dim">({info.symbol})</span></h2>
          <div className="text-label text-ink-dim">#{info.id} · {elementCategory(info.symbol, lang)}</div>
        </div>
      </div>

      <Sec id="atom.element" title={t('atom.section.element')}>
        <dl className="m-0">
          <Row label={t('atom.number')} hint={t('prov.tipMass')}>{info.z}</Row>
          <Row label={t('atom.mass')} hint={t('prov.tipMass')}>{fix(info.mass, tabulatedDecimals(info.mass))} u</Row>
          <Row label={t('atom.en')} hint={t('prov.tipEn')}>{fix(info.en, 2)}</Row>
          <Row label={t('atom.radius')} hint={t('prov.tipRadius')}>{fix(info.covalentRadius, 2)} Å</Row>
        </dl>
        <div className="flex min-h-7 items-baseline justify-between gap-3 py-1" title={t('prov.tipMeas')}>
          <span className="text-label text-ink-dim">{t('atom.position')} (Å)</span>
          <span className="flex gap-3 text-ui tabular-nums text-ink">
            {(['X', 'Y', 'Z'] as const).map((axis, i) => (
              <span key={axis}><span className="mr-1 text-label text-ink-dim">{axis}</span>{fix(info.position[i], 3)}</span>
            ))}
          </span>
        </div>
      </Sec>

      <Sec id="atom.bonding" title={t('atom.section.bonding')}>
        <dl className="m-0">
          <Row label={t('atom.valence')} hint={t('prov.tipCalc')}>
            <span className="inline-flex flex-wrap items-center justify-end gap-2">{info.valenceUsed}/{info.valence}<ValenceBadge info={info} />{missingH > 0 && <Badge tone="warn" icon={<AlertTriangle size={12} aria-hidden />}>{t('atom.missingH', { n: missingH })}</Badge>}</span>
          </Row>
          {vsepr !== 'hidden' && (
            <>
              <div className="mt-1 flex min-h-7 items-center justify-between gap-2 text-label font-medium text-ink-dim">
                <span>{t('atom.vseprGroup')}</span>
                <Prov kind="est" />
              </div>
              {showHybrid && <Row label={t('atom.hybrid')} hint={t('prov.tipHybrid')} mono={false}>{hybridLabel(info.hybridization)}</Row>}
              <Row label={t('atom.geometryShort')} hint={t('prov.tipVsepr')} mono={false}>{vsepr === 'ok' ? geometry : naText}</Row>
              {central && <Row label={t('atom.vsepr')} hint={t('prov.tipVsepr')} mono={false}>{vseprNotation(sn - info.lonePairs, info.lonePairs)}</Row>}
              <Row label={t('atom.steric')} hint={t('prov.tipVsepr')}>{vsepr === 'ok' ? sn : naText}</Row>
              <Row label={t('atom.lonePairs')} hint={t('prov.tipVsepr')}>{vsepr === 'ok' ? info.lonePairs : naText}</Row>
              {ideal && <Row label={t('atom.idealAngle')} hint={t('prov.tipVsepr')}>{ideal.lessThan ? '< ' : ''}{fix(ideal.value, ideal.value === 109.5 ? 1 : 0)}°</Row>}
              {measured && (
                <Row label={t('atom.measAngle')} hint={t('prov.tipMeas')}>
                  {fix(measured.mean, 1)}°
                  {measured.max - measured.min > 0.5 && <span className="text-label text-ink-dim"> ({fix(measured.min, 1)}–{fix(measured.max, 1)}°)</span>}
                </Row>
              )}
            </>
          )}
          <Row label={<>{t('atom.gasteigerM')}<Prov kind="est" /></>} hint={t('prov.tipGasteiger')}>
            {info.partialCharge === null || info.partialCharge === undefined ? t('calc.failed') : fix(info.partialCharge, 2)}
          </Row>
        </dl>
        {info.state === 'over' && <p className="mb-0 mt-1.5 text-label text-danger">{t('atom.overMsg', { symbol: info.symbol, max: info.valence, used: info.valenceUsed })}</p>}
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-label text-ink-dim">{t('atom.formalCharge')}</span>
          <ChargeStepper id={info.id} charge={info.formalCharge} />
        </div>
        <div className="mt-3">
          <div className="mb-1 text-label text-ink-dim">{t('atom.neighbours')}</div>
          {info.neighbours.length === 0 ? (
            <p className="m-0 text-ui text-ink-dim">{t('atom.noNeighbours')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">{info.neighbours.map((n) => <ParsedChip key={n} token={n} />)}</div>
          )}
        </div>
      </Sec>

      <Sec id="atom.change" title={t('atom.section.change')} initial={false}>
        <LockableGroup locked={locked}>
          <ElementPicker value={info.symbol} onPick={(s) => changeElement(info.id, s)} ariaLabel={t('atom.section.change')} columns={7} />
        </LockableGroup>
      </Sec>

      {locked && <LockNote />}
      <div className="border-t border-line p-4">
        <PrimaryButton variant="danger" icon={<Trash2 size={15} aria-hidden />} onClick={() => deleteAtoms([info.id])} disabled={locked} className="w-full">{t('atom.delete')}</PrimaryButton>
      </div>
    </div>
  )
}

function MultiPanel({ mol, ids }: { mol: Molecule; ids: number[] }) {
  const t = useT()
  const lang = useStudio((s) => s.language)
  const locked = useEditLocked()
  const atoms = ids.map((i) => atomById(mol, i)).filter((a): a is NonNullable<typeof a> => !!a)
  return (
    <div>
      <div className="px-4 pb-2 pt-3">
        <h2 className="m-0 text-title font-medium text-ink">{t('atom.selected', { n: atoms.length })}</h2>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 px-4 pb-3">
        {atoms.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => useStudio.getState().setSelection([a.id])}
              title={t('atom.removeFromSel')}
              className="flex min-h-(--hit) w-full items-center gap-2.5 rounded-ctl border border-line bg-surface-2 px-2 text-left text-ui hover:border-line-strong hover:bg-surface-3"
            >
              <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ background: el(a.symbol).color }} />
              <span className="flex-1">{elementName(a.symbol, lang)} ({a.symbol})</span>
              <span className="text-label text-ink-dim tabular-nums">#{a.id}</span>
            </button>
          </li>
        ))}
      </ul>
      {locked && <LockNote />}
      <div className="border-t border-line p-4">
        <PrimaryButton variant="danger" icon={<Trash2 size={15} aria-hidden />} onClick={() => useStudio.getState().deleteAtoms(ids)} disabled={locked} className="w-full">{t('atom.deleteMany')}</PrimaryButton>
      </div>
    </div>
  )
}

// ---------- bond ----------
function BondPanel({ info, mol }: { info: BondInfo; mol: Molecule }) {
  const t = useT()
  const fix = useNum()
  const lang = useStudio((s) => s.language)
  const setBondOrderOf = useStudio((s) => s.setBondOrderOf)
  const deleteBond = useStudio((s) => s.deleteBond)
  const locked = useEditLocked()
  const bond = bondById(mol, info.id)
  const A = bond ? atomById(mol, bond.a) : undefined
  const B = bond ? atomById(mol, bond.b) : undefined
  const polarity = t(`bond.polClass.${info.polarity}` as TrKey)
  const rowSource = A && B ? bondLengthSource(A.symbol, B.symbol, info.order, info.aromatic) : null
  const refSource = rowSource === null
    ? t('bond.refSrc.fallback')
    : rowSource.startsWith('typical') ? t('bond.refSrc.typical') : rowSource
  const tone = info.polarity === 'ionic' ? 'warn' : info.polarity === 'polar' ? 'accent' : 'neutral'
  return (
    <div>
      <div className="px-4 pb-3 pt-3">
        <h2 className="m-0 text-title font-medium text-ink">{info.label.replace(/-/g, '–')}</h2>
        <div className="text-label text-ink-dim">
          {lang === 'en' ? info.orderNameEn : info.orderName}
          {info.aromatic && <Prov kind="est" />}
        </div>
      </div>
      <Sec id="bond.main" title={t('bond.type')}>
        <dl className="m-0">
          <Row label={t('bond.atoms')} mono={false}>
            <span className="inline-flex gap-1.5">
              {[A, B].map((a) => a && (
                <button key={a.id} type="button" onClick={() => useStudio.getState().setSelection([a.id])} className="inline-flex items-center gap-1 rounded-ctl border border-line px-1.5 text-ui hover:bg-surface-3">
                  <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: el(a.symbol).color }} />{a.symbol}<span className="text-label text-ink-dim">#{a.id}</span>
                </button>
              ))}
            </span>
          </Row>
          <Row label={t('bond.lengthM')} hint={t('prov.tipMeas')}>{fix(info.length, 3)} Å</Row>
          <Row label={t('bond.refLength')} hint={`${t('bond.refTip')} ${t('bond.refSrc.label')}: ${refSource}`} sub={refSource}>{fix(info.idealLength, 3)} Å</Row>
          <Row label={t('bond.deltaEN')} hint={t('prov.tipEn')}>{fix(info.deltaEN, 2)}</Row>
          <Row label={t('bond.polarity')} hint={t('bond.polTip')} mono={false}>
            <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
              <Badge tone={tone}>{polarity}</Badge>
              <Prov kind="est" />
            </span>
          </Row>
          <Row label={t('bond.sigma')} hint={t('prov.tipCalc')}>{info.sigma}</Row>
          <Row label={t('bond.pi')} hint={t('prov.tipCalc')}>{Number.isInteger(info.pi) ? info.pi : fix(info.pi, 1)}</Row>
          <Row label={t('bond.ring')} mono={false}>{info.inRing ? t('bond.yes') : t('bond.no')}</Row>
          <Row label={<>{t('bond.aromatic')}<Prov kind="est" /></>} mono={false}>{info.aromatic ? t('bond.yes') : t('bond.no')}</Row>
        </dl>
      </Sec>
      <div className="border-t border-line p-4">
        <div className="mb-1.5 text-label text-ink-dim">{t('bond.order')}</div>
        <LockableGroup locked={locked}>
          <Segmented<number>
            ariaLabel={t('bond.order')}
            fill
            value={info.aromatic ? 0 : info.order}
            onChange={(o) => setBondOrderOf(info.id, o as BondOrder)}
            options={[1, 2, 3].map((o) => ({ value: o, label: t(`opt.order.${o}` as TrKey) }))}
          />
        </LockableGroup>
      </div>
      {locked && <LockNote />}
      <div className="border-t border-line p-4">
        <PrimaryButton variant="danger" icon={<Trash2 size={15} aria-hidden />} onClick={() => deleteBond(info.id)} disabled={locked} className="w-full">{t('bond.delete')}</PrimaryButton>
      </div>
    </div>
  )
}

// ---------- measure ----------
function MeasurePanel({ mol }: { mol: Molecule }) {
  const t = useT()
  const fix = useNum()
  const ids = useStudio((s) => s.measure)
  const clear = useStudio((s) => s.clearMeasure)
  const atoms = ids.map((i) => atomById(mol, i)).filter((a): a is NonNullable<typeof a> => !!a)
  // Progressive chain (B.6): 2 atoms distance, 3 angle (vertex = 2nd atom), 4 dihedral; values come only from model coordinates.
  const readouts: { key: string; label: string; text: string; note?: string }[] = []
  if (atoms.length >= 2) readouts.push({ key: 'd', label: t('meas.distance'), text: `${fix(dist(atoms[0].pos, atoms[1].pos), 3)} Å` })
  if (atoms.length >= 3) readouts.push({ key: 'a', label: t('meas.angle'), text: `${fix(angleDeg(atoms[0].pos, atoms[1].pos, atoms[2].pos), 1)}°`, note: t('meas.angleAt', { symbol: `${atoms[1].symbol} #${atoms[1].id}` }) })
  if (atoms.length >= 4) readouts.push({ key: 'phi', label: t('meas.dihedralM'), text: `φ = ${fix(dihedralDeg(atoms[0].pos, atoms[1].pos, atoms[2].pos, atoms[3].pos), 1)}°` })
  return (
    <div className="p-4">
      <h2 className="m-0 flex items-center gap-2 text-title font-medium text-ink"><Ruler size={16} aria-hidden className="text-accent" />{t('meas.title')}</h2>
      <p className="mb-3 mt-2 text-ui text-ink-dim">{t('meas.hint')}</p>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-label text-ink-dim">
        <span>{t('meas.atoms')}</span>
        <span className="tabular-nums" role="status">{t('meas.progress', { n: atoms.length })}</span>
      </div>
      {atoms.length === 0 ? (
        <p className="m-0 text-ui text-ink-dim">{t('meas.none')}</p>
      ) : (
        <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {atoms.map((a, i) => (
            <li key={a.id} className="inline-flex items-center gap-1.5 rounded-ctl border border-line bg-surface-2 px-2 py-1 text-ui">
              <span className="text-label text-ink-dim">{i + 1}</span>
              <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: el(a.symbol).color }} />
              {a.symbol}<span className="text-label text-ink-dim tabular-nums">#{a.id}</span>
            </li>
          ))}
        </ol>
      )}
      {readouts.length > 0 && (
        <div className="mt-3 flex flex-col gap-2 rounded-ctl border border-line-strong bg-surface-2 p-3" role="status">
          {readouts.map((r) => (
            <div key={r.key}>
              <div className="text-label text-ink-dim">{r.label}</div>
              <div className="text-formula font-medium tabular-nums text-ink">{r.text}</div>
              {r.note && <div className="text-label text-ink-dim">{r.note}</div>}
            </div>
          ))}
        </div>
      )}
      <p className="mb-0 mt-2 text-label text-ink-dim">{t('meas.footnote')}</p>
      <PrimaryButton variant="quiet" icon={<X size={15} aria-hidden />} onClick={clear} disabled={ids.length === 0} className="mt-3 w-full">{t('meas.clear')}</PrimaryButton>
    </div>
  )
}

// ---------- body ----------
function InspectorBodyInner({ sheet }: { sheet?: boolean }) {
  const liveMol = useStudio((s) => s.mol)
  const mol = useDeferredValue(liveMol)
  const tool = useStudio((s) => s.tool)
  const selection = useStudio((s) => s.selection)
  const selectedBond = useStudio((s) => s.selectedBond)
  const reduced = useStudio((s) => s.reducedMotion)

  const atomSel = selection.length === 1 ? selection[0] : null
  const aInfo = useMemo(() => (atomSel !== null ? atomInfo(mol, atomSel) : null), [mol, atomSel])
  const bInfo = useMemo(() => (selectedBond !== null ? bondInfo(mol, selectedBond) : null), [mol, selectedBond])

  let key = 'mol'
  let content: ReactNode
  if (tool === 'measure') { key = 'measure'; content = <MeasurePanel mol={mol} /> }
  else if (bInfo) { key = `bond:${bInfo.id}`; content = <BondPanel info={bInfo} mol={mol} /> }
  else if (aInfo) { key = `atom:${aInfo.id}`; content = <AtomPanel info={aInfo} mol={mol} /> }
  else if (selection.length > 1) { key = 'multi'; content = <MultiPanel mol={mol} ids={selection} /> }
  else content = <MoleculeSummary mol={mol} layout={sheet ? 'sheet' : 'panel'} />

  return (
    <motion.div
      key={key}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.12, ease: [0.2, 0, 0, 1] }}
    >
      {content}
    </motion.div>
  )
}

/** Contextual inspector content: bond > atom(s) > molecule, with the measure tool taking over while active. Crash-contained (B.9). */
export function InspectorBody({ sheet }: { sheet?: boolean }) {
  const mol = useStudio((s) => s.mol)
  return (
    <InspectorBoundary resetKey={mol}>
      <InspectorBodyInner sheet={sheet} />
    </InspectorBoundary>
  )
}

function InspectorSummaryLineInner() {
  const t = useT()
  const fix = useNum()
  const mol = useStudio((s) => s.mol)
  const selection = useStudio((s) => s.selection)
  const selectedBond = useStudio((s) => s.selectedBond)
  const lang = useStudio((s) => s.language)
  const atoms = mol.atoms.length
  const pretty = useMemo(() => (atoms ? conventionalFormula(mol, true) : ''), [mol, atoms])
  const mass = useMemo(() => (atoms ? molarMass(mol) : 0), [mol, atoms])
  const sel = selection.length === 1 ? atomById(mol, selection[0]) : undefined
  const bond = selectedBond !== null ? bondById(mol, selectedBond) : undefined
  const massText = pretty ? (
    <>
      <span aria-hidden="true">·</span>
      <span className="text-ink"><Formula text={pretty} /></span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{fix(mass, 2)} g/mol</span>
    </>
  ) : null
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 pb-1 text-ui text-ink-dim" aria-live="polite">
      {sel ? (
        <span className="text-ink">{elementName(sel.symbol, lang)} #{sel.id}</span>
      ) : bond ? (
        <span className="text-ink">{t('st.selBond', { label: `${atomById(mol, bond.a)?.symbol ?? ''}–${atomById(mol, bond.b)?.symbol ?? ''}` })}</span>
      ) : pretty ? (
        <>
          <span className="text-ink"><Formula text={pretty} /></span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{fix(mass, 2)} g/mol</span>
        </>
      ) : (
        <span>{t('insp.empty.title')}</span>
      )}
      {(sel || bond) && massText}
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{t('st.atoms', { n: atoms })}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{t('st.bonds', { n: mol.bonds.length })}</span>
    </div>
  )
}

/** Short title + subtitle shown in a bottom sheet header ("peek" state). */
export function InspectorSummaryLine() {
  const mol = useStudio((s) => s.mol)
  return (
    <InspectorBoundary resetKey={mol} fallback="none">
      <InspectorSummaryLineInner />
    </InspectorBoundary>
  )
}
