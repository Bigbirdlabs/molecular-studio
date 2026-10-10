# Round 2: Code critic (lens: engineering quality, robustness, performance)

Commit reviewed: `6a002eb` (main, clean working tree). Fresh context. Judged against SPEC.md (original spec plus the ENHANCEMENT ADDENDUM and its MUST-v1 checklist), GOAL.md and BRIEF.md. No source file was edited. My probes are in `gauntlet/scratch/critic-r2-code/`, and each was run once.

Logs (each command was run once):
- `gauntlet/logs/critic-r2-code-tsc.txt`: `npx tsc --noEmit` exited 0.
- `gauntlet/logs/critic-r2-code-vitest.txt`: `npx vitest run` passed, 9 files and 402 tests.
- `gauntlet/logs/critic-r2-code-probes.txt`: probe output, quoted below. The run logs are `critic-r2-code-probe-run*.txt`.

**Verdict: FAIL. Score 66/100.**

Most of the round-1 blockers are fixed and hold up under probing:
- Clean-up now locks out edits, and undo during a clean-up restores its starting molecule.
- Undo during a drag no longer corrupts history.
- The save-failure toast fires once per failure streak.
- Unknown symbols are rejected.
- The zoom limit is an absolute 1.5 Å.
- Picks behind the camera are rejected.
- The Inspector has an error boundary.
- A context-loss overlay exists.
- `window.__studio` is gone.
- The tristearin p95 log exists.
- `molProperties` now costs about 3 ms on a moved clone, down from about 50 ms.

The architecture is still sound: chem, scene and UI are separated, and the scene is imperative with `frameloop="demand"`.

The verdict is still FAIL. Two blockers are real rendering and accessibility bugs: selection shells are corrupted after a large select-all, and the canvas focus ring is suppressed by CSS specificity. A third is that the screen-reader live region reports the wrong edit. The rest are MUST-v1 deviations or a silent data-loss path.

---

## BLOCKING

### B1. [scene] Select-all on a large molecule draws 128 shells as unit spheres at the origin, and the real atoms get no shell
- **Code:** `src/scene/moleculeRig.ts:238-244` (`writeAtomShell`) calls `pool.ensure(pool.count + 1)` partway through filling the selection pools. `InstancePool.ensure` (`src/scene/instancing.ts:75-85`) replaces the mesh with a fresh `InstancedMesh` and does **not** copy the instances already written.
- **What happens:** three's `InstancedMesh` constructor fills new instances with identity matrices. So every shell written before the growth becomes a radius-1 sphere at the world origin, which is the molecule's centroid after `centerMolecule`.
- **Probe** (`scene2.probe.ts`, tristearin, ballstick, all 173 atoms selected):
  `first update after select-all: shell mesh count 173 identity (unit sphere at origin, not on an atom) instances 128` (same for both the accent and rim pools); `second update: … 0`.
- **Why it persists:** with `frameloop="demand"` nothing redraws until the next overlay change (for example a hover), so the broken frame stays on screen. It happens each time the pool capacity is first exceeded: at 65 and at 129 selected atoms, which is reachable by Shift-click or Ctrl+A.
- **Fix:** ensure capacity before the loop (`selection.size`), as is already done for `R.ensure`. Alternatively, copy the old arrays in `ensure`.

### B2. [ui] The canvas keyboard focus ring never appears (SPEC B.4 MUST-v1 line 601; checklist 26)
- **Code:** `src/index.css:138-143` contains `#viewport canvas { … outline: none; }`. This rule is not in a layer and has specificity (1,0,1).
- **The overridden rule:** `src/scene/Viewport.tsx:49` injects `[data-viewport="3d"] canvas:focus-visible{outline:2px solid …}`, with specificity (0,2,1). The ID selector wins, so the "2 px inset accent ring on `:focus-visible`" is never painted.
- **Repro:** press Tab until focus reaches the viewport. There is no ring.
- **Fix:** drop `outline: none` from `#viewport canvas`. The global `:focus` rule already clears mouse focus.

