# Round 3 critique: responsive, accessibility and motion

Critic: independent, fresh context. Judged against SPEC.md (the original spec plus ENHANCEMENT ADDENDUM v1 and the MUST-v1 checklist), GOAL.md and BRIEF.md.
Artifact: HEAD `190f5b3` ("Gauntlet round 2: fix critic findings"), clean tree. `dist/` was empty, so I rebuilt it once (`gauntlet/logs/critic-r3-resp-build.log`). No source was edited.

**Verdict: FAIL. Score 68/100** (round 1: 44, round 2: 55).

Round 2 fixed most of the layout problems:
- The breakpoints now match D.8 (`layout.ts:5-6`).
- The phone dock has exactly 6 buttons of 44 px.
- The canvas focus ring shows.
- The camera re-fits when the drawer opens.
- The canvas name follows a live language switch.
- The element picker wraps onto two rows.
- At the half detent the molecule sits above the sheet without shrinking.
- Phone landscape no longer hides the molecule behind the HUD.
- Coarse pointers at 1024 px get `--hit: 44px`.
- Checklist #36 returns 0 hits.

What still fails: the mobile bottom-sheet model is almost unchanged from round 2 (launch state, selection detent, Esc/swipe dismissal, grabber, scrim), several touch controls are still 38 px or smaller, touch long-press on an atom still does nothing, and the scene uses the old 768 px breakpoint for the sheet offset.

## Method / evidence

- **Server:** `npx vite preview --port 4197 --strictPort`. Port 4192 belonged to a sibling critic's hook build (`--outDir gauntlet/scratch/critic-r3-uxd2/dist-hook`), which I left running. My server and all my headless Chrome profiles are killed.
- **Driver:** a raw-CDP Node driver (scratchpad `r3b/drv.mjs`, `a.mjs` to `d.mjs`). It sets device metrics, touch emulation, `pointer: coarse`/`hover: none` on touch runs, and `prefers-reduced-motion: reduce` (also `no-preference` once). It then runs DOM evaluation, touch/key/mouse input and screenshots. EN runs write `molecular-studio:settings:v1 = {language:'en'}` on the app origin, then reload.
- **Raw results:** `gauntlet/critiques/r3ux-resp/{a,b,c,d}.json` plus PNGs (`a-*`, `b-*`, `c-*`, `d-*`). Logs: `gauntlet/logs/critic-r3-resp-{a,b,c,d}.log`.
- **Viewports:**
  - 360×740, 390×844, 768×1024, 820×1180, 1024×768 and 844×390 on touch;
  - 1024×768, 1366×768 and 1920×1080 with a mouse;
  - 700×1000 touch, to test the 640–767 band.
  - Each was run in TR and EN, with reduced motion on.
  - One TR 768×1024 page ignored the metrics override (it reported 1440 px). That is a CDP glitch; the EN run at 768×1024 is valid (tablet, no overflow).
- **Console:** 0 errors, 0 warnings and 0 exceptions across all runs (`logs: []`).
- The previous partial attempt's directory (`r3ux-resp/`, untracked) was replaced. Its EN runs were invalid: it set localStorage on a `chrome-error://` origin.

### Passes (do not regress)

- **Overflow:** `documentElement.scrollWidth == innerWidth` at every viewport in TR and EN (`a.json` `ov`). It also holds with the atom tool open at 360 and 390, and with the library sheet open at 390 (`b.json`, `d.json`).
- **Breakpoints (D.8):**

  | Viewport | `data-layout` | `--hit` |
  |---|---|---|
  | 360, 390 | mobile | 44 |
  | 700, 768, 820 | tablet | 44 |
  | 1024 mouse | desktop | 32 |
  | 1024 touch | desktop | 44 (coarse) |
  | 1366, 1920 | desktop | 32 |

  The top bar is 44 + 1 px, and 40 + 1 px when the height is under 500 px.
- **Phone dock:** Select, Add Atom, Add Bond, Delete, Measure and More, each 44×44, with `sw == cw` at 360 (`a.json m360-en.toolbar`).
  - More holds Rotate/Pan/Zoom as `menuitemradio`, then the 4 actions.
  - The top overflow menu has Library, Settings, File and View (4 items, no scroll).
- **Element picker on phones:** 14 chips of 44×44 in two rows of 7, fitting at 360 (`d.json atom`).
- **Keyboard walk at 1366×768** (`c.json walk`): top bar (8) → rail (1 roving stop) → canvas → HUD (style group, zoom ±, Fit, Reset) → inspector.
  - Every stop is `:focus-visible` with `solid 2px rgb(94,200,229)`, the canvas included.
  - Tool keys `R P Z A B D M V` work, and `B` inside the Atom tool stays in Atom (boron).
  - `?` opens the shortcuts dialog with focus inside it. Esc closes it and returns focus.
