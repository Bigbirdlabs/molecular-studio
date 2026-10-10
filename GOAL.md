# GOAL.md — Molecular Studio acceptance bar

Precedence: SPEC.md is authoritative. If this file and SPEC.md ever disagree, SPEC.md wins and this file is corrected. BRIEF.md is the original Turkish competition brief (5 requirements, "scientific accuracy" judged).

Method: Gauntlet Loop (gauntlet/gauntlet-loop-method.md). This file states the DESTINATION and the BAR. It does not prescribe architecture or work splitting. Builders never grade themselves. Critics are fresh-context agents (Sonnet class) that see only: this file, SPEC.md, the running artifact (`vite build` output served locally, plus `?m=<id>` deep links), the test logs and the screenshots. Critics never see builder notes, summaries or commit messages.

Goal (one sentence): a browser-based 3D molecular modeling application — a refined, minimal, dark scientific desktop tool for the web, not a dashboard — that opens on a correctly centered 3D methane (CH4), lets a user orbit, pan, zoom, select, measure, build and edit molecules with correct chemistry (valence, hydrogens, VSEPR geometry), reports only values that are calculated or reliably known, and works with a distinct interaction model on desktop, tablet and phone, at a polish level above MolView.

UI language: Turkish by default (competition is Turkish) with an English toggle in Settings. All user-visible strings go through `src/ui/i18n.ts`. Code and comments are English.

---------------------------------------------------------------------------
## 0. How the bar is judged (rules for every critic)

- R0.1 Evidence only. A criterion passes only with an artifact: a vitest assertion in `gauntlet/logs/*.txt`, a Playwright/CDP script result, a screenshot in `gauntlet/ab/`, or a number measured by script. "Looks fine in the code" is a FAIL.
- R0.2 Verdict per criterion: PASS / FAIL / UNVERIFIABLE. UNVERIFIABLE counts as FAIL for MUST items.
- R0.3 When anything fails, the critic names the LARGEST single gap (one sentence, with the criterion ID), not a laundry list.
- R0.4 Builders must not edit this file, SPEC.md, the reference-value table (section 8) or the test oracles to make a criterion pass. Oracle changes need a lead-written justification with a literature citation.
- R0.5 Heavy commands run once, output saved to `gauntlet/logs/<name>.txt`, then grepped (user watches CPU/RAM). Never leave `npm run dev` or a preview server running.
- R0.6 Hard gates run first. If any G-gate fails, nothing else is graded:
  - G1 `npx tsc --noEmit` exits 0 (strict, no `any` escapes, no `@ts-ignore`).
  - G2 `npx vitest run` exits 0, zero skipped tests in tests/geometry, tests/properties, tests/io, tests/library.
  - G3 `npx vite build` exits 0, and the app loads with zero console errors, zero console warnings and zero uncaught promise rejections at 1440x900, 1024x768 and 390x844.
  - G4 i18n completeness: every user-visible string comes from `src/ui/i18n.ts`; the `tr` and `en` dictionaries have identical key sets (test); a grep for hard-coded literal UI words in JSX (outside i18n.ts, comments, identifiers, element symbols) returns nothing; with locale `tr` no English UI words (Save, Delete, Undo, Loading, Error, ...) appear in the rendered DOM text.
  - G5 No fabricated values: grep and tests confirm there is no dipole-moment code or UI, and no property is displayed that is not produced by `properties.ts`, `elements.ts` or the molecule data itself (see section 8.6).

---------------------------------------------------------------------------
## 1. Art direction and visual identity (SPEC section 2)

Verification harness: screenshots at 1440x900 and 390x844 plus computed-style probes via Playwright.

- A1.1 Given the app at rest, when the critic inspects computed styles, then surfaces are near-black/charcoal, borders are subtle neutral (low-contrast, 1 px), and brighter hues appear only on molecular elements (CPK), selection, hover and meaningful state (valence error, success). One type family, one icon set (lucide SVG, no emoji icons), consistent 4/8-pt spacing, visible keyboard focus rings.
- A1.2 Given the stylesheet, when grepped and probed, then there is no `backdrop-filter`, no glowing box-shadow borders, no multi-stop decorative gradients on chrome, no oversized headings (largest UI heading <= 20 px), and no generic SaaS card grids. The only gradient allowed is a restrained viewport background.
- A1.3 Given the 3D viewport, then it is the visual centerpiece: at 1440x900 it occupies >= 60 % of the window area (measured), panels never cover the molecule at default state.
- A1.4 Every UI element has a purpose: no decorative filler, no tiny labels (text >= 12 px, 11 px only for secondary units), no overcrowded panels (<= 8 visible property rows per inspector group before progressive disclosure).
- A1.5 Optional light theme is a SHOULD, not a MUST; the dark theme is the designed default.

