import { PALETTE, el } from '../chem/elements'
import { useStudio } from '../store'
import { elementName } from './i18n'
import { Tip } from './Tip'

/** Periodic-style chips with CPK swatches. Used by the Add Atom options and the inspector's "change element". */
export function ElementPicker({
  value, onPick, ariaLabel, columns = 7, className = '',
}: { value: string | null; onPick: (symbol: string) => void; ariaLabel: string; columns?: number; className?: string }) {
  const lang = useStudio((s) => s.language)
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`grid gap-1 ${className}`} style={{ gridTemplateColumns: `repeat(${columns}, var(--hit))` }}>
      {PALETTE.map((symbol) => {
        const e = el(symbol)
        const on = symbol === value
        const name = `${elementName(symbol, lang)} (${symbol}, ${e.z})`
        return (
          <Tip key={symbol} label={elementName(symbol, lang)} note={`${symbol} · ${e.z}`} side="bottom">
            <button
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={name}
              onClick={() => onPick(symbol)}
              className={`relative flex size-(--hit) flex-col items-center justify-center rounded-ctl border text-ui font-medium transition-colors duration-150 ease-ui ${
                on ? 'border-accent bg-accent/10 text-ink' : 'border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-surface-3'
              }`}
            >
              <span className="leading-none">{symbol}</span>
              <span aria-hidden="true" className="mt-[3px] h-[3px] w-4 rounded-full" style={{ background: e.color }} />
            </button>
          </Tip>
        )
      })}
    </div>
  )
}
