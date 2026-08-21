import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  icon?: React.ReactNode
  multiline?: boolean
  rows?: number
}

// `.input-field` in globals.css carries the base and the focus border. It was a
// `useState(focus)` inline style, which re-rendered the field on every focus
// change and needed the directive above to exist at all.

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
        style={{ resize: 'none' as React.CSSProperties['resize'], borderRadius: 'var(--radius-sm)', padding: '12px 18px', ...style }}
        {...rest}
      />
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {icon && (
        <div style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        placeholder={placeholder}
        className={fieldClass}
        style={{ borderRadius: 'var(--radius-sm)', padding: icon ? '11px 16px 11px 42px' : '11px 16px', ...style }}
        {...rest}
      />
    </div>
  )
}
