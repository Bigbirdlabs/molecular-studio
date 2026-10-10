# Round 1 critique: acceptance checklist audit (fresh-context critic)

Artifact: D:\molecular-studio @ 1c6453b (clean tree except gauntlet/intro). Judged against SPEC.md (original + ENHANCEMENT ADDENDUM v1, "Acceptance checklist (MUST-v1)" items 1-36) and SPEC §10 (items 1-10).

## How it was checked
- `tsc --noEmit` (exit 0), `vitest run` (8 files / 267 tests pass), `VITE_TEST_HOOK=1 vite build --outDir gauntlet/scratch/dist-hook` (exit 0). Logs: `gauntlet/logs/critic-checklist-{tsc,vitest,hookbuild}.txt`.
- `vite preview` of the hook build on :4193 (killed afterwards), driven with Python Playwright + installed Chrome (swiftshader). URLs used `?nointro&test`. Scripts in the session scratchpad; output in `gauntlet/logs/critic-checklist-audit{,2,3}.txt`, raw JSON in `gauntlet/scratch/critic-checklist/results{,2}.json`, screenshots in `gauntlet/scratch/critic-checklist/*.png`.
- Code reading of src/chem, src/store.ts, src/scene, src/ui.

## Score
Checklist MUST-v1: **10 / 36 pass**. SPEC §10: **10 / 10 pass**. Combined **20 / 46 = 43 %**. Verdict: **FAIL**.

Root cause in one line: most of the §E MUST migrations (1, 2, 3, 5, 6, 7 partly, 8, 9, 10, 12, 13, 14, 15) were not applied, so every checklist item that depends on them fails.

---

## Acceptance checklist (MUST-v1), item by item

