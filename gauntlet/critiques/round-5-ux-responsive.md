# Round 5 critique: responsive, accessibility and motion

Critic: independent, fresh context. Judged against SPEC.md (original spec + ENHANCEMENT ADDENDUM v1 + MUST-v1 checklist), GOAL.md and BRIEF.md. No source edited.

**Artifact:** HEAD `190f5b3` + uncommitted working tree (31 modified files; new `src/ui/inspector/FittedElementPicker.tsx`, `reveal.ts`, `longPress.ts`, `src/scene/controlsUtil.ts`). `dist/index.html` 00:18:03 is newer than every `src/` file (newest 00:17:16), so no rebuild. `src/App.tsx` (21:52) and `src/index.css` (22:39) are unchanged since round 3.

**Verdict: FAIL. Score 75/100** (r1 44, r2 55, r3 68, r4 72).

## Method / evidence
- Server `npx vite preview --port 4192 --strictPort` (killed afterwards; no Chrome left running).
- Raw-CDP driver (scratchpad `r5/drv.mjs`, scripts `a b c f g h i .mjs`): device metrics, touch emulation, `pointer/any-pointer: coarse`, `hover: none` on touch runs; `prefers-reduced-motion: reduce` on every run except `g.mjs` part 3 (motion on).
- Raw results: `gauntlet/critiques/r5ux-resp/{a,b,c,f,g,h,i}.json` + PNGs. Logs: `gauntlet/logs/critic-r5-resp-*.log`.
- Viewports: touch 360×740, 390×844, 700×1000, 768×1024, 820×1180, 1024×768, 844×390; mouse 1024×768, 1366×768, 1920×1080; TR and EN.
- Console: 0 errors / 0 warnings / 0 exceptions in every run (`logs: []`).
- Three matrix pages (t768-tr, t700-en, l844-en) captured before the canvas mounted (`canvas: null`, swiftshader load timing); the same viewports were valid in the other language and in `c.mjs`.

## Fixed since round 4 (verified)
- **R4-B3 sheet wrapper scroll shift: FIXED.** `revealInScroller` (`src/ui/inspector/reveal.ts:7-20`) scrolls only the `overflow-y:auto` content box. After a long-press at 360 and 390 the wrapper `scrollTop` is 0 and Esc×2 returns to the true peek (top 631 at 390, 527 at 360) with grabber "özet" (`f.json m360/m390`, `g.json lp/lpEsc`).
- **R4-B5 picker clipped in drawer: FIXED.** `FittedElementPicker` measures columns: 287 px grid inside the 320 px drawer at 820 and 1024 touch, 326 px at 360, no clipped chips, no horizontal scroller (`f.json pick.clipped: []`, `c-t820-longpress.png` shows 6 columns).
- **R4 improvement 2 (scrim over top bar): FIXED.** Full-detent scrim now `top: 45` (header bottom) (`g.json full.scrim y 45`); tapping it at y 62 returns to half (`afterScrimTap` top 381).
- **R4 improvement 3 (grabber height): FIXED.** Grabber hit area 64×44 (`BottomSheet.tsx:211` `h-11`; `b.json tapC.grab`).
- **R4 improvement 5 (library focus): FIXED.** Phone library sheet focuses the search input (`g.json lib.focus "INPUT:Molekül ara…"`, `focusIn true`); Esc returns focus to "Diğer seçenekler"; desktop Library/File/View/Settings all return focus to their invoker (`i.json d.*.focusBack`).

