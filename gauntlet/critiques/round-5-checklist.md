# Round 5 critique: acceptance checklist audit (fresh-context critic)

Artifact: D:\molecular-studio. The working tree sits on top of 190f5b3 with 31 modified files and new untracked files (`src/scene/controlsUtil.ts`, `src/ui/inspector/{FittedElementPicker,longPress,reveal}.ts(x)`, `tests/helpers/`, `tests/store-{deeplink,import,rounds}.test.ts`). I judged it against SPEC.md: the original spec plus the ENHANCEMENT ADDENDUM v1 "Acceptance checklist (MUST-v1)", items 1-36, and SPEC §10, items 1-10. I did not edit any source file.

## How it was checked
- **Gates.** Each ran once on this tree:
  - `npx tsc --noEmit`: exit 0 (`gauntlet/logs/critic-r5-cl-tsc.txt`).
  - `npx vitest run`: 12 files, **432/432** pass (`critic-r5-cl-vitest.txt`).
  - `npx vite build`: exit 0, which refreshed `dist/` (`critic-r5-cl-build.txt`).
  - `npx vite build --mode hook --outDir gauntlet/scratch/critic-r5-cl/dist-hook`: exit 0 (`critic-r5-cl-hookbuild.txt`).
- **Preview server.** `vite preview --port 4193 --strictPort` served the hook bundle, so `window.__MOLECULAR_SCENE__.snapshot()` was available.
- **Browser runs.** Python Playwright drove the installed Chrome. Rendering used swiftshader, except s8, which used the real GPU (RTX 3060, ANGLE D3D11) for the console check. Every URL had `?nointro`.
- **Dev server.** One `vite --port 4194` dev server ran only for the `Xx` injection (item 34).
- **Cleanup.** Both servers are killed and ports 4193 and 4194 are free.
- **Scripts and outputs.** The scenario scripts s1-s9 and their PNGs are in `gauntlet/scratch/critic-r5-cl/`. Their outputs are copied to `gauntlet/logs/critic-r5-cl-s*.txt`.
- **Orbit timing.** My own orbit-timing script did not finish: the system node has no global `WebSocket`, so the CDP script stalled, and I stopped it without retrying. For the orbit p95, item 12 therefore relies on the team's log `gauntlet/logs/r4-build-orbit-p95.txt`, dated 2026-10-10T22:12Z, which is this tree.

## Score
- Checklist MUST-v1: **32 / 36 pass**.
- SPEC §10: **10 / 10 pass**.
- Combined: **42 / 46 = 91 %**.
- Verdict: **FAIL**.

Failing checklist items: **16, 22, 25** (each open for the fourth consecutive round) and **34** (a new regression). The round-4 failure 36 is fixed: the `rg` now returns 0 hits.

Three further MUST violations sit outside the checklist; see "Blocking issues" 5-7.

---

