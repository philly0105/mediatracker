import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  /** A leading lucide icon, 18px at stroke 1.8; the field colours it muted. */
  icon?: React.ReactNode
  multiline?: boolean
  rows?: number
}

// `.input-field` in globals.css is the inset well: the dark translucent fill,
// the inner shadow, the 14px radius, the 44px minimum and the placeholder
// colour. It was a `useState(focus)` inline style, which re-rendered the field
// on every focus change; keyboard focus is now the global outline. Nothing here
// sets a radius, so the class's 14px is the one that renders.

export function Input({
  icon,
  multiline = false,
  rows = 4,
  value,
  onChange,
  placeholder,
  type = 'text',
  style,
  className,
  ...rest
}: InputProps) {
  const fieldClass = ['input-field', className].filter(Boolean).join(' ')

  if (multiline) {
    return (
      <textarea
        rows={rows}
        value={value}
        onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
        placeholder={placeholder}
        className={fieldClass}
        style={{ resize: 'none' as React.CSSProperties['resize'], padding: '12px 14px', lineHeight: '20px', ...style }}
        {...rest}
      />
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {icon && (
        <div
          // The field owns the icon's size, stroke and colour, so a caller's
          // own `w-4 h-4` or `text-zinc-500` on the icon does not win.
          className="[&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:[stroke-width:1.8] [&>svg]:text-[var(--text-muted)]"
          style={{
            position: 'absolute',
            left: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        >
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        placeholder={placeholder}
        className={fieldClass}
        // No vertical padding: the field's minimum height centres the text.
        style={{ padding: icon ? '0 14px 0 42px' : '0 14px', ...style }}
        {...rest}
      />
    </div>
  )
}
