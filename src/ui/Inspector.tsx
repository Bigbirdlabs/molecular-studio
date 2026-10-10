import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { AlertTriangle, Check, CircleAlert, Library, Minus, Plus, Ruler, Trash2, X } from 'lucide-react'
import { useStudio } from '../store'
import { el } from '../chem/elements'
import { angleDeg, atomById, bondById, dihedralDeg, dist, formula, type Molecule, type BondOrder } from '../chem/molecule'
import { atomInfo, bondInfo, molProperties, type AtomInfo, type BondInfo, type MolProperties } from '../chem/properties'
import {
  elementCategory, elementName, groupLabel, hybridLabel, useFmt, useT, type TFn, type TrKey,
} from './i18n'
import { Badge, PrimaryButton, Prov, Row, Section, Segmented } from './controls'
import { ElementPicker } from './ElementPicker'
import { Formula } from './Formula'
import { useUI } from './uiStore'
import { AtomPlusIcon } from './icons'

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
  if (name === 'Yeni molekül') return t('mol.untitled')
  return lang === 'en' ? map?.get(name) ?? name : name
}

const MINUS = '−'
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${MINUS}${Math.abs(n)}` : '0')

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
  const fix = useFmt()
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
            {c.count} · {fix(c.percent, 1)}%
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
  const fix = useFmt()
  const lang = useStudio((s) => s.language)
  const title = useMoleculeTitle(mol.name)
  const openDialog = useUI((s) => s.openDialog)
  const props = useMemo(() => (mol.atoms.length ? molProperties(mol) : null), [mol])
  const pretty = useMemo(() => formula(mol, true), [mol])

  if (!props) {
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <h2 className="m-0 text-title font-medium text-ink">{t('mol.empty.title')}</h2>
        <p className="m-0 text-ui text-ink-dim">{t('mol.empty.body')}</p>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton variant="solid" icon={<AtomPlusIcon size={16} />} onClick={() => useStudio.getState().setTool('atom')}>{t('mol.empty.add')}</PrimaryButton>
          <PrimaryButton variant="quiet" icon={<Library size={16} aria-hidden />} onClick={() => openDialog('library')}>{t('mol.empty.library')}</PrimaryButton>
        </div>
      </div>
    )
  }

  const bc = props.bondCounts
  const lip = props.lipinski
  const rules = [
    { label: t('mol.lip.mass'), ok: props.mass <= 500, value: `${fix(props.mass, 1)} g/mol` },
    { label: t('mol.lip.donors'), ok: props.hDonors <= 5, value: String(props.hDonors) },
    { label: t('mol.lip.acceptors'), ok: props.hAcceptors <= 10, value: String(props.hAcceptors) },
  ]

  return (
    <div>
      <div className="px-4 pb-3 pt-3">
        <h2 className="m-0 truncate text-title font-medium text-ink" title={title}>{title}</h2>
        <div className="mt-2 text-label text-ink-dim">{t('mol.formula')}</div>
        <div className="mt-0.5 break-words text-formula font-medium text-ink"><Formula text={pretty} /></div>
      </div>

      <Sec id="mol.general" title={t('mol.section.general')}>
        <dl className="m-0">
          <Row label={t('mol.mass')}>{fix(props.mass, 3)} g/mol</Row>
          <Row label={t('mol.exact')}>{fix(props.exactMass, 4)} u</Row>
          <Row label={t('mol.atoms')}>{props.atomCount}</Row>
          <Row label={t('mol.heavy')}>{props.heavyAtomCount}</Row>
          <Row label={t('mol.bonds')}>{props.bondCount}</Row>
          <Row label={t('mol.size')}>{fix(props.sizeAng, 2)} Å</Row>
          {props.netCharge !== 0 && <Row label={t('mol.charge')}>{signed(props.netCharge)}</Row>}
          {props.components > 1 && <Row label={t('mol.components')}>{props.components}</Row>}
        </dl>
      </Sec>

      <Sec id="mol.structure" title={t('mol.section.structure')}>
        <dl className="m-0">
          <Row label={t('mol.single')}>{bc.single}</Row>
          {bc.double > 0 && <Row label={t('mol.double')}>{bc.double}</Row>}
          {bc.triple > 0 && <Row label={t('mol.triple')}>{bc.triple}</Row>}
          {bc.aromatic > 0 && <Row label={t('mol.aromatic')}>{bc.aromatic}</Row>}
          <Row label={t('mol.rings')}>{props.rings}</Row>
          <Row label={<>{t('mol.aromaticRings')}<Prov kind="est" /></>}>{props.aromaticRings}</Row>
          {props.unsaturation !== null && props.unsaturation !== undefined && <Row label={t('mol.unsat')} hint={t('mol.help.unsat')}>{props.unsaturation}</Row>}
          <Row label={t('mol.rotatable')} hint={t('mol.help.rotatable')}>{props.rotatableBonds}</Row>
        </dl>
      </Sec>

      <Sec id="mol.hbond" title={t('mol.section.hbond')}>
        <dl className="m-0">
          <Row label={<>{t('mol.donors')}<Prov kind="est" /></>} hint={t('mol.hbondNote')}>{props.hDonors}</Row>
          <Row label={<>{t('mol.acceptors')}<Prov kind="est" /></>} hint={t('mol.hbondNote')}>{props.hAcceptors}</Row>
        </dl>
        <p className="mb-0 mt-2 text-label text-ink-faint">{t('mol.hbondNote')}</p>
      </Sec>

      <Sec id="mol.composition" title={t('mol.section.composition')}>
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

      <Sec
        id="mol.lipinski"
        title={t('mol.section.lipinski')}
        initial={false}
        trailing={<span className={`text-label ${lip.passes ? 'text-ok' : 'text-warn'}`}>{lip.passes ? t('mol.lip.pass') : t('mol.lip.fail', { n: lip.violations })}</span>}
      >
        <ul className="m-0 list-none p-0">
          {rules.map((r) => <LipinskiRule key={r.label} {...r} />)}
        </ul>
        <p className="mb-0 mt-2 text-label text-ink-faint">{t('mol.lip.note')}</p>
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
      {id !== null && <span className="text-label text-ink-faint tabular-nums">#{id}</span>}
    </button>
  )
}

function ElementTile({ symbol }: { symbol: string }) {
  return (
    <div
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-ctl border border-line-strong bg-surface-2 text-[18px] font-semibold"
      style={{ color: el(symbol).color }}
    >
      {symbol}
    </div>
  )
}

function ChargeStepper({ id, charge }: { id: number; charge: number }) {
  const t = useT()
  const setCharge = useStudio((s) => s.setCharge)
  const btn = 'inline-flex size-(--hit) items-center justify-center rounded-ctl border border-line text-ink-dim hover:border-line-strong hover:bg-surface-3 hover:text-ink aria-disabled:opacity-40'
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={t('atom.chargeDown')} aria-disabled={charge <= -3} onClick={() => charge > -3 && setCharge(id, charge - 1)} className={btn}><Minus size={14} aria-hidden /></button>
      <span className="min-w-8 text-center text-ui tabular-nums" aria-live="polite">{signed(charge)}</span>
      <button type="button" aria-label={t('atom.chargeUp')} aria-disabled={charge >= 3} onClick={() => charge < 3 && setCharge(id, charge + 1)} className={btn}><Plus size={14} aria-hidden /></button>
    </div>
  )
}

function ValenceBadge({ info }: { info: AtomInfo }) {
  const t = useT()
  if (info.state === 'ok') return <Badge tone="ok" icon={<Check size={12} aria-hidden />}>{t('atom.valence.ok')}</Badge>
  if (info.state === 'under') return <Badge tone="warn" icon={<AlertTriangle size={12} aria-hidden />}>{t('atom.valence.under')}</Badge>
  return <Badge tone="danger" icon={<CircleAlert size={12} aria-hidden />}>{t('atom.valence.over')}</Badge>
}

function AtomPanel({ info }: { info: AtomInfo }) {
  const t = useT()
  const fix = useFmt()
  const lang = useStudio((s) => s.language)
  const changeElement = useStudio((s) => s.changeElement)
  const deleteAtoms = useStudio((s) => s.deleteAtoms)
  // The Turkish name carries an English gloss in parentheses; the Turkish UI shows only the Turkish part.
  const incomplete = !!(info as { incomplete?: boolean }).incomplete
  const missingH = Math.max(0, info.valence - info.valenceUsed)
  const geometry = lang === 'en' ? info.geometryEn : info.geometry.replace(/\s*\([^)]*\)\s*$/, '')
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
          <Row label={t('atom.number')}>{info.z}</Row>
          <Row label={t('atom.mass')}>{fix(info.mass, 4)} u</Row>
          <Row label={t('atom.en')}>{fix(info.en, 2)}</Row>
          <Row label={t('atom.radius')}>{fix(info.covalentRadius, 2)} Å</Row>
        </dl>
        <div className="mt-2.5">
          <div className="mb-1 text-label text-ink-dim">{t('atom.position')} (Å)</div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['x', 'y', 'z'] as const).map((axis, i) => (
              <div key={axis} className="rounded-ctl border border-line bg-surface-0 px-2 py-1">
                <div className="text-micro text-ink-faint">{axis}</div>
                <div className="text-ui tabular-nums text-ink">{fix(info.position[i], 3)}</div>
              </div>
            ))}
          </div>
        </div>
      </Sec>

      <Sec id="atom.bonding" title={t('atom.section.bonding')}>
        <dl className="m-0">
          <Row label={t('atom.valence')}>
            <span className="inline-flex flex-wrap items-center justify-end gap-2">{info.valenceUsed}/{info.valence}<ValenceBadge info={info} />{incomplete && missingH > 0 && <Badge tone="warn" icon={<AlertTriangle size={12} aria-hidden />}>{t('atom.missingH', { n: missingH })}</Badge>}</span>
          </Row>
          <Row label={<>{t('atom.hybrid')}<Prov kind="est" /></>} mono={false}>{incomplete ? t('calc.incomplete') : hybridLabel(info.hybridization)}</Row>
          <Row label={<>{t('atom.geometry')}<Prov kind="est" /></>} mono={false}>{incomplete ? t('calc.incomplete') : geometry}</Row>
          <Row label={t('atom.steric')}>{incomplete ? t('calc.failed') : info.stericNumber}</Row>
          <Row label={<>{t('atom.lonePairs')}<Prov kind="est" /></>}>{incomplete ? t('calc.incomplete') : info.lonePairs}</Row>
          <Row label={<>{t('atom.gasteiger')}<Prov kind="est" /></>}>{info.partialCharge === null || info.partialCharge === undefined ? t('calc.failed') : fix(info.partialCharge, 3)}</Row>
        </dl>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-label text-ink-dim">{t('atom.charge')}</span>
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
        <ElementPicker value={info.symbol} onPick={(s) => changeElement(info.id, s)} ariaLabel={t('atom.section.change')} columns={7} />
      </Sec>

      <div className="border-t border-line p-4">
        <PrimaryButton variant="danger" icon={<Trash2 size={15} aria-hidden />} onClick={() => deleteAtoms([info.id])} className="w-full">{t('atom.delete')}</PrimaryButton>
      </div>
    </div>
  )
}

function MultiPanel({ mol, ids }: { mol: Molecule; ids: number[] }) {
  const t = useT()
  const lang = useStudio((s) => s.language)
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
              <span className="text-label text-ink-faint tabular-nums">#{a.id}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-line p-4">
        <PrimaryButton variant="danger" icon={<Trash2 size={15} aria-hidden />} onClick={() => useStudio.getState().deleteAtoms(ids)} className="w-full">{t('atom.deleteMany')}</PrimaryButton>
      </div>
    </div>
  )
}

// ---------- bond ----------
function BondPanel({ info, mol }: { info: BondInfo; mol: Molecule }) {
  const t = useT()
  const fix = useFmt()
  const lang = useStudio((s) => s.language)
  const setBondOrderOf = useStudio((s) => s.setBondOrderOf)
  const deleteBond = useStudio((s) => s.deleteBond)
  const bond = bondById(mol, info.id)
  const A = bond ? atomById(mol, bond.a) : undefined
  const B = bond ? atomById(mol, bond.b) : undefined
  const polarity = t(`bond.pol.${info.polarity}` as TrKey)
  const tone = info.polarity === 'ionic' ? 'warn' : info.polarity === 'polar' ? 'accent' : 'neutral'
  const delta = info.length - info.idealLength
  return (
    <div>
      <div className="px-4 pb-3 pt-3">
        <h2 className="m-0 text-title font-medium text-ink">{info.label}</h2>
        <div className="text-label text-ink-dim">{lang === 'en' ? info.orderNameEn : info.orderName}</div>
      </div>
      <Sec id="bond.main" title={t('bond.type')}>
        <dl className="m-0">
          <Row label={t('bond.atoms')} mono={false}>
            <span className="inline-flex gap-1.5">
              {[A, B].map((a) => a && (
                <button key={a.id} type="button" onClick={() => useStudio.getState().setSelection([a.id])} className="inline-flex items-center gap-1 rounded-ctl border border-line px-1.5 text-ui hover:bg-surface-3">
                  <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: el(a.symbol).color }} />{a.symbol}<span className="text-label text-ink-faint">#{a.id}</span>
                </button>
              ))}
            </span>
          </Row>
          <Row label={t('bond.length')}>
            {fix(info.length, 3)} Å <span className="text-label text-ink-faint">({t('bond.ideal')} {fix(info.idealLength, 3)}, {delta >= 0 ? '+' : MINUS}{fix(Math.abs(delta), 3)})</span>
          </Row>
          <Row label={t('bond.deltaEN')}>{fix(info.deltaEN, 2)}</Row>
          <Row label={t('bond.polarity')} mono={false}><Badge tone={tone}>{polarity}</Badge></Row>
          <Row label={t('bond.sigma')}>{info.sigma}</Row>
          <Row label={t('bond.pi')}>{info.pi}</Row>
          <Row label={t('bond.ring')} mono={false}>{info.inRing ? t('bond.yes') : t('bond.no')}</Row>
          <Row label={t('bond.aromatic')} mono={false}>{info.aromatic ? t('bond.yes') : t('bond.no')}</Row>
        </dl>
      </Sec>
      <div className="border-t border-line p-4">
        <div className="mb-1.5 text-label text-ink-dim">{t('bond.order')}</div>
        <Segmented<number>
          ariaLabel={t('bond.order')}
          fill
          value={info.aromatic ? 0 : info.order}
          onChange={(o) => setBondOrderOf(info.id, o as BondOrder)}
          options={[1, 2, 3].map((o) => ({ value: o, label: t(`opt.order.${o}` as TrKey) }))}
        />
      </div>
      <div className="border-t border-line p-4">
        <PrimaryButton variant="danger" icon={<Trash2 size={15} aria-hidden />} onClick={() => deleteBond(info.id)} className="w-full">{t('bond.delete')}</PrimaryButton>
      </div>
    </div>
  )
}

// ---------- measure ----------
function MeasurePanel({ mol }: { mol: Molecule }) {
  const t = useT()
  const fix = useFmt()
  const ids = useStudio((s) => s.measure)
  const clear = useStudio((s) => s.clearMeasure)
  const atoms = ids.map((i) => atomById(mol, i)).filter((a): a is NonNullable<typeof a> => !!a)
  let value: { label: string; text: string; note?: string } | null = null
  if (atoms.length === 2) value = { label: t('meas.distance'), text: `${fix(dist(atoms[0].pos, atoms[1].pos), 3)} Å` }
  else if (atoms.length === 3) value = { label: t('meas.angle'), text: `${fix(angleDeg(atoms[0].pos, atoms[1].pos, atoms[2].pos), 2)}°`, note: t('meas.angleAt', { symbol: `${atoms[1].symbol} #${atoms[1].id}` }) }
  else if (atoms.length === 4) value = { label: t('meas.dihedral'), text: `${fix(dihedralDeg(atoms[0].pos, atoms[1].pos, atoms[2].pos, atoms[3].pos), 2)}°` }
  return (
    <div className="p-4">
      <h2 className="m-0 flex items-center gap-2 text-title font-medium text-ink"><Ruler size={16} aria-hidden className="text-accent" />{t('meas.title')}</h2>
      <p className="mb-3 mt-2 text-ui text-ink-dim">{t('meas.hint')}</p>
      <div className="mb-1 text-label text-ink-dim">{t('meas.atoms')}</div>
      {atoms.length === 0 ? (
        <p className="m-0 text-ui text-ink-faint">{t('meas.none')}</p>
      ) : (
        <ol className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {atoms.map((a, i) => (
            <li key={a.id} className="inline-flex items-center gap-1.5 rounded-ctl border border-line bg-surface-2 px-2 py-1 text-ui">
              <span className="text-label text-ink-faint">{i + 1}</span>
              <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: el(a.symbol).color }} />
              {a.symbol}<span className="text-label text-ink-faint tabular-nums">#{a.id}</span>
            </li>
          ))}
        </ol>
      )}
      {value && (
        <div className="mt-3 rounded-ctl border border-line-strong bg-surface-2 p-3" role="status">
          <div className="text-label text-ink-dim">{value.label}</div>
          <div className="text-formula font-medium tabular-nums text-ink">{value.text}</div>
          {value.note && <div className="text-label text-ink-dim">{value.note}</div>}
        </div>
      )}
      <PrimaryButton variant="quiet" icon={<X size={15} aria-hidden />} onClick={clear} disabled={ids.length === 0} className="mt-3 w-full">{t('meas.clear')}</PrimaryButton>
    </div>
  )
}

