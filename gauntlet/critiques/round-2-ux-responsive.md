# Round 2 critique: responsive, accessibility and motion

Critic: independent, fresh context. Judged against SPEC.md (the original spec plus ENHANCEMENT ADDENDUM v1 and the MUST-v1 checklist), GOAL.md and BRIEF.md.
Artifact: HEAD `6a002eb` with a clean working tree. `dist/` (22:02) is newer than every file in `src/` (latest 21:59), so I did not rebuild. No source was edited.

**Verdict: FAIL. Score 55/100** (round 1: 44).

Round 1 fixed real problems:
- The tool rail is now `role="toolbar"` with roving tabindex.
- The canvas has `tabIndex=0`, and the Tab order is top bar → rail → canvas → HUD → inspector.
- An sr-only polite announcer exists ("Seçildi: C, Karbon, 4 bağ").
- The HUD has Fit and Reset.
- The tablet drawer is in flow, collapsed in portrait and open in landscape.
- Long-press tooltips work on the rail.
- The phone info sheet rests above the dock instead of covering it.
- A modal sheet now stacks above the info sheet (z 85 over z 75).
- The compact 40 px top bar works when height is under 500 px.
- The rail is 48 px and turns into two columns on short screens.

The mobile and tablet interaction model still fails most D.8 MUSTs:
- The breakpoints are unchanged.
- The phone dock still hides Measure.
- The sheet is closed at launch, never rises to half, can be dismissed with Esc or a swipe, has no accessible grabber and no scrim at full.

New in this round:
- The canvas focus ring is invisible (CSS specificity).
- Opening the tablet drawer clips the molecule, because there is no re-fit on resize.
- A live switch to EN leaves the canvas `aria-label` in Turkish.

## Method / evidence

- Server: `npx vite preview --port 4196 --strictPort`. Port 4192 was taken by a sibling critic's hook build (`--outDir gauntlet/scratch/dist-hook`), which I left alone. My server is killed, and so are the headless Chrome profiles.
- Driver: a raw-CDP Node driver (`scratchpad/r2/drv.mjs`, `run1..4.mjs`). It sets device metrics, touch emulation (`pointer: coarse` true on touch runs) and `prefers-reduced-motion: reduce`, then does DOM evaluation, touch/key input and screenshots.
- Raw results: `gauntlet/critiques/r2ux-resp/run1..run4.json` plus PNGs (`r1-*`, `r2-*`, `r3-*`, `r4-*`).
- Summaries: `gauntlet/logs/critic-r2-resp-run{1,2,3}-summary.txt`, `critic-r2-resp-run{1..4}.log`.
- Viewports: 360×740, 390×844, 768×1024, 820×1180, 1024×768 (both touch and mouse), 1366×768, 1366×1024 (touch), 1920×1080 and 844×390 (phone landscape). Each was run in TR and EN, with reduced motion on.
- Console: 0 messages and 0 exceptions in all four runs (`logs: []`).

### Passes (do not regress)

- **Overflow:** `documentElement.scrollWidth == innerWidth` at all 9 viewports in TR and EN (run1). The 390×844 run also checked with the sheet, menus and dialogs open.
- **Icon names:** every visible icon-only control has a localized accessible name (`noName: []` everywhere).
- **Tab walk at 1366×768** (run2 `kbd`): top bar (8 stops) → rail (one stop, "Seç") → canvas → HUD (style radiogroup, zoom ±, Sığdır, Kamerayı sıfırla) → inspector. Every stop except the canvas shows a 2 px outline.
- **Tool keys:** `V R P Z D M` switch tools. `A` then `B` correctly stays in the Atom tool, because B is boron there (B.7).
- **Reduced motion:**
  - The sheet sits at its final position 50 ms after the tap (`reducedSheet50ms`).
  - The drawer and dialogs use `duration: 0`.
  - CSS durations collapse to `0.01ms`.
  - Scene springs are skipped (`MoleculeLayer.tsx:56`).
  - No spring, bounce or pulse animations exist anywhere (`rg spring|bounce|animate-pulse` returns no UI hits).
