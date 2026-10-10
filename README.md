# Molecular Studio

Interactive 3D molecular modeling and visualization in the browser — build, edit and explore molecules with real 3D geometry and computed chemical properties.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · three.js / React Three Fiber / Drei · lucide-react · Motion · zustand · Vitest

## Features

- Real-time 3D viewport: orbit, pan, zoom, camera reset; ball-and-stick, space-filling, stick and wireframe modes (instanced rendering)
- Editor: add atoms and bonds (single/double/triple), delete, measure distances/angles/dihedrals, automatic hydrogens with VSEPR placement, undo/redo, geometry tidy (simple force field, approximate)
- Inspector: element data (atomic number, mass, coordinates), bond info (order, length vs. reference, polarity), molecule summary (Hill formula, molar & monoisotopic mass, rings, H-bond donors/acceptors, functional groups) — estimated values are labelled as such
- Molecule library (PubChem / experimental geometries), MOL/SDF/XYZ import & export, PNG export, PubChem search
- Turkish (default) and English UI; desktop, tablet and mobile layouts; reduced-motion support; local autosave

## Development

```bash
npm install
npm run dev        # dev server
npm test           # vitest
npm run build      # typecheck + production build
npx vite preview   # serve the production build
```

URL parameters: `?m=<library id>` loads a molecule (e.g. `?m=kafein`), `?intro` replays the intro, `?nointro` skips it.

## Project docs

- `SPEC.md` — product specification (with a research-backed enhancement addendum)
- `GOAL.md` — acceptance criteria
- `BRIEF.md` — original competition brief (Turkish)
- `gauntlet/critiques/` — independent review reports
