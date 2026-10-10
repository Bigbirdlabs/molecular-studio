# Round 2 critique: acceptance checklist audit (fresh-context critic)

Artifact: D:\molecular-studio @ 6a002eb (clean tree). Judged against SPEC.md (original + ENHANCEMENT ADDENDUM v1, "Acceptance checklist (MUST-v1)" items 1-36) and SPEC §10 items 1-10. Source was not edited.

## How it was checked
- Run once each, logs in `gauntlet/logs/`: `critic-r2-tsc.txt` (tsc exit 0), `critic-r2-vitest.txt` (9 files / 402 tests pass), `critic-r2-build.txt` (vite build exit 0), `critic-r2-hookbuild.txt` (`vite build --mode hook`, exit 0).
- `vite preview --mode hook --port 4193` (hook bundle, `window.__MOLECULAR_SCENE__`) driven with Python Playwright + installed Chrome (swiftshader), URLs with `?nointro`. One `vite --port 4194` dev run only for the Xx injection (item 34). Both servers killed afterwards.
- Scenario output: `gauntlet/logs/critic-r2-s1.txt` … `critic-r2-s8.txt`, raw JSON + screenshots in `gauntlet/scratch/critic-r2/`. Orbit re-measurement: `gauntlet/logs/critic-r2-orbit-p95.txt`.
- Code reading of src/chem, src/store.ts, src/scene, src/ui, src/index.css.

## Score
Checklist MUST-v1: **26 / 36 pass**. SPEC §10: **10 / 10 pass**. Combined **36 / 46 = 78 %**. Verdict: **FAIL** (10 checklist items fail).

Big improvement over round 1 (43 %): formatter digits, elements/mono/conventional formula, A2.2 notes, Lipinski qualifier, two-tone shells, hover tooltip, HUD, context-loss overlay, zoom clamp, save indicator, tokens test and the full A.7 oracle set are all in. What is left is mostly UI wiring of data that already exists (coordinate-source lines, reference-row tags, PubChem attribution, isotope message) plus a few layout/focus defects.

---

