# Round 1 critique: responsive, accessibility and motion

Critic: independent, fresh context. Judged against SPEC.md (original + ENHANCEMENT ADDENDUM v1, MUST-v1 checklist), GOAL.md and BRIEF.md.
Artifact: committed `src/` at HEAD `1c6453b` (only untracked `src/intro/variantC|D` differ, and they are out of scope). No source was edited.

**Verdict: FAIL, score 44/100.**

The basics are solid. There is no horizontal overflow at any viewport, every icon button has a localized `aria-label`, the global `:focus-visible` ring works, rail buttons reach 44 px on touch layouts, reduced motion is honoured in CSS and in motion/react, EN mode shows no leftover Turkish, and the console is clean. The failures are in the interaction models. The spec asks for a distinct model per form factor (D.8, SPEC §7), and the app falls short on every one:
- The breakpoints are wrong.
- The phone dock has 8 tools and scrolls sideways.
- The bottom sheet is closed at launch and covers the dock when it opens.
- The sheet never raises on selection.
- Esc dismisses the sheet completely.
- The sheet covers the molecule.
- The tablet drawer covers the molecule.
- The rail hides half its tools behind an invisible scrollbar.
- The keyboard model has no focusable viewport, no roving toolbar and no live announcer.

## Method / evidence

- Build: `dist/` was newer than `src/` (UI files), so no rebuild was needed.
- Runtime: I drove headless Chrome 14x through a raw CDP driver (device metrics, touch emulation, `prefers-reduced-motion: reduce`, DOM evaluation and screenshots). The scripts are in the session scratchpad (`r1uxresp/drv.mjs`, `plan1-3.mjs`).
- Note: port 4192 turned out to be served by a sibling agent's test-hook build of the same committed src. `src/` (non-intro) is unchanged since `dist/`, and every finding below is also confirmed by reading the source.
- Raw results and screenshots: `gauntlet/critiques/r1ux-resp/run1..run4/` (`results.json` + PNGs). Logs: `gauntlet/logs/r1ux-resp-run*.log`.
- Viewports: 360×740, 390×844, 768×1024, 820×1180, 1024×768, 1366×768, plus 844×390 (phone landscape). Each was run in TR and EN, under reduced motion and with full motion.
- Console: 0 messages, 0 exceptions across all runs (`results.json` → `logs: []`).

### What passes (do not regress)

- No horizontal overflow: `scrollWidth == innerWidth` at all 7 viewports, TR and EN, including with the sheet, menus and dialogs open (run1, run3, run4).
- Touch targets in the rail, dock, top bar and sheet close button are 44×44 on tablet/mobile (`--hit: 44px`), and no control is smaller than 24 px except the switch (B4 below).
- Every icon-only button has a localized accessible name (`noName: []` everywhere). Toggles use `aria-pressed`, and menus have `role=menu`, arrow-key navigation and Esc returning focus.
- `:focus-visible` gives a 2 px accent outline, and a 40-step Tab walk on desktop showed a ring on every stop.
- Reduced motion:
  - `data-reduced-motion="true"` collapses CSS transitions to `1e-05s`.
  - The inspector `aside` is at opacity 1 / transform none on the very next read after opening.
  - The sheet, dialogs and toasts jump.
  - The scene springs are disabled (`MoleculeLayer.tsx:53`).
  - There are no spring, bounce or pulse animations.
- EN: no Turkish string is visible in the top bar, rail, inspector (atom selected), File/View menus, settings, library or mobile sheet (run2 F-*, run4 G-*). The only hits are the language name "Türkçe" and proper names such as Wöhler inside EN library descriptions.
- The `?` key opens the shortcut sheet, Esc closes it, and `M` switches to Measure.

---

## BLOCKING

### B1 [ui] Breakpoints contradict D.8 (MUST); 1024×768 gets the tablet model
`src/ui/layout.ts:5-6`: `desktop >= 1200, tablet 768-1199, mobile < 768`. The spec (D.8) says mobile < 640, tablet 640–1023, desktop ≥ 1024.
- Repro: at 1024×768 (one of the standard viewports), `data-layout="tablet"`. The inspector is closed and only appears as an overlay drawer (run1 `t1024-tr.png`, run3 `C2-t1024-1-drawer.png`).
- At 1024–1199 the "full scientific workspace, persistent inspector" (SPEC §7 Desktop) is not delivered.
- Phones and small tablets at 640–767 px get the phone model.