### B3. [scene] The live region announces the wrong edit, or none (SPEC B.4 MUST-v1 line 601)
- **Code:** `src/scene/Announcer.tsx:56-62` announces "X atomu eklendi" only when the atom count changes by exactly 1, and then names the *first atom whose id is new*.
- **Probe** (`announce.probe.ts`), on the spec's own path (Atom tool + O + click an H of methane): `dAtoms 1 first new atom symbol H -> Announcer says "H atomu eklendi"`. The H→O change keeps the atom id, and the new id belongs to the added hydrogen. The spec example is "O atomu eklendi".
- **Probe**, growing C from C: `dAtoms 3`. No edit is announced; only "Seçildi: …" follows.
- With auto-H on, almost every atom addition changes the count by more than 1, so edits are mostly not announced.
- **Fix:** announce from the store action, for example a `lastEdit` field set by `growFrom`, `changeElement` and the bond tool, rather than inferring it from count diffs.

### B4. [chem-core / ui] Any `?m=` link skips the stored project; with an unknown id the user's saved work is silently overwritten
- **Code:** `src/store.ts:211-217` and `:232`. `restoreProject` returns `null` whenever `?m` is present, whatever its value. `src/ui/actions.ts:176-188` then ignores unknown ids ("the default molecule stays").
- **Result:** methane is shown, the stored project is never loaded and not backed up (unlike the rejected-record path at `store.ts:238`), and the first edit autosaves over `molecular-studio:project:v1`.
- **Repro:** save a project, open `/?m=nope`, add an atom, reload without `?m`. The project is gone.
- Round-1 I12; still present.
- **Fix:** decide after `loadFromUrl` resolves, or back up the stored record before the first write. At minimum, restore the project when the id is unknown.

### B5. [ui / chem-core] During clean-up, every editing control stays enabled and silently does nothing (fake controls; SPEC D.6.2 "disabled `aria-disabled` + tooltip with reason")
- **Code:** `src/store.ts:331-332`. `locked()` makes these return without feedback: `changeElement`, `setCharge`, `setBondOrderOf`, `deleteAtoms`, `deleteBond`, and the Atom/Bond/Erase canvas clicks (`store.ts:531`, `:596`, `:609`).
- **The UI never reflects the lock** (no `relaxing` reference in `Inspector.tsx` or `shortcuts.ts`):
  - the element picker (`Inspector.tsx:409`), the charge stepper (`:295-297`), the delete buttons (`:413`, `:445`, `:506`) and the bond-order segmented control (`:501`) stay active;
  - the Delete key (`shortcuts.ts:66-71`) does nothing.
- Only the four rail actions are disabled (`Toolbar.tsx:58-64`).
- **Fix:** either disable these controls with the existing `act.reason.relaxing` reason and notify on ignored gestures, or have an edit cancel the clean-up (`cancelRelax()`) and then apply.

### B6. [ui] Toasts do not pause on hover or focus, and error toasts last 7 s (SPEC D.6.7 MUST-v1 line 812: "4 s auto-dismiss paused on hover/focus")
- **Code:** `src/ui/ToastHost.tsx:18-24` uses a fixed `setTimeout(…, kind === 'error' ? 7000 : 4000)` with no pointerenter or focus handling.
- **Repro:** hover a toast; it still disappears.

### B7. [ui] Tooltips open on coarse pointers (SPEC D.6.7 line 812: "never on coarse pointers")
- **Code:** `src/ui/Tip.tsx:73-78` opens every tooltip after a 500 ms touch or pen long-press, and swallows the click.
- **Scope:** the HUD opts out on phones (`tip={mobile ? false : …}`), but tablets and every other `Tip` user (rail, top bar, inspector) still show tooltips under `(pointer: coarse)`.
- This deliberate design contradicts the MUST text. Either gate on `(pointer: coarse)` or get the spec amended.

### B8. [scene] `consoleFilter.ts` filters more than the spec allows, and does so in production (SPEC B.9 MUST-v1 line 648: "drops only the R3F/three `THREE.Clock` deprecation message")
- **Code:** `src/scene/consoleFilter.ts:7-20` and `:29-35`. It also drops the ANGLE `X4122` program info logs by globally patching `console.warn` at import, in every build.
- **Impact:** this masks output during the checklist 14 "zero warnings" audit.
- **Fix:** keep only the `THREE.Clock` pattern, or amend the spec and document the filter in the B.10 script.

---

## IMPROVEMENTS (non-blocking, ordered by impact)

