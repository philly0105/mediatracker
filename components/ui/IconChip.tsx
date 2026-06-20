import React from 'react'

interface IconChipProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: React.ReactNode
  tone?: 'brand' | 'live' | 'rating' | 'success' | 'neutral'
}

export function IconChip({ icon, tone = 'neutral', style, ...rest }: IconChipProps) {
  const theme = {
    brand: { background: 'var(--green-tint-bg)', color: 'var(--green-300)', border: '1px solid var(--green-tint-border)' },
    live: { background: 'var(--rust-tint-bg)', color: 'var(--rust-300)', border: '1px solid var(--rust-tint-border)' },
    rating: { background: 'var(--amber-tint-bg)', color: 'var(--amber-300)', border: '1px solid var(--amber-tint-border)' },
    success: { background: 'var(--teal-tint-bg)', color: 'var(--teal-300)', border: '1px solid var(--teal-tint-border)' },
    neutral: { background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
  }[tone]

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-sm)',
        flexShrink: 0,
        ...theme,
        ...style,
      }}
      {...rest}
    >
      {icon}
    </div>
  )
}
