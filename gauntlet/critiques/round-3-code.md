# Round 3: Code critic (lens: engineering quality, robustness, performance)

**Commit reviewed:** `190f5b3` (main). The working tree is clean apart from the untracked `gauntlet/critiques/r3ux-resp/`.

**Basis:** Fresh context, judged against SPEC.md (the original spec plus the ENHANCEMENT ADDENDUM and its MUST-v1 checklist), GOAL.md and BRIEF.md. No source file was edited.

**Probes:** in `gauntlet/scratch/critic-r3-code/`, driven by their own vitest config:
- `store.probe.ts`
- `scene.probe.ts`
- `import.probe.ts`
- `browser.mjs`, a CDP harness on the `build:hook` bundle in `gauntlet/scratch/dist-hook`, built from this commit.

**Logs** (each command was run once):

| Log | Result |
|---|---|
| `gauntlet/logs/critic-r3-code-tsc.txt` | `npx tsc --noEmit` exited 0 |
| `gauntlet/logs/critic-r3-code-vitest.txt` | `npx vitest run` passed: 9 files, 402 tests |
| `gauntlet/logs/critic-r3-code-probes.txt` | output of the store, scene and import probes |
| `gauntlet/logs/critic-r3-code-browser*.log` / `.txt` | orbit timing, context loss, draw calls and console capture. Runs: vsync ×2, then novsync ×1 to separate code cost from compositor jitter |

**Verdict: FAIL. Score 71/100.**

Most round-2 blockers are fixed, and the probes confirm it:
- **B1 shell pool growth:** select-all on tristearin gives 346 shell instances, with 0 identity or NaN matrices.
- **B2 canvas focus ring:** fixed with `!important`.
- **B3 announcer:** now diffs id sets and retyped atoms.
- **B4 `?m=` restore:** an unknown id now keeps the stored project.
- **B5 inspector relax lock:** done via `LockableGroup` and `useEditLocked`.
- **B6 toast:** pauses on hover and focus.
- **B8 `consoleFilter`:** now drops only the THREE.Clock notice.
- **Round-2 I1:** a true bond hit now beats a floor-only atom match.
- **Round-2 I3:** `validateMolecule` now rejects non-integer charges, charges outside ±2, and duplicate atom pairs.
- **Round-2 I4:** PubChem element and isotope errors are now mapped.
- **Round-2 I5:** a converged clean-up says "zaten düzenli", adds no history entry, and a flush during relax writes the relax base.

The architecture is still the strongest part of the project. Chemistry is pure. Scene rendering is imperative with `frameloop="demand"`. Hover and selection rewrite only the overlays. Draw calls are constant: 6 for methane and 6 for tristearin.

The verdict is still FAIL for these reasons:
- Context-loss handling was removed entirely while deduplicating round-2 I2. Each file's comment says the other owns the overlay.
- Two store paths report success, or lose data, when they should not.
- Undo history becomes non-chronological when a commit lands during an atom drag.
- The console is not clean on Windows/ANGLE, which is the user's platform.

---

## BLOCKING

### B1. [scene / ui] WebGL context loss shows nothing, and there is no reload path (SPEC B.9 MUST "Context lost → … overlay `3B görünüm yeniden başlatılıyor…` … `Yeniden yükle` button remounts the canvas by key"; checklist 23). This is a regression.
- **What each file claims:**
  - `src/scene/Viewport.tsx:66-67`: "The one visible restart overlay / reload button lives in ViewportHost (SPEC B.9)".
  - `src/ui/ViewportHost.tsx:163`: "one context-loss overlay, both owned by the scene (scene/Viewport.tsx)".
  - Neither file renders it.
- **What the code actually does:** the only listeners left are a `preventDefault()` at `Viewport.tsx:112-114` and the rig teardown and rebuild in `MoleculeLayer.tsx:61-62`. `app.viewRestarting` (`i18n.ts:21`, `:446`) is now an unused key. The round-2 version had the overlay at `ViewportHost.tsx:149-201` of `6a002eb`.
- **Repro** (`critic-r3-code-browser.txt`, `-run2.log`): call `WEBGL_lose_context.loseContext()` on tristearin.
  - After 800 ms: `{"restarting":false,"reloadBtn":false,"stateAttr":false}`.
  - After 4 s: `{"restarting":false,"reloadBtn":false}`.
  - The canvas just goes blank or frozen. If the browser never restores the context, the user is left with a dead viewport and no message.
