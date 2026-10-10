# Round 1 critique: UX / art direction / interaction, desktop 1440x900

Critic: independent, fresh context. Build judged: `dist/` (built 20:51, newer than every `src/` file). Interaction probes used a VITE_TEST_HOOK copy of the same source (`gauntlet/scratch/dist-hook`, 20:58) served statically, driven over raw CDP (headless Chrome, swiftshader, 1440x900, dpr 1, `?nointro`).

Evidence: screenshots in `gauntlet/critiques/r1uxd/`. Probe logs in `gauntlet/logs/critic-r1-uxd-s1.txt`, `-s2.txt`, `-s3.txt`, `-s3b.txt` and `-s4.txt`. The console stayed clean in every run: 0 errors, 0 warnings, 0 exceptions. The only logs were three.js "Context Lost/Restored", printed during the forced context-loss test.

**Verdict: FAIL. Score: 38/100.**

The 3D core is solid:
- Methane is real, centred and lit well.
- The 4 render modes are truly different.
- Orbit, pan, zoom, right-drag pan and F-reset all work.
- Click versus drag is correct: a 30 px orbit in the Atom tool makes no edit.
- Dragging an atom leaves the camera identical.
- Undo/redo enable states are correct, and the save status reacts to edits.
- MOL, XYZ and PNG downloads fire (`Metan.mol`, `Metan.xyz`, `Metan.png`).
- The library loads (46 entries, 7 categories) and adds 1 undo entry.
- The language switch flips `<html lang>` and the formatting.
- `?` opens the shortcut sheet, which agrees with `TOOL_KEYS`.
- Idle frames stay at 0 (frame 32 → 32 over 5 s).

Against the addendum MUST list, however, the desktop experience misses whole components (viewport HUD, hover tooltip, context-loss overlay, keyboard viewport focus). It recolours atoms on hover, which acceptance #10 forbids. Measurement lines are invisible and measurement labels use dot decimals. It also lets the Bond tool build divalent hydrogen.

## What works (verified)
| Check | Result | Evidence |
|---|---|---|
| Grid 48 / 1fr / 320 × 44 / 1fr / 26, no overflow | scrollW 1440 = innerWidth | s1 LAYOUT |
| Launch: methane, ball-and-stick, oblique, all 4 H visible | yes; bbox centre (−0.046, −0.062) NDC, within 5 % | s1-launch.png |
| Status bar: style, 5 atom, 4 bağ, selection | yes, live (`C #1`, `Bağ C-H`) | s1/s2 logs |
| Select C → Z = 6, coordinates (0,000; 0,000; 0,000), sp³, düzgün dörtyüzlü | yes (formatting issues below) | s1 INSP-C |
| Rotate, Pan, Zoom tool drags; cursors grab / move / zoom-in / crosshair | all change the camera as mapped | s2 log |
| Atom tool + O + click H → CH₄O, 32,04x g/mol; Ctrl+Z restores CH₄; redo works | yes (1 step) | s2 AFTER-O / UNDO / REDO |
| Render modes: radii ballstick 0.459/0.227, spacefill 1.70/1.20, stick 0.14, wire = points | distinct geometry | s3-styles-grid.png |
| H toggle hides H from render; counts unchanged | yes | s3 noH |
| Menu Esc returns focus to its trigger | yes ("Dosya") | s4 log |
| Toast for Delete with nothing selected | "Silinecek bir seçim yok." bottom-centre | s4-toast.png |

## Blocking

