interface IconProps { size?: number; className?: string }

const base = (size: number) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
})

/** Add Atom: an atom (circle) with a plus. */
export function AtomPlusIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="10" cy="14" r="6" />
      <path d="M19 3v6M16 6h6" />
    </svg>
  )
}

/** Add Bond: two atoms joined by a bond. */
export function BondIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M8.2 15.8 15.8 8.2" />
    </svg>
  )
}

/** Hydrogen add / remove: an "H" with a plus or minus. */
export function HydrogenIcon({ size = 18, className, mode }: IconProps & { mode: 'add' | 'remove' }) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 5v14M13 5v14M4 12h9" />
      <path d={mode === 'add' ? 'M18 9v6M15 12h6' : 'M15 12h6'} />
    </svg>
  )
}

/** Product mark: a methane-like tetrahedral cluster, simple and monochrome except one accent atom. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <g stroke="#9aa1ab" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 12 12 3.5" />
        <path d="M12 12 4.6 16.4" />
        <path d="M12 12 19.4 16.4" />
      </g>
      <circle cx="12" cy="3.5" r="2.2" fill="#e6e8eb" />
      <circle cx="4.6" cy="16.4" r="2.2" fill="#e6e8eb" />
      <circle cx="19.4" cy="16.4" r="2.2" fill="#e6e8eb" />
      <circle cx="12" cy="12" r="3.6" fill="#5ec8e5" />
    </svg>
  )
}
