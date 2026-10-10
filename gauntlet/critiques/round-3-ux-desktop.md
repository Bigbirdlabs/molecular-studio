# Round 3 critique: spec compliance, art direction and interaction (desktop 1440x900)

**Critic:** independent, fresh context. I judged HEAD `190f5b3` ("Gauntlet round 2: fix critic findings"). The working tree is clean apart from untracked critique folders.

**Build judged**
- `dist/` was empty, so I ran `npx vite build` once (`gauntlet/logs/critic-r3-uxd-build.txt`).
- I also made a test-hook build of the same source with `VITE_TEST_HOOK=1` in `gauntlet/scratch/critic-r3-uxd2/dist-hook` (`critic-r3-uxd-build-hook.txt`). It exposes `window.__MOLECULAR_SCENE__.snapshot()`.
- I served both with `vite preview` on ports 4191 and 4192 and killed both afterwards. No headless Chrome is left running.

**How it was driven**
- Raw CDP with headless Chrome and swiftshader.
- 1440x900 at dpr 1, with `?nointro`.
- A fresh profile for each script.
- `prefers-reduced-motion: no-preference` was emulated, except in s5, which tests reduced motion.

**Evidence**
- Screenshots: `gauntlet/critiques/r3uxd2/`
- Logs: `gauntlet/logs/critic-r3-uxd-s1.txt` through `-s5.txt`
- Scripts: `gauntlet/scratch/critic-r3-uxd2/s1-s5.mjs`

**Console**
- 0 errors, 0 warnings and 0 exceptions through B.10 and every flow below. The four `LOGS` dumps are empty.
- The forced context loss/restore logs only three.js's two `console.log` lines (Context Lost / Context Restored). The round-2 `INVALID_OPERATION` flood is gone.

**Verdict: FAIL. Score: 66/100** (round 2: 63).

What round 3 fixed:
- The canvas focus ring.
- Conventional formulas and coordinate-source lines in the library.
- Inspector provenance.
- Space-fill framing.
- The context-restore console flood.
- The x/y/z caption sizes.
- Tool cursors.

What is still wrong:
- Four round-2 blockers were not touched: the tool-options strip, the empty-state buttons, the status-bar `ink-faint`, and the inspector edge tab.
- The camera status still misreports, in a new way.
- The WebGL context-loss overlay is gone entirely. That is a regression.

## Verified working (desktop)