### B2 [ui] Mobile dock is not the specified 6-button model, and Measure is off-screen
D.8 MUST: the bottom bar has 6 buttons of 44 px: Select, Atom, Bond, Delete, Measure, More (Rotate/Pan/Zoom go under More). `Toolbar.tsx:121-149` instead renders all 8 tools in a horizontally scrolling strip, plus a separate "Eylemler" (Actions) button.
- At 360×740 the tool strip has `scrollWidth 382` vs `clientWidth 303` (run4 I-m360dock). Measure (x 330–374) sits under the More button (x 310). Eraser is half-clipped.
- At 390×844, Measure (330–374) overlaps More (340) (run1 dock list; `m360en-en.png`, `m390-tr.png`).
- `no-scrollbar` hides the scroll affordance, so a phone user cannot see that Measure exists.

### B3 [ui] Mobile bottom sheet breaks most D.8 sheet MUSTs
`App.tsx:104-110`, `App.tsx:125-136`, `BottomSheet.tsx`.

1. **The sheet is not at peek on launch** (checklist 25). On mobile the layout effect calls `setInspectorOpen(false)`. Run3 `s0`: `insp:false, sheetTop:null`.
2. **Selecting an atom does not raise the sheet to half.**
   - With the sheet open at peek, tapping C sets `sel:[1]`, but `sheetTop` stays 712 (run3 `s2`, `A-m390-2-tapC.png`).
   - `App.tsx:132` explicitly sets `'peek'`.
   - The sheet only opens at all when `tool === 'select'`.
3. **Esc dismisses the sheet entirely** instead of dropping one detent, and "never dismissed below peek" is violated.
   - `BottomSheet.tsx:67` calls `onClose()` on Escape. The same keystroke also clears the selection through `shortcuts.ts:57-62`.
   - Run3 `s3→s4`: half → `insp:false, sel:[]`.
   - Swipe-down past peek and the X button also close it (`BottomSheet.tsx:80-87`, `:131`).
4. **The grabber is `aria-hidden`, with no `role="button"` naming the detent** (`BottomSheet.tsx:125`).
   - Changing the detent is drag-only, so keyboard/AT users can never raise the sheet past peek.
   - This also fails WCAG 2.5.7 (no single-pointer alternative to dragging).
5. **The detents are wrong.**
   - Peek is a fixed `PEEK_PX = 132` (spec ≈ 72 px + safe area). The peek row shows formula + atom/bond counts, without the molar mass the spec asks for.
   - Half is 50 % (spec ≈ 45 dvh). Full is 90 % with no scrim (spec ≈ 88 dvh with a scrim that returns to half).

### B4 [ui] The open info sheet covers the tool dock and status bar
The sheet is `fixed bottom-0 z-[75]` over the in-flow dock. At peek (y 712–844 at 390×844) it fully covers the dock (y ≈ 790) and the status bar. See run3 `A-m390-1-info.png` / `A-m390-2-tapC.png`: no tool buttons are visible.
- While the info sheet is open, a phone user cannot change tool without closing it first.
- The spec puts peek above the bottom bar ("peek ≈ 72 px + safe area"; toasts sit "above the sheet peek").

### B5 [scene] Molecule not kept visible above the half sheet (MUST D.8 "Molecule visible above the sheet")
At the half detent the sheet covers the lower half of methane, and no view offset or target shift happens (run3 `A-m390-3-half.png`, sheetTop 422).
- No camera offset is wired to `infoSnap`: there is no `infoSnap` reference anywhere in `src/scene`.

### B6 [ui/scene] Tablet drawer covers the molecule; portrait/landscape rule missing (MUST D.8 Tablet)
1. The drawer is `absolute right-0 w-[min(360px,92%)]` over the viewport (`App.tsx:46-49`). The camera is not re-centred into the uncovered area.
   - At 820×1180, methane's right half is under the drawer (run3 `C-t820-1-drawer.png`).
   - At 1024×768, the drawer hides a third of the molecule (`C2-t1024-1-drawer.png`).
