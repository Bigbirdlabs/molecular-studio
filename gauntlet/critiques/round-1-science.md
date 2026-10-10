# Round 1 critique: SCIENTIFIC ACCURACY + DATA MODEL + HONESTY (re-run on HEAD 1c6453b, chem files dated 20:48–20:49)

Critic: fresh context, independent. I judged against SPEC.md (original + ENHANCEMENT ADDENDUM v1, MUST-v1 checklist), GOAL.md and BRIEF.md, using only the real code and the probe output below. This file replaces the earlier 20:42 version of this critique, which predates the current chem sources.

Evidence:
- `gauntlet/logs/critic-r1b-science-probe.txt`: a throwaway vitest probe, since deleted. It covers library values, store edit flows, VSEPR cards, io rejection, conventional formulas, Gasteiger and relax.
- `gauntlet/logs/critic-r1b-science-run.txt`: the probe run (1 test passed).
- `gauntlet/logs/critic-checklist-vitest.txt` (20:58): the project suite, 8 files / 267 tests passing.

**Verdict: FAIL, 56/100.** The core numbers and the edit-time geometry are now correct. The addendum's data-model, provenance and honesty MUSTs are largely unimplemented: `el()` silent fallback, no `mono`, formula convention, rounding, A2.2 note, terminology, Lipinski verdict, "İyonik" label and A4.1 ethylene.

