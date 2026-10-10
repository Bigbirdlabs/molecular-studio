# Round 4 critique: SCIENTIFIC ACCURACY + DATA MODEL + HONESTY

- **State judged:** HEAD 190f5b3 plus the uncommitted round-3 fix set in the working tree (24 modified files under src/). Other critic sessions were running in parallel.
- **Critic:** fresh context, independent, judged against SPEC.md (original + ENHANCEMENT ADDENDUM v1 + MUST-v1 checklist), GOAL.md and BRIEF.md, using the real code and my own probes only.
- **Evidence** (`gauntlet/logs/`):
  - `critic-r4-science-probe.txt`: the full probe output. It covers library masses and formulas, VSEPR/LP cards, Gasteiger, valence and auto-H, io rejections, XYZ/MOL round trips, the bond table, store-driven geometry, provenance origin, library geometry and descriptions.
  - `critic-r4-science-run1.txt`: the probe runner output.
  - `critic-r4-science-suite.txt`: the project suite, run once. **402/402 passed, 9 files, 4.3 s.**
- The probe source (`gauntlet/scratch/critic-r4-sci/`) was deleted after the run.

**Verdict: FAIL, 81/100.**
- This round fixed real round-3 blockers. Each fix was verified by probe:
  - the geometry qualifier is kept
  - Gasteiger is nulled per connected component
  - the XYZ re-import of H₂SO₄ is correct for all 46 entries
  - hand-built molecules carry the A3.2 idealised label
  - SH₄ no longer gets a self-contradictory message
  - most A.6 terms are fixed
  - Molfile radicals and |charge| > 2 are rejected with their own codes
  - Na shows 22,990 u
  - bond-row sources are localised
- Blockers remain where the screen still says something scientifically wrong or unlabelled:
  - "0 lone pairs" on aniline-type N
  - placement constants shown as "Ölçülen" on edited library, PubChem and imported molecules, and a false "idealised" claim after reload
  - Hill formulas in the library list
  - aromatic bonds announced as single or double bonds
  - A.6 and A2.3 leftovers

## Verified correct (independently, this round)

### Element table and masses
- **Element table:** unchanged and correct, with the A.1 sources commented field by field.
- **Rejected symbols:**
  - `isKnownElement('D'|'T') = false`.
  - XYZ rejects D and T (`unsupportedIsotope`), and Fe, Se, `26` and `__proto__` (`unsupportedElement`).
  - Molfile rejects `M  ISO` (`unsupportedIsotope`), `M  RAD` and charge code 4 (`unsupportedRadical`, new), and `M  CHG … 3` (`chargeOutOfRange`, new).
- **Masses (all 46 entries)**:

| Molecule | Average (g/mol) | Monoisotopic (u) |
|---|---|---|
| CH₄ | 16.043 | 16.03130 |
| H₂O | 18.015 | 18.01056 |
| NH₃ | 17.031 | 17.02655 |
| CO₂ | 44.009 | 43.98983 |
| C₂H₄ | 28.054 | — |
| C₂H₂ | 26.038 | — |
| C₆H₆ | 78.114 | 78.04695 |
| C₂H₅OH | 46.069 | — |
| BF₃ | 67.804 | 68.00451 (¹¹B) |
| SF₆ | 146.048 | — |
| H₂SO₄ | — | 97.96738 |
| caffeine | 194.194 | — |

- Composition is unrounded and sums to 100 within 3e-14 for every entry.

### Formulas, DoU and valence
- **Formulas (data model):**
  - Hill: H₃N, O₂S, F₆S, H₂O₄S, H₃O₄P, H₄N⁺.
  - Conventional: NH₃, SO₂, SF₆, H₂SO₄, H₃PO₄, NH₄⁺, PCl₅. BF₃ and the carbon compounds stay Hill.
- **DoU gating:**
  - CH₄ 0, C₂H₄ 1, C₂H₂ 2, C₆H₆ 4, cyclohexane 1, adamantane 3, naphthalene 7, morphine 9, CO₂ 2.
  - Null for H₂SO₄, SO₂, BF₃, SF₆, H₃PO₄, penicillin G, and charged nitromethane.
