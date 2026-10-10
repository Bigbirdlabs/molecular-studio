# Round 2 critique: SCIENTIFIC ACCURACY + DATA MODEL + HONESTY (HEAD 6a002eb, working tree clean)

Critic: fresh context, independent. I judged against SPEC.md (original + ENHANCEMENT ADDENDUM v1, MUST-v1 checklist), GOAL.md and BRIEF.md, using only the real code and my own probes.

Evidence (all kept in `gauntlet/logs/`):
- `critic-r2-science-probe.txt` / `critic-r2-science-run.txt`: a throwaway vitest probe covering library values, VSEPR cards, auto-H, Gasteiger, io rejection, store edit geometry and library geometry.
- `critic-r2-science-probe2.txt` / `critic-r2-science-run2.txt`: store repros for hypervalent auto-H and changeElement geometry.
- `critic-r2-science-suite.txt`: the project suite, 9 files / 402 tests passing.
- The probe sources (`gauntlet/scratch/critic-r2s/`) were deleted after the runs.

**Verdict: FAIL, 66/100.** Most of round 1's data-model items are fixed, and the core numbers are correct. The remaining problems:
- the geometry card's lone-pair and AXₙEₘ data for conjugated N
- a second, divergent VSEPR implementation
- auto-H making hypervalent S and P
- one edit-time geometry bug
- missing provenance displays: coordinate source, row source tag, conventional formula in the library
- isotope-labelled MOL files silently getting natural masses
- the scene painting "not computable" charges as neutral
- library-description inaccuracies

## Verified correct (independently)
- **Element table** (`elements.ts`): mass, mono (AME2020), covalent radius (Cordero), vdW radius (Bondi, plus Mantina for B) and Pauling EN all match the A.1 sources for the 14 elements.
  - `el('Fe')` throws `Desteklenmeyen element: Fe. Desteklenen: H, B, …`.
  - `isKnownElement('__proto__'|'toString'|'D'|'Se')` = false. The single `VALENCE_ELECTRONS` table is used.
- **Molar masses** (raw): CH₄ 16.043, H₂O 18.015, NH₃ 17.031, CO₂ 44.009, C₂H₄ 28.054, C₂H₂ 26.038, C₆H₆ 78.114, C₂H₅OH 46.069, BF₃ 67.804, SF₆ 146.048, caffeine 194.194.
- **Monoisotopic masses** (hand-checked against AME2020): CH₄ 16.0313, H₂O 18.0106, NH₃ 17.0265, CO₂ 43.9898, C₆H₆ 78.0470, H₂SO₄ 97.9674, CH₃Cl 49.9923, NH₄⁺ 18.03383 (electron mass subtracted).
- **Composition**: percentages are unrounded and sum to 100 within 3e-14 for all 46 library molecules.
- **Hill formulas** are correct, including charge and halogen ordering: CHBrCl₂, BrNa, Cl₄Si, H₄N⁺.
- **CONVENTIONAL_FORMULA** is an exact lookup: NH₃, SO₂, SF₆, H₂SO₄, H₃PO₄, NaBr, SiCl₄, NH₄⁺. Unlisted species stay Hill (BF₃, H₃O⁺, NO₂).
- **DoU** is correctly gated: CH₄ 0, C₂H₄ 1, C₂H₂ 2, C₆H₆ 4, cyclohexane 1, CO₂ 2, morphine 9. It is null for H₂SO₄, SO₂, BF₃, SF₆, penicillin G, methoxide and the bare C₂ skeleton.
- **Valence**:
  - A neutral 5-bond N, and a neutral 4-bonded N with four C, are `over`.
  - NH₄⁺ is `ok`, and every library atom is `ok`.
  - Nitromethane N⁺(=O)O⁻: all atoms `ok`, N is AX₃ / planar.
  - R–Cl–R gets no H.
