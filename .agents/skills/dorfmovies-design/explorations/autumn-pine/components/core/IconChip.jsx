import React from 'react'

/**
 * DorfMovies IconChip — a round tint "well" with a centered Lucide icon.
 * The standard adornment at the top of bento stat cards. Scales to 110% when
 * its `hover` prop is set (drive from the parent card's hover state).
 */
const TONES = {
  violet: { color: 'var(--violet-400)', bg: 'var(--violet-tint-bg)', border: 'var(--violet-tint-border)' },
  orange: { color: 'var(--orange-400)', bg: 'var(--orange-tint-bg)', border: 'var(--orange-tint-border)' },
  rose: { color: 'var(--rose-400)', bg: 'var(--rose-tint-bg)', border: 'var(--rose-tint-border)' },
  emerald: { color: 'var(--emerald-400)', bg: 'var(--emerald-tint-bg)', border: 'var(--emerald-tint-border)' },
}

export function IconChip({ icon, tone = 'violet', size = 40, hover = false, glow = false, style, ...rest }) {
  const t = TONES[tone] || TONES.violet
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: t.bg,
        border: `1px solid ${t.border}`,
        color: t.color,
        boxShadow: glow ? `0 0 15px ${t.bg}` : 'none',
        transform: hover ? 'scale(1.1)' : 'none',
        transition: 'transform var(--dur-slow) var(--ease-out-expo)',
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      <i data-lucide={icon} style={{ width: Math.round(size * 0.45), height: Math.round(size * 0.45) }} />
    </span>
  )
}
