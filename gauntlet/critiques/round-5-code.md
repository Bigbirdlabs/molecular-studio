# Round 5: Code critic (lens: engineering quality, robustness, performance)

**Tree reviewed:** working tree on `main` at `190f5b3` plus the uncommitted round-3/4 fixes (31 modified files, new `src/scene/controlsUtil.ts`, `src/ui/inspector/{FittedElementPicker.tsx,longPress.ts,reveal.ts}`, `tests/helpers/`, `tests/store-deeplink.test.ts`, `tests/store-import.test.ts`). `src/intro/` not reviewed; `src/main.tsx` still ends with `import './intro/mount'`.

**Basis:** fresh context, judged against SPEC.md (original + ENHANCEMENT ADDENDUM, MUST-v1 checklist), GOAL.md, BRIEF.md. No source file edited.

**Commands (each run once, output saved):**

| Log | Result |
|---|---|
| `gauntlet/logs/critic-r5-code-tsc.txt` | `npx tsc --noEmit` exit 0 |
| `gauntlet/logs/critic-r5-code-vitest.txt` | `npx vitest run`: 12 files, 432 tests, all pass |
| `gauntlet/logs/critic-r5-code-probes.txt` (+ `-probe-run.txt`, `-perf-run.txt`) | my probes in `gauntlet/scratch/critic-r5-code/` (store edge cases, provenance, perf / scaling) |

