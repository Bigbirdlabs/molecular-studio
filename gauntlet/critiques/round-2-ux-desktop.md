# Round 2 critique: spec compliance, art direction and interaction (desktop 1440x900)

**Critic:** independent, fresh context.

**Build judged**
- `dist/`, built 22:00. It is newer than every `src/` file; the newest is `src/ui/i18n.ts` at 21:59.
- A hook build of the same source in `gauntlet/scratch/dist-hook`, rebuilt once at the start of this round.
- Both were served with `vite preview` on ports 4191 and 4192, and both servers were stopped afterwards.

**How it was driven**
- Raw CDP with headless Chrome and swiftshader.
- Device metrics 1440x900 at dpr 1, with `?nointro`.
- Fresh profiles.

**Evidence**
- Screenshots: `gauntlet/critiques/r2uxd/`
- Probe logs: `gauntlet/logs/critic-r2-uxd-s1.txt` through `-s7.txt`, plus `-s5-export.txt`.

**Console**
- 0 errors, 0 warnings and 0 exceptions through the whole B.10 path.
- The only exception is the forced context-restore path (blocking item 10).

Note: headless Chrome reports `prefers-reduced-motion: reduce`. Runs s1–s6 therefore ran with reduced motion. s7 repeated the launch and the style checks with `no-preference` emulated.

**Verdict: FAIL. Score: 63/100** (round 1: 38).

Round 2 fixed most of the round-1 failures:
- The viewport HUD and the hover tooltip now exist.
- Hover no longer recolours atoms.
- Measurement lines are drawn on top, with decimal-comma labels.
- The zoom clamp is migrated.
- A style switch no longer moves the camera.
- Divalent H is refused.
- There is a context-loss overlay.
- The rail is a `role=toolbar` with roving focus, and it has the 2 px accent bar.
- An `aria-live` region exists.
- The save wording is fixed.

Several addendum MUST items are still missing or wrong, and a few new defects appeared.

## Verified working (desktop)

