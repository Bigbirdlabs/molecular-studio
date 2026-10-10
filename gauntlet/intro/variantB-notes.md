Concept: "Periodic -> Molecule" — an 18x4 periodic-table slice (thin #23262c cells, mono symbols) from which H, C, O lift out and snap into a 2D ball-and-stick ethanol (CPK colors, real bond lengths, C-O-H 108.5 deg caption).
Timeline: 0-0.9s grid fades in; 0.6-1.6s accent scanner sweeps; 1.0/1.2/1.4s H/C/O cells highlight; 1.7-2.9s atoms fly cell->molecule; 2.55-3.1s bonds draw (pathLength); 3.0-4.0s wordmark tracking settle + underline + subtitle; 4.0-4.5s grid collapses + clip-path wipe, onDone at ~4.54s.
Skip: "Atla / Skip" button bottom-right, Esc, Enter, or click anywhere -> 260ms fast clip wipe, then onDone (idempotent via ref).
Reduced motion: static final frame (all animations duration 0) for 600ms, then 300ms opacity fade, then onDone.
Props: default export Intro({ onDone }); fixed inset-0 z-9999, inline styles only, motion/react, no assets, no global CSS.
