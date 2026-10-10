# Round 4 critique: spec compliance, art direction and interaction (desktop 1440x900)

**Critic:** independent, fresh context. I judged the working tree on top of HEAD `190f5b3`, which has 24 modified files (the round-3 fixes), uncommitted.

**Build judged**
- `dist/` was already fresh (built 23:45, newer than every file in `src/`). I served it with `vite preview` on port 4191.
- I made a test-hook build of the same source with `vite build --mode hook --outDir gauntlet/scratch/critic-r4-uxd/dist-hook` (`gauntlet/logs/critic-r4-uxd-build-hook.txt`). I served it on port 4192 for `window.__MOLECULAR_SCENE__.snapshot()`.
- Both servers and every headless Chrome were killed afterwards. I checked that no listener remains on 4191/4192 and no Chrome with an r4 profile is running.

**How it was driven**
- Raw CDP with headless Chrome and swiftshader.
- 1440x900 at dpr 1, with `?nointro`.
- A fresh profile for each script.
- `prefers-reduced-motion: no-preference`, except in s5, which tests reduced motion.

**Evidence**
- Screenshots: `gauntlet/critiques/r4uxd/`
- Logs: `gauntlet/logs/critic-r4-uxd-s1…s7.txt` and `-s2b.txt`
- Scripts: `gauntlet/scratch/critic-r4-uxd/`

**Console:** 0 errors, 0 warnings and 0 exceptions on launch and through every editing, menu, dialog, library, export and language flow (`LOGS []` in s1, s2, s3, s5 and s7). The exceptions:
- A forced context loss logs three.js's two `console.log` lines.
- Clicking *Yeniden yükle* after a 3.8 s loss adds one `console.warning` "THREE.WebGLRenderer: WEBGL_lose_context extension not supported." (s6). This is outside the B.10 path; see Improvements.

**Verdict: FAIL. Score: 70/100** (round 3: 66).

What round 4 fixed:
- The **WebGL context-loss overlay is back and complete.** The overlay says "3B görünüm yeniden başlatılıyor…". *Yeniden yükle* appears after 3 s and remounts the canvas with the same 5 atoms and the same camera (3.287, 2.799, 9.129). `restoreContext()` also restores (s4, s6, `s4-ctxlost.png`, `s6-ctx-reload.png`).
- **Measure drawing:**
  - The angle arc now sits outside the C sphere.
  - The DOM readout uses plain rows instead of a bordered card with three 20 px values.
  - The hover chip no longer covers the angle label (`s2-measure-angle.png`, `s2-measure-dihedral.png`).
- After *Hidrojenleri kaldır*, the molecule name is no longer the stale "Metan".

What is still wrong:
- Five round-3 blockers were not touched: the tool-options strip, the empty-viewport buttons, the status-bar `ink-faint`, the inspector edge tab, and the camera-status lies.
- One new, small but literal checklist #13 failure (residual damping).

## Verified working (desktop)