- **EN at launch:** no Turkish in visible text, `aria-label` or `title` at any viewport (run1 `trHits: []`).
- **Molecule above the half sheet:** at the half detent (sheet top 379), methane is visible above the sheet edge (`r4-m390-half.png`). The view offset works, but the molecule shrinks to about half size.
- **Tablet long-press:** a 750 ms touch on "Seç" shows the tooltip "Seç V" (`r2-t820-2-longpress.png`).
- **Menu kbd chips** are hidden on coarse pointers (`Menu.tsx:115`).

---

## BLOCKING

### B1 [ui] Breakpoints still contradict D.8; 1024×768 desktop users get the tablet model
`src/ui/layout.ts:5-6` still says `desktop >= 1200, tablet 768-1199, mobile < 768`. D.8 MUST says mobile < 640, tablet 640–1023, desktop ≥ 1024.
- Repro: 1024×768 with a mouse (no touch) gives `data-layout="tablet"` and `--hit: 44px` (run2 `d1024`, `r2-d1024-mouse.png`).
  - The header is 52 px instead of 44.
  - The inspector has a close X rather than a collapse control.
  - The width is not persisted as a desktop preference.
- Widths of 640–767 px get the phone model (dock plus bottom sheet), not the tablet model.
- The scene copies the wrong breakpoint: `CameraRig.tsx:181` uses `(max-width: 767.98px)`.

### B2 [ui] Phone dock still scrolls 8 tools; Measure is invisible (D.8 MUST: 6 buttons Select, Atom, Bond, Delete, Measure, More)
`Toolbar.tsx:143-153` renders all of `TOOL_ORDER` in an `overflow-x-auto no-scrollbar` strip, plus "Eylemler".
- At 390×844 the toolbar has `scrollWidth 382 / clientWidth 333`. Measure (x 330–374) is `visible:false` (run4 `dock`).
- At 360×740 it is `382/303`, and Delete is half-clipped (`r1-m360-tr.png`).
- There is no scroll affordance. Rotate, Pan and Zoom take 3 of the 7 visible slots, even though one-finger orbit works in every tool (the reason D.8 puts them under More).

### B3 [ui] Mobile bottom sheet: launch state, detents, Esc, swipe, grabber and scrim all violate D.8 / checklist 25
Files: `App.tsx:141`, `App.tsx:153-163`, `BottomSheet.tsx`.

1. **Not at peek on launch** (checklist 25: "mobile launches with the sheet at peek"). `App.tsx:141` calls `setInspectorOpen(... : false)` for mobile. Run1/run2 `m0.sheet: null`. The phone shows no formula or molar mass until (i) is tapped (`r1-m390-en.png`).
2. **Selection does not raise peek → half.**
   - Tapping C opens the sheet at peek (`r2-m390-1-tapC.png`, visible height 132).
   - `App.tsx:160` hard-codes `setInfoSnap('peek')`, and only does it for the Select tool when the sheet is closed.
   - The peek row on selection reads "Karbon #1 · 5 atom · 4 bağ", with no molar mass.
3. **Esc and swipe dismiss the sheet entirely** ("never dismissed below peek; Esc/Back drops one detent").
   - Esc from peek gives `sheet: null` (run2 `m2_esc`).
   - Esc from half gives `null` (run4 `afterEscTop: null`).
   - Esc from full gives `null` (run3 `escFromFull`).
   - Swipe down from peek gives `null` (run3 `swipeDownFromPeek`).
   - Code: `BottomSheet.tsx:75-79` calls `onClose()`; `:107,:111` makes `'closed'` a snap stop; the X button at `:152-159` also closes it.
4. **Grabber is not an accessible control.**
   - `BottomSheet.tsx:149` is `aria-hidden="true"`, with no `role="button"` naming the detent (run3 `grabber: {ariaHidden:"true", role:null}`).
   - Keyboard and screen-reader users cannot raise the sheet past peek.
   - Dragging is the only way to change detent, which fails WCAG 2.5.7.
