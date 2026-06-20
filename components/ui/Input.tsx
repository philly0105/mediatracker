import React, { useState } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  icon?: React.ReactNode
  multiline?: boolean
  rows?: number
}

export function Input({
  icon,
  multiline = false,
  rows = 4,
  value,
  onChange,
  placeholder,
  type = 'text',
  style,
  ...rest
}: InputProps) {
  const [focus, setFocus] = useState(false)

  const base = {
    width: '100%',
    boxSizing: 'border-box' as React.CSSProperties['boxSizing'],
    fontFamily: 'var(--font-sans)',
    fontSize: 'var(--text-base)',
    fontWeight: 'var(--weight-medium)',
    color: 'var(--text-primary)',
    background: 'var(--surface-input)',
    border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--border-default)'}`,
    outline: 'none',
    transition: 'border-color var(--dur-fast) var(--ease-standard)',
    backdropFilter: 'blur(var(--blur-md))',
  }

  if (multiline) {
    return (
      <textarea
        rows={rows}
        value={value}
        onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...base, resize: 'none' as React.CSSProperties['resize'], borderRadius: 'var(--radius-lg)', padding: '12px 18px', ...style }}
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
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...base, borderRadius: 'var(--radius-sm)', padding: icon ? '11px 16px 11px 42px' : '11px 16px', ...style }}
        {...rest}
      />
    </div>
  )
}
