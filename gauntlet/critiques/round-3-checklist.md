# Round 3 critique: acceptance checklist audit (fresh-context critic)

Artifact: D:\molecular-studio @ 190f5b3 ("Gauntlet round 2: fix critic findings"); working tree clean apart from untracked critique folders. Judged against SPEC.md (the original spec plus the ENHANCEMENT ADDENDUM v1 "Acceptance checklist (MUST-v1)", items 1-36) and SPEC §10, items 1-10. I did not edit any source file.

## How it was checked
- Build and test gates were each run once this round on this commit, with no source changes since; I reused those logs: `gauntlet/logs/critic-r3-tsc.txt` (tsc exit 0), `critic-r3-vitest.txt` (9 files, 402/402 tests), `critic-r3-build.txt` (vite build exit 0) and `critic-r3-hookbuild.txt` (`--mode hook` into `gauntlet/scratch/dist-hook`, built 22:54, after the 22:47 commit).
- Runtime: `vite preview --mode hook --port 4193` (the hook bundle with `window.__MOLECULAR_SCENE__`), driven by Python Playwright and the installed Chrome. The scenario runs used swiftshader, plus one run on the real GPU (RTX 3060, ANGLE D3D11) for the console check. All URLs had `?nointro`. One `vite --port 4194` dev server ran only for the Xx injection (item 34). Both servers were killed afterwards (ports 4193 and 4194 are free).
- Scenario scripts and screenshots are in `gauntlet/scratch/critic-r3-cl/` (s1-s8 .py, PNGs). Their logs are copied to `gauntlet/logs/critic-r3-cl-s*.txt`.
- I read the code in src/ui, src/scene, src/chem/molecule.ts, store.ts and index.css.

## Score
- Checklist MUST-v1: **30 / 36 pass**.
- SPEC §10: **10 / 10 pass**.
- Combined: **40 / 46 = 87 %**.
- Verdict: **FAIL**. Six checklist items fail: 12, 14, 16, 22, 23 and 25.

Round 2 scored 78 %. These round-2 failures are now fixed: 15 (isotope and supported-list messages), 26 (canvas focus ring), 30 (row-source tag, PubChem/coordinate-source lines), 31 (coordinate-source line in library rows), 32 (`Kaynak: PubChem`), 34 (scene errors now reach the Viewport boundary) and 36 (`\u0131`). The 6-button mobile dock is also fixed.

Still open from round 2:
- the library list shows Hill formulas (16);
- the viewport empty state has no buttons (22);
- the mobile sheet starts closed (25).

Newly failing:
- the context-loss overlay was removed entirely (23);
- a real-GPU console warning (14).

---

