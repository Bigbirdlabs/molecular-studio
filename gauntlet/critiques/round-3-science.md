# Round 3 critique: SCIENTIFIC ACCURACY + DATA MODEL + HONESTY

- **HEAD:** 190f5b3. Working tree clean except the untracked critique files.
- **Critic:** fresh context, independent. I judged against SPEC.md (original + ENHANCEMENT ADDENDUM v1 and its MUST-v1 checklist), GOAL.md and BRIEF.md, using only the real code and my own probes.
- **Evidence** (`gauntlet/logs/`):
  - `critic-r3-science-probe.txt`: the main probe. It covers library masses, formulas, DoU, VSEPR cards, Gasteiger, auto-H, io, edit-time geometry through store actions, and library geometry.
  - `critic-r3-science-xyz.txt`: an XYZ/MOL round trip of every library entry.
  - `critic-r3-science-misc.txt`: the Gasteiger leak repro.
  - `critic-r3-science-run*.txt`: the probe runner output.
  - `critic-r3-science-suite.txt`: the project suite, run once.
- The probe sources (`gauntlet/scratch/critic-r3-sci/`) were deleted after the runs.
- Note: `critic-r3-science-probe2..4.txt` / `run4.txt` in `gauntlet/logs/` are **not** mine; another session seems to share the name prefix. My run2/run3 files may have overwritten files of the same name.

**Verdict: FAIL, 74/100.**
- Most round-2 science blockers are fixed:
  - one VSEPR classification (`electronDomains`)
  - hypervalent auto-H and the `'under'` flag
  - correct `changeElement` / `setCharge` geometry
  - Molfile `M  ISO` and mass-difference rejection
  - isotope and element toasts
  - a coordinate-source line and the bond-row source tag
  - the scene no longer paints null charges as neutral
  - library prose: unsourced temperatures removed, H₂O₂ dihedral corrected
- Every reference number I checked is right.
- What remains is mostly in what the user *sees*:
  - three regressions or unfixed items from round 2 (the stripped geometry qualifiers, Hill formulas in the library, A.6 terms)
  - one new fabricated-value leak (Gasteiger)
  - one silent wrong-species import (XYZ H₂SO₄ → H₂SO₄²⁻)
  - missing A3.2 labelling
  - lone-pair counts that contradict A4.2's own formula
  - a self-contradictory valence message

## Verified correct (independently)

### Element table
- `elements.ts` matches the A.1 sources for all 14 elements, field by field:
  - `mass`: CIAAW 2021
  - `mono`: AME2020, every value re-checked
  - `covalent`: Cordero
  - `vdw`: Bondi, Mantina for B
  - `en`: Pauling
- `el('Fe')` throws `Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`.
- `isKnownElement('__proto__'|'D'|'Se')` = false.

### Masses (all 46 library entries)
- Average: CH₄ 16.043, H₂O 18.015, NH₃ 17.031, CO₂ 44.009, C₂H₄ 28.054, C₂H₂ 26.038, C₆H₆ 78.114, C₂H₅OH 46.069, BF₃ 67.804, SF₆ 146.048, caffeine 194.194.
- Monoisotopic: CH₄ 16.03130, H₂O 18.01056, NH₃ 17.02655, CO₂ 43.98983, C₆H₆ 78.04695, BF₃ 68.00451 (¹¹B), H₂SO₄ 97.96738.
- Composition is unrounded and sums to 100 within 3e-14 for every entry.

### Formulas
- Hill: CH4, H3N, O2S, F6S, H2O4S, H4N+, CH3−.
- Conventional lookup is exact: NH3, SO2, SF6, H2SO4, H3PO4. BF3 and the carbon compounds stay Hill.

### Degree of unsaturation (gated)
- Shown: CH₄ 0, C₂H₄ 1, C₂H₂ 2, C₆H₆ 4, cyclohexane 1, adamantane 3, naphthalene 7, morphine 9, CO₂ 2, HCN 2, CH₃Cl 0, NH₂OH 0.
- Null: H₂SO₄, SO₂, BF₃, SF₆, H₃PO₄, penicillin G (S), H₂S, CH₃SH, thiophene, methoxide, NaCl, NH₄⁺, and any incomplete structure.

### Valence and auto-H
- `'over'`: a neutral 5-bond N and a neutral 4-coordinate N.
- `'ok'`: NH₄⁺, and every atom of every library molecule.
- A1.3:
  - `adjustHydrogens` / `addAllHydrogens` on S(CH₃)₃ adds no H, and S is flagged `under`.
  - P(CH₃)₄ gets no H and is flagged `under`.
  - C–Cl–C gets no H and is flagged `over`.
  - SH₄ and PH₅ are `under`.
  - Store repro: DMS + CH₄ joined with the Bond tool gives C₃H₉S with no extra H.
