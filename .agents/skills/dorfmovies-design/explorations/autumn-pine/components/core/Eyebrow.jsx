import React from 'react'

/**
 * DorfMovies Eyebrow — a small pill containing a wide-tracked uppercase label
 * and (optionally) a leading accent icon. The "WELCOME BACK" treatment.
 */
export function Eyebrow({ children, icon, tone = 'violet', style, ...rest }) {
  const color = {
    violet: 'var(--violet-300)',
    orange: 'var(--orange-400)',
    rose: 'var(--rose-400)',
    neutral: 'var(--text-muted)',
  }[tone] || 'var(--violet-300)'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 12px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-chip)',
        border: '1px solid var(--border-default)',
        backdropFilter: 'blur(var(--blur-md))',
        boxShadow: 'var(--shadow-sm)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-bold)',
        letterSpacing: 'var(--tracking-widest)',
        textTransform: 'uppercase',
        color,
        ...style,
      }}
      {...rest}
    >
      {icon && <i data-lucide={icon} style={{ width: 14, height: 14 }} />}
      {children}
    </span>
  )
}
