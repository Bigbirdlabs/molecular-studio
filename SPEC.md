# Molecular Studio — Product Specification (authoritative; overrides GOAL.md where they conflict)

PROJECT: MOLECULAR STUDIO
TYPE: Interactive 3D Molecular Modeling & Visualization Platform

Act as a senior frontend engineer, 3D graphics engineer, scientific visualization specialist, and world-class UI/UX designer.

Your task is to build Molecular Studio, a premium, highly interactive, browser-based molecular modeling application.

This is NOT a conventional website, a static landing page, or a simple chemistry dashboard. It must be a functional scientific application where users can explore, visualize, and eventually construct molecular structures in an interactive 3D environment.

The application should feel like a combination of a professional scientific visualization tool, a modern 3D editor, and a beautifully designed desktop application.

Do not build a generic AI-generated dashboard. Prioritize functional 3D interaction, scientific clarity, exceptional usability, and visual consistency.

==================================================
1. CORE TECHNOLOGY
==================================================

First, inspect the existing project structure, package.json, installed dependencies, and current implementation.

Preserve working functionality and existing architectural decisions where appropriate. Do not replace the entire project blindly.

For a new project, use the following stack:

- React
- TypeScript
- Vite
- Tailwind CSS
- Three.js
- React Three Fiber
- Drei
- Lucide React for interface icons
- Framer Motion or Motion for interface animations

Use stable, compatible package versions.

Use reusable React components and a modular architecture.

Keep the 3D rendering layer separate from the interface layer.

Use TypeScript types for atoms, bonds, molecules, editor tools, and application state.

Avoid unnecessary dependencies and do not introduce complex state management libraries unless the project actually needs them.

==================================================
2. ART DIRECTION AND VISUAL IDENTITY
==================================================

Create a premium scientific application with a refined, minimal, and sophisticated visual identity.

The application should resemble a professional desktop scientific tool redesigned for the modern web.

VISUAL PRINCIPLES:

- Dark, elegant workspace.
- Near-black and charcoal interface surfaces.
- Subtle neutral borders.
- Carefully controlled contrast.
- Refined typography.
- Generous spacing.
- Clear visual hierarchy.
- Precise iconography.
- Smooth micro-interactions.
- Minimal visual noise.

Use a restrained color palette for the interface.

Reserve brighter colors primarily for scientific visualization, selected objects, molecular elements, and meaningful interaction states.

Do not use excessive gradients, glowing borders, decorative glass effects, oversized headings, or generic SaaS design patterns.

Avoid overcrowded panels, tiny labels, excessive cards, and unnecessary interface elements.

The 3D molecular workspace must be the visual centerpiece.

Every interface element should have a clear purpose.

The result should feel carefully art-directed rather than automatically assembled from a template.

==================================================
3. APPLICATION LAYOUT
==================================================

Create a complete application workspace.

A. TOP NAVIGATION BAR

Include:

- Molecular Studio logo and product name.
- Current project name.
- Save status.
- Undo and redo controls.
- View options.
- Settings.
- A clear way to access molecule information.

Keep the navigation compact and functional.

B. LEFT TOOLBAR

Create a vertical toolbar containing:

- Select.
- Rotate.
- Pan.
- Zoom.
- Add Atom.
- Add Bond.
- Delete.
- Measure.

Tools must have distinct active and inactive states.

For the initial implementation, implement the selection and camera tools fully.

Atom and bond editing tools should be implemented as real interactions where feasible. Do not display tools as functional if they do nothing.

C. CENTRAL 3D WORKSPACE

This is the most important part of the application.

Create a large, responsive Three.js viewport.

The viewport must support:

- Interactive camera orbit.
- Smooth zooming.
- Panning.
- Object inspection.
- Selecting atoms where supported.
- Resetting the camera.
- Switching visualization styles.
- Displaying molecular structures with accurate connectivity.

Implement proper lighting, a suitable camera, antialiasing, and efficient rendering.

The molecular structure must be a genuine 3D scene, not a pre-rendered image or a flat illustration.

D. RIGHT INSPECTOR PANEL

Create a contextual information panel that displays:

- Selected atom or molecule.
- Element symbol.
- Atomic number.
- Atomic mass.
- Coordinates where applicable.
- Bond information.
- Molecular formula.
- Molecular mass.
- Number of atoms.
- Number of bonds.

Display only information that can be calculated or retrieved reliably.

When nothing is selected, show useful information about the current molecule.

E. BOTTOM STATUS BAR

Display relevant information such as:

- Current visualization mode.
- Number of atoms.
- Number of bonds.
- Current selection.
- Camera or workspace status.

Keep this area visually subtle.

==================================================
4. INITIAL MOLECULAR EXPERIENCE
==================================================

When the application launches, show a scientifically recognizable molecule in the 3D workspace.

Start with water (H₂O) or methane (CH₄) to establish a reliable initial experience.

Prefer methane if the initial objective is to demonstrate tetrahedral molecular geometry.

Use actual 3D coordinates and explicit connectivity data.

Represent atoms using a ball-and-stick model.

Use a consistent element color scheme based on a recognized molecular visualization convention.

Render atoms as spheres and bonds as cylinders or equivalent 3D geometry.

The molecule must be properly centered and scaled.

Users must immediately understand that the molecule is a real interactive object.

Allow users to switch between at least these visualization modes when supported:

1. Ball and Stick.
2. Space Filling.
3. Wireframe.

Ensure each mode produces a meaningful visual difference.

Do not simulate these modes by changing only the interface label.

==================================================
5. MOLECULAR DATA MODEL
==================================================

Create a structured and extensible molecular data model.

Each atom should contain relevant fields such as:

- Unique ID.
- Element symbol.
- Atomic number.
- Three-dimensional coordinates.
- Optional formal charge.
- Optional selection state.

Each bond should contain:

- Unique ID.
- Source atom ID.
- Target atom ID.
- Bond order.

Each molecule should contain:

- Unique ID.
- Name.
- Atom collection.
- Bond collection.
- Relevant calculated properties.

Separate the molecular data from the Three.js rendering components.

The renderer should derive the displayed geometry from the molecular data.

Changes to molecular data should update the 3D representation.

Do not hardcode all molecular information directly inside rendering components.

Implement a reliable approach to calculating molecular formulas and molecular mass from known atomic data.

If a property cannot be calculated reliably, do not fabricate a value.

==================================================
6. INTERACTION AND ANIMATION
==================================================

Interactions must feel responsive, deliberate, and polished.

Implement:

- Smooth camera orbit and zoom.
- Camera reset.
- Interactive molecule rotation.
- Atom selection with visual feedback.
- Contextual inspector updates.
- Visualization mode switching.
- Responsive panel behavior.
- Smooth panel transitions.
- Clear hover and focus states.

Use animations to improve clarity, not to distract.

Avoid excessive motion and unnecessary animation loops.

Respect reduced-motion preferences where practical.

The 3D scene must remain usable while the surrounding interface changes.

==================================================
7. RESPONSIVE DESIGN
==================================================

The application must adapt to desktop, tablet, and mobile screens.

Desktop:
- Full scientific workspace.
- Persistent toolbars and inspector.
- Maximum usable 3D viewport.

Tablet:
- Flexible panels.
- Collapsible inspector.
- Touch-friendly controls.

Mobile:
- Prioritize the 3D viewport.
- Use compact or collapsible toolbars.
- Present molecule information in a bottom sheet or accessible panel.
- Support touch-based orbiting and zooming.
- Avoid horizontal overflow.

Do not simply scale the desktop layout down.

Create an appropriate interaction model for each screen size.

==================================================
8. ENGINEERING QUALITY
==================================================

Follow these implementation requirements:

- Use reusable, strongly typed components.
- Separate UI, molecular data, scientific calculations, and rendering logic.
- Keep atom and bond IDs stable.
- Avoid unnecessary re-renders of the 3D scene.
- Dispose of Three.js resources appropriately.
- Handle empty states and invalid selections.
- Provide clear error states.
- Keep the browser console free of avoidable errors and warnings.
- Avoid placeholder buttons.
- Avoid fake loading indicators.
- Avoid hardcoded UI states that do not correspond to actual application state.

If a feature cannot be implemented correctly in the initial iteration, provide an honest disabled state or omit it.

Do not claim that the application supports scientific calculations that have not been implemented.

==================================================
9. DEVELOPMENT WORKFLOW
==================================================

Before writing code:

1. Inspect the current repository.
2. Identify the framework and installed packages.
3. Determine whether an existing application can be extended.
4. Establish a clear component and data architecture.
5. Identify any dependency conflicts.

Then implement the initial working application.

Do not stop after creating a plan or writing a design document.

Write the code, run the application, and validate the implementation.

If terminal access is available:

- Install only the dependencies that are actually required.
- Run the development server.
- Run TypeScript checks.
- Run the production build.
- Resolve errors introduced by the implementation.

If browser automation is available, verify the main user flows in the running application.

Test camera interaction, visualization mode switching, atom selection, responsive behavior, and inspector updates.

==================================================
10. INITIAL DELIVERY REQUIREMENTS
==================================================

The first iteration must include:

1. A complete application workspace.
2. A functioning interactive Three.js viewport.
3. At least one scientifically valid 3D molecular structure.
4. Ball-and-stick visualization.
5. At least one additional functional visualization mode.
6. Working camera orbit, zoom, pan, and reset.
7. Atom selection and contextual information.
8. A molecular data model with explicit atom and bond connectivity.
9. Molecular formula and molecular mass calculations.
10. A responsive and visually polished interface.

Prioritize a smaller number of genuinely functional features over a large collection of superficial features.

The initial result must be a usable foundation for a more advanced molecular editor.

==================================================
FINAL INSTRUCTION
==================================================

Build Molecular Studio as a real interactive scientific application.

The quality of the 3D experience is more important than the quantity of interface elements.

The visual quality must be professional, but the application must not sacrifice scientific correctness for appearance.

Start by inspecting the repository, then implement the application, run it, and verify that the core interactions work.

Do not return only a proposal, a wireframe, or a static mockup.

Deliver a working first iteration that can be expanded into a fully featured 3D molecular modeling platform.


# ENHANCEMENT ADDENDUM (research-backed, v1)

This addendum extends the user's specification above. Where anything here conflicts with the original specification, the original wins.

**Precedence rules for this addendum**

1. **The existing code wins on implementation.** Where this addendum names an implementation (library, file, component, constant), the existing module in `src/` wins. Requirements are binding only as observable outcomes with a *Verify* step. Any change to an existing decision is listed explicitly in **§E Migrations**, with the owning module named. Nothing outside §E asks for an existing decision to be reversed.
2. **Tags.** `[MUST-v1]` = required for the first delivery and checked by the acceptance checklist at the end. `[SHOULD-v1]` = do it if the MUST items are done and green. `[LATER]` = out of scope for v1. Do not show a SHOULD/LATER feature as a control unless it works (SPEC §3B, §8).
3. **Provenance.** Every number shown in the UI traces back to exactly one of: (a) a cited reference table in `src/chem/`, (b) arithmetic on those tables or on the molecular graph, or (c) a measurement from the current atom coordinates. Each displayed value belongs to one provenance class. The class is shown by inspector grouping and tooltip; only estimates (`Tahmini`) carry a visible badge (A.5).
4. **Test hook.** All scene *Verify* steps use the existing read-only hook `window.__MOLECULAR_SCENE__.snapshot()` (`src/scene/testHook.ts`, present in dev builds or with `VITE_TEST_HOOK=1`, absent from production). No other global debugging hook is added.
5. **Number formatting.** All user-visible numbers go through one formatter: `Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {minimumFractionDigits: d, maximumFractionDigits: d})`. Turkish shows a decimal comma (`16,04 g/mol`). Source values in this document are written with a decimal point when they are code/reference data and with a comma when they are UI strings. Negative numbers use the formatter's minus sign, which is the ASCII hyphen-minus for both `tr-TR` and `en-US` (`-120,0`); UI examples in this document follow that.
6. **"CPK".** In spec prose, "CPK" means the Jmol palette in `elements.ts`. User-visible strings say `Jmol renk şeması`.
7. **Standard viewports.** Every rehearsal, screenshot and overflow check uses one list: 360×740, 390×844, 768×1024, 1024×768, 1366×768, 1920×1080.