5. **Detents and scrim.**
   - `PEEK_PX = 132` (`:27`). The spec says ≈ 72 px + safe area.
   - Half is `0.5` of the space above the chrome, and full is `0.9` (`:26`). The spec says ≈ 45 dvh / ≈ 88 dvh.
   - Full shows **no scrim**: run3 `afterDragFull.scrim: 0`, `r3-m390-1-dragup.png`. The spec says full has "a scrim that returns to half".

### B4 [ui/scene] Viewport keyboard focus ring is invisible (B.4 MUST, checklist 26 "visible rings")
`src/index.css:138-143` sets `#viewport canvas { outline: none }`, at specificity 1,0,1. That beats the injected `[data-viewport="3d"] canvas:focus-visible { outline: 2px solid … }` from `scene/Viewport.tsx:49` (specificity 0,2,1).
- Repro: at 1366×768, Tab until the canvas has focus. `:focus-visible` is `true`, but the computed `outline` is `none 3px` (run3 `canvasFocus`; run2 `kbd` stops 10 and 34; `r3-d1366-canvas-focus.png`).
- Keyboard users cannot see that the viewport is focused, at any layout.

### B5 [scene] No re-fit on large viewport resize; opening the tablet drawer clips the molecule (B.5 MUST, D.8 Tablet MUST)
B.5 says "an orientation change or a viewport resize > 20 % in width re-fits the camera". `CameraRig.tsx:300-308` re-frames only while `performance.now() < s.pristineUntil`, which is the settling window right after the first framing.
- Repro: at 820×1180 (touch, reduced motion), tap (i). The canvas narrows from 772 to 452 px (−41 %, run2 `t0`/`t1`).
  - Methane is cut off at both edges: the left H is clipped by the rail, and the right H by the drawer (`r2-t820-1-drawer.png`).
  - D.8 Tablet asks for the molecule to be "kept centred in the uncovered area". It is centred, but not visible.
- The same missing re-fit applies to a phone rotation and to desktop inspector toggles.

### B6 [ui/scene] Phone landscape: the HUD covers the molecule at launch
At 844×390 (tablet model, drawer open in landscape), the canvas is only 424×324 px (run4 `landCanvas`). The HUD wraps into two stacked rows:
- the style control at y 258–298;
- the camera group at y 306–352, x 112–391.

Together they occlude the lower-left H of the freshly fitted methane (`r4-l844.png`, `r1-l844-en.png`).
- Fit (`FIT_FILL`) ignores the HUD footprint, and the HUD does not compact on short screens.
- Result: the "molecule centred in the uncovered area" outcome fails on a phone in landscape.

### B7 [ui] Touch targets below 44 px on coarse pointers (D.4 / D.8 MUST "(pointer: coarse) forces --hit: 44px")
1. **No coarse-pointer rule.** `index.css:107-120` keys `--hit` only on `data-layout`.
   - A 1366×1024 touch screen (iPad Pro landscape) gets `--hit: 32px` (run1 `p1366t-en`): undo/redo/settings/info and all rail buttons are 32×32.
   - Phone landscape forces `--hit: 40px` (`index.css:115-119`, run1 `l844`: all rail and top-bar buttons 40×40).
2. **`Segmented` is `min-h-[calc(var(--hit)-6px)]` = 38 px** (`controls.tsx:92`), which is below 44 on every touch layout. Affected:
   - the HUD style control (`Top-Çubuk 92×38` at 390×844; `74×38` at 768×1024);
   - phone bond order (`Tekli/Çift/Üçlü 38×38`, run2 `m9`);
   - settings Language and Motion (`Türkçe 57×38`, `Azalt 48×38`, `Tam 43×38`, run3 `settingsCtrls`).
3. **The settings `Switch` is 36×20 on every layout** (`controls.tsx:211` `h-5 w-9`, run3 `settingsCtrls`). That is below the 24×24 desktop minimum (D.4, WCAG 2.5.8) as well as the 44 px touch size. This was round-1 B12 and is unchanged.

