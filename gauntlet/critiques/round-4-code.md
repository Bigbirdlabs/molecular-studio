# Round 4: Code critic (lens: engineering quality, robustness, performance)

**Tree reviewed:** working tree on `main` at `190f5b3` + uncommitted round-3 fixes (24 modified files in `src/`, new `src/ui/inspector/longPress.ts`). `src/intro/` not reviewed; `src/main.tsx` still ends with `import './intro/mount'`.

**Basis:** fresh context, judged against SPEC.md (original + ENHANCEMENT ADDENDUM, MUST-v1 checklist), GOAL.md, BRIEF.md. No source file edited.

**Commands (each run once, output saved):**

| Log | Result |
|---|---|
| `gauntlet/logs/critic-r4-code-tsc.txt` | `npx tsc --noEmit` exit 0 |
| `gauntlet/logs/critic-r4-code-vitest.txt` | `npx vitest run`: 9 files, 402 tests, all pass |
| `gauntlet/logs/critic-r4-code-probes.txt` (+ `-probe-run.txt`) | my probes in `gauntlet/scratch/critic-r4-code/` (store, deep-link, perf, bond-split) |
| `gauntlet/logs/critic-r4-code-browser-run.log` | CDP orbit harness on the fresh `critic-r4-cl/dist-hook` build: hung after enabling auto-rotate (GPU shared with other critics' Chrome sessions); killed by timeout, not retried (heavy-command rule). No leftover processes. |

**Verdict: FAIL. Score 76/100.**

Round-3 blockers, re-checked in the code:
- **B1 context loss**: fixed. `Viewport.tsx:146-170` owns the overlay, 3 s `stuck` timer, keyed canvas remount, viewpoint carried via `ctx.savedView`. (Code-verified only; my browser run did not get that far.)
- **B2 import/PubChem false success**: fixed via the `loadNonce` check (`actions.ts:66-72`, `Dialogs.tsx:178-182`).
- **B3 `?m=` reload data loss**: fixed. `stripDeepLink()` (`store.ts:276-286`) plus a 5-slot timestamped backup ring. The ring has no UI, see I6.
- **B4 commit during a drag**: fixed via `settleDrag()` (`store.ts:369-374`). Probe: `undo1 === dragged true`, `undo2 === original true`.
- **B5 ANGLE X4122 console warning**: fixed. `gl.debug.checkShaderErrors` is off unless dev + `?shaderlog` (`Viewport.tsx:142`).
- **Round-3 I1** (undo across a load): fixed in `sceneContext.ts:46` and `CameraRig.tsx:376-379`.
- **Round-3 I2** (camera moves during drag): fixed (`CameraRig.tsx:273`).
- **Round-3 I3** (second valence classifier): fixed (`sceneModel.ts:133`).
- **Round-3 I4** (keyboard camera status): the keys were removed, but the status logic is still wrong, see I1.

Architecture is still the strongest part. Chemistry is pure. The scene is imperative with `frameloop="demand"`. Picking uses model data, so no instance-index-as-id. Pools grow by doubling with carry-over and dispose replaced meshes. Draw calls are constant (tristearin with nothing selected: 3 non-empty rig objects of 14 children).

The verdict stays FAIL because of:
- a default-mode rendering MUST (bond colour split);
- a save-status truthfulness bug;
- an unfixed B.9 MUST carried over from the round-3 checklist critic;
- three smaller literal MUST failures.

---

## BLOCKING

### B1. [scene] Bond halves split at the centre-to-centre midpoint, not between the two sphere surfaces (SPEC C1 MUST "Bond halves in each end atom's colour, split between the two sphere surfaces (midpoint in wireframe)")
- **Code:** `src/scene/moleculeRig.ts:207` computes `mx = (ax + bx) / 2`, and both half-cylinders meet there whatever the atom radii. The same applies to the selection outlines.
- **Measured** (`critic-r4-code-probes.txt`, `[perf] ballstick …`; ball-and-stick radii from `styleParams.ts`):
  - **C–H 1.09 Å:** C radius 0.459, H radius 0.227. Visible C-coloured part 0.086 Å, H-coloured part 0.318 Å; a surface split gives 0.202 / 0.202. The launch molecule's four C–H bonds therefore look almost entirely white: the carbon half is 21 % of the visible stick.
  - **O–H 0.96 Å:** 0.070 vs 0.253.
  - **C–O:** 0.256 vs 0.305.
  - Only near-equal radii (C–Cl, stick style) come out right.
- **Fix:**
  - Split at `t = (rA + (L − rA − rB)/2) / L` along the bond, using the current style radii (`model.radius(e) * e.s`).
  - In wireframe or stick (radii ≈ 0 or equal) this reduces to the midpoint.
  - Add a scene test asserting equal visible halves for C–H in ball-and-stick.

### B2. [chem-core] After a `?m=` deep link, the save indicator says "Tarayıcıda kaydedildi" for a molecule that was never written (SPEC B.9 MUST "`Tarayıcıda kaydedildi` only after a successful write"; D.6.1 "save indicator driven only by SaveStatus"; SPEC §8 "no UI state that does not correspond to actual application state")
- **Code:**
  - `replaceMolecule` (`store.ts:759-777`) installs the deep-link molecule with `suppressSave = true`.
  - It resets `projectName` but leaves `saveStatus: 'saved'` and the restored project's `lastSavedAt` (`store.ts:550-551`).
- **Probe** (`a-deeplink.probe.ts`): stored project "Benim projem" (ethane), open `?m=tristearin`, wait 1 s.
  - State: `{"mol":"Tristearin","atoms":173,"status":"saved","lastSavedAt":1700000000000}`.
  - localStorage still holds `{"name":"etan","atoms":2}`, so the indicator shows "saved" for an unwritten molecule: `true`.
- **Effect:** the top bar shows a green check and the tooltip time of the other project. A reload (the URL is now stripped) brings back ethane, not what the indicator called saved.
- **Fix:** on the deep-link path, set `lastSavedAt: null` and keep `saveStatus: 'saved'`. The indicator then reads `save.ready` ("not saved yet") until the first real write. Add this case to `tests/store.test.ts`.

### B3. [ui] WebGL unavailable: the edit tools and edit actions stay enabled (SPEC B.9 MUST "inspector/data stay usable; edit tools disabled with that reason"; checklist 23). Carried over unfixed from round-3 checklist critic item 1.
- **Code:** `ViewportHost.tsx:162,181` uses `noWebgl` only to hide the HUD. `Toolbar.tsx` has no WebGL condition:
  - the rail tools Atom / Bond / Delete / Measure stay active and toggle `tool` in the store;
  - Geometriyi düzenle, H ekle/kaldır and Yeni stay enabled.
- **Copy:** the fallback text is still `app.webgl.title` "WebGL kullanılamıyor" + a long body (`i18n.ts:16-17`). SPEC requires `Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor`.
- **Fix:**
  - Expose the unavailable state through the store or a callback, which also replaces the MutationObserver (I9).
  - Disable the canvas-dependent tools with `disabledReason` set to the SPEC string.
  - Correct the string.

### B4. [build / tests] Checklist 12 has no passing frame-time artifact (MUST "tristearin orbit p95 ≤ 16,7 ms logged in `gauntlet/logs/`")
- The only team logs say FAIL: `r2-build-orbit-p95.txt` (p95 55.70 ms and 48.70 ms). No round-3 or round-4 team log exists.
- The round-3 critic's novsync run passed, and per-frame CPU is tiny (probes: bodies 0.22 ms, hover overlays 0.045 ms, `SceneModel.sync` 0.39 ms, `molProperties` 1.05 ms on tristearin). The cause is almost certainly compositor contention. The MUST still asks for the artifact.
- My run on the current hook build hung under GPU contention.
- **Fix:** run the existing harness once on an idle machine, vsync on, and save the log as the checklist 12 artifact.

### B5. [ui] Checklist 36 literal check fails: `rg "[çğıİöşüÇĞÖŞÜ]" src/ui --glob "*.tsx"` returns 1 hit, not 0
- The hit is `src/ui/Inspector.tsx:351`, a comment quoting "(konjugasyon, tahmini)", "(açısal)".
- It is not a user string, but the acceptance command is literal. Transliterate the comment or move the quote to i18n.

### B6. [scene] An empty molecule triggers a camera fit (SPEC B.5 MUST "An empty molecule triggers no fit")
- `newMolecule()` → `loadMolecule()` bumps `fitNonce` (`store.ts:748`, `:778`). `CameraRig.frame()` (`CameraRig.tsx:293-321`) then frames an empty point set, since `collectFit` skips dying atoms. `computeFit` returns centre `[0,0,0]` at the empty-set default distance (`cameraMath.ts:17`), so the camera tweens on "Yeni molekül".
- **Fix:** in `frame()`, return early when `pts.length === 0`, or do not bump `fitNonce` for an empty load.

---

## IMPROVEMENTS (non-blocking, by impact)

### I1. [ui] The camera status ("varsayılan / özel") is still decided wrongly in common flows
- `StatusBar.tsx:9,40` treats a left drag in Atom / Bond / Delete / Measure as "not a camera move". Per SPEC B.2 and `Interaction.tsx`, a left drag on empty space orbits in Atom, Delete and Measure, and on atoms too in Delete and Measure. Orbiting in the Atom tool (checklist 7's gesture) therefore leaves the status at "reset".
- In the Select tool, an atom drag counts as a camera drag, so the status flips to "custom" even though checklist 13 requires the camera to stay identical.
- **Fix:** derive "custom" from OrbitControls `start` / `change` (CameraRig already listens), wheel and zoom requests, not from guessing tools.

### I2. [tests] None of the round-3 fixes has a regression test
- `tests/store.test.ts` is still 81 lines / 8 tests.
- Missing tests: context-loss overlay, load rejection without success toast, deep-link strip and backup ring, drag + commit chronology, relax lock / cancel, save-failure streak, plus B2 above.
- The probes in `gauntlet/scratch/critic-r{2,3,4}-code/` can be lifted almost verbatim.

### I3. [ui] Edits during clean-up are still swallowed silently outside the inspector (round-3 I5)
- Canvas clicks in Atom / Bond / Delete return early with no feedback (`store.ts:621`, `:686`, `:699`), and so do the Delete / Backspace keys.
- **Fix:** toast `act.reason.relaxing` once per gesture, or disable the edit tools while `relaxing`.
- Related: the Undo button is disabled while relaxing when `past` is empty (`TopBar.tsx:112`), although Ctrl+Z cancels the relax.

### I4. [scene] Render isolation is looser than C4
- `WATCHED` (`MoleculeLayer.tsx:9`) includes `showLabels`, `language` and `reducedMotion`, so the atom and bond buffers are rewritten for label or language toggles that only change overlays.
- **Fix:** move `showLabels` and `language` to `OVERLAY_ONLY`.

### I5. [scene] Errors are misattributed to WebGL
- Any render-time throw inside the R3F tree is caught by `SceneBoundary` (`Viewport.tsx:132`), which renders the WebGL-unavailable message. The `data-viewport-state="webgl-unavailable"` marker also hides the HUD.
- SPEC B.9 says unrecoverable failures use `app.viewError.*`. Give `SceneBoundary` the `viewError` fallback, and keep the WebGL text only for the probe or context-creation failure.
- `ViewBoundary`'s Reload is `window.location.reload()` (`ViewportHost.tsx:30`), which drops undo history. A keyed remount (as in the context-loss path) would keep it.

### I6. [chem-core / ui] Dead or unreachable code
- `restoreBackup` / `listProjectBackups` (`store.ts:249`, `:753`) have no UI caller, so the backup ring that protects deep-link overwrites cannot be used.
- `setName` (`store.ts:779`) has no caller and is not guarded by `locked()`. Probe: calling it mid-relax pushes a mid-relax frame onto `past`, and the rename is lost when the relax finishes (`past top is relax base? false`, then `name Etanol`).
- `recenter` and `moleculeCenter` (`store.ts:949`, `:982`) have no caller.
- `freeValence` (`store.ts:327`) is an alias.
- `pickAtClient` (`pickApi.ts:14`) has no consumer.
- `MoleculeRig.spheresVisible` (`moleculeRig.ts:388`) is unused.
- `useCoordSource` / `useGeometryOrigin` (`inspector/source.ts`) are plain functions with hook names.

### I7. [ui] PubChem provenance is in memory and never "edited" (round-3 I8)
- `source.ts:46` returns `edited: false` for any marked id.
- The `pubchemIds` / `importedIds` sets are lost on reload, so a stored PubChem molecule later shows "idealised geometry" and no `Kaynak: PubChem` (checklist 32).
- **Fix:** persist the source with the project; snapshot the loaded molecule and compare with `sameStructure`.

### I8. [scene] Tessellation is not scaled with atom count (round-2 I9, SHOULD C5)
- `SphereGeometry(1, 32, 22)` gives 1344 triangles × 173 atoms = 232,512 for tristearin spheres alone (probe).
- Draw calls stay constant, but a coarser geometry above about 100 visible atoms would help phone GPUs.
- `preserveDrawingBuffer: true` (`Viewport.tsx:137`) also costs on tilers. A render-then-capture for PNG export would avoid it.

### I9. [ui] The WebGL-unavailable state is detected with a subtree `MutationObserver` (`ViewportHost.tsx:140-152`)
- It fires on every HoverTip and Announcer DOM change. A store flag or callback would also serve B3.

### I10. [scene] Pointer bookkeeping still has no `lostpointercapture` or window fallback (`Interaction.tsx:68`, round-3 I13)
- OrbitControls' capture covers the common case. However, a stale id in `pointers` makes every later press look like a second finger, and canvas clicks stop working.

### I11. [scene] User-visible strings outside the i18n dictionary
- `Announcer.tsx:14-37` (live-region text) and `HoverTip.tsx:25-27` ("bağ", "yük") hard-code TR/EN.
- They escape the `i18n.test.ts` completeness check.
- HoverTip's `x/max bağ` uses the highest allowed valence (H₂S reads "2/6 bağ"), with its own `usedValence` copy instead of `valenceUsed`.

### I12. [scene] Scaling of per-frame work beyond the library sizes
- `SceneModel.sync` calls `valenceState` per atom (`sceneModel.ts:133`), and each call scans all bonds through `neighbours` / `atomById`. That is O(N·B) per drag or relax frame: 0.39 ms at 173 atoms, but roughly 25 M operations per frame at the 5 000-atom import limit.
- **Fix:** precompute an adjacency map once per sync.

### I13. [scene] `touch-action: none` is on the wrapper as well as the canvas (`Viewport.tsx:48`)
- SPEC B.1 says "on the canvas only". The wrapper also contains the reload overlay button and HoverTip.

---

## Verified solid this round

- **Store:**
  - bond tool on the same atom: pending toggles off, no undo entry;
  - `setCharge(7)` clamps to 2, and `setCharge(NaN)` is ignored with no entry;
  - empty-molecule ops (delete, add/remove H, clean-up, select-all, undo/redo) add no history entry and start no relax;
  - drag + Delete history is chronological.
- **localStorage:** every access is guarded. A save failure gives one toast per streak, `saveStatus: 'error'`, and recovery on the next write.
- **Disposal:** pools and point clouds dispose replaced buffers. The rig disposes geometries and materials on teardown and on context loss. The Background texture is disposed. Event listeners are balanced in every scene and UI module.
- **Frame loop:** `frameloop="demand"`. Springs report `settled`. No `state.clock` and no always-on loop. `cameraStatus` is throttled to 150 ms and subscribed only by StatusBar.
- **Performance (tristearin, node probe):**
  - full body rewrite 0.22 ms;
  - hover overlay 0.045 ms;
  - `molProperties` 1.05 ms per deferred inspector recompute;
  - no heap growth over 2 000 updates.
- **NaN guards:** `writeCylinder` rejects degenerate segments, `relaxStep` rejects non-finite input or energy, `validateMolecule` requires finite coordinates, and `computeFit` handles the empty set.
