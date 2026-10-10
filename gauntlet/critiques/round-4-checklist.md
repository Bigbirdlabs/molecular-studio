# Round 4 critique: acceptance checklist audit (fresh-context critic)

Artifact: D:\molecular-studio, working tree on top of 190f5b3 with 24 modified files (the uncommitted round-3 fixes: chem, scene, store, ui; plus untracked `src/ui/inspector/longPress.ts`). Judged against SPEC.md (the original spec plus the ENHANCEMENT ADDENDUM v1 "Acceptance checklist (MUST-v1)", items 1-36) and SPEC §10, items 1-10. I did not edit any source file.

## How it was checked
- Gates, each run once on this tree: `npx tsc --noEmit` (exit 0, `gauntlet/logs/critic-r4-cl-tsc.txt`), `npx vitest run` (9 files, 402/402, `critic-r4-cl-vitest.txt`), and `npx vite build --mode hook` into `gauntlet/scratch/critic-r4-cl/dist-hook` (exit 0, `critic-r4-cl-hookbuild.txt`). `dist/` (23:45) was already newer than every file in `src/`.
- Runtime: `vite preview --port 4193` serving the hook bundle (with `window.__MOLECULAR_SCENE__`). It was driven by Python Playwright with the installed Chrome. The scenarios used swiftshader. The console check (s8) and the orbit timing ran on the real GPU (RTX 3060, ANGLE D3D11). All URLs had `?nointro`. One `vite --port 4194` dev server ran only for the Xx injection (item 34). Both servers were killed afterwards; ports 4193 and 4194 are free.
- Scenario scripts and PNGs are in `gauntlet/scratch/critic-r4-cl/` (s1-s8, s3c, s4n). Their outputs are copied to `gauntlet/logs/critic-r4-cl-s*.txt`. The orbit p95 log is `gauntlet/logs/critic-r4-cl-orbit-p95.txt`.

## Score
- Checklist MUST-v1: **32 / 36 pass**.
- SPEC §10: **10 / 10 pass**.
- Combined: **42 / 46 = 91 %**.
- Verdict: **FAIL**. Four checklist items fail: 16, 22, 25 and 36.

Round 3 scored 87 % (40/46). These round-3 failures are now fixed:
- **12:** the tristearin orbit p95 is 7.20 and 7.10 ms on the real GPU with vsync.
- **14:** zero console messages on the real GPU, because `checkShaderErrors` is off outside dev `?shaderlog`.
- **23:** the restart overlay, the 3 s `Yeniden yükle` and the identical restore all work.

Still open from rounds 2 and 3:
- the library list shows Hill formulas (16);
- the viewport empty state has no buttons (22);
- the mobile sheet starts closed (25).

Newly failing:
- 36, because a new comment in `Inspector.tsx` makes the mandated `rg` return a hit. The fix is trivial.

---

