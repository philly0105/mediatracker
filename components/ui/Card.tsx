'use client'
import React, { useState } from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  onClick?: () => void
}

export function Card({ children, onClick, style, ...rest }: CardProps) {
  const [hover, setHover] = useState(false)

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        padding: 'var(--space-7)',
        borderRadius: 'var(--radius-lg)',
        background: hover && onClick ? 'var(--glass-card-hover)' : 'var(--glass-card)',
        border: `1px solid ${hover && onClick ? 'var(--border-strong)' : 'var(--border-subtle)'}`,
        boxShadow: hover && onClick ? 'var(--glow-violet), var(--inset-hairline)' : 'none',
        transform: hover && onClick ? 'translateY(-2px)' : 'none',
        transition: 'all var(--dur-base) var(--ease-out-expo)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  )
}