- Restoring the context does work: atoms 173 → 173, geometries 21 → 21.
- **Fix:**
  - Put one overlay back, in exactly one owner, listening for `webglcontextlost`/`webglcontextrestored` on the canvas.
  - Start a 3 s timer that reveals `app.reload`.
  - Remount by `key` on the Viewport, with the store's molecule preserved.
  - Add a regression test, for example a jsdom render that dispatches `webglcontextlost` and asserts the status text.

### B2. [ui / chem-core] Import or PubChem reports success, renames the project, and closes the dialog even when the store rejected the molecule (checklist 32: "import errors show localized messages and leave the molecule unchanged")
- **Import:** `src/ui/actions.ts:65-67` calls `st.loadMolecule(named)`. That function returns `void` and signals rejection only by setting an error toast (`store.ts:668-670`). The import code then calls `setProjectName(named.name)` unconditionally and overwrites the error toast with `toast.imported` (success).
- **PubChem:** `src/ui/Dialogs.tsx:177-181` has the same pattern. It marks the molecule as from PubChem, loads it, shows the `pubchemOk` success toast, and closes the dialog.
- **Repro** (`import.probe.ts`, output in `critic-r3-code-probes.txt`): a V2000 file with `M  CHG  1   1   3`. The parser accepts it; the store rejects a charge outside −2…+2.
  - `molecule unchanged true`
  - `toast … kind success text "ammonium3" açıldı`
  - `projectName Adsız proje -> ammonium3`
- **Who is affected:** the user sees "opened", the scene does not change, and the project name changes, which triggers an autosave. Atom-block charge codes 1 and 7 (±3) and any future store-only validation rule hit this path.
- Round-2 I14 flagged this as fragile. It is now reachable and verified.
- **Fix:**
  - Make `loadMolecule` return `boolean` (or the `MoleculeValidation`), and only rename and notify on success.
  - Better still, have `parseMolfile` reject charges outside −2…+2 with a coded error, so the user gets a localized message.

### B3. [chem-core] Reloading a `?m=` deep link silently discards the user's work, and the "backup" that is meant to protect it is single-slot and unreachable
- **Code:**
  - `store.ts:216-222`: `urlSpecifiesMolecule` is read from `location.search` on every start.
  - `store.ts:256`: `backupRaw = raw` is assigned on every start with `?m`.
  - `store.ts:403-406`: the backup is overwritten on the first autosave.
  - Nothing strips `m` from the URL (`rg replaceState src` finds no match).
  - Nothing in the UI reads `molecular-studio:project:v1:backup` or `:rejected`.
- **Repro:**
  1. With a saved project P, open `/?m=tristearin`. P is copied to `:backup`.
  2. Edit the molecule to T′. It autosaves.
  3. Press F5. The URL still says `?m=tristearin`.
  4. The pristine library tristearin is shown with an empty undo history. T′ is copied over P in `:backup`, and the first edit overwrites the project key.
  5. P is now gone for good. One more reload also loses T′.
- No UI exposes either the backup or the rejected record, so the user cannot recover even the one copy that survives.
- **Fix:**
  - After `loadFromUrl` applies the id, call `history.replaceState` to drop `m`. The link still forces the molecule once, which matches SPEC B.10 and checklist 3.
  - Never overwrite an existing backup without a timestamped key.
  - Or offer "Önceki projeyi geri yükle".

### B4. [chem-core] A commit during an atom drag makes undo/redo non-chronological (SPEC B.8 MUST "one history entry per user intent")
- **Code:**
  - `store.ts:318-321` (`commit`) pushes the in-drag molecule.
  - `store.ts:661-666` (`endDrag`) then pushes the stale `dragBase` from before the drag, after that newer entry.
  - `endDrag` is also not guarded by `locked()`.
- **Repro** (`store.probe.ts`, ethanol): select atom X, start dragging atom Y with the mouse still held, press **Delete**, then release.
  - `past length 2`
  - `undo #1 -> is pre-drag original? true` (it jumps back past the drag)
  - `undo #2 -> … is dragged pre-delete? true` (it then moves forward in time)
  - Redo then replays the pre-drag molecule after the dragged one.
