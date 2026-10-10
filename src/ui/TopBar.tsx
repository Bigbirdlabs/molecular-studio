import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertTriangle, Check, ChevronDown, CircleDot, EllipsisVertical, FileText, Info, Library, Loader2, Redo2, ScanEye, Settings, Undo2,
} from 'lucide-react'
import { DEFAULT_PROJECT_NAME, useStudio } from '../store'
import { useT, type TFn } from './i18n'
import { useUI } from './uiStore'
import { IconButton } from './controls'
import { LogoMark } from './icons'
import { Menu, type MenuEntry } from './Menu'
import { useFileItems, useViewItems } from './menus'
import { MOD } from './shortcuts'
import type { Layout } from './layout'

function relativeTime(t: TFn, ms: number, now: number): string {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 45) return t('time.now')
  const m = Math.round(s / 60)
  if (m < 60) return t('time.min', { n: Math.max(1, m) })
  const h = Math.round(m / 60)
  if (h < 24) return t('time.hour', { n: h })
  return t('time.day', { n: Math.round(h / 24) })
}

/** Save status derived from the real autosave state machine in the store. */
function SaveStatus({ compact }: { compact: boolean }) {
  const t = useT()
  const status = useStudio((s) => s.saveStatus)
  const savedAt = useStudio((s) => s.lastSavedAt)
  const lang = useStudio((s) => s.language)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (savedAt === null) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [savedAt, status])

  let icon: ReactNode
  let label: string
  let tone = 'text-ink-dim'
  let title: string | undefined
  if (status === 'saving') {
    icon = <Loader2 size={14} aria-hidden className="animate-spin" />
    label = t('save.saving')
  } else if (status === 'unsaved') {
    icon = <CircleDot size={14} aria-hidden className="text-warn" />
    label = t('save.unsaved')
    tone = 'text-ink'
  } else if (status === 'error') {
    icon = <AlertTriangle size={14} aria-hidden className="text-danger" />
    label = t('save.error')
    tone = 'text-danger'
    title = t('save.errorHint')
  } else if (savedAt !== null) {
    icon = <Check size={14} aria-hidden className="text-ok" />
    label = `${t('save.saved')} · ${relativeTime(t, savedAt, now)}`
    title = t('save.at', { time: new Date(savedAt).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-GB') })
  } else {
    icon = <Check size={14} aria-hidden className="text-ink-faint" />
    label = t('save.ready')
  }
  return (
    <div role="status" aria-live="polite" title={title ?? label} className={`flex min-h-(--hit) shrink-0 items-center gap-1.5 px-2 text-label ${tone}`}>
      {icon}
      <span className={compact ? 'sr-only' : 'whitespace-nowrap'}>{label}</span>
    </div>
  )
}

/** Editable project name: committed on blur / Enter, Esc reverts. */
function ProjectName({ className = '' }: { className?: string }) {
  const t = useT()
  const name = useStudio((s) => s.projectName)
  const setProjectName = useStudio((s) => s.setProjectName)
  const isDefault = name === DEFAULT_PROJECT_NAME
  const shown = isDefault ? '' : name
  const [draft, setDraft] = useState(shown)
  const editing = useRef(false)

  useEffect(() => { if (!editing.current) setDraft(shown) }, [shown])

  const commit = () => {
    editing.current = false
    const next = draft.trim()
    if (next !== shown) setProjectName(next)
    else setDraft(shown)
  }
  return (
    <input
      aria-label={t('top.project')}
      value={draft}
      placeholder={t('top.untitled')}
      maxLength={80}
      spellCheck={false}
      onFocus={(e) => { editing.current = true; e.currentTarget.select() }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') { e.stopPropagation(); setDraft(shown); editing.current = false; e.currentTarget.blur() }
      }}
      className={`h-(--hit) min-w-0 rounded-ctl border border-transparent bg-transparent px-2 text-ui text-ink placeholder:text-ink-dim hover:border-line hover:bg-surface-2 focus:border-accent-dim focus:bg-surface-2 ${className}`}
    />
  )
}

function UndoRedo() {
  const t = useT()
  const canUndo = useStudio((s) => s.past.length > 0)
  const canRedo = useStudio((s) => s.future.length > 0)
  const undo = useStudio((s) => s.undo)
  const redo = useStudio((s) => s.redo)
  return (
    <div className="flex shrink-0 items-center">
      <IconButton label={t('top.undo')} shortcut={`${MOD}+Z`} tip="bottom" icon={<Undo2 size={17} aria-hidden />} disabled={!canUndo} onClick={undo} />
      <IconButton label={t('top.redo')} shortcut={`${MOD}+Shift+Z`} tip="bottom" icon={<Redo2 size={17} aria-hidden />} disabled={!canRedo} onClick={redo} />
    </div>
  )
}

