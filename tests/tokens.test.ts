/**
 * SPEC.md D.1 / D.10 / checklist #1 and #27: the colour tokens in src/index.css (the `@theme` block) are
 * parsed and every verified-contrast pair of D.1.3 is asserted at its threshold; scene/theme.ts must
 * mirror the CSS tokens (no separate tokens module); src/ui carries no hex literals.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ACCENT, ACCENT_DIM, BG_CENTER, BG_EDGE, DANGER, WARN } from '../src/scene/theme'

const UI_SOURCES = import.meta.glob('../src/ui/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

// ---------- parsing ----------
// read from disk: a `?raw` CSS import would pass through the Tailwind plugin, which compiles the @theme block away
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')

/** Body of the first `@theme { ... }` block (balanced braces). */
function themeBlock(src: string): string {
  const start = src.indexOf('@theme')
  if (start < 0) return ''
  const open = src.indexOf('{', start)
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i)
  }
  return ''
}

const theme = themeBlock(css).replace(/\/\*[\s\S]*?\*\//g, '')
const TOKENS = new Map<string, string>()
for (const m of theme.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) TOKENS.set(m[1], m[2].trim())
const color = (name: string): string | undefined => TOKENS.get(`--color-${name}`)

// ---------- WCAG maths ----------
type RGB = [number, number, number]
const hexToRgb = (h: string): RGB => {
  const s = h.trim().replace('#', '')
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as RGB
}
const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const luminance = ([r, g, b]: RGB) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const contrast = (a: RGB, b: RGB) => {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const mix = (a: RGB, b: RGB, pa: number): RGB => a.map((v, i) => Math.round(v * pa + b[i] * (1 - pa))) as RGB
const tok = (name: string): RGB => {
  const v = color(name)
  if (!v || !/^#[0-9a-f]{3,8}$/i.test(v)) throw new Error(`token --color-${name} is missing or not a hex value (got ${v})`)
  return hexToRgb(v)
}
/** accent-subtle = color-mix(in srgb, accent 14%, surface-1) */
const accentSubtle = (): RGB => mix(tok('accent'), tok('surface-1'), 0.14)

describe('D.1.1 existing tokens (values kept)', () => {
  const EXPECT: Record<string, string> = {
    'surface-0': '#0a0b0d', 'surface-1': '#101114', 'surface-2': '#16181c', 'surface-3': '#1d2025',
    line: '#23262c', 'line-strong': '#323640',
    ink: '#e6e8eb', 'ink-dim': '#9aa1ab', 'ink-faint': '#868e99',
    accent: '#5ec8e5', 'accent-dim': '#2b6f82', ok: '#5fb983', warn: '#d9a441', danger: '#e5605a',
  }
  it('the @theme block parses and defines colour tokens', () => {
    expect(theme.length).toBeGreaterThan(100)
    expect(TOKENS.size).toBeGreaterThan(10)
  })
  for (const [name, hex] of Object.entries(EXPECT)) {
    it(`--color-${name} = ${hex}`, () => {
      expect(color(name)?.toLowerCase()).toBe(hex)
    })
  }
})

describe('D.1.2 additions', () => {
  it('flat hex additions', () => {
    expect(color('surface-4')?.toLowerCase()).toBe('#262a31')
    expect(color('line-ctl')?.toLowerCase()).toBe('#6b7078')
    expect(color('on-accent')?.toLowerCase()).toBe('#061418')
    expect(color('danger-solid')?.toLowerCase()).toBe('#c8423e')
  })
  it('accent-subtle is a 14 % accent mix over surface-1', () => {
    const v = color('accent-subtle')
    expect(v, '--color-accent-subtle').toBeDefined()
    expect(v!).toMatch(/color-mix\(\s*in srgb/)
    expect(v!).toMatch(/14%/)
    // ≈ #1b2b31 per the spec
    const [r, g, b] = accentSubtle()
    expect([r, g, b]).toEqual([27, 43, 49])
  })
  it('hud / hud-line are translucent', () => {
    const hud = color('hud'), line = color('hud-line')
    expect(hud, '--color-hud').toBeDefined()
    expect(line, '--color-hud-line').toBeDefined()
    expect(hud!).toMatch(/rgb(a)?\(\s*10\s+11\s+13\s*\/\s*0?\.86\s*\)|rgba\(\s*10\s*,\s*11\s*,\s*13\s*,\s*0?\.86\s*\)/)
    expect(line!).toMatch(/rgb(a)?\(\s*255\s+255\s+255\s*\/\s*0?\.1(0)?\s*\)|rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0?\.1(0)?\s*\)/)
  })
})

describe('D.1.3 verified contrast (min 4.5:1 text, 3:1 boundaries)', () => {
  const SURFACES = ['surface-0', 'surface-1', 'surface-2', 'surface-3'] as const
  // [foreground token, ratios on s0..s3, ratio on surface-4, ratio on accent-subtle]
  const TABLE: [string, number[], number | null, number | null, number][] = [
    ['ink', [16.04, 15.38, 14.48, 13.31], 11.73, 11.91, 4.5],
    ['ink-dim', [7.56, 7.25, 6.82, 6.27], 5.53, 5.61, 4.5],
    ['ink-faint', [5.95, 5.70, 5.37, 4.93], 4.35, 4.42, 4.5],
    ['accent', [10.19, 9.77, 9.20, 8.45], 7.46, 7.57, 4.5],
    ['danger', [5.77, 5.53, 5.21, 4.79], null, null, 4.5],
    ['line-ctl', [3.95, 3.79, 3.57, 3.28], null, null, 3],
  ]
  for (const [fg, onSurf, onS4, onSubtle, min] of TABLE) {
    SURFACES.forEach((s, i) => {
      it(`${fg} on ${s} = ${onSurf[i].toFixed(2)} and >= ${min}`, () => {
        const c = contrast(tok(fg), tok(s))
        expect(c).toBeCloseTo(onSurf[i], 1)
        expect(Math.abs(c - onSurf[i])).toBeLessThan(0.011)
        expect(c).toBeGreaterThanOrEqual(min)
      })
    })
    if (onS4 !== null) {
      it(`${fg} on surface-4 = ${onS4.toFixed(2)}`, () => {
        const c = contrast(tok(fg), tok('surface-4'))
        expect(Math.abs(c - onS4)).toBeLessThan(0.011)
        // the one documented failure: ink-faint is never placed on surface-4 / accent-subtle
        if (fg === 'ink-faint') expect(c).toBeLessThan(4.5)
        else expect(c).toBeGreaterThanOrEqual(min)
      })
    }
    if (onSubtle !== null) {
      it(`${fg} on accent-subtle = ${onSubtle.toFixed(2)}`, () => {
        const c = contrast(tok(fg), accentSubtle())
        expect(Math.abs(c - onSubtle)).toBeLessThan(0.011)
        if (fg === 'ink-faint') expect(c).toBeLessThan(4.5)
        else expect(c).toBeGreaterThanOrEqual(min)
      })
    }
  }

  it('on-accent on accent = 9.70', () => {
    expect(Math.abs(contrast(tok('on-accent'), tok('accent')) - 9.7)).toBeLessThan(0.011)
  })
  it('white on danger-solid = 4.88 (>= 4.5)', () => {
    const c = contrast([255, 255, 255], tok('danger-solid'))
    expect(Math.abs(c - 4.88)).toBeLessThan(0.011)
    expect(c).toBeGreaterThanOrEqual(4.5)
  })
  it('HUD at alpha 0.86 over an H atom (#f2f2f2): ink 11.54, ink-dim 5.44; alpha 0.78 fails', () => {
    const h: RGB = hexToRgb('#f2f2f2')
    const hud: RGB = [10, 11, 13]
    const over = (a: number) => mix(hud, h, a)
    expect(Math.abs(contrast(tok('ink'), over(0.86)) - 11.54)).toBeLessThan(0.011)
    expect(Math.abs(contrast(tok('ink-dim'), over(0.86)) - 5.44)).toBeLessThan(0.011)
    expect(contrast(tok('ink-dim'), over(0.78))).toBeLessThan(4.5)
  })
})

describe('scene/theme.ts mirrors the CSS tokens (no separate tokens module)', () => {
  it('ACCENT, ACCENT_DIM, DANGER, WARN equal the @theme values', () => {
    expect(ACCENT.toLowerCase()).toBe(color('accent')?.toLowerCase())
    expect(ACCENT_DIM.toLowerCase()).toBe(color('accent-dim')?.toLowerCase())
    expect(DANGER.toLowerCase()).toBe(color('danger')?.toLowerCase())
    expect(WARN.toLowerCase()).toBe(color('warn')?.toLowerCase())
  })
  it('.viewport-bg uses exactly the theme.ts BG_CENTER and BG_EDGE (E.9)', () => {
    const m = css.match(/\.viewport-bg\s*\{([^}]*)\}/)
    expect(m, '.viewport-bg rule').not.toBeNull()
    const body = m![1].toLowerCase()
    expect(body).toContain(BG_CENTER.toLowerCase())
    expect(body).toContain(BG_EDGE.toLowerCase())
  })
})

describe('checklist #27: no hard-coded colours / one stroke width in src/ui', () => {
  const files = Object.keys(UI_SOURCES)
  const src = (f: string) => UI_SOURCES[f]
  it('the UI sources are found', () => { expect(files.length).toBeGreaterThan(5) })

  it('src/ui/**/*.tsx contains no hex colour literal', () => {
    const hits: string[] = []
    for (const f of files) {
      src(f).split('\n').forEach((line, i) => {
        if (/#[0-9a-fA-F]{3,8}\b/.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`)
      })
    }
    expect(hits).toEqual([])
  })

  it('every strokeWidth in src/ui is 1.75', () => {
    const bad: string[] = []
    for (const f of files) {
      src(f).split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/strokeWidth\s*=\s*\{?\s*([0-9.]+)/g))
          if (Number(m[1]) !== 1.75) bad.push(`${f}:${i + 1}: strokeWidth ${m[1]}`)
      })
    }
    expect(bad).toEqual([])
  })

  it('src/ui and index.css carry no gradient / backdrop-filter / pure black-white (except .viewport-bg)', () => {
    const offenders: string[] = []
    const scan = (name: string, text: string) =>
      text.split('\n').forEach((line, i) => {
        if (/backdrop-(blur|filter)|shadow-\[0_0|#000\b|#fff\b/i.test(line) || /gradient/.test(line)) {
          if (!/viewport-bg/.test(line)) offenders.push(`${name}:${i + 1}: ${line.trim()}`)
        }
      })
    for (const f of files) scan(f, src(f))
    // index.css: the only gradient allowed is inside the .viewport-bg rule
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\.viewport-bg\s*\{[^}]*\}/g, '')
    scan('src/index.css', stripped)
    expect(offenders).toEqual([])
  })
})