2. The spec says "collapsed in portrait, open in landscape". `App.tsx:110` forces `false` on every tablet regardless of orientation.
3. The spec asks for a ~320 px drawer and a 48 px rail. The drawer is 360 px and the rail 60 px (`Toolbar.tsx:105`).
4. "Long-press (500 ms) replaces hover tooltips" is not implemented: `Tip.tsx:63` is mouse/focus only.

### B7 [ui] Rail hides tools behind an invisible scrollbar on short screens
The rail is `overflow-y-auto no-scrollbar` with 15 stacked 44 px buttons (`Toolbar.tsx:103-117`).
- At 1024×768 the last button, Zoom out (y 744–788), is cut off below the viewport (y ≤ 742) (`t1024-tr.png`).
- At 844×390 (phone landscape, tablet model): `scrollHeight 744` vs `clientHeight 312`. Delete, Measure and all 7 actions are invisible, with no affordance (run4 `J-l844x390-land.png`).
- The Edit tools are not discoverable in landscape.

### B8 [ui] Compact top bar for height < 500 px is missing (MUST D.6.1 / D.8)
At 844×390 the header is 52 px (run4 `rail.header: 52`); the spec says 40 px when height < 500.
- `TopBar.tsx:181`/`:198` only switch on layout, never on height.

### B9 [scene/ui] Viewport is not keyboard-reachable; no live announcements (MUST B.4, checklist 26)
- Canvas `tabIndex` is `-1` at every viewport (run1 `canvas.tabIndex:-1`), `#viewport` is a non-focusable `<main>`, and there is no inset focus ring.
- The desktop Tab walk goes top bar → rail → inspector, skipping the viewport and HUD (run2 `D-d1366kbd.tabs`).
- There is no sr-only `aria-live="polite"` region announcing selection or edits ("Seçildi: C, Karbon, 4 bağ", "O atomu eklendi").
  - The only live regions are the save status (`TopBar.tsx:65`), the charge stepper value and the mobile sheet summary line.
  - Selecting C on desktop announces nothing.

### B10 [ui] Tool rail is not `role="toolbar"` with roving tabindex (MUST B.4)
`Toolbar.tsx:102-116` uses `<nav>` + `role="group"`; `document.querySelectorAll('[role=toolbar]').length === 0` at every viewport.
- Every one of the 15 rail buttons is a separate Tab stop (Tab walk entries 9–23), and arrow keys do nothing.
- The 14-chip `ElementPicker` (`ElementPicker.tsx:12`) and every `Segmented` (`controls.tsx:65`) use `role="radiogroup"` / `role="radio"` without a single tab stop or arrow keys. This adds 14 more Tab stops to the Atom tool options.

### B11 [ui/scene] On-canvas Fit control missing (MUST B.5)
"An on-canvas Fit control exists (bottom-right HUD)." None exists at any viewport (all screenshots). Reset camera only lives in the rail actions, the More menu and the View menu.
- Checklist 26's "viewport → HUD" Tab stop therefore cannot exist either.

### B12 [ui] Undersized touch/pointer targets in settings and tool options
- The settings `Switch` is `h-5 w-9` = **36×20** on every layout (run2 `m-set`, run4 `setCtrls`: `switch 36x20`, `controls.tsx:194`).
  - That is below the 24×24 minimum for compact desktop controls (D.3 MUST, WCAG 2.5.8) and far below 44 on touch.
- On mobile, `Segmented` items (bond order Tekli/Çift/Üçlü, Language, Motion) are 38 px tall (`min-h-[calc(var(--hit)-6px)]`, `controls.tsx:76`). Run3 `m5`: `Tekli [38x38]`; run4: `Türkçe 58x38`.
  - D.3 requires 44 px control size on tablet/mobile/coarse pointers.

### B13 [ui] Modal sheet stacks under/over the non-modal info sheet
On mobile, opening Settings while the info sheet is up stacks two 760 px sheets (run4 `G-m390en-2-settings.png`).
- The modal scrim is `z-[70]` (`BottomSheet.tsx:94`), below the info sheet's `z-[75]`. The info sheet stays bright and interactive above the "modal" backdrop.
- The modal mobile sheets (`Modal.tsx:33`) also have no Tab focus trap, unlike `DesktopDialog`, despite `aria-modal="true"`.