- A nitro group N⁺(=O)O⁻ built in the store has every atom `ok`.

### VSEPR cards
| Atom | Card |
|---|---|
| CH₄ C | AX₄, düzgün dörtyüzlü, sp³, LP 0 |
| H₂O O | AX₂E₂, LP 2 |
| NH₃ N | AX₃E, LP 1 |
| CO₂ C | AX₂, doğrusal |
| BF₃ B | AX₃, düzlem üçgen |
| SO₂ S | AX₂E (hybridisation hidden) |
| H₂SO₄ S | AX₄ |
| DMSO S | AX₃E üçgen piramit |
| CH₃⁺ | düzlem üçgen sp² |
| CH₃⁻ | üçgen piramit |
| H₃O⁺ | üçgen piramit |
| BH₄⁻ | dörtyüzlü |
| NH₂⁻ | kırık doğru |
| pyridine N | AX₂E |
| aniline, urea, adenine-NH, caffeine, paracetamol, penicillin amide, sulfonamide N | SN 3, conjugated |

- `hesaplanamadı (yapı eksik)` appears exactly when H are missing (bare C with 2 bonds).
- Plain `hesaplanamadı` appears for SH₄, SF₄ (SN 5 with LP) and the 5-bond N (`Inspector.tsx:332-333`).
- Terminal atoms get no ideal angle and no AXE notation (`central` gate, `Inspector.tsx:339`).

### Gasteiger–Marsili
- The parameters equal the 1980 table: C, N and O by hybridisation, plus H, F, Cl, Br, I and divalent S.
- Values: water O −0.410, methane C −0.078, acetone O −0.298; Σq = 0.
- Null for: BF₃, SiH₄, NaCl, SF₆, SO₂, and the S/P/O of H₂SO₄ and H₃PO₄.

### io
- XYZ rejects Fe, Se, `26` and `__proto__` (`unsupportedElement` + supported list), and D and T (`unsupportedIsotope`).
- Molfile rejects `M  ISO … 13`, a mass difference of +1, and `D`.
- MOL/XYZ round trip of methane: CH4, 4 bonds, 1.090 Å.
- The MOL round trip preserves the formula for all 46 entries.

### Reference bond table (one table)
- C⋯C(ar) 1.39, C=O 1.21, C–H 1.09, C–O 1.43, N≡N 1.10, C≡N 1.16, S=O 1.43; `idealBondLength` and `BondInfo.idealLength` delegate to it.
- I spot-checked the CCCBDB-tagged rows against diatomic and simple experimental values: NaCl 2.36, NaF 1.93, NaI 2.71, ClF 1.63, Cl₂ 1.99, I₂ 2.67, S–H 1.34, P–H 1.42, Si–H 1.48.
- Placement uses the table: Cl on C at 1.770, C–O 1.430, O–H 0.960.

### Geometry after store actions
| Action | Result |
|---|---|
| Two O= clicks on C | CO₂ 180°, C=O 1.210 |
| O= on C | H₂C=O 120/120/120°, C=O 1.210 |
| Ethane | staggered (−180/60/−60) |
| Propene | 120° at both sp² centres |
| Propyne | 180° / 180° |
| Ethene via `setBondOrderOf` | 120° |
| → ethyne | 180° |
| Water / NH₃ / H₂S / PH₃ / BH₃ / SiH₄ from empty | 104.5 / 107.0 / 92 / 94 / 120 / 109.5° |
| CH₄ + O on H | CH₄O 32.042, exactly +1 history entry |
| C→N on methane | 107.0×3 (round-2 distortion fixed) |
| C→Si | 1.48 |
| C→P | 94×3 |
| H₂O `setCharge +1` | H₃O⁺ 107×3 |
| NH₃ `setCharge +1` | NH₄⁺ 109.5×6 |

### Library experimental geometries (measured)
| Molecule | Measured | A4.1 within tolerance |
|---|---|---|
| CH₄ | 1.087 / 109.5° | yes |
| H₂O | 0.958 / 104.5° | yes |
| NH₃ | 1.012 / 106.7° | yes |
| CO₂ | 1.162 / 180° | yes |
| C₂H₄ | 1.339 / 1.086 / 117.6° | yes |
| C₂H₂ | 1.203 / 1.063 / 180° | yes |
| C₆H₆ | 1.397 / 1.084 / 120° | yes |
| BF₃ | 1.313 / 120° | yes |
| SO₂ | 1.431 / 119.3° | yes |
| SF₆ | 1.560 / 90° | yes |

