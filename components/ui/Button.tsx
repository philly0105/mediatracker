import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'accent' | 'link'
  /** Semantic colour on top of `variant`. Exists so destructive actions stop
   *  being styled as the page's primary affirmative action and then patched
   *  with `hover:!bg-rose-600` at the call site. */
  tone?: 'default' | 'destructive' | 'success'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  tone = 'default',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick,
  style,
  className,
  ...rest
}: ButtonProps) {
  const pads = {
    sm: { padding: '7px 14px', fontSize: 'var(--text-sm)' },
    md: { padding: '10px 20px', fontSize: 'var(--text-base)' },
    lg: { padding: '12px 26px', fontSize: 'var(--text-md)' },
  }[size]

  // Variant colours and their hover states are `.btn-*` in globals.css. They
  // were a `useState(hover)` inline style, which meant a render on every pointer
  // enter/leave and — since the hover background was inline — callers could only
  // override it with `!important`. Moving to a class also drops the composed
  // onMouseEnter/onMouseLeave handlers that existed purely to keep that state.
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={['btn', `btn-${variant}`, tone !== 'default' && `btn-tone-${tone}`, className]
        .filter(Boolean)
        .join(' ')}
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
        whiteSpace: 'nowrap',
        ...pads,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
