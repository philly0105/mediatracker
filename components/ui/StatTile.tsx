import React from 'react'

interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  /** A word set beside the numeral, e.g. "shows" in "5 shows". */
  unit?: string
  icon?: React.ReactNode
}

// A numeral over its label, and nothing else: the tile has no box of its own
// because it sits inside a glass panel with its siblings, as in the reference's
// "2026 so far" grid. Pages that still show tiles in the open can add a
// surface class through `className`.
// The label stays first in the source, so a screen reader still says "Hours
// watched, 214" as it always has; column-reverse puts the numeral on top, and
// flex-end keeps the pair at the top of a tile a grid has stretched.
export function StatTile({ label, value, unit, icon, style, className, ...rest }: StatTileProps) {
  return (
    <div
      className={className}
      style={{ display: 'flex', flexDirection: 'column-reverse', justifyContent: 'flex-end', gap: 2, minWidth: 0, ...style }}
      {...rest}
    >
      <span style={{ fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)' }}>
        {label}
      </span>
      {/* A unit sits on the numeral's baseline, as the reference sets it; an
          icon stays centred on the numeral. */}
      <span style={{
        display: 'flex', alignItems: unit ? 'baseline' : 'center', gap: 6,
        fontSize: 'var(--text-3xl)', lineHeight: '34px',
        fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
        letterSpacing: 'var(--tracking-tighter)', fontVariantNumeric: 'tabular-nums',
        color: 'var(--text-primary)',
      }}>
        {value}
        {unit && (
          <span style={{
            fontSize: 'var(--text-body)', lineHeight: '18px',
            fontWeight: 'var(--weight-medium)' as React.CSSProperties['fontWeight'],
            letterSpacing: 'var(--tracking-text)', color: 'var(--text-muted)',
          }}>
            {unit}
          </span>
        )}
        {icon && <span style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>{icon}</span>}
      </span>
    </div>
  )
}
