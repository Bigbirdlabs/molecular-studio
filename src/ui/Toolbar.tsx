import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Eraser, Focus, Hand, Loader2, MousePointer2, Rotate3d, Ruler, ScanSearch, Wand2, FilePlus, ZoomIn, ZoomOut, Ellipsis,
} from 'lucide-react'
import { useStudio, type Tool } from '../store'
import type { BondOrder } from '../chem/molecule'
import { elementName, useT, type TFn, type TrKey } from './i18n'
import { IconButton, Segmented } from './controls'
import { AtomPlusIcon, BondIcon, HydrogenIcon } from './icons'
import { ElementPicker } from './ElementPicker'
import { Menu, type MenuEntry } from './Menu'
import { TOOL_KEYS } from './shortcuts'
import type { Layout } from './layout'

const ICON_SIZE = 18

const TOOL_ICONS: Record<Tool, ReactNode> = {
  select: <MousePointer2 size={ICON_SIZE} aria-hidden />,
  rotate: <Rotate3d size={ICON_SIZE} aria-hidden />,
  pan: <Hand size={ICON_SIZE} aria-hidden />,
  zoom: <ScanSearch size={ICON_SIZE} aria-hidden />,
  atom: <AtomPlusIcon size={ICON_SIZE} />,
  bond: <BondIcon size={ICON_SIZE} />,
  erase: <Eraser size={ICON_SIZE} aria-hidden />,
  measure: <Ruler size={ICON_SIZE} aria-hidden />,
}

export const TOOL_ORDER: Tool[] = ['select', 'rotate', 'pan', 'zoom', 'atom', 'bond', 'erase', 'measure']
export const toolLabel = (t: TFn, tool: Tool): string => t(`tool.${tool}` as TrKey)

interface ActionDef {
  id: string
  label: string
  icon: ReactNode
  onClick: () => void
  shortcut?: string
  disabled?: boolean
  reason?: string
  busy?: boolean
}

/** Secondary actions. Every entry is either wired to a real store action or honestly disabled with a reason. */
function useActions(): ActionDef[] {
  const t = useT()
  const atoms = useStudio((s) => s.mol.atoms.length)
  const hasH = useStudio((s) => s.mol.atoms.some((a) => a.symbol === 'H'))
  const relaxing = useStudio((s) => s.relaxing)
  const run = (f: (st: ReturnType<typeof useStudio.getState>) => void) => () => f(useStudio.getState())
  const wait = t('act.reason.relaxing')
  return [
    {
      id: 'optimize',
      label: relaxing ? t('act.optimizing') : t('act.optimize'),
      icon: relaxing ? <Loader2 size={ICON_SIZE} aria-hidden className="animate-spin" /> : <Wand2 size={ICON_SIZE} aria-hidden />,
      onClick: run((st) => st.cleanUp()),
      disabled: relaxing || atoms < 2,
      reason: relaxing ? wait : t('act.reason.needTwo'),
      busy: relaxing,
    },
    { id: 'addH', label: t('act.addH'), icon: <HydrogenIcon size={ICON_SIZE} mode="add" />, onClick: run((st) => st.addHydrogens()), disabled: atoms === 0 || relaxing, reason: atoms === 0 ? t('act.reason.empty') : wait },
    { id: 'removeH', label: t('act.removeH'), icon: <HydrogenIcon size={ICON_SIZE} mode="remove" />, onClick: run((st) => st.removeHydrogens()), disabled: !hasH || relaxing, reason: relaxing ? wait : t('act.reason.noH') },
    { id: 'new', label: t('act.new'), icon: <FilePlus size={ICON_SIZE} aria-hidden />, onClick: run((st) => st.newMolecule()), disabled: atoms === 0 || relaxing, reason: atoms === 0 ? t('act.reason.empty') : wait },
    { id: 'reset', label: t('act.resetCamera'), icon: <Focus size={ICON_SIZE} aria-hidden />, shortcut: 'F', onClick: run((st) => st.resetCamera()) },
    { id: 'zoomIn', label: t('act.zoomIn'), icon: <ZoomIn size={ICON_SIZE} aria-hidden />, onClick: run((st) => st.zoomBy(1.25)), disabled: atoms === 0, reason: t('act.reason.empty') },
    { id: 'zoomOut', label: t('act.zoomOut'), icon: <ZoomOut size={ICON_SIZE} aria-hidden />, onClick: run((st) => st.zoomBy(0.8)), disabled: atoms === 0, reason: t('act.reason.empty') },
  ]
}

function ToolButton({ tool, tip }: { tool: Tool; tip: 'right' | false }) {
  const t = useT()
  const active = useStudio((s) => s.tool === tool)
  const setTool = useStudio((s) => s.setTool)
  return (
    <IconButton
      label={toolLabel(t, tool)}
      shortcut={TOOL_KEYS[tool]}
      tip={tip}
      icon={TOOL_ICONS[tool]}
      active={active}
      toggle
      onClick={() => setTool(tool)}
    />
  )
}

