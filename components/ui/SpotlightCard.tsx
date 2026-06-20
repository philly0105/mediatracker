'use client'

import React, { useRef, useState } from 'react'

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(216, 166, 78, 0.10)',
  padding,
  style,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
  padding?: number | string
  style?: React.CSSProperties
  [key: string]: any
}) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)
  const [hover, setHover] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const styleProps: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    minWidth: 0,
    borderRadius: 'var(--radius-lg)',
    background: 'var(--glass-card)',
    backdropFilter: 'blur(var(--blur-lg))',
    WebkitBackdropFilter: 'blur(var(--blur-lg))',
    boxShadow: hover ? 'var(--glow-violet), var(--shadow-xl)' : 'var(--shadow-xl)',
    transition: 'border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard)',
    ...style,
  }

  if (padding !== undefined) {
    styleProps.padding = padding
  }

  // Only apply default design system borders if className doesn't supply them
  const hasCustomBorder = className.split(' ').some(c => c.startsWith('border') && c !== 'border-none')
  if (!hasCustomBorder) {
    styleProps.border = hover ? '1px solid var(--border-strong)' : '1px solid var(--border-subtle)'
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        setOpacity(1)
        setHover(true)
      }}
      onMouseLeave={() => {
        setOpacity(0)
        setHover(false)
      }}
      className={className}
      style={styleProps}
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
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', width: '100%' }}>{children}</div>
    </div>
  )
}