- **Icon buttons:** every visible icon-only control has a localized accessible name (`noName: []` everywhere).
- **EN completeness:** no Turkish-letter text, `aria-label`, `title` or `placeholder` at any viewport in EN (`trHits: []`). This includes after a live TR→EN switch on the phone, where the canvas reads "3D molecule view" (`b.json liveEN`).
  - The sr-only announcer has EN strings (`Announcer.tsx:26-35`).
  - The dictionaries are type-locked (`en: Record<TrKey,string>`).
- **Tablet:**
  - The drawer is in flow, collapsed in portrait (768, 820) and open in landscape (844×390).
  - There is no visible scrim.
  - At 820×1180, opening the drawer narrows the canvas from 772 to 452 px, and methane re-fits, centred in the remaining area (`c-t820-drawer.png`).
  - A 700 ms touch on a rail tool shows the tooltip ("Döndür R").
- **Phone landscape 844×390:** methane is fully visible between the compact HUD columns (`a-l844-en.png`).
- **Half detent:** a slow drag from peek to mid-screen lands at half (sheet top 329 at 360×740, which is 44 % of the height). Methane sits fully above the sheet edge at full size, with no zoom jump (`d-m360-half.png`).
- **Clearing the selection** returns the sheet's peek row to the molecule summary ("CH4 · 16.04 g/mol · 5 atoms · 4 bonds"; `d.json cleared`).
- **Reduced motion:**
  - `data-reduced-motion="true"` follows the system query.
  - The sheet is already at its final position 40 ms after the tap (`b.json tapC_40ms`).
  - The tablet drawer is at full opacity, with no transform, 40 ms after the tap (`c.json t1_40ms`).
  - CSS durations collapse to 0.01 ms (`index.css:139-146`).
  - `MotionConfig reducedMotion="always"` is set (`App.tsx:167`).
  - There is no spring, bounce or pulse in the UI. `rg spring|bounce|animate-pulse` finds only scene springs, which reduced motion skips.

---

## BLOCKING

### B1 [ui] Mobile launches with no sheet (checklist 25, D.10 "sheet at peek on mobile", D.8 bottom sheet)
`App.tsx:136-149` says "phones start with the sheet closed" and calls `setInspectorOpen(... : false)` for `layout === 'mobile'`.
- Repro: 360×740 and 390×844, TR and EN, gives `sheet: null` at launch (`a.json m360-*/m390-*`, `b.json launch`, `a-m390-en.png`). There is no formula or molar mass on screen until the user taps (i) or an atom.
- Checklist 25 reads "mobile launches with the sheet at peek and methane fully visible above it".
- SPEC §F also lists "the D.8 instruction to change the sheet default (it is already `peek`)". So the intended default is an open sheet at peek. A closed sheet with `infoSnap: 'peek'` in the store does not satisfy that.

### B2 [ui] Selecting an atom does not raise peek → half (D.8)
`App.tsx:153-163` hard-codes `setInfoSnap('peek')` and returns early when the sheet is already open (`s.inspectorOpen`).
- Repro (390×844): tap the carbon. The sheet opens at peek (top 631, the same before and after) and shows "Karbon #1" in the summary. The atom card is below the fold (`b.json tapC`, `b-1-tapC.png`).
- D.8: "Selecting an atom raises peek → half; clearing returns to peek".

### B3 [ui] The sheet can be dismissed below peek, and Esc does not drop one detent (D.8)
Code: `BottomSheet.tsx:75-79` (Esc → `onClose()`), `:104-111` (`'closed'` is a snap stop for flings), `:152-159` (an X button that closes).
- Repro (390×844):
  - Esc at peek gives `sheet: null` (`b.json esc1`).
  - Drag to full (top 76), then Esc, gives `sheet: null` instead of half (`b.json dragUp → escFromUp`).
  - At 360×740, Esc at half also closes it.
- D.8: "never dismissed below peek; Esc/Back drops one detent".

### B4 [ui] The sheet grabber is not an accessible control (D.8, WCAG 2.5.7 dragging alternative)
`BottomSheet.tsx:149` renders `<div aria-hidden="true" className="… h-1 w-9 …">`. It has no `role="button"`, no detent name and no tab stop (`b.json tapC.grab: {role:null, hidden:"true"}`).
- Dragging is the only way to reach half or full.
- Keyboard, switch and screen-reader users cannot raise the sheet past peek.
- The only buttons in the handle are "Close panel" and the section headers (`d.json sheetButtons`).
- D.8: "grabber `role="button"` naming the detent".

### B5 [ui] Full detent has no scrim (D.8)
After a drag to full (top 76 at 390×844), no fixed full-viewport tinted layer exists (`b.json dragUp.scrim: []`, `b-3-dragup.png`). The canvas stays live behind an 88 % sheet. `BottomSheet.tsx:126-132` renders a scrim only for `modal` sheets.
- D.8: "full ≈ 88dvh with a scrim that returns to half".