- The task's "CO₂ 1.160" is not the A4.1 target. The SPEC says 1.162, and that is what the data holds.

### Descriptions
- No temperatures remain.
- The H₂O₂ text now cites the 94° actually present in the coordinates (measured 94.0°).
- Propane says ≈112° (measured 111.66°), SO₂ ≈119° (119.3°), caffeine 194,19 g/mol.

### Honesty strings
- The relax action and toast avoid "optimi*".
- Lipinski shows only the qualifier plus per-rule rows.
- No dipole, logP, TPSA, pKa or energy value appears.
- The monoisotopic mass is in u with 4 decimals, plus the M+2 tooltip.

## Blocking

1. **[ui] The Turkish geometry name still loses its mandated qualifiers** (round-2 blocker #2, unfixed; A4.2 MUST, A.6, A.7 #7, checklist #4/#7).
   - `Inspector.tsx:336` still does `info.geometry.replace(/\s*\([^)]*\)\s*$/, '')`. The comment claims the parenthesis is "an English gloss", which is false: every parenthesis in `GEOMETRY` is Turkish.
   - Repro: load Anilin and click N. The data model gives `Düzlem üçgen (konjugasyon, tahmini)` (probe CARD anilin N1). The card renders **"Düzlem üçgen"**.
   - Water O, and every AX₂E / AX₂E₂ atom, renders "Kırık doğru" instead of `Kırık doğru (açısal)`.
   - Furan and thiophene render "Kırık doğru" instead of `Kırık doğru (konjugasyon, tahmini)`.
   - The estimate qualifier, which is exactly the honesty marker A4.2 requires, never reaches the screen in TR. The EN UI keeps it.

2. **[ui] The library dialog still lists Hill formulas as the primary formula** (round-2 blocker #9, unfixed; A2.1 MUST, checklist #16 intent).
   - `LibraryBody.tsx:16` uses `formula(entry.molecule, true)`, and line 101 renders it.
   - Ammonia shows **H₃N**, SO₂ **O₂S**, SF₆ **F₆S**, H₂SO₄ **H₂O₄S**, H₃PO₄ **H₃O₄P**, right next to descriptions that start "NH₃ —", "SO₂ —".
   - Fix: use `conventionalFormula()`, the same call the molecule card already uses.

3. **[chem-props] The Gasteiger "not computable" block is only one bond deep, so fabricated partial charges are displayed** (D.6.5 "values that cannot be computed are absent"; A.5 Tahmini value; fabricated value).
   - `properties.ts:667-672` `chargeBlocked` nulls an atom only if it, or a *direct* neighbour, lacks parameters or is incomplete. `gasteiger()` (`:674-710`) then equalises only the bonds whose two ends both have parameters, so the network is silently truncated.
   - Repro 1 (misc log): H₂SO₄ gives S, O, O, O, O = null but **H = +0.2528**. H₃PO₄ gives P/O null but **H = +0.2528**.
     - That is the charge of an isolated O–H fragment, presented as the charge of the acid H.
   - Repro 2 (probe): methanol with one C–H deleted gives C, O, and the H on C = null, but **H on O = +0.2095**. The molecule card says "Yapı eksik".
   - The Inspector shows "+0,25 · Tahmini" on these H atoms, and the "Kısmi yükler" overlay colours them.
   - Fix: null the whole connected component when any atom in it is blocked. PEOE equalisation is molecule-wide, not local.

4. **[chem-props] XYZ import turns a neutral sulfuric acid into a dianion with fabricated formal charges** (real bug; scientifically wrong species presented as valid; A.7 #14 spirit; B.13).
   - Repro: `parseXYZ(toXYZ(getEntry('sulfurik-asit').molecule))` gives **H₂O₄S²⁻**. All bonds are single, and two terminal O are given charge −1. Every atom is `'ok'`, so no warning appears (xyz log).
   - Cause:
     - `perceiveBonds` computes `deficiency` from `valenceTarget(S, 0, 4)` = 4. S, at its first fitting valence, never asks for S=O double bonds (`io.ts` double-bond step, about lines 438-452).
     - Step 3 then turns every terminal O with one bond into O⁻ whenever the file has H (`io.ts:502-506`).
   - The user exports their own molecule as XYZ, re-imports it, and gets a different, charged species. The formula shows `H₂O₄S²⁻`, and the mass is shifted by 2 electron masses.
   - Same root cause, but flagged rather than silent: SO₂ comes back as O–S–O with both O `under`, and SO₃ as 1 double + 2 single bonds with O `under`.
   - Fix: when a terminal O is singly bonded to S or P, prefer the higher S/P valence (a double bond to O) before assigning O⁻. Or refuse to invent charges for hypervalent centres and flag them instead.

5. **[ui] A3.2 label missing: placement geometry is shown as "Ölçülen" with no `İdealize geometri (enerji minimizasyonu değil)` label** (A3.2 MUST; unlabelled approximate values).
   - The only places the phrase appears are the clean-up toast, the disabled-reason text and the About dialog (`i18n.ts:71,143,184`). No Inspector or molecule-card element uses it.
   - For any molecule built with the editor, `useCoordSource` returns `null` (`inspector/source.ts:47-48`), so the molecule card shows **no provenance line at all**.
   - Repro: Atom tool, O, click empty space. The atom card shows "Ölçülen bağ açısı (ortalama) **104,5°**" next to "İdeal < 109,5°".
     - The 104.5° is a hard-coded placement constant (`geometry.ts:146-148`: 104.5 / 107 / 92 / 94 / 106 / 99), not a measurement of anything physical.
     - A student reads it as the app having found the experimental water angle.
   - The same applies to NH₃ (107.0°), H₂S (92°) and PH₃ (94°). Edited library molecules only get "Molekül sonradan düzenlendi; koordinatlar değişmiş olabilir." (`i18n.ts:430`).
   - Fix: show `İdealize geometri (enerji minimizasyonu değil)` as the coordinate-source line for every molecule with no library or PubChem source, and for every edited one.

6. **[chem-props] The lone-pair count contradicts A4.2's formula and basic chemistry for conjugated N and aromatic O/S** (A4.2 MUST "LP = (valenceElectrons − charge − Σ bond orders) / 2"; scientific inaccuracy).
   - The A4.2 formula gives **LP = (5 − 0 − 3)/2 = 1** for aniline / pyrrole / amide N. `electronDomains` sets `lp = g.conjugated ? 0 : …` (`geometry.ts:139`).
   - The card therefore prints **"Ortaklanmamış çift: 0"** for aniline, urea, adenine-NH, caffeine, paracetamol, penicillin and pyrrole N (probe CARD lines). That is a classic misconception: the pair exists, delocalised into π.
   - Furan O / thiophene S: the formula gives LP = 2. `properties.ts:622-633` overrides this to **LP 1, SN 3**, while `electronDomains` still reports `sn 4 / lp 2` for the same atom (probe `CARD furan O1 … | dom sn=4 lp=2`). That is a residual second classification, against A4.2 "there is no second implementation".
   - The round-2 complaint (SN ≠ σ + LP) was resolved by changing LP. The honest resolution is to keep LP at its chemical value and qualify the domain count:
     - e.g. `Ortaklanmamış elektron çifti: 1 (π sistemine delokalize)`
     - with SN 3 and AX₃ described as "konjugasyon: bu çift elektron grubu sayılmaz"
   - Apply the same in `electronDomains` for furan and thiophene, so that geometry.ts and the card agree.

7. **[chem-props] The valence issue message contradicts itself for hypervalent S/P without O/F** (real bug in the A1.3 `'under'` presentation).
   - `valenceState` correctly returns `'under'` for SH₄, PH₅ and the 3-bonded S (`molecule.ts:101-107`). `computeTopo` then falls through to `code: 'valenceInvalid'` (`properties.ts:1065-1067`). The UI renders `issue.invalid` (`Inspector.tsx:111`, `i18n.ts:333`).
   - Result: **"S #1: geçersiz değerlik (4 bağ; geçerli: 2 / 4 / 6)"**. The user is told that 4 is invalid and valid in the same sentence (probe PROP SH4 / PH5).
   - Give this case its own code and text, e.g. "S değerliği 2'nin üstünde yalnızca O veya F komşusuyla geçerli". The data model needs a reason field; `IssueDetail` has none.

8. **[ui] A.6 terminology (MUST-v1 table) is still not followed; English source text leaks into the TR UI** (round-2 improvement escalated, because A.6 is MUST-v1 and checklist #28 / #36 depend on it).
   - `i18n.ts:287` `'Sterik sayı'` should be `Elektron grubu sayısı (sterik sayı)`.
   - `:288` `'Ortaklanmamış çift'` should be `Ortaklanmamış elektron çifti`.
   - `:240` `'Halka'` should be `Halka sayısı`.
   - `:274` `'Kullanılan / izin verilen değerlik'` is bare "değerlik", which A.6 forbids ("never bare 'değerlik'"); use `Bağ yapma kapasitesi`.
   - `:182` `set.about.computed.body` says **"molar kütle"**, mixed with `Mol kütlesi` elsewhere. A.6: "do not mix".
   - The bond card's row source is shown raw from the chem module: "Allen 1987 (rounded)" / "CCCBDB gas-phase" (`Inspector.tsx:484-487,510`, from `molecule.ts:255-258`). That is English text in the Turkish UI, against A6.3 "every user-visible string in src/ui comes from t()".

## Improvements (non-blocking)
- **[ui]** A4.4: no `Deneysel 104,5° (CCCBDB)` value appears next to Ölçülen / İdeal for the A4.1 molecules. The value exists only inside the coordinate-source line.
- **[ui]** `tabulatedDecimals` reads JS literals, so Na shows **22,99 u** instead of the CIAAW abridged 22,990 (`inspector/format.ts:15-19`). Store the tabulated digit count with the value.
- **[chem-core]** A1.3 as written flags well-known **PCl₅** (and PBr₅, SCl₄) as `'under'`: P is above its lowest valence with no O/F neighbour. Meanwhile `CONVENTIONAL_FORMULA` even lists `Cl5P → PCl₅` and `Cl3P`.
  - This is spec-conformant, but chemically wrong for main-group halides.
  - Propose a SPEC amendment: allow Cl / Br neighbours for P(V), or document it as a known limitation in the tooltip.
- **[chem-props]** Molfile charge code 4 (doublet radical) is silently loaded as neutral, and `M  RAD` is ignored (`io.ts:212-227`, `CHARGE_CODES`). Reject it, or at least flag the atom.
- **[chem-props]** Molfile/`M  CHG` charges of ±3 are accepted by `parseMolfile` and then rejected by `validateMolecule` (−2…+2, `store.ts:184`) with the generic "invalid atom" reason. A localized message naming the charge range would be clearer.
- **[chem-props]** The nitro N–O⁻ is placed at the N–O single-bond length (1.400 Å) against 1.210 Å for N=O (probe "store nitro final"). Real nitro N–O bonds are equal (≈1.22 Å). The geometry is idealised, but an asymmetric nitro looks wrong to chemists. Use the resonance-averaged length for N⁺–O⁻ next to N⁺=O.
- **[chem-core]** The `C=S 1.61` row is tagged `A` (Allen 1987 rounded). Allen's thione/thioamide C=S values are ≈1.67-1.68 Å, while 1.61 is the CCCBDB thioformaldehyde value. Re-tag the row or correct the value.
- **[ui]** SF₆ / PF₅ cards say "hesaplanamadı" (SN ∉ 2-4, as MUST permits), while the description and coordinate line say "düzgün sekizyüzlü". A4.3 (SHOULD) would remove the inconsistency.
- **[chem-props]** Cyclohexane description "yaklaşık 111°" against 111.6° measured; ≈112° would be correct rounding.
- **[ui]** The composition bar uses `Math.max(2, c.percent)%` (`Inspector.tsx:84`), so a sub-2 % element is drawn at 2 %. That is a small visual exaggeration of the data.
- **[chem-core]** Migration E6 leftovers: `store.ts:127` comment still reads "animated geometry optimisation", and the toast code is still `geometryOptimized` (E6 asks for `geometryRelaxed`). Neither is user-visible.
- **[tests]** The suite run (`critic-r3-science-suite.txt`) had **2 failures out of 402**. Both were 5 s timeouts, not assertion failures:
  - `geometry.test.ts:461` "1000-style robustness" (5.6 s)
  - `library.test.ts:104` "no atom pair closer than 0.7 A" (9.3 s, O(n²) over 46 molecules)
  - The machine was probably under load from parallel sessions, but checklist #1 needs `npm test` green. Give these tests explicit timeouts, or make them cheaper.
- **[tests]** No oracle exists for blockers 1-7 above. One-liners would catch them:
  - render the aniline card text
  - `LibraryBody` formula for ammonia
  - Gasteiger null for every atom of H₂SO₄
  - XYZ round trip of every library entry preserving the formula
  - LP of aniline N = 1
  - the SH₄ issue code

## Score rationale
The data layer is now strong and checked against the references:
- constants, masses, composition, formulas
- DoU gating, valence rules, auto-H
- io rejections, the bond table
- every edit-time and library geometry

A student still meets wrong or unlabelled science on screen:
- stripped "(konjugasyon, tahmini)" / "(açısal)"
- Hill formulas in the library
- "LP 0" for aniline N
- an invented +0,25 charge on sulfuric-acid H
- a re-imported H₂SO₄ that becomes a dianion
- hard-coded placement angles shown as "Ölçülen" without the idealised-geometry label
- a self-contradictory valence message
- unchanged A.6 terms