## 2. Application layout (SPEC section 3)

Verification harness: Playwright at 1440x900; DOM queries by accessible name; screenshots.

- L2.1 Top bar contains: logo + "Molecular Studio" name, current project name (editable or at least the molecule name), REAL save status (states derived from actual store state: saved / unsaved changes; never a hardcoded "Saved"), undo and redo (disabled when stacks are empty), view options, settings (language TR/EN, reduced motion preference, theme if present), and a clear control to open molecule information (opens the inspector on desktop/tablet, the bottom sheet on mobile). Verify: edit the molecule -> status flips to unsaved; export/save -> status updates.
- L2.2 Left vertical toolbar contains exactly these tools with distinct active/inactive states and Turkish accessible names/tooltips: Select (Seç), Rotate (Döndür), Pan (Kaydır), Zoom (Yakınlaştır), Add Atom (Atom Ekle), Add Bond (Bağ Ekle), Delete (Sil), Measure (Ölç). Only one tool is active at a time; the active tool is reflected in the cursor, the status bar and `aria-pressed`.
- L2.3 Every toolbar tool is genuinely functional (see section 4 and 5 for the behaviors). A tool that does nothing is a FAIL; if something cannot be done correctly it must be removed or shown with an honest disabled state and a Turkish explanation tooltip.
- L2.4 Central 3D workspace: large responsive Three.js viewport, antialiased, proper lighting, efficient rendering; a genuine 3D scene, never an image.
- L2.5 Right contextual inspector (fields in section 6). Collapsible on desktop and tablet with a smooth transform/opacity transition.
- L2.6 Subtle bottom status bar showing: current visualization mode, atom count, bond count, current selection, camera/workspace status (active tool, and camera state such as "kamera sıfırlandı" vs. custom view). Values come from the store, never hardcoded. Low-contrast, non-distracting.
- L2.7 Empty and error states: empty canvas shows a hint ("Bir atom eklemek için tuvale dokunun" / English equivalent); invalid selection (selected id no longer exists after undo/delete) clears gracefully with no exception; PubChem/import failures show a translated error toast, never a crash. WebGL-unavailable shows a translated message instead of a blank screen.

## 3. Initial molecular experience (SPEC section 4)

Verification harness: Playwright load of the built app with no query string, then `?m=<id>`.

- M3.1 Given a cold load with no query, when the page has loaded, then within 3 s the canvas shows METHANE (id `metan`): 1 C + 4 H, 4 bonds, ball-and-stick, CPK colors (C grey/dark, H white), real tetrahedral coordinates (H-C-H 109.5 ± 0.5° in the library data), centered at the origin and scaled so the molecule fills the viewport with 10-20 % margin. Verify: store dump + pixel-based bounding box ratio.
- M3.2 Given `?m=<id>` for any library id, then that molecule loads on startup (default `metan` when absent or unknown, with no error).
- M3.3 Given the three required visualization modes — Ball & Stick (Top-Çubuk), Space Filling (Uzay Dolgulu), Wireframe (Tel Kafes) — plus Stick (Çubuk) as allowed extra, when each is chosen, then the 3D representation visibly differs (not a label change): spacefill radii equal Bondi vdW radii (C 1.70, H 1.20, N 1.55, O 1.52 Å, tolerance 0.01); ball-and-stick atoms are visibly smaller than vdW and bonds are cylinders; wireframe draws no spheres; stick draws uniform-radius sticks with joined ends. The change is animated within 300 ms (no pop) and honors reduced motion. Verify: instance scale read through the test hook and four screenshots `gauntlet/ab/styles-*.png` that differ by a measured pixel delta.
- M3.4 Multiple bonds render faithfully: ethylene double bond = 2 parallel cylinders, acetylene triple = 3, benzene aromatic bonds drawn with an equalized/inner-ring depiction visibly different from alternating single/double. Verify: screenshots of `?m=etilen`, `?m=asetilen`, `?m=benzen`.
- M3.5 Users immediately understand the molecule is a real interactive object: first orbit drag changes the view; hover highlights an atom; the cursor changes with tool.

## 4. Interaction, camera and animation (SPEC sections 3C, 6)