### B6 [ui] Touch targets below 44 px on coarse pointers (D.4, D.8 "(pointer: coarse) forces --hit: 44px")
1. **`Segmented` is `min-h-[calc(var(--hit)-6px)]` = 38 px** (`controls.tsx:92`). Unchanged from round 2 B7.2. Affected:
   - the HUD render-style control: 85×38 at 360, 92×38 at 390, and 75/82/40/71×38 at 768, 820 and 1024 touch (`a.json small`). "Stick" is 40×38;
   - phone bond order: Tekli/Çift/Üçlü 38×38 (`b.json atomTool`, `d.json atom`);
   - Settings Language and Motion radios: 57×38, 61×38, 84×38, 48×38, 43×38 (`b.json settings`).
2. **The Settings `Switch` is 36×20 on every layout** (`controls.tsx:211`, `h-5 w-9`; `b.json settings` "Otomatik hidrojen 36×20"). That is below 44 px for touch and below the 24×24 desktop minimum (D.4 / WCAG 2.5.8). This is round 1 B12 and round 2 B7.3, both unchanged.
3. **Phone landscape overrides the coarse rule:**
   - `index.css:115-120` sets `--hit: 40px` when the height is under 500 px.
   - `.hud-compact { --hit: 32px }` (`index.css:122-124`) applies on touch.
   - At 844×390 (touch), every rail and top-bar button is 40×40.
   - The HUD style radios are 82×26.
   - Zoom in/out, Fit and Reset are 32×32 (`a.json l844-en.small`).
   - D.8 says coarse forces 44 px. If 40 px is a deliberate exception for short screens, it needs to be written into SPEC; the 26 px and 32 px HUD targets are not defensible on touch in any case.
4. Minor: the Library "All" filter chip is 37×44 at 390 (`b.json library.small`).

### B7 [ui/scene] Touch long-press on an atom still does nothing (B.12 MUST)
`scene/Interaction.tsx:212` dispatches `ATOM_LONG_PRESS_EVENT` (`pickApi.ts:19`). `rg "ATOM_LONG_PRESS|atom-longpress" src` finds only the dispatcher and the definition, and nothing in `src/ui` listens.
- Repro (820×1180 touch, Select tool): an 800 ms press on the carbon opens no menu or dialog (`c.json atomLongPress.menus: []`, `c-t820-atom-longpress.png`).
- B.12: "The existing touch long-press quick actions (change element / delete) reach the same actions."
- This was round 1 B14 and round 2 B9, and it is still unfixed.

### B8 [scene] The sheet offset uses the old 768 px breakpoint; 640–767 px tablets get a phantom offset (D.8 Tablet "molecule kept centred in the uncovered area")
`CameraRig.tsx:194`: `sheetCover()` returns a non-zero cover whenever `inspectorOpen && matchMedia('(max-width: 767.98px)')`. `layout.ts` (D.8) makes 640–767 px a tablet, where the inspector is an in-flow drawer and no bottom sheet exists. At 700×1000 that computes 974 − (1000 − 132) = 106 px of fake cover, which is applied as a view offset.
- Repro: 700×1000 touch, then tap (i).
  - The canvas narrows to 332 px, and methane re-fits.
  - Its centre sits about 40 px above the canvas centre (y ≈ 470 against 509; `c-t700-drawer.png` vs `c-t700-0.png`).
  - At 820×1180, outside the stale range, the same action leaves it centred to within about 9 px (`c-t820-drawer.png`).
- Fix: drive the scene from `document.documentElement.dataset.layout === 'mobile'`, or from the real sheet geometry in `uiStore`, not from a second hard-coded query.

---

## IMPROVEMENTS (non-blocking)

1. [ui] **Peek height.**
   - `PEEK_PX = 132` (`BottomSheet.tsx:27`) gives a visible peek of about 132 px. D.8 says ≈ 72 px + safe area. The content (formula + molar mass) is right, but the peek costs about 60 px of viewport on the priority layout.
   - Full is `0.9 ×` the space above the chrome, which is not quite 88 dvh. That is acceptable.
2. [ui] **Desktop collapse affordance.** After "Paneli daralt" at 1024 px, no edge tab remains at the right edge (`c.json d1.edgeTab: []`). Reopening needs the top-bar Info toggle. D.6.5 asks for "collapsible with an edge tab". This overlaps the desktop critic's lens, so I list it here rather than as blocking. The state persistence works: it stays collapsed after reload (`d2`).
3. [ui] **Value wrapping in narrow panels.** At 844×390, "16.0313" and its unit "u" break onto two lines in the drawer (`a-l844-en.png`). Add `whitespace-nowrap` to the value cell of `Row`.
4. [ui] **Project name at 360 px.** The project name is hard-clipped mid-word ("Untitled proje", `d-m360-half.png`) with no ellipsis. Use `text-overflow: ellipsis` on the input or a display span.
5. [ui] **Focus on sheet open.** Opening the info sheet with a canvas tap moves focus into the sheet panel (`BottomSheet.tsx:71`). For a non-modal sheet that opens because of a selection, keep focus where it was (on the canvas) and announce through the live region instead.
6. [ui] **Mobile HUD placement.** The render-style control spans the full width at the top of the phone canvas (y 53–97). That is fine, but together with the top bar and the peek it leaves about 470 px of a 740 px screen for the molecule. Consider moving it into the dock's More menu or the View menu on phones.