### I1. [scene] The pick floor makes bonds unpickable at the fitted view of large molecules
- **Code:** `src/scene/sceneModel.ts:322-331`. The floor-radius atom match is returned before bonds are tested, even when the ray truly hits the visible bond.
- **Probe:** aiming at each bond midpoint at the fitted view (16.6 px/Å, 700 px canvas):

  | Molecule | Floor | Bonds pickable | C–H bonds pickable |
  |---|---|---|---|
  | tristearin | fine 12 px | 14 / 172 | 0 / 110 |
  | tristearin | coarse 22 px | 0 / 172 | (all bonds 0) |
  | caffeine, benzene | both | mostly fine | — |

- B.1 says "atom wins on overlap", so this follows the letter of the spec. In practice, though, the bond card (B.12) cannot be reached on tristearin without zooming in.
- **Fix:** prefer a true bond hit over a floor-only atom hit.

### I2. [ui / scene] Two context-loss overlays and two WebGL probes
- **Overlays:** `Viewport.tsx:68-92` (RestartOverlay, z 20, reload = `location.reload`) and `ViewportHost.tsx:155-170` / `:197-206` (z 30, reload = remount) both mount on context loss.
  - That gives two `role="status"` regions announcing the same text, two 3 s timers, and two different reload semantics, one hidden under the other.
  - Keep one.
- **Probes:** `webglAvailable` (`Viewport.tsx:24-34`) and `detectWebGL` (`ViewportHost.tsx:11-21`) each create and lose a throwaway context at startup (round-1 I10).

### I3. [chem-core] `validateMolecule` accepts impossible values
- **Code:** `store.ts:184` accepts any finite charge. `:192` accepts two bonds between the same atom pair.
- **Probe:**
  - `charge 0.5 accepted? true`, and `molProperties` then shows the formula `CH₄⁺`, a fabricated value;
  - `charge 9 accepted? true`;
  - `duplicate bond between same pair accepted? true`.
- The Molfile parser (`io.ts:240`) also does not reject duplicate pairs.
- **Fix:** require integer charges in −2…+2 (B.12) and a unique unordered pair per bond.

### I4. [ui] PubChem unsupported-element errors are reported as "generic"
- `io.ts:568` correctly rethrows `unsupportedElement` / `unsupportedIsotope`, but `actions.ts:147-157` (`pubchemErrorKey`) has no case for them.
- So "ferrocene" gets `pc.err.generic` instead of the localized "Desteklenmeyen element: Fe" that checklist 15 expects for imports.

### I5. [chem-core] Clean-up toast and save edge cases
- `store.ts:819-825`: a converged clean-up adds no history entry but still toasts "Geometri düzenlendi". Probe: `methane cleanUp -> … past 0 toast code geometryOptimized`.
- The `pagehide` / `visibilitychange` flush (`store.ts:411-413`) can persist a mid-relax frame, because the animated relax writes `mol` every frame (`:837`).

### I6. [scene] Undo or redo across a library load does not re-frame, and colliding ids morph
- `undo` / `redo` never bump `fitNonce` or `loadNonce`. After loading tristearin and pressing Ctrl+Z, methane is shown at tristearin's camera distance (about 90 Å).
- `SceneModel.sync` (`sceneModel.ts:75-80`) retires entries only on a `loadNonce` change. Atom ids 1…n shared by both molecules spring from the old positions and change symbol in place.
- **Fix:** retire on a `mol.id` change and re-fit when the molecule identity changes.

### I7. [scene] The camera can move during an atom drag (checklist 13 edge)
- `CameraRig.tsx:244-263`: `refreshLimits` recomputes `maxDistance = max(12·R, 2·fit)` on every `mol` change, including every drag frame, and `controls.update()` (`:384`) clamps the radius.
- **Repro:** wheel out to the maximum, then drag an outer atom inward. The camera moves. Freeze the limits while `model.snap` is true.

### I8. [scene] The under-valence ring is hidden whenever Oto-H is on, even when hydrogens are missing
- `moleculeRig.ts:299` sets `under = valence === 1 && !autoH`. `toggle('autoH')` (`store.ts:475-478`) does not run `adjustHydrogens`.
- After "remove H" (which turns autoH off), turning autoH back on leaves bare atoms with no ring, while the inspector shows "n H eksik".

