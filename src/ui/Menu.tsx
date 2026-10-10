import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type MenuEntry =
  | { type: 'item'; label: string; icon?: ReactNode; shortcut?: string; onSelect: () => void; disabled?: boolean; reason?: string; checked?: boolean; role?: 'checkbox' | 'radio' }
  | { type: 'sep' }
  | { type: 'label'; label: string }
  /** Collapsible group (phone overflow menu): shows its items inline when expanded. */
  | { type: 'group'; label: string; icon?: ReactNode; items: MenuEntry[] }

export type MenuPlacement = 'bottom-start' | 'bottom-end' | 'top-end'

interface MenuProps {
  anchor: RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  items: MenuEntry[]
  placement?: MenuPlacement
  ariaLabel: string
  minWidth?: number
}

/** Anchored popover menu: arrow-key navigation, Esc / outside click to close, focus returns to the trigger. */
export function Menu({ anchor, open, onClose, items, placement = 'bottom-start', ariaLabel, minWidth = 220 }: MenuProps) {
  const panel = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [openGroup, setOpenGroup] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const r = anchor.current.getBoundingClientRect()
    const margin = 6
    if (placement === 'bottom-start') setStyle({ left: Math.min(r.left, window.innerWidth - minWidth - 8), top: r.bottom + margin })
    else if (placement === 'bottom-end') setStyle({ right: Math.max(8, window.innerWidth - r.right), top: r.bottom + margin })
    else setStyle({ right: Math.max(8, window.innerWidth - r.right), bottom: window.innerHeight - r.top + margin })
  }, [open, anchor, placement, minWidth])

  useEffect(() => {
    if (!open) setOpenGroup(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const trigger = anchor.current
    const first = panel.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])')
    first?.focus()
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panel.current?.contains(target) || trigger?.contains(target)) return
      onClose()
    }
    const onResize = () => onClose()
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, anchor, onClose])

  if (!open) return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    const nodes = Array.from(panel.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])
    const idx = nodes.indexOf(document.activeElement as HTMLElement)
    const move = (to: number) => {
      e.preventDefault()
      nodes[(to + nodes.length) % nodes.length]?.focus()
    }
    if (e.key === 'ArrowDown') move(idx + 1)
    else if (e.key === 'ArrowUp') move(idx < 0 ? -1 : idx - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(nodes.length - 1)
    else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
      anchor.current?.focus()
    } else if (e.key === 'Tab') onClose()
  }

  const renderEntry = (it: MenuEntry, key: string): ReactNode => {
    if (it.type === 'sep') return <div key={key} role="separator" className="my-1 h-px bg-line" />
    if (it.type === 'label')
      return (
        <div key={key} className="px-3 pb-1 pt-2 text-label text-ink-faint">
          {it.label}
        </div>
      )
    if (it.type === 'group') return null
    const role = it.role === 'radio' ? 'menuitemradio' : it.role === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'
    return (
      <button
        key={key}
        type="button"
        role={role}
        aria-checked={it.role ? !!it.checked : undefined}
        aria-disabled={it.disabled || undefined}
        title={it.disabled ? it.reason : undefined}
        onClick={() => {
          if (it.disabled) return
          onClose()
          // The item is about to unmount: park focus on the trigger so a dialog opened by this item can return focus there.
          anchor.current?.focus({ preventScroll: true })
          it.onSelect()
        }}
        className={`flex min-h-(--hit) w-full items-center gap-2.5 px-3 text-left text-ui transition-colors duration-100 ${
          it.disabled ? 'cursor-not-allowed text-ink-faint opacity-60' : 'text-ink hover:bg-surface-3 focus-visible:bg-surface-3'
        }`}
      >
        <span className="flex w-4 shrink-0 items-center justify-center text-ink-dim">
          {it.role ? (it.checked ? <Check size={14} aria-hidden className="text-accent" /> : null) : it.icon}
        </span>
        <span className="flex-1">{it.label}</span>
        {it.shortcut && <kbd className="font-mono text-micro text-ink-faint [@media(pointer:coarse)]:hidden in-data-[layout=mobile]:hidden">{it.shortcut}</kbd>}
      </button>
    )
  }

  return createPortal(
    <div
      ref={panel}
      role="menu"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="menu-in fixed z-[90] max-h-[min(72vh,560px)] overflow-y-auto rounded-panel border border-line-strong bg-surface-2 py-1 shadow-lg shadow-black/50"
      style={{ ...style, minWidth }}
    >
      {items.map((it, i) => {
        if (it.type === 'sep') return <div key={i} role="separator" className="my-1 h-px bg-line" />
        if (it.type === 'label')
          return (
            <div key={i} className="px-3 pb-1 pt-2 text-label text-ink-faint">
              {it.label}
            </div>
          )
        if (it.type === 'group') {
          const expanded = openGroup === i
          return (
            <div key={i}>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={expanded}
                onClick={() => setOpenGroup(expanded ? null : i)}
                className="flex min-h-(--hit) w-full items-center gap-2.5 px-3 text-left text-ui text-ink transition-colors duration-100 hover:bg-surface-3 focus-visible:bg-surface-3"
              >
                <span className="flex w-4 shrink-0 items-center justify-center text-ink-dim">{it.icon}</span>
                <span className="flex-1">{it.label}</span>
                <ChevronDown size={14} aria-hidden className={`shrink-0 text-ink-dim transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
              </button>
              {expanded && (
                <div role="group" aria-label={it.label} className="border-y border-line bg-surface-1/60 py-1">
                  {it.items.map((sub, j) => renderEntry(sub, `${i}-${j}`))}
                </div>
              )}
            </div>
          )
        }
        return renderEntry(it, String(i))
      })}
    </div>,
    document.body,
  )
}