---

## A. Scientific reference data and computable properties

### A.1 Element table (`src/chem/elements.ts`)

Audit result: all 14 entries match their reference sets; no numeric value changes in v1. The work is provenance, fallback behaviour and valence rules.

| Field | Source to cite in a code comment | Status |
|---|---|---|
| `mass` | IUPAC CIAAW standard atomic weights 2021 (ciaaw.org/atomic-weights.htm) | Correct for all 14. H, B, C, N, O, Mg, Si, S, Cl, Br are intervals in nature; the abridged values carry ±0.0002 (H) to ±0.02 (B 10.81, S 32.06). Note: I = 126.904 is the standard value, not the abridged one (126.90). |
| `covalent` | Cordero et al., *Dalton Trans.* 2008, 2832 (doi:10.1039/b801115j) | Correct. C = 0.76 is the sp³ value (sp² 0.73, sp 0.69). |
| `vdw` | Bondi, *J. Phys. Chem.* 1964, 68, 441; B from Mantina et al., *J. Phys. Chem. A* 2009, 113, 5806 | Correct and consistent. Do not mix in Alvarez 2013. |
| `en` | Pauling scale (CRC Handbook) | Correct (H 2.20 … F 3.98). |
| `color` | Jmol palette (jmol.sourceforge.net/jscolors) | 12 of 14 exact. H `#f2f2f2` (Jmol `#FFFFFF`) and O `#ff2d2d` (Jmol `#FF0D0D`) are softened for the dark UI. |

- **[MUST-v1] A1.1 No silent carbon fallback.** `el(symbol)` currently returns `ELEMENTS.C` for unknown symbols, so an `Fe` would render as carbon and add 12.011 to the mass.
  - Add `isKnownElement(sym): sym is ElementSymbol`, implemented with `Object.hasOwn(ELEMENTS, sym)` (a plain `in` check is true for `'__proto__'`, `'toString'`). `io.ts` `normaliseSymbol` switches from `s in ELEMENTS` to it.
  - Add `getElement(sym): Element | undefined`. `el()` throws `UnknownElementError(sym)`.
  - Every entry path (library loader, localStorage restore, URL `?m=`, file/PubChem import) checks `isKnownElement` first and rejects the whole structure with `Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`. The current molecule stays unchanged.
  - **Isotopes:** `io.ts` currently maps D and T to H silently, which makes the mass a fabricated natural-H value. v1 rejects them with `Desteklenmeyen izotop: D` (or `T`). [LATER: real isotope support.]
  - *Verify:* `el('Fe')` throws; `isKnownElement('__proto__') === false`; restoring a stored molecule containing `Se` leaves the current molecule unchanged and shows the message; importing an XYZ with a `D` atom is rejected with the isotope message.
- **[MUST-v1] A1.2 Nitrogen valence `[3, 5]` → `[3]`.** `allowedValences` already adds the charge, so N⁺ allows 4 and N⁻ allows 2; a nitro group is drawn N⁺(=O)O⁻. *Verify:* a neutral N with bond-order sum 5 returns `'over'`; every shipped library atom still returns `'ok'` (loop test over `library.ts`).
- **[MUST-v1] A1.3 Hypervalent-safe hydrogen filling.** `targetValence` picks the lowest fitting valence, so a 2-bonded Cl, a 3-bonded S or a 4-bonded P would get an extra H from Oto-H. In v1, `missingHydrogens` never raises S, P or a halogen above its lowest valence. An atom above its lowest valence that is not bonded to O or F is flagged `'under'` without auto-H. Halogen valences stay `[1]`. [LATER: Cl/Br/I `[1,3,5,7]` for ClO₄⁻, IO₃⁻.] *Verify:* R–Cl–R gets no H from Oto-H; H₂SO₄, H₃PO₄, SO₂, SF₆ library atoms stay `'ok'`.
- **[MUST-v1] A1.4 Valence electrons.** H 1, B 3, C 4, N 5, O 6, F 7, Na 1, Mg 2, Si 4, P 5, S 6, Cl 7, Br 7, I 7. `geometry.ts` already has `VALENCE_ELECTRONS`; it becomes the single table (moved to or re-exported from `elements.ts`; properties.ts imports it instead of its own copy). Turkish label: *değerlik elektronu*.
- **[MUST-v1] A1.5 Monoisotopic masses (`mono`, u, AME2020 via NIST "Atomic Weights and Isotopic Compositions"):** ¹H 1.00782503223, ¹¹B 11.00930536, ¹²C 12 (exact), ¹⁴N 14.00307400443, ¹⁶O 15.99491461957, ¹⁹F 18.99840316273, ²³Na 22.9897692820, ²⁴Mg 23.985041697, ²⁸Si 27.97692653465, ³¹P 30.97376199842, ³²S 31.9720711744, ³⁵Cl 34.968852682, ⁷⁹Br 78.9183376, ¹²⁷I 126.9044719. `mono` in `elements.ts` is the single source: `properties.ts` drops its own `MONO_MASS` table (it holds older F, P, S, Br, I values) and the `?? el(a.symbol).mass` fallback. Record the NIST check date in the comment.
- **[MUST-v1] A1.6 Provenance comments.** One source comment per field, per the table. The `// CPK colour` comment becomes `// Jmol palette; H and O softened for the dark UI (Jmol #FFFFFF / #FF0D0D)`. UI strings that say "CPK" say "Jmol renk şeması".
- **[SHOULD-v1] A1.7 Metal bonds.** Bonds that involve Na or Mg show `İyonik etkileşim (metal)` in place of a σ/π name.
- **[LATER]** Li, Al, K, Ca, Se (scout values unverified). Transition metals only with a coordination model.

### A.2 Formula, mass and composition

