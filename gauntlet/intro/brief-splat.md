# Intro v2 brief — "2D splat → 3D" (10 s)

User request: longer intro (10 seconds), "cool motion design: 2D texel/Gaussian-splatting design → 3D animation".

## Hard constraints
- ONLY create files in your own `src/intro/variantX/` folder (plus notes in `gauntlet/intro/`). Another Claude session edits the rest of the project. No npm install, no `npm run build`, no edits to existing files, no dev server on the default port.
- Export `default function Intro({ onDone, reducedMotion, language }: { onDone: () => void; reducedMotion?: boolean; language?: 'tr' | 'en' })`.
  - `reducedMotion`: if `undefined`, fall back to `matchMedia('(prefers-reduced-motion: reduce)')`; if explicitly `false`, ALWAYS animate. Reduced path: static final frame ~600 ms, then 300 ms fade, then onDone.
  - language: 'tr' default. Subtitle TR "Moleküler Modelleme Stüdyosu" / EN "Molecular Modeling Studio"; skip button "Atla" / "Skip".
- Full-screen fixed overlay, z-index 9999, background #0a0b0d. Skippable: real `<button>` (aria-label, ≥44 px hit area, focus-visible outline #5ec8e5), Esc, Enter, click anywhere → fast exit (~300 ms) → onDone exactly once (doneRef guard, onDoneRef latest).
- Total run ≈ 10.0 s including exit.
- Render with a single `<canvas>` (Canvas 2D, devicePixelRatio-aware, resizes with window) + DOM/motion for text. No Three.js, no WebGL. One rAF loop, cancelled on unmount/exit. No listeners leaking. StrictMode-safe. No `any`.
- Molecule data MUST be real: `import { getEntry } from '../../chem/library'` and `import { el } from '../../chem/elements'` (read-only imports). Use `getEntry('kafein')!.molecule` (atoms have `symbol`, `pos: [x,y,z]` in Å; bonds `a`,`b` are atom ids, `order`). Atom colors from `el(symbol).color` (CPK), radii from `el(symbol).covalent`. Do not invent coordinates.
- Art direction (SPEC.md): near-black, restrained, premium scientific. NO glow, NO blur filters, NO shadowBlur, NO gradient backgrounds, NO neon. Splats = small crisp alpha-blended discs/squares. Accent #5ec8e5 used sparingly. Ink #e6e8eb, ink-dim #9aa1ab, lines #23262c/#323640. Fonts: Inter/system sans, mono ui-monospace.
- Performance: ≤ 8 000 splats, typed arrays, no per-frame allocation in the hot loop; must hold 60 fps on a laptop.
- Must look composed at 1440×900 AND 390×844 (scale from min(width, height)).

## Suggested timeline (adapt)
- 0.0–2.0 s  2D: splats scatter in onto a flat plane and settle into the molecule's flat 2D projection (skeletal/structure-formula look), like a texel/splat image resolving.
- 2.0–4.5 s  2D → 3D: the flat splat image lifts — each splat gains its real z, the camera tilts, the picture inflates into a 3D point cloud sampled over each atom's sphere (and along bonds).
- 4.5–7.0 s  3D: slow orbit; splats tighten/densify into shaded solid atoms (per-splat Lambert shading from a fixed light, depth-sorted), bonds resolve.
- 6.5–8.8 s  Wordmark "Molecular Studio" + subtitle + a mono caption with true facts (C₈H₁₀N₄O₂ · Kafein/Caffeine · 24 atoms).
- 8.8–10.0 s exit, revealing the app.

Write `gauntlet/intro/variantX-notes.md` (5 lines). Self-check: `cd /d/molecular-studio && npx tsc --noEmit -p tsconfig.json 2>&1 | grep -i "src/intro/variantX"` must print nothing.