| Check | Result | Evidence |
|---|---|---|
| Grid | Header 0–45, rail 48 px, canvas 1072×829 filling `<main>`, inspector 320 px, footer 26 px. `scrollWidth` 1440 = `innerWidth`; `lang=tr`. | s1 RECTS |
| Launch | Methane, ball-and-stick, oblique. Fit bbox 0.34 × 0.42 of the canvas, centre (−0.012, −0.016) NDC. Inspector **CH₄ · 16,04 g/mol · 16,0313 u**. Status: Top-Çubuk · 5 atom · 4 bağ. | s1, `s1-launch.png` |
| Idle | `render.frame` 121 → 121 over 3 s | s4 |
| Hover | "C · Karbon · 4/4 bağ"; bonds show "C–H …" where they are not covered by an atom (the atom wins when they overlap, per B.1) | s2, s4 SWEEP |
| Click C | Z 6, 12,011 u, X/Y/Z 0,000, sp³ / Düzgün dörtyüzlü / AX₄ / LP 0, Gasteiger −0,08 (Tahmini). Two-tone shell: dark inner rim plus accent; colour unchanged. | s2, `crop-shell.png` |
| Eight tools | `aria-pressed`. Cursors: V default/pointer, R grab, P move, Z zoom-in, A/B/D/M crosshair. Rail tooltip "Ölç [M]". | s2 TOOL, `s4-railtip.png` |
| Camera tools | Rotate orbits. Pan moves the target. Zoom drag dollies 10,10 → 16,32. Select-tool empty drag orbits. Right-drag pans. Wheel zooms. F and HUD reset return to the launch pose (3.28, 2.80, 9.13). HUD Sığdır / Yakınlaş work. | s2 |
| Measure | 1,090 Å / 109,5° (tepe C #1) / φ = −120,0°, plus the footnote; numbered badges 1–4; lines drawn on top | s2, `s2-measure-*.png` |
| Render modes | Radii: ballstick 0.46/0.23, spacefill 1.69/1.19 (bbox 0.65 × 0.82, fits), stick 0.14, wireframe = points. Camera and geometries/textures (21/6) unchanged. | s2 STYLE, `sheet-styles.png` |
| Atom tool + O + click H | **CH₄O · 32,04 g/mol**; one undo step | s2 |
| Atom tool, 30 px empty drag | Atom count 6 → 6; undo unchanged | s2 |
| Atom tool, click on empty space | Places O plus auto-H | s2 |
| Undo / redo | Ctrl+Z, Ctrl+Y. Buttons at `opacity-40` with `aria-disabled` when empty. | s2 |
| Bond tool | First click arms it with a ring and "İkinci atoma tıklayın". H–H is refused with a toast and no history entry. | s2, `s2-bond-armed.png` |
| Delete tool | C removes the molecule (undoable). On H with Oto-H on, an honest refusal toast. | s2, s4 |
| Atom drag (Select) | Atom moved; camera bit-identical (3.2865, 2.7989, 9.1292) | s3 |
| Atom card actions | Elementi değiştir C → Si works, with one undo entry. Formal yük stepper present. | s3 |
| Save indicator | "Otomatik kayıt açık" → "Tarayıcıda kaydedildi" after an edit; no spinner; Ctrl+S toast | s2, s3 |
| File menu | `Metan.mol` (valid V2000, 476 B), `Metan.xyz`, `Metan.png` (1072×829) downloaded | s4, `export-png-half.png` |
| View menu | Style radios; Hidrojenleri göster (hides H, counts stay 5/4); Etiketler; Kısmi yükler; Otomatik döndür; reset | s3, s4 |
| Language | EN switches `<html lang>`, every string and the decimal point. Back to TR works. | s3, `s3-en.png` |
| Library | 46 entries, 7 category chips, search "etanol" works, coordinate-source lines; load gives a fitted ethanol | s3 |
| Keyboard | V R P Z A B D M; Cl via the buffer; lone M → Measure; Esc; Delete with nothing selected → toast; Ctrl+A; `?` sheet matches `TOOL_KEYS`; Esc closes the dialog and returns focus | s2, s4 |
| Tab order | Top bar → rail (one stop) → canvas (ring) → HUD → inspector; every stop has a 2 px ring | s1 TABORDER |
| Reduced motion | F is instant (< 50 ms) | s5 |
| Lint greps | gradient/backdrop/#000/#fff returns only `.viewport-bg`; no hex in `src/ui/**/*.tsx`; no non-1.75 strokeWidth | grep |

## Blocking

1. **[scene] The WebGL context-loss overlay was removed (regression)** (B.9 MUST "Context lost → overlay `3B görünüm yeniden başlatılıyor…`… `Yeniden yükle` after 3 s"; checklist #23).
   - *Repro:* `canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`.
   - **Result:** the viewport goes blank. `#viewport` contains no restart text and no `Yeniden yükle` button (s4 "CTX LOST viewport text"; `s4-ctxlost.png`).
   - **Cause:**
     - The `webglcontextlost` handler at `src/scene/Viewport.tsx:112-114` only calls `preventDefault()`.
     - The doc comment at `:66-67` says the overlay "lives in ViewportHost", but `ViewportHost.tsx` has no such overlay.
     - `app.viewRestarting` is referenced nowhere outside `i18n.ts`.
     - `git grep viewRestarting 6a002eb` shows the overlay existed in `ViewportHost.tsx:201`. It was deleted in `4fbe74b`.
   - `restoreContext()` does bring back the 5 atoms, but nothing tells the user what happened, and there is no 3 s reload fallback.

2. **[ui] The tool-options strip still lacks required content** (B.2 MUST "Contextual options for Atom (… Oto-H switch bound to `autoH`), Bond (order + hint `İlk atomu seçin` / `İkinci atomu seçin · Esc iptal`), Measure (live readout + `Temizle`)"; D.6.3 "visible for Atom/Bond/Measure"). This is unchanged since round 2, blocker 1.
   - `src/ui/Toolbar.tsx:215` (`if (tool !== 'atom' && tool !== 'bond') return null`) means Measure has no strip (s2 "TOOL m … opts []").
   - The Atom strip contains only Element and Bağ derecesi (s2 "TOOL a opts", `s2-tool-a.png`). `autoH` still exists only in Settings.
   - This bites in the interaction loop. With the Delete tool, clicking an H gives "Oto-H açıkken hidrojen silinemez… Önce Oto-H'yi kapatın", with no switch anywhere near the canvas (s2 "DELETE H").
   - The Bond strip has no hint text.

3. **[ui] The empty workspace has no viewport buttons** (B.9 MUST "Viewport shows `Çalışma alanı boş` and `Bir element seçip tıklayın…` with two real buttons"; checklist #22). This is unchanged since round 2, blocker 2.
   - After Yeni molekül, or after deleting methane's C, the viewport shows one sentence and nothing else: `EmptyHint`, `ViewportHost.tsx:53-63`, `pointer-events-none` (s3 "EMPTY viewport"; `s3-empty.png`).
   - The buttons exist only in the inspector, so after Paneli daralt the empty canvas offers no action at all.

4. **[ui] The status bar still puts essential facts in `ink-faint`** (D.6.6 MUST "12 px `ink-dim`"; D.9 #9). This is unchanged since round 2, blocker 6.
   - Computed colours (s5): "5 atom", "4 bağ", "Seçim yok" and the camera status are all `rgb(134,142,153)` = `ink-faint`. Only the style label is `ink-dim`.
   - Cause: `src/ui/StatusBar.tsx:124` puts `text-ink-faint` on the whole `<footer>`. D.6.6 allows `ink-faint` only for the contextual hint.

5. **[ui] A collapsed inspector has no edge tab** (D.6.5 MUST "collapsible with an edge tab"). This is unchanged since round 2, blocker 9.
   - After Paneli daralt, the only buttons on the right edge are the HUD's Sığdır and Kamerayı sıfırla (s3 "edge buttons near right"; `s3-collapsed.png`).
   - The only way back is the top-bar Info toggle.

6. **[ui] The camera status still reports states that do not match the camera** (SPEC §8 "Avoid hardcoded UI states that do not correspond to actual application state"; D.6.6 "live camera status from the store").
   - **Atom drag:** dragging an atom with the Select tool leaves the camera bit-identical (s3 ATOMDRAG: 3.2865, 2.7989, 9.1292 before and after), yet the footer flips to "**özel görünüm**".
     - Cause: `StatusBar.tsx:42` treats every Select-tool primary drag as a camera drag (`!EDIT_TOOLS.has(tool)`, where `EDIT_TOOLS` at `:11` excludes `select`). It never checks whether the drag started on an atom.
   - **Stale mode:** after one wheel turn, the mode label stays "Kamera: **yakınlaştırma**" while idle, after F, and after style switches. For example: "Kamera: yakınlaştırma · 10,10 Å · kamera sıfırlandı" (s2 "F reset", "STYLE …").
     - Cause: `cameraStatus.mode` (`:108`) is the last gesture, not the current state.

## Improvements (art direction and interaction)

- **The hover tooltip covers the measurement result.**
  - After the third Measure click, the pointer still rests on that atom. The "H · Hidrojen · 1/1 bağ" chip then sits exactly over the scene's "109,5°" label (`s2-measure-angle.png`).
  - Fix: suppress the hover tip for the just-clicked atom until the pointer moves a few px, or offset the angle label.
- **The angle arc is drawn inside the C sphere.** Its radius is 0.35 × the shorter arm, about 0.38 Å, which is less than C's 0.46 Å display radius. It reads as a tiny cyan hook painted over the sphere (`s2-measure-angle.png`). The dihedral arc floats detached from the bonds (`s2-measure-dihedral.png`). Consider an arc radius of at least the vertex display radius + 0.15 Å.
- **The measure readout uses a bordered `surface-2` card with three 20 px values inside the inspector** (`s2-measure-dihedral.png`). That leans on D.9 #6 (card-in-panel) and spends the app's largest type size three times. Plain rows with a 16 px value would fit the D.3 hierarchy better.
- **The inspector header always reads "Molekül"**, even for the atom card, the bond card and Ölçüm (`App.tsx:52`). Unchanged since round 2.
- **The molecule name is stale after edits.** After Hidrojenleri kaldır, a bare C is still titled "Metan / Methane" above formula `C` (`s3-library.png` background, s3 "EN aside"). After an Atom-tool edit, the name becomes the formula. The two paths should behave the same, and a library name should not label a different structure.
- **Library chips are clipped mid-word** ("Alkol, Ete") with no fade or scroll affordance (`s3-library.png`). Unchanged since round 2.
- **The launch save label "Otomatik kayıt açık" uses a check icon**, which reads as "saved". D.6.1 defines only saved/saving/unsaved/error.
- **Status bar** is 26 px; D.6.6 says 24 px.
- **The HUD segmented control** uses a `line-ctl` border with a 6 px radius. D.6.4 says 1 px `hud-line` and `radius-panel` (8 px); the camera group next to it does use `hud-line` (s5 seg).
- **The inspector scroll container** has `scrollbar-gutter: auto`; D.9 #15 asks for `stable`. Content shifts when sections expand past the fold.
- **Rail action group:**
  - The H+ and H− custom icons differ by one tiny glyph.
  - The molecule-wiping "Yeni molekül" (undoable) sits beside the editing tools instead of in the File menu.
  - The reset-camera icon is `Focus` in the View menu but `RotateCcw` in the HUD.
- **Kısmi yükler mode recolours the atoms** (C pink, H blue; `sheet-s4.png`) with no legend or scale. Faint tints for |q| < 0.1 are uninterpretable without one.
- **Scene labels** (Etiketler, measure values) are about 10 px glyphs with an outline (`sheet-s3.png`). They are legible, but under the 12 px floor the DOM respects.
- **Terminology:** "Kullanılan / izin verilen değerlik" uses the bare "değerlik" that A.6 says to avoid ("Bağ yapma kapasitesi"). This is mainly a chem-props/science-lens item.
- **SHOULD items still absent:**
  - The hint chip.
  - The axis gizmo.
  - Double-click focus.
  - The self-hosted Inter font: `document.fonts` is empty and the UI renders in Segoe UI.

## Not verified here

- Tablet and mobile layouts.
- Performance budgets.
- Import error paths and PubChem offline.
- WebGL-unavailable mode.
- The full science oracle set.

These belong to the other lenses.
