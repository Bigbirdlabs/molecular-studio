# Round 5 critique: SCIENTIFIC ACCURACY + DATA MODEL + HONESTY

- **State judged:** HEAD 190f5b3 plus the uncommitted working tree (31 modified files under src/, last edits about 00:17 on 2026-10-11, after the round-4 critiques were written). Other critic sessions may have been running in parallel.
- **Critic:** fresh context, independent. Judged against SPEC.md (original spec + ENHANCEMENT ADDENDUM v1 + the MUST-v1 checklist), GOAL.md and BRIEF.md. I used the real code and my own probes only.
- **Evidence** (all in `gauntlet/logs/`):
  - `critic-r5-science-probe.txt`: full probe output, 442 lines. It covers library masses and formulas, VSEPR/LP cards, Gasteiger, valence and auto-H, io rejection, MOL/XYZ round trips, the bond table, store-driven geometry, nitro build and clean-up, provenance after edit, drag, undo and reload, library geometry, descriptions, and the aromatic-flag audit.
  - `critic-r5-science-run{1,2,3}.txt`: probe runner output.
  - `critic-r5-science-suite.txt`: project suite, run once. **432/432 passed, 12 files.**
- The probe sources (`gauntlet/scratch/critic-r5-sci/`) were deleted after the run.

**Verdict: FAIL, 80/100.**

The data layer is correct against every reference I checked. The screen still says scientifically wrong or mislabelled things in these places:
- LP 0 on aniline/amide N: the fix exists in the data model but the UI doesn't render it.
- A new sticky "atoms moved by hand" provenance label that survives a pristine reload.
- Hill formulas in the library list.
- C=C / C-C for aromatic bonds in the status bar.
- A self-contradicting nitro N–O reference length, new this round.
- Leftover "molar kütle" wording.

## Verified correct (independently, this round)

### Element table
- The 14 `mass` / `mono` values equal SPEC A1.5 exactly, with field-by-field provenance comments (`elements.ts:4-14`).
- `isKnownElement` is false for Fe, Se, D, T, `__proto__`, `toString`, `constructor`. `el('Fe')` throws `UnknownElementError` with the Turkish message.

### Masses (all 46 library entries)
- Average mass equals Σ table masses, and the monoisotopic mass equals Σ `mono`.

| Molecule | Average (g/mol) | Monoisotopic (u) |
|---|---|---|
| CH₄ | 16.043 | 16.03130 |
| H₂O | 18.015 | 18.01056 |
| NH₃ | 17.031 | 17.02655 |
| CO₂ | 44.009 | 43.98983 |
| C₆H₆ | 78.114 | 78.04695 |
| BF₃ | 67.804 | 68.00451 (¹¹B) |
| SF₆ | 146.048 | — |
| caffeine | 194.194 | — |
| cholesterol | 386.664 | — |
| penicillin G | 334.390 | — |

- Composition is unrounded and sums to 100 within 3e-14 for every entry.

### Formulas (data model)
- **Hill:** H₃N, O₂S, F₆S, H₂O₄S, H₃O₄P, Cl₅P.
- **Conventional:** NH₃, SO₂, SF₆, H₂SO₄, H₃PO₄, PCl₅, NH₄⁺, SiH₄, NaCl. BF₃, H₃O⁺ and the carbon compounds stay Hill.
- The inspector header and the collapsed sheet use `conventionalFormula`, with Hill in the tooltip.

### Degree of unsaturation (DoU)
- **Values:** CH₄ 0, C₂H₄ 1, C₂H₂ 2, C₆H₆ 4, cyclohexane 1, adamantane 3, naphthalene 7, morphine 9, CO₂ 2, HCN 2, CF₄ 0.
- **Null (row hidden) for:** SO₂, BF₃, SF₆, H₂SO₄, H₃PO₄, penicillin G, every charged or incomplete probe molecule, and the N⁺/O⁻ nitro.

### Valence and auto-H
- Neutral 5-bond N → `over`, and the card shows `hesaplanamadı (yapı eksik)`. NH₄⁺ → `ok`. Every atom of all 46 library entries → `ok`.
- R–Cl–R + `addAllHydrogens` → C₂H₆Cl, with no H on Cl and Cl `over`.
- S(CH₃)₃, P(CH₃)₄ and SH₄ get no H and are `under`.
- PCl₅ is `ok`. That is a documented deviation from A1.3 (`molecule.ts:104-110`).
- Bare C₂: "Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir".