- **Valence and auto-H:**
  - Neutral 5-bond N → `over`. NH₄⁺ → `ok`. Every atom of every library entry → `ok`.
  - R–Cl–R + `addAllHydrogens` → C₂H₆Cl, no H on Cl, Cl `over`.
  - S(CH₃)₃ → no H, `under`. P(CH₃)₄ → no H, `under`. SH₄ → `under`.
  - Bare C `adjustHydrogens` → CH₄ at 1.090 Å.
  - SH₄ issue now carries `allowed: [2]`. The UI renders "S #1: geçersiz bağ sayısı (4 bağ; geçerli: 2)", which is no longer self-contradictory.

### VSEPR cards (data)
| Atom | Card |
|---|---|
| H₂O O | AX₂E₂, "Kırık doğru (açısal)", LP 2 |
| NH₃ N | "Üçgen piramit", LP 1 |
| CO₂ C | "Doğrusal" |
| BF₃ B | "Düzlem üçgen" |
| CH₄ C | "Düzgün dörtyüzlü", sp³, LP 0 |
| SO₂ S | AX₂E (hybridisation hidden) |
| H₂SO₄ / H₃PO₄ | dörtyüzlü |
| CH₃⁺ | düzlem üçgen |
| CH₃⁻ / H₃O⁺ | üçgen piramit |
| BH₄⁻ | dörtyüzlü |
| pyridine / imine-type N | "Kırık doğru (açısal)", LP 1 |
| nitromethane N⁺ | düzlem üçgen |

- `hesaplanamadı (yapı eksik)` appears for a bare 2-bonded C and for the 5-bond N.
- Plain `hesaplanamadı` appears for SH₄ and SF₄ (SN 5 with LP).
- **Round-3 blocker #1 is fixed:** `Inspector.tsx:352` now renders the full name, so "Düzlem üçgen (konjugasyon, tahmini)" and "Kırık doğru (açısal)" reach the screen.

### Gasteiger–Marsili
- **Round-3 blocker #3 is fixed.** `chargeBlocked` (`properties.ts:695-727`) nulls the whole connected component:
  - H₂SO₄ and H₃PO₄: every atom, including H, is null.
  - Methanol minus one C–H: every atom is null.
  - Water and SF₆ as two disconnected fragments: water keeps O −0.410 and H +0.205. The block is per component, which is correct.
- Water O −0.410, methane C −0.078, acetone O −0.298, methanol O −0.398 / H(O) +0.209.

### io
- **Round-3 blocker #4 is fixed.** XYZ round trip of all 46 library entries preserves the formula and the bond-order multiset, with no non-`ok` atom (`XYZRT failures 0`). MOL round trip: 0 failures.
- An H-free SO₄ XYZ loads as O₄S with two O flagged `under`. It is flagged, not silent, and no charge is invented.

### Bond table
- C⋯C(ar) 1.39, C=O 1.21, C–H 1.09, C–O 1.43. `idealBondLength` is identical.
- Fallback C–Na: Cordero sum 2.42 Å, with a null source and the "kovalent yarıçaplar toplamı" label.
- Placement through the store uses the table: C–Cl 1.770, C–O 1.430, O–H 0.960, C≡C 1.200, C=O 1.210, Si–H 1.480, B–H 1.200.

### Geometry after store actions
| Action | Result |
|---|---|
| CO₂ (C, then two O= clicks) | 180.0°, C=O 1.210 |
| H₂C=O | 120/120/120° |
| Ethane | staggered (−180/60/−60) |
| Propene | 120° at both sp² centres |
| Propyne | 180° / 180° |
| H₂O / NH₃ / H₂S / PH₃ / BH₃ / SiH₄ | 104.5 / 107.0 / 92.0 / 94.0 / 120.0 / 109.5° |
| H₂O `setCharge +1` | H₃O⁺ 107×3, card üçgen piramit |
| C → N | 107×3 |

### Library experimental geometry (measured)
| Molecule | Measured |
|---|---|
| CH₄ | 1.087 / 109.5° |
| H₂O | 0.958 / 104.5° |
| NH₃ | 1.012 / 106.7° |
| CO₂ | 1.162 / 180° |
| C₂H₄ | 1.339 / 1.086 / 117.6° |
| C₂H₂ | 1.203 / 1.063 / 180° |
| C₆H₆ | 1.397 / 1.084 / 120° |
| BF₃ | 1.313 / 120° |
| SO₂ | 1.431 / 119.3° |
| SF₆ | 1.560 / 90° |

- All are within the A4.1 tolerance.
- The task line "CO₂ 1.160" is not the SPEC target. A4.1 and checklist #18 say 1.162, and the data holds 1.162.