1. **[scene] Hover and selection recolour atoms and bonds** (B.4, C3, D.2, acceptance #10). `src/scene/moleculeRig.ts:125` lerps the hovered atom 22 % to white, `:141` 30 % in wireframe, and `:159` 30 % for a hovered bond and 12 % for a selected one. Measured C pixel at (584,479): rest (138,134,132), hovered (169,166,164). Compare `s1-launch.png` with `s1-hoverC.png`. This also breaks C4 render isolation: hover rewrites the atom and bond instance colours, not only the shells.
2. **[scene] The selection shell is not the two-tone spec.** It is a single accent BackSide shell (`moleculeRig.ts:61`, `shellMat`), drawn as a ~10 px solid cyan halo. There is no 1 px `surface-0` inner rim and no ~2 px accent outer rim (C3, D.2, #10). See `s2-selC-away.png` and `s2-selBond.png` (the bond shell is two thick cyan slabs).
3. **[ui] No hover tooltip exists** (B.4 MUST: "C · Karbon · 4/4 bağ", bond "C–H · Tekli bağ (σ) · 1,090 Å"). After a 900 ms hover on C, `document.querySelectorAll('[role=tooltip]')` returned `[]`. `grep hovered src/ui` finds 0 hits, so the hover state never reaches the UI. Hovering only brightens the atom (item 1).
4. **[ui] The viewport HUD is missing** (D.6.4, B.5 MUST). There is no render-style segmented control on the canvas and no Fit/Reset control at the bottom right. `src/ui/ViewportHost.tsx:85-105` renders only the canvas, `EmptyHint` and `ToolOptions`. Styles can be reached only through the View menu, and Reset only through the rail or F.
5. **[scene] Measurement dashed lines and arcs are depth-tested and hidden inside bonds.** C/B.6 MUST: "Lines/labels render on top (`depthTest: false`)". `dashMat` is created at `moleculeRig.ts:62` without `depthTest:false`, and the dash segments are 0.02 Å cylinders (`:263`), so they sit inside the bond cylinders. In `s2-measure-angle.png` and `s2-measure-dihedral.png` no dashed H–C / C–H line is visible, and the angle arc is half-swallowed by the C sphere. The per-pair distance labels ("1,090 Å") are also absent in the angle and dihedral states.
6. **[scene] In-scene measurement labels use dot decimals**: "109.5°" and "-120.0°" in the screenshots. `src/scene/measureGeometry.ts:18-19` still uses `toFixed` (§E12, A2.3, acceptance #28: decimal commas everywhere).
7. **[ui] DOM measurement readouts break the precision and wording rules** (B.6, #5):
   - "109,47°" and "−120,00°" have 2 dp and a U+2212 minus; the spec wants `109,5°` and `-120,0°`.
   - There is no "φ =" and no `Model koordinatlarından ölçülmüştür` footnote.
   - The status bar never shows progress ("1/4 atom seçildi", "Mesafe … · Açı …"). The hint text stays static throughout (s2 M1–M4 logs).
8. **[ui] Inspector numbers break the A2.3 precision table** (#2, #4, #19 wording):
   - Molar mass shows `16,043 g/mol` (`src/ui/Inspector.tsx:148` uses `fix(props.mass, 3)`); acceptance #2 requires `16,04`.
   - Composition shows `74,9%` (`:79`, 1 dp, no thin space); the spec wants `74,87 %`.
   - Atomic mass shows `12,0110 u`; #4 wants `12,011 u`.
   - Gasteiger shows `−0,078` (3 dp, U+2212); the spec wants 2 dp with the formatter's hyphen-minus.
9. **[ui] The Lipinski section shows an overall verdict**, "Üç kuralı da sağlıyor", in green (`src/ui/i18n.ts:241`, seen in `s1-launch.png` and `s3-view-menu.png`). This is forbidden by A.5, #19 and #20. The required qualifier is `3 / 4 kural değerlendirildi (logP hesaplanmıyor)`, with no verdict.
10. **[ui] Hydrogen's atom card renders forbidden or invented values.** It shows Hibritleşme `s` and Geometri "Uç atom" (`s4-bond-armed.png`, `Inspector.tsx:331`). A4.2: `'s'` is never rendered (the row is hidden), and SN ∉ 2–4 must be `hesaplanamadı` (#30).
11. **[ui] Terminology and formula convention do not match A.6/A2.1** (#16):
    - The header reads "Molekül formülü (Hill)".
    - The library lists ammonia as `H₃N` and SO₂ as `O₂S` (`s3-library.png`) instead of primary `NH₃` / `SO₂` with Hill in a tooltip.
    - Labels read "Molar kütle" (`i18n.ts:211`) instead of `Mol kütlesi`, "Biçimsel yük" (`:278`) instead of `Formal yük`, and "Doymamışlık derecesi" without "(halka + π bağı)".
12. **[chem-core] The Bond tool builds divalent hydrogen.** In methane, Bond tool, click H#2 then H#3: bonds go 4 → 5, ring count becomes 1, and the only feedback is a "Değerlik aşıldı" toast (`s4-bond-HH.png`, s4 log). `src/store.ts` `clickAtom` case `'bond'` (≈ l.470-481) pushes the bond unconditionally. Meanwhile `growFrom` (l.285-287) already refuses a second H bond with `hydrogenSingleBond`. The two paths disagree, and the result is a chemically impossible structure. B.3: for an already-bonded H, "release does nothing".
13. **[chem-core] The Delete tool on a hydrogen is a visible no-op while Oto-H is on.** Clicking H id 3 removes it, and `fixH` immediately re-adds an H in the same slot with id 12 at the identical pixel (809,621). The molecule stays CH₄O, but an undo entry is added (s2 ATOMS2 → ATOMS3; `crop-delhover.png` and `crop-afterdel.png` are identical). SPEC §3B: "Do not display tools as functional if they do nothing". Either skip auto-H refill on an explicit H delete, or explain the refill.
14. **[scene] Switching render style moves the camera.** Camera positions: ballstick [1.652,1.437,4.588], spacefill [3.213,2.738,8.925], stick [1.609,1.401,4.468], back to ballstick [1.652,…]. `render.geometries` also goes 17 → 18 on the first wireframe switch (s3 STYLES). Acceptance #8: 20 switches leave the camera and geometries unchanged.
15. **[scene] The zoom clamp was not migrated (§E13, #35).** Thirty wheel notches stop at 1.694 Å from the target on methane, which is fit 5.083 / 3. `src/scene/CameraRig.tsx:225-226` still uses `fit.distance / ZOOM_IN_FACTOR` and `× ZOOM_IN_FACTOR` (`theme.ts:21`); the spec requires min 1.5 Å absolute and max 12 × fit radius.
16. **[ui] The keyboard model is incomplete** (B.4, D.10, #26):
    - The canvas has `tabIndex = -1`, so Tab never reaches the viewport. The observed Tab order is rail actions → inspector → header → rail tools, with no viewport and no HUD.
    - No `role="toolbar"` and no roving tabindex: all 15 rail buttons are separate tab stops.
    - No sr-only `aria-live` region announces selections or edits.
17. **[ui] No WebGL context-loss overlay** (B.9, #23). After `WEBGL_lose_context().loseContext()`, `main.innerText` is empty and `s4-ctxlost.png` shows a blank viewport. `src/scene/Viewport.tsx:75` only calls `preventDefault`; there is no `app.viewRestarting` overlay and no 3 s reload button. Restore did bring the 5 atoms back.
18. **[ui] The save indicator wording and spinner are wrong** (D.6.1, §E7, §E14, #35). It reads "Kaydedildi · az önce" instead of `Tarayıcıda kaydedildi` (`i18n.ts:36`), and the `Loader2` spinner is still in `src/ui/TopBar.tsx:45`.
19. **[ui] The empty state lacks viewport buttons** (B.9). The viewport shows one line of text; the two real buttons exist only in the inspector (`s3-empty.png`, `ViewportHost.tsx:64-74`). With the inspector collapsed, they disappear.
20. **[ui] Tool options strip is incomplete** (B.2, D.6.3). `ToolOptions` returns null unless the tool is atom or bond (`src/ui/Toolbar.tsx:174`):
    - Measure has no options (no live readout, no `Temizle`).
    - Atom has no Oto-H switch.
    - Bond has no `İlk atomu seçin` / `İkinci atomu seçin · Esc iptal` hint.
    - The panel is a ~150 px floating card, not the ~36 px strip.
21. **[ui] Tool rail states and grouping are off spec** (D.6.2, B.2):
    - The active state is a fill plus a 1 px ring all round (`src/ui/controls.tsx:10`), with no 2 px accent bar on the inner edge.
    - There is no divider between the Navigation and Edit groups. The only divider separates the tools from seven extra action buttons (`Toolbar.tsx:95-98`).
22. **[build/ui] Forbidden literals remain** (D.1, D.5, D.9, §E9/E10, #27):
    - Hex literals in tsx: `src/ui/icons.tsx:43,48-51` (logo `#9aa1ab`, `#e6e8eb`, `#5ec8e5`) and `src/ui/controls.tsx:167` (`hover:bg-[#7ad4ec]`).
    - `strokeWidth 1.6` at `icons.tsx:43` and `Toolbar.tsx:142`; the spec requires 1.75.
    - `.viewport-bg` uses `#15171b / #0d0e11 / #0a0b0d` (`src/index.css:119`) instead of the mandated `#121419 → #08090b` mirror of theme.ts.

## Improvements (art direction and interaction)
- **Framing is too tight.** `FIT_FILL = 0.88` (`theme.ts:20`) makes methane fill 82 % of the viewport height, and ethylene almost touches every edge (`s3-ethylene.png`). There is no breathing room for HUD chips or labels; ~0.7 reads as a calmer, more premium workspace.
- **The rail is crowded and ambiguous.** It holds 15 stacked buttons:
  - The Zoom tool (ScanSearch) and Reset camera (Focus) are near-identical bracket glyphs a few slots apart.
  - Zoom in and Zoom out duplicate the Zoom tool.
  - Spec defaults: `ZoomIn` for the zoom tool; camera actions belong in the bottom-right HUD.
- **Menu triggers put the chevron between the icon and the label** ("📄 ⌄ Dosya"; `TopBar.tsx:135`). It should follow the label or be dropped.
- **The selection ring (~10 px) and the angle arc are heavy.** They read as clip-art next to the refined chrome; thin, screen-constant rims (C3 SHOULD) would fix this.
- **Over-valence uses red "!" disc badges** instead of the specified thin danger ring.
- **The inspector header stays "Molekül"** in atom, bond and measure contexts. Name the context, or drop the duplicate header.
- **The status bar camera text is inaccurate.** It says "özel görünüm" at launch, before any interaction, and shows "10,83 Å" on an empty canvas.
- **The B key is a trap.** In the Atom tool, `B` selects boron as the spec says, but the tooltip and cheat sheet advertise B = Bond. A one-line hint in the Atom options would prevent the surprise: in testing, pressing B made two accidental boron atoms.
- **Library search for "etilen" ranks Sülfürik asit first** (`s3-library-search.png`).
- **Atoms placed outside the frame give no cue.** After growing O, the new H lands at screen y = −15 (off-canvas); there is no auto-frame and no hint.
- **The Delete tool sets `cursor: not-allowed` on `<main>`.** That reads as "forbidden". The spec wants a crosshair with a danger hover, and no danger shell appears on hover either.
- **Element composition bars** are borderline "decorative chart" (D.9 #6). The percentage text alone is enough.
- **The footer is 26 px, not 24 px.** The rail tooltip at 12 px with a kbd chip is good.

## Not verified here (other lenses)
Mobile and tablet layouts, the reduced-motion timing, performance budgets and the full science oracle set were left to the other critics.
