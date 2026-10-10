import { useCallback } from 'react'
import { useFmt, type NumFmt } from '../i18n'

const U2212 = String.fromCharCode(0x2212)

/** Locale number formatter for the inspector: shared decimal rules (A2.3) with an ASCII hyphen-minus (`-120,0`). */
export function useNum(): NumFmt {
  const fix = useFmt()
  return useCallback((n: number, digits: number) => fix(n, digits).split(U2212).join('-'), [fix])
}

/** Signed integer with an ASCII hyphen-minus (charges). */
export const signedInt = (n: number): string => (n > 0 ? `+${n}` : n < 0 ? `-${Math.abs(n)}` : '0')

/** Decimals of a tabulated constant as it is written in the table (12.011 -> 3, 32.06 -> 2): no invented precision. */
export function tabulatedDecimals(n: number): number {
  const s = String(n)
  const i = s.indexOf('.')
  return i < 0 ? 0 : Math.min(4, s.length - i - 1)
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉'
export const subscript = (n: number): string => String(n).split('').map((d) => SUBS[Number(d)] ?? d).join('')

/** VSEPR AXnEm notation from the number of bonded neighbours and lone pairs, e.g. AX₄, AX₃E, AX₂E₂. */
export function vseprNotation(neighbours: number, lonePairs: number): string {
  return `AX${neighbours > 1 ? subscript(neighbours) : ''}${lonePairs > 0 ? 'E' + (lonePairs > 1 ? subscript(lonePairs) : '') : ''}`
}

/** Ideal electron-pair-geometry angle for SN 2-4 (A4.2). `lessThan` marks the lone-pair compressed cases. */
export function idealAngle(sn: number, lonePairs: number): { value: number; lessThan: boolean } | null {
  if (sn === 2) return lonePairs === 0 ? { value: 180, lessThan: false } : null
  if (sn === 3) return { value: 120, lessThan: lonePairs > 0 }
  if (sn === 4) return { value: 109.5, lessThan: lonePairs > 0 }
  return null
}