## Verified correct
- **Molar masses** (raw): CH₄ 16.043, H₂O 18.015, NH₃ 17.031, CO₂ 44.009, C₂H₄ 28.054, C₂H₂ 26.038, C₆H₆ 78.114, C₂H₅OH 46.069, BF₃ 67.804, SF₆ 146.048, glucose 180.156, caffeine 194.194.
- **Monoisotopic masses**: CH₄ 16.0313, H₂O 18.0106, NH₃ 17.0265, CO₂ 43.9898, C₆H₆ 78.0470, H₂SO₄ 97.9674. Using the old in-file table changes no value at 4 dp.
- **Hill formulas** are correct, including charge: `H₄N⁺`, `C₂H₅NO₂`.
- **DoU** is correctly gated: CH₄ 0, C₂H₄ 1, C₂H₂ 2, C₆H₆ 4, cyclohexane 1, CO₂ 2, morphine 9. H₂SO₄, SO₂, BF₃ and penicillin G give null.
- **Geometry after store edits** (previous round's blocker, now fixed):
  - CO₂ grown from CH₄ by two `O=` clicks: 180°, both C=O 1.210.
  - CO₂ via bond-order change: 180°.
  - Propyne C–C≡C and C≡C–H: 180°.
  - Propene: 120°, sp² neighbours coplanar (0.000 Å).
  - Ethane: staggered (HCCH −180/60/−60).
  - Ethylene/acetylene via order change: 120° / 180°.
  - Water: 104.5°. NH₃: 107°. H₂C=O: 120° by both routes.
  - CH₃NH₂ N: 107°. CH₃PH₂ P: 94°. CH₃SH S: 99°.
- **Click-to-grow**: CH₄ + O on H gives CH₄O 32.042 g/mol, C–O 1.430 Å (`bondTargetLength`), O–H 0.960, one history entry. Relaxed methanol keeps 1.430/109.47; energy is monotone.
- **Bond-length table** in placement and in `BondInfo.idealLength`: C⋯C 1.39, C=O 1.21, C–H 1.09, C–O 1.43. Library caffeine relaxes to within 0.004 Å of the table.
- **Library experimental geometries**:
  - water 0.958 / 104.48°
  - NH₃ 1.012 / 106.67°
  - CO₂ 1.160 / 180°: this is the rₑ value. Checklist #18 says 1,162, still within ±0.005.
  - CH₄ 1.087 / 109.47°
  - BF₃ 1.313
  - SO₂ 1.431 / 119.3°
  - SF₆ 1.560
  - acetylene 1.200 / 1.065
  - benzene 1.395 / 1.086
- **Valence**:
  - Neutral 5-bond N → `over`. NH₄⁺ → `ok`. Every library atom → `ok`.
  - Nitromethane N⁺(=O)O⁻: all atoms `ok`; N is planar sp².
  - R–Cl–R: `over`, gets no H.
  - 3-bonded S and 4-bonded P: `under`, `missingHydrogens` = 0, no auto-H (A1.3 data side).
- **io**: XYZ/Molfile reject D, T, Fe, Se and X with `unsupportedElement`. `isKnownElement('__proto__'/'Se'/'D')` = false.
- **VSEPR data**: H₂O O SN 4 / LP 2 / bent. NH₃ N SN 4 / LP 1 / pyramidal. CO₂ C SN 2 / linear. BF₃ B SN 3 / planar. Pyridine N SN 3 / LP 1 / bent. Bare C₂ skeleton: `hesaplanamadı (yapı eksik)`.
- **Gasteiger–Marsili**:
  - Parameters match Gasteiger & Marsili 1980. Water O −0.410, methane C −0.078, acetone O −0.298.
  - Null for B/Si neighbourhoods (BF₃ all null) and for incomplete atoms.
- **Honesty strings**: relax toast "idealize geometri (enerji minimizasyonu değil)". No "optimi*" in UI strings. No dipole/logP/TPSA/pKa/energy value.

## Blocking

1. **[chem-core] `el()` silently returns carbon for unknown symbols** (A1.1 MUST, A.7 #11, checklist #34).
   - Evidence: `src/chem/elements.ts:68-70`. No `getElement`, no `UnknownElementError`. `isKnownElement` is a boolean, not a `sym is ElementSymbol` guard.
   - Probe: `el('Fe').symbol === 'C'`.
   - Probe: `useStudio.getState().changeElement(2,'Fe')` on methane → `CH₆Fe`, mass 30.070 (Fe weighed as 12.011).
   - Probe: `loadMolecule` with an `Se` atom → `CH₃Se`, 27.046 g/mol.
   - Result: fabricated masses, no error boundary. Store paths (`changeElement` `src/store.ts:564`, `loadMolecule` `:541`) never call `isKnownElement`.
   - `parseStoredMolecule` (`src/store.ts:167`) drops an `Se` project silently with no "Desteklenmeyen element" message.

2. **[chem-core] No `mono` field; three copies of valence/mono tables** (A1.4, A1.5, A1.6 MUST; A.7 #12 impossible).
   - `elements.ts` has no `mono`.
   - `properties.ts:145-155` keeps its own `VALENCE_ELECTRONS` and an old `MONO_MASS`: F 18.99840322, P 30.97376163, S 31.972071, Br 78.9183371, I 126.904473 versus the AME2020 values the spec lists.
   - `properties.ts:882` keeps the `?? el(a.symbol).mass` fallback.
   - `geometry.ts:87` holds a third `VALENCE_ELECTRONS`.
   - No per-field source comments. `elements.ts:7` still says `// CPK colour`.

3. **[chem-core] `conventionalFormula` is a heuristic ordering, not the mandated exact lookup, and it produces wrong formulas** (A2.1 MUST).
   - Evidence: `src/chem/molecule.ts:142-154`.
   - Probe output: phosphoric acid → `PH₃O₄` (should be H₃PO₄, an explicit key in A2.1). NaOH → `NaHO`. HNO₃ → `NHO₃`.
   - Spec: an exact `CONVENTIONAL_FORMULA` table keyed by plain Hill; everything else stays Hill.

4. **[ui] The inspector and library show Hill only; the conventional formula is never displayed** (A2.1, B.12, checklist #16).
   - `Inspector.tsx:115,143` and `LibraryBody.tsx:16` call `formula()`. `conventionalFormula` is referenced nowhere in `src/ui`.
   - Ammonia shows `H₃N`; SO₂ shows `O₂S`.
   - Label `mol.formula` = "Molekül formülü (Hill)". Spec: "Molekül formülü (kapalı formül)", conventional primary, Hill in the tooltip.

5. **[chem-props] Library descriptions lead with Hill formulas** (A2.1: the ammonia "H₃N" must be corrected).
   - `library.ts:85` "H₃N —", `:127` "O₂S —", `:155` "F₆S —", `:170` "H₂O₄S —", `:185` "H₃O₄P —".

6. **[chem-props] Stored values are rounded** (A2.3, A2.6, A.7 #3).
   - Composition percent: `properties.ts:901` `round(…,2)`. The probe found unrounded sums ≠ 100: fosforik-asit 100.01, gliserol 100.01, formaldehit 99.99, asetik-asit 99.99, glikoz 99.99, alanin 99.99, penisilin-g 100.01 (spec: 100 ± 1e-9).
   - `partialCharge` is also rounded to 3 (`:680`) and `deltaEN` to 2 (`:695`). Rounding ΔEN before thresholding changes the class at boundaries; for example raw 0.395 becomes 0.40 and is classed "polar".

7. **[ui] Molar mass shows 3 decimals instead of 2** (A2.3 table; checklist #2, #6, #17).
   - `Inspector.tsx:148` `fix(props.mass, 3)` → "16,043 g/mol". Spec: "16,04 g/mol", "32,04", "24,02".
   - Composition shows 1 decimal (`:79`); spec says 2.

8. **[ui] Atomic mass shown with 4 decimals, adding precision that does not exist** (A2.3 "as tabulated"; checklist #4; SPEC §5 "do not fabricate").
   - `Inspector.tsx:309` `fix(info.mass, 4)` → C "12,0110 u", H "1,0080 u", S "32,0600 u", Cl "35,4500 u".
   - CIAAW abridged S is 32.06 ± 0.02. Printing "32,0600" invents two digits.

9. **[ui] No A2.2 completeness note on the molecule card** (A2.2, checklist #17).
   - A bare C₂ skeleton shows 24,022 g/mol with only per-atom "değerlik eksik" issues.
   - Missing: "Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir", the "Hidrojenleri tamamla" action, and the "Geçersiz değerlik: <el> (<used>/<max>)" format. The probe confirms Σ missingH = 6.

10. **[ui] Lipinski shows an overall verdict** (A.5 Omitted: "no overall geçer/passes verdict"; checklist #19, #20).
    - `Inspector.tsx:202`, trailing `mol.lip.pass` = "Üç kuralı da sağlıyor" or "{n} kural aşıldı".
    - The mandated qualifier "3 / 4 kural değerlendirildi (logP hesaplanmıyor)" is absent.

11. **[ui] Bond polarity labelled "İyonik", with no approximation badge** (A4.5).
    - `properties.ts:706` gives class 'ionic' for ΔEN > 1.7. `Inspector.tsx:428` renders `bond.pol.ionic` = "İyonik".
    - Repro: library BF₃, click a B–F bond (ΔEN 1.94) → "İyonik". H–F (1.78) also shows "İyonik". Both are covalent molecules.
    - Spec wording: "iyonik karakter baskın", "polar kovalent", "apolar kovalent", each with "kural (yaklaşık)".

12. **[chem-props] Aromatic bonds report a Kekulé π count that contradicts their own label** (scientific inaccuracy).
    - `properties.ts:711` `pi: b.order - 1`. In benzene, bond 13 shows π 1 and bond 14 shows π 0. Both are labelled "Aromatik bağ (σ + delokalize π)" (probe; `Inspector.tsx:430`).

13. **[chem-props] Hybridisation reported for elements the spec excludes; '—' and 's' rendered as values** (A4.2 table "C, N, O, B"; "hybridisation values '—' and 's' are never rendered, the row is hidden"; checklist #30).
    - Probe: CH₃Cl Cl sp³, CH₃F F sp³, CH₃SH S sp³, CH₃PH₂ P sp³. Calling PH₃-type P "sp³" is chemically wrong: H–P–H is about 94°.
    - `Inspector.tsx:331` always renders `hybridLabel(info.hybridization)`, which shows '—' for SO₂/H₂SO₄/SF₆ S and Na/Mg, and 's' for H.

14. **[ui] VSEPR terminology and notation do not meet A4.2/A.6** (MUST).
    - `properties.ts:498` uses "Üçgen düzlem"; MEB term and spec: "düzlem üçgen".
    - `Inspector.tsx:295` strips every trailing parenthesis:
      - "Kırık doğru (açısal)" → "Kırık doğru"
      - "Üçgen düzlem (konjuge)" → "Üçgen düzlem": the conjugation estimate disappears; spec wants "düzlem üçgen (konjugasyon, tahmini)".
      - "Sekizyüzlü (oktahedral)" → "Sekizyüzlü"; spec: "düzgün sekizyüzlü".
    - Missing: AXₙEₘ notation, ideal angle ("< 109,5°", "< 120°"), measured mean / min–max angle.
    - SN 5/6 lone-pair names (Tahterevalli, T şekilli, Kare piramit, Kare düzlem; `properties.ts:504-509`) must be `hesaplanamadı` (A4.3).

15. **[chem-core] A second VSEPR/hybridisation implementation that diverges** (A4.2: "same classification as geometry.ts; there is no second implementation").
    - `geometry.ts:131`: an N next to any π atom (`hasPi`, any element, aromatic flag) is planar.
    - `properties.ts:556-563`: conjugated only if the neighbour is C or N with an order ≥ 2 bond.
    - Example: N–S(=O)₂ (sulfonamide) is placed planar but labelled "Üçgen piramit".
    - Also `properties.ts:567` reports conjugated N as SN 3 with LP 1 and 3 σ-neighbours, contradicting the spec formula SN = σ + LP = 4.

16. **[chem-core] `idealBondLength` does not delegate to `bondTargetLength`; the table lacks source tags** (A3.1 MUST, A.7 #8).
    - `molecule.ts:251-255` returns a covalent-radius estimate: C=O 1.2425, C–H 1.07, C–C 1.52, C=C 1.33 (probe). A.7 #8 requires 1.21/1.09/1.43/1.39.
    - `tests/library.test.ts:131` checks library bonds against this non-table function.
    - The `geometry.ts:46` comment says "experimental / textbook values". Spec: "typical reference lengths rounded to 0.01 Å", with an `Allen 1987 (rounded)` / `CCCBDB gas-phase` tag per row.

17. **[ui] The bond card calls the table value "ideal" and prints a deviation against it** (A3.1/B.12: "reference length, Referans tablosu with its row source tag").
    - `Inspector.tsx:425`: CO₂ (experimental 1.160) shows "(ideal 1,210, −0,050)", implying the experimental structure is off.

18. **[chem-props] A4.1 ethylene does not reproduce experiment** (A4.1 MUST, ±0.005 Å / ±0.3°).
    - Library etilen: C=C 1.334 (target 1.339, at the tolerance edge) and H–C–H 118.52° versus 117.6°, a 0.9° miss.
    - Acetylene and benzene pass, but they are also not regenerated from CCCBDB (`library.ts:11` names only metan/su/amonyak/karbondioksit).
    - No CCCBDB structure type (rₑ/r₀/r_z) or access date is recorded per row. `build-library.mjs` contains no CCCBDB reference.

19. **[chem-props / ui] Isotopes reported as "elements"; mandated messages absent** (A1.1, checklist #15).
    - `io.ts:57` maps D/T to `unsupportedElement`. The UI string `toast.importElement` = "Dosyada desteklenmeyen element var: D.": deuterium is an isotope of H, not an element.
    - Spec: `Desteklenmeyen izotop: D`, and for elements `Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`.

20. **[ui] Mass labels and provenance tooltips** (A2.4, A2.5, A.6 MUST).
    - `mol.mass` = "Molar kütle"; spec: "Mol kütlesi". No tooltip "Standart atom kütlelerinden (IUPAC 2021, doğal izotop ortalaması)".
    - `mol.exact` = "Monoizotopik kütle"; spec: "(en bol izotoplar)" plus the Cl/Br M+2 tooltip.
    - The DoU label lacks "(halka + π bağı)".
    - The Gasteiger label is "Gasteiger kısmi yükü (yaklaşık)"; spec: "Gasteiger-Marsili (yaklaşık)", 2 decimals (UI shows 3, `Inspector.tsx:335`).

21. **[ui] Rotatable-bond tooltip misstates the rule** (A.5: "the tooltip states the exact rule implemented by countRotatable").
    - `mol.help.rotatable` = "Halkada olmayan, terminal olmayan tekli bağlar."
    - `properties.ts:826-849` also excludes amide C–N, bonds next to triple bonds and CF₃/tBu-type symmetric tops.

22. **[scene] In-scene measurement labels use a dot decimal in the Turkish UI** (A2.3 §E, checklist #28).
    - `scene/measureGeometry.ts:18-19` use `toFixed` → "1.090 Å" / "109.5°".

23. **[ui] Measure panel precision and footnote** (B.6 MUST, checklist #5).
    - `Inspector.tsx:461-462` show angle and dihedral with 2 decimals; spec says 1.
    - The "Model koordinatlarından ölçülmüştür" footnote is missing (`meas.hint` describes clicks only).

24. **[ui / chem-core] Formal-charge stepper range** (B.12 MUST: −2…+2).
    - `Inspector.tsx:272-274` and `store.ts:584` allow −3…+3. Low severity.

25. **[ui] "n H eksik" badge suggests hydrogens that A1.3 forbids.**
    - `Inspector.tsx:294`: `missingH = valence − valenceUsed`. A 3-bonded S shows "1 H eksik" and a 4-bonded P shows "1 H eksik", while `missingHydrogens` = 0 and auto-H rightly refuses: R₃S–H is not a valid fix; the honest state is "under / needs charge".
    - The card shows "hesaplanamadı (yapı eksik)" for these atoms. Spec: plain "hesaplanamadı", because missing H = 0 and LP = 1.5 is not an integer.

26. **[tests] science.test.ts does not implement the A.7 oracles** (checklist #1).
    - `tests/science.test.ts` covers only #1, #4, #6, #10 and parts of #5.
    - Missing: #2 formatter, #3 unrounded sums, #7 A4.1 table, #8 incl. `idealBondLength`, #9, #11 `el('Fe')` throws, #12 element snapshot, #13 geometry gate, #14 in this file.
    - #3, #7 (ethylene), #8 and #11 would fail today.

## Improvements (non-blocking)
- `geoOf` (`properties.ts:521`) clamps LP with `Math.max(0, Math.floor(…))`. Spec: non-integer or negative LP → `hesaplanamadı`. A bare C reports SN 2 / LP 2 and a bare O SN 3 / LP 3. These are hidden behind `incomplete` today, but the data model holds nonsense.
- An isolated Na in NaCl shows "Sterik sayı 1"; Cl⁻-type terminal halogens get SN/LP rows. Hide VSEPR rows for metals and ions.
- `unsaturation()` (`molecule.ts:222-229`) uses the formula with the `Math.max(0,…)` clamp. Spec asks for the graph value `ringCount + Σ(order−1)`. The result is equal for gated molecules, so this is cosmetic. `canComputeUnsaturation` (`molecule.ts:157`) is a dead duplicate of `safeUnsaturation`.
- The steric-number row has no `Tahmini` badge (A.5 puts VSEPR under Tahmini).
- Electron mass is CODATA 2014 (`properties.ts:155`); spec cites CODATA 2018. Below shown precision.
- The atom data model has no stored `z` or selection state (SPEC §5 "such as"). `atomicNumber()` derives it, which is acceptable. Document this in the model comment.
- Formaldehyde, H₂O₂, urea and similar molecules use PubChem MMFF conformers (C=O 1.225, C–H 1.102 for H₂CO). Their descriptions should say "hesaplanmış" (A4.1, B.13). The library dialog shows no coordinate-source line at all.
- Use `Desteklenmeyen element` with the supported list when restoring localStorage (store) and surface it as a toast.

## Score rationale
The core science that a user sees in numbers is right: masses, mono values, Hill, DoU, Gasteiger, the geometry engine and library experimental geometries. The judge path's arithmetic would be correct. It is presented wrongly against the addendum: 16,043 instead of 16,04, 12,0110 u, H₃N, the "İyonik" BF₃ bond, the Lipinski verdict, the missing A2.2 note, and terminology. The data model still has the silent carbon fallback and duplicated tables. 26 blocking items, most mechanical: 56/100.