Verification harness: Playwright mouse/touch scripts, frame-sequence capture, timing assertions.

- C4.1 Orbit: left-drag (Select/Rotate tool) orbits with damping; the molecule never leaves the viewport. Zoom: wheel/pinch zooms smoothly between 3x closer and 3x farther than the fitted distance with no near-plane clipping. Pan: right-drag, two-finger drag, or Pan tool. Zoom tool: drag vertically (or click/alt-click) zooms. Rotate tool: drag rotates the MOLECULE/camera deliberately even when starting on an atom. Verify: scripted drags change screenshots; camera distance clamp asserted.
- C4.2 Reset: the "fit/reset camera" action (button + `F` key) animates (400-800 ms, eased; instant under reduced motion) to frame the whole molecule with 10-20 % margin; the status bar reports the reset. Verify: bounding-box-in-viewport ratio.
- C4.3 Selection: with the Select tool, clicking an atom selects it with clear visual feedback (distinct selection ring/outline, cyan/blue family) and the inspector updates; clicking empty space clears; clicking a bond selects the bond. Hover gives a highlight within 120 ms and a cursor change. Selection colour is never confused with the valence-error colour (red).
- C4.4 Responsive 3D under UI change: opening/closing panels or resizing the window never resets the camera or re-creates the scene; the canvas resizes smoothly.
- C4.5 Motion policy: animations clarify, not decorate. Atom add: spring pop (scale 0 -> ~1.1 -> 1.0, 250-400 ms) with the bond growing from the parent. Atom/bond delete: shrink out 150-250 ms, auto-added hydrogens emerge from their parent. Clean-up/relax: atoms glide (eased, not snapped) and bond cylinders follow in the same frame. Library switch: old molecule scales out, new scales in, camera refits (400-700 ms total). No idle animation loops by default (auto-rotate and thermal breathing exist only as opt-in toggles, default off). Verify: >= 6 distinct intermediate frames in a 30 fps capture of an atom add.
- C4.6 Reduced motion: with `prefers-reduced-motion: reduce` (emulated), every non-essential animation is off or reduced to a near-instant opacity change: no spring pop, no camera glide longer than 50 ms, no auto-rotate, no breathing, no panel slide. The Settings toggle can force it on. Verify: Playwright `reducedMotion: 'reduce'` run + frame capture shows end state in <= 2 frames.
- C4.7 No animation may block input: starting a new edit while an animation runs yields a correct final state (stress test: 20 rapid clicks -> correct atom count and formula, no exceptions). The store is the single source of truth; animation is presentation only.
- C4.8 UI chrome motion (panel open/close, tool switch, toast, tooltip, bottom sheet) uses consistent easing and 150-350 ms durations, animates `transform`/`opacity` only, with no frame > 32 ms.

## 5. Editing: tools, hydrogens, undo (SPEC section 3B, "real interactions where feasible")

Verification harness: Playwright click paths on the built app; assertions read store state through a read-only test hook (present in test builds, absent in the presentation frame) AND the inspector DOM text.