## Passes (do not regress)
- **No horizontal overflow (#25 first half, D.8):** `scrollWidth == innerWidth` at all 10 viewports TR+EN (`a.json ov`), with the Atom tool open, sheet at full, after long-press, and in the library sheet (`b.json atomTool.ov`, `g.json lib.ov / libChip.ov`).
- **Breakpoints:** 360/390 mobile 44 px; 700/768/820 tablet 44 px; 1024 touch desktop 44 px; desktop mouse 32 px; 844×390 tablet 40 px. Header 45 px (41 at 390 h).
- **Sheet model:** grabber `role=button`, tabIndex 0, names the detent; ArrowUp peek→half(381)→full(76), ArrowDown full→half, Enter cycles (`b.json grabKeys`); Esc half→peek, stays at peek; hard swipe down at peek stays at peek; fast fling up lands at half (`b.json esc1/esc2/swipeDown/flingUp`). At half, methane is re-framed above the sheet (`b-3-fling.png`).
- **Tablet drawer:** in flow, no scrim; 700×1000 drawer narrows canvas to 332 px with methane centred (`c-t700-drawer.png`); 820 long-press opens drawer + atom card + picker; rail long-press tooltip "SeçV" (`c.json railTip`).
- **Keyboard walk 1366×768:** top bar (8) → rail (1 roving stop) → canvas → HUD (style radio, zoom ±, Fit, Reset) → inspector (collapse, section headers) → wraps; every stop `:focus-visible` solid 2 px (`c.json walk`). `?` opens the shortcuts dialog with focus inside; Esc closes.
- **Accessible names:** `noName: 0` at every viewport TR+EN.
- **EN completeness:** `trHits: 0` at every viewport; desktop Library/File/View/help, atom card, Measure and Atom tool states; phone dock "More" menu, live TR→EN switch, EN sheet at full (`a.json`, `b.json liveEN/enSheet`, `i.json`). The only Turkish string in EN is the "Türkçe" language option, which is a correct endonym.
- **i18n source rule (#36):** `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` → 0 hits. D.9 rg → only `.viewport-bg` (`index.css:149`).
- **Reduced motion:** `data-reduced-motion="true"`, 0 running animations at launch (`b.json launch.anims`); sheet at final position 40 ms after selection (`b.json tapC_40ms`); drawer opacity 1 / `transform: none`; `MotionConfig reducedMotion="always"` (`App.tsx:168`); CSS durations collapse (`index.css:139-146`). With motion on, the library sheet and selection sheet still settle correctly with wrapper scrollTop 0 (`g.json libMotion/motionTap`).

---

## BLOCKING

### B1 [ui] Phones still launch with no sheet (checklist #25, D.10, D.8) — unchanged since round 3
`App.tsx:130` comment "phones start with the sheet closed" and `App.tsx:141` `setInspectorOpen(… : false)` for mobile.
Repro: fresh profile, 360×740 and 390×844, TR and EN → `sheet: null` (`a.json m360-*/m390-*`, `b.json launch.sheet null`, `g.json m360.sheet null`, `a-m390-tr.png`). No formula / molar mass on screen until the user taps (i) or an atom. Checklist #25: "mobile launches with the sheet at peek and methane fully visible above it". The sheet can no longer be dismissed below peek (`BottomSheet.tsx:96-101`), so launching closed contradicts the app's own model. Fix: `layout === 'mobile' ? true` with `infoSnap` `peek` at App.tsx:141 (CameraRig already offsets for peek).

### B2 [ui] Selecting an atom opens the sheet at peek, not half (D.8 "Selecting an atom raises peek → half") — unchanged since round 3
`App.tsx:157-161`: `setInfoSnap('peek')` hard-coded, and the subscription returns early when `s.inspectorOpen` is already true, so a selection while the sheet is at peek never raises it. Repro 390×844 Select tool, tap the carbon: top 631 at 40 ms and 600 ms, grabber "özet"; at 360: top 527 (`b.json tapC`, `g.json m360tap`, `g-5-m360-tap.png`). The atom card (Z, mass, VSEPR) is below the fold. Also D.8 "clearing returns to peek" has nothing to return from. Fix: on a new selection at peek (or closed) set `half`; on clear set `peek`.

### B3 [ui] NEW: long-press on the centred atom lands at the FULL detent — the release taps the half-detent grabber that just appeared under the finger
`Interaction.tsx:205-213` opens the sheet at `half` after 500 ms while the finger is still down. At 390×844 the half grabber occupies y 382–426 and the fitted methane carbon is at y 404 (canvas centre), i.e. directly under the finger. On release the browser's synthetic click is hit-tested at the release point and lands on the grabber's inner span; the grabber `onClick` (`BottomSheet.tsx:205-210`) treats "no pointer-down recorded on me" (`!d`) as a keyboard click and calls `cycle()` → full.
Repro (`h.mjs`, 390×844 touch): hold the carbon 700 ms → sheet top 381, grabber "yarım"; release → sheet top 76, grabber "tam", event log `pointerdown:canvas, pointerup:canvas, click:SPAN` (`h.json carbon`). Control: long-press the top H (164, 342, above the sheet edge) → stays at half, click goes to the canvas (`h.json topH`). Same at 360×740 (`f.json m360.sheet.top 66`) and in `g.json lp` (top 76, "tam").
Consequence: the documented long-press quick-action path (B.12 / D.8) jumps the sheet to full with a scrim over the whole viewport, hiding the molecule just edited. Caveat: reproduced with CDP touch emulation; iOS Safari also dispatches click after a hold without a callout, so treat as real. Fix: in the grabber `onClick`, treat only `e.detail === 0` as a keyboard activation and ignore pointer clicks without a matching pointer-down; or swallow the next click for ~400 ms after a long-press fires.

### B4 [ui] Touch targets below 44 px on coarse pointers (D.4, D.8 "(pointer: coarse) forces --hit: 44px") — unchanged since round 3 (`controls.tsx`, `index.css` hit rules untouched)
1. `Segmented` buttons are `min-h-[calc(var(--hit)-6px)]` = 38 px (`controls.tsx:92`): HUD render style 92×38 (390), 74/87/50/62×38 (700/768/820/1024 touch), EN "Stick" 40×38, "Full" 40×38 (`a.json small`, `i.json m.settings.small`); phone bond order Tekli/Çift/Üçlü 38×38 (`b.json atomTool`); Settings Language/Motion 57/61/84/48/43×38.
2. Settings `Switch` 36×20 on every layout (`controls.tsx:211`; "Otomatik hidrojen 36×20", `b.json settings`; "Automatic hydrogens 36x20", `i.json`) — below 44 for touch and below the 24×24 WCAG 2.5.8 minimum.
3. Phone landscape 844×390: `index.css:126-131` `--hit: 40px` (all top-bar and rail buttons 40×40); `.hud-compact { --hit: 32px }` (`index.css:133-135`) → zoom ±, Fit, Reset 32×32; style radios 87×26 (`c.json l844.small`). D.8 only allows the compact top-bar *height* under 500 px; nothing exempts touch targets.
Fix: segment `min-h-(--hit)`; switch wrapped in a `min-h-(--hit) min-w-(--hit)` hit box (or make the whole label row the control); drop the 40/32 px overrides for coarse pointers.

### B5 [ui] Desktop inspector has no edge tab after collapse (D.6.5 [MUST-v1] "collapsible with an edge tab") — flagged in rounds 3 and 4 as an improvement, but it is a MUST
After "Paneli daralt" at 1366×768 no control remains at the right edge (`c.json collapsed.edge: []`, `c-d1366-collapsed.png`); reopening needs the top-bar Info toggle. `rg "edge tab|PanelRightOpen" src/ui` → nothing. (Owned jointly with the desktop critic; listed here because it is the collapse affordance of the responsive panel model.)

---

## IMPROVEMENTS (non-blocking)
1. [ui] **Touch hint is false.** Touch layouts show "Seç: Atom veya bağa tıklayarak seçin; atomu sürükleyerek taşıyın" / "…drag an atom to move it" (`c-l844.png`, `c-t820-longpress.png`, `a-t820-en.png`), but a one-finger touch drag never moves an atom (`Interaction.tsx:193-195`). Add a touch variant of `tool.hint.select` (and say "dokunun/tap").
2. [ui] **Peek height 132 px** (`BottomSheet.tsx:27`, duplicated as a literal in `CameraRig.tsx:200`) vs D.8 ≈ 72 px + safe area; costs ~60 px of the priority viewport. Share one constant.
3. [ui] **Focus-ring colour transitions.** In the 1366 Tab walk "Kütüphane" was sampled with outline `rgb(154,161,171)` instead of accent (`c.json walk[3]`): `transition-colors` (`controls.tsx:9`) also animates `outline-color`. Use `transition-[color,background-color,border-color]`.
4. [ui] **Programmatic sheet focus is invisible.** When the info sheet opens it focuses its panel (`BottomSheet.tsx:85`, `focus: "DIV:Molekül"` in `b.json tapC`) — fine for touch, but a keyboard user who opens it via the overflow menu gets no ring on the panel (`outline-none`). Give the panel a `focus-visible` ring or focus the grabber.
5. [ui] **`LibraryBody.tsx:57` uses `scrollIntoView`** on the active category chip. It did not shift the sheet wrapper in my runs (`g.json libChip/libMotion wrapST 0`), but it is the same pattern R4-B3 was caused by; route it through `revealInScroller` or set `scrollLeft` on the chip row directly.
