import React from 'react'

interface BaseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Semantic colour on top of `variant`. Exists so destructive actions stop
   *  being styled as the page's primary affirmative action and then patched
   *  with `hover:!bg-rose-600` at the call site. */
  tone?: 'default' | 'destructive' | 'success'
  /** All three sizes keep the 44px hit target; they differ in padding and
   *  type, and `lg` is the 48px hero pill. */
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

type ButtonProps =
  | (BaseProps & { variant?: 'primary' | 'secondary' | 'ghost' | 'accent' | 'link' })
  // An icon button has no text, so the label is the only name a screen reader
  // gets. Requiring it in the type keeps the omission from compiling.
  | (BaseProps & { variant: 'icon'; 'aria-label': string })

// `.glass-btn` paints only the fill and its edge, so the text colour is set
// here (a tone class is unlayered and still wins), and its hover has no
// disabled guard, so a disabled pill would brighten under the pointer.
const GLASS_PILL = 'glass-btn text-[var(--text-primary)] disabled:hover:bg-[var(--btn-ghost-bg)]'

// Primary is the one white surface in the system (`.btn-primary`); secondary
// and icon are glass pills on `.glass-btn`; ghost, accent and link keep their
// `.btn-*` recipes in globals.css.
const VARIANT_CLASS = {
  primary: 'btn-primary',
  secondary: `btn-secondary ${GLASS_PILL}`,
  icon: `btn-icon ${GLASS_PILL}`,
  ghost: 'btn-ghost',
  accent: 'btn-accent',
  link: 'btn-link',
}

const SIZE = {
  sm: { minHeight: 44, padding: '0 14px', fontSize: 'var(--text-sm)' },
  md: { minHeight: 44, padding: '0 18px', fontSize: 'var(--text-base)' },
  lg: { minHeight: 48, padding: '0 20px', fontSize: 'var(--text-body)' },
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
  const dims = SIZE[size]
  // A circle the height of the pill it sits beside, with the icon centred.
  const shape = variant === 'icon'
    ? { width: dims.minHeight, height: dims.minHeight, padding: 0, flex: 'none' }
    : { width: fullWidth ? '100%' : 'auto', padding: dims.padding }

  // Variant colours and their hover states are classes rather than a
  // `useState(hover)` inline style, which meant a render on every pointer
  // enter/leave and — since the hover background was inline — callers could
  // only override it with `!important`. The radius lives on `.btn` too: an
  // inline radius here used to beat the pill.
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={['btn', VARIANT_CLASS[variant], tone !== 'default' && `btn-tone-${tone}`, className]
        .filter(Boolean)
        .join(' ')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: dims.minHeight,
        fontFamily: 'var(--font-sans)',
        fontSize: dims.fontSize,
        fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        whiteSpace: 'nowrap',
        ...shape,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
