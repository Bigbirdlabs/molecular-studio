import type { Vec3 } from '../chem/molecule'

/** Scene-side palette. Mirrors the CSS tokens in index.css (accent / states); kept here so the 3D layer has no DOM dependency. */
export const ACCENT = '#5ec8e5'
export const ACCENT_DIM = '#2b6f82'
export const DANGER = '#e5605a'
export const WARN = '#d9a441'
export const DASH_COLOR = '#d5dae0'
export const LABEL_COLOR = '#f1f3f5'
/** Mirrors the surface-0 token: the inner rim of the two-tone selection shell. */
export const SURFACE_0 = '#0a0b0d'

/** Very subtle vignette: lighter centre, near-black edge (matches --color-surface-0). */
export const BG_CENTER = '#121419'
export const BG_EDGE = '#08090b'

// ---------- camera ----------
export const FOV = 26
/** 3/4 view: shows tetrahedral / planar geometry at first glance instead of an axis-aligned projection. */
export const DEFAULT_VIEW_DIR: Vec3 = [0.36, 0.3, 1]
/** Fraction of the limiting viewport dimension used for the distance limits (largest style = space filling). */
export const FIT_FILL = 0.7
/**
 * Fraction of the limiting viewport dimension the molecule occupies after a fit / reset / load. The default framing uses the
 * space-filling radii (the largest style), so a style switch - which never moves the camera - cannot clip the molecule, and
 * an edit that grows it has room before the auto-frame kicks in.
 */
export const FIT_FILL_DEFAULT = 0.86
/** Edits that push the molecule's silhouette beyond this fraction of the free viewport trigger an animated re-frame. */
export const AUTOFRAME_EDGE = 0.94
/** A viewport resize of more than this fraction of the width (or an orientation change) re-fits the camera (SPEC B.5). */
export const REFIT_WIDTH_FRACTION = 0.2
/** Absolute closest camera distance from the orbit target (Å), SPEC B.1 / E13. */
export const MIN_CAMERA_DISTANCE = 1.5
/** Farthest camera distance as a multiple of the fit radius (bounding-sphere radius incl. atom radii). */
export const MAX_DISTANCE_RADII = 12
export const CAMERA_TWEEN_MS = 560

// ---------- picking / highlight ----------
export const PICK_MIN_ATOM_RADIUS = 0.2
export const PICK_MIN_BOND_RADIUS = 0.1
export const CLICK_SLOP_PX = 5
/** Touch pointers jitter more than a mouse (SPEC B.1 SHOULD, E22). */
export const CLICK_SLOP_TOUCH_PX = 10

/** On-screen floors for picking (CSS px radius, SPEC B.1). */
export const PICK_FLOOR_ATOM_FINE_PX = 12
export const PICK_FLOOR_ATOM_COARSE_PX = 22
export const PICK_FLOOR_BOND_PX = 4

/** Screen-constant overlay widths (CSS px). Selected = 1 px surface-0 rim + 2 px accent; hover = 1.5 px accent. */
export const SHELL_RIM_PX = 1
export const SHELL_SELECT_PX = 3
export const SHELL_HOVER_PX = 1.5
export const SHELL_HOVER_OPACITY = 0.45
export const MEASURE_LINE_PX = 1.5
export const MEASURE_ARC_PX = 2

// ---------- motion ----------
export const POS_STIFFNESS = 220
export const POS_DAMPING = 26
export const POP_STIFFNESS = 480
export const POP_DAMPING = 26
export const SHRINK_SECONDS = 0.2
export const BOND_GROW_TAU = 0.07
export const BOND_SHRINK_SECONDS = 0.18
export const STYLE_TAU = 0.05
export const MAX_DT = 1 / 30