/** Desktop and tablet: persistent vertical toolbar. */
export function Toolbar({ layout }: { layout: Layout }) {
  const t = useT()
  const actions = useActions()
  return (
    <nav
      aria-label={t('tool.group')}
      className={`no-scrollbar flex shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-line bg-surface-1 py-2 ${layout === 'desktop' ? 'w-12' : 'w-[60px]'}`}
    >
      <div role="group" aria-label={t('tool.group')} className="flex flex-col items-center gap-1">
        {TOOL_ORDER.map((tool) => <ToolButton key={tool} tool={tool} tip="right" />)}
      </div>
      <div aria-hidden="true" className="my-1 h-px w-6 bg-line" />
      <div role="group" aria-label={t('tool.actions')} className="flex flex-col items-center gap-1">
        {actions.map((a) => (
          <IconButton key={a.id} label={a.label} icon={a.icon} shortcut={a.shortcut} tip="right" onClick={a.onClick} disabled={a.disabled} disabledReason={a.reason} busy={a.busy} />
        ))}
      </div>
    </nav>
  )
}

/** Phone: compact bottom dock. Tools scroll horizontally; secondary actions live in a popover menu. */
export function Dock() {
  const t = useT()
  const actions = useActions()
  const tool = useStudio((s) => s.tool)
  const scroller = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [tool])

  const items: MenuEntry[] = actions.map((a) => ({
    type: 'item', label: a.label, icon: a.icon, shortcut: a.shortcut, onSelect: a.onClick, disabled: a.disabled, reason: a.reason,
  }))

  return (
    <nav aria-label={t('tool.group')} className="pb-safe flex shrink-0 items-center border-t border-line bg-surface-1">
      <div ref={scroller} role="group" aria-label={t('tool.group')} className="no-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2 py-1.5">
        {TOOL_ORDER.map((id) => <ToolButton key={id} tool={id} tip={false} />)}
      </div>
      <div aria-hidden="true" className="h-6 w-px bg-line" />
      <div className="px-1.5">
        <IconButton buttonRef={moreRef} label={t('tool.actions')} tip={false} icon={<Ellipsis size={ICON_SIZE} aria-hidden />} active={moreOpen} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)} />
      </div>
      <Menu anchor={moreRef} open={moreOpen} onClose={() => setMoreOpen(false)} items={items} placement="top-end" ariaLabel={t('tool.actions')} minWidth={236} />
    </nav>
  )
}

function BondOrderGlyph({ order }: { order: number }) {
  const ys = order === 1 ? [8] : order === 2 ? [5.5, 10.5] : [3.5, 8, 12.5]
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {ys.map((y) => <path key={y} d={`M2 ${y}H16`} />)}
    </svg>
  )
}

export function BondOrderPicker({ className = '' }: { className?: string }) {
  const t = useT()
  const order = useStudio((s) => s.bondOrder)
  const setBondOrder = useStudio((s) => s.setBondOrder)
  return (
    <Segmented<number>
      ariaLabel={t('opt.bondOrder')}
      value={order}
      onChange={(v) => setBondOrder(v as BondOrder)}
      iconOnly
      className={className}
      options={[1, 2, 3].map((o) => ({ value: o, label: t(`opt.order.${o}` as TrKey), icon: <BondOrderGlyph order={o} />, title: t(`opt.order.${o}` as TrKey) }))}
    />
  )
}

/**
 * Contextual options for Add Atom / Add Bond. On desktop and tablet it floats in the viewport's top-left corner;
 * on phones it is a compact row above the dock.
 */
export function ToolOptions({ layout }: { layout: Layout }) {
  const t = useT()
  const tool = useStudio((s) => s.tool)
  const element = useStudio((s) => s.element)
  const setElement = useStudio((s) => s.setElement)
  const lang = useStudio((s) => s.language)
  if (tool !== 'atom' && tool !== 'bond') return null

  if (layout === 'mobile') {
    return (
      <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface-1 px-2 py-1.5">
        <BondOrderPicker />
        {tool === 'atom' && (
          <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
            <ElementPicker value={element} onPick={setElement} ariaLabel={t('opt.element')} columns={14} className="w-max" />
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="absolute left-3 top-3 z-10 flex flex-col gap-2.5 rounded-panel border border-line bg-surface-1 p-2.5">
      {tool === 'atom' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-label text-ink-dim">{t('opt.element')}</span>
            <span className="text-label text-ink">{elementName(element, lang)}</span>
          </div>
          <ElementPicker value={element} onPick={setElement} ariaLabel={t('opt.element')} columns={7} />
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-ink-dim">{t('opt.bondOrder')}</span>
        <BondOrderPicker />
      </div>
    </div>
  )
}