- The same happens with Ctrl+A then Delete, or with any other keyboard commit during a drag. Round 2 fixed undo during a drag, but not commits.
- **Fix:** in `commit`, when `dragBase` is set, either:
  - close the drag first (push `dragBase` if it moved, then set `dragBase = next` and `dragMoved = false`); or
  - ignore Delete and Backspace in `shortcuts.ts` while a drag is active.
- Add the probe as a store test.

### B5. [scene] The console is not clean on Chrome/Windows (ANGLE D3D11) (SPEC B.9 MUST "Zero warnings/errors through the B.10 script"; checklist 14)
- **Evidence:** every browser run on the RTX 3060 / D3D11 test machine logs:
  `warning: THREE.WebGLProgram: Program Info Log: (210,81-129): warning X4122: sum of 0.996094 and -2.98545e-017 cannot be represented accurately in double precision…`
  - See `critic-r3-code-browser.txt`, `-run2.log` and `-run3.log`, all at the line `console warnings/errors during run (1)`.
- Round 2 rightly rejected hiding it in `consoleFilter.ts`. Now it simply reaches the console.
- It comes from three's own shader compile log (the HLSL constant fold), not from app code. It still violates the MUST, and it shows up for any user who opens DevTools on Windows.
- **Fix without filtering:**
  - In `Viewport.tsx` `onCreated`, set `gl.debug.checkShaderErrors = import.meta.env.DEV`. Three only fetches and prints program info logs when that flag is on, and turning it off also avoids a sync `getProgramInfoLog` per program in production.
  - Alternatively, identify the material that triggers it (it is likely the env-map path of `MeshPhysicalMaterial` from drei `Environment`) and drop that feature.
  - Re-run the B.10 script and log zero messages.

---

## IMPROVEMENTS (non-blocking, ordered by impact)

### I1. [scene / chem-core] Undo or redo across a library load neither re-frames nor retires the old molecule (round-2 I6, still open)
- **Probe:** loading tristearin bumps both nonces (`{"load":2,"fit":2,"id":"mol-48"}` → `{"load":3,"fit":3,"id":"lib-tristearin"}`). Undo then returns `{"load":3,"fit":3,"id":"mol-48","atoms":5}`, so `undo changed molecule identity without fit/load nonce bump: true`.
- **Effect on the scene:**
  - `sceneModel.ts:80` retires entries only on a `loadNonce` change, so the 5 shared ids morph in place from tristearin positions.
  - `CameraRig.tsx:276` shrinks `maxDistance` to methane's 12 R, and the next `controls.update()` (`:384`) snaps the camera inward with no tween. Methane then sits at the clamp distance, not fitted.
- **Fix:** in `undo`/`redo`, bump `fitNonce` and `loadNonce` when `prev.id !== mol.id`, or retire in `SceneModel.sync` on a `mol.id` change.

### I2. [scene] The camera can move during an atom drag (checklist 13 edge; round-2 I7, still open)
- **Code:** `refreshLimits` (`CameraRig.tsx:261-280`) recomputes `maxDistance` on every `mol` identity change, which includes every drag frame (`dragAtom` sets a new `mol`). `controls.update()` then clamps the radius.
- **Repro:** zoom out to the maximum, then drag an outer atom inward. The camera distance changes.
- **Fix:** skip the refresh while `ctx.model.snap`, and refresh once at drag end.

### I3. [scene / chem-core] A second valence classifier in the scene disagrees with `valenceState`
- **Code:** `sceneModel.ts:130-131` re-derives `ok/under/over` from `allowedValences` alone. `molecule.ts:104-113` adds the A1.3 rule: an S, P or halogen above its lowest valence without an O or F neighbour is `'under'`.
- **Example:** SH₄ or (CH₃)₃SH. The inspector says "under", but with Oto-H off the scene shows no dashed ring.
- Two implementations of one rule is exactly what SPEC A.4.2 forbids for geometry. Call `valenceState` here instead (the model already has `mol`).