- E5.1 Add Atom tool, empty canvas: given an empty canvas and element C, when the user clicks once, then one carbon appears at the click location and is saturated to CH4 (4 H in tetrahedral positions). Verify: atoms = 5, formula `CH4`, all H-C-H = 109.5 ± 3°.
- E5.2 Add Atom from an existing atom: given CH4, when the user clicks a hydrogen with element C, then ethane results: formula `C2H6`, C-C 1.54 ± 0.05 Å, C-H 1.09 ± 0.05 Å, minimum interatomic distance > 0.8 Å. Placement direction is VSEPR-correct away from existing neighbours (`placeNewAtom`).
- E5.3 Add Bond tool: click atom A then atom B (or drag A to B) creates or cycles the bond (single -> double -> triple). Ethane + double bond -> ethylene `C2H4` (surplus H removed, one per carbon), C=C 1.34 ± 0.05 Å, all 6 atoms coplanar (max out-of-plane < 0.1 Å), H-C-H ~ 117-122°. Triple -> acetylene `C2H2`, C≡C 1.20 ± 0.05, H-C-C 180 ± 3°.
- E5.4 Heteroatoms: placing O on a carbon of ethane gives `C2H6O`; O has exactly 1 H (O-H 0.96 ± 0.05), C-O 1.43 ± 0.05, C-O-H ~ 104-110°. N gets 2 H, halogens 0 H.
- E5.5 Valence violations are shown, never silently accepted or deleted: a 5-bonded carbon, a double bond onto a saturated H, etc., flag the atom with a red ring/badge, a translated message (e.g. TR "Değerlik aşıldı: C en fazla 4 bağ yapabilir"), and an entry in the inspector issues list and `molProperties().issues`. Color is never the only carrier: icon + text accompany it.
- E5.6 Delete tool / Delete key: erasing an atom removes its bonds and repairs former neighbours with auto-hydrogen (no dangling valences); erasing a bond does the same for both ends; erasing nothing selected does nothing and says so honestly in the status bar.
- E5.7 Undo/redo: after 10 mixed edits, Ctrl+Z x10 returns the initial molecule (atom count, bond list, positions within 1e-6); Ctrl+Y or Ctrl+Shift+Z redoes. On-screen buttons disable when the stack is empty. Atom and bond IDs remain stable across undo/redo of unrelated edits. Selecting an id that disappears via undo clears the selection safely.
- E5.8 Hydrogen management: "H Ekle" (`addAllHydrogens`) / "H Kaldır" (`removeAllHydrogens`) on ethanol yield `C2H6O` (9 atoms) and the C2O skeleton; round trip restores the same formula.
- E5.9 Clean-up/relax: on caffeine jittered by 0.5 Å per atom, "Temizle" relaxes with animation (< 2 s) to bond lengths within ±0.1 Å of ideal, no NaN; force-field energy from `relaxStep` is non-increasing (1 % noise allowed) over the run.
- E5.10 Measure tool: picking 2 / 3 / 4 atoms draws a distance (Å), angle (°) or dihedral (°) in the 3D scene with a label, lists it in the inspector, and agrees with an independent calculation in tests to 0.01. Changing tool or pressing Esc clears the measurement.
- E5.11 Import/export: Molfile V2000 export -> re-import preserves formula, bond orders, charges, coordinates within 0.001 Å; XYZ round trip preserves coordinates and re-perceives the same bonds for library molecules; PubChem search ("aspirin", CID 2244) returns a molecule when online; offline/unknown name shows a translated error toast. Save status reflects export/save actions truthfully.
- E5.12 Library: a library panel (categorized) loads a molecule with the E4 transition; deep link reproduces it (M3.2).
- E5.13 Discoverability: a first-time user can add 3 atoms and 2 bonds in < 90 s using only on-screen hints (tool tooltips, empty-state hint). Keyboard shortcuts (V select, R rotate, P pan, Z zoom, A atom, B bond, E/Delete delete, M measure, F fit, Ctrl+Z/Y, Esc) are listed in a shortcuts dialog.
- E5.14 Edit latency: click to updated geometry <= 100 ms for <= 100 atoms; auto-hydrogen and one relax step each <= 16 ms median (unit benchmark, 50 atoms).

## 6. Inspector panel (SPEC section 3D, "only reliable information")

Verification harness: scripted selection + reading panel DOM text; unit tests on `atomInfo`, `bondInfo`, `molProperties`.

- I6.1 Nothing selected: shows the molecule summary: name, Hill formula with real subscripts (C₈H₁₀N₄O₂), molar mass (g/mol, 3 decimals), atom count, bond count, bond-order breakdown, ring/aromatic ring counts, composition by element with percent bars, net charge, H-bond donors/acceptors, rotatable bonds, degrees of unsaturation, size (Å), functional groups (translated), Lipinski verdict, and the `issues` list when non-empty.
- I6.2 Atom selected: element name (TR/EN) + symbol, atomic number, atomic mass, coordinates (x, y, z in Å, 3 decimals), hybridization, VSEPR geometry name, steric number, lone pairs, valence used/allowed, formal charge, neighbours, electronegativity, covalent radius, valence-state badge (tamam / eksik / aşırı with icon + text), partial charge. Partial charge is labelled approximate (TR "Gasteiger kısmi yükü (yaklaşık)"), at most 3 decimals. Values match section 8 (water O: sp3, bent geometry, steric 4, 2 lone pairs).
- I6.3 Bond selected: label (e.g. C=O), order name, measured length vs ideal length, ΔEN with polarity class (apolar < 0.4, polar 0.4-1.7, iyonik > 1.7), sigma/pi counts (single 1σ, double 1σ+1π, triple 1σ+2π), in-ring and aromatic flags, atoms joined.
- I6.4 Live updates: all numbers update within 100 ms of any edit and are correct after undo; no stale data.
- I6.5 No fabrication: the panel contains NO dipole moment, no logP, no boiling/melting point, no energy presented as quantum-chemical. Anything approximate carries an explicit "yaklaşık"/"approx." label; the force-field energy (if shown) is labelled indicative. Every property has a translated label and unit; hover/help explains non-obvious ones in one sentence.
- I6.6 Element picker shows at least H, C, N, O, F, P, S, Cl, Br, I, B, Si, Na, K, Mg, Ca, Fe, Zn with CPK swatches and translated names.
- I6.7 Molecule-info access: the top-bar control opens the inspector (desktop/tablet) or bottom sheet (mobile); the inspector state is remembered per session.