## Acceptance checklist (MUST-v1), item by item

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | tsc exit 0, vitest 432/432, vite build exit 0. `tests/science.test.ts` covers A.7 #1-#14 (describe blocks at lines 62-565). `tests/tokens.test.ts` and `tests/i18n.test.ts` are green. They live in `tests/` (vite.config `include: ['tests/**/*.test.ts']`); the existing layout wins on implementation. |
| 2 | PASS | At 1366x768 (s1): ball-and-stick, bbox centre (-0.011, -0.016), all 4 H visible (`01-launch.png`). The inspector reads `Metan · CH₄ · Mol kütlesi 16,04 g/mol`. The footer reads `Top-Çubuk · 5 atom · 4 bağ · Seçim yok`. |
| 3 | PASS | A stored empty molecule launches methane. A stored Se molecule launches methane and toasts `Desteklenmeyen element: Se. Desteklenen: H, B, C, N, O, F, Na, Mg, Si, P, S, Cl, Br, I`. After an ethanol library load (undo enabled), `?m=metan` gives methane with undo disabled (s2). |
| 4 | PASS | Clicking C shows `Atom numarası 6`, `Atom kütlesi 12,011 u`, `X0,000 Y0,000 Z0,000`, `Hibritleşme sp³`, `Geometri Düzgün dörtyüzlü`, `AX₄` and `Ortaklanmamış elektron çifti 0` (s1, `03-click-C.png`). |
| 5 | PASS | DOM readouts: `Mesafe 1,090 Å`, `Bağ açısı tepe: C #1 109,5°`, `φ = -120,0°` and `Model koordinatlarından ölçülmüştür`. The scene shows `1,090 Å`, the `109,5°` arc label and the `-120,0°` label (`05-measure-dihedral.png`). The round-4 problem of the angle label vanishing at 4 picks is fixed. |
| 6 | PASS | `A`, `O`, click H gives `CH₄O · 32,04 g/mol`. C–O is 1.4300 Å from model coordinates once the grow animation settles (~1.5 s; s1b). Ctrl+Z returns `CH₄ 16,04 g/mol` and undo is disabled again, so it was exactly one step. |
| 7 | PASS | Atom tool, 30 px drag from empty space: atoms 5 → 5; undo disabled before and after (s2). |
| 8 | PASS | Radii C/H by mode: ballstick 0.459/0.227, spacefill 1.627/1.128 (still easing toward 1.70/1.20 at the 1 s sample; `styleParams.ts:24` is `a: 1` × vdW), stick 0.159/0.153, wireframe `point`. After 20 switches from a settled camera, the camera position is identical and geometries/textures stay 21/6 (s3: `8 cam same True`). |
| 9 | PASS | `tests/scene.test.ts:189` asserts that the ethylene double-bond strands lie in the substituent plane. The offset is data-derived (`bondLayout.ts`). |
| 10 | PASS | The C centre pixel is (144,144,144) at rest, hovered and selected. `render.frame` stays 179 → 179 over 3 s while selected. The two-tone ring (dark inner rim, accent outer rim) is visible in `09-selC-crop.png`. |
| 11 | PASS | 5 s idle: `render.frame` 42 → 42 (s2). |
| 12 | PASS | Draw calls are methane 7 vs tristearin 6. Geometries/textures stay 21/6 over 20 load/undo/new/undo cycles (s2). The team's log `gauntlet/logs/r4-build-orbit-p95.txt` (RTX 3060, vsync, 1440 rAF samples) has **p95 7.10 ms** and RESULT PASS. My own re-run did not complete (see "How it was checked"). |
| 13 | PASS | With a settled camera, a Select-tool drag moved H by 0.351 Å and `camera.position` stayed bit-identical. One Ctrl+Z disables undo again (s3). s2's version of this check shows camera drift only because it ran right after an orbit drag, while damping was still settling. |
| 14 | PASS | B.10 script on the real GPU: 0 console messages (s8). Swiftshader runs s1-s6 and s9: 0 messages. |
| 15 | PASS | `fe.xyz` gives `Desteklenmeyen element: Fe. Desteklenen: …`. `se.xyz` gives the same message for Se. `d.xyz` gives `Desteklenmeyen izotop: D`. Methane is unchanged after each (s3). |
| 16 | **FAIL** | The inspector is correct: ammonia text `NH3` with title `Hill sistemi: H₃N`, SO₂ `SO₂` (title `O₂S`), BF₃ `BF₃`. **The Library dialog still shows Hill as the primary formula.** s3/s3r rows: `Amonyak / H3N / NH₃ — …` and `Kükürt dioksit / O2S / SO₂ — …`. Cause: `src/ui/LibraryBody.tsx:16` `const pretty = formula(entry.molecule, true)` (strict Hill) instead of `conventionalFormula` (`src/chem/molecule.ts:176`). A2.1: "The conventional form is the primary formula whenever the current composition matches a key." This is the **fourth consecutive round** with this finding. |
| 17 | PASS | Bare C₂ shows `Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir` + `Hidrojenleri tamamla` beside `24,02 g/mol`. A 5-bond neutral N shows `Geçersiz bağ sayısı: N (5/3)` and the card line `N atomu en fazla 3 bağ yapabilir (şu an 5)`, with a red danger ring around N (`23-n5-tool-v.png`). Note: the A2.2 literal is `Geçersiz değerlik`; the team's wording honours A.6 "never bare değerlik", which is acceptable. |
| 18 | PASS | From snapshot coordinates: H₂O 0.9578 Å / 104.48°, NH₃ 1.012 Å / 106.67°, CO₂ 1.1621 Å / 180.0° (s3r). The source lines cite CCCBDB with the access date. |
| 19 | PASS | CH₄ `16,0313 u`. H₂SO₄ has no `Doymamışlık` row. Lipinski reads `3 / 4 kural değerlendirildi (logP hesaplanmıyor)` plus three rule rows, with no verdict (s3r). |
| 20 | PASS | The `Tahmini` badge appears on: aromatic ring, H-bond donor/acceptor, functional groups, the VSEPR group, Gasteiger, polarity and the aromatic flag. Reference, computed and measured rows carry tooltips only, e.g. `Referans tablosu (Pauling)` and `Molekül grafiğinden hesaplandı` (s5 titles). No dipole, logP, TPSA, pKa, energy number or Lipinski verdict appears. (See the improvement about the polarity value chip.) |
| 21 | PASS | No user-visible i18n value contains optimi*/optimizasyon. The action reads `Geometriyi düzenle (basit kuvvet alanı, yaklaşık)`. The toast reads `Geometri düzenlendi — idealize geometri (enerji minimizasyonu değil)` (s3r). |
| 22 | **FAIL** | Undo/redo are `aria-disabled` when empty and there is no `0 g/mol`: OK. **The viewport empty state still has no buttons and not the specified copy.** `src/ui/ViewportHost.tsx:53-63` `EmptyHint` is one `pointer-events-none` `<p>`: "Başlamak için Atom Ekle aracını seçin veya kütüphaneden bir molekül açın". The viewport's only buttons are the style radios, three disabled zoom/fit buttons and `Kamerayı sıfırla` (s4, s6b, s6c, s9). On mobile 390x844 (sheet absent) and tablet 768x1024 portrait (aside absent) the empty workspace offers no in-place way forward (`31-mobile-empty.png`, `31-tablet-empty.png`). B.9 requires the viewport to show `Çalışma alanı boş`, `Bir element seçip tıklayın veya kütüphaneden molekül açın`, and two real buttons (Atom ekle → `setTool('atom')`, Kütüphane → `openDialog('library')`). This is the **fourth consecutive round**. |
| 23 | PASS | `loseContext()` shows `3B görünüm yeniden başlatılıyor…` at 1 s and adds `Yeniden yükle` at 4 s. `restoreContext()` brings back 5 atoms with identical coordinates and geometries 21 (s5). With `--disable-webgl` the inspector still renders (s6 `NW insp`). |
| 24 | PASS | Reduced motion: Reset +2 frames to the exact default pose, Fit +2 frames, Clean-up +2 frames with changed coordinates and one undo entry. Auto-rotate is `aria-disabled` with the title `Hareket azaltma açıkken kullanılamaz`; `data-reduced-motion="true"` (s5). |
| 25 | **FAIL** | No horizontal overflow at all 12 TR/EN standard viewports (`scrollWidth == innerWidth`, s6). **Mobile still launches without the bottom sheet:** at 360x740 and 390x844 there is no `[role=complementary]` (`sheet None`, `30-390x844-tr.png`). The sheet appears only after a tap selects an atom (`M after tap C`). Cause: `src/App.tsx:141` `setInspectorOpen(layout === 'desktop' ? … : layout === 'tablet' ? landscape : false)`, and `BottomSheet` unmounts when `open` is false (`BottomSheet.tsx:53-72`). This contradicts D.8 (sheet "never dismissed below peek"), D.10 ("sheet at peek on mobile") and item 25 ("mobile launches with the sheet at peek"). This is the **fourth consecutive round**. |
| 26 | PASS | Tab order: header (name, undo, redo, Kütüphane, Dosya, Görünüm, Ayarlar, Info) → rail (`Seç`, one roving stop) → canvas → HUD (style, zoom ±, fit, reset) → inspector. Every stop has a 2 px accent outline, and the canvas matches `:focus-visible` (s5). The keys `V R P Z A B D M E` map to the expected tools. The tooltip shows `Seç V` (`26-tooltip.png`). The `?` sheet lists the same keys. Esc closes the dialog. |
| 27 | PASS | The mandated `rg` hits only `src/index.css:147` (comment) and `:149` (the `.viewport-bg` rule). No hex literals in `src/ui/**/*.tsx`. No `strokeWidth` other than 1.75 in `src/ui` or `App.tsx`. |
| 28 | PASS (note) | Decimal commas everywhere observed in TR (inspector, scene labels, status `10,10 Å`, composition). `İ ı Ş Ğ` render correctly (`İdealize`, `Doymamışlık`, `Ağır`). `<html lang>` follows the language (s6). "İYOT" passes only vacuously: no code path upper-cases whole UI strings. `io.ts:570-583` now capitalises user-typed names with `toLocaleUpperCase(loc)`, and no test guards TR upper-casing. |
| 29 | PASS | C → Si gives `SiH₄`, one undo entry. The charge stepper adds one undo entry per step and clamps at +2/−2; `Yükü artır` is `aria-disabled` at +2 (s4). Nitromethane: N +1 and O −1 via the stepper leave every atom `Tamam`, net charge 0. One Ctrl+Z reverts only the last charge step (s4n). |
| 30 | PASS | Bond card (`20-bondcard.png`): `C–H`, `Tekli bağ (σ)`, atoms C #1 / H #5, `Modeldeki uzunluk (idealize) 1,090 Å`, `Referans tablosu 1,090 Å · Allen 1987 (yuvarlatılmış)`, ΔEN `0,35`, polarity + Tahmini, σ 1 / π 0, ring and aromatic flags. The molecule card shows the B.12 rows plus A.5-classified extras (heavy atoms, size, rotatable bonds). There is no "—", `'s'` or placeholder. |
| 31 | PASS | 46 entries in 7 categories (`Hidrokarbonlar · 7` … `İlaçlar ve Alkaloitler · 7`). Each row has a `Koordinatlar: …` source line. Searching "benzen" gives 6 hits. "kukurt" finds `Kükürt dioksit`, `Kükürt heksaflorür` and `Sülfürik asit`. A load is one undo entry (s2, s3r). The row formula is item 16's defect. |
| 32 | PASS | `Benzen.mol` 1071 B, `Benzen.xyz` 514 B and `Benzen.png` 379 052 B downloaded. The A.7 #14 round trip is in vitest. Import errors are localized and leave the molecule unchanged (item 15). Offline, the PubChem item is `aria-disabled` with the title `Çevrimdışı: PubChem kullanılamıyor`. A live "ethanol" search loads it with `Kaynak: PubChem` (s4). |
| 33 | PASS | Settings: language, motion (system/reduce/full), Oto-H switch, shortcut link and about/notes. View: style, hydrogens, labels, partial charges, auto-rotate, camera reset. No duplicated display toggle and no placeholders (s9). Hiding H hides the 4 H while the formula stays CH₄. |
| 34 | **FAIL (regression)** | The `Xx` injection does reach both boundaries: the inspector shows `Bilgi paneli açılamadı … Yeniden yükle` and the top bar and rail stay usable. **But the viewport renders the error-boundary message and the context-loss overlay on top of each other** (`34-xx.png`). The `3B görünüm yeniden başlatılıyor…` overlay (rgba 0.85) covers `3B görünüm başlatılamadı / Görünüm bir hata nedeniyle durdu…`, leaving the boundary text barely legible. A second `Yeniden yükle` button appears 3 s later, so two reload buttons overlap. The viewport text (s7) is: `3B görünüm başlatılamadı Görünüm bir hata nedeniyle durdu… Yeniden yükle … 3B görünüm yeniden başlatılıyor… Yeniden yükle`. Cause, new this round in `src/scene/Viewport.tsx`: when `SceneBoundary` catches (`:170`), the `<Canvas>` unmounts. R3F then force-loses the context, and the `webglcontextlost` listener (`:194-201`) still sees `canvasEl.current === el`, because only `reloadView`/`retryAfterError` clear it, so it sets `lost=true`. The same path runs for frame-loop failures (`fatal` → unmount), so production crashes are affected too, not only dev. B.9: the context-loss overlay "is the only context-loss flow" and must not claim a restart for a crash. Round 4 rendered this case cleanly. |
| 35 | PASS | Tristearin wheel zoom clamps at `camera.distance = 1.5` (near 0.12). After Ctrl+S the indicator reads `Tarayıcıda kaydedildi`, with no spinner (s2). |
| 36 | PASS | `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 0 hits (fixed since round 4). The i18n parity tests are green. |

---

## SPEC §10 (original delivery requirements)

| # | Result | Evidence |
|---|---|---|
| 1 Complete workspace | PASS | Top bar, rail, viewport + HUD, inspector and status bar (`30-1366x768-tr.png`). |
| 2 Interactive Three.js viewport | PASS | R3F canvas with demand frameloop. Orbit, zoom and atom drag verified (s2, s3). |
| 3 Valid 3D molecule | PASS | Methane C–H 1.090 Å / 109.47° (oracle #6). Library H₂O/NH₃/CO₂ match CCCBDB (item 18). |
| 4 Ball-and-stick | PASS | Launch default (item 2). |
| 5 Additional mode | PASS | Space-filling, stick and wireframe with distinct radii and geometry (item 8). |
| 6 Orbit/zoom/pan/reset | PASS | Orbit drag, wheel zoom with the 1.5 Å clamp, Fit and Reset (items 7, 24, 35). |
| 7 Selection + context info | PASS | Atom and bond cards (items 4, 30). Hover tip `C · Karbon · 4/4 bağ` (s1). |
| 8 Explicit connectivity | PASS | `Molecule` atoms/bonds. Molfile round trip (item 32). |
| 9 Formula + mass | PASS | `CH₄ 16,04 g/mol`, `16,0313 u`, `CH₄O 32,04 g/mol` (items 2, 6, 19). |
| 10 Responsive, polished | PASS (counted under 25) | No overflow at 12 viewports. Rail, drawer and dock adapt by breakpoint. The missing mobile sheet and the readout gap it causes are counted under item 25 and blocker 6. |

---

## Blocking issues
1. **[ui] Item 16: library rows show Hill formulas** (`H3N`, `O2S`).
   - Location: `src/ui/LibraryBody.tsx:16`.
   - Fix: use `conventionalFormula(entry.molecule, true)` for `pretty`, and keep the Hill string (`plain`) in the search haystack.
   - Round 4 of 4 with this finding.
2. **[ui] Item 22 / B.9: the viewport empty state has no buttons and not the specified copy.**
   - Location: `src/ui/ViewportHost.tsx:53-63`.
   - Fix: render `Çalışma alanı boş` + `Bir element seçip tıklayın veya kütüphaneden molekül açın` with two real buttons: Atom ekle → `setTool('atom')`, Kütüphane → `openDialog('library')`. Use `pointer-events-auto` on the buttons only.
   - Mobile and tablet-portrait users currently have no in-place way forward.
3. **[ui] Item 25 / D.8 / D.10: mobile launches with no sheet.**
   - Location: `src/App.tsx:141` (`… : false` for mobile), together with `BottomSheet` unmounting when `open` is false.
   - Fix: on mobile, start `open` at `peek` (formula + molar mass) and never go below peek. Info should change the detent, not unmount the sheet.
   - Item 25 also requires methane fully visible above the peek sheet.
4. **[scene] Item 34 (regression): a scene crash shows the context-loss overlay on top of the error boundary.**
   - Location: `src/scene/Viewport.tsx:170` (boundary) and `:194-201` (the `webglcontextlost` listener).
   - Fix: clear `canvasEl.current` (or ignore loss events) when `SceneBoundary` catches or `fatal` is set, e.g. in `onError={(e) => { canvasEl.current = null; setFatal(e) }}`. Hide the `lost` overlay whenever `fatal !== null`.
   - Repro: dev server, `useStudio.setState` with an atom symbol `Xx`. Result: overlapping text and two `Yeniden yükle` buttons (`gauntlet/scratch/critic-r5-cl/34-xx.png`).
5. **[ui] B.9 MUST (outside the checklist, still open from round 4): WebGL unavailable leaves the edit tools enabled and uses non-spec copy.**
   - With `--disable-webgl`, the rail offers `Atom Ekle`, `Bağ Ekle`, `Sil`, `Ölç` and `Geometriyi düzenle` as enabled (s6 `NW BTNS`).
   - `ViewportHost.tsx:162-181` detects `noWebgl` but only hides the HUD.
   - The message is `WebGL kullanılamıyor / Bu tarayıcı veya cihaz WebGL desteklemiyor…` instead of the specified `Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor`.
6. **[ui] B.6 / B.2 MUST (outside the checklist): on mobile a measurement has no DOM readout.**
   - At 390x844, measuring H–C–H shows only the scene labels. The footer reads `Ölç · 5 atom · 4 bağ · Seçim yok`, with no `n/4 atom seçildi`, no `Mesafe … · Açı …`, no footnote and no `Temizle` (`32-mobile-measure.png`, s6b `sheet None`).
   - On desktop the readout lives only in the inspector, and `ToolOptions` (`src/ui/Toolbar.tsx:209-240`) returns `null` for Measure.
   - B.6 requires "Status/options show progress … Esc or empty click clears", and B.2 requires Measure options with a live readout + `Temizle`.
   - Fixing blocker 3 (peek sheet) would only partly cover this; the status bar or the options strip should carry the readout.
7. **[ui] B.2 MUST (outside the checklist): the Atom options strip has no Oto-H switch.**
   - B.2 requires "element palette …, bond order 1/2/3, Oto-H switch bound to `autoH`" in the contextual options.
   - `ToolOptions` (`Toolbar.tsx:226-239`) has only the element grid and the bond order; `autoH` lives only in Settings (`Dialogs.tsx:77`).
   - Adding it to the strip, bound to the same store field, does not duplicate state.

## Improvements (non-blocking)
- **[chem-core] §E.6 rename still not done.** The toast key is still `geometryOptimized` (`store.ts:29,36,930`, `i18n.ts:71,522`). `store.ts:930` builds the notify text with a hard-coded `tx(...)` instead of the i18n key. Neither is user-visible as "optimize", but §E.6 names both changes.
- **[scene] Measurement label collisions.** In the 4-pick chain, `1,090 Å` (pair 1-2) and `1,780 Å` (pair 3-4) overlap near the C atom (`05-measure-dihedral.png`). Also, the dihedral label sits next to atom 1, not at "the central pair's midpoint" (B.6). Offset labels away from atom centres, or anchor the dihedral label on the 2–3 bond midpoint.
- **[ui] Polarity value rendered as a bordered chip** (`apolar kovalent` next to the `Tahmini` badge, `20-bondcard.png`). It reads as a second badge, against "only Tahmini values carry a badge" and the D.9 #6 pill guidance. Render the value as plain `ink` text.
- **[ui] Settings "Hesaplanan değerler" copy** says `Molekül formülü (Hill sırası)` and `molar kütle`. The primary formula is now conventional (A2.1), and A.6 mandates `Mol kütlesi`.
- **[ui] Empty-state HUD.** `Kamerayı sıfırla` stays enabled on an empty canvas while zoom and fit are disabled (s4). B.5: "An empty molecule triggers no fit."
- **[ui] Item 28 guard.** Add a unit test that the TR upper-casing helper turns `iyot` into `İYOT`/`İyot`, so the check is no longer vacuous.
- **[tests] No regression guard for items 16, 22, 25 and 34.** Each of 16, 22 and 25 has survived four rounds. Add:
  - a unit test that the LibraryBody formula equals `conventionalFormula`;
  - a store/layout test that mobile's initial `inspectorOpen` is true at `peek`;
  - a test that the empty state exposes the two actions;
  - a test that `fatal` suppresses the context-loss overlay.
- **[build] Orbit log tooling.** `gauntlet/logs/r4-build-orbit-p95.mjs` needs a node with global `WebSocket` (node ≥ 22). Record the node binary path in the log header so a critic can reproduce the run.