### I4. [ui] The status bar claims "custom" camera after arrow, +/− or PageUp/PageDown keys, but no keyboard camera exists
- **Code:** `StatusBar.tsx:9`, `:52-54` flips to `custom` on those keys. Nothing listens to them: no `controls.listenToKeyEvents` call and no handler in `shortcuts.ts`. Arrow-key orbit is SPEC B.7 SHOULD and is not implemented.
- **Result:** the live camera status (D.6.6) reports a move that never happened. Either implement the 15° orbit or drop the keys from `CAMERA_KEYS`.

### I5. [ui] Edits during clean-up are still silently swallowed outside the inspector
- These are no-ops with no feedback:
  - canvas clicks in the Atom, Bond and Delete tools (`store.ts:560`, `:617`, `:629`);
  - the Delete and Backspace key (`shortcuts.ts:64-69` → `deleteAtoms` → `locked()`).
- The inspector now shows `LockNote`. Notify `act.reason.relaxing` once per gesture, or cancel the relax and apply the edit.

### I6. [build / tests] Checklist 12's orbit log for HEAD reads FAIL, but this is environmental
- **Team log:** `gauntlet/logs/r2-build-orbit-p95.txt`, the newest team log, records `FAIL (p95=55.70 ms)` and `FAIL (p95=48.70 ms)`.
- **My runs on HEAD:**
  - vsync: `p50=13.90 p95=55.70` and `p50=7.00 p95=27.70 p99=90.30`;
  - novsync: `p95=7.00` PASS (`critic-r3-code-browser-run3.log`).
- **Per-frame CPU cost is tiny:**
  - `benchUpdate` full rewrite of tristearin: 0.23–0.44 ms;
  - bodies: 0.50 ms; overlays with select-all, labels and dihedral: 1.52 ms (`critic-r3-code-probes.txt`);
  - nothing in the autorotate frame path writes to the store, because `publish` early-returns at constant distance.
- So the vsync spikes are compositor jitter on a busy machine; about 19 Brave and 15 Chrome processes were running.
- **Still, the MUST evidence is missing.** Re-log under vsync on an idle machine and commit that log as the checklist 12 artifact.

### I7. [scene] Tessellation is not scaled with atom count (round-2 I9)
- `moleculeRig.ts:75` uses `SphereGeometry(1, 32, 22)` for every atom: tristearin is `triangles=260514`, methane `7362`.
- Fine on the RTX test machine, but the largest cost on phone GPUs. Use a 16×12 geometry above about 100 visible atoms; draw calls stay constant.

### I8. [ui] PubChem provenance is never "edited"
- `inspector/source.ts:46-47` returns `{ pubchem: true, edited: false }` for any molecule whose id was marked. `cloneMolecule` keeps the id, so a heavily edited PubChem structure keeps saying the coordinates are from PubChem.
- Library molecules do get the `sameStructure` check. Snapshot the loaded PubChem molecule and compare it the same way.
- `markPubChemMolecule` also runs before a load that may be rejected (B2).

### I9. [tests] The store suite is unchanged at 81 lines / 8 tests (round-2 I11)
- None of the risks from rounds 1–3 is encoded:
  - the relax lock and undo-cancel;
  - save-failure streak and recovery (my probe passes: `status error` → `saved`, `lastSavedAt` set);
  - `?m=` restore and backup;
  - `validateMolecule` rules;
  - B2, B3, B4 and I1 above;
  - shell-pool growth (the old round-2 B1);
  - Announcer messages;
  - context loss (B1 above).
- Each of these is a 10–20 line test; the probes in `gauntlet/scratch/critic-r2-code/` and `critic-r3-code/` can be lifted almost verbatim.

### I10. [scene / chem-core] Dead code (round-2 I10, unchanged)
- In the scene:
  - `pickAtClient` and `registerPicker` (`pickApi.ts:9-16`, registered at `Interaction.tsx:77`) have no consumer.
  - `ATOM_LONG_PRESS_EVENT` is dispatched (`Interaction.tsx:212`) with no listener.
  - `MoleculeRig.spheresVisible` (`moleculeRig.ts:387`) is unused.
