import React from 'react'

/**
 * DorfMovies Badge — tiny uppercase tracked label on a low-alpha accent tint.
 * Used for "WATCHED", "WATCHLIST", "TV", "PRIORITY", media-type tags, etc.
 */
const TONES = {
  violet: { color: 'var(--violet-400)', bg: 'var(--violet-tint-bg)', border: 'var(--violet-tint-border)' },
  orange: { color: 'var(--orange-400)', bg: 'var(--orange-tint-bg)', border: 'var(--orange-tint-border)' },
  rose: { color: 'var(--rose-400)', bg: 'var(--rose-tint-bg)', border: 'var(--rose-tint-border)' },
  emerald: { color: 'var(--emerald-400)', bg: 'var(--emerald-tint-bg)', border: 'var(--emerald-tint-border)' },
  amber: { color: 'var(--amber-400)', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.20)' },
  neutral: { color: 'var(--text-muted)', bg: 'var(--glass-chip)', border: 'var(--border-faint)' },
}

export function Badge({ children, tone = 'neutral', icon, dot = false, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-2xs)',
        fontWeight: 'var(--weight-bold)',
        letterSpacing: 'var(--tracking-widest)',
        textTransform: 'uppercase',
        lineHeight: 1,
        color: t.color,
        background: t.bg,
        border: `1px solid ${t.border}`,
        padding: '4px 8px',
        borderRadius: 'var(--radius-pill)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%', background: 'currentColor',
            boxShadow: '0 0 8px currentColor', animation: 'dorf-pulse 1.6s ease-in-out infinite',
          }}
        />
      )}
      {icon && <i data-lucide={icon} style={{ width: 12, height: 12 }} />}
      {children}
    </span>
  )
}
