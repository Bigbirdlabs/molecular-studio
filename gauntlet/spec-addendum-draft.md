# Enhancement Addendum (draft)

## A. Scientific reference data & computable properties

> This section extends SPEC §3D, §5 and §8. Wherever it could be read against SPEC, SPEC wins: never fabricate a value, give an honest disabled state instead of a guess, ship fewer features that are real, launch with methane. Every number shown in the UI must trace back to one of three things: (a) a cited reference table in `src/chem/`, (b) arithmetic on those tables, or (c) a measurement taken from the current atom coordinates. Each displayed value carries exactly one provenance class, and the class is visible (see A.5).

### A.1 Element table (`src/chem/elements.ts`): verdict and corrections

Audit result: all 14 entries match their reference sets. No numeric value needs to change. The work is provenance, fallback behaviour and two valence rules.

| Field | Source the code must cite in a comment | Status |
|---|---|---|
| `mass` | IUPAC CIAAW standard atomic weights 2021, abridged conventional values (ciaaw.org/atomic-weights.htm) | Correct for all 14. H, B, C, N, O, Mg, Si, S, Cl and Br are intervals in nature. The abridged value carries about ±0.001–0.01 uncertainty. |
| `covalent` | Cordero et al., *Dalton Trans.* 2008, 2832 (doi:10.1039/b801115j) | Correct. C = 0.76 is the sp³ value (sp² 0.73, sp 0.69). |
| `vdw` | Bondi, *J. Phys. Chem.* 1964, 68, 441. B from Mantina et al., *J. Phys. Chem. A* 2009, 113, 5806 | Correct and internally consistent. Do not mix in Alvarez 2013 values. |
| `en` | Pauling scale (CRC Handbook / WebElements) | Correct (H 2.20 … F 3.98). |
| `color` | Jmol palette (jmol.sourceforge.net/jscolors) | 12 of 14 are exact. H `#f2f2f2` (Jmol `#FFFFFF`) and O `#ff2d2d` (Jmol `#FF0D0D`) are softened. |

- **[MUST-v1] A1.1 No silent carbon fallback.** Today `el(symbol)` returns `ELEMENTS.C` for unknown symbols. An imported `Fe` would render as carbon and add 12.011 to the mass. Required changes:
  - Add `isKnownElement(sym): sym is ElementSymbol`.
  - Add `getElement(sym): Element | undefined`.
  - Make `el()` throw `UnknownElementError(sym)`.
  - Every way data enters a molecule (library loader, localStorage restore, URL hash, any file import) must check `isKnownElement` first. It rejects the whole structure with a Turkish message: `Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`.
  - *Verify:* a unit test checks that `el('Fe')` throws, and that restoring a stored molecule containing `Se` leaves the current molecule unchanged and surfaces the message.
- **[MUST-v1] A1.2 Nitrogen valence `[3, 5]` → `[3]`.** Neutral N has no valence 5 in this model. `allowedValences` already adds the charge, so N⁺ allows 4 and N⁻ allows 2. A nitro group must be drawn as N⁺(=O)O⁻.
  - *Verify:* a neutral N with bond-order sum 5 returns `valenceState === 'over'`.
  - *Verify:* every shipped library entry still validates with all atoms `'ok'`. Run this as a loop test over `library.ts`.
- **[MUST-v1] A1.3 `valenceElectrons` field** (group-based): H 1, B 3, C 4, N 5, O 6, F 7, Na 1, Mg 2, Si 4, P 5, S 6, Cl 7, Br 7, I 7. The lone-pair count in A.4 needs it. Turkish label: *değerlik elektronu*.
- **[MUST-v1] A1.4 Provenance comments.** Add a one-line source comment per field, using the table above. Rename the `// CPK colour` comment to `// Jmol palette; H and O softened for the dark UI (Jmol #FFFFFF / #FF0D0D)`. Any UI string that says "CPK" becomes "Jmol renk şeması".
- **[SHOULD-v1] A1.5 Monoisotopic mass field `mono`** (u, AME2020 via NIST "Atomic Weights and Isotopic Compositions"):
  - Values: ¹H 1.00782503223, ¹¹B 11.00930536, ¹²C 12 (exact), ¹⁴N 14.00307400443, ¹⁶O 15.99491461957, ¹⁹F 18.99840316273, ²³Na 22.9897692820, ²⁴Mg 23.985041697, ²⁸Si 27.97692653465, ³¹P 30.97376199842, ³²S 31.9720711744, ³⁵Cl 34.968852682, ⁷⁹Br 78.9183376, ¹²⁷I 126.9044719.
  - Gate: before merge, check each value against physics.nist.gov/cgi-bin/Compositions and record the check date in the comment.
- **[SHOULD-v1] A1.6 Hypervalent halogens.** Change Cl, Br and I valences to `[1, 3, 5, 7]` so that ClO₄⁻ and IO₃⁻ do not flag as over-valent. `missingHydrogens` keeps choosing the lowest fitting valence, so HCl and CH₃Br behave as before.
- **[SHOULD-v1] A1.7 Metal bonds.** For bonds that involve Na or Mg, the bond inspector shows `İyonik etkileşim (metal)` in place of a σ/π bond name.
- **[LATER]** Adding Li, Al, K, Ca and Se (scout values are listed, but none are verified yet). Transition metals stay out until a coordination model exists.

### A.2 Formula, mass and composition (`src/chem/molecule.ts`)

- **[MUST-v1] A2.1 Formula convention.** `formula()` stays strict Hill and is labelled `Hill sistemi`. Hill orders carbon-free formulas alphabetically (H₃N, O₂S, F₃B, H₂O₄S), which is not what a Turkish student expects. Add an exact lookup `CONVENTIONAL_FORMULA: Record<HillString, string>`. Initial entries cover at least H3N→NH₃, O2S→SO₂, F3B→BF₃, F6S→SF₆, H2O4S→H₂SO₄, H3O4P→H₃PO₄, ClH→HCl, ClNa→NaCl, H4N⁺→NH₄⁺, H3O⁺→H₃O⁺.
  - The conventional form is shown as the primary formula whenever the current composition matches a key, including after edits.
  - Hill appears in the tooltip.
  - Library descriptions must use conventional text. The ammonia entry currently reads "H₃N" and must be corrected.
- **[MUST-v1] A2.2 Incomplete structures are flagged, never silently reported.** Formula, mass and composition count only explicit atoms.
  - If the sum of `missingHydrogens` is greater than 0, the inspector shows `Yapı eksik: n H eksik — değerler çizilen atomlar içindir` next to the values, plus a `Hidrojenleri tamamla` action.
  - If any atom is `'over'`, it shows `Geçersiz değerlik: <element> (<used>/<max>)`.
  - *Verify:* a bare C₂ skeleton shows the "6 H eksik" note beside 24,02 g/mol.
- **[MUST-v1] A2.3 Display precision and locale.** Round at display time only, never in stored data. Format every number with `Intl.NumberFormat('tr-TR', {minimumFractionDigits: d, maximumFractionDigits: d})`, which gives a decimal comma. Use EN locale only when the UI language is EN.

| Quantity | d | Unit | Example (TR) |
|---|---|---|---|
| Average molar mass | 2 | g/mol | CH₄ `16,04 g/mol` |
| Atomic mass (inspector) | 3 (as tabulated) | u | C `12,011 u` |
| Monoisotopic mass [SHOULD-v1] | 4 | u | CH₄ `16,0313 u` |
| % mass composition | 2 | % | CH₄: C `74,87 %` |
| Distance / bond length | 3 | Å | `1,090 Å` |
| Angle / dihedral | 1 | ° | `109,5°` |
| ΔEN | 2 | — | C–H `0,35` |
| Coordinates | 3 | Å | — |

- **[MUST-v1] A2.4 Mass labelling.** The inspector label is `Mol kütlesi`. The tooltip reads `Standart atom kütlelerinden (IUPAC 2021, doğal izotop ortalaması)`. Electron mass is ignored for ions in the average molar mass, because it is below the shown precision.
- **[SHOULD-v1] A2.5 `exactMass(m)`** is the sum of `mono`, minus q × 0.000548580 u for charged species (CODATA 2018 electron mass). Label: `Monoizotopik kütle (en bol izotoplar)`. For Cl or Br the tooltip adds `M+2 piki belirgindir; en yoğun pik bu değer olmayabilir`. No isotope pattern is shown in v1.
- **[SHOULD-v1] A2.6 Mass composition by element (`Kütlece yüzde bileşim`).** Computed as count × mass / M. The percentages must sum to 100,00 ± 0,01.
- **[MUST-v1] A2.7 Replace the formula-based `unsaturation()`.** Its `Math.max(0, …)` clamp hides invalid results for ions, radicals and Na/Mg compounds. Use the exact graph value instead: `ringCount(m) + Σ(order − 1)` over Kekulé bonds. Label it `Doymamışlık derecesi (halka + π bağı)`. Benzene drawn with Kekulé bonds gives 4. CH₄ gives 0.

### A.3 Reference bond lengths (`idealBondLength`)

- **[MUST-v1] A3.1** Replace the formula (r_a + r_b) × {1, 0.875, 0.79] with a lookup keyed by sorted symbols, bond order and an aromatic flag. Values are in Å, from Allen et al., *J. Chem. Soc. Perkin Trans. 2* 1987, S1 (doi:10.1039/P298700000S1), cross-checked against NIST CCCBDB.
  - Keep the change backward compatible: `idealBondLength(sa, sb, order, aromatic = false)`.
  - Pairs not in the table fall back to the Cordero covalent sum for single bonds, with ×0.87 for double and ×0.78 for triple. Each fallback is logged once as `fallback`.

| Bond | Å | Bond | Å | Bond | Å |
|---|---|---|---|---|---|
| C–C | 1.54 | C–H | 1.09 | C–F | 1.35 |
| C=C | 1.34 | O–H | 0.96 | C–Cl | 1.77 |
| C≡C | 1.20 | N–H | 1.01 | C–Br | 1.94 |
| C⋯C aromatic | 1.39 | S–H | 1.34 | C–I | 2.14 |
| C–O | 1.43 | C–N | 1.47 | C–S | 1.82 |
| C=O | 1.22 | C=N | 1.28 | N=O | 1.21 |
| C≡N | 1.16 | N–N | 1.45 | N=N | 1.25 |
| O–O | 1.48 | P–H | 1.42 | Si–H | 1.48 |
| Si–C | 1.87 | H–H | 0.74 | | |

- **[MUST-v1] A3.2** Any geometry produced by `placeNewAtom` or `relaxStep` is labelled `İdealize (optimize edilmemiş)` in the inspector. It is never called an optimised or energy-minimised geometry (SPEC §8).

### A.4 Geometry: reference molecules and VSEPR

