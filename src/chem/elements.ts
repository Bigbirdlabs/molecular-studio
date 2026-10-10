/** The 14 elements the app models. Anything else is rejected at every entry path (see isKnownElement). */
export type ElementSymbol = 'H' | 'B' | 'C' | 'N' | 'O' | 'F' | 'Na' | 'Mg' | 'Si' | 'P' | 'S' | 'Cl' | 'Br' | 'I'

/**
 * One element record. Provenance of each field (SPEC A.1):
 *  - mass       IUPAC CIAAW standard atomic weights 2021 (abridged; intervals in nature for H, B, C, N, O, Mg, Si, S, Cl, Br).
 *               I = 126.904 is the standard value, not the abridged 126.90.
 *  - mono       monoisotopic mass of the most abundant isotope, u (AME2020 via NIST "Atomic Weights and Isotopic
 *               Compositions"); values copied from SPEC A1.5, NIST page check date 2026-10-10 (not re-fetched by code).
 *  - color      Jmol palette (jmol.sourceforge.net/jscolors); H and O softened for the dark UI (Jmol #FFFFFF / #FF0D0D)
 *  - covalent   Cordero et al., Dalton Trans. 2008, 2832 (doi:10.1039/b801115j); C = 0.76 is the sp3 value
 *  - vdw        Bondi, J. Phys. Chem. 1964, 68, 441; B from Mantina et al., J. Phys. Chem. A 2009, 113, 5806
 *  - en         Pauling scale (CRC Handbook of Chemistry and Physics)
 *  - valences   neutral textbook valences, lowest first (allowedValences() adds the formal-charge shift)
 */
export interface Element {
  z: number // atomic number
  symbol: ElementSymbol
  name: string // Turkish name
  nameEn: string // English name
  mass: number // standard atomic weight, g/mol
  mono: number // monoisotopic mass, u
  color: string // Jmol palette (H and O softened)
  covalent: number // covalent radius, Å
  vdw: number // van der Waals radius, Å
  valences: number[] // allowed neutral valences, lowest first
  en: number // Pauling electronegativity
  category: string // Turkish category
  categoryEn: string // English category
}

/** Thrown by el() for a symbol the app does not model. Never silently replaced by another element. */
export class UnknownElementError extends Error {
  readonly symbol: string
  constructor(symbol: string) {
    super(`Desteklenmeyen element: ${symbol}. Desteklenen: ${supportedElementsText()}`)
    this.name = 'UnknownElementError'
    this.symbol = symbol
  }
}

const CATEGORY_EN: Record<string, string> = {
  'Ametal': 'Nonmetal',
  'Yarı metal': 'Metalloid',
  'Halojen': 'Halogen',
  'Alkali metal': 'Alkali metal',
  'Toprak alkali': 'Alkaline earth metal',
}

const NAMES_EN: Record<string, string> = {
  H: 'Hydrogen', B: 'Boron', C: 'Carbon', N: 'Nitrogen', O: 'Oxygen', F: 'Fluorine', Na: 'Sodium',
  Mg: 'Magnesium', Si: 'Silicon', P: 'Phosphorus', S: 'Sulfur', Cl: 'Chlorine', Br: 'Bromine', I: 'Iodine',
}

const E = (
  z: number, symbol: ElementSymbol, name: string, mass: number, mono: number, color: string,
  covalent: number, vdw: number, valences: number[], en: number, category: string,
): Element => ({
  z, symbol, name, nameEn: NAMES_EN[symbol] ?? name, mass, mono, color, covalent, vdw, valences, en,
  category, categoryEn: CATEGORY_EN[category] ?? category,
})

