# Round 1 — Code critic (lens: engineering quality, robustness, performance)

Commit reviewed: `1c6453b` (main). Fresh context; judged against SPEC.md (original + ENHANCEMENT ADDENDUM, MUST-v1 checklist), GOAL.md, BRIEF.md.
Source was not edited. Probes live in `gauntlet/scratch/critic-r1b/` (plus earlier ones in `gauntlet/scratch/critic-r1/`), and each was run once.

Logs (each command run once):
- `gauntlet/logs/critic-r1-code-b-tsc.txt`: `npx tsc --noEmit` exited 0.
- `gauntlet/logs/critic-r1-code-b-vitest.txt`: `npx vitest run` passed, 8 files / 267 tests.
- `gauntlet/logs/critic-r1-code-b-probe-run.txt`, `critic-r1-code-b-perf-run.txt`: probe runs.
- `gauntlet/logs/critic-r1-code-b-probes.txt` (and `critic-r1-code-probe-out.txt`): probe output quoted below.

**Verdict: FAIL. Score 52/100.**

The architecture is good. Data, science and rendering are cleanly separated. The scene is imperative, with `frameloop="demand"` and store subscriptions that skip React. Instancing is pooled and the draw-call count does not grow with molecule size. Disposal is thorough. Picking runs analytically on model data, so the instanceId→atom mapping cannot break after deletes.

The verdict is still FAIL, for two reasons:
- Several MUST-v1 checklist items are not met. The clearest are #1, #12, #23, #27, #29, #34 and #35, plus the B.1 pick floor.
- There are real state bugs: concurrent edits during clean-up, autosave toast spam, picking atoms behind the camera, and undo during a drag.

---

## BLOCKING

### B1. [scene] Zoom clamp is fit÷3, so tristearin cannot be inspected below about 25 Å (checklist 35, B.1 MUST, §E-13)
- `src/scene/theme.ts:22` `ZOOM_IN_FACTOR = 3`. `src/scene/CameraRig.tsx:225-226` sets `minDistance = fit.distance / ZOOM_IN_FACTOR` and `maxDistance = fit * 3`.
- Probe output (`critic-r1-code-b-probes.txt`):
  - `tristearin ballstick aspect 1.78 fitDistance 73.92 minDistance 24.64`; at a portrait aspect of 0.5, `minDistance 81.95`.
  - Even methane cannot reach the spec value: `metan ballstick aspect 1.78 … minDistance 1.69`.
- The spec requires `minDistance` = 1.5 Å, absolute, and `maxDistance` = 12 × fit radius. The near plane (`CameraRig.tsx:227`) must follow the new limit.

### B2. [scene] An atom behind the camera wins the pick
- `src/scene/sceneModel.ts:297-305`. The ray–sphere test never rejects `tca < 0`. It also takes the smallest `t`, which can be negative, so an atom behind the eye beats every atom in front of it.
- Probe: the camera sits at the origin looking +z, with atom 1 at z = −1 (behind) and atom 2 at z = +5. The result was `picks id 1 t -1.459 (expected 2)`.
- Today this only bites when the camera is inside the molecule's extent. Once B1 is fixed (zoom to 1.5 Å inside tristearin) it becomes routine: clicks would select invisible atoms behind the near plane.
- Fix: skip hits whose exit point is behind the camera, i.e. require `t > 0`, or `tca + sqrt(r² − d²) > 0` with the far root used when the camera is inside.

### B3. [chem-core] Clean-up does not lock out or cancel on concurrent edits, which corrupts the undo history
- `src/store.ts:641-670`: the animated `cleanUp` writes `set({ mol })` every frame and is cancelled only through `relaxToken`. Only `loadMolecule`, `replaceMolecule` and `undo` bump that token.
  - Every other commit runs while `relaxing === true`: `growFrom`, `deleteAtoms` (also reachable through the Delete key), bond tool, `changeElement`, `setCharge`, and drag via `beginDrag` / `dragAtom` / `endDrag`.
  - Each of those pushes a mid-relax snapshot onto `past`. The relax loop then keeps overwriting the user's edit.
  - `Interaction.tsx` and `shortcuts.ts` never check `relaxing`. `Toolbar.tsx:56-62` disables only the four action buttons.
- Probes:
  - Drag during relax: `dragged atom after one relax tick at 8.46,8.43,7.73 (user put it at 9,9,9); past 1 -> 2 … relax kept running for 30 more frames after the drag`.
  - Delete during relax (`critic-r1-code-probe-out.txt`): `after delete: relaxing true past 5 … relax continued 12 frames … undo1 -> formula C8H10N4O2 (this is a mid-relax snapshot, not a user state)`.
