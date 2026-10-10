# Round 4 critique: responsive, accessibility and motion

Critic: independent, fresh context. Judged against SPEC.md (the original spec plus ENHANCEMENT ADDENDUM v1 and the MUST-v1 checklist), GOAL.md and BRIEF.md. No source was edited.

**Artifact:** HEAD `190f5b3` plus the uncommitted round-4 working tree:
- 24 modified files, including `BottomSheet.tsx`, `Inspector.tsx`, `CameraRig.tsx` and `i18n.ts`;
- one new file, `src/ui/inspector/longPress.ts`.

`dist/` was built at 23:45:35, after the newest `src/` file (23:44), and contains the round-4 code (`data-sheet-scrim` and the `639.98px` query), so I did not rebuild.

**Verdict: FAIL. Score 72/100** (round 1: 44, round 2: 55, round 3: 68).

Round 4 fixed most of the mobile sheet:
- Esc and Back drop one detent, and the sheet can no longer be dismissed below peek.
- The grabber is a focusable `role="button"` that names its detent.
- The full detent has a scrim that returns to half.
- The 640–767 px phantom sheet offset is gone.
- Touch long-press on an atom now does something.

Still unfixed from round 3:
- B1: phones launch without the sheet.
- B2: a selection opens the sheet at peek, not half.
- B6: the 38 px segmented controls, the 36×20 switch and the 40/32/26 px phone-landscape targets.

New in round 4:
- The long-press fix scrolls the sheet's fixed wrapper, which permanently shifts every detent. Afterwards "peek" covers about 60 % of the phone and hides the molecule.
- The "change element" picker does not fit the 320 px tablet drawer.

## Method / evidence

- **Server:** `npx vite preview --port 4198 --strictPort`. Port 4192 was held by a sibling session, which I left alone. My server (PID 6512) and all my headless Chrome profiles are killed.
- **Driver:** the raw-CDP Node driver from round 3, copied to scratchpad `r4/` (`drv.mjs`, `a.mjs` to `f.mjs`). On touch runs it sets device metrics, touch emulation, `pointer: coarse`, `any-pointer: coarse` and `hover: none`. Every run uses `prefers-reduced-motion: reduce`. EN runs write `molecular-studio:settings:v1 = {language:'en'}` on the app origin and reload.
- **Raw results:** `gauntlet/critiques/r4ux-resp/{a,b,c,d,f}.json` plus PNGs. Logs: `gauntlet/logs/critic-r4-resp-{a,b,c,d,f}.log`.
- **Viewports:**
  - touch: 360×740, 390×844, 700×1000, 768×1024, 820×1180, 1024×768 and 844×390;
  - mouse: 1024×768, 1366×768 and 1920×1080;
  - each in TR and EN.
  - The TR 360×740 page of matrix `a` loaded before the layout attribute was set (`layout: undefined`), a load-timing glitch. EN 360 and run `f` at 360 are valid.
- **Console:** 0 errors, 0 warnings and 0 exceptions in every run (`logs: []` in a/b/c/d/f).

### Passes (do not regress)

