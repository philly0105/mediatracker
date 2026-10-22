import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'brand' | 'accent' | 'neutral' | 'live' | 'rating' | 'success'
}

// A chip is a white-alpha pill; the tone only colours the text. Rating is the
// one gold, and brand, live and success all resolve to the single aqua accent.
// Over poster art the white chip washes out; that is `PosterBadge` in
// ui/PosterCard, the dark badge fill, not a mode of this one.
const TONE_COLOR = {
  brand: 'var(--accent)',
  accent: 'var(--accent)',
  neutral: 'var(--text-primary)',
  live: 'var(--live)',
  rating: 'var(--rating)',
  success: 'var(--success)',
}

export function Badge({ children, tone = 'neutral', style, ...rest }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        height: '24px',
        padding: '0 8px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-chip)',
        boxShadow: 'var(--glass-chip-edge)',
        color: TONE_COLOR[tone],
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        lineHeight: '16px',
        fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
        letterSpacing: 'var(--tracking-normal)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}