/** Button that opens an anchored menu; shows a text label on desktop. */
function MenuTrigger({
  label, icon, items, showText, ariaLabel, placement = 'bottom-start',
}: { label: string; icon: ReactNode; items: MenuEntry[]; showText: boolean; ariaLabel: string; placement?: 'bottom-start' | 'bottom-end' }) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton
        buttonRef={ref}
        label={label}
        tip={showText ? false : 'bottom'}
        icon={<>{icon}{showText && <ChevronDown size={13} aria-hidden className="-ml-0.5 opacity-70" />}</>}
        text={showText ? label : undefined}
        active={open}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      />
      <Menu anchor={ref} open={open} onClose={() => setOpen(false)} items={items} ariaLabel={ariaLabel} placement={placement} />
    </>
  )
}

export function TopBar({ layout }: { layout: Layout }) {
  const t = useT()
  const openDialog = useUI((s) => s.openDialog)
  const inspectorOpen = useStudio((s) => s.inspectorOpen)
  const setInspectorOpen = useStudio((s) => s.setInspectorOpen)
  const fileItems = useFileItems()
  const viewItems = useViewItems()
  const moreRef = useRef<HTMLButtonElement>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const desktop = layout === 'desktop'
  const mobile = layout === 'mobile'

  const info = (
    <IconButton
      label={inspectorOpen ? t('top.infoClose') : t('top.info')}
      tip="bottom"
      icon={<Info size={17} aria-hidden />}
      active={inspectorOpen}
      toggle
      onClick={() => setInspectorOpen(!inspectorOpen)}
    />
  )

  if (mobile) {
    const moreItems: MenuEntry[] = [
      { type: 'item', label: t('top.library'), icon: <Library size={15} aria-hidden />, onSelect: () => openDialog('library') },
      { type: 'sep' },
      ...fileItems,
      { type: 'sep' },
      ...viewItems,
      { type: 'sep' },
      { type: 'item', label: t('top.settings'), icon: <Settings size={15} aria-hidden />, onSelect: () => openDialog('settings') },
    ]
    return (
      <header className="flex h-[52px] shrink-0 items-center gap-1 border-b border-line bg-surface-1 pl-3 pr-1 pt-[env(safe-area-inset-top)] box-content">
        <LogoMark size={22} />
        <ProjectName className="flex-1" />
        <SaveStatus compact />
        <UndoRedo />
        {info}
        <IconButton buttonRef={moreRef} label={t('top.more')} tip={false} icon={<EllipsisVertical size={18} aria-hidden />} active={moreOpen} aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((o) => !o)} />
        <Menu anchor={moreRef} open={moreOpen} onClose={() => setMoreOpen(false)} items={moreItems} ariaLabel={t('top.more')} placement="bottom-end" minWidth={248} />
      </header>
    )
  }

  return (
    <header className={`flex shrink-0 items-center gap-1 border-b border-line bg-surface-1 px-2 ${desktop ? 'h-11' : 'h-[52px]'}`}>
      <div className="flex shrink-0 items-center gap-2 pl-1 pr-2">
        <LogoMark size={22} />
        {desktop && <span className="text-ui font-medium tracking-[0.01em] text-ink">{t('app.name')}</span>}
      </div>
      <div aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <ProjectName className={desktop ? 'w-56' : 'w-36'} />
      <SaveStatus compact={!desktop} />
      <div className="flex-1" />
      <UndoRedo />
      <div aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <IconButton
        label={t('top.library')}
        tip={desktop ? false : 'bottom'}
        icon={<Library size={17} aria-hidden />}
        text={desktop ? t('top.library') : undefined}
        onClick={() => openDialog('library')}
      />
      <MenuTrigger label={t('top.file')} ariaLabel={t('top.file')} icon={<FileText size={17} aria-hidden />} items={fileItems} showText={desktop} />
      <MenuTrigger label={t('top.view')} ariaLabel={t('top.view')} icon={<ScanEye size={17} aria-hidden />} items={viewItems} showText={desktop} placement="bottom-end" />
      <div aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <IconButton label={t('top.settings')} tip="bottom" icon={<Settings size={17} aria-hidden />} onClick={() => openDialog('settings')} />
      {info}
    </header>
  )
}