| Check | Result | Evidence |
|---|---|---|
| Grid | 48 / 1fr / 320 × 44 / 1fr / 26; `scrollWidth` 1440 = `innerWidth`; `data-layout=desktop`; `lang=tr` | s1 LAYOUT |
| Launch | Methane, ball-and-stick, oblique, 4 H visible. bbox centre (−0.030, −0.040) NDC, inside 5 %. Inspector CH₄ · 16,04 g/mol · 16,0313 u. Status bar: style, 5 atom, 4 bağ. | s1, `s1-launch.png` |
| Idle frames | `render.frame` stays 27 → 27 over 5 s | s1 IDLE |
| Hover tooltip | Atom "C · Karbon · 4/4 bağ"; bond "C–H · Tekli bağ (σ) · 1,090 Å" | s1, s6 |
| Atom card | Z 6, 12,011 u, (0,000; 0,000; 0,000), sp³ / Düzgün dörtyüzlü / AX₄ / LP 0, Gasteiger −0,08 with a hyphen-minus | s1 ASIDE-C |
| Selection shell | Thin accent rim, atom colour unchanged | `s6-shell-C.png` |
| Rotate tool | Drag orbits; cursor grab | s2 |
| Pan tool | Drag pans; cursor move | s2 |
| Zoom tool | Vertical drag dollies (6.34 → 10.25 Å); cursor zoom-in | s2 |
| Mouse buttons | Right-drag pans; wheel zooms | s2 |
| HUD camera controls | Zoom in/out, Sığdır and Kamerayı sıfırla all act | s2 |
| `F` key | Resets the camera | s2 |
| Zoom clamp | Min 1,500 Å; max 27,48 Å | s2 |
| Render modes | Radii: ballstick 0.459/0.227, spacefill 1.70/1.20, stick 0.14, wireframe = points. Camera and `render.geometries`/`textures` (21/6) unchanged over 20 switches. | s2 STYLE, `s2-styles-grid.png` |
| Measure | Chain distance `1,090 Å`, angle `109,5°` with "tepe: C #1", dihedral `φ = -120,0°`. Footnote present. Dashed lines and arcs drawn on top. Scene labels use decimal commas. | s2, `s2-measure-*.png` |
| Atom tool + O + click H | CH₄O · 32,04 g/mol. One undo step. Redo works. | s2 |
| 30 px orbit drag in the Atom tool | No edit and no undo entry | s2 |
| Bond tool | First click arms it (status "İkinci atoma tıklayın"). H–H is refused with "Hidrojen yalnızca bir bağ yapabilir." and no history entry. | s3 |
| Delete tool on methane C | Removes C and its terminal H. Undo restores. | s3 |
| Delete on H with Oto-H on | Honest refusal toast instead of the old silent no-op | s3 |
| Atom drag (Select tool) | Camera position identical; one undo entry | s6 |
| Atom card actions | Element değiştir C→Si gives SiH₄ in one undo step; the Formal yük stepper works | s6 |
| Save indicator | Becomes "Tarayıcıda kaydedildi" after an edit; no spinner | s2 |
| Undo/Redo buttons | `aria-disabled` while their stack is empty | s1, s3 |
| Project name | Editable; not recorded in history | s3 |
| File menu exports | MOL and XYZ download (`Metan.mol`, valid V2000; `Metan.xyz`); PNG downloads (`Metan.png`, 473 kB) | s5, s3 |
| Ctrl+S | Saves, with a toast | s3 |
| View menu | Style radios; H, labels and charges checkboxes; auto-rotate disabled with a reason under reduced motion; reset | s3 |
| Hydrogens toggle | Hides H from rendering; counts unchanged | s3 |
| Language switch | Flips `<html lang>` to `en`; all strings and number formatting switch | s4 |
| `?` cheat sheet | Matches `TOOL_KEYS`; explains the B/F/P/S letter keys in the Atom tool | s3 |
| Ctrl+A / Esc / Delete | Work as specified | s3 |
| Context loss | Overlay "3B görünüm yeniden başlatılıyor…" appears; Yeniden yükle appears after 3 s; restore brings back 5 atoms | s4 |
| Lint greps | gradient/backdrop/#000/#fff grep returns only `.viewport-bg`; no hex literals in `src/ui/**/*.tsx`; all strokeWidth values 1.75 | grep |

## Blocking

1. **[ui] The tool-options strip is still not the specified component** (B.2 MUST "Contextual options", D.6.3).
   - `src/ui/Toolbar.tsx:199` returns `null` unless the tool is atom or bond.
     - **Measure** has no options. There is no live readout and no `Temizle` on the canvas; with the inspector collapsed, the only measurement text is the scene label.
     - **Atom** has no Oto-H switch. `autoH` exists only in Settings (`Dialogs.tsx:76`). The Delete refusal toast tells the user to "Önce Oto-H'yi kapatın" without offering the switch in context.
     - **Bond** has no `İlk atomu seçin` / `İkinci atomu seçin · Esc iptal` hint. It shows only the bond-order picker plus the status-bar text.
   - The container (`Toolbar.tsx:214`) is a 270×154 px floating card (`s2-atom-options.png`), not a ~36 px strip with an 8 px inset.