## Acceptance checklist (MUST-v1), item by item

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | tsc exit 0, `vite build` exit 0, vitest 402/402 (`critic-r3-*.txt`). `tests/science.test.ts` has a `describe` for each of A.7 #1-#14. `tests/tokens.test.ts` and `tests/i18n.test.ts` are present and green. The tests live in `tests/`, not `src/**/__tests__`; the existing layout wins on implementation. |
| 2 | PASS | 1366x768: ball-and-stick, bbox centre (-0.011, -0.016) of the viewport. Inspector reads `Metan / CH₄ / Mol kütlesi 16,04 g/mol`. Footer reads `Top-Çubuk · 5 atom · 4 bağ`. All 4 H are visible (01-launch.png). |
| 3 | PASS | A stored empty molecule launches methane (s2). A stored Se molecule launches methane and toasts `Desteklenmeyen element: Se. Desteklenen: H, B, C, …, I`. `?m=metan` after a library load gives methane with Undo `aria-disabled` (empty history). |
| 4 | PASS | Click C shows `Atom numarası 6`, `12,011 u`, `X0,000 Y0,000 Z0,000`, `sp³`, `Düzgün dörtyüzlü`, `AX₄`, `Ortaklanmamış çift 0` (s1, 03-click-C.png). |
| 5 | PASS | DOM readouts: `Mesafe 1,090 Å`, `Bağ açısı 109,5°`, `φ = -120,0°`, plus the footnote `Model koordinatlarından ölçülmüştür`. The scene labels show `1,090 Å`, arc `109,5°` and `-120,0°` (04/05 png). |
| 6 | PASS | `A`, `O`, click H gives `CH₄O · 32,04 g/mol`. C–O from model coordinates is 1.4300 Å once the grow animation settles (s1b). Ctrl+Z returns CH₄ 16,04 and Undo is disabled again: exactly one step. |
| 7 | PASS | Atom tool, 30 px drag from empty space: atoms 5→5, Undo disabled before and after (s2). |
| 8 | PASS | Radii per mode (C/H): ballstick 0.456/0.226, spacefill 1.626/1.127, stick 0.235/0.205, wireframe points. After 20 switches the camera position is identical and geometries/textures stay 21/6 (s3 "8 cam same True"). |
| 9 | PASS | `bondLayout.ts:36-87` derives the offset from neighbour atoms only, never from the camera. `tests/scene.test.ts:189` asserts that ethylene strands lie in the H–C–H plane. |
| 10 | PASS | Centre pixel of C is (144,144,144) at rest, hovered and selected. The two-tone shell is in code (`moleculeRig.ts:82-86`, surface-0 rim plus accent). `render.frame` stays 154→154 over 3 s while selected, so nothing pulses. |
| 11 | PASS | Idle 5 s: `render.frame` 45→45. |
| 12 | **FAIL** | Draw calls: methane 6-7 vs tristearin 6 (ok). Geometries/textures 21/6 before and after 20 load→undo→new cycles (ok). **Orbit p95 does not meet the budget.** The team's own log `gauntlet/logs/r2-build-orbit-p95.txt` records `RESULT checklist#12 p95<=16.7ms: FAIL (p95=55.70 ms)` and `FAIL (p95=48.70 ms)`. This round's vsync runs on the same commit and GPU give `p95=55.70` and `p95=27.70` (`critic-r3-code-browser.txt`). Only a `--disable-gpu-vsync` run passes (7.0 ms). No log shows a passing measurement under the specified rAF method. |
| 13 | PASS | With the camera settled, a select-tool drag moves H by 0.351 Å and `camera.position` stays identical (s3). One Ctrl+Z restores it. |
| 14 | **FAIL** | Swiftshader B.10 run: 0 messages (s1, s6b). **On the dev machine's real GPU, launch logs `console.warning: THREE.WebGLProgram: Program Info Log: … warning X4122: sum of 0.996094 and -2.98545e-017 cannot be represented accurately in double precision`** (s8, RTX 3060 / ANGLE D3D11). It reproduces in `critic-r3-code-browser.txt`. `consoleFilter.ts:7` drops only THREE.Clock, so B.9's "zero warnings" fails on the hardware the budget is defined for. |
| 15 | PASS | `fe.xyz` toasts `Desteklenmeyen element: Fe. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`; `se.xyz` the same for Se; `d.xyz` toasts `Desteklenmeyen izotop: D`. Methane is unchanged after each (s3). |
| 16 | **FAIL** | Inspector: ammonia shows `NH₃` with title `Hill sistemi: H₃N`, SO₂ shows `SO₂` (title O₂S), BF₃ is ok. **The Library dialog still lists ammonia as `H3N` and SO₂ as `O2S`** (s3b rows: `Amonyak / H3N / …`, `Kükürt dioksit / O2S / …`). Cause: `LibraryBody.tsx:16` `const pretty = formula(entry.molecule, true)` (Hill) instead of `conventionalFormula`. A2.1 makes the conventional form the primary formula wherever the composition matches a key. Unchanged since round 2. |
| 17 | PASS | Bare C₂ shows `Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir` beside `24,02 g/mol`. 5-bond neutral N shows `Geçersiz değerlik: N (5/3)` and `N atomu en fazla 3 bağ yapabilir (şu an 5)`, with a red danger ring (crop-23-n5-tool-v.png). |
| 18 | PASS | Measured from snapshot model coordinates (s3b): H₂O 0.9578 Å / 104.48°; NH₃ 1.012 Å / 106.67°; CO₂ 1.1621 Å / 180°. |
| 19 | PASS | CH₄ `16,0313 u`. H₂SO₄ has no `Doymamışlık` row. Lipinski reads `3 / 4 kural değerlendirildi (logP hesaplanmıyor)` with only the three rule rows and no verdict. |
| 20 | PASS | The `Tahmini` badge is on the Gasteiger row, the VSEPR group header, aromatic rings, aromatic bond, polarity, functional groups and H-donor/acceptor rows. Reference, calculated and measured rows carry tooltips only. No dipole/logP/TPSA/pKa/energy value appears (rg over the i18n values). |
| 21 | PASS | No UI string value contains optimi*/optimizasyon. The action is `Geometriyi düzenle (basit kuvvet alanı, yaklaşık)`; the toast is `Geometri düzenlendi — idealize geometri (enerji minimizasyonu değil)`. |
| 22 | **FAIL** | Undo/Redo disabled when empty (ok), and no `0 g/mol` (ok). **The viewport empty state has no buttons.** `ViewportHost.tsx:53-63` `EmptyHint` is one `pointer-events-none` sentence: "Başlamak için Atom Ekle aracını seçin veya kütüphaneden bir molekül açın". The only buttons it offers are disabled HUD zoom/fit (s4, s6c). The two real buttons live only in the inspector, which is closed on 390x844 (no sheet) and on 768x1024 portrait (no aside), so there the empty workspace has no way forward (31-mobile-empty.png, 31-tablet-empty.png). B.9 also wants the copy `Çalışma alanı boş` / `Bir element seçip tıklayın veya kütüphaneden molekül açın` in the viewport. Unchanged since round 2. |
| 23 | **FAIL** | Restore works: after `restoreContext()`, 5 atoms with identical coordinates and geometries 21. With `--disable-webgl` the inspector works. **Losing the context shows no overlay at all.** After `loseContext()` the viewport text is only the HUD, at 1 s and again at 4 s (s5, 11-contextlost.png), and there is no `Yeniden yükle` after 3 s. `app.viewRestarting` is defined in `i18n.ts:21` but referenced nowhere. `Viewport.tsx:67` claims "the one visible restart overlay … lives in ViewportHost", yet `ViewportHost.tsx` has no context-loss code; the round-2 fix deleted both overlays instead of keeping one. |
| 24 | PASS | Reduced motion: Reset +2 frames to the exact default pose, Fit +2 frames, Clean-up +2 frames with geometry changed and one undo entry. The auto-rotate item is `aria-disabled` with `Hareket azaltma açıkken kullanılamaz`. |
| 25 | **FAIL** | No horizontal overflow at all 12 TR/EN standard viewports (`scrollWidth == innerWidth`, s6). **Mobile launches without any sheet**: at 360x740 and 390x844 there is no `[role=complementary]` (30-390x844-tr.png). `App.tsx:141` sets `setInspectorOpen(… : false)` for mobile, contradicting D.8/D.10 "mobile launches with the sheet at peek". Unchanged since round 2. |
| 26 | PASS | Tab order: header (name, undo, redo, Kütüphane, Dosya, Görünüm, Ayarlar, Info), then rail (`Seç`, one roving stop), canvas, HUD, inspector, each with a 2 px accent outline. The canvas matches `:focus-visible` with a solid 2 px accent outline. `V R P Z A B D M E` select the expected tools. The tooltip `Seç [V]` matches the `?` sheet. Esc closes the dialog. |
| 27 | PASS | `rg -n "gradient\|backdrop-…\|#000\b\|#fff\b\|shadow-\[0_0" src/ui src/index.css` finds only `index.css:147/149` (the `.viewport-bg` comment and rule). There are no hex literals in `src/ui/**/*.tsx`. `LucideProvider strokeWidth={1.75}` and `icons.tsx` use 1.75 everywhere. |
| 28 | PASS (note) | TR shows decimal commas everywhere observed: inspector, scene labels, status `10,10 Å`, composition `74,87 %`. EN uses decimal points. `İ ı Ş Ğ` render correctly (`İdeal bağ açısı`, `Doymamışlık`, `Ağır`). `<html lang>` follows the language. Note: the UI has no upper-casing code path at all (no `toLocaleUpperCase`/`uppercase` in src outside intro), so "İYOT" is satisfied only vacuously, and no test guards it. |
| 29 | PASS | C → Si gives `SiH₄ · 32,12 g/mol` with one undo entry. The charge stepper adds one undo entry per step and is clamped to +2/−2 (`aria-disabled` at the limits). The nitro group (imported neutral, then N +1, O −1 via the stepper) ends with `Değerlik sorunu yok`. |
| 30 | PASS | The bond card shows `C–H`, `Tekli bağ (σ)`, atoms C #1 / H #5, measured `1,090 Å`, `Referans tablosu 1,090 Å` with row tag `Allen 1987 (rounded)`, ΔEN `0,35`, polarity + Tahmini, σ/π, ring, aromatic. The molecule card shows formula, coordinate-source line, masses, counts, rings, net charge, gated DoU and A2.2 note. There is no "—", `'s'` or placeholder row. |
| 31 | PASS | 46 entries in 7 categories (`Hidrokarbonlar · 7` …). Rows show TR names, nameEn under EN, and a `Koordinatlar: …` line. Search: "benzen" 6 hits; "kukurt" finds `Kükürt dioksit`, `Kükürt heksaflorür`, `Sülfürik asit`. A load is one undo entry. The formula column is item 16's defect. |
| 32 | PASS | `Benzen.mol` 1071 B, `Benzen.xyz` 514 B, `Benzen.png` 379 kB downloaded. The A.7 #14 round-trip test passes. Import errors are localized and leave the molecule unchanged (item 15). Offline, the PubChem item is `aria-disabled` with title `Çevrimdışı: PubChem kullanılamıyor`. A live PubChem "ethanol" load shows `Kaynak: PubChem`. |
| 33 | PASS | Settings: language, motion (system/reduced/full), Oto-H, shortcut sheet link, about notes. View: style radios, H/labels/partial-charges/auto-rotate toggles, reset. No toggle appears in both places and every control is wired (`menus.tsx`, `Dialogs.tsx:39-90`). |
| 34 | PASS | Dev-server injection of `Xx` gives viewport `3B görünüm başlatılamadı … Yeniden yükle` and inspector `Bilgi paneli açılamadı … Yeniden yükle`. Top bar and rail stay usable, with 4 console errors, all crash logs (s7). |
| 35 | PASS | Tristearin wheel zoom clamps at `camera.distance = 1.5` (near 0.12). After Ctrl+S the status reads `Tarayıcıda kaydedildi`. `SaveStatus` has no spinner. |
| 36 | PASS | i18n parity tests are green, and `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 0 hits. |

---

## SPEC §10 (original delivery requirements)

| # | Result | Evidence |
|---|---|---|
| 1 Complete workspace | PASS | Top bar, rail, viewport + HUD, inspector, status bar (01-launch.png). |
| 2 Interactive viewport | PASS | R3F canvas, demand frameloop, orbit/zoom/drag verified. |
| 3 Valid 3D molecule | PASS | Methane C–H 1.090 Å, H–C–H 109.47°. |
| 4 Ball-and-stick | PASS | Launch default. |
| 5 Additional mode | PASS | Spacefill, stick and wireframe change radii/geometry. |
| 6 Orbit/zoom/pan/reset | PASS | Orbit drag, wheel zoom clamped 1.5 Å, reset to the exact default pose. |
| 7 Selection + context | PASS | Atom, bond, measure and multi cards. |
| 8 Data model | PASS | Explicit atoms/bonds with stable ids, `validateMolecule`. |
| 9 Formula + mass | PASS | Hill + conventional formula, IUPAC mass, monoisotopic mass. |
| 10 Responsive, polished | PASS (caveats) | Distinct desktop/tablet/mobile models, no overflow. The mobile sheet and measure defects are counted under item 25 and the blockers below. |

---

## Other MUST violations found on the way (blocking, outside the 36 items)

1. **B.9 WebGL unavailable: edit tools stay enabled** (ui). With `--disable-webgl`, `Atom Ekle`, `Bağ Ekle`, `Sil`, `Geometriyi düzenle`, `Hidrojen ekle/kaldır` and `Yeni molekül` are all enabled (s6 "NW BTNS"). `ViewportHost.tsx:162,181` uses `noWebgl` only to hide the HUD. The copy also differs: `WebGL kullanılamıyor / Bu tarayıcı veya cihaz…` instead of `Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor`.
2. **B.6 / B.2: no measurement progress outside the inspector** (ui).
   - `ToolOptions` returns `null` for Measure (`Toolbar.tsx:215`).
   - The status bar shows only the static hint `Ölç: Mesafe için 2, açı için 3, dihedral için 4 atom seçin`, never "1/4 atom seçildi" or "Mesafe 1,090 Å · Açı 109,5°".
   - On 390x844, measuring H–C–H opens no sheet, so there is **no DOM readout at all** (s6b "M measure footer … sheet None").
3. **B.2 contextual options incomplete** (ui). The Atom options have no Oto-H switch. The Bond options have no `İlk atomu seçin` / `İkinci atomu seçin · Esc iptal` hint. Measure has no live readout or `Temizle` strip (`Toolbar.tsx:208-243`).
4. **D.8 bottom sheet model** (ui).
   - The sheet can be dismissed below peek: it has an X button (`BottomSheet.tsx:154`) and a drag-to-closed stop (`:111`).
   - Selecting an atom opens it at `peek` instead of raising peek → half (`App.tsx:160`).
   - On mobile, the B.10 path (inspector `CH₄O · 32,04 g/mol` after a grow) is therefore not visible at 390x844 (s6b "M grow O formula False").
5. **D.6.6 / D.9 #9 status bar colour** (ui). The atom/bond counts and the selection sit in `text-ink-faint` (`StatusBar.tsx:112,124`). D.6.6 specifies `ink-dim`, and ink-faint must never carry an essential fact.
6. **D.5 / D.9 #8 icon grid** (ui). `BondOrderGlyph` uses `viewBox="0 0 18 16"` (`Toolbar.tsx:183`), off the 24-unit grid, in the same segmented control as 24-grid icons.
7. **A4.1 structure type** (chem-props). The NH₃, CO₂ and C₆H₆ coordinate-source lines read `NIST CCCBDB deneysel geometri (yapı türü belirtilmemiş)`. A4.1 requires each row to record the CCCBDB structure type (re / r₀ / rz); NH₃ is explicitly re. Water does record `(re)`.

## Improvements (non-blocking)
- `scene/Announcer.tsx:71` calls `el()` inside a zustand subscriber. With an unknown symbol, `useStudio.setState` itself throws (s7: "setState threw"), so zustand skips every listener after it. That can include the autosave subscriber. Use `getElement` there.
- The bond reference row tag `Allen 1987 (rounded)` / `CCCBDB gas-phase` is English text inside the Turkish UI (`molecule.ts:265-267`). Route it through i18n.
- The `set.about.approx.body` string says the force-field energy is "yalnızca göstergeseldir", which implies an energy is shown somewhere. A.5 says it never is, so drop the clause.
- The header overflow and the dock "More" share the accessible name `Diğer seçenekler`. Give them distinct labels.
- Composition bars still read as a small decorative chart (D.9 #6). The list with percentages alone would satisfy A2.6.
- In a 4-atom measure chain the scene angle label disappears; only the arc and the dihedral label remain.
- The library row coordinate-source line and atom count are `ink-faint`. They are acceptable as captions, but the coordinate source is a provenance fact.
- Add a test for Turkish upper-casing (a shared `upperTR()` helper), so item 28 is not only vacuously true.
- Internal names from §E6 have not been migrated: the toast code `geometryOptimized` and the `store.ts:127` comment "animated geometry optimisation".

## Priority fix order
1. Restore one context-loss overlay in `ViewportHost`, using `app.viewRestarting` and showing `Yeniden yükle` after 3 s (item 23).
2. Mobile: start with the sheet at peek, never below peek, and make select raise it to half. Add viewport empty-state buttons (`Atom ekle`, `Kütüphane`) with the B.9 copy (items 22, 25, blocker 4).
3. Use `conventionalFormula()` in `LibraryBody.tsx:16` (item 16).
4. Get rid of the D3D11 `THREE.WebGLProgram` X4122 warning: find which material includes the packing/tonemapping chunk, or filter that driver notice with a documented rationale. Then re-log a passing tristearin orbit p95 under the rAF method, or fix the jank behind p95 27-56 ms (items 14, 12).
5. Disable edit tools without WebGL; add the measure/bond/Oto-H ToolOptions and status-bar measure progress; switch the status bar to ink-dim; move `BondOrderGlyph` to the 24 grid; record the CCCBDB structure types (blockers 1-3, 5-7).