| Check | Result | Evidence |
|---|---|---|
| Grid | Header 0–45, rail 48, canvas 1072×829 filling `#viewport`, inspector 320, footer 26. `scrollWidth` 1440 = `innerWidth`; `lang=tr`. | s1 RECTS |
| Launch | Methane, ball-and-stick, oblique. bbox 0.34 × 0.42 of the canvas, centre (−0.012, −0.016) NDC. Inspector **Metan · CH₄ · 16,04 g/mol · 16,0313 u**. Footer "Top-Çubuk · 5 atom · 4 bağ · Seçim yok". | s1, `s1-launch.png` |
| Idle | `render.frame` 123 → 123 over 3 s; 245 → 245 over 1.5 s | s4, s7 |
| Hover | "C · Karbon · 4/4 bağ". Bond tip "C–H …" on the exposed part of three of the four bonds; the atom wins on overlap (B.1). | s2, s4 SWEEP |
| Click C | Z 6, 12,011 u, X/Y/Z 0,000, sp³ / Düzgün dörtyüzlü / AX₄ / LP 0 / 109,5°, Gasteiger −0,08 (Tahmini). Two-tone shell. | s2, `s3-changeelement-open.png` |
| Eight tools | `aria-pressed` correct. Cursors: V default/pointer, R grab, P move, Z zoom-in, A/B/D/M crosshair. Rail tip "Ölç M". Arrow keys rove the rail (Seç → Döndür). | s2, s4, s6 |
| Camera tools | Rotate orbits. Pan moves the target. Zoom drag 10,10 → 16,32. Select-tool empty drag orbits. Right-drag pans. Wheel zooms. F, HUD Kamerayı sıfırla and Sığdır work. HUD Yakınlaş works (8,37). | s2 |
| Measure | 1,090 Å / 109,5° (tepe C #1) / φ = −120,0°, plus the footnote; numbered badges 1–4; lines drawn on top | s2 |
| Render modes | Radii: ballstick 0.46/0.23, spacefill 1.70/1.20 (bbox 0.65 × 0.83), stick 0.14, wireframe = points. Camera and geometries/textures 21/6 unchanged. | s2 STYLE |
| Atom tool + O + click H | **CH₄O · 32,04 g/mol**; one undo step; "Tarayıcıda kaydedildi" after the edit | s2 |
| Atom tool, 30 px empty drag | Atoms 6 → 6; undo unchanged | s2 |
| Undo / redo | Ctrl+Z / Ctrl+Y. Buttons `aria-disabled` and dimmed when empty; tooltip "Geri al Ctrl+Z". | s2, s6 |
| Bond tool | Armed ring and footer "İkinci atoma tıklayın". H–H is refused with "Hidrojen yalnızca bir bağ yapabilir." and no history entry. | s2, `s2-bond-armed.png` |
| Delete tool | Delete C → empty, then undo. Delete H with Oto-H on → honest refusal. | s2, s4 |
| Element change | C → Si gives **SiH₄**, one undo entry; Ctrl+Z gives CH₄ (only after scrolling the picker into view; see Improvements) | s7, `s7-sih4.png` |
| Formal charge | `+` gives C⁺: 3/3, sp², Düzlem üçgen, AX₃, 120°; one undo entry | s6, `s6-charge.png` |
| Atom drag (clean camera) | Camera bit-identical (3.2865, 2.7989, 9.1292), for a small and a large drag | s3, s6, s7 |
| File menu | `Metan.mol` (valid V2000, 476 B), `Metan.xyz` (218 B), `Metan.png` (419 kB) downloaded; toast "Metan.png indirildi" | s3, s4 |
| View menu | Style radios; Hidrojenleri göster (H drawn `hhhh`→hidden while counts stay 5/4); Etiketler; Kısmi yükler (yaklaşık); Otomatik döndür; Kamerayı sıfırla F. Roving focus; Esc returns focus to "Dosya". | s3, s4, s6 |
| Language | EN switches `<html lang>`, every string and the decimal point; back to TR works | s3, `s3-en.png` |
| Library | 46 entries, 7 chips, search "etanol" works, coordinate-source lines; load gives a fitted ethanol (bbox 0.53 × 0.48) with "Kaynak: PubChem" | s3 |
| Keyboard | V R P Z A B D M; Cl via the buffer; lone M → Measure; Esc; Delete with nothing selected → toast "Silinecek bir seçim yok."; Ctrl+A "5 atom seçili"; `?` sheet matches `TOOL_KEYS`; Esc closes the dialog | s2, s4 |
| Tab order | Top bar → rail (one stop) → canvas → HUD → inspector; every stop has a 2 px ring | s1 TABORDER |
| Reduced motion | F instant (< 50 ms) | s5 |
| Inspector rows | 28 px; 4 type sizes (12/13/16/20) | s1, s5 |
| Lint greps | gradient/backdrop/#000/#fff return only `.viewport-bg`; no hex in `src/ui/**/*.tsx`; no strokeWidth other than 1.75 | grep |

## Blocking

1. **[ui] The tool-options strip still lacks required content** (B.2 MUST "Contextual options for Atom (… Oto-H switch bound to `autoH`), Bond (order + hint `İlk atomu seçin` / `İkinci atomu seçin · Esc iptal`), Measure (live readout + `Temizle`)"; D.6.3 MUST "visible for Atom/Bond/Measure"; B.6 MUST "Status/options show progress ("1/4 atom seçildi", then "Mesafe 1,090 Å · Açı 109,5°")"). This is the third round unchanged.
   - `src/ui/Toolbar.tsx:215` still has `if (tool !== 'atom' && tool !== 'bond') return null`. The Measure tool has no strip (s2 "TOOL m … opts []").
   - During a 4-atom measurement the footer shows only the static "Ölç: Mesafe için 2, açı için 3, dihedral için 4 atom seçin" (s2 M1/M2/M4 footer). So with the inspector collapsed there is no progress or readout outside the 10 px scene labels.
   - The Atom strip has Element and Bağ derecesi only (`s2-tool-a.png`).
   - The Bond strip has Bağ derecesi only, with no hint (`s2-bond-armed.png`).
   - **Consequence, now worse:**
     - *Hidrojenleri kaldır* silently sets `autoH: false` (`src/store.ts:897`), with no toast and no visible switch.
     - Ctrl+Z brings the hydrogens back but leaves Oto-H off, because `autoH` is not in history. Every later edit then stops adding hydrogens.
     - The only place to see or fix this is Settings (`s3-settings.png`: Otomatik hidrojen off after the removal).
   - An Oto-H switch in the Atom strip is exactly what B.2 requires.

2. **[ui] The empty workspace still has no viewport title and no buttons** (B.9 MUST "Viewport shows `Çalışma alanı boş` and `Bir element seçip tıklayın…` with two real buttons"; checklist #22). This is the third round unchanged.
   - After deleting C, or after Yeni molekül, the viewport shows one `pointer-events-none` sentence, "Başlamak için Atom Ekle aracını seçin veya kütüphaneden bir molekül açın". There is no title and no button (`EmptyHint`, `src/ui/ViewportHost.tsx:53-63`; s3 "EMPTY viewport"; `s3-empty.png`).
   - The two buttons exist only in the inspector. After *Paneli daralt*, the empty canvas offers no action at all.

3. **[ui] The status bar still puts essential facts in `ink-faint`** (D.6.6 MUST "12 px `ink-dim`"; D.9 #9 "`ink-faint` carrying essential information" = automatic fail).
   - s5 computed colours: "5 atom", "4 bağ", "Seçim yok" and "Kamera: yörünge · 10,10 Å · …" are all `rgb(134,142,153)` = `ink-faint`. Only the style label is `ink-dim`.
   - Cause: `src/ui/StatusBar.tsx:117` (and `:105` for mobile) puts `text-ink-faint` on the whole `<footer>`. D.6.6 allows `ink-faint` only for the contextual hint.

4. **[ui] A collapsed inspector still has no edge tab** (D.6.5 MUST "collapsible with an edge tab").
   - After *Paneli daralt*, the only controls at the right edge are the HUD's Sığdır and Kamerayı sıfırla (s3 "edge buttons near right"; `s3-collapsed.png`).
   - The only way back is the top-bar Info toggle, 830 px away.

5. **[ui] The camera status still reports states that do not match the camera** (SPEC §8 "Avoid hardcoded UI states that do not correspond to actual application state"; D.6.6 "live camera status from the store").
   - **Atom drag:** a Select-tool atom drag leaves the camera bit-identical (3.2865, 2.7989, 9.1292 before and after; s3, s6, s7). Yet the footer flips to "**özel görünüm**".
     - Cause: `StatusBar.tsx:40` marks every primary drag in Select as a camera drag (`!EDIT_TOOLS.has(tool)`; `EDIT_TOOLS` at `:9` excludes `select`). It never checks whether the drag began on an atom.
   - **Stale mode:** after a wheel turn, then F, the footer reads "Kamera: **yakınlaştırma** · 10,10 Å · kamera sıfırlandı" (s6 "after F footer"; the same after HUD reset in s2, and in `s4-charges.png`).
     - Cause: `cameraStatus.mode` (`StatusBar.tsx:101`, `store.ts:582`) is the last gesture, not the current state. The camera is not zooming.

6. **[scene] An atom drag moves the camera after any prior orbit drag** (checklist #13 MUST "Dragging an atom leaves `snapshot().camera.position` identical"; B.2 Select row). This is new; it is small but reproducible.
   - *Repro:* the s2 sequence, re-run as s2b. In the Atom tool, do the 30 px empty-space orbit drag, then a few edits and undos. Press V and wait 2.5 s.
   - The camera is stable (`PRE-DRAG stable? true`, 1.456426, 2.798921, 9.593098). Drag an H by 60×30 px.
   - The camera is now (1.456162, 2.798921, 9.593138) and stays there (`DRAG +1.5s`). The atom moved (undo enabled).
   - **Cause (inferred):** OrbitControls damping (`CameraRig.tsx:93-94`) stops dispatching `change` below its epsilon, so the demand loop goes idle with a residual spherical delta. The atom drag's frames call `c.update(delta)` (`CameraRig.tsx:487`), which applies the leftover.
   - On a clean camera the drag is bit-identical (s3, s6, s7). The drift is invisible (about 2.7e-5 rad), but the checklist test is equality.
   - **Fix:** zero the residual when the loop stops, or skip `c.update()` while `ctx.model.snap` is set.

## Improvements (art direction and interaction)

- **Element-change picker opens below the fold.**
  - Expanding *Elementi değiştir* on the C card puts the second row (Cl, Br, I, Na, Mg, Si, B) at y 860–892 under an 874 px panel edge (s7 "Si btn rect").
  - The panel does not scroll it into view, and a click at the visible half lands on the status bar. In s6 a click on Si did nothing.
  - Fix: `scrollIntoView({block:'nearest'})` when the section opens.
- **The inspector header always reads "Molekül"**, even for the atom card, the bond card and Ölçüm (`App.tsx:52`; s6 "insp header for atom card Molekül"). Unchanged since round 2.
- **Library category chips are clipped mid-word** ("Alkol, Ete…") with no fade or scroll affordance (`s3-library.png`). Unchanged since round 2.
- **The launch save label "Otomatik kayıt açık" uses the same green check** as "Tarayıcıda kaydedildi" (`s1-launch.png`). D.6.1 defines only saved/saving/unsaved/error; a check reads as "saved" before anything was saved.
- **HUD segmented control** has a `line-ctl` border and a 6 px radius (s5 seg: `rgb(107,112,120)`, `6px`). The camera group beside it uses `hud-line`/8 px (`controls.tsx:81`), so the two HUD chips do not match. D.6.4 says `hud-line` + `radius-panel`.
- **The inspector scroll container** has `scrollbar-gutter: auto` (s5 insp; `App.tsx:60`); D.9 #15 asks for `stable`.
- **The status bar is 26 px**; D.6.6 and the D.8 grid say 24 px (`StatusBar.tsx:117`).
- **The tool-options card is 270×154 px**, not the "~36 px strip" of D.6.3. The 14-element grid forces the height; consider a single-row strip with the grid in a popover-free second row only when the Atom tool is active.
- **Mixed icon sizes inside the top bar:**
  - Action icons are 17 px, the chevrons 13 px and the save check 14 px. The rail and HUD next door are 18 px (s1 ICONS).
  - D.9 #8 forbids "mixed icon sizes within one region". At minimum, unify the action icons with the rail's 18 px.
- **The 3-line provenance paragraph at the top of the molecule card** ("Koordinatlar: İdealize geometri (enerji minimizasyonu değil); …") pushes mass and counts down. A one-line caption with a tooltip would read more like a desktop tool.
- **Badges:**
  - The valence badge "✓ Tamam" is a green bordered chip (`s2-bond-armed.png`). D.0 wants state colour "as dots, icons or text", and D.9 #6 bans pill badges. A green check plus text, with no border, would comply.
  - Element-picker chips carry CPK-coloured underline bars. This is defensible as data coding, but it puts the most saturated colour in the chrome.
- **Kısmi yükler mode** recolours atoms (C pink, H blue; `s4-charges.png`) with no legend or scale. Unchanged since round 3.
- **Scene labels** (Etiketler, measure values) are about 10 px glyphs (`s2-measure-dihedral.png`, `s3-hidden-H.png`). They are legible, but below the 12 px floor the DOM respects.
- **EN inspector:** "12.0000 u" sticks about 4 px past the right padding where the label wraps to two lines (`s3-en.png`).
- **Context-loss reload** logs a `console.warning` from three's `forceContextLoss` on the outgoing renderer (s6 LOGS). This is harmless, but the console should stay clean in every recovery flow.
- **Screen-reader announcer:** undoing a delete is announced as "C atomu eklendi" (s4 viewport text after undo). An undo should read as an undo.
- **SHOULD items still absent:**
  - The hint chip.
  - The axis gizmo.
  - The self-hosted Inter: `document.fonts` is empty and the UI renders in Segoe UI (s1).

## Not verified here

- Tablet and mobile layouts.
- Performance budgets (tristearin p95).
- Import error paths and PubChem offline.
- WebGL-unavailable mode.
- The full science oracle set.

These belong to the other lenses.