## Acceptance checklist (MUST-v1), item by item

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | tsc exit 0, vitest 402/402, vite build exit 0. `tests/science.test.ts`, `tests/tokens.test.ts` and `tests/i18n.test.ts` are green. They live in `tests/` (vite.config `include: ['tests/**/*.test.ts']`), not in the paths the addendum names; the existing layout wins on implementation. |
| 2 | PASS | 1366x768 shows ball-and-stick with bbox centre (-0.011, -0.016). All 4 H are visible (`30-1366x768-tr.png`). The inspector reads `Metan / CH₄ / Mol kütlesi 16,04 g/mol`. The footer reads `Top-Çubuk · 5 atom · 4 bağ · Seçim yok` (s1). |
| 3 | PASS | A stored empty molecule launches methane. A stored Se molecule launches methane and toasts `Desteklenmeyen element: Se. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`. After a library load (Undo enabled), `?m=metan` gives methane with Undo disabled (s2). |
| 4 | PASS | Clicking C shows `Atom numarası 6`, `Atom kütlesi 12,011 u`, `X0,000 Y0,000 Z0,000`, `sp³`, `Düzgün dörtyüzlü`, `AX₄` and `Ortaklanmamış elektron çifti 0` (s1, `03-click-C.png`). |
| 5 | PASS | DOM readouts: `Mesafe 1,090 Å`, `Bağ açısı … 109,5°`, `φ = -120,0°`, plus `Model koordinatlarından ölçülmüştür`. The scene shows labels `1,090 Å`, the arc label `109,5°` and the dihedral label `-120,0°` (`04-measure-angle.png`, `05-measure-dihedral.png`). |
| 6 | PASS | `A`, `O`, click H gives `CH₄O · 32,04 g/mol`. C–O from model coordinates is 1.4300 Å once the grow animation settles (~1.5 s; s1b). Ctrl+Z returns CH₄ 16,04 and Undo is disabled again, so it was exactly one step. |
| 7 | PASS | Atom tool, 30 px drag from empty space: atoms 5 → 5, Undo disabled before and after (s2). |
| 8 | PASS | Radii C/H per mode: ballstick 0.459/0.227, spacefill 1.688/1.188, stick 0.166/0.158, wireframe `point`. After 20 switches from a settled camera, the position is identical and geometries/textures stay 21/6 (s3: `8 cam same True`). |
| 9 | PASS | `tests/scene.test.ts:189` asserts that the ethylene strands lie in the substituent plane. The offset comes from the data (`bondLayout.ts`), not the camera. |
| 10 | PASS | The centre pixel of C is (144,144,144) at rest, hovered and selected. `render.frame` stays 169 → 169 over 3 s while selected, so nothing pulses (s3; the shell is visible in `09-selC.png`). |
| 11 | PASS | Idle 5 s: `render.frame` 42 → 42 (s2). |
| 12 | PASS | Draw calls: methane 7 vs tristearin 6. Geometries/textures stay 21/6 over 20 load/undo/new cycles (s2). Tristearin auto-rotate orbit, 1920x1080, RTX 3060, vsync, rAF timestamps: **p95 7.20 ms**, then **7.10 ms** on a second run (`gauntlet/logs/critic-r4-cl-orbit-p95.txt`). Note: the team itself has not logged a measurement since `r2-build-orbit-p95.txt` (which recorded FAIL); the passing log is this critic's. |
| 13 | PASS | With a settled camera, a select-tool drag moves H by 0.351 Å and `camera.position` stays bit-identical. One Ctrl+Z disables Undo again (s3). |
| 14 | PASS | Real GPU (RTX 3060 / ANGLE D3D11) B.10 script: 0 console messages (s8). Swiftshader runs s1-s6: 0 messages. The round-3 X4122 shader warning is gone: `Viewport.tsx` sets `gl.debug.checkShaderErrors` only in dev with `?shaderlog`. |
| 15 | PASS | `fe.xyz` gives `Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`. `se.xyz` gives the same for Se. `d.xyz` gives `Desteklenmeyen izotop: D`. Methane is unchanged after each (s3). |
| 16 | **FAIL** | The inspector is correct: ammonia `NH₃` with title `Hill sistemi: H₃N`, SO₂ `SO₂` (title `O₂S`), BF₃ `BF₃`. **The Library dialog still lists ammonia as `H3N` and sulfur dioxide as `O2S`.** s3c rows: `Amonyak / H3N / NH₃ — …` and `Kükürt dioksit / O2S / SO₂ — …`. Cause: `src/ui/LibraryBody.tsx:16` `const pretty = formula(entry.molecule, true)` (strict Hill) instead of `conventionalFormula` (`molecule.ts:174`). A2.1: "The conventional form is the primary formula whenever the current composition matches a key." LibraryBody.tsx is untouched since round 2. This is the third consecutive round with this finding. |
| 17 | PASS | Bare C₂ shows `Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir` + `Hidrojenleri tamamla` beside `24,02 g/mol`. 5-bond neutral N shows `Geçersiz bağ sayısı: N (5/3)`, the card shows `N atomu en fazla 3 bağ yapabilir (şu an 5)`, and the N has a red danger ring (`23-n5-tool-v.png`). Note: A2.2's literal text is `Geçersiz değerlik: …`. `i18n.ts:455` deliberately uses `Geçersiz bağ sayısı` to honour A.6 "never bare değerlik", which is a defensible resolution of a spec conflict. |
| 18 | PASS | From snapshot model coordinates: H₂O 0.9578 Å / 104.48°, NH₃ 1.012 Å / 106.67°, CO₂ 1.1621 Å / 180.0° (s3c). The source lines honestly state CCCBDB plus the structure-type caveat. |
| 19 | PASS | CH₄ `16,0313 u`. H₂SO₄ has no `Doymamışlık` row. Lipinski reads `3 / 4 kural değerlendirildi (logP hesaplanmıyor)` with only the three rule rows and no verdict (s3c). |
| 20 | PASS | The `Tahmini` badge is on aromatic ring, H-bond donor/acceptor, functional groups, the VSEPR group, Gasteiger, polarity and aromatic-bond rows. Reference, calculated and measured rows carry tooltips only (s5 titles: `Referans tablosu (Pauling)`, `Molekül grafiğinden hesaplandı`, …). No dipole/logP/TPSA/pKa/energy value or Lipinski verdict appears. |
| 21 | PASS | No i18n value contains optimi*/optimizasyon. The action is `Geometriyi düzenle (basit kuvvet alanı, yaklaşık)`; the toast is `Geometri düzenlendi — idealize geometri (enerji minimizasyonu değil)` (s3c). |
| 22 | **FAIL** | Undo/Redo are `aria-disabled` when empty and there is no `0 g/mol` (ok). **The viewport empty state has no buttons.** `src/ui/ViewportHost.tsx:53-63` `EmptyHint` is a single `pointer-events-none` `<p>`: "Başlamak için Atom Ekle aracını seçin veya kütüphaneden bir molekül açın". The only viewport buttons when empty are the style radios plus disabled zoom/fit (s4, s6b, s6c). The two real buttons exist only in the inspector, which is not shown at 390x844 (sheet False) or 768x1024 portrait (aside False), so there the empty workspace offers no way forward. B.9 also requires the copy `Çalışma alanı boş` / `Bir element seçip tıklayın veya kütüphaneden molekül açın` in the viewport. ViewportHost.tsx is untouched since round 2. This is the third consecutive round. |
| 23 | PASS | `loseContext()` shows `3B görünüm yeniden başlatılıyor…` after 1 s, plus `Yeniden yükle` after 4 s. `restoreContext()` brings back 5 atoms with identical coordinates and geometries 21 (s5). With `--disable-webgl` the inspector still renders and works (s6 `NW`). |
| 24 | PASS | Reduced motion: Reset +2 frames to the exact default pose, Fit +2 frames, Clean-up +2 frames with changed geometry and one undo entry. The auto-rotate item is `aria-disabled` with `Hareket azaltma açıkken kullanılamaz` (s5). |
| 25 | **FAIL** | No horizontal overflow at all 12 TR/EN standard viewports (`scrollWidth == innerWidth`, s6). **Mobile launches without any sheet:** at 360x740 and 390x844 there is no `[role=complementary]` (`30-390x844-tr.png`). The sheet appears only after a tap selects an atom. Cause: `src/App.tsx:141` `setInspectorOpen(layout === 'desktop' ? … : layout === 'tablet' ? landscape : false)`, and `BottomSheet` unmounts when `open` is false. This contradicts D.8 (sheet "never dismissed below peek"), D.10 ("sheet at peek on mobile") and item 25 ("mobile launches with the sheet at peek"). App.tsx is untouched since round 2. This is the third consecutive round. |
| 26 | PASS | Tab order: header (name, undo, redo, Kütüphane, Dosya, Görünüm, Ayarlar, Info) → rail (`Seç`, one roving stop) → canvas → HUD → inspector. Each stop has a 2 px accent outline, and the canvas matches `:focus-visible` (s5, `26-tooltip.png`). `V R P Z A B D M E` select the expected tools. The tooltip reads `Seç V`; the `?` sheet lists the same keys from `TOOL_KEYS`. Esc closes the dialog. |
| 27 | PASS | `rg -n "gradient\|backdrop-…\|#000\b\|#fff\b\|shadow-\[0_0" src/ui src/index.css` finds only `index.css:147` (comment) and `:149` (the `.viewport-bg` rule). There are no hex literals in `src/ui/**/*.tsx`. Every `strokeWidth` is 1.75, and `App.tsx` has `LucideProvider strokeWidth={1.75}`. |
| 28 | PASS (note) | Decimal commas everywhere observed in TR: inspector, scene labels, status `10,10 Å`, composition `74,87 %`. `İ ı Ş Ğ` render correctly (`İdealize`, `Doymamışlık`, `Ağır`), and `<html lang>` follows the language (s6). "İYOT" is satisfied only vacuously: no code path upper-cases UI text and no test guards it. Related: `io.ts:630` capitalises PubChem names with `toUpperCase()`, so "izopropil…" would become "I…" under TR. |
| 29 | PASS | C → Si gives `SiH₄` with one undo entry. The charge stepper adds one undo entry per step, is clamped to +2/−2, and is `aria-disabled` at the limit (s4). Nitromethane imported neutral, then N +1 and O −1 via the stepper: every atom is `Tamam` and the card reads `Değerlik sorunu yok`. One Ctrl+Z reverts only the last charge (s4n). |
| 30 | PASS | The bond card shows `C–H`, `Tekli bağ (σ)`, atoms C #1 / H #5, length `1,090 Å` (labelled `Modeldeki uzunluk (idealize)` for the editor-built methane), `Referans tablosu 1,090 Å` with row tag `Allen 1987 (yuvarlatılmış)`, ΔEN `0,35`, polarity + Tahmini, σ/π, ring and aromatic. The molecule card shows the rows required by B.12. There is no "—", `'s'` or placeholder row (s4, s5). |
| 31 | PASS | 46 entries in 7 categories (`Hidrokarbonlar · 7` … `İlaçlar ve Alkaloitler · 7`). Each row has a `Koordinatlar: …` source line. Search: "benzen" gives 6 hits; "kukurt" finds `Kükürt dioksit`, `Kükürt heksaflorür`, `Sülfürik asit`. A load is one undo entry (s2, s3c). The row formula is item 16's defect. |
| 32 | PASS | `Benzen.mol` 1071 B, `Benzen.xyz` 514 B and `Benzen.png` 378 951 B downloaded. The A.7 #14 round trip is in vitest. Import errors are localized and the molecule is unchanged (item 15). Offline, the PubChem item is `aria-disabled` with title `Çevrimdışı: PubChem kullanılamıyor`. A live "ethanol" load shows `Kaynak: PubChem` (s4). |
| 33 | PASS | Settings holds language, motion, Oto-H, the shortcut link and the about notes. View holds style, display toggles, auto-rotate and reset. No toggle is duplicated and no placeholders exist (unchanged since round 3; `menus.tsx`, `Dialogs.tsx`). |
| 34 | PASS | Dev-server injection of `Xx` gives the viewport `3B görünüm başlatılamadı … Yeniden yükle` and the inspector `Bilgi paneli açılamadı … Yeniden yükle`. The top bar and rail stay usable. There are 4 console errors, all crash logs (s7). |
| 35 | PASS | Tristearin wheel zoom clamps at `camera.distance = 1.5` (near 0.12). After Ctrl+S the status reads `Tarayıcıda kaydedildi` (s2), and there is no spinner. |
| 36 | **FAIL** | The i18n parity tests are green. **`rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 1 hit, not 0:** `src/ui/Inspector.tsx:351` `// The parenthesis in the Turkish name is a mandated qualifier (A4.2: "(konjugasyon, tahmini)", "(açısal)"), not a gloss…`. This comment is new this round (round 3 had 0 hits). It is not a user-visible string, but the acceptance check is the literal `rg` result. Fix: write the comment without Turkish letters (e.g. `"(acisal)"`) or move it out of `.tsx`. |