### VSEPR cards (data)
| Atom | Card |
|---|---|
| H₂O O | AX₂E₂, Kırık doğru (açısal), LP 2 |
| NH₃ N | Üçgen piramit, LP 1 |
| CO₂ C | Doğrusal |
| BF₃ B | Düzlem üçgen |
| CH₄ C | Düzgün dörtyüzlü, sp³, LP 0 |
| SO₂ S | AX₂E, hybridisation hidden |
| H₂SO₄ S / H₃PO₄ P | dörtyüzlü |
| CH₃⁺ | düzlem üçgen |
| CH₃⁻ / H₃O⁺ | üçgen piramit |
| BH₄⁻ | dörtyüzlü |
| pyridine N | Kırık doğru, LP 1 |
| nitro N⁺ | düzlem üçgen |

- SH₄ → plain `hesaplanamadı` (SN 5 with LP).
- Aniline / urea / caffeine N → "Düzlem üçgen (konjugasyon, tahmini)".

### Gasteiger
| Case | Result |
|---|---|
| Water | O −0.410, H +0.205 |
| Methane | C −0.078 |
| H₂SO₄, H₃PO₄, SO₂, SF₆, BF₃, SiH₄ | whole component null (`hesaplanamadı`) |
| Incomplete structures | null |
| Mg²⁺ + water as separate fragments | water keeps its charges |

### io
- **XYZ rejections:** D/T → `unsupportedIsotope`. Fe, Se, `__proto__`, `26`, `2H` and Xx → `unsupportedElement`.
- **Molfile rejections:** D → `unsupportedIsotope`, `M  ISO` → `unsupportedIsotope`, Fe → `unsupportedElement`, query bond 8 → `invalidMolfile`, V3000 → `v3000Unsupported`.
- **Molfile charges:** old charge code 3 and `M  CHG` both give NH₄⁺ correctly.
- **Round trips:** the XYZ round trip of all 46 entries keeps formula, bond-order multiset and valence state. The MOL round trip keeps formula and orders. The one diff is the caffeine aromatic flags; see improvements.

### Bond table
- C–C 1.54, C=C 1.34, C≡C 1.20, C⋯C(ar) 1.39, C–H 1.09, C–O 1.43, C=O 1.21, O–H 0.96, N–H 1.01.
- `idealBondLength` is identical to the table.
- The C=S row is now tagged CCCBDB (round-4 improvement done).
- Fallback C–Na: 2.42 Å, null source, shown as "tipik değer (kovalent yarıçaplar toplamı)".
- Row-source strings are localised.

### Geometry after store actions
| Action | Result |
|---|---|
| Methane + O on H (click-to-grow) | CH₄O, 32.042, C–O 1.430, one undo step, undo → CH₄ |
| CO₂ | 180.0°, C=O 1.210, card Doğrusal |
| H₂C=O | 120/120/120° |
| Ethane | staggered, dihedrals −180/60/−60 |
| Propene | 120° at both sp² centres |
| Propyne | 180° / 180°, C≡C 1.200 |
| H₂O | 104.5° |
| H₂O → +1 | H₃O⁺ 107.0°×3, card üçgen piramit |
| NH₃ | 107.0°×3 |

- `changeElement` on methane's C gives: SiH₄ (Si–H 1.480), NH₃, H₂O, H₂S (92°), PH₃ (94°), BH₃ (120°), HF, HCl, MgH₂, NaH. All are `ok`, with conventional formulas.
- Every edit made through the store labels the geometry `idealized`.

### Library experimental geometry (measured)
| Molecule | Measured |
|---|---|
| CH₄ | 1.0870 / 109.47° |
| H₂O | 0.9578 / 104.48° |
| NH₃ | 1.0120 / 106.67° |
| CO₂ | 1.1621 / 180° |
| C₂H₄ | 1.339 / 1.086 / 117.6° |
| C₂H₂ | 1.203 / 1.063 / 180° |
| C₆H₆ | 1.397 / 1.084 / 120° |
| BF₃ | 1.313 / 120° |
| SO₂ | 1.431 / 119.3° |
| SF₆ | 1.560 / 90° |

- All are within A4.1.
- The task line's "CO₂ 1.160" is not the SPEC target: A4.1 and checklist #18 say 1.162, and the data holds 1.1621.
- **CCCBDB citation spot-check (live fetch of cccbdb.nist.gov, NH₃):** rNH 1.012 Å, aHNH 106.67°, reference "1966Herzberg", structure type not stated on the page. This matches the new source line ("Herzberg 1966; yapı türü re/r0/rz CCCBDB sayfasında belirtilmemiş") exactly. The citation is real, not recalled.