- **A2.2**: the bare C₂ skeleton gives 24.022 with "Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir". The card shows `hesaplanamadı (yapı eksik)`. A 3-bonded S / 5-bonded N show plain `hesaplanamadı` in the UI (`Inspector.tsx:320-321`).
- **Gasteiger–Marsili**:
  - Values: water O −0.410, methane C −0.078, acetone O −0.298.
  - Null for BF₃ (all atoms), SiH₄ (all atoms), NaCl, and incomplete or over-valent atoms.
  - Displayed with 2 decimals via the locale formatter.
- **Reference bond table** (single table, `molecule.ts:268`): C⋯C(ar) 1.39, C=O 1.21, C–H 1.09, C–O 1.43, C–C 1.54. `idealBondLength` and `BondInfo.idealLength` delegate to it. The bond card labels the value "Referans tablosu", with a tooltip saying a deviation is not an error.
- **Geometry after store edits**:
  - H₂C=O: 120°, C=O 1.210.
  - CO₂ (two O= clicks): 180°.
  - CH₄ + O on H: CH₄O 32.042, C–O 1.430, O–H 0.960, exactly one history entry.
  - Ethane: staggered (−180/60/−60).
  - Propene: 120° at both sp² centres.
  - Propyne: C–C≡C 180°, C≡C–H 180°.
  - Ethene via `setBondOrderOf` and via the bond tool: 120°, planar (HCCH 180/0).
  - Ethyne via the bond tool: 180°.
  - From empty: water 104.5°, NH₃ 107°, H₂S 92°, PH₃ 94°, BH₃ 120°.
  - C→Si gives SiH₄ 1.48; C→P gives 94°×3.
  - Relax on methanol is monotone over 50 steps.
- **Library experimental geometries** (measured from coordinates):
  - CH₄: 1.087 / 109.47°
  - H₂O: 0.958 / 104.48°
  - NH₃: 1.012 / 106.67°
  - CO₂: 1.162 / 180°
  - C₂H₄: 1.339 / 1.086 / 117.60°
  - C₂H₂: 1.203 / 1.063 / 180°
  - C₆H₆: 1.397 / 1.084 / 120°
  - BF₃: 1.313 / 120°
  - SO₂: 1.431 / 119.3°
  - SF₆: 1.560 / 90°
  - All are within the ±0.005 Å / ±0.3° tolerance of A4.1 and checklist #18.
- **io**: XYZ and Molfile reject Fe, Se, X, `26` and `__proto__` (`unsupportedElement`), and D and T (`unsupportedIsotope`). The MOL/XYZ round trip is identical (1.090 Å).
- **Store rejections**: `changeElement(…,'Fe')` and `loadMolecule` with Se leave the molecule unchanged and show `Desteklenmeyen element: Se. Desteklenen: …`.
- **Honesty strings**: relax label "Geometriyi düzenle (basit kuvvet alanı, yaklaşık)"; toast "Geometri düzenlendi — idealize geometri (enerji minimizasyonu değil)"; no "optimi*" in UI text. Lipinski shows only the qualifier "3 / 4 kural değerlendirildi (logP hesaplanmıyor)" plus per-rule rows, with no overall verdict. No dipole, logP, TPSA, pKa or energy value is shown.
- **Formatting and labels**:
  - Mass "Mol kütlesi", 2 dp, with the IUPAC tooltip. Monoisotopic mass in u, 4 dp, with the M+2 tooltip for Cl/Br.
  - Atomic mass shown "as tabulated" (`tabulatedDecimals`).
  - In-scene measurement labels use the locale formatter ("1,090 Å").
  - The measure panel has the "Model koordinatlarından ölçülmüştür" footnote.
  - The formal-charge stepper is clamped to −2…+2.

## Blocking