### B8 [ui] i18n: live language switch leaves the canvas name in the old language
`scene/Viewport.tsx:129` sets the canvas `aria-label` once, in `onCreated`. Switching TR → EN through Settings leaves `aria-label="3B molekül görünümü"` on the canvas (run3 `enTrHits: ["aria-label:3B molekül görünümü"]`). The canvas is the main focus target of the Tab order, so EN screen-reader users hear Turkish there. EN → TR has the same problem.

### B9 [ui/scene] Touch long-press quick actions still go nowhere (B.12 MUST)
B.12: "the existing touch long-press quick actions (change element / delete) reach the same actions". `scene/Interaction.tsx:211` dispatches `ATOM_LONG_PRESS_EVENT`, but `rg ATOM_LONG_PRESS_EVENT src` finds only the dispatcher and its definition (`pickApi.ts:19`). Nothing in `src/ui` listens, so a touch long-press on an atom does nothing beyond selecting it. This was round-1 B14 and is unchanged.

### B10 [ui] Checklist #36 still fails by direct check
`rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 1 hit: `src/ui/LibraryBody.tsx:11` (`.replace(/ı/g, 'i')`). The checklist requires 0. `'ı'` would satisfy it with identical behaviour.

---

## IMPROVEMENTS (non-blocking)

1. [ui] **Phone overflow menu.**
   - It is a 20-item scrolling list (`menu scrollHeight 591 / clientHeight 558`, `r3-m390-4-more.png`) with Library, Settings, every File item and every View item.
   - D.8 names "View, Settings, Info"; grouping View/File into submenus would shorten it.
   - The `Ctrl+S` kbd node is present but CSS-hidden, which is fine.
2. [ui] **Phone element picker.** The 14 chips scroll horizontally with a hidden scrollbar (`no-scrollbar`, `Toolbar.tsx:206`). At 390 px only H C N O F are visible, with a clipped sixth chip (`r2-m390-9-atomtool.png`). Add an edge fade or wrap the chips to two rows so Cl/Br/S/P are discoverable.
3. [ui] **Top bar height.** The top bar is 52 px (+ safe area) on phone and tablet (`TopBar.tsx:183,196`). D.6.1 says ~44 px, and the phone viewport is the priority.
4. [scene] **Half-detent shrink.** At half, the view offset also sets `camera.zoom` to `(h−cover)/h` (`CameraRig.tsx:355-357`), which shrinks methane to about 45 % (`r4-m390-half.png`). D.8 says "no zoom jump", so prefer a target shift that keeps the scale.
   - `sheetCover()` (`CameraRig.tsx:181-188`) recomputes sheet heights from `vh`, ignoring the chrome inset that `BottomSheet` subtracts (`bottomInset`).
   - At peek it therefore estimates about 32 px of cover when the real cover is 132 px. Read the real sheet geometry from `uiStore` instead.
5. [ui] **Inspector content swap** animates `y: 4` (`Inspector.tsx:584-588`). D.6.5 says opacity-only (≤ 120 ms), and the duration here is 180 ms.
6. [ui] **Toast placement and announcements.**
   - On phones the toast sits at `chromeBottom + 140` regardless of the sheet detent (`ToastHost.tsx:33`). At half or full it lands on top of sheet content; anchor it to the sheet's top edge.
   - The `role=status` node mounts together with its text, so some screen readers skip it. Keep a persistent live region.
7. [ui] **Global `:focus-visible` radius.** The rule sets `border-radius: var(--radius-ctl)` on every focused element (`index.css:91-95`). That changes the shape of fully-rounded or 12 px elements while they are focused. Set the radius only where needed.
8. [ui] **Sheet title duplicates the label.** The info sheet header reads "Molekül" while an atom is selected, duplicating the inspector title. Name the detent or selection instead, which pairs with the B3.4 grabber label.
9. [ui] **Unit wrapping.** At 844×390 the monoisotopic value wraps its unit onto its own line ("16.0313 / u", `r1-l844-en.png`). Add `whitespace-nowrap` on values.