### B14 [scene/ui] Touch long-press quick actions fire into the void (MUST B.12)
`scene/Interaction.tsx:195` dispatches `ATOM_LONG_PRESS_EVENT` ("quick actions: change element / delete"), but nothing in `src/ui` or `App.tsx` listens (`grep ATOM_LONG_PRESS_EVENT src` finds only the dispatcher and its definition).
- B.12 says "the existing touch long-press quick actions (change element / delete) reach the same actions". On touch, a long-press selects an atom and then nothing happens.

### B15 [ui] Checklist items failing by direct check (outside this lens, listed so they are not lost)
- **#36:** `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 2 hits (`Inspector.tsx:36` `'Yeni molekül'`, `LibraryBody.tsx:11` `/ı/g`). `tests/i18n.test.ts` does not assert this rule.
- **#35 / §E-7:**
  - `save.saved` is `'Kaydedildi'` / `'Saved'` (`i18n.ts:36`/`:392`), not `Tarayıcıda kaydedildi` / `Saved in this browser`.
  - The `saving` state shows an animated `Loader2` spinner (`TopBar.tsx:41`); D.6.1 says no spinner.
- **D.6.7:** toasts auto-dismiss on a fixed timer and do not pause on hover/focus (`ToastHost.tsx:16-23`).

---

## IMPROVEMENTS (non-blocking)

1. [ui] `main.tsx:9-11` adds `window.__studio` under `?test`. Rule 4 says "no other global debugging hook is added", and §E lists `window.__studio` as dropped. Use `__MOLECULAR_SCENE__` only.
2. [ui] The mobile overflow menu is a 20-item scrolling list (Library, all File items, all View items, then Settings at the bottom, run3 `A-m390-7-more.png`). D.8 calls for View, Settings, Info, and Settings is below the fold.
3. [ui] Menus show `Ctrl+S` / `F` kbd chips on phones (`A-m390-7-more.png`), where there is no keyboard. Hide kbd chips on coarse pointers, matching the tooltip rule.
4. [ui] `BottomSheet.tsx:63-64` moves focus into the *non-modal* info sheet whenever it opens. That steals focus from the viewport/tool the user was using. Only modal sheets should take focus.
5. [ui] One Esc on mobile triggers both the sheet close and the global Esc (clears selection, `shortcuts.ts:57`). Overlay Esc handlers should `stopPropagation` / `preventDefault`, and the global handler should honour `defaultPrevented` (it already checks it).
6. [ui] The focus-ring colour animates. `transition-colors duration-150` includes `outline-color`, and the Tab walk sampled rings mid-transition in ink-dim (`rgb(154,161,171)`) on rail buttons. Exclude outline from the transition so the ring is accent immediately.
7. [ui] Desktop inspector "collapsible with an edge tab" (D.6.5): there is no edge tab after collapse, only the top-bar Info toggle. The resizable separator is SHOULD.
8. [ui] Desktop status bar is 26 px (spec 24). The mobile top bar is 52 px while D.6.1 says ~44 px.
9. [ui] The mobile toast is anchored at `bottom: 132px`, a hard-coded copy of `PEEK_PX`. It overlaps sheet content at half/full. Derive it from the sheet's actual top.
10. [tests] Add a responsive test, e.g. a vitest + matchMedia mock, to lock `layout.ts` to 640/1024 and assert that mobile launches with `inspectorOpen=true, infoSnap='peek'`.

## Score rationale (lens weight)

| Area | Weight | Score | Note |
|---|---|---|---|
| Overflow / legibility | 15 | 15 | clean everywhere |
| Distinct interaction models (D.8) | 35 | 3 | breakpoints, dock, sheet, drawer, rail all off-spec |
| Touch targets | 10 | 6 | rail/dock good; switch + segmented short |
| Keyboard / ARIA | 20 | 4 | names + rings good; no viewport focus, roving toolbar, announcer, sheet a11y |
| Reduced motion / motion quality | 15 | 13 | well done; spinner on save |
| i18n EN completeness | 5 | 3 | visible UI clean; checklist #36 rg fails |
| **Total** | 100 | **44** | |
