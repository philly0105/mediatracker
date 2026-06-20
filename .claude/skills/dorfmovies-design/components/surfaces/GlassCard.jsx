import React from 'react'

/**
 * DorfMovies GlassCard — the workhorse surface. Translucent dark fill +
 * backdrop blur + hairline border. On hover it lifts, brightens its border,
 * and casts a colored glow (violet by default).
 */
const GLOWS = {
  violet: 'var(--glow-violet)',
  rose: 'var(--glow-rose)',
  orange: 'var(--glow-orange)',
  none: 'none',
}

export function GlassCard({
  children,
  glow = 'violet',
  interactive = true,
  padding = 'var(--space-6)',
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false)
  const lifted = interactive && hover

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        background: lifted ? 'var(--glass-card-hover)' : 'var(--glass-card)',
        border: `1px solid ${lifted ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        backdropFilter: 'blur(var(--blur-md))',
        WebkitBackdropFilter: 'blur(var(--blur-md))',
        boxShadow: lifted ? `${GLOWS[glow] || GLOWS.violet}, var(--inset-hairline)` : 'none',
        transform: lifted ? 'var(--lift-hover)' : 'none',
        transition: 'all var(--dur-slow) var(--ease-out-expo)',
        cursor: interactive && onClick ? 'pointer' : 'default',
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