- **[MUST-v1] A2.1 Formula convention.** `formula()` stays strict Hill and is labelled `Hill sistemi`. For carbon-free species add an exact lookup `CONVENTIONAL_FORMULA`, keyed by `formula(m, false)` (plain Hill string incl. charge):
  `H3N → NH₃`, `O2S → SO₂`, `F6S → SF₆`, `H2O4S → H₂SO₄`, `H3O4P → H₃PO₄`, `ClH → HCl`, `ClNa → NaCl`, `H4N+ → NH₄⁺`. (BF₃ and H₃O⁺ are already Hill-correct and need no entry.)
  - The conventional form is the primary formula whenever the current composition matches a key, including after edits; Hill appears in the tooltip.
  - Library descriptions use conventional text (the ammonia entry's "H₃N" is corrected in `gauntlet/scratch/build-library.mjs`, not in the generated `library.ts`).
- **[MUST-v1] A2.2 Incomplete structures are flagged.** Formula, mass and composition count explicit atoms only. If Σ `missingHydrogens` > 0 the inspector shows `Yapı eksik: n H eksik — değerler çizilen atomlar içindir` beside the values, plus `Hidrojenleri tamamla`. If any atom is `'over'`: `Geçersiz değerlik: <element> (<used>/<max>)`. *Verify:* a bare C₂ skeleton shows "6 H eksik" beside 24,02 g/mol.
- **[MUST-v1] A2.3 Precision.** Stored and computed values are never rounded; rounding happens only in the formatter. (`properties.ts` currently rounds `composition.percent`; it returns unrounded values after migration.)

| Quantity | d | Unit | Example (TR) |
|---|---|---|---|
| Average molar mass | 2 | g/mol | CH₄ `16,04 g/mol` |
| Atomic mass (inspector) | as tabulated (3 for most) | u | C `12,011 u` |
| Monoisotopic mass | 4 | u | CH₄ `16,0313 u` |
| % mass composition | 2 | % | CH₄: C `74,87 %` |
| Bond length / distance (inspector rows, in-scene labels, tooltips, chips, status bar) | 3 | Å | `1,090 Å` |
| Angle / dihedral | 1 | ° | `109,5°` |
| ΔEN | 2 | — | C–H `0,35` |
| Coordinates | 3 | Å | `0,000` |
| Gasteiger partial charge | 2 | e | `-0,41` |

  3 decimals for distances everywhere, so the ±0,005 Å tolerance of A4.1 can be inspected in the UI. `scene/measureGeometry.ts` `formatDistance`/`formatAngle` (currently `toFixed`, dot decimal) route through this formatter (§E).

- **[MUST-v1] A2.4 Mass labelling.** Label `Mol kütlesi`, tooltip `Standart atom kütlelerinden (IUPAC 2021, doğal izotop ortalaması)`. Electron mass is ignored in the average molar mass (below shown precision).
- **[MUST-v1] A2.5 Monoisotopic mass.** `exactMass` (already returned by `properties.ts` and shown in the inspector) = Σ `mono` − q × 0.000548579909065 u (CODATA 2018 electron mass). Label `Monoizotopik kütle (en bol izotoplar)`, unit **u** (never g/mol), 4 decimals via the formatter. For Cl or Br the tooltip adds `M+2 piki belirgindir; en yoğun pik bu değer olmayabilir`. No isotope pattern in v1.
- **[MUST-v1] A2.6 Mass composition (`Kütlece yüzde bileşim`).** count × mass / M, unrounded. Unrounded percentages sum to 100 within 1e-9. Displayed values may drift from 100,00 by ≤ 0,005 × element count.
- **[MUST-v1] A2.7 Degree of unsaturation.** Shown only when every atom is C, H, N, O or a halogen at standard valence and neutral; otherwise the row is hidden. For those molecules use the graph value `ringCount + Σ(order − 1)` with aromatic bonds counted at their Kekulé order (equal to the formula value for such molecules, without the `Math.max(0, …)` clamp). Label `Doymamışlık derecesi (halka + π bağı)`.

### A.3 Reference bond lengths

- **[MUST-v1] A3.1 One table.** `bondTargetLength(sa, sb, order, aromatic)` in `geometry.ts` (its `LENGTHS` table) is the only bond-length table. `idealBondLength` in `molecule.ts` delegates to it; `properties.ts` `BondInfo.idealLength` uses it. Fallback for missing pairs stays the Cordero covalent sum × 1 / 0.875 / 0.79 (single/double/triple), as in the code. The table comment is changed to "typical reference lengths rounded to 0.01 Å" with a per-row source tag, either `Allen 1987 (rounded)` (Allen et al., *J. Chem. Soc. Perkin Trans. 2* 1987, S1) or `CCCBDB gas-phase` (e.g. C≡N 1.16 ≈ HCN 1.153; C≡C 1.20 ≈ acetylene 1.203). Key values asserted by tests: C–C 1.54, C=C 1.34, C≡C 1.20, C⋯C aromatic 1.39, C–H 1.09, C–O 1.43, **C=O 1.21**, O–H 0.96, N–H 1.01.
- **[MUST-v1] A3.2 Honest labels.** Geometry produced by `placeNewAtom` or `relaxStep` is labelled `İdealize geometri (enerji minimizasyonu değil)`. The words "optimize/optimise/optimizasyon" do not appear in the UI for this feature; the action is `Geometriyi düzenle (basit kuvvet alanı, yaklaşık)` and no energy number is shown (§E).

### A.4 Geometry: reference molecules and VSEPR

- **[MUST-v1] A4.1 Core demo molecules reproduce experiment.** Several presets come from computed PubChem conformers (current water 0.969 Å / 104.0°, ammonia 1.019 Å / 106.0°, CO₂ C=O 1.197 Å vs experimental 1.162 Å). For the molecules below, `build-library.mjs` generates coordinates from NIST CCCBDB experimental gas-phase parameters. Each row records the CCCBDB structure type (re / r₀ / rz) and access date in a comment; values are copied from the CCCBDB page, not recalled. The measured value in the app then matches within ±0.005 Å and ±0.3°.

| Molecule | Build from (targets; confirm verbatim on CCCBDB) |
|---|---|
| CH₄ | C–H 1.087 (methane()'s 1.09 is within tolerance), H–C–H 109.47° |
| H₂O | O–H 0.958, H–O–H 104.5° (104.48) |
| NH₃ | N–H 1.012, H–N–H 106.7° (re; not the older textbook r₀ value 107.8°) |
| CO₂ | C=O 1.162, 180° |
| C₂H₄ | C=C 1.339, C–H ≈1.086, H–C–H ≈117.6° (draft values 1.087 / 117.4 unconfirmed) |
| C₂H₂ | C≡C 1.203, C–H 1.063, 180° |
| BF₃ | keep library value B–F 1.313 (cited) |
| C₆H₆ | C–C 1.397, C–H 1.084, 120° |

  Every other library description states its actual coordinate source as listed in the `library.ts` header (PubChem 3D conformer = `hesaplanmış`; SO₂, SF₆, BF₃ = experimental; tristearin = RCSB CCD). Angle claims in descriptions must match the coordinates or a cited source.
- **[MUST-v1] A4.2 Geometry card = `AtomInfo`.** The card shows `properties.ts` `AtomInfo` (`hybridization`, `stericNumber`, `lonePairs`, `geometry`), which uses the same classification as `geometry.ts`; there is no second implementation.
  - Lone pairs `LP = (valenceElectrons − charge − Σ bond orders) / 2`; steric number `SN = σ-neighbours + LP`.
  - If `missingHydrogens(atom) > 0`: `hesaplanamadı (yapı eksik)`. If LP is not a non-negative integer, or SN ∉ 2–4 (v1): `hesaplanamadı`.
  - A conjugated N (amide, aniline, pyrrole, which `geometry.ts` treats as planar sp²) shows `düzlem üçgen (konjugasyon, tahmini)`.
  - Ideal angles are electron-pair-geometry values; AX₃E and AX₂E₂ show `< 109,5°`, AX₂E shows `< 120°`, never an invented number.
  - Measured angle: mean of neighbour–centre–neighbour angles from current coordinates, plus min/max when they differ by > 0,5°.
  - `AtomInfo.hybridization` values `'—'` and `'s'` are never rendered; the hybridisation row is hidden instead.

| SN | Notation | Geometry (TR) | Ideal | Hybridisation (tahmini; C, N, O, B) |
|---|---|---|---|---|
| 2 | AX₂ | doğrusal | 180° | sp |
| 3 | AX₃ | düzlem üçgen | 120° | sp² |
| 3 | AX₂E | kırık doğru (açısal) | < 120° | sp² |
| 4 | AX₄ | düzgün dörtyüzlü | 109,5° | sp³ |
| 4 | AX₃E | üçgen piramit | < 109,5° | sp³ |
| 4 | AX₂E₂ | kırık doğru (açısal) | < 109,5° | sp³ |

- **[SHOULD-v1] A4.3 SN 5 and 6** (PF₅, SF₆): `üçgen çift piramit` (90°/120°) and `düzgün sekizyüzlü` (90°) with a `yaklaşık` badge; no sp³d/sp³d² labels; lone-pair variants at SN 5–6 are `hesaplanamadı`.
- **[MUST-v1] A4.4 Angle convention.** Where a reference angle appears next to a measured one: `Ölçülen 104,5° · İdeal (VSEPR) < 109,5° · Deneysel 104,5° (CCCBDB)`. "Deneysel" appears only for the A4.1 molecules. One number is never presented as both ideal and real.
- **[MUST-v1] A4.5 Bond polarity** (already in `BondInfo.deltaEN/polarity`): ΔEN to 2 decimals; class thresholds ΔEN < 0,4 `apolar kovalent`, 0,4–1,7 `polar kovalent`, > 1,7 `iyonik karakter baskın`, each with the badge `kural (yaklaşık)`.
- **[LATER]** Molecule-level polarity verdict (a ΔEN vector sum is wrong for O₃ and CO).

### A.5 Property classification (reconciled with what `properties.ts` computes today)

[MUST-v1] for every property the inspector currently renders. Provenance is shown by inspector grouping and a tooltip on the value; **only `Tahmini` values carry a visible badge** (a badge on every value would break SPEC §2 "minimal visual noise" and D.9 #6).

| Class (how it is shown) | Properties |
|---|---|
| **Referans tablosu** (no badge; tooltip names the table: `Referans tablosu (IUPAC 2021)` for atomic mass, `(Cordero 2008)` covalent radius, `(Bondi 1964)` vdW radius, `(Pauling)` electronegativity) | Z; atomic mass; covalent and vdW radii; electronegativity; valence electrons |
| **Hesaplanan** (no badge; tooltip `molekül grafiğinden hesaplandı`) | atom/bond/heavy-atom counts; bond-order counts; Hill + conventional formula; molar mass; monoisotopic mass; % composition; net formal charge; ring count (SSSR); components; DoU (gated, A2.7); valence state and missing-H count; σ/π counts and bond-order name; ΔEN; rotatable-bond count (the tooltip states the exact rule implemented by `countRotatable`) |
| **Ölçülen** (no badge; tooltip `mevcut koordinatlardan`) | distance, angle, dihedral (IUPAC sign, range (−180°, 180°]); bond length; molecule size (`sizeAng`) |
| **Tahmini** (visible `Tahmini` badge; tooltip names the method) | VSEPR geometry, hybridisation, lone pairs; Gasteiger–Marsili partial charges (label `Gasteiger-Marsili (yaklaşık)`); aromaticity (`perceiveAromaticity`, label `basit Hückel testi`); polar-bond class; functional-group names (pattern-based); H-bond donor/acceptor counts (tooltip states the rule: donors = N/O atoms bearing H, acceptors = all N and O, which also counts N⁺ and amide N); idealised placement/relaxed geometry |
| **Lipinski** | Shown only with the qualifier `3 / 4 kural değerlendirildi (logP hesaplanmıyor)`. Individual rule rows (MW, donors, acceptors) may show their own values; no overall "geçer"/"passes" verdict. Otherwise hidden. |
| **Omitted in v1** | dipole moment and molecular polarity; logP, TPSA, pKa; an overall Lipinski pass/fail verdict (logP is not computed); energies (the relax energy is never shown); R/S chirality; isotope pattern; melting/boiling point, solubility (description prose may cite them only with a source) |

- **[MUST-v1] A5.1** An omitted property never appears as a number, placeholder or progress bar. If a control for it exists it is disabled with `Bu sürümde güvenilir biçimde hesaplanamıyor`.

### A.6 Turkish terminology (`src/ui/i18n.ts`, the existing typed `tr`/`en` dictionary) [MUST-v1]

| TR (UI) | EN | Note |
|---|---|---|
| Molekül formülü (kapalı formül) | Molecular formula | MEB primary term |
| Mol kütlesi | Molar mass (g/mol) | "Molekül kütlesi" is the u-scale term; do not mix |
| Atom kütlesi · Atom numarası | Atomic mass · Atomic number | |
| Monoizotopik kütle | Monoisotopic mass | unit u |
| Kütlece yüzde bileşim | Mass composition | |
| Bağ uzunluğu · Bağ açısı · Dihedral (torsiyon) açısı | Bond length · angle · dihedral | |
| Tekli / Çift / Üçlü bağ (σ, σ+π, σ+2π) · Aromatik bağ (delokalize π) | Single / double / triple · aromatic | |
| Değerlik elektronu · Bağ yapma kapasitesi | Valence electrons · bonding capacity | never bare "değerlik" |
| Ortaklanmamış / bağlayıcı elektron çifti | Lone / bonding pair | |
| Elektron grubu sayısı (sterik sayı) · VSEPR (AXₙEₘ) | Steric number | |
| Hibritleşme (sp, sp², sp³) | Hybridisation | |
| doğrusal · düzlem üçgen · düzgün dörtyüzlü · üçgen piramit · kırık doğru (açısal) | geometry names | |
| Elektronegatiflik farkı (ΔEN) · polar / apolar kovalent bağ · kısmi yük (δ+/δ−) | | |
| Formal yük · Halka sayısı · Doymamışlık derecesi | | |

- **[MUST-v1] A6.1** Turkish upper-casing uses `toLocaleUpperCase('tr-TR')` (i → İ); CSS `text-transform: uppercase` on Turkish text is allowed only under `lang="tr"` on `<html>`. Formulas use real subscripts/superscripts (H₂O, NH₄⁺).
- **[MUST-v1] A6.3 i18n completeness.** `src/ui/__tests__/i18n.test.ts` asserts every `tr` key has a non-empty `en` value (and vice versa), and every user-visible string in `src/ui` comes from `t()`: `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 0 hits.
- **[SHOULD-v1] A6.2** One review pass of the TR strings against a MEB grade 9–12 chemistry textbook or a native-speaker chemistry teacher; record the result in a comment.

### A.7 Scientific test oracles (`src/chem/__tests__/science.test.ts`, `npm test`) [MUST-v1]

2-decimal checks use the A2.3 formatter (TR strings).
1. Molar mass: CH₄ 16,04 · H₂O 18,02 · NH₃ 17,03 · CO₂ 44,01 · C₂H₄ 28,05 · C₂H₂ 26,04 · C₆H₆ 78,11 · C₂H₅OH 46,07 · BF₃ 67,80 · SF₆ 146,05. Raw: CH₄ 16.043, H₂O 18.015 (to 1e-9 of Σ table masses).
2. Monoisotopic: CH₄ 16,0313 · H₂O 18,0106 · NH₃ 17,0265 · CO₂ 43,9898 · C₆H₆ 78,0470 (unit u).
3. Composition: CH₄ C 74,87 % / H 25,13 %; H₂O H 11,19 %; unrounded sums = 100 ± 1e-9 for every library molecule.
4. Formula: methane() → `CH₄`; glycine Hill `C₂H₅NO₂`; ammonia primary `NH₃`, Hill `H₃N`; SO₂ primary `SO₂`, Hill `O₂S`; BF₃ `BF₃`.
5. DoU: CH₄ 0, C₂H₄ 1, C₂H₂ 2, C₆H₆ 4, cyclohexane 1, CO₂ 2; H₂SO₄ → hidden.
6. methane(): four C–H = 1.090 ± 0.001 Å; six H–C–H = 109.47 ± 0.01°; card AX₄, düzgün dörtyüzlü, sp³, LP 0.
7. A4.1 molecules match their table within ±0.005 Å / ±0.3°. H₂O O: AX₂E₂, LP 2, kırık doğru. NH₃ N: AX₃E, LP 1. CO₂ C: AX₂, doğrusal. BF₃ B: AX₃, düzlem üçgen. Aniline N: düzlem üçgen (konjugasyon).
8. `bondTargetLength('C','C',1,true)` = 1.39; `('C','O',2)` = 1.21; `('C','H',1)` = 1.09; `('C','O',1)` = 1.43; `idealBondLength` returns the same values.
9. `dihedralDeg([1,0,0],[0,0,0],[0,0,1],[0,1,1])` = +90.0 ± 1e-9.
10. Valence: neutral 5-bond N → `'over'`; NH₄⁺ → `'ok'`; every library atom → `'ok'`; a bare C with 2 bonds → card `hesaplanamadı (yapı eksik)`.
11. `el('Fe')` throws; `isKnownElement('Se') === false`; `isKnownElement('__proto__') === false`.
12. Element snapshot: the 14 `mass`, `covalent`, `vdw`, `en`, `mono` values equal the A.1 sources exactly; any edit fails until the citation is updated.
13. Geometry gate: `adjustHydrogens` on a bare C returns 4 H at 1.09 ± 0.01 Å; `relaxStep` energy does not increase over 50 steps on methanol.
14. I/O round trip: `parseMolfile(toMolfile(methane()))` and `parseXYZ(toXYZ(methane()))` give the identical formula, bond list (Molfile) and coordinates within 1e-4 Å.

---

## B. Interaction model and editor UX

Behaviour is derived from existing `store.ts` actions; anything needing a new action is listed in §E. Camera mechanics belong to the existing `OrbitControls` rig (`CameraRig.tsx`, `Interaction.tsx`, `sceneContext.ts`); constants come from `scene/theme.ts`.

### B.1 Pointer grammar
- **[MUST-v1] Click vs drag.** A pointer-up is a click only if movement stayed within `CLICK_SLOP_PX` (theme.ts, currently 5 CSS px). After a camera drag none of `clickAtom`, `clickBond`, `clickEmpty` fires. *Verify:* in the Atom tool, a 30 px orbit drag starting on empty space changes neither the atom count nor the undo stack.
- **[SHOULD-v1]** A 10 CSS px slop for touch pointers (§E); mouse/pen keep `CLICK_SLOP_PX`.
- **[MUST-v1] Buttons.** Wheel/pinch zooms smoothly, clamped to `minDistance` = 1,5 Å from the orbit target (absolute) and `maxDistance` = 12 × fit radius, so large molecules can still be inspected atom by atom (SPEC §3C "object inspection"; replaces the fit distance ÷/× `ZOOM_IN_FACTOR` clamp, §E). *Verify:* on tristearin the camera reaches 1,5 Å from the target. Right-drag or two-finger drag pans. Left-drag on empty space orbits in every tool except Pan (pans) and Zoom (dollies). Tool remapping changes `controls.mouseButtons`/`controls.touches` in place, never by remounting. `touch-action: none` on the canvas only.
- **[MUST-v1] Pick targets.** Each atom's pick radius = max(visual radius, `PICK_MIN_ATOM_RADIUS`, an on-screen floor). The floor is ≥ 12 px radius on fine pointers (24 px target, WCAG 2.5.8) and ≥ 22 px radius on `(pointer: coarse)` (44 px target). This is the only pick-radius spec; C and D refer to it. Bonds ≥ 4 px on-screen radius. When atom and bond overlap, the atom wins; otherwise the nearest hit wins. Picking uses model data, not visual meshes. Hidden atoms (H toggle off) are not pickable.
- **[MUST-v1] No hover-only or right-click-only features.** Every hover tooltip has a tap/inspector equivalent.

### B.2 The eight tools (SPEC §3B)
Active state: filled tile + 2 px accent bar on the inner edge + `aria-pressed="true"`. Tooltip shows name and key from `TOOL_KEYS`, e.g. "Seç (V)". Cursor changes over the canvas.

| Tool (key) | Click atom | Click bond | Click empty | Left-drag from atom | Cursor |
|---|---|---|---|---|---|
| Seç / Select (V) | select; Shift/Ctrl/Cmd toggles | select bond | clear selection | move atom on a screen-parallel plane, terminal H follow, one undo step per drag | default / pointer / grabbing |
| Döndür / Rotate (R) | — | — | — | orbit | grab / grabbing |
| Kaydır / Pan (P) | — | — | — | pan | move |
| Yakınlaştır / Zoom (Z) | — | — | — | vertical drag dollies | zoom-in |
| Atom Ekle (A) | H with element ≠ H is replaced; otherwise grow a new atom reusing an H slot (`growFrom`) | cycle order 1→2→3→1 | place active element on the screen-parallel plane through the centroid (origin if empty) | orbit (drag-to-bond is SHOULD, B.3) | crosshair |
| Bağ Ekle (B) | first click arms (`pendingBondFrom`), second creates/sets order, same atom disarms | set active order; if equal, cycle | disarm | mouse/pen: rubber band to the atom under release, which creates the bond; release on nothing cancels (existing `Interaction.tsx`); touch: orbit | crosshair |
| Sil / Delete (D) | delete atom and its terminal H | delete bond | clear selection | orbit | crosshair, danger hover |
| Ölç / Measure (M) | append to chain (max 4); re-clicking a chain atom or a 5th atom starts a new chain | ignored | clear chain | orbit | crosshair |

- **[MUST-v1]** Camera tools never edit or select. Switching tools clears `pendingBondFrom` and (unless switching to Measure) the measure chain; the selection is kept.
- **[MUST-v1] Contextual options** for Atom (element palette from `PALETTE`, bond order 1/2/3, Oto-H switch bound to `autoH`), Bond (order + hint `İlk atomu seçin` / `İkinci atomu seçin · Esc iptal`), Measure (live readout + `Temizle`). Placement: the existing `ToolOptions` strip, top-left of the viewport on desktop/tablet, ~36 px high (D.6.3). The element picker is the existing 14-element `ElementPicker` grid; there is no "…" popover.
- **[MUST-v1] Geometry gate.** `adjustHydrogens` and `relaxStep` are implemented in `geometry.ts`. Oto-H and `Geometriyi düzenle` stay enabled while A.7 #13 passes; if it fails they are disabled with a tooltip giving the reason.
- **[LATER]** Full periodic-table picker (only 14 elements exist).

### B.3 Creation gestures
- **[MUST-v1] Click-to-grow.** *Verify:* on methane, Atom tool, press `O` (selects oxygen), click one H: formula **CH₄O**, mass **32,04 g/mol** (12.011 + 4 × 1.008 + 15.999), new C–O **1,430 Å** (`bondTargetLength`; experimental methanol 1.427 Å, CCCBDB).
- **[SHOULD-v1] Drag-to-bond** (Atom and Bond tools; needs store `bondAtoms`, `growTo`, §E). Past the drag threshold from atom S: ghost bond (35 % opacity) and ghost atom at `bondTargetLength(S, element, order)` along the cursor direction on the screen-parallel plane through S; snaps to atom T within its pick radius + 16 px; chip "C–O · 1,430 Å" or "C→N (mevcut atom)"; an H that already has a bond turns the ghost red with `Hidrojen yalnızca bir bağ yapabilir` and release does nothing; valence overflow turns it red with `Değerlik aşılacak` but release is allowed (store `valenceExceeded` toast). Release = exactly one `commit()`; Esc cancels with no commit. *Verify:* undo stack +1 per completed drag, +0 after Esc.
- **[SHOULD-v1]** Ghost sphere of the active element at the placement point on hover (fine pointers). Right-click without movement on an atom/bond in Atom/Bond tools deletes it (Avogadro convention); right-drag still pans.

### B.4 Hover, selection, focus
- **[MUST-v1] Never recolour atoms or bonds.** Hover and selection shells follow the single normative spec in C3; no pulse loop (SPEC §6). The armed bond atom shows a static ring plus a rubber band to the cursor. The measure chain shows numbered badges 1–4. Hover shells are never shown for touch.
- **[MUST-v1] Hover tooltip** (fine pointers, ~350 ms delay, hidden during drags): atom "O · Oksijen · 2/2 bağ" (+ "· yük -1"); bond "C–H · Tekli bağ (σ) · 1,090 Å" (`BOND_NAMES`). On touch, a tap selects and the inspector/sheet shows the same data.
- **[MUST-v1] Valence ring.** `'over'` shows a thin danger ring in every tool; `'under'` shows a dashed warn ring only when `autoH` is off. Inspector text: "C atomu en fazla 4 bağ yapabilir (şu an 5)".
- **[MUST-v1] Keyboard focus.** Canvas `tabIndex=0` with a 2 px inset accent ring on `:focus-visible`; toolbar `role="toolbar"`, roving tabindex, arrow keys; an sr-only `aria-live="polite"` region announces selection and edits ("Seçildi: C, Karbon, 4 bağ", "O atomu eklendi").
- **[SHOULD-v1]** "Fragmanı seç" (select connected component). Marquee selection [LATER].

### B.5 Camera
- **[MUST-v1] Fit and reset.** Fit frames all visible atoms incl. radii (theme `FIT_FILL`); reset returns to the default oblique view (`DEFAULT_VIEW_DIR`). Transitions use the single constant `CAMERA_TWEEN_MS` (theme.ts, currently 560 ms) with the rig's `easeInOutCubic` (`cameraMath.ts`), and are instant under reduced motion. An on-canvas Fit control exists (bottom-right HUD). `F` (outside the Atom tool) resets/fits the camera (existing). An empty molecule triggers no fit.
- **[MUST-v1] Reduced motion.** With `reducedMotion` true every camera transition is an instant jump and OrbitControls damping is off (existing). (DPR: C5.)
- **[MUST-v1]** An orientation change or a viewport resize > 20 % in width re-fits the camera; resizes from panel animations do not remount the canvas.
- **[SHOULD-v1]** Double-click/double-tap (≤ 300 ms, ≤ 12 px) on an atom in Select/Rotate/Pan/Zoom/Measure retargets the orbit to that atom keeping distance; double-click on empty space fits (needs `focusRequest`, §E). `F` frames the selection when non-empty; `Home` resets. Orbit-pivot marker while orbiting. Axis gizmo (drei `GizmoHelper`) bottom-left, 72 px, axes at ~55 % saturation, hidden < 640 px. No entrance turntable: the existing auto-rotate toggle stays off by default (C6) and keeps its existing speed.

### B.6 Measurement
- **[MUST-v1] Progressive chain** (`measure[]`): 2 atoms distance, 3 angle (2nd atom = vertex), 4 dihedral (signed, (−180°, 180°], `dihedralDeg`). Values come only from `dist`, `angleDeg`, `dihedralDeg` on model coordinates, with the footnote `Model koordinatlarından ölçülmüştür`.
- **[MUST-v1] In-scene drawing.** Dashed line per consecutive pair (one dash pattern: `measureGeometry.ts` `dashSegments`) with a label at its midpoint (3 decimals, "1,090 Å"); angle arc at the vertex (radius 0.35 × shorter arm) labelled to 0,1°; dihedral label "-120,0°" at the central pair's midpoint. Scene labels use only glyphs in `glyphLabels.ts` `CHARS` (no φ, no U+2212; unknown glyphs, including space, are dropped today, so the scene distance reads `1,090Å` unless a space advance is added, §E SHOULD). DOM readouts may write "Dihedral φ = -120,0°". Lines/labels render on top (`depthTest: false`). Labels update live while atoms move.
- **[MUST-v1]** Status/options show progress ("1/4 atom seçildi", then "Mesafe 1,090 Å · Açı 109,5°"). Esc or empty click clears the chain.
- *Verify on launch methane:* H–C = **1,090 Å**; H–C–H = **109,5°**; H–C–H–H dihedral = **-120,0°** (DOM readout "φ = -120,0°").
- **[SHOULD-v1]** Backspace removes the last pick (`popMeasure`); pinned measurements (`pinnedMeasures`); "ideal 109,5°" next to an angle only when A4.2 returns a value for the vertex.

### B.7 Keyboard map (single source: `src/ui/shortcuts.ts`)
- **[MUST-v1]** `TOOL_KEYS` drives the key handler, toolbar tooltips and the `?` cheat sheet, so they cannot disagree. Keys are ignored in inputs, textareas, selects, contenteditable, menus and open dialogs; `e.repeat` is ignored for letters.

| Keys | Action |
|---|---|
| `V R P Z A B D M` (`E` also = Delete) | tools |
| In the Atom tool: element letters `H B C N O F P S I`; two-letter symbols `Cl Br Na Mg Si` via a 700 ms buffer (`BUFFER_MS`); a lone `M` becomes Measure after the buffer expires | set element |
| `F` (outside Atom tool) | reset / fit camera |
| `Esc` | non-Select tool → Select; in Select → clear selection and measure chain |
| `Delete`, `Backspace` | `deleteSelection` (toast if nothing selected) |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl+Y` | undo / redo / redo |
| `Ctrl/Cmd+A` | select all |
| `Ctrl/Cmd+S` | save now (`preventDefault`) |
| `?` | shortcut cheat sheet |

- **[SHOULD-v1]** Additions in `shortcuts.ts`: `1 2 3` bond order, `S` cycle style, `L`/`H` labels/hydrogens (outside the Atom tool), `+`/`-` zoom, `Home` reset, arrow keys orbit 15° when the canvas is focused.

### B.8 Undo
- **[MUST-v1] One history entry per user intent** (each click edit, completed atom drag, element/charge/order change, delete, add/remove H, library load, clean-up, molecule rename). Depth `HISTORY_LIMIT` (100). A new commit clears redo.
- **[MUST-v1] Never in history:** selection, hover, tool, active element, bond order, style, camera, labels, measure chain, project name. `replaceMolecule` (launch, `?m=`) starts with empty history.
- **[MUST-v1]** Undo/Redo buttons are visibly disabled when their stack is empty; tooltips show the shortcut.
- **[SHOULD-v1] Labelled undo** ("Geri alındı: O atomu eklendi"; needs `pastLabels`/`futureLabels`).

### B.9 Empty, disabled, error states
- **[MUST-v1] Empty molecule.** Viewport shows `Çalışma alanı boş` and `Bir element seçip tıklayın veya kütüphaneden molekül açın` with two real buttons (Atom ekle → `setTool('atom')`, Kütüphane → `openDialog('library')`). Inspector: formula and mass rows are omitted (never `0 g/mol`, never "—"); the empty-state message and 0 atoms / 0 bonds are shown.
- **[MUST-v1] Startup molecule.** If the restored molecule has 0 atoms or fails validation (A1.1), launch `methane()`. The demo URL is `?m=metan`.
- **[MUST-v1] Invalid selection.** Stale ids are pruned; the inspector never renders a stale atom card.
- **[MUST-v1] WebGL unavailable** → `Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor` instead of a blank canvas; inspector/data stay usable; edit tools disabled with that reason.
- **[MUST-v1] Context lost** → `preventDefault()`, overlay `3B görünüm yeniden başlatılıyor…` (new key `app.viewRestarting`), state kept; if `webglcontextrestored` does not fire within 3 s, a `Yeniden yükle` button (existing `app.reload`) remounts the canvas by key with the same molecule. Unrecoverable failures use the existing `app.viewError.*` strings. This is the only context-loss flow. *Verify:* `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()` shows the overlay; `restoreContext()` restores the identical molecule.
- **[MUST-v1] Save failure.** `saveStatus === 'error'` shows `Kaydedilemedi` with a tooltip; `Tarayıcıda kaydedildi` only after a successful write (the scope is this browser's localStorage, SPEC §8).
- **[MUST-v1] Crash containment.** `el()` throws for unknown symbols (A1.1), so React error boundaries wrap the Viewport (existing boundary in `ViewportHost.tsx`) and the Inspector (new, §E); each renders `app.viewError.*`-style text with `Yeniden yükle`, never a blank page. *Verify:* in dev, injecting an atom with symbol `Xx` into the store shows the boundary message and the rest of the UI stays usable.
- **[MUST-v1] Console.** Zero warnings/errors through the B.10 script (SPEC §8); the existing `consoleFilter.ts` drops only the R3F/three `THREE.Clock` deprecation message.

### B.10 First 30 seconds (judge path; rehearse at 1366×768 and 390×844 from the standard viewport list, fresh profile)
- **[MUST-v1]**
  1. **0–2 s.** Methane visible, fitted, oblique view, ball-and-stick, no spinner. Status bar shows the style, 5 atoms, 4 bonds. Inspector: **CH₄ · 16,04 g/mol**.
  2. **2–8 s.** Hover C: shell + "C · Karbon · 4/4 bağ". Click C: Z = 6, 12,011 u, coordinates (0,000; 0,000; 0,000) Å, geometry card AX₄ / düzgün dörtyüzlü / sp³.
  3. **8–15 s.** Press `M`, click H, C, H: arc with **109,5°**.
  4. **15–20 s.** Choose Space-filling in the style control: radii ease from the ball-and-stick display radius to 1.00 × vdW (real geometry change). Return to Ball-and-stick.
  5. **20–27 s.** Press `A`, then `O`, click an H: **CH₄O · 32,04 g/mol**.
  6. **27–30 s.** Ctrl+Z returns to CH₄ · 16,04 g/mol.
- **[SHOULD-v1]** One-time dismissible hint chip "Çift tıkla: odaklan · ? kısayollar", remembered in localStorage.

### B.11 Differentiators [SHOULD-v1]
Live valence-aware drag-to-bond; chemistry-native typing (Cl as C then l); outline selection without recolouring; labelled undo. [LATER] context menu, periodic-table picker, marquee/group move, bond-length/torsion editing, standard-view hotkeys, ortho toggle, fragment templates.

### B.12 Inspector cards and editing an existing atom [MUST-v1]
Every row below is shown only when its value is computable (B.9, D.6.5); provenance per A.5.
- **Atom card:** symbol and name, Z, atomic mass (u), coordinates (Å, 3 dp), valence state (`n/max bağ`, A2.2 messages), geometry card (A4.2), Gasteiger charge (`Tahmini`).
  - **Element değiştir:** opens the existing `ElementPicker` and calls `changeElement`.
  - **Formal yük:** a stepper from −2 to +2 calling `setCharge` (makes N⁺(=O)O⁻ nitro groups buildable, A1.2).
  - Each change is exactly one undo entry (B.8). The existing touch long-press quick actions (change element / delete) reach the same actions.
- **Bond card:** the two atoms (symbol + id), order name with σ/π composition (`BOND_NAMES`), measured length (Ölçülen, 3 dp), reference length (`bondTargetLength`, Referans tablosu with its row source tag, A3.1), ΔEN and polarity class (A4.5), in-ring and aromatic flags.
- **No-selection (molecule) card:** name, formula (conventional, Hill in the tooltip, A2.1), molar mass, monoisotopic mass (A2.5), mass composition (A2.6), atom and bond counts, ring count, net formal charge, DoU (gated, A2.7), the A2.2 completeness note; the existing estimate sections follow with their `Tahmini` badges and the Lipinski qualifier (A.5). Library molecules also show their coordinate-source line (A4.1); PubChem molecules show `Kaynak: PubChem`.
- *Verify:* select C in methane, change it to Si: formula `SiH₄`, one undo entry; set an N's charge to +1 and the valence ring and A2.2 messages update.

### B.13 Library, import/export and settings [MUST-v1]
- **Library dialog** (existing `openDialog('library')`, `LibraryBody.tsx`): every `library.ts` entry, grouped by its `category` (7 categories today); Turkish name and `nameEn` per language; the existing diacritic- and dotless-i-insensitive search; each entry shows its coordinate-source line (A4.1). Loading is one undo entry (`loadMolecule`); `?m=` uses `replaceMolecule` with an empty history (B.8).
- **Import** (`io.ts`: Molfile V2000, SDF, XYZ): failures map the existing `ChemIOError` codes to localized messages (`ui/actions.ts`); `tooLarge` states the 5 000-atom limit (existing `toast.importAtoms`); unknown elements and D/T follow A1.1. A successful import is one undo entry; a failed one leaves the molecule unchanged.
- **PubChem** (existing dialog): disabled with `Çevrimdışı: PubChem kullanılamıyor` (new key) when `navigator.onLine` is false; requests never block the UI (existing timeout/busy/network errors stay); loaded molecules are attributed `Kaynak: PubChem`.
- **Export:** MOL and XYZ download (`toMolfile`, `toXYZ`) and a PNG screenshot (`preserveDrawingBuffer` is already true); an empty molecule shows the existing `file.exportEmpty` message instead. *Verify:* A.7 #14 round trip.
- **Settings** (SPEC §3A): only real settings — language TR/EN, motion (system / reduced / full), Oto-H, the shortcut sheet link and the about/approximation notes. Display toggles (hydrogens, labels, charges, and fog only if the C2 fog ships) live in the View menu or in Settings, never in both with separate state. No placeholder entries.

---

## C. Rendering and performance

"Display radius" is a visual convention and never shown as a physical value. Physical radii and colours come only from `elements.ts` (A.1). Style parameters live in `scene/styleParams.ts` (`STYLE_TARGETS`); this section binds outcomes, not those numbers.

### C1. Render modes (SPEC §4: geometry must differ)
- **[MUST-v1] Four distinct modes from the same `Molecule`.** `ballstick` (launch default; scaled vdW spheres, smaller H, cylinder bonds), `spacefill` (full Bondi vdW radii, bonds not drawn), `stick` (uniform joined sticks), `wireframe` (thin lines + points; an atom with zero bonds stays visible). A mode switch changes only instance scales/visibility, never molecular data, and does not remount `<Canvas>`. *Verify:* switch modes 20 times; `snapshot().render.geometries` and `.textures` stay constant; `snapshot().camera` is unchanged; `snapshot().atoms[i].radius` differs between ballstick and spacefill for every atom.
- **[MUST-v1] Bond halves** in each end atom's colour, split between the two sphere surfaces (midpoint in wireframe).
- **[MUST-v1] Multiple bonds** from `Bond.order` as 2 or 3 parallel strands; the offset direction is computed from the data (plane of the bond and a neighbour; fallback perpendicular), never from the camera, so it does not flip while orbiting. *Verify:* in ethene both strands lie in the H–C–H plane.
- **[SHOULD-v1]** Aromatic bonds (`aromatic === true`) as one solid + one dashed inner strand toward the ring centre.
- **[MUST-v1]** `showHydrogens = false` removes H atoms and their bonds from rendering and picking; formula, mass and counts are unchanged.
- **[MUST-v1] Launch framing.** Oblique default view where no C–H bond is eclipsed; all 4 H visible, none overlapping the C silhouette by > 50 % (*Verify:* `snapshot().atoms[].screen` and radii); `snapshot().bbox` centred within 5 % of the visible viewport centre.

### C2. Materials, lighting, background
- **[MUST-v1]** Shared geometries/materials per primitive type with per-instance colour; instance colour slots are initialised before first render.
- **[MUST-v1] Tone mapping:** the existing ACES filmic (exposure 1.05, `Viewport.tsx` `onCreated`) stays in v1. Element colours must remain distinguishable (O red, N blue, Cl green, S yellow in a screenshot). The switch to Neutral tone mapping with a hue check is a §E SHOULD migration.
- **[MUST-v1] Lighting:** no shadow maps; a camera-relative key light so shading stays constant while orbiting, plus a soft fill (existing `Lighting.tsx` decides the values).
- **[MUST-v1] Background:** one luminance-only vignette is allowed (`theme.ts` `BG_EDGE #08090b` → `BG_CENTER #121419`, `Background.tsx`). No other gradient, no glow, no bloom. `index.css` `.viewport-bg` must use the same two values (§E).
- **[SHOULD-v1]** Procedural environment reflections (no CDN `preset=`); linear depth fog with a fog factor ≤ 0,35 at the farthest visible atom centre, asserted from `snapshot()` camera near/far and atom depths (toggle per B.13; measure lines/labels unaffected).
- **[LATER]** SSAO "High quality" toggle (would need `@react-three/postprocessing` + `postprocessing`, whose versions and three peer range are unverified here; v1 adds no runtime dependency, C8).

### C3. Selection, hover and overlays
- **[MUST-v1] Shell spec (normative; B.4 and D.2 refer here).** Hover: `accent`, opacity 0.45, ≈ 1.5 px wide at the fitted view. Selected: ≈ 1 px `surface-0` inner rim + ≈ 2 px `accent` outer rim, opacity 1, one scale-in over `--dur-fast` (120 ms), then static. Delete-tool hover uses `danger`. Hover shells are never shown for touch. [SHOULD-v1] widths stay screen-constant across zoom (the existing `SHELL_THICKNESS` is a world-space value, §E).
- **[MUST-v1]** Selection/hover never alter an atom's colour; shells are separate instanced geometry rebuilt only when `selection`/`hovered`/`selectedBond`/`hoveredBond` change; no looping animation keeps the demand frameloop busy. In wireframe the selected bond is a thicker accent line.
- **[MUST-v1] Labels** (element labels, charges, measurement values) use the existing screen-space glyph atlas (`glyphLabels.ts`) at constant CSS-px size, in one draw call; not DOM overlays and not 3D text meshes.
- **[LATER]** Global silhouette outline pass.

### C4. Instancing, picking, render isolation
- **[MUST-v1]** Instanced meshes keep an index → stable id map; an instance index is never used as an id. Buffers grow in chunks; old meshes are disposed on replacement. Instanced meshes have `frustumCulled = false` (r186 does not recompute the instanced bounding sphere after edits).
- **[MUST-v1]** Pointer-down (mouse/pen) on an atom in the Select and Bond tools only (plus the Atom tool once drag-to-bond ships, B.3) disables OrbitControls before it sees the press; never in Delete, Measure or the camera tools (they orbit, B.2) (existing capture-phase handler in `Interaction.tsx`) and re-enables it on pointer-up. *Verify:* after dragging an atom, `snapshot().camera.position` is identical to before the drag.
- **[MUST-v1] Render isolation.** Atom/bond rebuilds subscribe only to `mol`, `style`, `showHydrogens` (and LOD tier); hover/selection updates only shells and tooltips. *Verify (React Profiler):* sweeping the cursor across 20 atoms does not re-render the atom/bond layer.

### C5. Performance budget
- **[MUST-v1]**

| Metric | Budget |
|---|---|
| Idle frames (nothing changing, 5 s) | 0 (`snapshot().render.frame` unchanged; field added in §E) |
| Draw calls vs atom count | do not scale: methane vs tristearin (largest library entry) differ by ≤ 4 calls (`snapshot().render.calls`) |
| Orbit of tristearin | p95 frame time ≤ 16,7 ms on the dev machine, sampled from rAF timestamps with `snapshot().render.frame` during a scripted orbit; log saved in `gauntlet/logs/` |
| Edit to visible result (≤ 500 atoms) | next rendered frame, ≤ 32 ms |
| Geometries/textures after 20 load–undo–new cycles | no growth (`snapshot().render`) |

- **[SHOULD-v1]** Orbit at 1 000 atoms p95 ≤ 18 ms (Iris Xe class, 1080p, dpr 1); draw calls for a 1 000-atom fixture within 4 of methane; instance rebuild at 1 000 atoms + 1 000 bonds ≤ 2 ms; initial JS ≤ 500 KB gzip. Stress fixture `?stress=N` only behind `import.meta.env.DEV`.
- **[MUST-v1] DPR:** cap 2 (existing `dpr={[1, 2]}`); [SHOULD-v1] cap 1.5 on coarse pointers, adaptive DPR during orbit returning to full sharpness ≤ 250 ms after rest, final sharp frame guaranteed by `invalidate()`.
- **[MUST-v1]** Do not mount drei `PerformanceMonitor` (it misreads sparse demand-mode frames as low fps).
- **[SHOULD-v1]** Geometry LOD by visible atoms (≤ 300 / 301–2 000 / > 2 000) with ±10 % hysteresis; debounced canvas resize. In three r186 an `IcosahedronGeometry` of detail d has 20·(d+1)² triangles (d=5 → 720, d=3 → 320, d=2 → 180).
- **[LATER]** Impostors, `BatchedMesh`, BVH, WebGPU (only with protein-scale import).

### C6. Frameloop and animation
- **[MUST-v1]** `frameloop="demand"`. Frames are requested only by prop changes, control events, explicit `invalidate()` after imperative writes, and bounded animations that stop invalidating when done (style morph, fit/reset tween, relax ticks ≤ 240, selection scale-in). No `state.clock`, no drei `<Float>`, no always-on loops; auto-rotate off by default.

### C7. Reduced motion
- **[MUST-v1]** Single source: the store's `reducedMotion` (system preference or override, live via `matchMedia`). When true: camera moves are instant, damping off, auto-rotate skipped (toggle disabled with reason), `cleanUp` runs the relaxation synchronously and commits once (store request, §E), UI wrapped in `<MotionConfig reducedMotion="user">`. *Verify:* Fit, Reset and Clean-up each change the image within 1–2 rendered frames (`snapshot().render.frame`).

### C8. Disposal and dependencies
- **[MUST-v1]** Shared geometries/materials are created once and disposed when `<Canvas>` unmounts; loading a molecule rewrites instance buffers and allocates no geometry (*Verify:* `snapshot().render.geometries` unchanged across library loads).
- **[MUST-v1] No new runtime npm dependencies in v1 (MUST or SHOULD).** The installed three 0.186.x, R3F 9.8.x, drei 10.7.x and React 19 cover everything above. Dev-only tooling (tests, screenshot automation) may be added as devDependencies only.
- **[LATER]** Accessible off-canvas atom list; temporal AO for screenshot mode.

---

## D. Design system and responsive layouts

The tokens in `src/index.css` are the baseline; this section names their roles and adds only what is missing. Contrast ratios were computed with the WCAG 2.x relative-luminance formula on the exact hex values (WCAG 1.4.3, 1.4.11).

### D.0 Thesis
- **[MUST-v1] Hierarchy.** The viewport is the brightest, most saturated region. Chrome is neutral near-black, separated by small luminance steps, not hue, shadow or glass. Saturated colour comes only from element colours, the single accent (selection, active tool, focus) and state colours (ok/warn/danger as dots, icons or text).
- **[MUST-v1] Panel model.** Desktop panels are docked and flush (radius 0, 1 px dividers), never floating cards. Only overlays are rounded (HUD chips, popovers, menus, sheet, dialogs).

### D.1 Colour tokens
- **[MUST-v1]** Components use token utilities only. `rg "#[0-9a-fA-F]{3,8}" src/ui --glob "*.tsx"` returns 0 hits (exceptions: CPK data in `chem/elements.ts` and the scene mirror `scene/theme.ts`; the hard-coded `#9aa1ab` in `icons.tsx` is migrated, §E).

**D.1.1 Existing tokens (values kept)**

| Token | Hex | Role |
|---|---|---|
| `surface-0` | `#0a0b0d` | app root, scene edge |
| `surface-1` | `#101114` | docked panels: top bar, rail, inspector, status bar, sheet |
| `surface-2` | `#16181c` | inputs, segmented controls, popovers, tooltips, menus, toasts |
| `surface-3` | `#1d2025` | hover fill |
| `line` | `#23262c` | dividers (decorative) |
| `line-strong` | `#323640` | popover/menu/dialog edge, hover border |
| `ink` | `#e6e8eb` | values, names, active labels |
| `ink-dim` | `#9aa1ab` | field labels, units, status bar, resting icons |
| `ink-faint` | `#868e99` | hints, kbd chips, captions; never the only carrier of a needed fact |
| `accent` | `#5ec8e5` | active tool, selection (UI and 3D), focus ring, primary button |
| `accent-dim` | `#2b6f82` | selected-row border, active-tool track |
| `ok` / `warn` / `danger` | `#5fb983` / `#d9a441` / `#e5605a` | save state, valence badges, errors |

**D.1.2 Additions [MUST-v1]:** `surface-4 #262a31` (pressed / selected-row fill); `line-ctl #6b7078` (border of controls whose only cue is the border); `accent-subtle = color-mix(in srgb, accent 14%, surface-1)` ≈ `#1b2b31` (active tool, selected row); `on-accent #061418`; `danger-solid #c8423e`; `hud rgb(10 11 13 / 0.86)`; `hud-line rgb(255 255 255 / 0.10)`.

**D.1.3 Verified contrast** (min 4.5:1 text, 3:1 boundaries/focus)

| Pair | s0 | s1 | s2 | s3 | s4 / accent-subtle |
|---|---|---|---|---|---|
| ink | 16.04 | 15.38 | 14.48 | 13.31 | 11.73 / 11.91 |
| ink-dim | 7.56 | 7.25 | 6.82 | 6.27 | 5.53 / 5.61 |
| ink-faint | 5.95 | 5.70 | 5.37 | 4.93 | **4.35 / 4.42 ✗** |
| accent | 10.19 | 9.77 | 9.20 | 8.45 | 7.46 / 7.57 |
| danger | 5.77 | 5.53 | 5.21 | 4.79 | — |
| line-ctl (boundary) | 3.95 | 3.79 | 3.57 | 3.28 | — |

Also: on-accent on accent 9.70; white on danger-solid 4.88; HUD at α 0.86 over an H atom (`#f2f2f2`): ink 11.54, ink-dim 5.44 (α 0.78 fails at 4.11, so α ≥ 0.86).
- **[MUST-v1]** `ink-faint` is never placed on `surface-4` or `accent-subtle`; selected/pressed rows switch to `ink-dim`. Disabled text (ink-faint at 50 %) never carries information.
- **[MUST-v1] Verify:** `src/ui/tokens.test.ts` parses the `@theme` block and asserts every D.1.3 pair at its threshold, and asserts that `scene/theme.ts` `ACCENT`, `ACCENT_DIM`, `DANGER`, `WARN` equal the CSS tokens (the scene/UI mirror; no new `tokens.ts` module).

### D.2 Selection and hover in 3D
- **[MUST-v1]** Element colours are preserved in every state. Hover and selected shells use the C3 values (hover chip in addition). The selected shell is two-tone — inner `surface-0` rim and outer accent rim at full opacity — so it reads against C (`#909090`, accent vs C only 1.65:1) and H (`#f2f2f2`, 1.73:1) through the dark rim (accent vs `#0a0b0d` = 10.19); the matching inspector state updates at the same time. Bonds use the same treatment. Selection never relies on hue alone.

### D.3 Typography
- **[MUST-v1] Scale:** `text-formula` 20 (largest in the app), `text-title` 16, `text-ui` 13, `text-label` 12, `text-micro` 11 only for uppercase captions and units beside a 13 px value. No lowercase text below 12 px. Weights 400/500/600 only. ≤ 4 sizes visible in the inspector (20/16/13/11), ≤ 3 elsewhere.
- **[MUST-v1] Numerals:** all numeric readouts use `tabular-nums`; value in `ink`, unit in `ink-dim` after a thin space. Formulas use real sub/superscripts with a plain-text `aria-label` ("C H 4").
- **[MUST-v1] Turkish glyphs:** the font renders `İ ı Ş ş Ğ ğ Ö ö Ü ü Ç ç` with correct dotted/dotless I; `<html lang>` follows the UI language.
- **[SHOULD-v1]** Self-hosted Inter Variable as one woff2 file committed under `public/fonts/` with its OFL licence (an asset, not an npm dependency, C8), `font-display: swap`.

### D.4 Spacing, radius, elevation
- **[MUST-v1]** 4 px base (2/4/6/8/12/16/24/32); panel padding 12; section gap 16; inspector rows ~28 px, label left in `ink-dim`, value right in `ink`; flat sections with caption + divider, no card-in-card. Control size from the existing `--hit` (32 px desktop, 44 px tablet/mobile/coarse); compact desktop controls ≥ 24×24 hit area (WCAG 2.5.8).
- **[MUST-v1]** Radius: 4 px chips/badges, `--radius-ctl` 6 px controls, `--radius-panel` 8 px popovers/menus/HUD/toasts, 12 px sheet top and dialogs; full rounding only for status dots and switch tracks. Docked panels have no shadow; popovers `0 8px 24px rgb(0 0 0/.5)` + `line-strong`; dialogs `0 16px 48px rgb(0 0 0/.6)`; no coloured or glow shadows.

### D.5 Iconography
- **[MUST-v1]** Lucide for all generic icons. Custom tool icons (`src/ui/icons.tsx`) are allowed only on the Lucide 24-unit grid. One strokeWidth app-wide: **1.75** (matching `icons.tsx`). Colour `currentColor` (`ink-dim` rest, `ink` hover, `accent` active); outline only; no emoji, no filled/outline mix.
- **[MUST-v1]** Each tool has a distinct icon (where the existing toolbar has none, default to Lucide `MousePointer2`, `Rotate3d`, `Hand`, `ZoomIn`, custom AtomPlus, custom Bond, `Eraser`, `Ruler`). Every icon-only button has a localized `aria-label`; toggles also `aria-pressed`.

### D.6 Component specs (targets; existing `layout.ts` / component sizes win if they already satisfy the outcome)
- **[MUST-v1] D.6.1 Top bar** (~44 px; 40 px when height < 500 px): logo + wordmark (hidden < 640 px), inline-editable project name (Enter commits, Esc/empty reverts), save indicator driven only by `SaveStatus` (saved `ok` "Tarayıcıda kaydedildi", saving `accent` "Kaydediliyor…", unsaved `warn`, error `danger` with retry; no spinner, since localStorage writes are synchronous), undo/redo (disabled when empty), View menu, Info toggle (`aria-pressed`, opens inspector/sheet), Settings.
- **[MUST-v1] D.6.2 Tool rail** (48 px): two groups (Navigation: Select, Rotate, Pan, Zoom · Edit: Atom, Bond, Delete, Measure) split by a divider. States: rest transparent/`ink-dim`; hover `surface-3`/`ink`; active `accent-subtle` + `accent` icon + 2 px accent bar (not colour-only); pressed `surface-4`; focus ring; disabled `aria-disabled` + tooltip with reason (only for genuinely unavailable tools).
- **[MUST-v1] D.6.3 Tool options strip** (the existing `ToolOptions`): ~36 px, top-left of the viewport with an 8 px inset on desktop/tablet (existing mobile placement kept), visible for Atom/Bond/Measure; content swaps in 120 ms without moving the bar; no "…" popover (the periodic table is [LATER]; `ElementPicker` is the picker).
- **[MUST-v1] D.6.4 Viewport HUD:** `hud` fill, 1 px `hud-line`, `radius-panel`, no `backdrop-filter`. Render-style segmented control labelled with text (Top-çubuk / Uzay dolgu / Çubuk / Tel kafes), indicator slide ≤ 200 ms; Fit and Reset bottom-right; chips stay inside the canvas (flip at edges).
- **[MUST-v1] D.6.5 Inspector:** `surface-1`, left `line` border, ~300 px (resizable 260–360 px via a `role="separator"` handle with arrow keys [SHOULD-v1]), collapsible with an edge tab, state persisted. One shared `<InspectorContent/>` reused by the tablet drawer and mobile sheet. Content swap is opacity-only (≤ 120 ms). Values that cannot be computed are absent, not "—".
- **[MUST-v1] D.6.6 Status bar** (24 px, 12 px `ink-dim`, tabular nums): style │ atoms │ bonds │ selection ("O3 seçili" / "Seçim yok") │ live camera status from the store │ contextual hint in `ink-faint`.
- **[MUST-v1] D.6.7 Tooltips/menus/toasts:** tooltip `surface-2`, 12 px, kbd chip only for keys that exist in `shortcuts.ts`, ~400 ms open, never on coarse pointers. Menus `surface-2`, roving focus, Esc closes and returns focus. Toasts bottom-centre above the status bar (mobile: above the sheet peek), ≤ 2 lines, 4 s auto-dismiss paused on hover/focus, `role="status"` (`alert` for errors).
- **[MUST-v1] D.6.8 Focus:** keep the global `:focus-visible` rule (2 px accent, 2 px offset; 9.77:1 on surface-1); dense rows `outline-offset: -2px`; invalid input = `danger` border + inline 12 px message.

### D.7 Motion
- **[MUST-v1] Tokens:** `--dur-instant 80ms` (hover/press), `--dur-fast 120ms` (tooltips, toggles, selection shell), `--dur-base 200ms` (panel collapse, popovers, segment slide, style morph), `--dur-slow 320ms` (sheet settle). Camera tweens use `CAMERA_TWEEN_MS` and the rig's `easeInOutCubic` (B.5). Easing `--ease-ui` (existing `cubic-bezier(0.2,0,0,1)`). Exits ≈ 60 % of enter. Springs critically damped, no bounce/elastic.
- **[MUST-v1]** UI animates only `transform`, `opacity` and inspector width; the canvas resizes through its ResizeObserver without remounting. No idle rAF work for 5 s (Performance panel / `snapshot().render.frame`). Under `[data-reduced-motion="true"]` CSS durations collapse to 0.01 ms (existing), sheet snaps jump, opacity fades ≤ 80 ms allowed.
- **[SHOULD-v1]** Ball-and-stick ↔ space-fill morphs the instanced radii over ~200 ms (existing `STYLE_TAU` easing satisfies this).

### D.8 Responsive interaction models
- **[MUST-v1] Breakpoints** via `data-layout` from `matchMedia`: mobile < 640, tablet 640–1023, desktop ≥ 1024; `(pointer: coarse)` forces `--hit: 44px`; height < 500 px gives the compact top bar.
- **[MUST-v1] Desktop:** grid `48px | minmax(0,1fr) | inspector` × `44px | 1fr | 24px` at `100dvh`; persistent panels, none overlapping the viewport.
- **[MUST-v1] Tablet:** 48 px rail with 44 px buttons; inspector as a right drawer (~320 px) toggled by Info, collapsed in portrait, open in landscape, no scrim, molecule kept centred in the uncovered area; status bar stays; long-press (500 ms) replaces hover tooltips.
- **[MUST-v1] Mobile:** full-bleed viewport under the top bar (mark, truncated name, undo/redo, overflow menu: View, Settings, Info); bottom tool bar 52 px + `env(safe-area-inset-bottom)` with 6 buttons of 44 px: Select, Atom, Bond, Delete, Measure, More (Rotate/Pan/Zoom sit under "More", since one-finger orbit works in every tool).
- **[MUST-v1] Bottom sheet** (`<InspectorContent/>`, `uiStore.infoSnap`, already defaulting to `peek`): non-modal, 36×4 grabber in a 24 px handle; detents peek ≈ 72 px + safe area (formula + molar mass), half ≈ 45dvh, full ≈ 88dvh with a scrim that returns to half. Selecting an atom raises peek → half; clearing returns to peek; never dismissed below peek; Esc/Back drops one detent; velocity-projected snapping (> 0.5 px/ms flings); grabber `role="button"` naming the detent.
- **[MUST-v1] Gestures:** canvas `touch-action: none` (one finger orbit, pinch zoom, two-finger pan); sheet content `touch-action: pan-y; overscroll-behavior: contain`. *Verify on touch:* pinching never scrolls or zooms the page.
- **[MUST-v1] Molecule visible above the sheet:** at the half detent the fitted molecule's projected bounds sit above the sheet edge (view offset or target shift, debounced ~100 ms after settle), with no zoom jump.
- **[MUST-v1] No horizontal overflow** at every standard viewport (360×740, 390×844, 768×1024, 1024×768, 1366×768, 1920×1080): `document.documentElement.scrollWidth <= innerWidth`.

### D.9 Forbidden anti-patterns (any hit fails review) [MUST-v1]
1. Gradients other than the single luminance-only viewport vignette (`BG_EDGE #08090b` → `BG_CENTER #121419`, mirrored in `.viewport-bg`). No gradient buttons, text, borders or logo.
2. Glow/neon shadows, animated or glowing borders, coloured shadows.
3. `backdrop-filter` / `backdrop-blur` anywhere.
4. Purple/indigo/pink accents, "AI sparkle" icons, a second accent, element colours used as chrome.
5. Text > 20 px, marketing copy, panel headings larger than `text-title`.
6. Card-in-card, a bordered card per section, KPI tile grids, decorative charts, pastel pill badges.
7. Fully rounded buttons/tabs (except status dots and switches); floating desktop panels with large shadows.
8. Emoji icons, icons off the 24-unit grid, mixed stroke widths (≠ 1.75), mixed icon sizes within one region, filled/outline mixes.
9. Lowercase text < 12 px; `ink-faint` carrying essential information; text below 4.5:1.
10. Fake affordances: decorative buttons, fake progress, hard-coded stats, "AI"/"simulation"/"optimized" labels on features that don't exist, "—" placeholders for uncomputed properties.
11. Pure `#000` or `#fff` in UI CSS.
12. Bounce/elastic easing, looping pulses, parallax, auto-rotate on by default.
13. Hover-only or right-click-only features; a tooltip as the only label for a primary touch action.
14. Desktop layout scaled down for mobile; layout shift or scene remount when panels toggle.
15. Focus outlines removed without replacement; default light OS scrollbars (style thin, `line-strong` thumb, `scrollbar-gutter: stable` on the inspector).
- **Verify:** `rg -n "gradient|backdrop-(blur|filter)|#000\b|#fff\b|shadow-\[0_0" src/ui src/index.css` returns only the `.viewport-bg` line.

### D.10 Acceptance checks for this section
- **[MUST-v1]** `vitest run` passes `tokens.test.ts`.
- **[MUST-v1]** Screenshots at every standard viewport (360×740, 390×844, 768×1024, 1024×768, 1366×768, 1920×1080) in TR and EN, taken through the harness's browser automation (if Playwright is added, it is a devDependency only), show: methane centred in the visible viewport area; sheet at peek on mobile; no overflow; active-tool indicator visible; save dot matching the store.
- **[MUST-v1]** Keyboard-only pass: Tab reaches top bar → rail → viewport → HUD → inspector, each with a visible ring; Esc closes the topmost overlay.
- **[SHOULD-v1]** Blind A/B by a fresh-context critic of a 1366×768 screenshot against Linear/Raycast/Blender chrome references; iterate until preferred or tied.
- **[LATER]** Light and high-contrast themes, Ctrl/Cmd+K palette, P3 accent, dockable rail.

---

## E. Migrations (changes to existing decisions; owner module named)

Owners may implement these; nothing else in this addendum overrides existing code.

**MUST-v1**
1. `chem/elements.ts`: add `isKnownElement` (`Object.hasOwn`), `getElement`, throwing `el()`; N valences `[3]`; `mono` field; `VALENCE_ELECTRONS` as the single table; provenance comments (A1.1–A1.6).
2. `chem/molecule.ts`: `idealBondLength` delegates to `geometry.ts` `bondTargetLength` (move or re-export to avoid a cycle); `missingHydrogens`/`targetValence` hypervalent rule (A1.3); gated graph DoU (A2.7); `CONVENTIONAL_FORMULA` (A2.1).
3. `chem/properties.ts`: read `mono` from elements (remove `MONO_MASS` and the `el().mass` fallback; electron mass 0.000548579909065); return unrounded `composition.percent`; `unsaturation` becomes `number | null` per A2.7; `AtomInfo` reports `hesaplanamadı` states and conjugated-N planarity (A4.2).
4. `chem/io.ts`: use `isKnownElement`; reject D/T with `Desteklenmeyen izotop` (A1.1).
5. `gauntlet/scratch/build-library.mjs` (regenerates `chem/library.ts`): CCCBDB coordinates for the A4.1 molecules with structure type + access date; per-entry coordinate-source text; ammonia description "NH₃".
6. `store.ts`: rename toast `geometryOptimized` → `geometryRelaxed` with text `Geometri düzenlendi (basit kuvvet alanı, yaklaşık)` (the hard-coded `'Geometri optimize edildi'` notify text goes through i18n); comment "animated geometry optimisation" → "animated geometry relaxation"; no energy number is shown. Under `reducedMotion`, `cleanUp` runs the relaxation synchronously and commits once (C7). On launch, a restored molecule with 0 atoms or failing validation falls back to `methane()`.
7. `ui/i18n.ts`: `act.optimize` → `Geometriyi düzenle (basit kuvvet alanı, yaklaşık)` / `Tidy geometry (simple force field, approximate)`; `act.optimizing`, `act.reason.relaxing`, `toast.geometryOptimized`, `set.about.approx.body` reworded without "optimize/optimisation"; `save.saved` → `Tarayıcıda kaydedildi` / `Saved in this browser`; add strings for A1.1, A2.2, A2.5, A4.2, A5.1, Lipinski qualifier, B.9 (`app.viewRestarting`), B.12 (element change, formal charge), B.13 (PubChem offline, `Kaynak: PubChem`).
8. `ui/Inspector.tsx`: monoisotopic mass in **u** with 4 decimals through the shared formatter (currently `toFixed(3) g/mol`); all numbers through the A2.3 formatter; `Tahmini` badges and provenance tooltips (A.5); Lipinski qualifier without an overall verdict; B.12 card contents with `Element değiştir` and the `Formal yük` stepper; an error boundary around the Inspector (B.9).
9. `src/index.css`: `.viewport-bg` radial uses `#121419` → `#08090b` (theme.ts values); add D.1.2 tokens and D.7 duration tokens.
10. `ui/icons.tsx`, `ui/Toolbar.tsx`: strokeWidth 1.75 everywhere (currently 1.6 in places); replace hard-coded `#9aa1ab` with `currentColor`/token.
11. `scene/testHook.ts`: add `render.frame` (`gl.info.render.frame`) to `snapshot()` for the idle-frame and reduced-motion checks.
12. `scene/measureGeometry.ts`: `formatDistance` (3 dp) and `formatAngle` (1 dp) route through the A2.3 formatter (tr-TR decimal comma).
13. `scene/CameraRig.tsx` / `scene/theme.ts`: zoom clamp `minDistance` = 1.5 Å from the target, `maxDistance` = 12 × fit radius, replacing fit distance ÷/× `ZOOM_IN_FACTOR`; the near plane keeps following `minDistance` (B.1).
14. `ui/TopBar.tsx`: remove the `Loader2` spinner from the save indicator (D.6.1).
15. `ui/LibraryBody.tsx` / `ui/Inspector.tsx`: per-entry coordinate-source line and `Kaynak: PubChem` attribution; `ui/` PubChem action disabled when offline (B.13).

**SHOULD-v1**
16. `scene/Viewport.tsx` `onCreated`: replace ACES (exposure 1.05) with `NeutralToneMapping`; then verify median hue inside an O silhouette within ±10° of `#ff2d2d` and inside N within ±10° of `#3050f8`.
17. `store.ts` additions: `bondAtoms(a, b)`, `growTo(parentId, pos)` (drag-to-bond); `focusRequest: { ids; nonce }` (double-click focus, F-frames-selection); `popMeasure()`, `pinnedMeasures`; `pastLabels`/`futureLabels`.
18. `ui/shortcuts.ts`: the B.7 SHOULD keys; `F` frames the selection when one exists.
19. `ui/BottomSheet.tsx` / `scene/CameraRig.tsx`: coarse-pointer DPR cap 1.5 and adaptive DPR during orbit.
20. Shell layer (`SHELL_THICKNESS`, theme.ts): screen-constant shell widths across zoom (C3).
21. `scene/glyphLabels.ts`: add an advance-only space glyph so scene labels can read `1,090 Å` (B.6).
22. `scene/Interaction.tsx` / `scene/theme.ts`: a 10 CSS px click slop for touch pointers (B.1).

---

## Acceptance checklist (MUST-v1)

- [ ] 1. `npm run build` and `tsc` pass; `npm test` passes `science.test.ts` (A.7 #1–#14), `tokens.test.ts` (D.1.3 + theme.ts mirror) and `i18n.test.ts` (A6.3).
- [ ] 2. Fresh profile launch shows methane, fitted, oblique, ball-and-stick; inspector **CH₄ · 16,04 g/mol**; status bar shows style, 5 atoms, 4 bonds.
- [ ] 3. A stored empty or invalid molecule launches `methane()`; `?m=metan` forces methane with an empty undo history.
- [ ] 4. Clicking C shows Z = 6, `12,011 u`, coordinates to 3 decimals with decimal comma, card AX₄ / düzgün dörtyüzlü / sp³ / LP 0.
- [ ] 5. Measure H–C → `1,090 Å`, H–C–H → `109,5°`, H–C–H–H → `-120,0°` (scene label; DOM readout `φ = -120,0°`), with the "Model koordinatlarından ölçülmüştür" footnote.
- [ ] 6. Atom tool + `O` + click H → `CH₄O · 32,04 g/mol`, new C–O `1,430 Å`; Ctrl+Z restores CH₄ (exactly one history step).
- [ ] 7. A 30 px orbit drag from empty space in the Atom tool changes neither atoms nor undo stack.
- [ ] 8. The four render modes differ in `snapshot().atoms[].radius` / drawn geometry; 20 switches leave `render.geometries`, `render.textures` and the camera unchanged.
- [ ] 9. Ethene double-bond strands lie in the H–C–H plane and do not flip while orbiting.
- [ ] 10. Selection and hover never change atom colours; selected atoms show the two-tone shell; nothing pulses.
- [ ] 11. Idle 5 s → `snapshot().render.frame` unchanged.
- [ ] 12. Draw calls for methane and tristearin differ by ≤ 4; tristearin orbit p95 ≤ 16,7 ms logged in `gauntlet/logs/`; geometries/textures do not grow over 20 load–undo–new cycles.
- [ ] 13. Dragging an atom leaves `snapshot().camera.position` identical.
- [ ] 14. Zero console warnings/errors through the B.10 script.
- [ ] 15. Unknown element import (`Fe`, `Se`) and `D` atoms are rejected with the Turkish messages; the current molecule is unchanged.
- [ ] 16. Ammonia shows primary `NH₃` with Hill `H₃N` in the tooltip; SO₂ shows `SO₂`; BF₃ shows `BF₃`.
- [ ] 17. A bare C₂ skeleton shows "6 H eksik" beside `24,02 g/mol`; a 5-bond neutral N shows the over-valence message and danger ring.
- [ ] 18. H₂O and NH₃ from the library measure within ±0.005 Å / ±0.3° of the A4.1 table (0,958 Å / 104,5°; 1,012 Å / 106,7°); CO₂ C=O 1,162 Å.
- [ ] 19. Monoisotopic mass is shown in u with 4 decimals (CH₄ `16,0313 u`); H₂SO₄ shows no DoU row; Lipinski appears only with "3 / 4 kural değerlendirildi (logP hesaplanmıyor)".
- [ ] 20. Gasteiger charges, VSEPR/hybridisation, aromaticity, functional groups and H-bond counts carry the `Tahmini` badge, and only `Tahmini` values carry a badge; no dipole, logP, TPSA, pKa, energy value or overall Lipinski verdict appears anywhere.
- [ ] 21. No UI string contains "optimize/optimise/optimizasyon"; the relax action reads "Geometriyi düzenle (basit kuvvet alanı, yaklaşık)" and its toast "Geometri düzenlendi …".
- [ ] 22. Undo/Redo are visibly disabled when empty; the empty workspace shows the two real buttons and no `0 g/mol`.
- [ ] 23. Losing the WebGL context shows the restart overlay; restoring brings back the identical molecule; with WebGL unavailable the inspector still works.
- [ ] 24. Reduced motion: Fit, Reset and Clean-up each change the image within 1–2 rendered frames; no auto-rotate.
- [ ] 25. No horizontal overflow at every standard viewport (360×740, 390×844, 768×1024, 1024×768, 1366×768, 1920×1080); mobile launches with the sheet at peek and methane fully visible above it.
- [ ] 26. Keyboard-only: Tab order top bar → rail → viewport → HUD → inspector with visible rings; `V R P Z A B D M` switch tools; tooltips and the `?` sheet show the same keys.
- [ ] 27. `rg -n "gradient|backdrop-(blur|filter)|#000\b|#fff\b|shadow-\[0_0" src/ui src/index.css` returns only `.viewport-bg`; no hex literals in `src/ui/**/*.tsx`; all icons strokeWidth 1.75.
- [ ] 28. Turkish UI uses decimal commas everywhere, renders `İ ı Ş Ğ` correctly, and upper-cases "iyot" as "İYOT".
- [ ] 29. Atom card: `Element değiştir` (C → Si gives `SiH₄`) and the `Formal yük` stepper (−2…+2) each add exactly one undo entry; a nitro group N⁺(=O)O⁻ can be built with all atoms `'ok'`.
- [ ] 30. Bond card and no-selection card show exactly the B.12 rows; no row shows "—", `'s'` or a placeholder.
- [ ] 31. Library dialog lists every entry by category with TR/EN names, working search and a coordinate-source line; loading is one undo entry.
- [ ] 32. MOL/XYZ download and PNG screenshot work; A.7 #14 round trip passes; import errors show localized messages and leave the molecule unchanged; PubChem is disabled with a message when offline and loaded molecules show `Kaynak: PubChem`.
- [ ] 33. Settings and View menu contain only working controls; no placeholder entries; no display toggle exists in two places with separate state.
- [ ] 34. Injecting an unknown symbol in dev shows the error-boundary message (Viewport and Inspector), never a blank page.
- [ ] 35. On tristearin the camera can zoom to 1,5 Å from the orbit target; the save indicator shows no spinner and reads "Tarayıcıda kaydedildi" after a save.
- [ ] 36. `i18n.test.ts` passes: every `tr` key has a non-empty `en` value; `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 0 hits.

---

## Editor notes

- Applied critic edits 1–28 in full. Edit 29 was first applied by inference from a truncated copy; a follow-up pass against the full review confirmed it and aligned the details (Gasteiger label `Gasteiger-Marsili (yaklaşık)`, aromaticity label `basit Hückel testi`, the H-bond acceptor caveat, rotatable bonds moved to Hesaplanan with the rule in the tooltip).
- Follow-up pass applied critic edits 30–70. Already satisfied by the first pass and left as is: #30 (Lipinski qualifier; now also listed under Omitted), #34 (click slop is `CLICK_SLOP_PX` everywhere), #37 (one dash pattern, now named), #43 (default view and far plane from theme.ts/Viewport.tsx), #48 (CSS uppercase allowed under `lang="tr"`), #59–#61 (drag-to-bond, double-click focus and inspector resizing already SHOULD).
- Adapted rather than applied literally: #34's 4/10 px + 400 ms became existing `CLICK_SLOP_PX` for mouse/pen plus a SHOULD 10 px touch slop; #36's pixel widths are MUST "at the fitted view", with screen-constant width across zoom a §E SHOULD (the existing shell is world-space); #41's "0.21 rad/s if the toggle stays" was not adopted because no section mandates a speed any more and the existing `autoRotateSpeed` wins; #56's 1 000-atom MUST draw-call check now uses tristearin, because the 1 000-atom fixture is SHOULD; #63: SSAO is [LATER] and the policy is "no new runtime npm dependency in v1", so Inter (SHOULD) is a committed woff2 asset; #66: the library has 46 entries in 7 categories today, so no fixed count is written; #67: display toggles may live in View or Settings, never duplicated, rather than all moving into Settings (SPEC §3A lists View options separately).
- No critic edit was rejected for contradicting SPEC.
- Harmonised conflicting draft numbers to the existing code: click slop 5 px (`CLICK_SLOP_PX`, draft said 4), camera tweens `CAMERA_TWEEN_MS` (draft said 250/320 ms), FOV and launch view from `theme.ts` (draft said 35° / az 35° el 22°), style radii from `styleParams.ts` (draft said 0.23 × vdW, bond 0.15 Å), C=O 1.21 Å (geometry.ts; draft said 1.22), fallback multipliers 0.875/0.79, keyboard map from `shortcuts.ts` (element letters without Shift in the Atom tool, `F` = reset, Esc semantics).
- Pick-target numbers differed across B (12/22 px), C (4/11 px) and D (22 px); per critic #33, B.1 is the only spec: ≥ 12 px radius fine (24 px target, WCAG 2.5.8) / ≥ 22 px radius coarse.
- Measurement precision differed (A: 3 dp; B/C: 2 dp); per critic #32, 3 dp everywhere (`1,090 Å`), needed to inspect the ±0,005 Å A4.1 tolerance.
- Negative numbers: `Intl.NumberFormat('tr-TR')` emits ASCII hyphen-minus (checked in Node), and `glyphLabels.ts` has no φ or U+2212, so UI examples use `-120,0°` (critic #38).
- Demoted from MUST to SHOULD because they need new store actions or are hardware-dependent: drag-to-bond, double-click focus, labelled undo, 1 000-atom frame-time and bundle-size budgets. The draft's "≤ 3 draw calls for methane" was replaced by a non-scaling draw-call check that does not depend on unknown mesh counts.
- The tool options strip is MUST again (critic #39): it already exists as `ToolOptions`, top-left. The B.2 Bond-tool row now describes the existing mouse/pen rubber-band drag in `Interaction.tsx`.
- Dropped as stale: the claim that `geometry.ts` is a stub; camera-controls APIs (`cancel()`, `smoothTime`, `fitToSphere`); drei `<Html>` labels and the > 300-atom label limit; `window.__studio`; `src/i18n/strings.ts`; `keymap.ts`; a new `src/ui/tokens.ts` (the mirror is `scene/theme.ts`); the D.8 instruction to change the sheet default (it is already `peek`).
- Tone mapping: kept ACES for MUST-v1 and moved the Neutral switch plus its hue Verify to §E SHOULD, so the two do not coexist silently.
- C₂H₄ CCCBDB values are marked provisional (critic #19): they must be copied verbatim with structure type at regeneration time.
