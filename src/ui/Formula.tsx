import type { ReactNode } from 'react'

const SUB = '₀₁₂₃₄₅₆₇₈₉'
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻'
const SUP_PLAIN = '0123456789+-'

type Kind = 'base' | 'sub' | 'sup'
const kindOf = (ch: string): Kind => (SUB.includes(ch) ? 'sub' : SUP.includes(ch) ? 'sup' : 'base')
const plainOf = (ch: string): string => {
  const s = SUB.indexOf(ch)
  if (s >= 0) return String(s)
  const p = SUP.indexOf(ch)
  return p >= 0 ? SUP_PLAIN[p] : ch
}

/**
 * Renders a Unicode-subscripted formula (C₈H₁₀N₄O₂, NH₄⁺) with real <sub>/<sup> elements so the
 * typography is consistent regardless of font coverage. The accessible name is the plain text form.
 */
export function Formula({ text, className = '' }: { text: string; className?: string }) {
  const parts: ReactNode[] = []
  let run = ''
  let kind: Kind = 'base'
  const flush = (key: number) => {
    if (!run) return
    if (kind === 'sub') parts.push(<sub key={key}>{run}</sub>)
    else if (kind === 'sup') parts.push(<sup key={key}>{run}</sup>)
    else parts.push(run)
    run = ''
  }
  let i = 0
  let plain = ''
  for (const ch of text) {
    const k = kindOf(ch)
    plain += plainOf(ch)
    if (k !== kind) { flush(i++); kind = k }
    run += k === 'base' ? ch : plainOf(ch)
  }
  flush(i)
  return (
    <span className={`formula ${className}`} role="img" aria-label={plain}>
      {parts}
    </span>
  )
}