---

## SPEC §10 (original delivery requirements)

| # | Result | Evidence |
|---|---|---|
| 1 Complete workspace | PASS | Top bar, rail, viewport + HUD, inspector and status bar (`30-1366x768-tr.png`). |
| 2 Interactive Three.js viewport | PASS | R3F canvas with demand frameloop. Orbit, zoom and drag were verified (s2, s3). |
| 3 Valid 3D molecule | PASS | Methane C–H 1.090 Å, H–C–H 109.47° (oracle 6). Library H₂O/NH₃/CO₂ match CCCBDB (item 18). |
| 4 Ball-and-stick | PASS | Launch default (item 2). |
| 5 Additional mode | PASS | Space-filling, stick and wireframe, each with distinct radii (item 8). |
| 6 Orbit/zoom/pan/reset | PASS | Orbit drag, wheel zoom clamp 1.5 Å, Fit and Reset (items 7, 24, 35). |
| 7 Atom selection + info | PASS | Atom and bond cards (items 4, 30). Hover tooltip `C · Karbon · 4/4 bağ` (s1). |
| 8 Explicit connectivity | PASS | `Molecule` atoms/bonds. Molfile round trip (item 32). |
| 9 Formula + mass | PASS | `CH₄ 16,04 g/mol`, monoisotopic `16,0313 u`, `CH₄O 32,04 g/mol` (items 2, 6, 19). |
| 10 Responsive, polished | PASS | No overflow at 12 viewports. Rail, drawer and dock adapt by breakpoint (s6). The missing mobile sheet is counted under item 25. |