2. **[ui] The empty workspace has no viewport buttons** (B.9 MUST; checklist #22).
   - After deleting methane's C, the viewport shows a single line of text: "Başlamak için Atom Ekle aracını seçin…".
   - `ViewportHost.tsx:65-76` (`EmptyHint`) is `pointer-events-none` text only. It has no `Çalışma alanı boş` title and no Atom ekle / Kütüphane buttons. The two buttons exist only in the inspector (`Inspector.tsx:130-133`), so they disappear when the inspector is collapsed (`s3-empty.png`).
   - Kamerayı sıfırla also stays enabled on the empty canvas, while Fit and zoom are disabled.
3. **[ui] The canvas focus ring is removed with no replacement** (B.4 MUST "2 px inset accent ring on :focus-visible"; D.9 #15).
   - `src/index.css:142` sets `#viewport canvas { outline: none; }`. This beats the global `:focus-visible` rule, and nothing else draws a ring.
   - After Tabbing onto the canvas (`document.activeElement` = CANVAS, s3 TAB ORDER), `s3-tabfocus.png` shows no ring anywhere on the viewport.
4. **[ui] The library shows Hill formulas and no coordinate-source line** (A2.1, B.13 MUST; checklist #16, #31).
   - `LibraryBody.tsx:16` uses `formula()` (Hill), so the list reads ammonia `H3N`, sulfuric acid `H₂O₄S` and SO₂ `O₂S` (s3 LIBRARY, `s3-library-search.png`). It should read `NH₃`, `H₂SO₄` and `SO₂`, with Hill in a tooltip.
   - `library.ts` carries `coordSourceText` / `coordSourceTextEn` for every entry, but `LibraryBody.tsx:89-98` never renders them.
5. **[ui] The molecule card omits provenance** (B.12 MUST "Library molecules also show their coordinate-source line; PubChem molecules show `Kaynak: PubChem`").
   - After loading Su from the library, the inspector has no source line (s7 WATER inspector).
   - `Inspector.tsx` `MoleculeSummary` (`:148-255`) has no source row, and `grep coordSource|PubChem src/ui/*.tsx` finds nothing in the inspector.
6. **[ui] The status bar puts essential facts in `ink-faint`** (D.6.6 MUST "12 px `ink-dim`"; D.9 #9 "`ink-faint` carrying essential information").
   - `StatusBar.tsx:83` sets `text-ink-faint` on the whole footer.
   - The atom count (`:86`), bond count (`:88`), selection (`:90`) and camera status (`:99`) inherit it. Only the style label is `ink-dim`. Per D.6.6, only the contextual hint may be `ink-faint`.
7. **[ui] The camera status reports a state that does not match the camera** (SPEC §8 "hardcoded UI states…"; D.6.6 "live camera status from the store").
   - `StatusBar.tsx:10-27` decides between `reset` and `custom` by elapsed time (`SETTLE_MS = 1300` from mount or from the last nonce) instead of comparing the camera with the reset pose.
   - **Reduced motion:** at launch, with no input at all, the footer reads "Kamera: yörünge · 6,34 Å · **özel görünüm**" (s1 FOOTER).
   - **Motion on:** the same launch reads "kamera sıfırlandı" (s7).
   - **After F:** the camera sits exactly at the default pose (2.061, 1.778, 5.726), yet the footer still reads "özel görünüm" (s2 screenshots).
8. **[scene] Space-filling, the judge path's step 4, overflows the viewport** (SPEC §4 "properly centred and scaled"; B.10 step 4).
   - `CameraRig.tsx:282` frames with the *current* style's radii: `collectFit(store.style)`, which is ball-and-stick at launch.
   - Because the style switch rightly keeps the camera, choosing Uzay Dolgulu gives bbox **1.03 × 1.29** of the viewport. That is 129 % of the height, so the methane becomes a clipped white blob filling the canvas (`s7-spacefill.png`, `s2-styles-grid.png`; s7 log).
   - The distance *limits* already use space-fill radii (`:256`). The default framing should too, so that every style fits without moving the camera.
9. **[ui] A collapsed inspector has no edge tab** (D.6.5 MUST "collapsible with an edge tab").
   - After Paneli daralt, the only button on the right edge is the HUD's Kamerayı sıfırla (s7 "edge tab candidates"; `s3-collapsed.png`).
   - Reopening is possible only through the top-bar Info toggle.
10. **[scene] The context-restore path floods the console** (SPEC §8 "console free of avoidable errors and warnings"). Round 1 logged only "Context Lost / Restored".
    - After `WEBGL_lose_context.restoreContext()`, Chrome logs 34 × `WebGL: INVALID_OPERATION: delete: object does not belong to this context` / `deleteVertexArray` (s4 LOGS).
    - The old-context GPU objects are disposed against the new context. They should be dropped on `webglcontextlost` rather than deleted after restore.
11. **[ui] The inspector breaks the D.3 type rules** (D.3 MUST "≤ 4 sizes visible in the inspector (20/16/13/11)… No lowercase text below 12 px"; D.9 #9).
    - The computed font sizes in `<aside>` are 20, 16, 13, 12 and 11 px. That is five sizes, with 12 px used for 24 elements (s6 FONTSIZES).
    - `Inspector.tsx:360` renders the lowercase axis captions `x`, `y` and `z` at `text-micro` (11 px) in `ink-faint`.

## Improvements (art direction and interaction)

- **Framing is still tight and edits leave the frame.**
  - Methane fills 66 % of the canvas height.
  - After growing O, the new hydroxyl H is clipped at the top edge (`s2-grow-O.png`).
  - Nothing auto-frames and nothing gives an off-screen cue. A space-fill-aware fit (item 8) would also fix the breathing room.
- **Cursors deviate from the B.2 table** (`Interaction.tsx:40-42`):
  - The Bond tool shows `default` on empty space; the table wants crosshair.
  - The Delete tool shows `default`/`pointer`, while `index.css:150` sets `not-allowed` on `<main>`; the table wants a crosshair with a danger hover.
  - "Not-allowed" reads as "forbidden" for the one tool whose job is to act.
- **Measure labels collide.** In the dihedral state the H–C label "1,090 Å" and the H–H label "1,780 Å" overprint at the same spot, and the floating dihedral arc is hard to read (`s2-measure-dihedral.png`). Offset the segment labels, or drop the non-adjacent H…H guide label.
- **The inspector is crowded.**
  - The atom card has 6 consecutive `Tahmini` badges.
  - "Geometri (VSEPR tahmini) [Tahmini]" repeats "tahmini" and wraps both the label and the value "Düzgün / dörtyüzlü" over two lines.
  - Rows are ~24 px; D.4 wants ~28 px.
  - Consider one "Tahmini" caption per section instead of a badge per row (`s6-change-element.png`).
- **Coordinates look like input fields.** The x/y/z values sit in bordered, inset `surface-0` boxes that look editable but are read-only divs (`Inspector.tsx:357-363`). Use plain rows.
- **The inspector header always reads "Molekül"**, even while an atom, bond or measurement is shown (`App.tsx:52`). Name the context, or drop the duplicate header.
- **Separator styles are inconsistent.** The bond card title uses an ASCII hyphen ("C-H") while the tooltip uses an en dash ("C–H"). The status bar uses "Bağ C-H".
- **The rail's action group is ambiguous.**
  - The custom "H+" and "H−" icons differ only by a tiny glyph.
  - "Yeni molekül" (FilePlus), a molecule-wiping action, sits beside the editing tools instead of in the File menu.
- **Reset camera uses different icons:** `Focus` in the View menu and `RotateCcw` in the HUD.
- **Library ranking and chips.**
  - Searching "etilen" ranks Sülfürik asit above Etilen (eten), because the list is filter-only with no name-match ranking.
  - The category chip row is clipped mid-word ("Alkol, Ete") with a hidden scrollbar and no fade (`s3-library-search.png`).
- **The launch save label "Otomatik kayıt açık" uses a check icon**, which reads as "saved". D.6.1 defines only saved/saving/unsaved/error.
- **Scene element labels are small**, about 10 px glyphs with an outline (`s3-labels.png`). They are legible but below the 12 px floor the DOM follows.
- **Missing SHOULD items:**
  - The hint chip ("Çift tıkla: odaklan · ? kısayollar")
  - The axis gizmo
  - Double-click focus
  - A self-hosted Inter font: `document.fonts` is empty, so the UI renders in Segoe UI.
- **The status bar is 26 px**; the spec says 24.

## Not verified here

- Tablet and mobile layouts.
- Performance budgets (draw-call delta, tristearin orbit p95).
- The full science oracle set.
- Import error paths and the PubChem offline state.
- WebGL-unavailable mode.

These belong to the other lenses.
