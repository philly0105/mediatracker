import React from 'react'

/**
 * DorfMovies SpotlightCard — large-radius glass card with a soft radial
 * "spotlight" that follows the cursor and fades in on hover. Used for the
 * dashboard bento stat tiles.
 */
export function SpotlightCard({
  children,
  spotlightColor = 'rgba(216, 166, 78, 0.10)',
  padding = 0,
  style,
  ...rest
}) {
  const ref = React.useRef(null)
  const [pos, setPos] = React.useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = React.useState(0)
  const [hover, setHover] = React.useState(false)

  function onMove(e) {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => { setOpacity(1); setHover(true) }}
      onMouseLeave={() => { setOpacity(0); setHover(false) }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minWidth: 0,
        borderRadius: 'var(--radius-2xl)',
        background: 'var(--bg-raised)',
        border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        backdropFilter: 'blur(var(--blur-lg))',
        WebkitBackdropFilter: 'blur(var(--blur-lg))',
        boxShadow: hover ? 'var(--glow-violet), var(--shadow-xl)' : 'var(--shadow-xl)',
        transition: 'border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
        padding,
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: '-1px',
          zIndex: 0,
          opacity,
          transition: 'opacity var(--dur-base) var(--ease-standard)',
          background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', width: '100%' }}>{children}</div>
    </div>
  )
}
