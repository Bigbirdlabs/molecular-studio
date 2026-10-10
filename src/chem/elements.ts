export interface Element {
  z: number // atomic number
  symbol: string
  name: string // Turkish name
  nameEn: string // English name
  mass: number
  color: string // CPK colour
  covalent: number // covalent radius, Å
  vdw: number // van der Waals radius, Å
  valences: number[] // allowed neutral valences, lowest first
  en: number // Pauling electronegativity
  category: string // Turkish category
  categoryEn: string // English category
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
  z: number, symbol: string, name: string, mass: number, color: string,
  covalent: number, vdw: number, valences: number[], en: number, category: string,
): Element => ({
  z, symbol, name, nameEn: NAMES_EN[symbol] ?? name, mass, color, covalent, vdw, valences, en,
  category, categoryEn: CATEGORY_EN[category] ?? category,
})

export const ELEMENTS: Record<string, Element> = Object.fromEntries(
  [
    E(1, 'H', 'Hidrojen', 1.008, '#f2f2f2', 0.31, 1.2, [1], 2.2, 'Ametal'),
    E(5, 'B', 'Bor', 10.81, '#ffb5b5', 0.84, 1.92, [3], 2.04, 'Yarı metal'),
    E(6, 'C', 'Karbon', 12.011, '#909090', 0.76, 1.7, [4], 2.55, 'Ametal'),
    E(7, 'N', 'Azot', 14.007, '#3050f8', 0.71, 1.55, [3], 3.04, 'Ametal'), // neutral N is trivalent; N+ (4) comes from the charge shift
    E(8, 'O', 'Oksijen', 15.999, '#ff2d2d', 0.66, 1.52, [2], 3.44, 'Ametal'),
    E(9, 'F', 'Flor', 18.998, '#90e050', 0.57, 1.47, [1], 3.98, 'Halojen'),
    E(11, 'Na', 'Sodyum', 22.99, '#ab5cf2', 1.66, 2.27, [1], 0.93, 'Alkali metal'),
    E(12, 'Mg', 'Magnezyum', 24.305, '#8aff00', 1.41, 1.73, [2], 1.31, 'Toprak alkali'),
    E(14, 'Si', 'Silisyum', 28.085, '#f0c8a0', 1.11, 2.1, [4], 1.9, 'Yarı metal'),
    E(15, 'P', 'Fosfor', 30.974, '#ff8000', 1.07, 1.8, [3, 5], 2.19, 'Ametal'),
    E(16, 'S', 'Kükürt', 32.06, '#ffff30', 1.05, 1.8, [2, 4, 6], 2.58, 'Ametal'),
    E(17, 'Cl', 'Klor', 35.45, '#1ff01f', 1.02, 1.75, [1], 3.16, 'Halojen'),
    E(35, 'Br', 'Brom', 79.904, '#a62929', 1.2, 1.85, [1], 2.96, 'Halojen'),
    E(53, 'I', 'İyot', 126.904, '#940094', 1.39, 1.98, [1], 2.66, 'Halojen'),
  ].map((e) => [e.symbol, e]),
)

/** Elements offered in the editor palette, in display order. */
export const PALETTE = ['H', 'C', 'N', 'O', 'F', 'P', 'S', 'Cl', 'Br', 'I', 'Na', 'Mg', 'Si', 'B']

/** True only for elements the app models (own keys only; deuterium/tritium "D"/"T" are NOT known). */
export function isKnownElement(symbol: string): boolean {
  return Object.hasOwn(ELEMENTS, symbol)
}

/**
 * Lookup that never throws. NOTE: unknown symbols silently fall back to carbon, so callers that
 * accept external input (parsers) must check isKnownElement() first and reject unknown elements.
 */
export function el(symbol: string): Element {
  return Object.hasOwn(ELEMENTS, symbol) ? ELEMENTS[symbol] : ELEMENTS.C
}

export const BOND_NAMES = ['', 'Tekli bağ (σ)', 'Çift bağ (σ + π)', 'Üçlü bağ (σ + 2π)']
export const BOND_NAMES_EN = ['', 'Single bond (σ)', 'Double bond (σ + π)', 'Triple bond (σ + 2π)']