---

## Blocking issues
1. **[ui] Item 16: library rows show Hill formulas** (`H3N`, `O2S`). Location: `src/ui/LibraryBody.tsx:16`. Use `conventionalFormula(entry.molecule, true)` for `pretty` and keep the Hill string in the haystack for searching.
2. **[ui] Item 22 / B.9: the viewport empty state has no buttons.** Location: `src/ui/ViewportHost.tsx:53-63`. Replace the passive hint with `Çalışma alanı boş` + `Bir element seçip tıklayın veya kütüphaneden molekül açın` and two real buttons: Atom ekle → `setTool('atom')`, Kütüphane → `openDialog('library')`. The overlay needs `pointer-events-auto` only on the buttons. Without this, mobile and tablet-portrait users have no way forward from an empty canvas.
3. **[ui] Item 25 / D.8 / D.10: mobile launches with no sheet.** Location: `src/App.tsx:141` (`… : false` for mobile), together with `BottomSheet` unmounting when closed. Mobile must start `open` at `peek` (formula + molar mass) and never go below peek.
4. **[ui] Item 36: the mandated `rg` returns 1 hit**, the comment at `src/ui/Inspector.tsx:351`. Trivial to fix.
5. **[ui] B.9 MUST (outside the checklist): WebGL unavailable does not disable the edit tools.** With `--disable-webgl` the rail still offers `Atom Ekle`, `Bağ Ekle`, `Sil`, `Ölç` and `Geometriyi düzenle` as enabled (s6 `NW BTNS`). `ViewportHost.tsx:139-160` detects `noWebgl` but uses it only to hide the HUD. The fallback text is also `WebGL kullanılamıyor / Bu tarayıcı veya cihaz WebGL desteklemiyor…` rather than the specified `Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor`.