- **[MUST-v1] A4.1 The core demo molecules must reproduce experiment.** `library.ts` takes most coordinates from PubChem 3D conformers, which are computed (MMFF94-type), not experimental. Measured from the current presets:
  - water: O–H 0.969 Å and 104.0°, against a cited 104.5°
  - ammonia: 1.019 Å and 106.0°
  - CO₂: C=O 1.197 Å, against an experimental 1.162 Å

  The demo shows these numbers, so for the molecules below the coordinates must be generated from the gas-phase experimental parameters (NIST CCCBDB, cccbdb.nist.gov, experimental geometry). The inspector's measured value then has to match the reference within ±0.005 Å and ±0.3°.

| Molecule | Parameters to build from |
|---|---|
| CH₄ | C–H 1.087 (the current 1.09 is acceptable), H–C–H 109.47° |
| H₂O | O–H 0.958, H–O–H 104.5° (104.48) |
| NH₃ | N–H 1.012, H–N–H 106.7° (do not use 107.8°, which has no source) |
| CO₂ | C=O 1.162, 180° |
| C₂H₄ | C=C 1.339, C–H 1.087, H–C–H 117.4° |
| C₂H₂ | C≡C 1.203, C–H 1.063, 180° |
| BF₃ | keep the library value of 1.313 (cited) |
| C₆H₆ | C–C 1.397, C–H 1.084, 120° |

All other library entries keep their PubChem coordinates, but their description must say `Koordinatlar: PubChem 3B konformeri (hesaplanmış)`. Angle claims in descriptions must match either the coordinates or a cited source. Write the CCCBDB check date in a comment.

- **[MUST-v1] A4.2 Lone pairs and the geometry card.** For a selected non-H atom:
  - Lone pairs: `LP = (valenceElectrons − charge − Σ bond orders) / 2`.
  - Electron groups (sterik sayı): `SN = σ-neighbours + LP`.
  - If LP is not a non-negative integer (a radical or invalid state), or if SN is not in 2–4, the card shows `hesaplanamadı` and nothing else.
  - Ideal angles are those of the electron-pair geometry. For AX₃E and AX₂E₂ the card shows `< 109,5°`, never an invented number.
  - Measured angle: the mean of the neighbour–centre–neighbour angles from the current coordinates, plus the minimum and maximum when they differ by more than 0.5°.

| SN | Notation | Molecular geometry (TR) | Ideal angle | Hybridisation (tahmini; C, N, O, B only) |
|---|---|---|---|---|
| 2 | AX₂ | doğrusal | 180° | sp |
| 3 | AX₃ | düzlem üçgen | 120° | sp² |
| 3 | AX₂E | kırık doğru (açısal) | < 120° | sp² |
| 4 | AX₄ | düzgün dörtyüzlü | 109,5° | sp³ |
| 4 | AX₃E | üçgen piramit | < 109,5° | sp³ |
| 4 | AX₂E₂ | kırık doğru (açısal) | < 109,5° | sp³ |

- **[SHOULD-v1] A4.3 SN 5 and 6** (PF₅, SF₆): show `üçgen çift piramit` (90°/120°) and `düzgün sekizyüzlü` (90°) with a `yaklaşık` badge. No sp³d or sp³d² labels, since hypervalent hybridisation is not supported by modern bonding theory. AX₄E, AX₃E₂ and the other lone-pair cases with SN 5–6 are `hesaplanamadı` in v1.
- **[MUST-v1] A4.4 Angle convention.** Anywhere a reference angle appears next to a measured one, it reads `Ölçülen 104,5° · İdeal (VSEPR) < 109,5° · Deneysel 104,5° (CCCBDB)`. The deneysel value appears only for molecules listed in A4.1. One number is never presented as both ideal and real.
- **[SHOULD-v1] A4.5 Bond polarity.** Per-bond ΔEN to 2 decimals, with δ+ and δ− badges on the bonded atoms. The class uses stated thresholds: ΔEN < 0,4 `apolar kovalent`, 0,4–1,7 `polar kovalent`, > 1,7 `iyonik karakter baskın`. Each class shows the badge `kural (yaklaşık)`.
- **[LATER]** A molecule-level polar/apolar verdict. A vector sum of bond dipoles from ΔEN gives the wrong answer for O₃ (ΔEN 0, but polar at 0.53 D) and for CO (reversed sign), so it is not exact.

### A.5 Property classification (badge `Hesaplanan` / `Ölçülen` / `Tahmini`; omitted items stay hidden or disabled)

| Class | Properties |
|---|---|
| **Exact: Hesaplanan** [MUST-v1] | Atom and bond counts; Hill and conventional formula; average molar mass; formal charge sum; ring count; DoU (graph); valence state and missing-H count; bond order name (σ/π); atomic number and atomic mass; vdW and covalent radii (render) |
| **Exact: Ölçülen** [MUST-v1] | Distance, angle and dihedral from current coordinates (IUPAC sign convention). Tooltip: `mevcut koordinatlardan` |
| **Exact** [SHOULD-v1] | Monoisotopic mass; % mass composition; per-bond ΔEN |
| **Approximate: Tahmini** [MUST-v1 / SHOULD-v1] | VSEPR geometry and hybridisation for SN 2–4 (MUST); SN 5–6 (SHOULD); idealised placement lengths (MUST); polar-bond class (SHOULD) |
| **Omitted in v1** | Dipole moment and molecular polarity; partial charges (Gasteiger); energies or "optimised" geometry; logP, TPSA, pKa; R/S chirality; automatic aromaticity detection (trust only library flags); isotope pattern; melting point, boiling point, solubility (the description prose may cite them only with a source) |

- **[MUST-v1] A5.1** An omitted property never appears as a number, a placeholder value or a progress bar. When a control for it exists, it is disabled with the tooltip `Bu sürümde güvenilir biçimde hesaplanamıyor`.

### A.6 Turkish terminology (`src/i18n/strings.ts`, a single dictionary) [MUST-v1]

| TR (UI) | EN | Note |
|---|---|---|
| Molekül formülü (kapalı formül) | Molecular formula | MEB primary term. "kapalı formül" is secondary. |
| Mol kütlesi | Molar mass (g/mol) | "Molekül kütlesi" is the u-scale term. Do not mix them. |
| Atom kütlesi · Atom numarası | Atomic mass · Atomic number | |
| Monoizotopik kütle | Monoisotopic mass | Mass-spectrometry usage. Verify with a teacher. |
| Kütlece yüzde bileşim | Mass composition | |
| Bağ uzunluğu · Bağ açısı · Dihedral (torsiyon) açısı | Bond length · angle · dihedral | |
| Tekli / Çift / Üçlü bağ (σ, σ+π, σ+2π) · Aromatik bağ (delokalize π) | Single / double / triple · aromatic bond | "Aromatik" needs teacher review. |
| Değerlik elektronu · Bağ yapma kapasitesi | Valence electrons · bonding capacity | Never use bare "değerlik". |
| Ortaklanmamış / bağlayıcı elektron çifti | Lone / bonding pair | MEB grade 12 |
| Elektron grubu sayısı (sterik sayı) · VSEPR (AXₙEₘ) | Steric number | |
| Hibritleşme (sp, sp², sp³) | Hybridisation | Variant: melezleşme |
| doğrusal · düzlem üçgen · düzgün dörtyüzlü · üçgen piramit · kırık doğru (açısal) | Geometry names | |
| Elektronegatiflik (farkı, ΔEN) · polar / apolar kovalent bağ · kısmi yük (δ+/δ−) | | |
| Formal yük · Halka sayısı · Doymamışlık derecesi | | |
| Kovalent yarıçap · Van der Waals yarıçapı | | |

- **[MUST-v1] A6.1** Use `toLocaleUpperCase('tr-TR')` and never CSS `text-transform: uppercase` on Turkish strings, so that i becomes İ. Formulas render with Unicode subscripts and superscripts (H₂O, NH₄⁺).
- **[SHOULD-v1] A6.2** One review pass of `strings.ts` against a MEB grade 9–12 kimya textbook or by a native-speaker chemistry teacher. Record the result in a comment.

### A.7 Scientific test oracles (`src/chem/__tests__/science.test.ts`, run by `npm test`) [MUST-v1]

The values below come from the A.1 tables (2-decimal checks use the A2.3 formatter, giving TR strings).

1. Molar mass: CH₄ 16,04 · H₂O 18,02 · NH₃ 17,03 · CO₂ 44,01 · C₂H₄ 28,05 · C₂H₂ 26,04 · C₆H₆ 78,11 · C₂H₅OH 46,07 · BF₃ 67,80 · SF₆ 146,05. Raw values match to 1e-9: CH₄ 16.043, H₂O 18.015.
2. [SHOULD-v1] Monoisotopic mass: CH₄ 16,0313 · H₂O 18,0106 · NH₃ 17,0265 · CO₂ 43,9898 · C₆H₆ 78,0470.
3. Composition: CH₄ gives C 74,87 % and H 25,13 %. H₂O gives H 11,19 %. Every molecule sums to 100 ± 0,01.
4. Formula: methane() gives `CH₄`. Glycine gives Hill `C₂H₅NO₂`. Ammonia shows `NH₃` as primary and `H₃N` as Hill. SO₂ shows `SO₂` with Hill `O₂S`.
5. DoU: CH₄ 0, C₂H₄ 1, C₂H₂ 2, C₆H₆ 4, cyclohexane 1, CO₂ 2.
6. methane(): all four C–H = 1.090 ± 0.001 Å. All six H–C–H = 109.47 ± 0.01°. The geometry card reads AX₄, düzgün dörtyüzlü, sp³, LP 0.
7. A4.1 molecules: measured values match the table within ±0.005 Å and ±0.3°. H₂O card: AX₂E₂, LP 2, kırık doğru. NH₃: AX₃E, LP 1. CO₂ carbon: AX₂, doğrusal. BF₃ boron: AX₃, düzlem üçgen.
8. `idealBondLength('C','C',1,true)` = 1.39. `('C','O',2)` = 1.22. `('C','H',1)` = 1.09.
9. `dihedralDeg([1,0,0],[0,0,0],[0,0,1],[0,1,1])` = +90.0 ± 1e-9.
10. Valence: neutral 5-bond N → `'over'`. NH₄⁺ (charge +1, 4 bonds) → `'ok'`. Every library atom → `'ok'`.
11. `el('Fe')` throws. `isKnownElement('Se') === false`.
12. Element table snapshot: the 14 `mass`, `covalent`, `vdw` and `en` values equal the A.1 sources exactly. Any edit fails the test until the citation is updated.

## B. Interaction model & editor UX

> Extends SPEC §3B/§3C/§6/§7/§8. Where this addendum and SPEC disagree, SPEC wins. Every behaviour below is derived from `store.ts` actions that already exist; anything that needs a new store action is listed in **B.11**. Numbers are formatted with `Intl.NumberFormat(language === 'tr' ? 'tr-TR' : 'en-US')`, so Turkish shows `1,09 Å` and `16,04 g/mol`.

