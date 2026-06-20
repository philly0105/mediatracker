import React, { useState } from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'accent' | 'link'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  iconRight?: string
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  icon,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  iconRight,
  disabled = false,
  fullWidth = false,
  onClick,
  style,
  ...rest
}: ButtonProps) {
  const [hover, setHover] = useState(false)

  const pads = {
    sm: { padding: '7px 14px', fontSize: 'var(--text-sm)' },
    md: { padding: '10px 20px', fontSize: 'var(--text-base)' },
    lg: { padding: '12px 26px', fontSize: 'var(--text-md)' },
  }[size]

  const variants = {
    primary: {
      background: hover && !disabled ? 'var(--btn-primary-bg-hover)' : 'var(--btn-primary-bg)',
      color: 'var(--btn-primary-fg)',
      border: '1px solid transparent',
    },
    ghost: {
      background: hover && !disabled ? 'var(--btn-ghost-bg-hover)' : 'var(--btn-ghost-bg)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
      backdropFilter: 'blur(var(--blur-md))',
    },
    accent: {
      background: hover && !disabled ? 'var(--violet-tint-border)' : 'var(--violet-tint-bg)',
      color: 'var(--violet-300)',
      border: '1px solid var(--violet-tint-border)',
    },
    link: {
      background: hover ? 'var(--btn-ghost-bg)' : 'transparent',
      color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
      border: '1px solid transparent',
    },
  }[variant]

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-out-expo)',
        whiteSpace: 'nowrap',
        ...pads,
        ...variants,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
