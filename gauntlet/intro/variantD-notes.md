Variant D "Layers" — src/intro/variantD/Intro.tsx (single file, Canvas 2D, no deps beyond chem/library + chem/elements).
0.0-2.0 s raster print: square 0.09 Å texels stamp top-to-bottom/left-to-right with an accent scan line, mono Å rulers and a ROW n/N readout; 2D structure drawn from real x,y (bond order = parallel texel lines).
2.0-4.5 s z-stack: texels grouped into populated z slices (labelled "z ±0.00 Å" sheets) slide to true z while camera goes front -> 3/4 view; 3.75-5 s each texel resamples onto its atom sphere / bond cylinder.
4.5-8.8 s extra splats densify, per-splat Lambert shading (fixed light, 96-bucket depth sort), slow orbit; 6.5-8.8 s wordmark + subtitle + caption (formula computed from data); fade 8.8-10.0 s.
Splats <= 7600 (typed arrays, zero per-frame allocation); reduced motion = static frame 600 ms + 300 ms fade; skip button / Esc / Enter / click -> 300 ms exit, doneRef-guarded.