- This breaks the SPEC §6 promise that interactions are deliberate. Undo also lands on states the user never saw.
- Fix: either cancel the relax (bump the token and commit the current frame) at the start of every mutating action, or block editing gestures while relaxing.

### B4. [chem-core] Undo during an atom drag discards redo and re-pushes a stale base
- `src/store.ts:534-539` and `675-681`: `undo` does not clear `dragBase`. When `endDrag` runs afterwards, it pushes the old `dragBase` onto `past` and sets `future: []`.
- Probe: `undo during drag: future 1 -> after endDrag 0 past 1`.
- Reachable from the UI: press Ctrl+Z (`shortcuts.ts:49`) while holding the mouse on an atom.

### B5. [chem-core] Autosave failure toast fires on every failed save, despite the code's intent
- `src/store.ts:304-312`: `writeProject` calls `set({ saveStatus: 'saving' })` first and reads `wasError = get().saveStatus === 'error'` afterwards. `wasError` is therefore always false.
- With localStorage throwing (quota or private mode), every debounced edit raises a new error toast. Probe: `saveFailed toasts after 3 failed saves: 3`.
- Fix: read the previous status before setting `'saving'`.

### B6. [chem-core / chem-props] Unknown element symbols silently become carbon, a fabricated value (checklist 34; §E-1, §E-3)
- `src/chem/elements.ts:68-70`: `el()` returns `ELEMENTS.C` for any unknown symbol. `src/chem/properties.ts:882` still has the `MONO_MASS[...] ?? el().mass` fallback that §E-3 says to remove.
- `store.changeElement` (`store.ts:564-578`) accepts any string.
- Probe: `changeElement Xx threw? false formula H4Xx mass 16.043 molProperties threw? false`. The UI would show a formula containing Xx with the mass of CH₄, which fabricates the mass.
- §E-1 requires `isKnownElement`, `getElement` and a throwing `el()`. Checklist 34 requires an injected unknown symbol to show the error-boundary message, but with the carbon fallback nothing ever throws.

### B7. [ui] No error boundary around the Inspector (checklist 34, §E-8, B.9)
- The only boundaries are `src/scene/Viewport.tsx:33-41` and `src/ui/ViewportHost.tsx:47-52`. `InspectorBody` (`App.tsx:63`, `App.tsx:89`) is unguarded.
- Any throw in `properties.ts`, for example on a malformed molecule, blanks the whole React root and leaves an empty page.

### B8. [scene / ui] Losing the WebGL context shows no restart overlay (checklist 23, B.9)
- `src/scene/Viewport.tsx:75-76` only calls `preventDefault()` and invalidates on restore. No state is set, and no overlay or `app.viewRestarting` string exists (grep in `i18n.ts` finds 0 hits).
- Risk on restore: `Lighting.tsx:30` uses `<Environment frames={1}>`, which renders its cube target once. After a context restore the image-based lighting target is empty, so the "identical molecule" part of checklist 23 needs a re-render of the environment.

### B9. [scene] The pick floor is world-space only; the B.1 on-screen floors are missing (B.1 MUST)
- `src/scene/theme.ts:25-26` sets `PICK_MIN_ATOM_RADIUS = 0.2` and `PICK_MIN_BOND_RADIUS = 0.1` Å. `sceneModel.ts:299` and `:314` apply no screen-space floor.
- B.1 requires an atom floor of at least 12 px radius on fine pointers and at least 22 px on coarse pointers, and a bond floor of at least 4 px.
- At tristearin's fitted distance (about 74 Å, FOV 26°, about 700 px of viewport height) the scale is roughly 20 px/Å. A 0.2 Å floor is about 4 px and a 0.1 Å bond floor about 2 px.
- The fix needs the camera's pixels-per-Å at each entry's depth passed into `pick`.

### B10. [ui] A second global debug hook ships to production under `?test` (Addendum precedence rule 4)
- `src/main.tsx:8-10` defines `window.__studio = { getState }` in dev, and also in production whenever `?test` is in the URL.
- Rule 4: "No other global debugging hook is added", and the hook must be absent from production. The editor notes list `window.__studio` as dropped.
- The hook is also not read-only: `getState()` returns every store action.

### B11. [chem-core / ui] Formal charge range is ±3; checklist 29 requires −2…+2
- `src/store.ts:584` clamps to `[-3, 3]` and the stepper limits at ±3 (`src/ui/Inspector.tsx:272-274`). Probe: `setCharge(3) accepted charge 3`.