## Acceptance checklist (MUST-v1), item by item

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | tsc exit 0, vite build exit 0, vitest 402/402. `tests/science.test.ts` covers A.7 #1-#14 (formatter strings `16,04`, `74,87`, `el('Fe')` throws, `isKnownElement('__proto__')`, element snapshot incl. `mono`, round trip); `tests/tokens.test.ts`, `tests/i18n.test.ts` present and green. |
| 2 | PASS | Fresh launch: methane, ballstick, bbox centre (-0.027, -0.040) NDC, inspector `CH4 · 16,04 g/mol`, status `Top-Çubuk · 5 atom · 4 bağ` (01-launch.png, s1). |
| 3 | PASS | Stored empty molecule -> methane; stored `Se` molecule -> methane + toast `Desteklenmeyen element: Se. Desteklenen: H, B, C, …` with undo disabled; `?m=metan` launches with Undo `aria-disabled=true` (s3). |
| 4 | PASS | Click C: Z 6, `12,011 u`, `0,000 / 0,000 / 0,000`, `AX₄`, `Düzgün dörtyüzlü`, `sp³`, LP 0 (03-click-C.png). |
| 5 | PASS | DOM `1,090 Å`, `109,5°`, `φ = -120,0°`, footnote `Model koordinatlarından ölçülmüştür`; scene labels `1,090 Å`, `109,5°`, `-120,0°` with decimal comma (04/05 png). |
| 6 | PASS | A + O + click H: `CH₄O · 32,04 g/mol`; measured C–O `1,430 Å` (critic-r2-s8.txt); one Ctrl+Z -> CH₄ and Undo disabled again (exactly one step). |
| 7 | PASS | Atom tool 30 px drag from empty space: atoms 5 -> 5, Undo stays disabled. |
| 8 | PASS | Radii: ballstick C 0.459/H 0.227, spacefill 1.70/1.20 (eased), stick 0.142, wireframe points; 20 switches: geometries 21->21, textures 6->6, camera identical (s2). |
| 9 | PASS | `tests/scene.test.ts:189` ethylene strands in plane z=0, offset from data (bondLayout). |
| 10 | PASS | `moleculeRig.ts:69-85` separate two-tone shell (surface-0 rim + accent rim), hover shell at 0.45; atom colour unchanged in 02/03 png; idle frames 0. |
| 11 | PASS | `render.frame` 41 -> 41 over 5 s. |
| 12 | PASS (note) | Calls methane 6 vs tristearin 6; 20 load-undo-new cycles geometries 21->21, textures 6->6. Critic re-measured orbit p95 = **13.80 ms** on the current build (`critic-r2-orbit-p95.txt`). The developer's log `r1-build-orbit-p95.txt` is stale (pre-round-1 build: calls 3, geometries 17) and its harness calls the removed `window.__studio`, so it can no longer run. |
| 13 | PASS | Atom drag with a settled camera: `camera.position` bit-identical before/after; atom moved. |
| 14 | PASS | Zero console warnings/errors/pageerrors through the B.10 script (s1, s2, s5). |
| 15 | **FAIL** | Fe/Se XYZ import: toast `Dosyada desteklenmeyen element var: Fe.` — no `Desteklenen: H, B, C, …` list (A1.1 message). `D` import: toast **`Dosya okunamadı: geçerli bir MOL, SDF veya XYZ dosyası seçin.`** — the parser throws `unsupportedIsotope` (`io.ts:67`) but `ui/actions.ts:69-74` has no branch for it, so it falls into `toast.importFailed`; spec requires `Desteklenmeyen izotop: D`. Molecule stays CH₄ (ok). |
| 16 | **FAIL** | Inspector: ammonia `NH3` with title `Hill sistemi: H₃N`, SO₂ `SO2` (Hill O₂S), BF₃ ok. But the Library dialog lists ammonia as **`H3N`** and SO₂ as **`O2S`** (`LibraryBody.tsx:17` uses `formula()` = Hill, not `conventionalFormula()`); A2.1: the conventional form is the primary formula wherever the composition matches a key. |
| 17 | PASS | Bare C₂: `Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir` + `Hidrojenleri tamamla` beside `24,02 g/mol`. 5-bond N: `Geçersiz değerlik: N (5/3)`, atom card `N atomu en fazla 3 bağ yapabilir (şu an 5)`, danger ring (23-n5.png). |
| 18 | PASS | H₂O 0.9578 Å / 104.48°; NH₃ 1.0120 Å / 106.67°; CO₂ 1.1621 Å / 180°; C₂H₄ 1.339 / 1.086 / 117.60°. |
| 19 | PASS | `16,0313 u`; H₂SO₄ has no DoU row; Lipinski section shows `3 / 4 kural değerlendirildi (logP hesaplanmıyor)` and only rule rows. |
| 20 | PASS | `Tahmini` on aromatic ring, H-bond counts, functional groups, VSEPR/hybrid/LP/steric/ideal angle, Gasteiger; bond polarity has `kural (yaklaşık)`; no dipole/TPSA/pKa/energy/overall verdict in kafein, aspirin, metan (`logP` appears only inside the "hesaplanmıyor" qualifier). |
| 21 | PASS | No "optimi" in UI text; action `Geometriyi düzenle (basit kuvvet alanı, yaklaşık)`; toast `Geometri düzenlendi — idealize geometri (enerji minimizasyonu değil)`. |
| 22 | **FAIL** | Undo/Redo `aria-disabled` + dimmed (ok), no `0 g/mol` (ok). But the viewport empty state is only a non-interactive sentence (`ViewportHost.tsx:68-79`, `pointer-events-none`); the two buttons live in the inspector (24-empty.png), which is closed by default on tablet portrait and mobile, so there the empty workspace has no buttons. B.9 copy also differs (`Tuval boş` vs `Çalışma alanı boş` / `Bir element seçip tıklayın veya kütüphaneden molekül açın`). |
| 23 | PASS | `loseContext()` -> `3B görünüm yeniden başlatılıyor…`; after 3 s `Yeniden yükle`; `restoreContext()` -> identical atoms. With `--disable-webgl` the inspector works. (B.9 tool-disable is a separate blocker below.) |
| 24 | PASS | `reduced_motion=reduce`: Reset 2 frames and back to default pose, Fit 2 frames, Clean-up 3 frames then static (first frame already moved all 9 atoms); auto-rotate item `aria-disabled=true`. |
| 25 | **FAIL** | No horizontal overflow at all 12 TR/EN viewports (scrollWidth == innerWidth). But on 360×740 and 390×844 **no sheet is rendered at launch** (30-390x844-tr.png); `App.tsx:137` sets `setInspectorOpen(false)` for mobile ("phones start with the sheet closed"), contrary to D.8/D.10 "mobile launches with the sheet at peek" and "never dismissed below peek". |
| 26 | **FAIL** | Tab order header -> rail (roving `role="toolbar"`) -> canvas -> HUD -> inspector is correct, and `V R P Z A B D M E` switch tools; tooltip `Seç V` matches the `?` sheet. But the **canvas has no visible focus ring**: computed `outline-style: none` while `:focus-visible` is true (09-canvas-focus.png). `index.css:138` `#viewport canvas { outline: none }` (id specificity) beats `Viewport.tsx:49` `[data-viewport="3d"] canvas:focus-visible{outline:2px solid …}`. D.9 #15 / B.4. |
| 27 | PASS | rg returns only the `.viewport-bg` rule (its comment line 132 and the gradient line 134); no hex in `src/ui/**/*.tsx`; `LucideProvider strokeWidth={1.75}` + 1.75 in custom icons. |
| 28 | PASS | Decimal commas in inspector, status bar (`6,34 Å`), scene labels, library prose; Turkish glyphs render; `<html lang>` follows language. No upper-casing surface exists (vacuous). |
| 29 | PASS | C -> Si via `Elementi değiştir`: `SiH₄`, one Ctrl+Z restores CH₄ with Undo disabled; charge stepper caps at +2, each step one undo; stored nitromethane N⁺(=O)O⁻: `Değerlik sorunu yok`. |
| 30 | **FAIL** | Bond card: reference length row `Referans tablosu 1,090 Å` has no row source tag (B.12/A3.1); `bondLengthSource()` exists in `molecule.ts:303` but nothing in `src/ui` calls it. Molecule card: no coordinate-source line for library molecules and no `Kaynak: PubChem` (B.12), although `LibraryEntry.coordSourceText` exists (`library.ts:41`). Bond title is `C-H` with an ASCII hyphen. |
| 31 | **FAIL** | Library: 46 entries, 7 categories, TR/EN names, diacritic search ("benzen" -> 6), load = one undo. But no entry shows its coordinate-source line: `LibraryBody.tsx:86-99` renders name, formula, description, category, atom count only. |
| 32 | **FAIL** | MOL (476 B), XYZ (218 B), PNG (439 kB) download; round trip test passes; import errors localized and molecule unchanged; offline -> PubChem menu item `aria-disabled` with reason `Çevrimdışı: PubChem kullanılamıyor`. But a loaded PubChem molecule is **not** attributed `Kaynak: PubChem` anywhere (the string only appears as static text inside the search dialog, `Dialogs.tsx:204`). |
| 33 | PASS | Settings: language, motion (system/reduce/full), Oto-H, shortcuts, about notes. View: style radios, H/labels/charges/auto-rotate, reset. No duplicated toggle. |
| 34 | **FAIL** | Inspector half passes: `useStudio.setState` with an `Xx` atom shows `Bilgi paneli açılamadı … Yeniden yükle`, rest of UI usable. Viewport half fails: no boundary message; the stale molecule stays on screen while **315 uncaught `UnknownElementError`s** fire within ~1 s of mouse moves, from `allowedValences` <- `SceneModel.sync` (`sceneModel.ts:105`) <- `CameraRig.tsx:339` useFrame (critic-r2-s6b.txt). Errors thrown in the R3F frame loop bypass React error boundaries. |
| 35 | PASS | Tristearin wheel zoom stops at 1.50 Å from the target; save indicator `Tarayıcıda kaydedildi` after Ctrl+S, no spinner (`TopBar.tsx:16`). |
| 36 | **FAIL** | i18n parity test passes, but `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 1 hit: `src/ui/LibraryBody.tsx:11` regex literal `/ı/g` (write `\u0131`). |

## SPEC §10 (original delivery requirements)

| # | Result | Evidence |
|---|---|---|
| 1 Complete workspace | PASS | Top bar, rail, viewport with HUD, inspector, status bar. |
| 2 Interactive viewport | PASS | R3F canvas, demand frameloop, orbit/zoom/pan/drag. |
| 3 Valid 3D molecule | PASS | methane 1.090 Å / 109.47°. |
| 4 Ball-and-stick | PASS | default. |
| 5 Additional mode | PASS | spacefill / stick / wireframe change geometry. |
| 6 Orbit/zoom/pan/reset | PASS | zoom 1.5 Å…12× fit, reset returns to default pose. |
| 7 Selection + context | PASS | atom, bond, multi, measure cards. |
| 8 Data model | PASS | explicit atoms/bonds with ids, `validateMolecule`. |
| 9 Formula + mass | PASS | Hill + conventional, IUPAC mass, monoisotopic. |
| 10 Responsive, polished | PASS | distinct desktop/tablet/mobile, no overflow (sheet defect under item 25). |

---

## Other MUST violations found on the way (blocking)

1. **B.9 WebGL unavailable**: with `--disable-webgl` the edit tools (Atom/Bond/Sil/clean-up/H±) are all enabled (`aria-disabled` null) — spec: "edit tools disabled with that reason" (critic-r2-s5.txt `noWebgl`). Message copy also differs from `Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor`.
2. **D.8 mobile bottom bar**: dock is the full 8-tool scroller (Seç, Döndür, Kaydır, Yakınlaştır, Atom, Bağ, Sil, Ölç) + More (`Toolbar.tsx:174`); spec is 6 buttons Select, Atom, Bond, Delete, Measure, More with Rotate/Pan/Zoom under More. At 390 px `Ölç` is scrolled off-screen (30-390x844-tr.png).
3. **B.2 contextual options**: Atom options have no Oto-H switch; Bond options have no `İlk atomu seçin` / `İkinci atomu seçin · Esc iptal` hint; Measure has no options at all (`ToolOptions` returns null for measure, `Toolbar.tsx:200`), so on tablet portrait/mobile (inspector closed) there is no DOM readout; status bar never shows "Mesafe 1,090 Å · Açı 109,5°" (B.6).
4. **Status-bar camera state is wrong at launch**: fresh `?nointro` at 1366×768 reads `Kamera: … · özel görünüm` although the camera is at the default pose (01-launch.png). `StatusBar.tsx:10-27` flips to "custom" on any distance update more than 1300 ms after mount, so a slow initial fit counts as a user move (SPEC §8 "UI states that do not correspond to actual application state").
5. **D.8 bottom sheet**: "never dismissed below peek" — the sheet can be fully closed and starts closed (same root cause as item 25).

## Improvements (non-blocking)
- 31 reference-length rows are tagged `T: typical reference value (row source not verified)` (`molecule.ts:259`); A3.1 wants every row tagged Allen 1987 or CCCBDB. Honest, but re-verify and retag before showing the tag in the bond card.
- D.7 duration tokens (`--dur-instant/fast/base/slow`) are not defined in `index.css`.
- Context restore emits ~30 Chrome warnings `WebGL: INVALID_OPERATION: delete: object does not belong to this context` (s4 console) — avoidable console noise (SPEC §8).
- Two parallel context-loss overlays (`ViewportHost.tsx:192` and `Viewport.tsx` own overlay); B.9 says one flow.
- §E6 internal names not migrated: toast code `geometryOptimized`, comment `store.ts:127` "animated geometry optimisation".
- Orbit harness `gauntlet/logs/r1-build-orbit-p95.mjs` depends on removed `window.__studio`; replace with the View-menu auto-rotate toggle so #12 can be re-logged by the team.
- Composition bars read as a decorative chart (D.9 #6); `x/y/z` coordinate captions are lowercase 11 px (D.3); `BondOrderGlyph` uses an 18×16 viewBox (D.5 24-unit grid).
- In a 4-atom measure chain the angle label disappears (only arc + dihedral label remain).
- Settings "about" text says "molar kütle" (A.6 term is "Mol kütlesi").

## Priority fix order
1. `actions.ts` import errors: handle `unsupportedIsotope` -> `Desteklenmeyen izotop: D`, append `Desteklenen: …` to the element message (item 15).
2. Render existing data: `coordSourceText(En)` in LibraryBody rows and the molecule card, `bondLengthSource()` in the bond card, a PubChem source flag on loaded molecules -> `Kaynak: PubChem`, conventional formula in library rows (items 16, 30, 31, 32).
3. Mobile: start the sheet at peek and keep it ≥ peek; 6-button dock; viewport empty-state buttons (items 22, 25, blockers 2, 5).
4. Focus ring: drop `outline: none` from `#viewport canvas` or raise the focus-visible selector specificity (item 26).
5. Scene crash containment: catch in `SceneModel.sync`/useFrame and surface `ViewError` (item 34); `\u0131` in LibraryBody (item 36); no-WebGL tool disable; measure/atom/bond tool options; status-bar camera state.
