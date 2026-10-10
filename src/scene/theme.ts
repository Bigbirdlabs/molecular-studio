import type { Vec3 } from '../chem/molecule'

/** Scene-side palette. Mirrors the CSS tokens in index.css (accent / states); kept here so the 3D layer has no DOM dependency. */
export const ACCENT = '#5ec8e5'
export const ACCENT_DIM = '#2b6f82'
export const DANGER = '#e5605a'
export const WARN = '#d9a441'
export const DASH_COLOR = '#d5dae0'
export const LABEL_COLOR = '#f1f3f5'

/** Very subtle vignette: lighter centre, near-black edge (matches --color-surface-0). */
export const BG_CENTER = '#121419'
export const BG_EDGE = '#08090b'

// ---------- camera ----------
export const FOV = 26
/** 3/4 view: shows tetrahedral / planar geometry at first glance instead of an axis-aligned projection. */
export const DEFAULT_VIEW_DIR: Vec3 = [0.36, 0.3, 1]
/** Fraction of the limiting viewport dimension the molecule should occupy after a fit (leaves a 10-20 % margin). */
export const FIT_FILL = 0.88
export const ZOOM_IN_FACTOR = 3 // wheel / pinch range: fitted distance / 3 ... fitted distance * 3
export const CAMERA_TWEEN_MS = 560

// ---------- picking / highlight ----------
export const PICK_MIN_ATOM_RADIUS = 0.2
export const PICK_MIN_BOND_RADIUS = 0.1
export const CLICK_SLOP_PX = 5
export const SHELL_THICKNESS = 0.04

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