### B12. [ui] Save indicator: wrong label, and a spinner branch remains (checklist 35, §E-7, §E-14)
- `src/ui/i18n.ts:36` reads `'save.saved': 'Kaydedildi'`, but the spec requires `Tarayıcıda kaydedildi` (EN: `Saved in this browser`, `i18n.ts:392`).
- `src/ui/TopBar.tsx:44-46` still renders `Loader2 animate-spin` for `'saving'`. §E-14 says to remove it.

### B13. [ui] Hex literals and icon stroke widths violate checklist 27 / §E-10
- Hex literals in `src/ui/**/*.tsx`: `controls.tsx:167` (`hover:bg-[#7ad4ec]`), `icons.tsx:43,48-51` (`#9aa1ab`, `#e6e8eb`, `#5ec8e5`).
- `strokeWidth="1.6"` at `icons.tsx:43` and `Toolbar.tsx:142`.
- No lucide icon sets `strokeWidth` and no `LucideProvider` is used, so every lucide icon renders at the library default of 2 (`node_modules/lucide-react/dist/esm/Icon.mjs:37`, `contextStrokeWidth = 2`). Checklist 27 says all icons use 1.75.

### B14. [tests] `tokens.test.ts` is missing (checklist 1)
- `tests/` contains fixtures-smiles, geometry, i18n, io, library, properties, scene, science and store. There is no `tokens.test.ts` (D.1.3 plus the theme.ts mirror), which checklist 1 requires.

### B15. [build / tests] No tristearin orbit p95 log in `gauntlet/logs/` (checklist 12)
- `grep -rl p95 gauntlet/logs` finds nothing; the only matches are binary PNGs under `gauntlet/scratch`.
- The draw-call half of #12 holds by construction: a fixed set of pooled meshes. The frame-time evidence the MUST asks for does not exist.

### B16. [ui] PubChem is not disabled when offline (checklist 32, §E-15)
- There is no `navigator.onLine` or `online`/`offline` handling anywhere in `src/ui` or `src/chem/io.ts` (grep finds 0 hits). Offline only surfaces after a fetch fails.

### B17. [scene / ui] `touch-action: none` is not limited to the canvas (B.1 MUST)
- `src/ui/ViewportHost.tsx:85` puts `touch-none` on `<main>`, and `src/scene/Viewport.tsx:43` sets `touchAction: 'none'` on the wrapper.
- B.1 says "`touch-action: none` on the canvas only". As built, the `ToolOptions` strip overlaid inside `<main>` cannot be scrolled with touch.

---

## IMPROVEMENTS (non-blocking, ordered by impact)

### I1. [chem-props / ui] `molProperties` costs about 50 ms on tristearin and runs on every molecule change
- Probe: `molProperties(tristearin) ms/call … 50.5`; the earlier warm probe measured 46.7 ms.
- `src/ui/Inspector.tsx:114` memoizes on the `mol` identity. Every drag frame (`store.dragAtom` clones) and every relax frame produces a new identity.
- The analysis cache at `properties.ts:193` and `:218-221` is a WeakMap keyed by object identity, so a cloned molecule always misses even though `signature()` already proves the topology is unchanged.
- Result: on tristearin a drag or animated clean-up does about 50 ms of synchronous work per deferred render, roughly 15 fps.
- Fixes: cache `Analysis` by topology signature rather than by object; split the coordinate-dependent parts (`sizeOf`, the O(n²) overlap scan at `properties.ts:851-861` and `:933-941`) from the topology parts; throttle the inspector during drag and relax.

### I2. [chem-core] Reduced-motion clean-up blocks the main thread for about 1.2 s on tristearin
- `src/store.ts:645-655` runs up to 240 × `relaxStep(…, 6)` synchronously. Probe: `reducedMotion cleanUp tristearin synchronous ms 1209`.
- Checklist 24 ("within 1–2 rendered frames") nominally holds, but the UI freezes for that time.
- `relaxStep` also rebuilds the whole force-field system (`buildSystem`, ring detection) on every call (`geometry.ts:886`). Fix: cache it by topology, or time-slice even in reduced motion and commit once.

### I3. [chem-core] No-op actions create undo entries and trigger autosave
- Probe: `setName(same) past 0 -> 1`, `setBondOrderOf(same) -> 2`, `setCharge(same 0) -> 3`.
- The bond tool on an existing bond of the same order also commits an identical molecule (`store.ts:469-476`; earlier probe: `past grew by 1 mol identical? true`).
- The reduced-motion `cleanUp` commits and toasts even when it is already converged.
- Checklist 29 asks for exactly one undo entry per real change; guard these with an equality check.

