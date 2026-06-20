import React from 'react'

/**
 * DorfMovies NavItem — a sidebar row: Lucide icon + label, pill hover, and an
 * active state that fills with a glass pill and tints the icon violet.
 */
export function NavItem({ icon, label, active = false, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false)

  return (
    <a
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '11px 16px',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        fontWeight: active ? 'var(--weight-semibold)' : 'var(--weight-medium)',
        color: active ? 'var(--text-primary)' : (hover ? 'var(--zinc-300)' : 'var(--text-secondary)'),
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${active ? 'var(--border-default)' : 'transparent'}`,
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'color var(--dur-base) var(--ease-standard), background var(--dur-base) var(--ease-standard)',
        ...style,
      }}
      {...rest}
    >
      <i
        data-lucide={icon}
        style={{
          width: 16, height: 16, flexShrink: 0,
          color: active ? 'var(--accent)' : (hover ? 'var(--zinc-300)' : 'var(--text-muted)'),
          transform: hover ? 'scale(1.1)' : 'none',
          transition: 'transform var(--dur-base) var(--ease-out-expo)',
        }}
      />
      <span>{label}</span>
    </a>
  )
}