| # | Result | Evidence |
|---|---|---|
| 1 | **FAIL** | Build/tsc/vitest green, but `tokens.test.ts` does not exist anywhere (`find src tests -name "tokens*"` = none), and `tests/science.test.ts` (99 lines) covers only fragments of A.7: no #2 monoisotopic, #3 composition, #5 DoU set, #7 A4.1 molecules, #8 bondTargetLength values, #9 dihedral, #11 `el('Fe')` throws / `isKnownElement('__proto__')`, #12 element snapshot, #14 round trip in science.test (grep for `isKnownElement`, `16,04`, `74,87`, `Desteklenmeyen`, `__proto__` in tests/ = 0 hits). #1 uses raw `toBeCloseTo(…,2)`, not the formatter strings. |
| 2 | **FAIL** | Launch is methane, fitted, oblique, ball-and-stick, status "Top-Çubuk · 5 atom · 4 bağ" (01-launch-1366.png). Inspector shows **`16,043 g/mol`**, spec requires `16,04 g/mol` (A2.3 d=2). Label reads "Molar kütle", spec "Mol kütlesi" (A2.4/A.6). |
| 3 | PASS | `store.ts:206` returns null for 0-atom restore; `parseStoredMolecule` rejects unknown symbols (`store.ts:166`) → `methane()`; `?m=metan` → `replaceMolecule`, history 0 (audit past=0 on every `?m=` load). (A1.1 restore message is not shown, see A-section.) |
| 4 | **FAIL** | Click C: Z 6, coordinates `0,000` ok, but atomic mass **`12,0110 u`** (spec `12,011 u`), and no `AX₄` notation anywhere on the card ("Sterik sayı 4", "Düzgün dörtyüzlü", "sp³", "0" only). audit.txt `clickC.inspector`. |
| 5 | **FAIL** | DOM distance `1,090 Å` ok. Angle DOM **`109,47°`** (spec 1 dp `109,5°`); dihedral DOM **`−120,00°`** (2 dp, U+2212, no `φ =`). Scene labels use a **dot decimal**: `109.5°`, `-120.0°` (04-measure-angle.png, 05-measure-dihedral.png) because `scene/measureGeometry.ts:18-19` still uses `toFixed` (§E12 not done). Footnote "Model koordinatlarından ölçülmüştür" absent (body text grep). No dashed lines/midpoint distance labels visible for the angle/dihedral chain (only arc + badges). Status bar shows only the hint, not "Mesafe 1,090 Å · Açı 109,5°" (B.6). |
| 6 | **FAIL** | A, O, click H → `CH4O`, C–O = 1.4300 Å, Ctrl+Z restores CH₄ with past 1→0 (one step) — but the mass shows **`32,042 g/mol`**, not `32,04`. |
| 7 | PASS | Atom tool, 30 px drag from empty space: atoms 5→5, past 0→0 (`drag30.atomtool`). |
| 8 | **FAIL** | Radii differ (ballstick C 0.459/H 0.227; spacefill 1.70/1.20; stick 0.14; wireframe points), camera identical and textures 5→5 after 20 switches — but `render.geometries` **17 → 18** in a clean session (`style20.clean`, audit2.txt; 18→19 in the first run). One geometry is allocated lazily on first switch; spec says unchanged. |
| 9 | PASS | `scene/bondLayout.ts:31-36` derives the offset from neighbour plane; `tests/scene.test.ts:189` asserts ethylene strands in plane z=0. |
| 10 | **FAIL** | Hover **recolours** the atom: `moleculeRig.ts:125` `atomColor(e, …, hovered ? 0.22 : 0)` lerps toward white (visible in 02-hover-C.png: C turns light grey); hovered bond +0.30, selected bond +0.12 lighten (`moleculeRig.ts:159`). Selected shell is a single accent BackSide sphere (`shellMat`, line 61), not the two-tone surface-0 + accent rim (C3/D.2). No hover shell, no hover tooltip (`[role=tooltip]` empty while `hovered=1`). |
| 11 | PASS | `render.frame` 42 → 42 over 5 s idle. |
| 12 | **FAIL** | Draw calls methane 3 vs tristearin 3 (ok); 20 new/undo cycles keep geometries 17 / textures 5 (ok). No tristearin orbit p95 frame-time log exists in `gauntlet/logs/` (only `critic-r1-code-*` files from another critic). |
| 13 | PASS | After a settled scene, dragging an H in Select leaves `camera.position` bit-identical (`dragAtom.clean`). |
| 14 | PASS | Zero console warnings/errors/pageerrors across launch, hover, click, measure, style switch, grow, undo, library, dialogs, import, context loss, 12 responsive loads. |
| 15 | **FAIL** | Fe/Se/D XYZ imports are rejected and the molecule stays CH₄, but the message is `Dosyada desteklenmeyen element var: Fe.` (no "Desteklenen: H, B, …" list) and D is reported as an **element** (`… element var: D.`), not `Desteklenmeyen izotop: D` (A1.1). |
| 16 | **FAIL** | Ammonia primary formula shows **`H3N`** under "Molekül formülü (Hill)"; SO₂ shows **`O2S`**; BF₃ ok. No `CONVENTIONAL_FORMULA` exists; `conventionalFormula()` (molecule.ts:148) is not used by the inspector and its ordering is wrong anyway (H₃PO₄ → `PH₃O₄`, HNO₃ → `NHO₃` because P/N rank before H in `CONVENTIONAL_ORDER`). Library still lists ammonia as `H₃N — …` (§E5 not done). |
| 17 | **FAIL** | Bare C₂: inspector shows `24,022 g/mol` and only "C #1: değerlik eksik (1 bağ yapıyor; olması gereken: 4)" at the bottom — no "Yapı eksik: 6 H eksik — değerler çizilen atomlar içindir", no `Hidrojenleri tamamla` beside the values (A2.2). 5-bond N gives "değerlik aşıldı (5 bağ yapıyor; en fazla 3)", not "Geçersiz değerlik: N (5/3)"/"N atomu en fazla 3 bağ yapabilir (şu an 5)". |
| 18 | PASS | H₂O O–H 0.9578 Å / 104.48°; NH₃ N–H 1.0120 Å / 106.67°; CO₂ C=O 1.1600 Å (within ±0.005 of 1.162). |
| 19 | **FAIL** | Monoisotopic `16,0313 u` ok; H₂SO₄ has no DoU row ok; but Lipinski shows the overall verdict **"Üç kuralı da sağlıyor"** with no `3 / 4 kural değerlendirildi (logP hesaplanmıyor)` qualifier (every molecule). |
| 20 | **FAIL** | `Tahmini` badges present on aromatic ring, H-bond counts, functional groups, VSEPR/hybridisation/LP, Gasteiger. But an overall Lipinski verdict appears (see 19); `properties.ts:960` still computes `lipinski.passes`. |
| 21 | PASS | No UI string value contains optimize/optimise/optimizasyon; action reads "Geometriyi düzenle (basit kuvvet alanı, yaklaşık)"; toast begins "Geometri düzenlendi …". Notes: the reduced-motion toast is a hard-coded Turkish literal (`store.ts:653`), so EN users get Turkish; toast key still `geometryOptimized` and comment "animated geometry optimisation" (`store.ts:122`) — §E6 incomplete. |
| 22 | **FAIL** | Undo/Redo `aria-disabled="true"`, opacity 0.4 when empty (ok); no `0 g/mol` (ok). The viewport shows only a hint sentence; the two buttons live in the inspector (24-empty.png), which is closed by default on tablet and mobile, so there the empty workspace has no buttons. Text differs from spec (`Tuval boş` / "tuvale dokunarak" on desktop vs `Çalışma alanı boş` / `Bir element seçip tıklayın…`); inspector omits "0 atom / 0 bağ". |
| 23 | **FAIL** | `loseContext()` → viewport shows nothing (empty text, 11-contextlost.png); no `3B görünüm yeniden başlatılıyor…` overlay, no 3 s `Yeniden yükle` fallback, no `app.viewRestarting` key (grep 0). Restore brings the same molecule back (ok). No-WebGL launch: message shown and inspector works (ok), but edit tools are **not** disabled (`Atom Ekle`/`Bağ Ekle`/`Sil` enabled). |
| 24 | PASS | Reduced motion: reset jumps camera in ≤2 frames (frame 980→982, position equal after); `cleanUp` runs synchronously (`store.ts:645-653`); autoRotate false and its menu item disabled with reason (`menus.tsx:54-55`). |
| 25 | **FAIL** | No horizontal overflow at all 6 viewports TR+EN (scrollWidth == innerWidth). But on mobile (360/390) the sheet is **not** at peek at launch: `inspectorOpen=false`, no sheet rendered (30-390x844-tr.png); App.tsx:118 sets the inspector closed for non-desktop. |
| 26 | **FAIL** | `V R P Z A B D M` (+E) switch tools; tooltip "Seç V" and `?` sheet agree (ok). Tab order goes top bar → rail → extra rail actions → inspector; the **viewport is never focused** (canvas has no tabIndex, `#viewport canvas { outline: none }` in index.css) and there is **no HUD** to tab to. Rail container is `role="group"`, not `role="toolbar"` with roving tabindex (each button tabIndex 0). |
| 27 | **FAIL** | `.viewport-bg` uses `#15171b → #0d0e11 → #0a0b0d` (index.css:119), not `#121419 → #08090b` (§E9). Hex literals in tsx: `controls.tsx:167` `hover:bg-[#7ad4ec]`, `icons.tsx:43-51` (`#9aa1ab`, `#e6e8eb`, `#5ec8e5`). strokeWidth `1.6` at `icons.tsx:43` and `Toolbar.tsx:142`; all Lucide icons are rendered without `strokeWidth`, i.e. Lucide's default **2**, so stroke widths are mixed (1.75 custom / 1.6 / 2). |
| 28 | **FAIL** | Scene measurement labels use dot decimals (`109.5°`, `-120.0°`, `measureGeometry.ts:18-19`). The shared formatter replaces `-` with U+2212 (`i18n.ts:780`, `Inspector.tsx:40`), contrary to precedence rule 5 (`-0,41`). No upper-casing surface exists, so "İYOT" cannot be demonstrated (no `toLocaleUpperCase` in src/ui). |
| 29 | **FAIL** | C → Si via `Elementi değiştir` is one undo entry, but the formula reads **`H4Si`**, not `SiH₄` (no conventional formula), and the molecule name stays "Metan". Formal-charge stepper goes to **+3 / −3** (`Inspector.tsx:272-274`), spec −2…+2. Nitro N⁺(=O)O⁻ builds with "Değerlik sorunu yok" (ok). |
| 30 | **FAIL** | Atom card renders `Hibritleşme — ` (literal "—") for a terminal/charged C (charge.up4 dump) — forbidden (A4.2, D.9 #10). Bond card: "C-H" with hyphen; polarity shows `Apolar` (not `apolar kovalent` + `kural (yaklaşık)` badge); reference length shown as "ideal 1,090" with no Referans tablosu row source tag (A3.1/B.12). Molecule card: no coordinate-source line, no net formal charge row, DoU tooltip says "Formülden hesaplanan" (A2.7 graph value), atomic mass 4 dp, composition 1 dp. |
| 31 | **FAIL** | Library: 46 entries, 7 categories, TR names, diacritic-insensitive search ("benzen" → 6 hits), loading = one undo entry (past 4→5) — but no per-entry coordinate-source line (entries show description, category, atom count only). |
| 32 | **FAIL** | MOL/XYZ/PNG menu items exist and io round-trip tests pass; import errors are localized and leave the molecule unchanged. With `context.set_offline(True)` the `PubChem’de ara` item is **still enabled** with no `Çevrimdışı: PubChem kullanılamıyor` (no `navigator.onLine` check anywhere in src). No `Kaynak: PubChem` attribution line in the inspector. |
| 33 | PASS | Settings: language, motion (system/reduce/full), Oto-H, shortcuts link, about notes. View menu: style radio, H/labels/charges/auto-rotate toggles, reset. No duplicated display toggle. |
| 34 | **FAIL** | Injecting `Xx` via `loadMolecule`: no error boundary at all — the inspector renders `HXx`, **`13,019 g/mol`** (Xx silently counted as carbon 12.011) and a composition row "Xx 92,3 %". This is exactly the fabricated-value path A1.1 forbids. `el()` still falls back to carbon (`elements.ts:66-68`); no `UnknownElementError`, no `getElement`; there is no Inspector boundary (only `ViewportHost.tsx:49`). |
| 35 | **FAIL** | Tristearin zoom stops at **30.10 Å** from the target (80 wheel steps) because the clamp is still fit ÷ `ZOOM_IN_FACTOR`=3 (`CameraRig.tsx:225-226`, §E13 not done). Save indicator keeps the `Loader2 animate-spin` spinner for `saving` (`TopBar.tsx:45`, §E14 not done) and reads **"Kaydedildi · az önce"**, not "Tarayıcıda kaydedildi". |
| 36 | **FAIL** | i18n key parity test passes, but the Turkish-character rg returns 2 hits: `src/ui/Inspector.tsx:36` (`'Yeni molekül'` literal) and `src/ui/LibraryBody.tsx:11` (regex literal `ı`). |

## SPEC §10 (original delivery requirements)

| # | Result | Evidence |
|---|---|---|
| 1 Complete workspace | PASS | Top bar, rail, viewport, inspector, status bar present (01-launch-1366.png); viewport HUD missing (see below). |
| 2 Interactive Three.js viewport | PASS | R3F canvas, demand frameloop, orbit/drag work. |
| 3 Valid 3D molecule | PASS | Methane exact tetrahedron, C–H 1.090, 109.47°. |
| 4 Ball-and-stick | PASS | default style. |
| 5 Additional mode | PASS | spacefill/stick/wireframe change geometry. |
| 6 Orbit/zoom/pan/reset | PASS | Works (zoom range limited, item 35). |
| 7 Atom selection + context | PASS | Click C → atom card. |
| 8 Explicit data model | PASS | `chem/molecule.ts` atoms/bonds with ids. |
| 9 Formula + mass | PASS | Hill formula and IUPAC mass computed (precision/convention issues above). |
| 10 Responsive, polished | PASS | Distinct desktop/tablet/mobile models, no overflow (mobile sheet issue item 25). |

---

## Other MUST violations found on the way (blocking)

1. **No viewport HUD** (D.6.4, B.5): no on-canvas render-style segmented control, no bottom-right Fit/Reset; B.10 step 4 ("choose Space-filling in the style control") is only possible through the View menu.
2. **`window.__studio` debug global** (`main.tsx:9-11`), present in the production bundle with `?test` — precedence rule 4: "No other global debugging hook is added"; the editor notes list `window.__studio` as dropped.
3. **A1.1 not implemented**: `el()` silent carbon fallback, no `getElement`/`UnknownElementError`, restoring a stored `Se` molecule silently falls back with no message. **A1.5/A1.6**: no `mono` field in elements.ts, `properties.ts:150` keeps its own `MONO_MASS` and `?? el().mass` fallback (`:882`), no provenance comments, `// CPK colour` comment unchanged. **A1.4**: `VALENCE_ELECTRONS` duplicated in properties.ts:145.
4. **A2.3**: `properties.ts:901` rounds `composition.percent` to 2 dp and the UI shows 1 dp (`74,9 %`, spec `74,87 %`); `partialCharge` rounded to 3 (`:680`). **A3.1**: `molecule.ts:252` `idealBondLength` still uses covalent sums (comment says C–C 1.52, C=C 1.33) instead of delegating to `bondTargetLength`. **A2.7**: DoU uses the formula with `Math.max(0, …)` clamp (`molecule.ts:222-229`).
5. **A4.1**: ethylene H–C–H is 118.52° (CCCBDB ≈117.6°, tolerance ±0.3°); per-entry CCCBDB structure type/access date and coordinate-source text are absent.
6. **B.4 hover tooltip** missing entirely; **C4 render isolation** broken: hover rewrites the full atom and bond instance colour buffers instead of only shells.
7. **D.8 tablet**: at 1024×768 (landscape tablet) the inspector starts closed; spec says open in landscape. Mobile bottom bar has Select/Rotate/Pan/Zoom/Atom/Bond/Delete/More (8) instead of Select/Atom/Bond/Delete/Measure/More (6); Measure is not in the bar.
8. **D.9 #4**: the "tidy geometry" action uses Lucide `Wand2` (a wand with sparkles), an "AI sparkle" icon (Toolbar.tsx:54).
9. **D.1.2 / D.7**: none of the added tokens (`surface-4`, `line-ctl`, `accent-subtle`, `on-accent`, `danger-solid`, `hud`, `hud-line`) or `--dur-*` tokens exist in index.css.
10. Status bar camera text says "özel görünüm" (custom view) at launch on the default view — a UI state that does not match the actual camera state (SPEC §8).

## Improvements (non-blocking)
- Composition bars in the inspector read as decorative charts (D.9 #6); a plain row would be calmer.
- Empty-state copy says "tuvale dokunarak" (touch wording) on desktop pointers.
- After `changeElement` C→Si the molecule keeps the name "Metan".
- Measure badge "2" is drawn over the front H rather than clearly at the C vertex in 04-measure-angle.png.
- `actions.ts:97` hard-codes `#0d0e11` for the PNG background; mirror `theme.ts` instead.

## Priority fix order (to flip the most checklist items)
1. Shared formatter digits per A2.3 everywhere (molar mass 2 dp, atomic mass as tabulated, angle 1 dp, dihedral 1 dp + φ, composition 2 dp, Gasteiger 2 dp, ASCII minus) and route `measureGeometry.ts` through it → items 2, 4, 5, 6, 17, 28.
2. elements.ts/molecule.ts/properties.ts migrations §E1-E3 (throwing `el`, `mono`, `CONVENTIONAL_FORMULA` exact lookup, unrounded percent, A2.2 note, Lipinski qualifier without verdict, AX notation, hide `—` rows) + inspector error boundary → items 16, 17, 19, 20, 29, 30, 34.
3. Hover/selection rendering per C3 (no lerp to white, two-tone shell, hover shell + tooltip) → item 10.
4. Context-loss overlay + no-WebGL tool disable, HUD with style control and Fit, canvas focus ring/tabIndex, `role="toolbar"` roving tabindex → items 23, 26.
5. Zoom clamp 1.5 Å / 12× fit, save indicator text and no spinner, PubChem offline + `Kaynak: PubChem`, library coordinate-source lines, import messages, mobile sheet at peek, tokens/strokeWidth/hex cleanup, `tokens.test.ts`, full `science.test.ts` oracle set, orbit p95 log → items 1, 12, 15, 22, 25, 27, 31, 32, 35, 36.