### I4. [chem-core] Restored molecules are not checked for unique ids or a sane `nextId`
- `src/store.ts:160-174` accepts duplicate atom/bond ids and a stale `nextId`. Probe: `ids 1,2,2 nextId 1` was accepted.
- The next edit would mint id 1 again, colliding in `SceneModel.liveAtoms` and breaking SPEC §8 "stable IDs".
- Fix: validate uniqueness and set `nextId = max(id) + 1`.

### I5. [chem-core] `changeElement` prunes against the pre-`fixH` molecule
- `src/store.ts:577` calls `prune(m)` instead of `prune(fixed)`. Hydrogens that `fixH` removes can stay in `selection`, `hovered` or `selectedBond`.
- Not reproduced on methane C→O, where the surviving bond happened to be the selected one, but the code is plainly inconsistent with every other action.

### I6. [scene] Camera can move during an atom drag (checklist 13 risk)
- `CameraRig.tsx:211-229` `refreshLimits` recomputes `min` and `maxDistance` whenever `mol` changes, which includes every drag frame. `controls.update()` (`:351`) then clamps the radius.
- When the camera sits at a limit, dragging an atom changes the fit, so the camera moves. Freeze the limits while `model.snap` is true.

### I7. [scene] Per-update allocations
- `moleculeRig.ts:150` (`buildAdjacency` builds a new Map and arrays each update), `:240` (`segs` array of objects), and `bondLayout.ts:110-121` (a `{strands, n}` object per bond).
- `CameraRig.tsx:104, 246, 334-335` clone vectors per frame during tweens and chase.
- Fine at the idle and orbit steady state, which does not call `rig.update`, but they churn the GC during pop, morph and relax animations.
- The class comment "nothing here allocates per frame beyond small temporaries" overstates this.

### I8. [scene / ui] Dead or half-wired code
- `ATOM_LONG_PRESS_EVENT` is dispatched (`Interaction.tsx:195`) but nothing in `src/ui` listens. The promised "quick actions" (`pickApi.ts:22`) do not exist.
- Unused: `pickAtClient` (`pickApi.ts:12`), `store.recenter` (`store.ts:672`), `moleculeCenter` (`store.ts:692`), `MoleculeRig.spheresVisible` (`moleculeRig.ts:291`), `tmp2` (`moleculeRig.ts:79`), `ACCENT_DIM` (`theme.ts:5`), `SceneModel.isVisible` (used only internally).

### I9. [scene] `consoleFilter.ts` monkey-patches `console.warn` for the whole app at import
- The two filters are narrow (`THREE.Clock` deprecation, ANGLE X4122), but the patch masks console output during the checklist 14 "zero warnings" audit.
- Gate it to dev, or at least document it in the B.10 script so the audit knows those two messages are filtered.

### I10. [ui / scene] WebGL is probed twice, creating two throwaway contexts at startup
- `ViewportHost.tsx:9-19` and `Viewport.tsx:20-30`. Keep a single probe.

### I11. [chem-core] Degenerate measurements produce made-up numbers
- `molecule.ts:232-245`: `angleDeg` with coincident atoms returns 90° (norm of a zero vector), and `dihedralDeg` returns 0°.
- Show "not defined" instead of a fabricated angle.

### I12. [chem-core] Smaller store and pointer edge cases
- `?m=<unknown id>` skips the stored project (`store.ts:185-191`, `actions.ts:178-185`). The first edit then silently overwrites the user's saved work.
- Interaction keeps a `pointers` set (`Interaction.tsx:64`) that is pruned only in canvas `pointerup`/`pointercancel`. A pointer that ends outside the canvas without capture would leave a stale id behind, and every later press would count as multi-touch.

### I13. [tests] Coverage gaps
- `tests/store.test.ts` (81 lines) does not cover: clean-up concurrency, save-failure status and toast, the stored-id validation, undo during drag, zoom limits, picking behind the camera, or B.1 pick floors.
- Every blocking bug above slipped through a 267-test suite that passes.

---

## What is solid (verified)
- Typecheck is clean, and all 267 tests pass.
- The draw-call set is constant and pooled. `InstancePool` and `PointCloud` free the old buffers on growth, and `MoleculeRig.dispose` releases all geometries, materials and textures. `Background` restores and disposes its texture.
- The scene never re-renders through React. Subscriptions filter on a `WATCHED` list (`MoleculeLayer.tsx:9-12`). Hover and drag are coalesced per animation frame. `setCameraStatus` is throttled with leading and trailing edges at 150 ms.
- `relaxStep` and `adjustHydrogens` stay finite on coincident atoms, self bonds and duplicate bonds (earlier NaN probes all false). `writeCylinder` and `computeFit` guard degenerate input.
- Molfile and XYZ parsing validate numbers, indices and element symbols. `parseStoredMolecule` validates structure and elements.