No browser run this round (heavy-command rule; the team's `gauntlet/logs/r4-build-orbit-p95.txt` artifact exists and passes).

**Verdict: FAIL. Score 82/100** (round 4: 76).

Round-4 blockers, re-checked in the code:
- **B1 bond colour split**: fixed. `bondColourSplit` (`bondLayout.ts:126-130`) splits between the sphere surfaces; `moleculeRig.ts:200-215` uses it. Probe: C–H visible halves 0.202 / 0.202 Å, O–H 0.161 / 0.161 Å.
- **B2 deep-link save indicator**: fixed. `replaceMolecule` sets `lastSavedAt: null` on the deep-link path (`store.ts:774`). Probe: `status saved, lastSavedAt null`, so the top bar reads `save.ready`.
- **B3 WebGL unavailable**: **not fixed**, see B2 below.
- **B4 frame-time artifact**: fixed. `gauntlet/logs/r4-build-orbit-p95.txt`: tristearin, vsync, p95 7.10 ms, 6 draw calls, geometries flat.
- **B5 checklist 36 literal**: fixed. 0 hits for `[çğıİöşüÇĞÖŞÜ]` in `src/ui/**/*.tsx` (node scan).
- **B6 empty-molecule fit**: fixed. `CameraRig.tsx:306` returns before framing an empty point set on `'fit'`.
- **Round-4 I4** (labels / language rewrote buffers): fixed. `MoleculeLayer.tsx:9-16` moved them to `OVERLAY_ONLY`.
- **Round-4 I5** (SceneBoundary showed the WebGL text): fixed. `Viewport.tsx:75-87` renders `app.viewError.*` with an in-place rebuild that keeps the molecule, history and camera.
- **Round-4 I7** (PubChem provenance lost on reload): fixed by the persisted registry in `inspector/source.ts`. That new module introduces blocker B1 below.

Architecture is still the strongest part:
- Chemistry is pure. The scene is imperative with `frameloop="demand"`.
- Picking runs on model entries, never on instance indices. After deleting 50 tristearin atoms, the model, the rig instances and the molecule all hold 123 atoms (probe).
- Pools grow with carry-over and dispose what they replace.
- No component subscribes to the whole store. `cameraStatus` is throttled to 150 ms.

The verdict stays FAIL because of one new provenance regression (an A3.2 MUST) and two MUSTs carried over from earlier rounds.

---

## BLOCKING

### B1. [ui] The new provenance registry's "moved by hand" flag is sticky. It mislabels pristine CCCBDB coordinates and clean-up (relaxStep) output (SPEC A3.2 MUST; addendum §Provenance rule 3; SPEC §8)
**Code** (`src/ui/inspector/source.ts`):
- `:107-114`: the first drag frame sets `moved: true` on the record for `mol.id`. Nothing ever clears it on the same id: not undo, not clean-up, not re-loading the same library entry.
- `:99-104`: the record is dropped only when `p.mol.id !== m.id`. Library molecules keep the stable id `lib-<entry>` (`library.ts:1022`), so loading water while water is on screen keeps the flag.
- `:191`: `useGeometryOrigin` returns `'moved'` before any other check.
- The flag is persisted to localStorage (`persist()`), so it also survives a reload.

**Probe** (`a-store.probe.ts` and `b-prov.probe.ts`, `critic-r5-code-probes.txt` `[prov]` / `[prov2]`):

| Step | `useGeometryOrigin` | `coordSource.edited` | Experimental angle row |
|---|---|---|---|
| load library water (`lib-su`) | `source` | – | – |
| drag an H, release | `moved` | `true` | – |
| Ctrl+Z (coordinates equal the library entry again) | `moved` | `false` | shown (CCCBDB, 104.478°) |
| load water from the library again | `moved` | `false` | – |
| drag, then "Geometriyi düzenle" (relaxStep) | `moved` | – | – |

A3.2 requires relaxStep geometry to be labelled idealised; `moved` is reported instead.

**Effect** (`Inspector.tsx:53-58`, `:362`, `:516`): for pristine experimental water, the atom and bond cards label the angle and length "Modeldeki bağ açısı / Modeldeki uzunluk". Their tooltip reads "Atomlar elle taşındı… ne yerleştirme sabiti ne ölçüm". The molecule card above them meanwhile shows the untouched CCCBDB source line and the experimental reference angle. One screen therefore makes two contradicting provenance claims about the same numbers.

**Fix:**
- Derive `moved` from the current coordinates, not from a latch. Store the snapshot of the last non-drag state, or clear `moved` on undo/redo, clean-up finish and any load.
- Let `editedSince(...) === false` win: identical to the source means `source`.
- Let a finished clean-up map to `idealized`.
- Add tests for drag → undo, drag → reload and drag → clean-up. `source.ts` gained 202 lines this round and has zero tests.

### B2. [ui] WebGL unavailable: edit tools still enabled and the SPEC string still absent (SPEC B.9 MUST "`Tarayıcınız WebGL desteklemiyor; 3B görünüm açılamıyor` … edit tools disabled with that reason"). Carried over from round-4 B3 and round-3 checklist item 1.
- **Code:**
  - `ViewportHost.tsx:162,181` uses `noWebgl` only to hide the HUD.
  - `Toolbar.tsx` has no WebGL condition. The rail tools Atom / Bond / Delete / Measure, Geometriyi düzenle, H ekle/kaldır and Yeni stay enabled.
  - File → PNG export stays enabled too (`menus.ts:27`) and only fails at click time.
- **Copy:** `i18n.ts:16-17` is still "WebGL kullanılamıyor" plus a long body.
- **Fix:**
  - Put a `webgl: 'ok' | 'unavailable'` flag in the store (set by `Viewport.tsx` where it renders `<Unavailable>`). This also removes the subtree `MutationObserver` in `ViewportHost.tsx:140-152`.
  - Disable the canvas-dependent tools with `disabledReason` set to the SPEC string.
  - Correct `app.webgl.title` / body.

### B3. [ui] The status bar's "kamera sıfırlandı / özel görünüm" is guessed from the tool, not read from the camera. It is wrong in common flows (SPEC D.6.6 MUST "live camera status from the store"; SPEC §8 no UI state that does not correspond to application state). Round-4 I1, unfixed for two rounds.
**Code:**
- `StatusBar.tsx:9`: `EDIT_TOOLS = atom/bond/erase/measure`.
- `StatusBar.tsx:41`: a left press counts as a camera drag only outside those tools.
- The flag is local React state and never reaches the store.

**What actually happens:**
- In Atom / Bond (on empty space) / Delete / Measure, a press on empty space has no drag candidate (`Interaction.tsx:195-198`). OrbitControls keeps `LEFT = ROTATE` (`CameraRig.tsx:103`), so the camera orbits.

**Repros:**
1. Atom tool, drag 30 px on empty space (checklist 7's own gesture). The camera orbits; the status stays "kamera sıfırlandı".
2. View → Auto-rotate. The camera turns continuously; the status stays "kamera sıfırlandı".
3. Select tool, drag an atom. The camera is untouched (checklist 13); the status flips to "özel görünüm".

**Fix:**
- In `CameraRig`, set a store flag `cameraCustom = true` on OrbitControls `start` (a real camera gesture), on wheel, on `zoomBy` and on auto-rotate frames.
- Clear it in `frame()` / reset.
- StatusBar only reads it, and the pointer heuristics in `StatusBar.tsx:17-60` go away.

---

## IMPROVEMENTS (non-blocking, by impact)

### I1. [scene] `SceneModel.sync` is O(atoms × bonds) on every drag / relax frame
- `sceneModel.ts:126-128` calls `valenceState(mol, a)` per atom; each call scans all bonds (`valenceUsed`, plus `neighbours` for S/P).
- **Probe** (`[perf] alkane …`):

  | Atoms | `sync` per frame |
  |---|---|
  | 182 | 0.46 ms |
  | 902 | 3.20 ms |
  | 3 002 | 73.3 ms |

  The import limit is 5 000 atoms (`io.ts:51`), so dragging or tidying a large imported structure drops to about 10 fps.
- **Fix:** build one `Map<id, usedOrder>` and an adjacency map per sync (the `deg` map at `:91-94` already exists), and pass them to a `valenceStateFast`.

### I2. [chem-core / ui] Edits during clean-up are still swallowed without feedback (round-4 I3)
- The probe deletes an atom during a relax: ignored, `toast null` (`store.ts:837` `locked()`). The same holds for canvas clicks in Atom / Bond / Delete (`store.ts:621`, `:686`, `:699`) and for Delete / Backspace (`shortcuts.ts:65`). Only the status-bar hint changes.
- The Undo button is disabled while a relax runs on an empty `past` (`TopBar.tsx:112`), although Ctrl+Z cancels the relax (`store.ts:958`).
- **Fix:** toast `act.reason.relaxing` once per gesture, or disable the edit tools while `relaxing`; enable Undo while `relaxing`.

### I3. [chem-core] Dead and unguarded code (round-4 I6, unchanged)
- **`setName`** (`store.ts:781`): no caller, not guarded by `locked()`. Probe: renaming during a relax pushes one extra history entry, and the relax then overwrites the name (`past grew by 1` then `name Etanol`).
- **Backup ring:** `restoreBackup` / `listProjectBackups` (`store.ts:249`, `:753`) have no UI. The ring that guards deep-link overwrites cannot be reached by a user.
- **Unused or redundant:**
  - `recenter`, `moleculeCenter` (`store.ts:951`, `:984`): no caller;
  - `freeValence` (`store.ts:327`): an alias;
  - `pickAtClient` (`pickApi.ts:14`) and `MoleculeRig.spheresVisible` (`moleculeRig.ts:393`): unused.
- **Stale comments:**
  - `App.tsx:146` says "the stored project is skipped by the store when ?m= is present". `store.ts:228-233` says the opposite.
  - The `backupRaw` doc comment (`store.ts:230`) still names a single `:backup` key; the code uses the `:backups` ring.

### I4. [tests] Round-4 and round-5 fixes have no regression tests
- `bondColourSplit` was requested in round 4 and has no test in `tests/scene.test.ts`.
- The empty-molecule no-fit guard in `CameraRig.frame` has no test.
- The whole provenance registry (`inspector/source.ts`: pending marks, history detection, `moved`, persistence) has no test.
- Camera status has no test.
- The store tests are good now (`store-rounds`, `store-deeplink`, `store-import`: relax lock, deep-link strip and backup, save-failure streak).

### I5. [scene] Layering and i18n leaks
- **The scene imports UI modules:**
  - `ui/uiStore` (`Interaction.tsx:6`, `CameraRig.tsx:7`): sheet snap, chrome height;
  - `ui/i18n` (`Viewport.tsx:6`, `HoverTip.tsx:6`, `Announcer.tsx:6`).
  - Rendering therefore depends on the UI layer. Pass the cover height and strings in through `SceneContext` / props instead.
- **User-visible strings outside the dictionary** escape `i18n.test.ts`:
  - `Announcer.tsx:14-37` (live-region text);
  - `HoverTip.tsx:25-27` ("bağ", "yük");
  - the clean-up "Geometri zaten düzenli" toast (`store.ts:924`, no code, so no dictionary key).
- **HoverTip `x/max bağ`** uses the largest allowed valence (H₂S reads "2/6 bağ", although the molecule is valence-OK), and keeps its own `usedValence` copy (`HoverTip.tsx:11-15`) instead of `valenceUsed`.

### I6. [ui] `inspector/source.ts` structure
- `useCoordSource` / `useGeometryOrigin` / `useImportedEdited` are plain functions with hook names. They read a mutable module registry, so React never re-renders when only the registry changes.
- A store subscription is installed as an import side effect (`:230`).
- `markImportedMolecule(named.id)` runs before validation (`actions.ts:67`), so a rejected import leaves a stale `pending` entry. `Dialogs.tsx:177` does the same for PubChem.
- **Fix:** move provenance into the store (or a small zustand slice), saved alongside the project record.

### I7. [ui] Error-path polish
- `ViewBoundary`'s Reload is still `window.location.reload()` (`ViewportHost.tsx:30`), which drops undo history. The in-scene path already shows how to rebuild in place.
- WebGL detection uses a subtree `MutationObserver` that fires on every Announcer and HoverTip DOM change (`ViewportHost.tsx:140-152`); see the store flag in B2.

### I8. [scene] GPU budget on phones (round-2 I9, unchanged)
- `SphereGeometry(1, 32, 22)` gives 1 344 triangles × 173 atoms = 232 512 triangles for tristearin spheres alone (probe).
- `preserveDrawingBuffer: true` (`Viewport.tsx:137`) costs on tiled mobile GPUs.
- Desktop has a comfortable margin (p95 7.1 ms). An LOD step above about 100 visible atoms, plus a render-then-capture PNG export, would help phones.

### I9. [scene] Redundant per-frame work (all cheap today, listed for completeness)
- `ctx.sync()` runs twice per frame (`CameraRig.tsx:381` and `MoleculeLayer.tsx:81`).
- While charge colouring is on, `chargeTopologyKey` runs every frame (0.004 ms on tristearin).
- Every animated frame allocates fresh `lineSegs` / `arcSegs` arrays and object literals in `drawOverlays` (`moleculeRig.ts:320-321`). The overlay pass costs 0.29 ms with labels and a 4-atom measurement.
- `CameraRig` tweens clone three `Vector3` per frame (`:471-474`).

### I10. [scene] Pointer bookkeeping (round-3 I13 / round-4 I10, unchanged)
- `pointers` (`Interaction.tsx:69`) is cleared only by `pointerup` / `pointercancel` on the canvas. There is no `lostpointercapture` or window `blur` fallback.
- A stale id makes every later press look like a second finger (`:196`), and canvas clicks then stop working until reload.

### I11. [scene] `touch-action: none` sits on the wrapper as well as the canvas
- `Viewport.tsx:53` `FILL` puts it on the wrapper; SPEC B.1 says "on the canvas only". The wrapper also hosts the reload button and the HoverTip.

### I12. [ui] PNG export blank-frame heuristic
- `drawViewport` (`actions.ts:115-125`) samples a 32×32 downscale and rejects a frame when every sample is within 6 of the first.
- A small or far-zoomed molecule on a large canvas can average away and give a false `toast.pngFailed` after 4 retries.
- **Fix:** sample at a larger size, or check the alpha / clear state instead.

---

## Verified solid this round

- **Store edge cases** (probes and tests):
  - bond tool on the same atom: pending toggles off, no bond, no history entry;
  - charges clamp to −2…+2, and `setCharge(NaN)` is ignored;
  - empty-molecule delete / add-H / remove-H / clean-up / select-all add no history entry and start no relax;
  - the first atom on an empty canvas goes to the origin and gets one fit;
  - undo during a relax restores the relax base without a history entry;
  - drag + commit chronology holds.
- **Autosave truthfulness:**
  - a fresh profile shows `saved` with `lastSavedAt null`, so the indicator reads "not saved yet";
  - an edit shows `unsaved`, a failed write shows `error` plus one `saveFailed` toast, and recovery shows `saved` with the data written;
  - a flush during a relax writes the relax base;
  - the deep link no longer claims a save.
- **localStorage:** every access is inside try/catch (including `typeof localStorage`, which throws when storage is blocked); the provenance registry falls back to session-only.
- **Render isolation:**
  - `WATCHED` / `OVERLAY_ONLY` split;
  - hover changes rewrite only the overlays (0.041 ms);
  - full body rewrite of tristearin 0.25 ms;
  - `SceneModel.sync` 0.33 ms;
  - `molProperties` 0.97 ms, deferred through `useDeferredValue` in the inspector.
- **Draw calls:** tristearin with labels and a measurement uses 5 non-empty draw objects out of 14 rig children; the team artifact reports 6 draw calls during orbit, flat geometries / textures.
- **Disposal:**
  - pools, point clouds and glyph geometry dispose replaced buffers;
  - the rig disposes everything on teardown and on context loss;
  - listeners are balanced in every scene and UI module checked (`StatusBar`, `CameraRig`, `Interaction`, `BottomSheet`, `Menu`, `Modal`, `shortcuts`, `layout`).
- **Crash containment:**
  - frame-loop errors reach `ViewFailed` through `ctx.fail`, with an in-place rebuild;
  - the Inspector has its own boundary keyed on the molecule;
  - the Announcer listener cannot throw into zustand's listener chain.
- **NaN guards:**
  - `writeCylinder` rejects degenerate segments;
  - `relaxStep` rejects non-finite input or energy;
  - `validateMolecule` requires finite coordinates and integer charges;
  - `zoomBy` rejects non-positive / non-finite factors;
  - `computeFit` handles the empty set.
- **No TODO / FIXME**, no placeholder menu entries (every File / View item is wired or honestly disabled), `tsc` clean, 432 tests green.