### Honesty strings and fixed round-4 items
- `Deneysel bağ açısı (CCCBDB)` appears for the A4.1 molecules and is suppressed after an edit.
- BF₃ uses "Deneysel bağ açısı (gaz fazı)".
- `setCharge` on library water flips the origin to `idealized`; undo restores `source` and the Deneysel row.
- `cleanUp` on library ammonia makes it `idealized`. A file import edited by adding Cl makes it `idealized` with `importedEdited`.
- **Round-4 fixes verified:**
  - HoverTip (`HoverTip.tsx:36-37`) and Announcer (`Announcer.tsx:97-98`) now use the aromaticity-aware `bondInfo` name.
  - The overlap distance has 3 dp (`Inspector.tsx:137`).
  - The checklist #36 `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 0 hits.
  - Provenance now persists across reloads (`ms:prov:v1`).

## Blocking

### 1. [ui] Lone pairs: the UI still renders the domain count, so aniline/amide N shows "0" and furan O shows "1"
*(round-3 #6 and round-4 #1, still open; A4.2 MUST "LP = (valenceElectrons − charge − Σ bond orders)/2"; scientific inaccuracy)*

- The data model is fixed:
  - `properties.ts:74-82` adds `lonePairsTotal`, `lonePairsDelocalised` and a ready `lonePairsText` / `lonePairsTextEn` (`properties.ts:599-609`).
  - The probe gives: aniline N `lpTot=1 lpText="1 (π sistemine delokalize)"`; urea N2/N3 and caffeine N3/N4/N5 the same; furan-type O `lpText="2 (1 tanesi π sistemine delokalize)"`.
- **The UI never uses it.** `grep -rn "lonePairsText\|lonePairsTotal" src/ui` returns nothing.
- `Inspector.tsx:430` renders `{vsepr === 'ok' ? info.lonePairs : naText}`, and `info.lonePairs` is 0 for a conjugated N.
- **Repro:** Kütüphane → Anilin, click N. The card reads **"Ortaklanmamış elektron çifti: 0"**. The same happens on urea, caffeine N3/N4/N5, adenine, paracetamol and the penicillin amide N.
  - A hand-built furan O shows **1**, where A4.2 gives 2.
  - That O is also placed by `electronDomains` as SN 4 / LP 2 (`dom sn/lp` in the probe), while its card says SN 3 / LP 1. The second classification in `properties.ts:663-675` (furan O / thiophene S override at :669) survives.
- **Fix:** render `lang === 'en' ? info.lonePairsTextEn : info.lonePairsText` in that row. Keep `info.lonePairs` for the AXₙEₘ notation and the ideal angle. Add a test that renders or asserts the aniline N label.

### 2. [ui] A3.2 / A.5 provenance: the "moved by hand" flag is sticky and persisted, so pristine experimental coordinates get a false label
*(new this round; A.5 provenance rule 3; false honesty label)*

- `source.ts:103-112` sets `moved: true` on the first drag. Nothing clears it except loading a molecule with a different id (`source.ts:93-99`), and it is persisted to localStorage (`ms:prov:v1`).
- **Repro (probe `STICKY` / `DRAG`, store-driven):**
  1. Load Su from the library and drag one H. Origin is `moved` (correct).
  2. **Undo.** The coordinates are back to the exact CCCBDB geometry, but the origin is still `moved`. `experimentalAngle` now returns 104.478 again, because `edited` is false.
  3. Instead of undo, **load Su from the library again** directly over the dragged one (same id `lib-su`). Origin is still `moved`. localStorage holds `{"lib-su":{"moved":true}}`, so it survives a page reload.
  4. In both cases the atom card shows **"Modeldeki bağ açısı (ortalama) 104,5°"**. The tooltip says **"Atomlar elle taşındı: … ne yerleştirme sabiti ne ölçüm"**. Directly under it is **"Deneysel bağ açısı (CCCBDB) 104,5°"**. The header line says "Koordinatlar: NIST CCCBDB deneysel geometri (re) …" with no "düzenlendi" note.
  5. The same untouched experimental value is presented as hand-moved and as experimental at the same time.
- **Fix:** clear `moved` when the structure equals its baseline again. For library entries, run the `sameStructure(mol, entry.molecule)` check before `rec.moved` in `useGeometryOrigin`. For PubChem/imports, compare with the stored snap. Also delete the record on any `loadMolecule` (`loadNonce` change), not only on an id change.

### 3. [ui] The library dialog still lists Hill formulas
*(round-2 #9, round-3 #2, round-4 #3, unfixed; A2.1 MUST "conventional form is the primary formula whenever the composition matches a key")*

- `LibraryBody.tsx:16` builds `pretty = formula(entry.molecule, true)` (always Hill), and `:136` renders it.
- **Repro:** open Kütüphane. Amonyak shows **H₃N**, SO₂ **O₂S**, SF₆ **F₆S**, sülfürik asit **H₂O₄S**, fosforik asit **H₃O₄P**. The descriptions next to them begin "NH₃ —" and "SO₂ —".
- **Fix:** `conventionalFormula(entry.molecule, true)` for `pretty`. Keep the plain Hill string in the haystack.

### 4. [ui] The status bar still announces aromatic bonds as single or double bonds
*(round-4 #4, partially fixed)*

- The hover tooltip and the screen reader are fixed. `StatusBar.tsx:93` still builds the label with `['-', '=', '≡'][b.order - 1]` and ignores aromaticity.
- **Repro:** load Benzen and select two adjacent ring bonds. The status bar shows **"C=C"** for one and **"C-C"** for the other. Both are 1,397 Å, and the inspector calls both "Aromatik bağ (σ + delokalize π)".
- **Fix:** use `bondInfo(mol, b.id).label`. `properties.ts:836` already emits `C:C`.

### 5. [chem-core + chem-props] Nitro N⁺–O⁻: the new context rule creates two different "ideal" lengths for one bond, and the inspector contradicts the app's own geometry
*(new this round; A3.1 "one table" intent and B.12 bond-card reference; checklist #29 molecule; scientific inaccuracy)*

- `molecule.ts:348-364` `bondLengthFor` now gives an N⁺–O⁻ next to an N⁺=O the N=O length (1.21 Å). It is used by `fixBondLengths`, `idealizeAtom` and the force field (`geometry.ts:394, 545, 662`).
- `properties.ts:842` `BondInfo.idealLength` and `Inspector.tsx:521` `bondLengthSource` still use the order-1 N–O row: **1.40 Å, "Allen 1987"**.
- **Repro (probe `NITRO built` / `NITRO cleanUp`):** build nitromethane through the store (C, N on H, N charge +1, =O, O on H, delete H, O charge −1). All atoms are `ok`.
  - **Before clean-up:** the N⁺–O⁻ bond is placed at **1,400 Å** ("Modeldeki uzunluk (idealize)", placement constant). A real nitro N–O is about 1.22 Å, and both nitro N–O bonds are equal.
  - **After "Geometriyi düzenle":** the same bond is **1,210 Å**, while the bond card still says **"Referans tablosu 1,400 Å · Allen 1987 (yuvarlatılmış)"**.
- Allen 1987 tabulates nitro N–O at about 1.22 Å, so tagging the 1.40 single-bond row "Allen 1987" for this bond is a mis-attribution.
- **Fix:** make `BondInfo.idealLength` (and the row-source text) use `bondLengthFor`, with its own source note (e.g. "nitro grubu, rezonans: N=O satırı"). Make `setCharge` run the same idealisation as `growFrom`, so the bond is placed at the context length immediately. The alternative is to drop the rule and accept 1.40 consistently.

### 6. [ui + chem-props] A.6 "Mol kütlesi … do not mix" is still violated in user-visible text, and dead terminology keys remain
*(round-4 #5, unfixed; A.6 MUST-v1)*

- `i18n.ts:182` `set.about.computed.body`, rendered at `Dialogs.tsx:85`, says **"Molekül formülü (Hill sırası), molar kütle (IUPAC standart atom ağırlıkları)…"**. That uses the wrong mass term, and it names Hill as the formula, while the primary formula is now conventional.
- `library.ts:920` (kafein) says **"Molar kütlesi yaklaşık 194,19 g/mol'dür"**.
- The dead keys can come back unnoticed:
  - `mol.mass` / `mol.lip.mass` 'Molar kütle'
  - `mol.rings` 'Halka'
  - `mol.formula` 'Molekül formülü (Hill)'
  - `atom.valence` 'Kullanılan / izin verilen değerlik' (bare "değerlik", which A.6 forbids)
  - `atom.charge` 'Biçimsel yük' (vs 'Formal yük')
- **Fix:** reword the About body ("mol kütlesi", "kapalı formül; Hill sistemi ipucunda"). Fix the caffeine prose in place (the library header says `library.ts` is now edited directly). Delete the dead keys.

### 7. [ui] A2.3: the status-bar camera distance is still shown in Å with 2 decimals
*(round-4 #6 remainder; A2.3 MUST lists "status bar" distances at 3 dp)*

- `StatusBar.tsx:101` uses `fmtNum(lang, cam.distance, 2)` with the unit `{d} Å` (`i18n.ts:348`).
- **Fix:** use 3 dp, or drop the Å unit, since it is a camera parameter and not a molecular measurement.
- Low severity. It stays blocking only because the MUST text is literal.

## Improvements (non-blocking)

### Data model consistency
- **[chem-props] Aromaticity for caffeine:** the stored flags disagree with perception.
  - The `library.ts` header says rings with an exocyclic C=O are not flagged, and caffeine stores 5 aromatic bonds (the imidazole ring).
  - `perceiveAromaticity` also marks the pyrimidinedione ring, giving 10 aromatic bonds and 2 aromatic rings (probe `AROM-MISMATCH kafein`).
  - Effects:
    - The inspector, hover and announcer call those 5 ring bonds "Aromatik bağ (σ + delokalize π)", while the scene draws them as Kekulé single/double strands.
    - A MOL round trip changes the stored flags.
    - The aromatic PEOE parameters change.
  - Pick one rule and apply it in both places. Whether the xanthine 6-ring is "aromatic" is toolkit-dependent, so stating the rule matters more than the choice.
- **[ui] Whole-molecule `idealized`:** one edit on a PubChem or CCCBDB molecule relabels every angle and length "Modeldeki … (idealize) — düzenleyicinin yerleştirme sabiti, ölçüm değil", including atoms far from the edit whose coordinates are still the source's. A per-atom origin (edited atoms and their neighbours) would be accurate.
- **[scene] Hover valence:** `HoverTip.tsx:25` uses `Math.max(...allowedValences(a))`, so H₂S S reads "2/6 bağ" and PH₃ P "3/5 bağ". The inspector shows `targetValence` ("2/2", "3/3"), and B.4's example is "2/2 bağ". Use the same `targetValence` value in both.
- **[chem-props] Hypervalence wording:** `properties.ts:1142-1145` and the `issues` strings still say "yalnızca O veya F komşusu varsa geçerli", while the rule (`molecule.ts:110`) admits Cl/Br/I. It is not rendered (the UI uses `issueDetails`), but update the text and amend SPEC A1.3 as the code comment requests.

### VSEPR and descriptions
- **[ui] SF₆ / PCl₅:** the data gives "Düzgün sekizyüzlü" / "Üçgen çift piramit", but the card shows `hesaplanamadı` (`Inspector.tsx:369`, `sn > 4 → 'na'`), next to a description that says "düzgün sekizyüzlü". This is MUST-compliant (A4.2). A4.3 (SHOULD) would remove the contradiction.
- **[chem-props]** The cyclohexane description says "yaklaşık 111°" where the coordinates give 111.6°. Use "≈112°".

### Gasteiger
- **[chem-props]** In nitromethane the two resonance-equivalent O get +0.02 (=O) and −0.51 (O⁻). H₃O⁺ O gets −0.46. These are known PEOE artefacts on formally charged centres. The values are badged Tahmini; a tooltip line ("formal yüklü merkezlerde en az güvenilir") would help.

### io
- **[chem-props]** A Molfile bond type 4 outside a ring (C–C only) is silently imported as a C=C double bond. A warning or rejection would be more honest.

### Comments
- **[ui]** `ElementPicker.tsx:7` comment still says "CPK swatches". It is a comment only; align it with A1.6 wording.

### Tests
- **[tests]** No oracle exists for blockers 1–5:
  - the rendered LP label of aniline N
  - the `LibraryBody` formula for ammonia
  - the status-bar label of an aromatic bond
  - the nitro reference length vs placed or relaxed length
  - `moved` reset after undo or reload
- Also worth asserting: the XYZ all-library round trip with bond orders, and the caffeine stored-vs-perceived aromaticity.

## Score rationale (80/100)

The data model is now strong. I verified all of these myself:
- constants, both masses and the composition
- Hill and conventional formulas, and DoU gating
- valence rules, hypervalent auto-H and io rejection
- the bond table, and every store-built geometry (CO₂, H₂C=O, ethane, propene, propyne, water, H₃O⁺, NH₃, the changeElement series)
- library experimental geometry, with a live-confirmed CCCBDB citation
- component-wide Gasteiger

What a student still sees on screen:
- "0 ortaklanmamış elektron çifti" on aniline-type N, even though the correct label exists in `AtomInfo`
- a false "atoms moved by hand" label on pristine experimental coordinates, persisted across reloads
- Hill formulas in the library list
- C=C / C-C for benzene bonds in the status bar
- a nitro N–O bond whose reference row (1,400 Å, Allen) contradicts the app's own relaxed geometry (1,210 Å)
- "molar kütle" in the About dialog and in the caffeine description

Blockers 1, 3 and 4 are one-line UI changes. Blocker 2 is a small condition in `source.ts`. Blocker 5 needs a decision on whether to keep the nitro rule.