- In the store:
  - `moleculeCenter` (`store.ts:906`) and `recenter` (`store.ts:873`) have no UI caller.
  - `setName` (`store.ts:715`) has no UI caller either; also, it is not guarded by `locked()`, so a future caller would push a mid-relax snapshot.
  - `freeValence` (`store.ts:283`) is a one-line alias.
- `useCoordSource` (`source.ts:43`) is named like a hook but is a plain function.

### I11. [scene / ui] Fragile coupling between UI and scene for the WebGL-unavailable state
- `ViewportHost.tsx:145-158` (`useWebglUnavailable`) runs a subtree `MutationObserver` over the whole viewport. It fires on every HoverTip or Announcer DOM change and polls `querySelector('[data-viewport-state=…]')`.
- Pass an `onUnavailable` callback (or a store flag) from `Viewport` instead.
- The same channel would serve B1's lost/restored state.

### I12. [scene] Small per-update allocations (measured cost is small)
- **Sites:**
  - `bondStrands` returns a fresh `{ strands, n }` per bond (`bondLayout.ts:100-120`);
  - `buildAdjacency` builds a new `Map` per body update (`moleculeRig.ts:173`, `:268`);
  - `drawOverlays` builds segment arrays of objects;
  - the tween path calls `clone()` every frame (`CameraRig.tsx:421-422`);
  - `Announcer.describeEdit` builds two `Map`s on every `mol` change, which includes every drag and relax frame (`Announcer.tsx:50-52`);
  - `refreshLimits` runs `collectFit` + `computeFit`, O(n), per drag frame.
- **Measured total:** under about 2 ms per frame for tristearin, so this is acceptable. The class comment "nothing here allocates per frame" (`moleculeRig.ts:70-71`) is still inaccurate.

### I13. [scene] Pointer bookkeeping relies only on canvas `pointerup`/`pointercancel` (round-2 I13)
- `pointers` (`Interaction.tsx:68`, pruned at `:259`) has no `lostpointercapture` and no window-level fallback.
- Touch implicit capture makes this mostly safe. However, a pointer that ends off-canvas without capture (a pen, or OrbitControls disabled during a relax) leaves a stale id. Every later single touch is then treated as a second finger, and taps stop selecting.

### I14. [chem-props] `parseMolfile` accepts charges the store will reject
- `io.ts:228`, `:281-289` accept atom-block codes ±3 and `M  CHG` values of any size.
- Reject charges outside −2…+2 at parse time with a coded `ChemIOError`, so that B2's path also gets a localized reason.

---

## Verified solid this round
- **Store:**
  - The bond tool on the same atom toggles with no undo entry (`pending null past 0`).
  - `setCharge(0.4)` → 0 with no entry.
  - The save-failure streak gives one toast and `status error`, then `saved` after recovery.
  - Clean-up locks edits, and undo during a relax restores its base.
  - `?m=<unknown>` keeps the stored project.
- **Scene:**
  - Shell pools are sized before the fill, and `InstancePool.ensure` carries over the written instances.
  - Select-all on tristearin gives 346 shells with 0 bad matrices.
  - 14 pooled children; `render.geometries` stays at 21 across context restore and across loads.
  - Instance indices map to entries, never to ids (picking goes through `SceneModel.pick` on entries).
  - `frustumCulled = false`, and disposal is complete in `MoleculeRig.dispose`, `Background` and `GlyphLabels`.
  - `cameraStatus` is throttled (leading and trailing, 150 ms), and the store write is skipped when there is no change.
  - Render isolation holds: the `WATCHED` and `OVERLAY_ONLY` split in `MoleculeLayer.tsx:9-11`.
- **Performance:**
  - Draw calls are 6 for methane and 6 for tristearin, and do not change during orbit.
  - `relaxStep(tristearin, 6)` takes 7.1 ms; `molProperties(tristearin)` 2.5 ms, deferred via `useDeferredValue`.
  - novsync orbit p95 is 7.0 ms.
- **Robustness:**
  - Canvas focus ring CSS, the Inspector error boundary (`InspectorBoundary`), and `relaxStep` guards against non-finite values (`geometry.ts:916-925`).
  - Toast pause and resume.
  - The live region describes edits correctly (H→O reads "O atomu eklendi").
- **Typecheck and tests:** tsc is clean and all 402 tests pass.