### I9. [scene] Tessellation is not scaled to molecule size
- `moleculeRig.ts:75` uses `SphereGeometry(1, 32, 22)` for every atom, giving `triangles=260514` for tristearin (`gauntlet/logs/r1-build-orbit-p95.txt`).
- That is fine on the RTX test machine (p95 7.1 ms), but heavy on phone GPUs. Add a lower-segment geometry above roughly 100 atoms.

### I10. [scene / ui] Dead code
- `pickAtClient` and `registerPicker` (`pickApi.ts:12-16`, `Interaction.tsx:76-79`) have no consumer.
- `ATOM_LONG_PRESS_EVENT` is dispatched (`Interaction.tsx:211`) with no listener.
- Also unused: `moleculeCenter` (`store.ts:879`), `recenter` (`store.ts:846`, no UI caller), `MoleculeRig.spheresVisible` (`moleculeRig.ts:371`), `ACCENT_DIM` (`theme.ts:5`), and `freeValence`, a trivial alias (`store.ts:268`).

### I11. [tests] The store suite is still 81 lines and misses every round-1/round-2 risk
- `tests/store.test.ts` covers none of these:
  - the relax lock and undo-cancel;
  - save-failure status and the single toast;
  - `?m` restore behaviour;
  - `validateMolecule` id and charge rules;
  - shell pool growth (B1);
  - Announcer messages (B3).
- B1 and B3 would have been caught by 10-line tests like the probes in `gauntlet/scratch/critic-r2-code/`.

### I12. [scene] Per-update allocations remain (minor; measured cost is small)
- **Allocation sites:**
  - `moleculeRig.ts:185` and `:279`: `buildAdjacency` builds a new `Map` on every body or bond-shell update;
  - `:312-313` and `:325`: segment and point arrays of objects;
  - `bondLayout.ts:125-146`: returns a fresh `{strands, n}` object per bond;
  - `CameraRig.tsx:279-296` and `:367-368`: `clone()` per tween frame.
- **Measured for tristearin** per drag/relax frame (`scene2.probe.ts`): sync 0.57 ms, step 0.07 ms, bodies 0.41 ms, overlays 0.06 ms, plus about 3 ms for `molProperties` in the deferred inspector. That is acceptable. The class comment "nothing here allocates per frame" is still inaccurate.

### I13. [scene] Pointer bookkeeping
- `Interaction.tsx:66`, `:185-186` and `:262`: `pointers` is pruned only in canvas `pointerup` / `pointercancel`; there is no `lostpointercapture` and no window-level fallback.
- A pointer that ends off-canvas without capture leaves a stale id, and every later press is then treated as multi-touch (round-1 I12).

### I14. [ui] Import reports success even if the store rejects the molecule
- `actions.ts:63-66` calls `loadMolecule` (which can only reject through a toast) and then unconditionally notifies `toast.imported`, overwriting the rejection.
- This is unreachable with today's parser validation, but it is fragile. Return a boolean from `loadMolecule`.

---

## Verified solid (probed this round)
- **Clean-up lock:** `edits during relax: past 0 -> 0`. Undo during relax restores the start molecule (`mol restored to start true`).
- **Save failure:** `3 failed saves -> saveFailed toasts 1 status error`, then `after recovery status saved`. The indicator is truthful: "Otomatik kayıt açık" until the first real write, then "Tarayıcıda kaydedildi" with a timestamp, and no spinner (`TopBar.tsx:17-48`).
- **Store edge cases:** the bond tool on the same atom toggles without an undo entry; `changeElement` resets the charge (`C+ -> N` gives `H3N`, charge 0); `changeElement('Xx')` is rejected with `unsupportedElement`.
- **Performance:** draw calls are constant (3 on tristearin, from the p95 log), and the rig has 14 pooled children. Body rewrite costs about 1.1 ms per frame on tristearin. Orbit p95 is 7.1 ms (vsync) and 1.7 ms (novsync) in `r1-build-orbit-p95.txt`. `molProperties` on a moved clone is 3.0 ms.
- **Disposal:** `MoleculeRig.dispose`, `InstancePool` / `PointCloud` / `GlyphLabels` growth, `Background` restore and `CameraRig` cleanup all release their resources.
- **Context loss:** `Lighting` is re-keyed on context restore, so the one-shot environment map is rebuilt.
- **Typecheck and tests:** tsc is clean and all 402 tests pass.