### B.1 Pointer grammar shared by every tool
- **[MUST-v1] Click vs drag.** A pointer-up counts as a *click* only if the pointer moved less than **4 CSS px** (mouse/pen) or **10 CSS px** (touch) since pointer-down, and less than 400 ms passed. Anything else is a *drag*. After a camera drag the scene must call none of `clickAtom`, `clickBond` or `clickEmpty`, so orbiting never selects, deselects or places an atom. *Verify:* in the Atom tool, orbit with a 30 px drag that starts on empty space. The atom count is unchanged and there is no undo entry.
- **[MUST-v1] Buttons are the same in every tool.** The wheel or pinch zooms. Right-drag or two-finger drag pans. Middle-drag dollies. Left-drag on **empty space** orbits in every tool except Pan and Zoom, where it pans or dollies. Set `touch-action: none` on the canvas only, never globally.
- **[MUST-v1] Pick targets.** Each atom has an invisible pick sphere with radius = max(visual radius, the world size of **12 px** on screen) on fine pointers, or **22 px** on `(pointer: coarse)`. That gives targets of at least 24 px and 44 px (WCAG 2.2 SC 2.5.8 sets 24 px as the AA minimum: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Recompute when the camera distance changes. Bond pick cylinders are at least 8 px wide on screen. When an atom and a bond overlap, the atom wins.
- **[MUST-v1] Nothing depends on hover or right-click alone.** Every hover tooltip has a tap/inspector equivalent. Every right-click action also exists in a tool or the inspector.

### B.2 The eight tools (left toolbar, SPEC §3B)
Active state: a filled icon tile, a 2 px accent bar on the inner edge, and `aria-pressed="true"`. The tooltip shows the name and key, e.g. "Seç (V)". The cursor changes on hover over the canvas.

| Tool (key) | Click atom | Click bond | Click empty | Left-drag from atom | Cursor |
|---|---|---|---|---|---|
| Seç / Select (V) | Replace the selection with that atom. Shift, Ctrl or Cmd toggles it (`clickAtom(id, true)`) | Select the bond (clears atom selection) | Clear the selection | Move the atom on a screen-parallel plane; terminal H follow; **one** undo step per drag (`beginDrag`/`dragAtom`/`endDrag`) | `default`, `pointer` over an atom, `grabbing` while dragging |
| Döndür / Rotate (R) | — | — | — | Orbit | `grab` / `grabbing` |
| Kaydır / Pan (P) | — | — | — | Pan | `move` |
| Yakınlaştır / Zoom (Z) | — | — | — | Vertical drag dollies (up = in, 200 px = 2×) | `zoom-in` |
| Atom Ekle (A) | An H with element ≠ H is replaced by the element. Otherwise grow a new atom from it, reusing an H slot (`growFrom`) | Cycle the order 1→2→3→1 | Place the active element at the ray hit on the screen-parallel plane through the molecule centroid, or at the origin if the molecule is empty | Drag-to-bond (B.3) | `crosshair` |
| Bağ Ekle (B) | First click arms it (`pendingBondFrom`). Second click on another atom creates the bond or sets its order. Clicking the same atom disarms it | Set to the active order; if it already has that order, cycle | Disarm | Drag-to-bond (B.3) | `crosshair` |
| Sil / Delete (X) | Delete the atom and its terminal H (`deleteAtoms`) | Delete the bond | Clear the selection | Orbit (the delete tool never drags atoms) | `crosshair`; the hover outline uses the danger token |
| Ölç / Measure (M) | Append to the chain (max 4). Clicking an atom already in the chain, or a 5th atom, starts a new chain at that atom | Ignored | Clear the chain | Orbit | `crosshair` |

- **[MUST-v1]** Camera tools never edit or select (as `store.ts` already enforces). Switching tools clears `pendingBondFrom` and, unless you switch to Measure, the measure chain (`setTool`). The selection is kept.
- **[MUST-v1] Contextual options bar.** A slim floating bar at the top-left of the viewport (≤ 40 px tall, one row, hidden for camera tools) shows controls for the active tool:
  - **Atom:** the `PALETTE` strip (14 elements, CPK swatch + symbol, active element ringed), bond order 1/2/3, and an **Oto-H** switch bound to `autoH`.
  - **Bond:** order 1/2/3 and the hint "İlk atomu seçin" or "İkinci atomu seçin · Esc iptal".
  - **Measure:** a live readout (B.6) and a "Temizle" button.
  - **Delete:** "Silmek için atom veya bağa tıklayın".

  The full periodic table is **[LATER]**: `elements.ts` has only 14 elements, so a table that is 87 % disabled would be noise.
- **[MUST-v1] Honest dependency gate.** `chem/geometry.ts` is currently a stub (`adjustHydrogens` and `relaxStep` do nothing). Until the real module lands, the Oto-H switch is rendered **disabled** with the tooltip "Henüz kullanılamıyor", and the clean-up action is disabled. Otherwise `cleanUp` would report "Geometri optimize edildi" while nothing moved. Once relaxation is real, label it "Geometriyi düzenle (basit gevşetme)". Never call it an energy minimisation unless a force field is actually implemented.

### B.3 Atom/bond creation gestures
- **[MUST-v1] Click-to-grow** (already in the store). *Verify:* on methane, choose the Atom tool and press Shift+O, then click one H. The formula becomes **CH₄O** and the mass **32,04 g/mol** (12.011 + 4×1.008 + 15.999; IUPAC standard atomic weights, https://www.ciaaw.org/atomic-weights.htm). This assumes `adjustHydrogens` is live. With the stub you get CH₃O at 31,03 g/mol, and the new C–O bond measures **1,42 Å** (covalent radii C 0.76 + O 0.66, Cordero et al., *Dalton Trans.* 2008, doi:10.1039/b801115j; the experimental methanol C–O is 1.427 Å, NIST CCCBDB https://cccbdb.nist.gov/).
- **[MUST-v1] Drag-to-bond** (Atom and Bond tools). Pointer-down on atom S, then move past the drag threshold:
  1. A ghost bond (35 % opacity, active order) and a ghost atom of the active element appear. The ghost atom sits at **idealBondLength(S, element, order)** from S along the cursor direction, projected onto the screen-parallel plane through S. It does not follow the cursor's depth, so bond lengths stay chemically sane however far you drag.
  2. If the cursor is inside another atom T's pick sphere, or within 16 px of it, the ghost snaps to T and T gets the hover outline.
  3. A chip near the cursor reads "C–O · 1,42 Å", or "C→N (mevcut atom)" when snapped.
  4. Live validity feedback:
     - If S or T is an H that already has a bond, the ghost turns danger-red, the chip says "Hidrojen yalnızca bir bağ yapabilir", and release does nothing.
     - If the bond would push S or T over its valence, the ghost turns red with "Değerlik aşılacak". Release is still allowed, and the store's `valenceExceeded` toast fires (current store semantics).
  5. On release: snapped means bond S–T (set the order if the bond exists); free means a new atom at the ghost position. This is exactly one `commit()`.
  6. Releasing inside S's own pick sphere is treated as a click. Esc during the drag cancels with no commit.

  *Verify:* the undo stack grows by exactly 1 per completed drag, and by 0 after an Esc-cancelled drag.
- **[SHOULD-v1]** In the Atom tool, hovering over empty space shows a 30 %-opacity ghost sphere of the active element at the placement point (fine pointers only).
- **[SHOULD-v1]** In the Atom and Bond tools, right-click with no movement on an atom or bond deletes it (Avogadro convention, https://avogadro.cc/docs/tools/draw-tool). Right-*drag* still pans.

### B.4 Hover, selection and focus
- **[MUST-v1] One accent, two strengths, never recolour.** Atoms always keep their CPK colour.
  - Hover: an outline at 40 % accent opacity, 1.5 px.
  - Selected: a 100 % accent outline at 2.5 px, plus a faint halo shell (back-face sphere, 1.15× radius, 12 % opacity) that scales in once over 150 ms. There is no continuous pulse, per SPEC §6 "avoid unnecessary animation loops".
  - Bonds follow the same rules (`hoveredBond`, `selectedBond`).
  - The Delete tool's hover uses the danger token instead of the accent.
  - The armed atom (`pendingBondFrom`) gets a static dashed ring plus a rubber-band dashed line to the cursor.
  - The measure chain uses numbered badges ①–④ above each atom.
- **[MUST-v1] Hover tooltip** (fine pointers, 350 ms delay, hidden during any drag). An atom shows "O · Oksijen · 2/2 bağ", plus "· yük −1" if charged. A bond shows "C–H · Tekli bağ (σ) · 1,09 Å", using `BOND_NAMES`. On touch, a tap selects and the bottom sheet shows the same data.
- **[MUST-v1] Valence ring.** An atom whose `valenceState` is `over` shows a thin danger ring in every tool. `under` shows a dashed amber ring only when `autoH` is off, because with Oto-H on, under-valence is filled automatically. The tooltip and inspector explain it, e.g. "C atomu en fazla 4 bağ yapabilir (şu an 5)".
- **[MUST-v1] Keyboard focus.** The canvas is focusable (`tabIndex=0`) and shows a 2 px inset accent ring on `:focus-visible`. The toolbar is `role="toolbar"`, `aria-orientation="vertical"`, with roving tabindex and ↑/↓ to move. An sr-only `aria-live="polite"` region announces selection and edit results, e.g. "Seçildi: C, Karbon, 4 bağ" or "O atomu eklendi".
- **[SHOULD-v1]** A "Fragmanı seç" button in the atom inspector card calls `setSelection(component)` using `connectedComponents`. The rectangle marquee in the Select tool, drag on empty space with Shift to add, is **[SHOULD-v1]** only if orbit moves to right-drag in Select. Otherwise it is **[LATER]**.

### B.5 Camera behaviours
- **[MUST-v1] Double-click (or double-tap: ≤ 300 ms apart, ≤ 12 px) on an atom** in the Select, Rotate, Pan, Zoom or Measure tools animates the orbit target to that atom over **250 ms ease-out-cubic** and keeps the current distance. **Double-click on empty space** fits the whole molecule (`fitNonce`). The edit tools (Atom, Bond, Delete) do not bind double-click, because each click there is an edit.
- **[MUST-v1] F** frames the selection (the bounding sphere of selected atoms with 1.3× margin), or the whole molecule if nothing is selected. **Home** resets to the default view (`resetCamera`). An on-canvas "Sığdır" button sits in the bottom-right viewport overlay.
- **[MUST-v1] Reduced motion.** When `reducedMotion` is true, every camera transition is an instant jump. Animations call `invalidate()` and work under `frameloop="demand"`. The canvas DPR is `Math.min(devicePixelRatio, 2)`.
- **[SHOULD-v1] Orbit pivot marker.** While an orbit drag is active, and for 600 ms afterwards, a 3-line cross (0.15 Å, 50 % opacity) marks the orbit target, so users see what they rotate around.
- **[SHOULD-v1] Axis gizmo.** drei `GizmoHelper` + `GizmoViewport` in the top-right, 72 px, with muted axis colours (desaturated red/green/blue at about 55 % saturation, labels in the UI text colour). Clicking an axis animates to that view (250 ms). Clicking the same axis again flips to the opposite side. It is hidden below 640 px width. *Justification:* molecule viewers like Mol*, 3Dmol and MolView offer no orientation reference, and one is needed for editing in 3D.
- **[SHOULD-v1] Entrance turntable.** On a pristine launch, auto-rotate at 0.25 rad/s for at most 6 s. It stops for good on the first pointerdown, wheel or keydown, and is skipped entirely under reduced motion.
- **[MUST-v1]** An orientation change or a viewport resize of more than 20 % in width re-fits the camera.

### B.6 Measurement UX
- **[MUST-v1] Progressive chain** (store `measure[]`): 2 atoms give a distance, 3 an angle (the 2nd atom is the vertex), 4 a dihedral (signed, range (−180°, 180°], `dihedralDeg`). The numbers come only from `dist`, `angleDeg` and `dihedralDeg` on model coordinates. The readout carries the footnote "Model koordinatlarından ölçülmüştür", which states that the values are measured, not computed.
- **[MUST-v1] In-scene drawing.**
  - Each consecutive pair gets a dashed line (dash 0.08 Å, gap 0.06 Å) and an HTML billboard label at its midpoint: distance to **0.01 Å** ("1,09 Å").
  - An angle gets a translucent arc wedge at the vertex with radius 0.35 × the shorter arm, labelled to **0.1°** ("109,5°").
  - A dihedral gets a label "φ = −120,0°" at the midpoint of the central pair.
  - Labels recompute every frame from `mol`, so they update live while atoms are dragged.
- **[MUST-v1]** The options bar and status bar show the running state: "1/4 atom seçildi", then "Mesafe 1,09 Å · Açı 109,5°". Esc or a click on empty space clears the chain.
- *Verify on launch methane* (C at the origin, C–H 1.09 Å, tetrahedral, `methane()`):
  - H–C gives **1,09 Å** (experimental 1.087 Å, NIST CCCBDB).
  - H–C–H gives **109,5°** (ideal tetrahedral angle arccos(−1/3) = 109.47°).
  - H2–C1–H3–H4 (atom ids) gives **φ = −120,0°**.
- **[SHOULD-v1]** Backspace in Measure removes the last pick (needs `popMeasure`). A "Sabitle" (pin) button keeps the measurement visible after leaving the tool (needs `pinnedMeasures`). Next to an angle, show "ideal 109,5°" **only** when the vertex hybridisation function elsewhere in this addendum is implemented and returns a value. Otherwise show nothing.

### B.7 Keyboard map (single source of truth)
- **[MUST-v1]** One `keymap.ts` table drives the key handler, the toolbar tooltips and the `?` cheat-sheet dialog (`uiStore` `'shortcuts'`), so the cheat sheet can never disagree with the behaviour.
- **[MUST-v1] Ignored keys.** The handler ignores keys while focus is in an `input`, `textarea`, `[contenteditable]` or an open dialog (except Esc). It also ignores `e.repeat` for toggles.

| Keys | Action | Scope |
|---|---|---|
| `v` `r` `p` `z` `a` `b` `x` `m` | Select / Rotate / Pan / Zoom / Add Atom / Add Bond / Delete / Measure | always |
| **Uppercase letter** (Shift+letter) | Set element (`setElement`, which also switches to the Atom tool): `H B C N O F P S I` | always |
| …then a lowercase letter within **800 ms** | Upgrade to a two-letter symbol if it is valid: `Cl Br Na Mg Si`. Typing "Cl" works the way you type it. The completing letter is consumed and does not trigger its tool key. Validate with `symbol in ELEMENTS`, because `el()` silently falls back to C | always |
| `1` `2` `3` | Bond order (`setBondOrder`) | always (shown in the options bar) |
| `s` | Cycle style: ball-and-stick → space-filling → stick → wireframe | always |
| `l` / `h` | Toggle labels / hydrogen visibility | always |
| `f` / `Home` | Frame selection-or-all / reset camera | always |
| `+` / `-` | `zoomBy(1.25)` / `zoomBy(0.8)` | always |
| `Delete`, `Backspace` | `deleteSelection` (in Measure, Backspace = remove last pick [SHOULD]) | — |
| `Esc` | Priority chain: cancel drag ghost → disarm bond / clear measure chain → clear selection → switch to Select tool | — |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl+Y` | Undo / redo / redo | — |
| `Ctrl/Cmd+A`, `Ctrl/Cmd+Shift+A` | Select all / deselect | — |
| `Ctrl/Cmd+S` | `saveNow` (`preventDefault` stops the browser's save dialog) | — |
| `?` | Shortcut cheat sheet | — |

- **[SHOULD-v1]** With the canvas focused, the arrow keys orbit 15° per press and Shift+arrows pan 10 % of the view, for keyboard-only users.

### B.8 Undo semantics
- **[MUST-v1] One history entry per user intent.** That covers each click edit, each completed atom drag, each drag-to-bond, element change, charge change, order change, delete, add/remove-H, library load, clean-up (one entry at its start; Esc or Undo during relaxation cancels it via `relaxToken`), and molecule rename (`setName`). The history depth is 100 (`HISTORY_LIMIT`). Any new commit clears redo.
- **[MUST-v1] Never in history:** selection, hover, tool, element, bond order, style, camera, labels, measure chain and project name (`setProjectName`). `replaceMolecule` (launch, `?m=`) starts with an empty history.
- **[MUST-v1]** The Undo and Redo buttons in the top bar are visibly **disabled** when their stack is empty (SPEC §8 honest states). Their tooltips show the shortcut.
- **[SHOULD-v1] Labelled undo.** Each entry stores an i18n label code. The toast reads "Geri alındı: O atomu eklendi" or "Yinelendi: bağ silindi". This needs a `pastLabels` array kept in step with `past`.

### B.9 Empty, disabled and error states
- **[MUST-v1] Empty molecule** (`atoms.length === 0`). The viewport centre shows "Çalışma alanı boş" and the line "Bir element seçip tıklayın veya kütüphaneden molekül açın", with two real buttons: **Atom ekle** (`setTool('atom')`) and **Kütüphane** (`openDialog('library')`). The inspector shows formula "—", mass "—" (never `0 g/mol`), and 0 atoms / 0 bonds.
- **[MUST-v1] Invalid selection.** Ids that no longer exist are pruned (`prune`). The inspector never renders a stale atom card.
- **[MUST-v1] WebGL unavailable.** Replace the canvas with "Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor". The inspector and data stay usable, and the edit tools are disabled with that reason.
- **[MUST-v1] Context lost.** Show an overlay "3B görünüm yeniden başlatılıyor…" and keep the state. If `webglcontextrestored` does not fire within 3 s, show a "Yeniden yükle" button.
- **[MUST-v1] Save failure.** `saveStatus === 'error'` shows "Kaydedilemedi" in the top bar, with a tooltip explaining that browser storage is unavailable. Never show "Kaydedildi" unless a write succeeded.
- **[MUST-v1] Console.** No warnings during the B.10 script (SPEC §8).

### B.10 First 30 seconds (scripted judge path; rehearse at 1366×768 and 390×844)
- **[MUST-v1] Script.**
  1. **0–2 s.** Methane is visible, fitted, in ball-and-stick, with no spinner. The status bar reads "Top-çubuk · 5 atom · 4 bağ". The inspector shows **CH₄ · 16,04 g/mol** (12.011 + 4×1.008).
  2. **2–8 s.** Hover over C shows the outline and "C · Karbon · 4/4 bağ". Click it: the inspector shows Z = 6, 12,011 u, coordinates (0,000; 0,000; 0,000) Å.
  3. **8–15 s.** Press `m`, then click H, C, H. An arc appears with **109,5°**.
  4. **15–20 s.** Press `s`: space-filling, with radii easing 200 ms from covalent to vdW (`el().vdw`). Press `s` three more times to return to ball-and-stick.
  5. **20–27 s.** Press `a`, Shift+O, and click an H. The molecule becomes methanol, **CH₄O · 32,04 g/mol**.
  6. **27–30 s.** Ctrl+Z returns to CH₄, and the toast names the action.
- **[MUST-v1] Returning visitors.** A returning visitor gets the autosaved project (current store behaviour). For demos, use `?m=<methane library id>` to force the launch molecule.
- **[SHOULD-v1]** A one-time, non-blocking hint chip at the bottom-centre: "Çift tıkla: odaklan · ? kısayollar". It is dismissed on first interaction and remembered in `localStorage`.

### B.11 Differentiators (within SPEC scope) and required store deltas
- **[SHOULD-v1] Differentiators.**
  1. **Live valence-aware drag-to-bond** (B.3). The ghost shows the chemistry before you commit. Avogadro only reports after the edit.
  2. **Chemistry-native typing.** "Cl" is typed as Shift+C, l, and the cheat sheet is generated from the keymap.
  3. **Viewport polish from 3D tools.** Outline selection without recolouring, double-click focus, pivot marker, axis gizmo.
  4. **Labelled undo** (B.8). None of the reference viewers names undo steps.
- **Store additions** (`store.ts` is owned by others; request them, do not edit):
  - `bondAtoms(a, b)` and `growTo(parentId, pos)` for drag-to-bond [MUST-v1].
  - `focusRequest: { ids: number[]; nonce: number }` for double-click focus and F [MUST-v1].
  - `popMeasure()` and `pinnedMeasures` [SHOULD-v1].
  - `pastLabels`/`futureLabels` [SHOULD-v1].
- **[LATER]** Right-click/long-press context menu (Focus, Change element, Set charge, Select fragment, Measure from here, Delete), full periodic-table picker, rectangle marquee and group move, bond-centric length/torsion editing, standard-view hotkeys, perspective/ortho toggle, fragment templates.

## C. Rendering & performance

> Extends SPEC §3C, §4, §6 and §8. Where this section and SPEC disagree, SPEC wins. "Display radius" means a **visual convention**. It is never shown as a physical value in the inspector. Physical radii come only from `elements.ts`: covalent radii from Cordero et al. 2008, *Dalton Trans.* 2832; van der Waals (vdW) radii from Bondi 1964, *J. Phys. Chem.* 68, 441, with B from Mantina et al. 2009, *J. Phys. Chem. A* 113, 5806. CPK colours come only from `elements.ts` (Jmol palette, https://jmol.sourceforge.net/jscolors/).

### C1. Render modes (geometry must differ, SPEC §4)

| Mode (`RenderStyle`) | Atom display radius | Bond geometry | Notes |
|---|---|---|---|
| `ballstick` (launch default) | **0.23 × vdW** (H 0.276 Å, C 0.391 Å, O 0.350 Å) | Cylinder, r = **0.15 Å** | Jmol defaults: `percentVdwAtom 23`, bond radius 0.15 Å (https://chemapps.stolaf.edu/jmol/docs/#setpercentvdwatom) |
| `spacefill` | **1.00 × vdW** | Not drawn | Bond order is not visible in this mode, by design. Bonds stay pickable only through the inspector list. |
| `stick` (licorice) | **0.20 Å**, all elements | Cylinder, r = **0.20 Å** | The spheres act only as joint caps. |
| `wireframe` | No spheres | Screen-space lines, **1.5 CSS px** wide | An atom with zero bonds is drawn as a 3-axis cross, ±0.25 Å per axis, in its CPK colour |

- [MUST-v1] All four modes are derived from the same `Molecule` data. A mode switch changes only the instance scales and visibility, never the molecular data. The switch takes effect in the next rendered frame, with no remount of `<Canvas>`. **Verify:** switch modes 20 times. `gl.info.memory.geometries` must stay constant, and the camera pose must be unchanged.
- [MUST-v1] Bond halves. Each bond is drawn as two half-cylinders, each in the CPK colour of its own end atom. They split at the point equidistant from the two sphere surfaces, at `t = (rA + (L − rA − rB)/2) / L` along the bond from atom A, using the current display radii. In wireframe the split is at the midpoint.
- [MUST-v1] Multiple bonds, from `Bond.order`. Order 2 is drawn as two cylinders of radius 0.55·r_b, offset ±0.80·r_b from the bond axis. Order 3 is drawn as three cylinders of radius 0.45·r_b, offset 0 and ±1.10·r_b. The wireframe equivalents are parallel lines offset by ±0.08 Å (order 2) and 0 / ±0.11 Å (order 3).
  - The offset direction is perpendicular to the bond, lying in the plane of the bond and the first neighbour of either end atom (excluding the partner atom). If no such neighbour exists, use `cross(dir, +Y)`, or `cross(dir, +X)` when `dir` is within 5° of Y.
  - The direction is computed from the data and never from the camera, so it does not flip while orbiting. **Verify:** in ethene the two cylinders lie in the H–C–H plane.
- [SHOULD-v1] Aromatic bonds (`Bond.aromatic === true`, if the importer sets it) are drawn as one solid cylinder plus one dashed inner cylinder: 0.12 Å dash, 0.08 Å gap, offset toward the ring centroid. Do not infer aromaticity in the renderer.
- [MUST-v1] `showHydrogens = false` removes H atoms and any bond that touches an H from both the instance buffers and picking. Formula, mass and counts are unchanged (SPEC §5).
- [MUST-v1] Methane on launch (SPEC §4) has these properties:
  - The fit is oblique: azimuth 35°, elevation 22° from the +Z view, so that no C–H bond is eclipsed.
  - Perspective `fov = 35°`, `near = 0.05`, `far = 2000`.
  - All 4 H atoms are visible and none overlaps the C silhouette by more than 50% in the first frame (screenshot check).

### C2. Geometry, materials and lighting

- [MUST-v1] One shared `IcosahedronGeometry(1, d)` for atoms and one shared `CylinderGeometry(1, 1, 1, s, 1, true)` for bonds.
  - Note: in three r186 the triangle count is **20·(d+1)²** (`PolyhedronGeometry.subdivideFace`, `cols = detail + 1`). So d=5 gives 720 tris, d=3 gives 320, d=2 gives 180.
  - The LOD tiers are listed in C5.
- [MUST-v1] Material: one `MeshStandardMaterial({ roughness: 0.38, metalness: 0 })` per primitive type. Per-instance colour comes from `setColorAt(i, color.set(hex))`, which converts sRGB hex to linear through ColorManagement.
  - Call `setColorAt` for every slot of the allocated capacity **before the first render**. Otherwise the shader compiles without `USE_INSTANCING_COLOR`.
  - Set `instanceColor.needsUpdate = true` after every write.
- [MUST-v1] Tone mapping and colour: `gl={{ toneMapping: THREE.NeutralToneMapping, antialias: true, alpha: false, powerPreference: 'high-performance' }}`. R3F 9.8.1 forces ACES only when `glProps.toneMapping === undefined` (`events-*.esm.js:1615`), so passing the value explicitly overrides that. Keep `outputColorSpace` at sRGB.
  - **Verify:** the median pixel hue inside an O atom silhouette is within ±10° of the hue of `#ff2d2d`, and inside an N atom it is within ±10° of `#3050f8`.
- [MUST-v1] Lights. There are no shadow maps in v1.
  - **Key light:** one `DirectionalLight` (intensity 2.2, white), parented to the camera at camera-local (−1.2, 1.6, 1.0). Its `target` is also a camera child at (0, 0, −1), so the shading stays constant while orbiting.
  - **Fill light:** one `HemisphereLight` (sky `#dfe6ee`, ground `#1a1c20`, intensity 0.9).
  - Add the camera to the scene once so that its children render.
- [SHOULD-v1] A procedural reflection environment: drei `<Environment resolution={64} frames={1}>` with two `<Lightformer>` panels, `environmentIntensity` 0.3. Do **not** use `preset=` strings, because they fetch from a CDN and break offline (SPEC §8, avoidable errors).
- [MUST-v1] Background: a solid scene `<color attach="background">` equal to the viewport surface token (near-black, SPEC §2). No CSS gradient behind the canvas, and no glow or bloom (SPEC §2).
- [SHOULD-v1] Depth cue: linear `scene.fog` in the background colour. On fit and on every camera `update`, set `near = camDist − 0.6r` and `far = camDist + 4.0r`, where r is the fit-sphere radius. The rearmost atom is then blended at most about 35% into the background, so element colours stay identifiable. This is a Settings toggle, on by default. Measure lines and labels set `fog: false`.
- [SHOULD-v1] SSAO is the "High quality" toggle in Settings. It is the only feature that justifies a new dependency. See C9.
  - Configuration: `<EffectComposer multisampling={0} enableNormalPass={false}><N8AO screenSpaceRadius aoRadius={24} distanceFalloff={0.2} intensity={2.5} quality="medium" halfRes /><SMAA /><ToneMapping mode={ToneMappingMode.NEUTRAL} /></EffectComposer>`.
  - The composer is mounted only while the toggle is on, and `quality` is never changed at runtime (a change triggers a shader recompile).
  - Requires WebGL2. Without WebGL2 the toggle is disabled and its tooltip states why.
  - Default: on for fine-pointer devices with `hardwareConcurrency > 4`, off otherwise. Do not use `detect-gpu`, because it fetches benchmark data from a CDN.

### C3. Selection and hover rendering (outline, never recolour)

- [MUST-v1] Selection and hover **never alter the CPK colour** of the atom itself (identity must survive selection).
- [MUST-v1] Atom halo: a separate small `InstancedMesh` that reuses the atom geometry, with `MeshBasicMaterial({ side: BackSide, toneMapped: false, fog: false })`. Its count equals the selection size plus 1 for hover, and it is rebuilt only when `selection` or `hovered` changes.
  - Halo radius = `r_display + k·wpp`, where `wpp = 2·d·tan(fov/2) / viewportHeightPx` is the world size of one pixel at the atom's depth d.
  - Selected: k = 2.0 px, accent token, opacity 1.
  - Hover: k = 1.5 px, white, opacity 0.45.
  - Halo scales are recomputed in the controls `update` handler, which touches only the halo instances.
- [MUST-v1] Bond halo: the same technique on a halo cylinder for `selectedBond` and `hoveredBond`, with radius `r_b + k·wpp`. In wireframe, the selected bond is drawn instead as a 3 px accent line over the 1.5 px line.
- [MUST-v1] There is no pulsing or looping halo animation. A static ring keeps the demand frameloop idle (C6) and follows SPEC §6 "avoid unnecessary animation loops". Hover halos are never shown for `pointerType === 'touch'`.
- [MUST-v1] Measurement overlays, drawn in the scene:
  - Distance: drei `<Line dashed dashSize={0.1} gapSize={0.07} lineWidth={1.5}>` in the accent colour, with `depthTest={false}` and `renderOrder={10}`.
  - Angle: a 24-segment arc at radius 0.35 × the shorter arm.
  - Dihedral: an arc in the plane perpendicular to the central bond.
  - Values are DOM labels (C4), formatted with 2 decimals for Å and 1 decimal for degrees. They are computed from model coordinates only (SPEC §5).
- [LATER] A global Mol*-style silhouette outline pass (postprocessing `Outline`).

### C4. Instancing, picking and labels

- [MUST-v1] Buffers are allocated in chunks of **256 instances**. `mesh.count` equals the live instance count. A mesh is replaced, and `old.dispose()` called, only when the count exceeds capacity.
  - Each instanced mesh keeps an `ids: number[]` array mapping instance index to stable atom or bond id. It is rebuilt together with the matrices. **An instance index is never treated as an id.**
  - Matrices are written in `useLayoutEffect` on changes to `mol`, `style`, `showHydrogens` or the LOD tier. Use module-scope scratch `Matrix4`/`Quaternion`/`Vector3`/`Color` objects. For orientation, `quat.setFromUnitVectors(Y, dir)` and `scale.set(r, len, r)`.
  - After each write, set `instanceMatrix.needsUpdate = true` and call `invalidate()`.
- [MUST-v1] Set `frustumCulled = false` on every instanced mesh. In r186, `InstancedMesh` caches `boundingSphere` once and never recomputes it after matrix edits, so culling silently fails after edits. The scene is small enough that culling buys nothing.
- [MUST-v1] Picking is driven by the molecule data and does not depend on the visual meshes.
  - Visual meshes get `raycast = () => {}`.
  - Two invisible pick proxies implement `raycast(raycaster, hits)` in O(N):
    - **Atoms:** an analytic `ray.intersectSphere` test with pick radius `max(r_display, f·wpp)`, where f = 4 px for a fine pointer and **11 px for a coarse pointer** (a hit target of at least 22 px). In wireframe use `max(0.25 Å, f·wpp)`.
    - **Bonds:** a ray–capsule test with radius `max(r_b, 4·wpp)`. Bonds are not pickable in spacefill.
  - Each hit pushes `{ distance, point, object, instanceId }`. R3F sorts the hits by distance, so the nearest hit wins. Handlers call `e.stopPropagation()`.
  - Hidden atoms (H toggle off) are excluded.
- [MUST-v1] Click versus drag. A pointer-up with `e.delta ≤ 4 px` counts as a click. A larger movement is treated as camera or drag and does not select.
  - `onPointerMissed` with `delta ≤ 4` clears the selection.
  - Pointer-down on an atom in Select or edit tools calls `controls.enabled = false; controls.cancel()`. `cancel()` exists in camera-controls 3.1.2, `dist/camera-controls.module.js:1161`.
  - Pointer-up sets `controls.enabled = true`.
  - **Verify:** after dragging an atom, the camera position is bit-identical to its position before the drag.
- [MUST-v1] Labels and charges (`showLabels`, `showCharges`) are DOM overlays (drei `<Html>`, without `occlude`). They are never 3D text meshes, which the AO pass would render twice. Positions update only on rendered frames.
  - With more than 300 visible atoms, the labels toggle is disabled and its tooltip states the limit. It must not degrade silently.
- [MUST-v1] React render isolation. The atoms and bonds components subscribe only to `mol`, `style`, `showHydrogens` and the LOD tier, using zustand selectors. Hover and selection re-render only the halo component.
  - **Verify (React Profiler):** sweeping the cursor across 20 atoms commits only `Halo` and the HTML tooltip.

### C5. Performance budget and adaptive quality

- [MUST-v1] Budgets. Reference machine: an integrated GPU, Intel Iris Xe class, at 1920×1080 and dpr 1. The checks use a dev-only `?stress=N` fixture behind `import.meta.env.DEV`, which never ships.

| Metric | Budget |
|---|---|
| Idle frames rendered (nothing changing, 5 s) | **0**. The value of `gl.info.render.frame` is unchanged. |
| Draw calls, methane ball-and-stick, nothing selected | **≤ 3** |
| Draw calls, any state without AO | **≤ 8** |
| Orbit at 1,000 atoms in ball-and-stick | p95 frame time **≤ 18 ms** |
| Instance rebuild at 1,000 atoms + 1,000 bonds | **≤ 2 ms** (`performance.now()` around the layout effect) |
| Edit to visible result (≤ 500 atoms) | Next frame, **≤ 32 ms** |
| `gl.info.memory.geometries` / `.textures` after 20 load, undo and new cycles | No growth |
| Initial JS without the AO chunk | **≤ 500 KB gzip** (`vite build` output) |

- [MUST-v1] dpr policy:
  - `dpr={[1, cap]}` with cap = 2 for a fine pointer and **1.5** for `(pointer: coarse)`.
  - `performance={{ min: Math.max(0.5, 1 / maxDpr), debounce: 250 }}`, plus `<AdaptiveDpr />` and `<CameraControls regress />`.
  - Resolution drops while orbiting but never below 1 device-pixel per CSS px, and returns to full sharpness 250 ms after the camera stops.
  - **Verify:** the frame after the camera rests is sharp. If the final frame is missing, call `invalidate()` from `onRest`.
- [MUST-v1] Do **not** mount drei `PerformanceMonitor`. Under `frameloop="demand"` it counts sparse frames as low fps and ratchets quality down (drei `core/PerformanceMonitor.js`).
- [SHOULD-v1] Geometry LOD by visible atom count, with ±10% hysteresis:

| Visible atoms | Sphere detail | Cylinder segments |
|---|---|---|
| ≤ 300 | d = 5 | 16 |
| 301–2,000 | d = 3 | 12 |
| > 2,000 | d = 2 | 8 |

  - Coarse pointers start one tier lower.
  - AO is forced off above 3,000 visible atoms, and the toggle explains why.
- [SHOULD-v1] `<Canvas resize={{ debounce: { scroll: 50, resize: 100 } }}>` so that the inspector open and close animation does not reallocate buffers on every animation frame.
- [LATER] Ray-cast sphere and cylinder impostors (Mol*/NGL technique), `BatchedMesh`, `three-mesh-bvh` and WebGPU. Reconsider these only if protein-scale import (more than about 20k atoms) is added.

### C6. Frameloop strategy

- [MUST-v1] Use `<Canvas frameloop="demand">`. A frame is requested **only** by:
  - React prop changes;
  - drei `CameraControls` events (it invalidates on control, transition, update and wake);
  - an explicit `invalidate()` after imperative writes: matrices, colours, halo scale, fog, background, dpr;
  - the bounded animations below, which call `invalidate()` from their own `useFrame` while active and stop calling it when done.
- [MUST-v1] Bounded animations (all disabled under reduced motion, C8):
  - **autoRotate:** `controls.azimuthAngle += delta·0.21` (12°/s). Paused while the user is dragging.
  - **Entrance on `loadNonce`:** a 400 ms ease-out dolly from 1.25× to 1.0× the fit distance.
  - **Fit, focus and reset:** camera-controls transitions with `smoothTime` 0.25.
  - **Relax (`cleanUp`):** at most 240 store ticks, rendered as they arrive.
- [MUST-v1] Never use `state.clock`, `THREE.Clock`, drei `<Float>` or any always-on bobbing. Use `useFrame((_, delta) => …)`.
- [MUST-v1] Console hygiene (SPEC §8).
  - R3F 9.8.1 constructs `new THREE.Clock()` (`events-*.esm.js:1054`), and three r186 then warns `'THREE.Clock: This module has been deprecated…'`.
  - In `main.tsx`, before the first Canvas mounts, install a `setConsoleFunction((type, message, ...p) => …)` filter (`three/src/utils.js:180`). It drops **only** messages that start with that exact string and forwards everything else to `console[type]`.
  - **Verify:** zero warnings and zero errors in the console after load, a mode switch and an edit.
  - [LATER] Remove the filter when R3F 10, which uses `Timer`, becomes stable.

### C7. Camera controls (rendering side)

- [MUST-v1] drei `<CameraControls makeDefault regress dollyToCursor>` (camera-controls 3.1.2, already bundled with drei 10.7.9; no separate install).
  - Mouse: left ROTATE, right TRUCK, middle and wheel DOLLY.
  - Touch: one finger TOUCH_ROTATE, two fingers TOUCH_DOLLY_TRUCK.
  - Get the action enum with `const { ACTION } = CameraControlsImpl`.
  - The Rotate, Pan and Zoom tools reassign `controls.mouseButtons.left` and `controls.touches.one` in an effect, never by remounting.
- [MUST-v1] Fit sphere:
  - Centre = the bounding-box centre of the visible atoms.
  - Radius = `max_i(|p_i − c| + r_display,i)`, with a floor of 1.5 Å.
  - On `fitNonce`: `await controls.fitToSphere(sphere, !reduced)` then `controls.saveState()`.
  - Set `minDistance = 1.2r` and `maxDistance = 12r`.
  - Reset (`cameraResetNonce`) calls `controls.reset(!reduced)`.
  - An empty molecule triggers no fit. The camera then sits at a distance of 12 Å looking at the origin.
- [MUST-v1] The canvas wrapper has `touch-action: none; overscroll-behavior: none; user-select: none`, and the app shell uses `100dvh`. **Verify on a touch device:** pinching never scrolls or zooms the page.

### C8. Reduced motion

- [MUST-v1] The single source of truth is the store's `reducedMotion` (system preference or user override, live through `matchMedia` change events).
- [MUST-v1] When `reducedMotion` is true:
  - Every programmatic camera move passes `enableTransition = false`.
  - `smoothTime` and `draggingSmoothTime` are 0.05.
  - The entrance animation is skipped.
  - autoRotate is forced off and its toggle is disabled, with a tooltip explaining why.
  - During `relaxing`, the renderer holds the pre-relax pose and swaps to the final coordinates once, when `relaxing` becomes false.
  - The UI is wrapped in `<MotionConfig reducedMotion="user">`, so panel transitions become opacity-only.
- **Verify:** with OS reduced motion on, Fit, Reset and Clean-up each change the image in exactly 1 to 2 rendered frames (count with `gl.info.render.frame`).

### C9. Disposal, context loss and dependencies

- [MUST-v1] Shared geometries (per LOD tier) and materials are created once in a module-scope cache and passed with `dispose={null}`. They are disposed in one top-level `useEffect` cleanup when `<Canvas>` unmounts, and replaced LOD geometries are disposed when they are no longer used. Loading a new molecule rewrites instance buffers and allocates no geometry.
- [MUST-v1] WebGL failure is handled as an honest error state (SPEC §8).
  - On `webglcontextlost`: call `preventDefault()` and show an in-viewport error panel with "Reload viewport", which remounts `<Canvas>` by key.
  - On `webglcontextrestored`: remount automatically, keeping the same molecule and the saved camera state.
  - If WebGL is unavailable at startup, show the same panel instead of a blank canvas.
  - **Verify:** `gl.getContext().getExtension('WEBGL_lose_context').loseContext()` shows the panel, and `restoreContext()` brings back the identical molecule.
- [MUST-v1] Dev-only debugging hook: `window.__studio = { gl, scene, controls }`, set only when `import.meta.env.DEV`. It exists for the checks in this section and must not appear in production builds.
- [MUST-v1] **No new runtime dependencies for MUST-v1.** The existing three 0.186.1, R3F 9.8.1, drei 10.7.9 and React 19.3 cover everything above.
- [SHOULD-v1] Only with the AO toggle (C2), install exactly `"@react-three/postprocessing": "3.2.0"` and `"postprocessing": "6.39.5"`, lazy-loaded with `React.lazy` so that they stay out of the 500 KB budget.
  - These pull in N8AO; do not install `n8ao`, `camera-controls` or `three-mesh-bvh` directly.
  - `postprocessing@6.39.5` declares the peer range `three >=0.168 <0.187`. The existing `"three": "^0.186.1"` already resolves within `<0.187`. Do not bump three to 0.187 or later until that peer range widens.
- [LATER] `@react-three/a11y`, or an off-canvas keyboard-navigable atom list, to make the scene accessible. Temporal AO accumulation (N8AO `accumulate`) for a "screenshot quality" mode when the camera rests.

## D. Design system & responsive layouts

> Scope: this section pins down the visual and interaction surface that SPEC §2, §3, §6 and §7 describe in words. Where it conflicts with SPEC, SPEC wins. **The tokens already in `src/index.css` are the baseline.** This addendum keeps them, names their roles, and adds only what is missing. Every contrast ratio below was computed with the WCAG 2.x relative-luminance formula on the exact hex values ([WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).

### D.0 Thesis
- [MUST-v1] **Hierarchy:** the viewport is the brightest and most saturated region on screen. All UI chrome is neutral near-black, and surfaces are separated by small luminance steps, not by hue, shadow or glass. Saturated colour comes from only three sources: CPK atoms, the single accent (selection, active tool, focus), and the state colours (ok/warn/danger, used only as dots, icons or text).
- [MUST-v1] **Panel model:** desktop panels are docked and flush (radius 0, 1px dividers), never floating cards. Figma rolled floating panels back in UI3 because they cramped the canvas ([Figma UI3](https://www.figma.com/blog/our-approach-to-designing-ui3/)). Only overlays are rounded: HUD chips, popovers, menus, the sheet and dialogs.

### D.1 Colour tokens (Tailwind v4 `@theme`, `src/index.css`)
- [MUST-v1] Components use only token utilities (`bg-surface-1`, `text-ink-dim`, `border-line`, …). A grep for `#[0-9a-fA-F]{3,8}` in `src/ui/**/*.tsx` must return 0 hits. The exceptions are the TS mirror module (D.1.4) and CPK data in `chem/elements.ts`.

**D.1.1 Existing tokens and the role each one has (keep the values)**

| Token | Hex | Role (one job each) |
|---|---|---|
| `surface-0` | `#0a0b0d` | viewport / scene clear colour, app root |
| `surface-1` | `#101114` | docked panels: top bar, rail, inspector, status bar, sheet |
| `surface-2` | `#16181c` | inputs, segmented controls, popovers, tooltips, menus, toasts |
| `surface-3` | `#1d2025` | hover fill for rows, buttons and menu items |
| `line` | `#23262c` | panel dividers and row separators (decorative, 1.25:1 on surface-1) |
| `line-strong` | `#323640` | popover/menu/dialog edge, hover border |
| `ink` | `#e6e8eb` | values, element names, active labels |
| `ink-dim` | `#9aa1ab` | field labels, units in rows, status bar text, resting icons |
| `ink-faint` | `#868e99` | hints, kbd chips, placeholders, captions. Never the only carrier of a needed fact |
| `accent` | `#5ec8e5` | active tool, selection (UI and 3D), focus ring, primary button, slider fill |
| `accent-dim` | `#2b6f82` | accent border on the selected row and the active-tool indicator track |
| `ok` / `warn` / `danger` | `#5fb983` / `#d9a441` / `#e5605a` | save state, valence badges, errors |

**D.1.2 Additions** [MUST-v1]: `--color-surface-4: #262a31` (pressed and selected-row neutral fill). `--color-line-ctl: #6b7078` (the boundary of any control whose only cue is its border, such as an empty input or an unchecked checkbox). `--color-accent-subtle: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface-1))` (resolves to about `#1b2b31`; used for the active tool and selected-row background). `--color-on-accent: #061418`. `--color-danger-solid: #c8423e` (destructive button fill with white text). `--color-hud: rgb(10 11 13 / 0.86)`. `--color-hud-line: rgb(255 255 255 / 0.10)`.

**D.1.3 Verified contrast** (text on host surface). Minimum is 4.5:1 for text and 3:1 for UI boundaries and focus.

| Pair | s0 | s1 | s2 | s3 | s4 / accent-subtle |
|---|---|---|---|---|---|
| ink | 16.04 | 15.38 | 14.48 | 13.31 | 11.73 / 11.91 |
| ink-dim | 7.56 | 7.25 | 6.82 | 6.27 | 5.53 / 5.61 |
| ink-faint | 5.95 | 5.70 | 5.37 | 4.93 | **4.35 / 4.42 ✗** |
| accent | 10.19 | 9.77 | 9.20 | 8.45 | 7.46 / 7.57 |
| danger | 5.77 | 5.53 | 5.21 | 4.79 | — |
| line-ctl (boundary) | 3.95 | 3.79 | 3.57 | 3.28 | — |

Also verified: on-accent on accent = 9.70; white on danger-solid = 4.88; the HUD at α .86 composited over a white H atom (`#f2f2f2`) gives ink 11.54 and ink-dim 5.44 (at α .78 ink-dim drops to 4.11 and fails, so the α floor is .86).
- [MUST-v1] **Rule:** `ink-faint` is never placed on `surface-4` or `accent-subtle`; selected and pressed rows switch faint text to `ink-dim`. Disabled text (`ink-faint` at 50% opacity) is exempt and must never carry information.
- [MUST-v1] **Verify:** a Vitest file `src/ui/tokens.test.ts` parses the `@theme` block and asserts every pair in D.1.3 at ≥ its threshold. CI fails if a token edit breaks a pair.

**D.1.4 Scene–UI coupling** [MUST-v1]: `src/ui/tokens.ts` exports `accent`, `surface0`, `ink` and `hud` as hex constants. They are imported by the scene for the selection outline, measurement lines, the pending-bond ghost and label colours. A unit test asserts they equal the CSS values, so the UI and the 3D scene cannot drift.

### D.2 Selection and hover in 3D (colour-blind-safe, CPK-preserving)
- [MUST-v1] **Never recolour atoms.** CPK identity is preserved in every state.
- [MUST-v1] **Hover:** a back-face shell at 1.12× radius in `accent`, opacity 0.35, plus a canvas-anchored chip (D.6.4) showing symbol, charge and valence state.
- [MUST-v1] **Selected:** the shell is two-toned, so it stays visible against both C (`#909090`, accent-vs-C is only 1.65:1) and H (`#f2f2f2`, 1.73:1). It has an inner `surface-0` rim (1.08×) and an outer accent rim (1.16×, opacity 1.0), and the matching inspector row is marked at the same time. This meets 3:1 non-text contrast through the dark rim (accent vs `#0a0b0d` = 10.19). On entry the shell scales from 1.0× to the final size over 120 ms, once; no pulse loop.
- [MUST-v1] **Bonds:** hovered and selected bonds use the same shell treatment around the cylinder.
- [MUST-v1] **Selection does not rely on hue alone.** It is expressed by shell geometry plus the inspector state.

### D.3 Typography
- [MUST-v1] **Scale:** keep the existing scale as is. `text-formula` 20/1.25 (the largest text in the app). `text-title` 16 (inspector heading, e.g. "Oksijen"). `text-ui` 13/1.4 (default for panels, rows and buttons). `text-label` 12 (status bar, field labels, kbd chips, tooltips). `text-micro` 11, only for UPPERCASE section captions (+0.04em tracking) and units next to a 13px value. Lowercase text below 12px is forbidden. Weights are 400, 500 and 600 only; 700 and above is forbidden. No more than 3 sizes may be visible in one panel.
- [MUST-v1] **Numerals:** every numeric readout (coordinates, masses, lengths, angles, counts, status bar) uses `font-variant-numeric: tabular-nums`. The value is `ink`, the unit is `ink-dim` with a thin space before it (`1.09 Å`, `16.043 g/mol`). Formulas render real subscripts and superscripts (`CH<sub>4</sub>`, charge as `<sup>+</sup>`), and screen readers get an `aria-label` read as plain text, e.g. "C H 4".
- [MUST-v1] **Turkish glyph check:** the rendered font must draw `İ ı Ş ş Ğ ğ Ö ö Ü ü Ç ç` with correct dotted and dotless I. Case conversion uses `toLocaleUpperCase('tr')` (so "iyot" becomes "İYOT"). Captions in CSS `uppercase` must sit under `lang="tr"` on `<html>` when TR is active. Verify with a Playwright screenshot of a fixture string in both languages.
- [SHOULD-v1] **Font:** self-host Inter Variable (`@fontsource-variable/inter`, one woff2 file, `font-display: swap`, preloaded) so Windows does not silently fall back to Segoe UI. Turn on `'cv11','ss03'`. Monospace (`--font-mono`, already defined) is used only for kbd chips and raw file or identifier strings.

### D.4 Spacing, radius, density, elevation
- [MUST-v1] **Spacing:** a 4px base with steps 2/4/6/8/12/16/24/32. Panel padding 12px. Gap between sections 16px. Inspector key/value rows are 28px tall, label on the left in `ink-dim` and value right-aligned in `ink`. Sections are flat, with an 11px caption and a `line` divider; no card around each section, and no card inside a card.
- [MUST-v1] **Control heights:** the existing `--hit` variable drives control size (32px desktop, 44px tablet and mobile via `[data-layout]`). Compact desktop controls such as the style segment and steppers may be 28px but keep at least a 24×24 hit area ([WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- [MUST-v1] **Radius:** 4px for kbd chips and badges, `--radius-ctl` 6px for buttons, inputs, tool buttons and rows, `--radius-panel` 8px for popovers, menus, HUD chips and toasts, 12px for the bottom sheet's top corners and for dialogs. Fully rounded shapes only for status dots and switch tracks.
- [MUST-v1] **Elevation:** docked panels have no shadow. Popovers and menus use `0 8px 24px rgb(0 0 0/.5)` plus a `line-strong` border. Dialogs use `0 16px 48px rgb(0 0 0/.6)`. No coloured or glow shadows.

### D.5 Iconography
- [MUST-v1] **Icon set:** lucide-react only. 16px with `strokeWidth={1.5}` in the top bar, inspector and menus. 18px in the 48px rail and the mobile tool bar. The colour is `currentColor`: `ink-dim` at rest, `ink` on hover, `accent` when active. Outline style only; no filled icons, emoji or second icon set.
- [MUST-v1] **Tool → icon** (store `Tool` union): select `MousePointer2`, rotate `Rotate3d`, pan `Hand`, zoom `ZoomIn`, atom `Atom`, bond `Link2`, erase `Eraser`, measure `Ruler`. Other actions: undo `Undo2`, redo `Redo2`, fit `Maximize`, reset camera `RotateCcw`, info `Info`, settings `Settings`, sheet grabber = a plain 36×4px `line-strong` bar (no icon).
- [MUST-v1] **Labels:** every icon-only button has a localized `aria-label`. Toggles also have `aria-pressed`.

### D.6 Component specs
**D.6.1 Top bar** [MUST-v1]. Height 44px (40px when the viewport height is < 500px), `surface-1`, bottom border `line`. Left: a 20px logo mark and the "Molecular Studio" wordmark (13/600; hidden below 640px). Then the inline-editable project name (13/500, max 240px with an ellipsis; Enter commits, Esc reverts, empty input reverts). Then the save indicator: a 6px dot plus a 12px label driven only by `SaveStatus`. The mapping is saved = `ok` "Kaydedildi", saving = `accent` "Kaydediliyor…", unsaved = `warn`, error = `danger` with a retry action. A spinner is allowed only while a real write is in flight. Right: undo and redo (disabled when the history is empty, tooltip names the action), View menu, Info toggle (it opens the inspector or sheet and is `aria-pressed`), Settings.

**D.6.2 Left tool rail** [MUST-v1]. 48px wide, `surface-1`, right border `line`. It holds 36×36 buttons with 6px padding and two groups separated by a 1px `line` divider: Navigation (Select, Rotate, Pan, Zoom) and Edit (Atom, Bond, Delete, Measure). The button states are:
- rest: transparent background, `ink-dim` icon
- hover: `surface-3` background, `ink` icon
- active: `accent-subtle` background, `accent` icon, and a 2px accent bar on the rail's inner edge (so the state is not colour-only)
- pressed: `surface-4` background
- focus-visible: the D.6.8 ring
- disabled: `aria-disabled`, `ink-faint` at 50%, and a tooltip saying why. This is used only for a genuinely unimplemented tool, per SPEC §8.

The rail uses `role="toolbar"` with roving tabindex and arrow-key navigation.

**D.6.3 Tool options bar** [SHOULD-v1]. One 36px HUD strip centred at the top of the viewport (8px inset), visible only for Atom, Bond and Measure:
- Atom: the element strip (the `PALETTE` buttons, 28px, active one gets the accent ring) plus "…" for the periodic-table popover, and an Auto-H switch.
- Bond: a 1/2/3 segment.
- Measure: live readout plus Clear.

The bar's content swaps in 120 ms without moving the bar itself.

**D.6.4 Viewport HUD** [MUST-v1]. Every HUD element uses `--color-hud`, a 1px `--color-hud-line` border, `radius-panel`, and no `backdrop-filter`. Top right: the render-style segmented control (Ball & Stick / Space-fill / Stick / Wireframe). The indicator slides in 200 ms and each segment is labelled with text, not icons alone. Bottom right: Fit and Reset camera buttons. Measurement labels and the hover chip use the same chip style at 12px with tabular numbers, and are positioned so they stay inside the canvas bounds (flipped at the edges). [SHOULD-v1] An axis gizmo sits bottom-left (drei `GizmoHelper`), with axis colours desaturated to 60% so they don't compete with CPK colours.

**D.6.5 Inspector** [MUST-v1]. `surface-1` with a left border `line`. Default width 300px, resizable from 260 to 360px through a 6px drag handle on the left edge (`col-resize`, and `role="separator"` with arrow keys in 8px steps). Collapsible to 0, and a 28px edge tab reopens it. Width and collapsed state persist in localStorage. The header shows `text-title` and a context caption. The panel uses a single `<InspectorContent/>` component, reused unchanged by the tablet drawer and the mobile sheet. When a selection swaps the content, the old content fades out in 80 ms and the new content fades in over 120 ms (opacity only). Values that cannot be computed are absent, not shown as "—" placeholders, per SPEC §5.

**D.6.6 Status bar** [MUST-v1]. 24px tall, `surface-1`, top border `line`, 12px `ink-dim` text with tabular numbers. Items are separated by 1px `line` ticks: mode (render style) │ atoms N │ bonds N │ selection (e.g. "O3 seçili" or "Seçim yok") │ camera status (from the store's `cameraStatus`, not a static string) │ a contextual gesture hint in `ink-faint`. Values are always live store reads.

**D.6.7 Tooltips, menus, toasts** [MUST-v1]. Tooltip: `surface-2`, 12px, label plus a kbd chip (4px radius, `line-strong` border, mono 11px `ink-faint`). The chip shows only keys that actually exist in the shortcut registry. Opens after 400 ms and closes in 80 ms. Never shown on coarse pointers. Menus: `surface-2`, 32px items, `surface-3` hover, roving focus, Esc closes and returns focus. Toasts (`ToastKind`): bottom-centre, 16px above the status bar (on mobile, above the sheet's peek edge), `surface-2`, 13px, at most 2 lines, with a state icon. 4 s auto-dismiss, paused on hover or focus. `role="status"`, or `role="alert"` for errors.

**D.6.8 Focus** [MUST-v1]. Keep the existing global `:focus-visible` rule (2px accent, 2px offset; accent vs surface-1 is 9.77:1). Dense rows and inputs use `outline-offset:-2px`. The viewport container gets `tabIndex=0` and shows an inset 2px accent ring when keyboard-focused. Inputs on focus: the border becomes accent. Invalid input: `danger` border plus an inline 12px message (not colour alone). The removed `:focus` outline must always be replaced by a `:focus-visible` ring; verify by tabbing through every control with no element left without a visible ring.

### D.7 Motion
- [MUST-v1] **Tokens** (CSS variables, mirrored in `tokens.ts`):
  - durations: `--dur-instant 80ms` (hover, press), `--dur-fast 120ms` (tooltips, toggles, selection shell), `--dur-base 200ms` (panel collapse, popovers, segment slide), `--dur-slow 320ms` (sheet settle, camera fit/reset tween)
  - easing: `--ease-ui` (existing `cubic-bezier(0.2,0,0,1)`) for enter and settle, `--ease-in-out cubic-bezier(0.65,0,0.35,1)` for camera tweens
  - exits run at 60% of the enter duration
  - Motion springs, if used: `{stiffness:400, damping:40}`, critically damped with zero overshoot. No bounce or elastic easing.
- [MUST-v1] **What may animate:** UI animates only `transform` and `opacity`, plus inspector width (`grid-template-columns`) for 200 ms. While that transition runs, the R3F canvas resizes through its ResizeObserver without remounting, so no scene flash or reload.
- [MUST-v1] **No idle work:** R3F runs with `frameloop="demand"` and calls `invalidate()` on input, damping, hover or selection changes. Auto-rotate is off by default. The Performance panel must show no rAF work while idle for 5 s.
- [MUST-v1] **Reduced motion:** when `[data-reduced-motion="true"]` is set (the existing store-resolved attribute), CSS durations collapse to 0.01 ms (already in `index.css`), camera fit/reset become instant cuts, sheet snaps jump, and Motion is wrapped in `<MotionConfig reducedMotion="user">`. Opacity fades of ≤80 ms are allowed.
- [SHOULD-v1] **Style switch:** switching from Ball & Stick to Space-fill lerps the instanced radii over 200 ms (real geometry, not a crossfade).

### D.8 Responsive interaction models
- [MUST-v1] **Breakpoints:** `data-layout` is set on the app root from the viewport width. mobile is < 640px, tablet is 640–1023px, desktop is ≥ 1024px. `(pointer: coarse)` forces at least the tablet hit sizes (`--hit: 44px`) whatever the width. A viewport height < 500px (phone landscape) gives the 40px top bar and an inspector capped at the half detent. The layout is computed with `matchMedia` listeners, not in a resize loop.
- [MUST-v1] **Desktop (≥1024):** CSS grid with `grid-template-columns: 48px minmax(0,1fr) var(--inspector-w)` and `grid-template-rows: 44px minmax(0,1fr) 24px` at `100dvh`. All panels are persistent, and none overlaps the viewport. Hover tooltips and right-click menus are allowed, but every right-click action is also reachable from the inspector or a menu.
- [MUST-v1] **Tablet (640–1023):**
  - The rail stays at 48px wide with 44px buttons.
  - The inspector is a right drawer, 320px wide, toggled from the top-bar Info button. It is collapsed by default in portrait and open in landscape.
  - The drawer overlays the viewport with no scrim, and the camera keeps the molecule centred in the uncovered area.
  - The status bar stays.
  - Long-press (500 ms) shows a label in place of a hover tooltip, and no feature depends on hover.
- [MUST-v1] **Mobile (<640):**
  - The viewport is full-bleed beneath the 44px top bar, which holds the mark, the truncated name, undo/redo and an overflow menu (View, Settings, Info).
  - The tool bar is anchored to the bottom, 52px tall plus `env(safe-area-inset-bottom)`. It holds 5 buttons of 44px: Select, Atom, Bond, Delete, Measure. Rotate, Pan and Zoom sit under "More", because touch orbiting works in every tool.
  - The status bar collapses to 2 items (mode, atoms) inside the sheet's peek row.
- [MUST-v1] **Bottom sheet** (renders the shared `<InspectorContent/>`; `SheetSnap` in `uiStore`). It is non-modal and persistent, with a 36×4 grabber in a 24px handle zone and three detents:
  - **peek** = 72px + safe-area: shows the formula and molar mass.
  - **half** = 45dvh: shows the summary or the selected atom.
  - **full** = 88dvh: shows all properties, plus a `rgb(0 0 0/.4)` scrim that closes the sheet back to half when tapped.
  - These detent values are recommendations synthesised from the Apple HIG and Material non-modal sheet patterns and may be tuned.
  - Launch at **peek** (change `uiStore` from its current default of `half`). Selecting an atom raises the sheet from peek to half. Clearing the selection returns it to peek. Swiping down never dismisses past peek. Esc or Back drops one detent.
  - Dragging uses pointer events and snaps to the nearest detent, projected with velocity (> 0.5 px/ms flings to the next detent). Tapping the grabber cycles the detents. The grabber is `role="button"` with an `aria-label` that names the current detent.
- [MUST-v1] **Gesture separation:** the canvas has `touch-action:none` (one finger orbits, a pinch zooms, two fingers pan). Sheet content has `touch-action:pan-y; overscroll-behavior:contain` and scrolls only at half or full. Atom hit spheres are enlarged so each atom has at least a 22px on-screen radius on coarse pointers.
- [MUST-v1] **Keeping the molecule visible:** at the half detent, the fitted molecule's projected bounding circle sits fully above the sheet's top edge (use `camera.setViewOffset` or an equivalent target shift, debounced 100 ms after the sheet settles). Zoom does not jump when the detent changes.
- [MUST-v1] **No horizontal overflow:** root `overflow-x:hidden` and `min-width:0` on grid children. At 360, 390, 768, 1024, 1280 and 1920 px widths, `document.documentElement.scrollWidth <= innerWidth`.

### D.9 Forbidden anti-patterns (critic checklist; any hit fails review) [MUST-v1]
1. Gradients anywhere other than the single existing `.viewport-bg` radial (luminance range `#0a0b0d`–`#15171b`). No gradient buttons, text, borders or logo.
2. Glow or neon shadows, animated or glowing borders, coloured shadows.
3. Glassmorphism: `backdrop-filter` or `backdrop-blur` on any element.
4. Purple, indigo or pink accents, "AI sparkle" icons, a second accent colour, or CPK colours used as UI chrome.
5. Any text larger than 20px, hero or marketing copy, or headings inside panels larger than `text-title`.
6. Card-in-card nesting, a bordered card around every section, stat/KPI tile grids, decorative charts, pastel pill badges.
7. Fully rounded buttons or tabs (other than status dots and switches). Floating desktop panels with large shadows.
8. Emoji as icons, mixed icon sets, mixed stroke widths or sizes, filled and outline icons mixed.
9. Lowercase text under 12px, `ink-faint` carrying essential information, grey-on-grey text below 4.5:1.
10. Fake affordances: decorative buttons, fake progress or loaders, hardcoded stats, a "simulation" or "AI" label on features that don't exist, or "—" placeholders standing in for uncomputed properties.
11. Pure `#000` or `#fff` in UI CSS.
12. Bounce or elastic easing, looping pulses, parallax, auto-rotate on by default.
13. Hover-only or right-click-only features. A tooltip as the only label for a primary action on touch.
14. The desktop layout scaled down for mobile. Layout shift or a scene remount when panels toggle.
15. Browser focus outlines removed without a replacement. Default light OS scrollbars (style them: thin, `line-strong` thumb, `scrollbar-gutter: stable` on the inspector).
- **Verify:** `rg -n "gradient|backdrop-(blur|filter)|#000\b|#fff\b|shadow-\[0_0" src/ui` returns only the documented `.viewport-bg` line.

### D.10 Acceptance checks for this section
- [MUST-v1] `vitest run` passes `tokens.test.ts` (D.1.3 pairs and the D.1.4 mirror).
- [MUST-v1] Playwright screenshots at 390×844, 768×1024, 1280×800 and 1920×1080 in TR and EN. Each must show: methane centred in the visible viewport area; the sheet at peek on mobile; no overflow; the active-tool indicator visible; the save dot matching the store state.
- [MUST-v1] A keyboard-only pass: Tab reaches the top bar, then the rail, viewport, HUD and inspector, each with a visible ring. Esc closes the topmost overlay.
- [SHOULD-v1] A blind A/B by a fresh-context critic, comparing a 1280×800 screenshot against Linear, Raycast and Blender references for chrome restraint. Iterate until the critic prefers ours or calls it a tie.
- [LATER] A light theme and a high-contrast theme generated from the tokens (base, accent, contrast), a Ctrl/Cmd+K command palette, a P3 wide-gamut accent, and a dockable rail.