## 7. Responsive design and accessibility (SPEC section 7)

Verification harness: Playwright at 1440x900 (desktop), 1024x768 and 820x1180 (tablet), 390x844 (mobile, touch, DPR 3), 360x740; axe-core optional.

- R7.1 Desktop: full workspace, persistent toolbar and inspector, maximum viewport. No horizontal scroll.
- R7.2 Tablet: flexible panels, collapsible inspector (collapsed state keeps the canvas dominant), touch-friendly controls (targets >= 44 px), orientation change does not reset the camera.
- R7.3 Mobile: this is a different interaction model, not a scaled-down desktop. The viewport comes first and fills the screen; tools live in a compact bottom dock or collapsible rail with >= 44x44 px targets; molecule information appears in a draggable bottom sheet (peek / half / full snap, swipe-down to close); library opens as a sheet too. `document.documentElement.scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1440 widths. Verify: scripted measurements + `gauntlet/ab/mobile-*.png`.
- R7.4 Touch gestures: one-finger drag orbits, two-finger pinch zooms, two-finger drag pans, tap selects (or adds with the atom tool), long-press on an atom opens quick actions (change element / delete). Canvas has `touch-action: none`; page has `overscroll-behavior: none`; no browser pinch-zoom or pull-to-refresh interference. Verify with CDP touch synthesis.
- R7.5 No overlapping controls, no clipped text at any tested width; text >= 12 px.
- R7.6 Accessibility basics: every control has an accessible name in the active language; keyboard operation for all non-3D functions; sane tab order; visible focus; color never the only state carrier; axe-core 0 critical violations; panel text contrast >= 4.5:1.
- R7.7 First meaningful paint < 2 s on a localhost build; initial JS <= 1.2 MB gzip (code-split the library data if needed); a genuine skeleton only while the WebGL context actually initializes (no fake loading indicators).

---------------------------------------------------------------------------
## 8. Scientific accuracy bar (hard, test-checkable)

Tolerances are part of the bar. Tests live in tests/*.test.ts and must assert exactly these numbers. Sources: IUPAC 2021 standard atomic weights, NIST CCCBDB, CRC Handbook. These values are FROZEN (R0.4).

### 8.1 Molar mass (g/mol, ±0.01 with H 1.008, C 12.011, N 14.007, O 15.999)
| Molecule | Hill formula | Molar mass |
|---|---|---|
| Water | H2O | 18.015 |
| Methane | CH4 | 16.043 |
| Ammonia | H3N | 17.031 |
| CO2 | CO2 | 44.009 |
| Ethanol | C2H6O | 46.069 |
| Benzene | C6H6 | 78.114 |
| Glucose | C6H12O6 | 180.156 |
| Aspirin | C9H8O4 | 180.158 |
| Caffeine | C8H10N4O2 | 194.19 (±0.02) |

Hill rule: with carbon, C first, H second, the rest alphabetical; without carbon, all alphabetical (H3N, ClH). Charged species append the charge (NH4+ -> `H4N+`, net charge +1). Monoisotopic checks: water 18.0106, caffeine 194.0804 (±0.001). A conventional-name title (NH3) may appear in the molecule name, but the formula field is Hill.

### 8.2 Counts and indices
- H-bond convention (stated in the panel): donors = N/O atoms bearing H; acceptors = N + O atoms. Water 1/1; ethanol 1/1; caffeine 0/6; aspirin 1/4; glucose 5/6.
- Rotatable bonds: ethanol 0 or 1 (convention stated), aspirin 3-4, benzene 0.
- Rings (total/aromatic): benzene 1/1, naphthalene 2/2, cyclohexane 1/0, caffeine 2 rings (aromaticity perception must be consistent).
- Degrees of unsaturation: benzene 4, ethylene 1, acetylene 2, caffeine 6, ethane 0.
- Lipinski: aspirin 0 violations (passes); a hand-built C40 alkane has >= 1 violation.

### 8.3 Geometry (VSEPR; ±3° for ideal angles, lone-pair compressed ones as noted)
| Molecule | Angle | Expected |
|---|---|---|
| CH4 | H-C-H | 109.5° |
| H2O | H-O-H | 104.5° (accept 103-106°) |
| NH3 | H-N-H | 107° (accept 105-109°); trigonal pyramidal |
| BF3 | F-B-F | 120°; trigonal planar |
| CO2 | O=C=O | 180°; linear |
| C2H4 | H-C-H / H-C=C | ~117° / ~121°; planar |
| C2H2 | H-C≡C | 180° |
| H2C=O | H-C-H | 116 ± 3°; planar |
| SF6 (stretch) | F-S-F | 90°, octahedral, steric number 6 |

Hybridization: CH4 C sp3; C2H4 C sp2; C2H2 C sp; CO2 C sp; benzene C sp2; water O sp3 (steric 4, 2 lone pairs); NH3 N sp3 (steric 4, 1 lone pair); BF3 B sp2 (steric 3, 0 lone pairs).

### 8.4 Bond lengths (Å, ±0.05 unless stated)
C-C 1.54; C=C 1.34; C≡C 1.20; aromatic C-C 1.39 (±0.04); C-H 1.09; O-H 0.96; N-H 1.01; C-O 1.43; C=O 1.21 (±0.04); C-N 1.47; C-Cl 1.77 (±0.06); O-O 1.48. After `addAllHydrogens` and `relaxStep(…, 200)`, every bond in the 10-molecule validation set lies within tolerance.

### 8.5 Automatic hydrogens and valence logic
- Two carbons joined single give C2H6; double C2H4; triple C2H2. C+O: CH4O (methanol). N-single-C: CH5N. C=O on CH2 carbon: CH2O, planar.
- Charges: NH4+ (N valence 4, charge +1) is valid (`H4N+`, net +1); carbonyl O with 3 bonds and no charge is `over`; H with 2 bonds is `over`; C with 3 bonds and no H is `under` unless charge compensates. States are enumerated in `issues` and visible in the UI (E5.5).
- Bond polarity classes: C-H apolar, C-O polar, Na-Cl ionic.

### 8.6 No-fabrication rules (SPEC sections 3D, 5, 8)
- There is NO dipole-moment oracle, calculation or UI anywhere (the old dipole checks are removed). A critic who finds one fails G5.
- Estimates are labelled: Gasteiger partial charges "(yaklaşık)"; relax energy "göstergesel"; any property that cannot be reliably computed is omitted or shown as an explicit "hesaplanamadı / not available" state, never as a plausible number. No value is displayed with more than 3 decimals (false precision).
- Descriptions in the library state only true, verifiable facts (critic fact-checks 10 random entries; one false fact = FAIL).

### 8.7 Library bar (`library.ts`)
- >= 40 molecules in >= 7 categories with Turkish and English names/descriptions, including at least: metan (startup), su, amonyak, karbondioksit, etanol, benzen, glikoz, aspirin, kafein, parasetamol, asetilen, etilen, BF3, glisin, adenin, vitamin C, ibuprofen, a >= 70-atom entry (kolesterol class) and a >= 100-atom entry for the performance test.
- Each entry: every atom `state === 'ok'`, entry description formula equals the computed Hill formula, relaxed bond lengths within ±0.1 Å of ideal, no atom pair < 0.7 Å, one connected component unless a salt, no NaN. A test iterates the whole LIBRARY.
- Integration smoke test: every library entry loads through store -> properties -> scene without throwing.

---------------------------------------------------------------------------
## 9. Performance and engineering quality (SPEC section 8)

- P9.1 >= 50 fps (median over 10 s of continuous orbit, rAF deltas measured in page) for a ~100-atom molecule on the reference machine (Acer Nitro AN517-55 class: i5-12500H, RTX 3050 Laptop, plugged in, Chromium); p95 frame time <= 25 ms. Integrated-GPU mid laptops stay >= 30 fps.
- P9.2 Atoms and bonds are rendered with InstancedMesh; <= 12 draw calls for atoms+bonds regardless of atom count (`renderer.info.render.calls` via the hook); no per-atom React components in the render path.
- P9.3 UI state changes (panel toggles, hover text, toasts) do not re-render the 3D scene: React Profiler/render counters show zero scene re-renders on inspector open/close and tool change; hover uses refs/imperative updates, not React state per frame.
- P9.4 Three.js resources are disposed: after 20 library switches `renderer.info.memory.geometries` and `.textures` return to baseline (±2); no leaked WebGL contexts; unmount disposes materials, geometries and listeners.
- P9.5 `relaxStep` stability: 1000 randomized trials (jitter up to 1 Å on library molecules) -> zero NaN/Infinity, max displacement per step <= 0.5 Å; overlapping atoms and hypervalent S/P fall back to leaving positions unchanged with a translated toast.
- P9.6 Memory: heap growth <= 10 % over 100 undo/redo cycles or 60 s of orbit.
- P9.7 Architecture: strict TypeScript types for Atom/Bond/Molecule/Tool/state; molecular data, scientific calculations, rendering and UI are in separate modules (chem/, scene/, ui/); the renderer derives geometry from molecule data; atom/bond IDs are stable; the browser console is clean (no errors, no warnings) through the full scripted flow of sections 3-7.
- P9.8 Honest UI: grep/probe finds no placeholder buttons (every button has a handler with an observable effect), no fake spinners, no hard-coded state that does not mirror store state.

---------------------------------------------------------------------------
## 10. SPEC section 10 initial delivery list (all MUST, all with a critic PASS)

| # | Required item | Criteria that prove it |
|---|---|---|
| 1 | Complete application workspace | L2.1-L2.7 |
| 2 | Functioning interactive Three.js viewport | L2.4, C4.1-C4.4 |
| 3 | At least one scientifically valid 3D structure | M3.1, section 8.3, 8.7 |
| 4 | Ball-and-stick visualization | M3.3, M3.4 |
| 5 | At least one additional functional mode | M3.3 (spacefill, wireframe, stick) |
| 6 | Working orbit, zoom, pan and reset | C4.1, C4.2 |
| 7 | Atom selection and contextual information | C4.3, I6.2, I6.3 |
| 8 | Data model with explicit atom/bond connectivity | P9.7, section 8.5 |
| 9 | Molecular formula and mass calculations | I6.1, section 8.1 |
| 10 | Responsive, visually polished interface | A1.x, R7.x, section 11 |

SPEC priority rule: a smaller number of genuinely functional features beats many superficial ones. If time is short, cut features, never correctness.

---------------------------------------------------------------------------
## 11. Reference bar — beat MolView (molview.org)

Protocol (blind A/B, per Gauntlet Loop):
1. Paired screenshots, same molecule, same viewport, same style class: caffeine and aspirin at 1440x900; caffeine at 390x844; an editor mid-edit state (ethanol with a selected atom) at 1440x900; a selected bond with its inspector panel. Ours from the built app (default Turkish locale), MolView from molview.org (capture date and URL in `gauntlet/ab/refs.txt`). Save as `gauntlet/ab/<case>-A.png` / `-B.png` with randomized labelling, mapping hidden from critics.
2. A fresh critic (new context, no history, Sonnet) sees each pair + BRIEF.md's 5 requirements + SPEC section 2 only, and picks the better one on: visual polish and restraint (no glass/glow/template look), clarity of molecular structure, information density with readability, interaction affordance, and "would I show this at a science competition".
3. PASS: ours chosen in >= 4 of 5 pairs by at least two independent critics (different seeds/orderings). If we lose a pair the critic names the LARGEST gap; the builder fixes it; the pair re-enters. No fixed round count; stop when two consecutive full rounds are won, the user is satisfied, or compute is spent.
4. Where MolView is weaker (no dark mode, small touch targets, dated panels, no animated transitions, limited auto-hydrogen feedback) we must exceed it, not match it.
5. Taste references (articulation only, never copying): Mol* viewer density, PubChem 3D conformer controls, Blender/Figma editor chrome, Keynote-quality transitions.

---------------------------------------------------------------------------
## 12. MoSCoW

MUST (all gated; any FAIL blocks "done"):
- G1-G5; A1.1-A1.4; L2.1-L2.7; M3.1-M3.4; C4.1-C4.3, C4.5-C4.7; E5.1-E5.11, E5.14; I6.1-I6.5; R7.1-R7.6; all of section 8.1-8.6; P9.1-P9.5, P9.7, P9.8; section 10 table; section 11 PASS.

SHOULD:
- A1.5 light theme, M3.5, C4.4, C4.8, E5.12, E5.13, I6.6, I6.7, R7.7, section 8.7 (40 entries), P9.6, label overlay ("Etiketler"), shortcuts dialog, first-run coach (3 steps, dismissed state in localStorage).

COULD (no COULD work starts before every MUST has a critic PASS):
- Optional approximate surface coloring clearly labelled approximate, lone-pair/orbital visualization, vibration animation, SMILES import, share link, PNG/GLB/PDB export, undo-history timeline, quiz/learn mode, side-by-side compare, auto-rotate and thermal breathing toggles.

WON'T (this cycle):
- Dipole moments or any quantum-chemistry-grade energies/ESP, protein secondary-structure cartoons, accounts/collaboration/backend, native apps.

---------------------------------------------------------------------------
## 13. Other methodologies applied alongside the Gauntlet Loop

- Test-first oracles: section 8 numbers become failing tests before the module exists (geometry, properties, io, library builders code against them).
- Contract-first parallel build: frozen interfaces in `elements.ts`, `molecule.ts`, `store.ts`; module ownership is strict; G1 compiles the whole tree.
- Property-based / randomized testing: P9.5 jitter fuzz, undo/redo fuzz (random edit sequences vs. snapshot equality), Molfile/XYZ round-trip fuzz over the library.
- Integration smoke before critics: all library entries through store -> properties -> scene on every wave.
- Heuristic UI review (Nielsen) and a first-time-user task test (E5.13) in the critic rubric.
- Blind pairwise comparison (section 11) for taste; fact-check sampling for scientific copy.
- Pre-mortem (section 14) re-read at the start of every wave.

---------------------------------------------------------------------------
## 14. Pre-mortem (assume we failed; why?)

1. Scientific wrongness hidden by pretty visuals (wrong angles after auto-H, wrong hybridization, bad aromaticity, false library facts). Mitigation: section 8 oracles are tests first; library validated by loop test; critic fact-checks 10 descriptions.
2. Fabricated or unlabeled estimates sneak in (dipoles, charges, energies). Mitigation: G5, section 8.6, critic greps the panel text for unlabelled estimates.
3. Force field instability (NaN/explosions on overlap, ring strain, hypervalent S/P). Mitigation: P9.5 fuzz; clamped displacement; no-op fallback with toast.
4. Parallel builder drift (compiles alone, breaks together). Mitigation: frozen contracts, whole-tree G1, integration smoke test before any critic pass.
5. Visual identity regresses into a template (glass, glow, gradients, SaaS cards). Mitigation: A1.2 computed-style probes; blind A/B judges restraint explicitly.
6. Toolbar lies: Rotate/Pan/Zoom or Measure present but inert, or the save status hardcoded. Mitigation: L2.2/L2.3 scripted per-tool behavior tests; L2.1 state-flip test; P9.8.
7. Mobile as an afterthought (gestures fight page scroll, panels unusable). Mitigation: 390x844 graded from wave one; R7.3/R7.4 are MUST.
8. Performance cliff from per-atom React components or per-frame allocation. Mitigation: P9.2 measured early on the 100+ atom entry; scene never re-rendered by UI state (P9.3).
9. Animation fights editing (eased state diverges from store, undo during animation corrupts). Mitigation: C4.7 stress test; store is the single source of truth.
10. Reduced motion forgotten. Mitigation: C4.6 emulated-media run is a MUST gate item.
11. Self-congratulation: builders write tests that encode their own bugs. Mitigation: R0.4, frozen oracles from literature, fresh-context critics, blind A/B.
12. Environment limits (C: nearly full, heavy-process pressure, PubChem unreachable). Mitigation: npm cache on D: (`npm_config_cache=D:/npm-cache`), logs to file, each heavy command once, offline-first with translated error toast.
13. Bilingual drift: untranslated or mixed strings, wrong chemical terms. Mitigation: G4 key-parity test; critic checks Turkish terms (değerlik, bağ, hibritleşme, molar kütle, elektronegatiflik, ortaklanmamış elektron çifti).
14. Time sink on COULD features before MUSTs are green. Mitigation: section 12 gate.

---------------------------------------------------------------------------
## 15. Done definition

Done = all G-gates green; every MUST criterion PASS by a fresh critic with artifact evidence in `gauntlet/logs` and `gauntlet/ab`; the SPEC section 10 table fully satisfied; the MolView blind A/B round won twice consecutively; and the lead has re-run the full gauntlet once on the final build with no changes in between. Progress is tracked in `gauntlet/workbench.md` (criterion ID -> last verdict -> evidence path); the lead updates it, builders do not.
