import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'brand' | 'accent' | 'neutral' | 'live' | 'rating' | 'success'
}

export function Badge({ children, tone = 'neutral', style, ...rest }: BadgeProps) {
  const theme = {
    brand: { background: 'var(--green-tint-bg)', color: 'var(--green-300)', border: '1px solid var(--green-tint-border)' },
    accent: { background: 'var(--green-tint-bg)', color: 'var(--green-300)', border: '1px solid var(--green-tint-border)' },
    neutral: { background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
    live: { background: 'var(--rust-tint-bg)', color: 'var(--rust-300)', border: '1px solid var(--rust-tint-border)' },
    rating: { background: 'var(--amber-tint-bg)', color: 'var(--amber-300)', border: '1px solid var(--amber-tint-border)' },
    success: { background: 'var(--teal-tint-bg)', color: 'var(--teal-300)', border: '1px solid var(--teal-tint-border)' },
  }[tone]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--text-2xs)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-bold)' as React.CSSProperties['fontWeight'],
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-widest)',
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...theme,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  )
}