export const ELEMENTS: Record<string, Element> = Object.fromEntries(
  [
    E(1, 'H', 'Hidrojen', 1.008, 1.00782503223, '#f2f2f2', 0.31, 1.2, [1], 2.2, 'Ametal'),
    E(5, 'B', 'Bor', 10.81, 11.00930536, '#ffb5b5', 0.84, 1.92, [3], 2.04, 'Yarı metal'),
    E(6, 'C', 'Karbon', 12.011, 12, '#909090', 0.76, 1.7, [4], 2.55, 'Ametal'),
    E(7, 'N', 'Azot', 14.007, 14.00307400443, '#3050f8', 0.71, 1.55, [3], 3.04, 'Ametal'), // neutral N is trivalent; N+ (4) comes from the charge shift
    E(8, 'O', 'Oksijen', 15.999, 15.99491461957, '#ff2d2d', 0.66, 1.52, [2], 3.44, 'Ametal'),
    E(9, 'F', 'Flor', 18.998, 18.99840316273, '#90e050', 0.57, 1.47, [1], 3.98, 'Halojen'),
    E(11, 'Na', 'Sodyum', 22.99, 22.9897692820, '#ab5cf2', 1.66, 2.27, [1], 0.93, 'Alkali metal'),
    E(12, 'Mg', 'Magnezyum', 24.305, 23.985041697, '#8aff00', 1.41, 1.73, [2], 1.31, 'Toprak alkali'),
    E(14, 'Si', 'Silisyum', 28.085, 27.97692653465, '#f0c8a0', 1.11, 2.1, [4], 1.9, 'Yarı metal'),
    E(15, 'P', 'Fosfor', 30.974, 30.97376199842, '#ff8000', 1.07, 1.8, [3, 5], 2.19, 'Ametal'),
    E(16, 'S', 'Kükürt', 32.06, 31.9720711744, '#ffff30', 1.05, 1.8, [2, 4, 6], 2.58, 'Ametal'),
    E(17, 'Cl', 'Klor', 35.45, 34.968852682, '#1ff01f', 1.02, 1.75, [1], 3.16, 'Halojen'),
    E(35, 'Br', 'Brom', 79.904, 78.9183376, '#a62929', 1.2, 1.85, [1], 2.96, 'Halojen'),
    E(53, 'I', 'İyot', 126.904, 126.9044719, '#940094', 1.39, 1.98, [1], 2.66, 'Halojen'),
  ].map((e) => [e.symbol, e]),
)

/** Elements offered in the editor palette, in display order. */
export const PALETTE = ['H', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I', 'Na', 'Mg', 'Si', 'B']

/** Comma-separated supported symbols in table order ("H, B, C, N, ..."), for error messages. */
export function supportedElementsText(): string {
  return Object.keys(ELEMENTS).join(', ')
}

/**
 * Valence electrons (main-group number). The single table for geometry.ts, properties.ts and anything else
 * that needs it (SPEC A1.4). Turkish label: değerlik elektronu.
 */
export const VALENCE_ELECTRONS: Record<string, number> = {
  H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Na: 1, Mg: 2, Si: 4, P: 5, S: 6, Cl: 7, Br: 7, I: 7,
}

/** Type guard: true only for elements the app models (own keys only; "__proto__", "toString", deuterium "D"/"T" are NOT known). */
export function isKnownElement(symbol: unknown): symbol is ElementSymbol {
  return typeof symbol === 'string' && Object.hasOwn(ELEMENTS, symbol)
}

/** Lookup that returns undefined for unknown symbols. */
export function getElement(symbol: string): Element | undefined {
  return Object.hasOwn(ELEMENTS, symbol) ? ELEMENTS[symbol] : undefined
}

/** Lookup that throws UnknownElementError for unknown symbols: no silent substitute element, ever. */
export function el(symbol: string): Element {
  const e = getElement(symbol)
  if (!e) throw new UnknownElementError(String(symbol))
  return e
}

export const BOND_NAMES = ['', 'Tekli bağ (σ)', 'Çift bağ (σ + π)', 'Üçlü bağ (σ + 2π)']
export const BOND_NAMES_EN = ['', 'Single bond (σ)', 'Double bond (σ + π)', 'Triple bond (σ + 2π)']