// ---------- body ----------
/** Contextual inspector content: bond > atom(s) > molecule, with the measure tool taking over while active. */
export function InspectorBody({ sheet }: { sheet?: boolean }) {
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
  else if (aInfo) { key = `atom:${aInfo.id}`; content = <AtomPanel info={aInfo} /> }
  else if (selection.length > 1) { key = 'multi'; content = <MultiPanel mol={mol} ids={selection} /> }
  else content = <MoleculeSummary mol={mol} layout={sheet ? 'sheet' : 'panel'} />

  return (
    <motion.div
      key={key}
      initial={reduced ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
    >
      {content}
    </motion.div>
  )
}

/** Short title + subtitle shown in a bottom sheet header ("peek" state). */
export function InspectorSummaryLine() {
  const t = useT()
  const mol = useStudio((s) => s.mol)
  const selection = useStudio((s) => s.selection)
  const selectedBond = useStudio((s) => s.selectedBond)
  const lang = useStudio((s) => s.language)
  const atoms = mol.atoms.length
  const pretty = useMemo(() => (atoms ? formula(mol, true) : ''), [mol, atoms])
  const sel = selection.length === 1 ? atomById(mol, selection[0]) : undefined
  const bond = selectedBond !== null ? bondById(mol, selectedBond) : undefined
  return (
    <div className="flex items-center gap-2 pb-1 text-ui text-ink-dim" aria-live="polite">
      {sel ? (
        <span className="text-ink">{elementName(sel.symbol, lang)} #{sel.id}</span>
      ) : bond ? (
        <span className="text-ink">{t('st.selBond', { label: `${atomById(mol, bond.a)?.symbol ?? ''}–${atomById(mol, bond.b)?.symbol ?? ''}` })}</span>
      ) : pretty ? (
        <span className="text-ink"><Formula text={pretty} /></span>
      ) : (
        <span>{t('mol.empty.title')}</span>
      )}
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{t('st.atoms', { n: atoms })}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">{t('st.bonds', { n: mol.bonds.length })}</span>
    </div>
  )
}