1. **[chem-props] Conjugated-N / aromatic-heteroatom VSEPR data is self-contradictory, which produces a wrong AXₙEₘ, LP, SN and ideal angle** (A4.2 MUST, A.7 #7, scientific inaccuracy).
   - `properties.ts:604-618`: when an N is "conjugated" or a ring O/S is aromatic, the code does `sn = sn - 1` but keeps `lp`.
   - Result for aniline, urea, paracetamol, caffeine, adenine NH and penicillin amide N: `sn=3 lp=1` with 3 σ neighbours (probe lines 65, 71-73, 192-193).
   - The Inspector derives the notation as `vseprNotation(sn - lonePairs, lonePairs)` (`Inspector.tsx:377`). It therefore prints **"AX₂E"** for a three-coordinate planar N, "LP 1", "SN 3" (SN ≠ σ + LP, against the spec formula), and **"İdeal bağ açısı < 120°"** (`format.ts idealAngle(3,1)`) for a centre it calls trigonal planar.
   - Furan/thiophene-type O/S would get SN 3 with LP 2 and "AXE₂".
   - `geometry.ts:128 electronDomains` returns the consistent answer `{sigma 3, lp 0, sn 3, conjugated}` (probe 79-89, 193), but nothing imports it (grep: only its definition).
   - The conjugation rules also diverge. Example: sulfonamide CH₃–NH–SO₂–CH₃ N.
     - geometry.ts (`hasPi`) treats it as conjugated and places it planar (C–N–S 130.8°, C–N–H 114.6°).
     - properties.ts labels it "Üçgen piramit", sp³, AX₃E (probe line 90).
   - This violates A4.2 "uses the same classification as `geometry.ts`; there is no second implementation".
   - The file header (`geometry.ts:12-13`) claims the opposite.

2. **[ui] The Turkish geometry name loses the mandated qualifiers.**
   - `Inspector.tsx:323` strips every trailing parenthesis: `info.geometry.replace(/\s*\([^)]*\)\s*$/, '')`.
   - "Düzlem üçgen (konjugasyon, tahmini)" → "Düzlem üçgen". A4.2 MUST requires `düzlem üçgen (konjugasyon, tahmini)`; checklist #7 / A.7 #7 asks for "Aniline N: düzlem üçgen (konjugasyon)".
   - "Kırık doğru (açısal)" → "Kırık doğru". A4.2 and A.6 use `kırık doğru (açısal)`.
   - The estimate qualifier is exactly what the honesty rule wants kept.

3. **[ui] Terminal atoms show an "ideal bond angle" (a fabricated value), because the Inspector ignores `showVsepr`.**
   - `properties.ts:57,623` sets `showVsepr = deg >= 2`. `Inspector.tsx:320-325,380` never reads it.
   - Any complete terminal heavy atom with SN 2-4 therefore gets an ideal angle, though a centre with a single bond has no bond angle:
     - F in CH₃F: AXE₃, SN 4, LP 3, **"< 109,5°"**
     - carbonyl O in H₂C=O: **"< 120°"**
     - the O atoms of CO₂ and SO₂, and the F atoms of BF₃ and SF₆ (probe lines 61-69, 91).

4. **[chem-core] Auto-H raises S and P above their lowest valence** (A1.3 MUST).
   - `molecule.ts missingHydrogens` correctly uses the lowest valence.
   - The functions that actually add hydrogens (`adjustHydrogens` / `addAllHydrogens` via `syncHydrogens`, `geometry.ts:416-431`) take `geoFor(...).missing`. That comes from `targetFor` (`geometry.ts:53-58`), which picks the lowest valence ≥ used.
   - Probe: `adjustHydrogens` on S(CH₃)₃ adds an H to S; on P(CH₃)₄ it adds an H to P. `addAllHydrogens` ("Hidrojenleri tamamla") does the same (probe 99-101).
   - Real UI repro (probe2): dimethyl sulfide plus a separate CH₄, then Bond tool S → C.
     - Result: **C₃H₁₀S**, with S bonded to C,C,C,H.
     - Valence state `ok`, no warning toast.
     - The card shows SN 5 "Tahterevalli" in the data model.
     - This is a non-existent neutral sulfurane, presented as valid.

5. **[chem-core] The A1.3 `'under'` flag is not implemented.**
   - Spec: "An atom above its lowest valence that is not bonded to O or F is flagged `'under'` without auto-H."
   - `valenceState` (`molecule.ts:101-107`) only checks membership in `allowedValences`. As a result:
     - SH₄ → `ok`, "Tahterevalli (see-saw)" (probe 102)
     - PH₅ → `ok`, "Üçgen çift piramit" (probe 103)
     - the (CH₃)₃SH from item 4 → `ok`
   - The valence badge shows a green "Tamam" for these non-existent species.

6. **[chem-core] `changeElement` C→N on methane gives distorted ammonia: H–N–H 107.0 / 107.0 / 121.1°** (probe line 189; edit-time geometry).
   - `idealizeAtom` (`geometry.ts:497-541`) assigns slots by best dot product with the current direction. It does not use `freeSlots`' "bond slots first, lone-pair slots last" order (`geometry.ts:262-263`).
   - For a 4-domain centre with one lone pair, the two moved H can land on the two slots that are 121° apart (`singleAxisSlots`, `geometry.ts:199-202`).
   - The Inspector then reports "Ölçülen 111,7° (107,0–121,1°)" for NH₃.
   - Element değiştir is a MUST control (B.12, checklist #29).
   - Related (improvement): `setCharge(+1)` on water gives H₃O⁺ with 104.5/107/107°.

7. **[chem-props] Isotope-labelled Molfiles silently get natural-abundance masses** (A1.1 principle: D/T are rejected because a natural-H mass would be fabricated).
   - `parseMolfile` ignores `M  ISO` lines and the atom-block mass-difference field (`io.ts:218-270`, only `M  CHG` is read).
   - Probe 163-165: methane with `M  ISO … 13` (¹³C), with `M  ISO … 2` on an H (deuterium written the MDL way), or with mass-difference +1 on C loads as plain CH₄, 16.043 g/mol / 16.0313 u.
   - Deuterium written as `D` is rejected, but the same isotope written as `H` + ISO is accepted with a wrong mass.

8. **[ui] Import error messages for unknown elements and isotopes do not follow A1.1** (checklist #15, B.13).
   - `ui/actions.ts:67-75` has no branch for `unsupportedIsotope`. A D/T XYZ therefore shows the generic "Dosya okunamadı: geçerli bir MOL, SDF veya XYZ dosyası seçin.", which says nothing about isotopes. There is no isotope key in `i18n.ts`.
   - `unsupportedElement` shows `toast.importElement` = "Dosyada desteklenmeyen element var: Fe." (`i18n.ts:370`). The supported list is missing, although `ChemIOError` carries `params.supported`.
   - Mandated messages: `Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I` and `Desteklenmeyen izotop: D`.

9. **[ui] The library dialog shows Hill formulas instead of the conventional primary formula** (A2.1, checklist #16).
   - `LibraryBody.tsx:16` uses `formula(entry.molecule, true)`.
   - Ammonia is listed as **H₃N**, SO₂ as **O₂S**, SF₆ as **F₆S**, H₂SO₄ as **H₂O₄S**, H₃PO₄ as **H₃O₄P**. The descriptions on the same rows already say NH₃, SO₂, ….

10. **[ui] The coordinate-source line and PubChem attribution are never displayed** (A4.1, B.12, B.13; checklist #31, #32).
    - `LibraryEntry.coordSource/coordSourceText/coordSourceTextEn` (`library.ts:41-46, 1050-1056`) have no consumer in `src/ui` (grep).
    - Neither the library rows nor the molecule card show "Koordinatlar: NIST CCCBDB deneysel geometri …" or "Koordinatlar: PubChem 3B konformer (hesaplanmış)".
    - The user cannot tell that water is experimental and formaldehyde (C=O 1.225, C–H 1.102, probe 136) is a computed MMFF conformer.
    - `Kaynak: PubChem` appears only inside the PubChem search form (`Dialogs.tsx:204`), not on a loaded molecule.

11. **[ui] The bond card's reference length has no row source tag** (B.12: "reference length (`bondTargetLength`, Referans tablosu with its row source tag, A3.1)").
    - `bondLengthSource()` exists (`molecule.ts:315`) but is unused.
    - `Inspector.tsx:481` shows only "Referans tablosu · 1,210 Å". `bond.refTip` names no source (Allen 1987 / CCCBDB / "typical, row source not verified").

12. **[ui] The bond card prints π with a dot decimal in Turkish** (A2.3 formatter, checklist #28).
    - `Inspector.tsx:490` renders `{info.pi}` raw. Every aromatic bond (benzene, pyridine, …) shows **"π bağı 0.5"**, bypassing `useNum`.

13. **[ui] The bond card shows estimates without the `Tahmini` badge** (A.5: aromaticity and polar-bond class are Tahmini; checklist #20).
    - `Inspector.tsx:483-492`: the "Aromatik: Evet" row and the aromatic order name (σ + delokalize π) carry no `<Prov kind="est"/>`. The molecule card's "Aromatik halka" row does carry one.
    - The polarity class shows only plain text "kural (yaklaşık)", not a badge.

14. **[scene] The charge colouring paints "not computable" Gasteiger charges as neutral** (fabricated value; D.6.5 "values that cannot be computed are absent").
    - `scene/partialCharges.ts:24-29` maps `partialCharge === null` to `q = 0`. `moleculeRig.ts:59-61 chargeColor(0)` then gives the NEUTRAL colour.
    - With "Kısmi yükler" on, the following are drawn exactly like computed zero-charge atoms, while the Inspector says "hesaplanamadı":
      - BF₃: all four atoms
      - SiH₄: all atoms
      - NaCl: Cl
      - every atom of an incomplete structure

15. **[chem-props] Library descriptions contain a false statement, an angle that contradicts the coordinates, and unsourced physical constants** (A4.1 "Angle claims in descriptions must match the coordinates or a cited source"; A.5 Omitted: "melting/boiling point … description prose may cite them only with a source").
    - `library.ts:89` water: "kütlesi benzer H₂S ise −60 °C'de kaynar". H₂S is 34.08 g/mol against water's 18.02, almost double, so "similar mass" is wrong (the EN text says the same).
    - `library.ts:131` H₂O₂: "H–O–O–H burulma açısı gaz fazında yaklaşık 111°". The coordinates give **94.0°** (probe 137), and no source is cited.
    - Unsourced temperatures:
      - water 100 °C, H₂S −60 °C (`:89`)
      - CO₂ −78,5 °C (`:117`)
      - acetylene flame > 3000 °C (`:265`)
      - toluene 111 °C (`:359`)
      - ethanol 78 °C, ethane −89 °C (`:445`)
      - acetone 56 °C (`:493`)
      - acetic acid 16,6 °C (`:510`)

16. **[chem-props] `library.ts` claims to be generated by a generator that cannot produce it; CCCBDB provenance is unevidenced.**
    - The header says "GENERATED DATA (gauntlet/scratch/build-library.mjs)" (`library.ts:4`).
    - The generator is gitignored (`.gitignore:9`), dated 20:00 against library.ts 21:49. It contains no CCCBDB overrides and no `SOURCES` table, and writes descriptions as `f + ' — '` with the Hill formula (`build-library.mjs:162`).
    - Re-running it would restore PubChem water (0.969 Å / 104.0°) and "H₃N —". A2.1 and A4.1 explicitly require the corrections to live in `build-library.mjs`.
    - "values were copied from the NIST CCCBDB … pages, accessed 2026-10-10" has no captured page or log anywhere in the repo.
    - The header also contradicts itself: line 15 gives CO₂ 1.162, line 21 says "C=O 1.160", and the data is 1.1621.

## Improvements (non-blocking)
- **[chem-props]** `geoOf` still clamps LP with `Math.max(0, Math.floor(…))` (`properties.ts:569`). The data model can hold invented LP values, hidden today by `incomplete`. Use `electronDomains().lpExact` and drop `geoOf`'s copy.
- **[chem-props]** SN 5/6 lone-pair names ("Tahterevalli", "T şekilli", "Kare piramit", "Kare düzlem", `properties.ts:552-557`) remain in the data model. The UI hides them (SN ∉ 2-4 → hesaplanamadı), which is compliant. A4.3 asks that they be `hesaplanamadı` and the SN 6 name be "düzgün sekizyüzlü".
- **[chem-props]** Gasteiger charges for hypervalent S/P (H₂SO₄ S +0.397, SF₆ S +0.433, H₃PO₄ P +0.470) use thioether-S / extended-P parameters. The header cites only Gasteiger & Marsili 1980, which has no S sp², P or S(VI) parameters. Name the parameter source, or return null for S/P above their lowest valence.
- **[chem-core]** `validateMolecule` accepts any finite charge (`store.ts:184`). A stored atom with charge 0.5 loads as "CH₄⁺" with a fractional exact-mass correction (probe 198). Require integer charges.
- **[chem-core]** H₃O⁺ built via `setCharge(+1)` on water keeps the 104.5° angle (104.5/107/107); re-idealise after a charge change.
- **[ui]** A4.4 "Deneysel 104,5° (CCCBDB)" next to Ölçülen / İdeal for the A4.1 molecules is not shown. The data exists in `SOURCES`.
- **[ui]** Terminology (A.6):
  - "Sterik sayı" → "Elektron grubu sayısı (sterik sayı)"
  - "Ortaklanmamış çift" → "Ortaklanmamış elektron çifti"
  - "Halka" → "Halka sayısı"
  - Valence row value without "bağ" (B.12 `n/max bağ`)
  - `set.about.computed.body` still says "molar kütle" (`i18n.ts:182`)
  - `toast.valenceExceeded` uses bare "Değerlik"
- **[ui]** `tabulatedDecimals` reads JS literals, so Na shows "22,99 u" (CIAAW abridged 22.990). Store the tabulated digit count with the value.
- **[chem-props]** Functional groups: aniline NH₂ is "amin" but adenine's exocyclic NH₂ is not (heteroaromatic exclusion, `properties.ts:861`). Make the rule consistent and document it in the tooltip.
- **[chem-props]** Description rounding: benzene "yaklaşık 1,39 Å" against coordinates 1.397 (rounds to 1,40); cyclohexane "yaklaşık 111°" against 111.6°.
- **[tests]** No test covers:
  - A1.3 auto-H for S/P (`adjustHydrogens` on S(C)₃ / P(C)₄)
  - the A1.3 `'under'` flag
  - aniline/amide LP / AXₙEₘ consistency (the A.7 #7 test only checks the geometry string and sp²)
  - `changeElement` C→N angles
  - Molfile `M  ISO`
  - `LibraryBody` / bond-card formatting
  
  Each blocker above has a one-line oracle that would have caught it.

## Score rationale
Correct, and checked by hand against the references:
- element constants, average and monoisotopic masses, composition
- Hill and conventional formulas, DoU gating, Gasteiger null cases, io rejections
- the reference bond table, A4.1 library geometries, and nearly all edit-time geometries

What a student sees on the cards is still wrong in several places:
- "AX₂E / LP 1 / < 120°" for every amide and aniline N
- ideal angles at terminal atoms
- an "ok" sulfurane created by auto-H
- distorted NH₃ after Element değiştir
- Hill formulas in the library
- missing coordinate-source and row-source provenance
- a false H₂S comparison and a contradicted H₂O₂ angle

16 blocking items, fewer and narrower than round 1's 26: 66/100.
