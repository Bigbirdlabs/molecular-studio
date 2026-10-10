import { useId, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { Tip, type TipSide } from './Tip'
import { useT, type TrKey } from './i18n'

/** Class fragments shared by every interactive control so the chrome stays visually consistent. */
export const ctl = {
  base: 'inline-flex shrink-0 select-none items-center justify-center gap-1.5 rounded-ctl text-ink-dim transition-colors duration-150 ease-ui',
  hover: 'hover:bg-surface-3 hover:text-ink',
  active: 'bg-accent/15 text-accent ring-1 ring-inset ring-accent-dim hover:bg-accent/20 hover:text-accent',
  disabled: 'opacity-40 hover:bg-transparent hover:text-ink-dim',
}

interface IconButtonProps {
  label: string
  icon: ReactNode
  onClick?: () => void
  shortcut?: string
  /** Visually and semantically "on" (aria-pressed). */
  active?: boolean
  /** Use aria-pressed (toggle / tool) semantics even when inactive. */
  toggle?: boolean
  disabled?: boolean
  /** Honest explanation shown in the tooltip and the accessible name when disabled. */
  disabledReason?: string
  tip?: TipSide | false
  busy?: boolean
  className?: string
  /** Optional visible text after the icon. */
  text?: string
  'aria-haspopup'?: 'menu' | 'dialog'
  'aria-expanded'?: boolean
  buttonRef?: React.Ref<HTMLButtonElement>
}

export function IconButton({
  label, icon, onClick, shortcut, active, toggle, disabled, disabledReason, tip = 'right', busy, className = '', text, buttonRef, ...aria
}: IconButtonProps) {
  const name = disabled && disabledReason ? `${label} (${disabledReason})` : label
  const button = (
    <button
      ref={buttonRef}
      type="button"
      aria-label={name}
      aria-pressed={toggle ? !!active : undefined}
      aria-disabled={disabled || undefined}
      aria-busy={busy || undefined}
      aria-haspopup={aria['aria-haspopup']}
      aria-expanded={aria['aria-expanded']}
      onClick={() => { if (!disabled) onClick?.() }}
      className={`${ctl.base} ${text ? 'h-(--hit) px-2' : 'size-(--hit)'} ${active ? ctl.active : ctl.hover} ${disabled ? ctl.disabled : ''} ${className}`}
    >
      {icon}
      {text && <span className="text-ui">{text}</span>}
    </button>
  )
  if (tip === false) return button
  return (
    <Tip label={label} shortcut={shortcut} note={disabled ? disabledReason : undefined} side={tip}>
      {button}
    </Tip>
  )
}

interface SegOption<T> { value: T; label: string; icon?: ReactNode; title?: string }

export function Segmented<T extends string | number>({
  value, options, onChange, ariaLabel, className = '', fill, iconOnly,
}: { value: T; options: SegOption<T>[]; onChange: (v: T) => void; ariaLabel: string; className?: string; fill?: boolean; iconOnly?: boolean }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`flex rounded-ctl border border-line bg-surface-0 p-0.5 ${fill ? 'w-full' : 'w-fit max-w-full'} ${className}`}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`inline-flex min-h-[calc(var(--hit)-6px)] items-center justify-center gap-1.5 rounded-[4px] px-2.5 text-ui transition-colors duration-150 ease-ui ${fill ? 'flex-1' : ''} ${
              on ? 'bg-surface-3 text-ink ring-1 ring-inset ring-line-strong' : 'text-ink-dim hover:text-ink'
            }`}
          >
            {o.icon}
            <span className={iconOnly ? 'sr-only' : ''}>{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/** A labelled value row used throughout the inspector. */
export function Row({ label, children, hint, mono = true }: { label: ReactNode; children: ReactNode; hint?: string; mono?: boolean }) {
  return (
    <div className="flex min-h-6 items-baseline justify-between gap-3 py-[3px]" title={hint}>
      <dt className="text-label text-ink-dim">{label}</dt>
      <dd className={`m-0 text-right text-ui text-ink ${mono ? 'tabular-nums' : ''}`}>{children}</dd>
    </div>
  )
}

/** Tiny neutral provenance pill (Calculated / Measured / Estimated). */
export function Prov({ kind }: { kind: 'calc' | 'meas' | 'est' }) {
  const t = useT()
  return (
    <span className="ml-1.5 inline-block rounded-[4px] border border-line px-1 text-micro font-normal text-ink-faint">
      {t(`prov.${kind}` as TrKey)}
    </span>
  )
}

/** Collapsible group: progressive disclosure keeps every group short. */
export function Section({
  title, children, open, onToggle, trailing,
}: { title: string; children: ReactNode; open: boolean; onToggle: () => void; trailing?: ReactNode }) {
  const id = useId()
  return (
    <section className="border-t border-line first:border-t-0">
      <h3 className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={onToggle}
          className="flex min-h-(--hit) w-full items-center gap-1.5 px-4 text-left text-label font-medium text-ink-dim transition-colors hover:text-ink"
        >
          <ChevronRight size={14} aria-hidden className={`shrink-0 transition-transform duration-150 ease-ui ${open ? 'rotate-90' : ''}`} />
          <span className="flex-1">{title}</span>
          {trailing}
        </button>
      </h3>
      {open && (
        <div id={id} className="px-4 pb-3">
          {children}
        </div>
      )}
    </section>
  )
}

export function Badge({ tone, children, icon }: { tone: 'ok' | 'warn' | 'danger' | 'neutral' | 'accent'; children: ReactNode; icon?: ReactNode }) {
  const tones = {
    ok: 'text-ok border-ok/40',
    warn: 'text-warn border-warn/40',
    danger: 'text-danger border-danger/40',
    neutral: 'text-ink-dim border-line-strong',
    accent: 'text-accent border-accent-dim',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-[4px] border px-1.5 py-px text-label ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

export function PrimaryButton({
  children, onClick, disabled, busy, icon, type = 'button', variant = 'solid', className = '',
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean; icon?: ReactNode
  type?: 'button' | 'submit'; variant?: 'solid' | 'quiet' | 'danger'; className?: string
}) {
  const variants = {
    solid: 'bg-accent text-surface-0 hover:bg-[#7ad4ec] font-medium',
    quiet: 'border border-line-strong bg-surface-2 text-ink hover:bg-surface-3',
    danger: 'border border-danger/50 text-danger hover:bg-danger/10',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      aria-disabled={disabled || busy || undefined}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-(--hit) items-center justify-center gap-2 rounded-ctl px-3 text-ui transition-colors duration-150 ease-ui disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}

/** On/off switch (role="switch"). */
export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div id={id} className="text-ui text-ink">{label}</div>
        {description && <div className="text-label text-ink-dim">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-150 ease-ui ${checked ? 'border-accent-dim bg-accent/30' : 'border-line-strong bg-surface-3'}`}
      >
        <span aria-hidden="true" className={`absolute left-0.5 size-3.5 rounded-full transition-transform duration-150 ease-ui ${checked ? 'translate-x-4 bg-accent' : 'translate-x-0 bg-ink-dim'}`} />
      </button>
    </div>
  )
}