## Improvements (non-blocking)
- **[chem-core] §E.6 migration not done.** The toast key is still `geometryOptimized` (`store.ts:29,36,928`, `i18n.ts:71,517`), and `store.ts:128` still says "animated geometry optimisation". Neither is user-visible, but §E.6 names both renames.
- **[ui] A2.2 vs A.6 text conflict.** `Geçersiz bağ sayısı` replaces the A2.2 literal `Geçersiz değerlik`. Record the resolution in SPEC editor notes, or use `Geçersiz bağ yapma kapasitesi`. The section heading `Değerlik sorunları` is itself a bare "değerlik" under A.6.
- **[ui] Item 28 guard.** There is no test for TR upper-casing. `io.ts:630` uses `toUpperCase()` for PubChem names; use `toLocaleUpperCase(lang === 'tr' ? 'tr-TR' : 'en-US')` or leave the query casing alone.
- **[scene] Dihedral mode drops the angle label.** At 4 picks the 109,5° arc is still drawn but its label disappears (`05-measure-dihedral.png`), while the inspector keeps all three values. Either keep the label or drop the arc.
- **[ui] Empty-state HUD.** `Kamerayı sıfırla` stays enabled on an empty canvas while zoom and fit are disabled (s4). Make them consistent.
- **[ui] Project name.** Importing `n5.mol` after `c2.xyz` left the project name `c2` while the molecule is `n5` (`23-n5-tool-v.png`). Check whether import should rename an auto-named project.
- **[tests] No automated guard for items 16, 22 and 25.** Each has survived three rounds. Add a unit test that `LibraryBody`'s formula uses `conventionalFormula`, and a test that the mobile layout's initial `inspectorOpen` is true at `peek`.
- **[build] p95 log ownership.** Item 12 asks for the measurement to be logged. The only passing log on this tree is the critic's (`critic-r4-cl-orbit-p95.txt`). The team should re-run `gauntlet/logs/r2-build-orbit-p95.mjs` (or an r4 copy) and commit the result.