- **No horizontal overflow (D.8, #25 first half):** `documentElement.scrollWidth == innerWidth` at all 10 viewports in TR and EN (`a.json ov`). It also holds with the atom tool open, with the sheet at full, and after a long-press at 360 and 390 (`b.json atomTool.ov`, `f.json *.ov`).
- **Breakpoints:**

  | Viewport | `data-layout` | `--hit` |
  |---|---|---|
  | 360, 390 | mobile | 44 |
  | 700, 768, 820 | tablet | 44 |
  | 1024 touch | desktop | 44 |
  | 1024 / 1366 / 1920 mouse | desktop | 32 |
  | 844×390 | tablet | 40 (see B4) |

  The top bar is 44 + 1 px, and 40 + 1 px at 390 px height.
- **Sheet model fixes (round 3 B3/B4/B5 resolved):**
  - **Grabber** (`b.json tapC.grab`, `BottomSheet.tsx:186-201`): `role="button"`, `tabIndex 0`, label "Panel yüksekliği: özet. Değiştirmek için Enter veya yukarı/aşağı ok tuşları".
  - **Grabber keys:** ArrowUp goes peek → half (top 381) → full (top 76), and stays at full. ArrowDown goes full → half. Enter cycles. A tap steps through the detents (`b.json grabKeys`, `full`).
  - **Tab order:** the grabber is reachable by Tab from the canvas (dock Select → grabber) with a visible 2 px accent ring (`d.json tabs[6]`, `b-2-full.png`).
  - **Full detent:** a scrim `rgba(0,0,0,.45)` 390×763 appears, and tapping it returns to half (`b.json full.scrim`, `afterScrim`).
  - **Esc:** at half it goes to peek, and at peek it stays at peek (`esc1`, `esc2`).
  - **Swipe:** a hard swipe down at peek stays at peek (`swipeDown`). A fast fling up from peek lands at half (`flingUp`).
  - **Peek content** is the formula + molar mass line ("CH4 · 16,04 g/mol · 5 atom · 4 bağ"). The non-modal sheet no longer has an X.
- **Round 3 B8 resolved:** at 700×1000, opening the drawer narrows the canvas to 332 px, and methane re-fits centred in it (`c-t700-drawer.png`). `CameraRig.tsx:194` now uses `639.98px`.
- **Long-press on tablet works:** at 820×1180 an 850 ms touch on the carbon:
  - opens the in-flow drawer (canvas 772 → 452 px), with no scrim;
  - selects C;
  - expands and scrolls to "Elementi değiştir" (`c.json t820.longPress`, `c-t820-longpress.png`);
  - methane stays centred in the uncovered area.
- **Tablet tooltips:** a 700 ms touch on a rail tool shows the tooltip ("SeçV", `c.json t820.railTip`).
- **Keyboard walk at 1366×768** (`c.json walk`): top bar (8) → rail (1 roving stop) → canvas → HUD (style group, zoom ±, Fit, Reset) → inspector (collapse, then section headers) → wraps.
  - Every stop is `:focus-visible` with a solid 2 px outline.
  - `?` opens the shortcuts dialog with focus inside it, and Esc closes it.
- **Icon buttons:** every visible icon-only control has a localized accessible name (`noName: 0` at every viewport). The dock "More" now reads "Araçlar ve eylemler" / "Tools and actions", distinct from the top-bar "Diğer seçenekler".
- **EN completeness:**
  - No Turkish text, `aria-label`, `title` or `placeholder` at any viewport in EN (`trHits: 0`).
  - The same holds after a live TR→EN switch on the phone (`b.json liveEN.tr: []`, canvas "3D molecule view"), and with the EN sheet at full (`enSheet.tr: []`).
  - The new grabber string has an EN entry ("Panel height: full…").
- **Reduced motion:**
  - `data-reduced-motion="true"`, and there are no running animations at launch (`anims: 0`).
  - The sheet is at its final position 40 ms after the tap (`b.json tapC_40ms` top 631 = settled).
  - The drawer is at full opacity with `transform: none` (`c.json`).
  - `MotionConfig reducedMotion="always"` is set (`App.tsx:167`), and CSS durations collapse (`index.css:139-146`).
- **Phone landscape 844×390:**
  - The drawer is open in landscape, and methane is fully visible between the HUD columns (`a-l844-en.png`).
  - The mono mass "16.0313 u" no longer wraps (round 3 improvement 3 is fixed).

---

## BLOCKING

### B1 [ui] Phones still launch with no sheet (checklist #25, D.10 "sheet at peek on mobile", D.8)
`App.tsx:130` ("phones start with the sheet closed") and `App.tsx:141` (`setInspectorOpen(… : false)` for mobile) are unchanged from round 3.
- Repro: 360×740 and 390×844, TR and EN, fresh profile, gives `sheet: null` (`a.json m360-en/m390-*`, `b.json launch.sheet: null`, `a-m390-en.png`). No formula or molar mass is on screen until the user taps (i) or an atom.
- Checklist #25 says "mobile launches with the sheet at peek and methane fully visible above it". D.10 requires screenshots showing "sheet at peek on mobile".
- Round 4 made the sheet impossible to dismiss below peek (`BottomSheet.tsx:84-92`). Launching it closed now contradicts the app's own model.

### B2 [ui] Selecting an atom opens the sheet at peek, not half (D.8 "Selecting an atom raises peek → half")
`App.tsx:152-163` is unchanged:
- `setInfoSnap('peek')` is hard-coded;
- the subscription returns early when `s.inspectorOpen` is already true, so a selection while the sheet is at peek never raises it.

Repro (390×844, Select tool): tap the carbon. The sheet top is 631 at 40 ms and still 631 at 600 ms, and the grabber reads "özet" (peek). The atom card (Z, mass, VSEPR) is below the fold (`b.json tapC`, `b-1-tapC.png`).

Long-press does raise half (`Interaction.tsx:209`), so the code path exists. It is just not used for a plain selection.

### B3 [ui] NEW: long-press permanently shifts every sheet detent; "peek" then covers about 60 % of the phone and hides the molecule (D.8 detents, "molecule visible above the sheet")
`Inspector.tsx:72-79` (round 4) runs `box.current?.scrollIntoView?.({ block: 'nearest' })` to reveal "Elementi değiştir". The sheet panel sits inside a `pointer-events-none fixed inset-x-0 top-0 overflow-hidden` wrapper (`BottomSheet.tsx:165`). `overflow: hidden` elements are still programmatically scrollable, so `scrollIntoView` scrolls the wrapper itself, and nothing ever resets it.

Repro (fresh profile, touch, Select tool): long-press the carbon for 850 ms, then press Esc twice to return to peek.

| Viewport | Wrapper `scrollTop` | Sheet at "half" | Sheet at "peek" (Esc ×2) | Expected peek |
|---|---|---|---|---|
| 390×844 | 305 | top 76, which is the geometry of full, with no scrim | top 326 | 631 |
| 360×740 | 263 | top 66 | top 264 | ≈ 527 |

Sources: `f.json m390/m360` (`wrapScroll`, `afterEsc`) and `d.json longPress` (top 76 with the grabber reading "yarım").

Consequences:
- The grabber's accessible name ("özet") no longer matches what is on screen.
- `CameraRig.sheetCover()` computes the cover from the snap, not the real geometry, so the molecule is drawn under the sheet. Only the top two H atoms remain visible (`f-m390-peek-after.png`).
- At "half" the sheet fills the screen with no scrim.
- The wrong offset persists until reload.

Fix: scroll only the sheet's own `overflow-y-auto` content box, for example `contentEl.scrollTop = …` or `scrollIntoView` scoped by computing the offset. Alternatively, reset `wrapper.scrollTop = 0`, or use `overflow: clip` on the wrapper, which is not scrollable.

### B4 [ui] Touch targets below 44 px on coarse pointers (D.4, D.8 "(pointer: coarse) forces --hit: 44px"). Unchanged from round 3 B6; `controls.tsx` and `index.css` are untouched.
1. **`Segmented` is `min-h-[calc(var(--hit)-6px)]` = 38 px** (`controls.tsx:92`). Affected:
   - the HUD render style: 92×38 at 390, and 74/87/50/62×38 at 700, 768, 820 and 1024 touch. "Stick" is 40×38 in EN (`a.json small`);
   - phone bond order: Tekli/Çift/Üçlü 38×38 (`b.json atomTool`);
   - Settings Language and Motion: 57/61/84/48/43 × 38 (`b.json settings`).
2. **Settings `Switch` is 36×20 on every layout** (`controls.tsx:211`; "Otomatik hidrojen 36×20", `b.json settings`). This is below 44 for touch and below the 24×24 compact minimum (D.4 / WCAG 2.5.8). It has been unfixed since round 1.
3. **Phone landscape 844×390 (touch):**
   - `index.css:129` sets `--hit: 40px`, so every top-bar and rail button is 40×40.
   - `.hud-compact { --hit: 32px }` (`index.css:134`) makes zoom ±, Fit and Reset 32×32.
   - The style radios are 87×26 (`c.json l844.small`).
   - D.8 only allows the compact *top bar* under 500 px height. Nothing exempts touch targets from the coarse 44 px rule, and 26 px is not defensible on touch.

### B5 [ui] NEW: "Elementi değiştir" picker is clipped in the 320 px drawer (tablet, and 1024 px coarse desktop)
The round-4 long-press now opens this picker on tablets. `ElementPicker` is a `repeat(7, var(--hit))` grid with `gap-1` (`ElementPicker.tsx:14`, `Inspector.tsx:443` `columns={7}`). With `--hit: 44px` it needs 7×44 + 6×4 = 332 px. The drawer content box is 287 px wide.

Repro: 820×1180 or 1024×768 touch, then long-press the carbon (`f.json t820/t1024`):
- "Kükürt (S, 16)" and "Bor (B, 5)" extend past the drawer's right edge (`clipped`).
- The inspector scroller now scrolls horizontally (`scrollWidth 348 > clientWidth 319`), so the whole panel can slide sideways.

`c-t820-longpress.png` shows the 7th column cut off on both rows.

It also overflows by 6 px at 360 (group 326 px wide, content 332 px).

Fix: use `repeat(auto-fill, var(--hit))`, or 6 columns when `--hit` is 44. This is the bug ruled out by "no horizontal overflow", inside a primary B.12 action.

---

## IMPROVEMENTS (non-blocking)

1. [ui] **Desktop collapse affordance.** After "Paneli daralt" at 1366, no edge tab remains (`c.json collapsed.edge: []`), and reopening needs the top-bar Info toggle. D.6.5 asks for "collapsible with an edge tab". Round 3 also noted this.
2. [ui] **Scrim covers the top bar.** The full-detent scrim is `fixed top-0` at `z-[74]` (`BottomSheet.tsx:156-163`), so at full the top bar is dimmed and a tap on Undo or (i) only drops the sheet to half (`b-2-full.png`). Start the scrim below the header so the app chrome stays operable.
3. [ui] **Grabber hit area on touch.** It is 64×24 (`b.json full.grab`). That matches D.8's "24 px handle" and meets WCAG 2.5.8 AA, but on coarse pointers it is the only non-drag control for changing detents. Pad it to a 44 px tall hit area, invisibly.
4. [ui] **Touch hint is false.** On touch layouts the status hint reads "Atom veya bağa tıklayarak seçin; atomu sürükleyerek taşıyın" / "…drag an atom to move it" (`a-l844-en.png`, `c-t820-longpress.png`). A one-finger touch drag never moves an atom (`Interaction.tsx:193-195`). Use a touch variant of `tool.hint.select`.
5. [ui] **Library sheet focus.** In one run (`d.json library.focusIn: false`, `afterLibEsc.focus: null`), focus did not move into the modal library sheet on open and was not returned to the overflow button on Esc. In the other run (`b.json afterLibEsc`) it was returned. Make both deterministic: focus the search field on open and return to the invoker on close.
6. [ui] **Focus-ring colour transitions.** During the desktop Tab walk, a few rings were sampled with outline colours `rgb(154,161,171)` and `rgb(230,232,235)` instead of the accent (Redo, Zoom in, the first HUD radio; `c.json walk[2,10,11]`). That suggests `transition-colors` animates `outline-color` from `currentColor`. Exclude `outline-color` from the transition so the ring is accent from the first frame.
7. [ui] **Peek height.** It is still 132 px (`BottomSheet.tsx:27`), against D.8's ≈ 72 px + safe area. That costs about 60 px of the priority viewport.