### Descriptions
- H₂O₂ cites the measured 94° (probe 94.0°). Propane ≈112° (measured 111.7°). SO₂ ≈119° (119.3°). No temperatures.

### Honesty strings
- A4.4 `Deneysel bağ açısı (CCCBDB)` appears for metan, su, amonyak, CO₂ and asetilen, and is suppressed when the molecule is edited.
- Bond source text is localised (`molecule.ts:276-280`).
- Na mass shows 3 decimals (`inspector/format.ts:19`).

## Blocking

### 1. [chem-props + ui] The lone-pair count shown for conjugated N still contradicts A4.2's formula, and a second classification survives for aromatic O/S
*(round-3 #6; A4.2 MUST "LP = (valenceElectrons − charge − Σ bond orders)/2", "there is no second implementation"; scientific inaccuracy)*

- `geometry.ts:139` sets `lp = 0` for a conjugated N. The UI renders `info.lonePairs` (`Inspector.tsx:411`).
- The data model now also computes the correct value: `lonePairsTotal = 1`, `lonePairsDelocalised = 1` (`properties.ts:612, 792-793`). The UI never shows either field; `grep lonePairsTotal src/ui` returns nothing.
- **Repro:** load Anilin and click N. The card reads **"Ortaklanmamış elektron çifti: 0"** (probe `CARD anilin #1 N … lp=0 lpTot=1 lpDeloc=1`).
  - The same happens for urea N×2, caffeine N3/N4/N5, adenine N1/N5, paracetamol and penicillin amide N.
  - Saying "the N has no lone pair" is the textbook misconception; the pair exists and is delocalised.
- **Fix:** show `lonePairsTotal` with a qualifier, e.g. `1 (π sistemine delokalize; elektron grubu sayılmaz)`. Keep SN 3 / AX₃.
- **Aromatic O/S:** the override is still in `properties.ts:648-657` (furan O / thiophene S get `lp = 1, sn = 3`). `electronDomains` keeps `sn 4 / lp 2` for the same atom. A hand-built furan O therefore shows LP 1, where the A4.2 formula gives 2, and placement and label disagree.
- **Fix:** apply the same total/delocalised split in `electronDomains`.

### 2. [ui] A3.2 / provenance: placement constants are still presented as "Ölçülen" for any non-hand-built molecule that was edited, and provenance flags are lost on reload, producing false labels
*(A3.2 MUST, A.5 provenance rule 3; fabricated or unlabelled-approximate values)*

- `useGeometryOrigin` (`inspector/source.ts:69-73`) returns `'source'` for any `lib-*` or PubChem id, and `'imported'` for a file import, regardless of edits.
- Edits keep the molecule id, so every geometry row stays labelled "Ölçülen bağ açısı" / "Ölçülen uzunluk" with tooltip "Mevcut koordinatlardan" (`Inspector.tsx:414, 530`).
- **Repro A (probe `ORIGIN`):**
  1. Load Su (library) and set formal charge +1 on O.
  2. The molecule is H₃O⁺ with the hard-coded 107.0° ×3 placement (`geometry.ts:146-148`).
  3. The origin is still `source`, so the atom card shows **"Ölçülen bağ açısı (ortalama) 107,0°"**.
  4. The card also keeps "Koordinatlar: NIST CCCBDB deneysel geometri (re) … 104,478°" plus "Molekül sonradan düzenlendi; koordinatlar değişmiş olabilir."
  5. No `İdealize geometri (enerji minimizasyonu değil)` label appears.
  - The same happens with Metan + Cl via the atom tool (C–Cl 1.770 table value shown as "Ölçülen uzunluk").
  - The same happens with "Geometriyi düzenle" on any library molecule. That is `relaxStep` output, which A3.2 names explicitly.
- **Repro B (PubChem):** `useCoordSource` hard-codes `edited: false` for PubChem molecules (`source.ts:56`). Import caffeine from PubChem and add an atom: the card still says "Koordinatlar: PubChem 3B konformer (hesaplanmış) · Kaynak: PubChem", with no edited note, and the new atom's placement constants read "Ölçülen".
- **Repro C (reload):** `pubchemIds` and `importedIds` are in-memory `Set`s (`source.ts:10, 19`). The autosave restore keeps `mol.id` (`store.ts:301`). After a page reload, a PubChem or file-imported molecule falls through to `'idealized'`.
  - The card then states **"Koordinatlar: İdealize geometri (enerji minimizasyonu değil); açı ve uzunluklar yerleştirme sabitleridir, ölçüm değildir."**
  - It labels every bond "Modeldeki uzunluk (idealize)". That is a false provenance claim about coordinates that came from PubChem or a file.
- **Fix:** persist a source kind on the molecule, or in the saved project. Make origin `'idealized'` (with the A3.2 label) as soon as an edit, placement or relax touches a `source` / `imported` molecule, or at minimum per edited atom.

### 3. [ui] The library dialog still lists Hill formulas as the primary formula
*(round-2 #9 and round-3 #2, unfixed; A2.1 MUST "conventional form is the primary formula whenever the composition matches a key")*

- `LibraryBody.tsx:16` uses `formula(entry.molecule, true)` (always Hill, `molecule.ts:150-152`), and line 101 renders it.
- **Repro:** open Kütüphane. Ammonia shows **H₃N**, SO₂ **O₂S**, SF₆ **F₆S**, H₂SO₄ **H₂O₄S**, H₃PO₄ **H₃O₄P** (probe `LIB … hill=`), next to descriptions that begin "NH₃ —" and "SO₂ —".
- **Fix:** one-line change to `conventionalFormula(entry.molecule, true)`. Keep the Hill string in the search haystack.

### 4. [scene + ui] Aromatic bonds are announced as single or double bonds outside the inspector
*(scientific inaccuracy; contradicts the inspector, which says "Aromatik bağ (σ + delokalize π)", and the benzene description, which says "tüm C–C bağları eşit uzunluktadır")*

- `HoverTip.tsx:34` and `Announcer.tsx:94` call `bondOrderName(b.order, …)` and ignore `b.aromatic`. `StatusBar.tsx:93` draws `['-','=','≡'][b.order-1]`.
- The library benzene bonds carry `aromatic: true` with Kekulé orders (`library.ts:338-339`).
- **Repro:** load Benzen and hover two adjacent ring bonds.
  - The tooltips read **"C–C · Çift bağ (σ + π) · 1,397 Å"** and **"C–C · Tekli bağ (σ) · 1,397 Å"**: one length, two different "bond types".
  - Selecting a ring bond puts **"C=C"** or **"C-C"** in the status bar and in the screen-reader announcement.
- This affects every aromatic library entry (benzene, toluene, phenol, aniline, pyridine, naphthalene, caffeine, adenine, aspirin, paracetamol, ibuprofen, nicotine, morphine, penicillin).
- **Fix:** use the aromatic name and a `:` or `⋯` glyph when `b.aromatic`, matching `properties.ts:828`.

### 5. [ui + chem-props] A.6 "Mol kütlesi … do not mix" is still violated in user-visible text
*(round-3 #8 remainder; A.6 MUST-v1)*

- `i18n.ts:182` `set.about.computed.body` says **"molar kütle (IUPAC standart atom ağırlıkları)"**. It is rendered in the About dialog (`Dialogs.tsx:85`).
- The caffeine description (`library.ts:920`) says **"Molar kütlesi yaklaşık 194,19 g/mol'dür"**. Library prose is generated from `build-library.mjs` (A2.1 note), so fix it there.
- The dead keys `mol.mass` / `mol.lip.mass` ('Molar kütle') and `mol.rings` ('Halka') remain in the dictionary. They are not rendered, but should be removed so they cannot come back.

### 6. [ui] A2.3 "3 decimals for distances everywhere" is violated in two inspector or status texts
*(A2.3 MUST)*

- `Inspector.tsx:122`: the overlap issue formats the distance with `fix(d.distance, 2)`. Example: "C #3 ve #7 atomları çakışıyor (0,45 Å)".
- `StatusBar.tsx:101`: the camera distance is shown in Å with 2 decimals (`fmtNum(lang, cam.distance, 2)`).
- A2.3 lists "inspector rows … status bar" distances at 3 dp. The ±0,005 Å rationale doesn't apply to camera distance, so either show 3 dp or drop the Å unit there. The overlap distance must be 3 dp.

### 7. [ui] Checklist #36 literal check fails
*(A6.3 / checklist #36: `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` must return 0 hits)*

- One hit: the comment at `Inspector.tsx:351` contains "açısal".
- It is harmless at runtime, but the acceptance command is literal. Transliterate the comment.

## Improvements (non-blocking)

### Spec and valence model
- **[chem-core] A1.3 deviation:** `HYPERVALENT_PARTNERS` (`molecule.ts:108`) admits Cl, Br and I, so PCl₅ / SCl₄ are `ok` (probe `PCl5 … state ok`).
  - This is chemically right, but A1.3 literally says "not bonded to O or F → under".
  - Get the SPEC amended or record the deviation.
  - The issue text built in `properties.ts:1122-1123` still says "yalnızca O veya F komşusu varsa geçerli", which is now inconsistent with the rule. The UI uses `issueText`, so it is not visible today.
- **[ui] A2.2 vs A.6:** A2.2 mandates the literal `Geçersiz değerlik: <element> (<used>/<max>)`, while the UI shows "Geçersiz bağ sayısı" (`mol.invalidValenceA6`) to satisfy A.6's "never bare değerlik". It is a reasonable reconciliation; document it so the checklist reviewer doesn't count it as a miss.

### Provenance labels
- **[ui]** A hand-built molecule whose atoms were dragged keeps the label "Modeldeki bağ açısı (idealize)" and the tooltip "düzenleyicinin yerleştirme sabiti, ölçüm değil". After a drag the angle is neither a placement constant nor idealised. Consider "Modeldeki bağ açısı" with a neutral tooltip once any drag has happened.
- **[ui]** A4.4: `Deneysel` is offered for 5 of the 8 A4.1 molecules. Ethylene (117,6° H–C–H), benzene (120°) and BF₃ (120°) have the reference value in their source line but no Deneysel row.

### Reference data and geometry
- **[chem-core]** The `C=S 1.61` row is still tagged `A` (Allen 1987). Allen's thione/thioamide C=S is about 1.67-1.68 Å; 1.61 is the CCCBDB H₂C=S value. Re-tag it `C` or change the value (`molecule.ts:300`).
- **[chem-core]** The nitro N⁺–O⁻ bond is placed at the N–O single length (1.40 Å) against 1.21 Å for N⁺=O. Real nitro N–O bonds are equal (about 1.22 Å). Use a resonance-averaged length for N⁺–O⁻ next to N⁺=O.
- **[ui]** SF₆ / PCl₅: the data model gives "Düzgün sekizyüzlü" / "Üçgen çift piramit" (A4.3 SHOULD names already present), but the card shows "hesaplanamadı" because `sn > 4 → 'na'` (`Inspector.tsx:347`), while the SF₆ description says "düzgün sekizyüzlü". Show the A4.3 name with the `yaklaşık` badge to remove the contradiction.
- **[chem-props]** The cyclohexane description says "yaklaşık 111°" where the measured value is 111.6°. "≈112°" is the correct rounding (fix in `build-library.mjs`).

### Gasteiger
- **[chem-props]** On formally charged centres (H₃O⁺ O −0.46, the N⁺ of nitromethane), the six-iteration PEOE drives the charge strongly negative. That is a known method artefact. It is already badged `Tahmini`; the tooltip could mention that charged centres are least reliable.

### Leftovers and tests
- **[chem-core]** E6 leftovers: `store.ts:128` still says "animated geometry optimisation", and the toast code is still `geometryOptimized` (E6 asks for `geometryRelaxed`). Neither is user-visible.
- **[tests]** No oracle exists for blockers 1-4:
  - the displayed LP for aniline N (render the card, or assert `lonePairsTotal` is what the UI uses)
  - the `LibraryBody` formula for ammonia
  - the provenance label after edit or reload
  - the hover or status text for an aromatic bond

  The XYZ all-library round trip and the H₂SO₄ Gasteiger null are now worth asserting too (`science.test.ts:592` covers the formula only, not bond orders or charges).

## Score rationale
The data layer is now strong and checked against the references:
- constants, masses, monoisotopic values, composition, formulas, DoU gating
- valence rules and auto-H
- io rejection, now including radicals and the charge range
- the one bond table
- every edit-time and library geometry
- component-wide Gasteiger and the XYZ hypervalent re-import

On screen, a student still meets:
- "0 lone pairs" on aniline-type N
- hard-coded placement angles shown as "Ölçülen" after editing a library or PubChem molecule, and a false "idealised placement constants" claim after a reload
- Hill formulas in the library list
- benzene bonds announced as alternating single and double bonds of equal length
- small A.6 and A2.3 misses
