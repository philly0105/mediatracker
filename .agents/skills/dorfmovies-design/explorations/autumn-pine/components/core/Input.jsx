import React from 'react'

/**
 * DorfMovies Input — pill text field on a translucent fill. Border brightens
 * to 30% white on focus. Supports an optional leading Lucide icon and a
 * `multiline` (textarea) mode which switches to a rounded-2xl shape.
 */
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
}) {
  const [focus, setFocus] = React.useState(false)

  const base = {
    width: '100%',
    boxSizing: 'border-box',
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
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...base, resize: 'none', borderRadius: 'var(--radius-lg)', padding: '12px 18px', ...style }}
        {...rest}
      />
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {icon && (
        <i
          data-lucide={icon}
          style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)', pointerEvents: 'none' }}
        />
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ ...base, borderRadius: 'var(--radius-sm)', padding: icon ? '11px 16px 11px 42px' : '11px 16px', ...style }}
        {...rest}
      />
    </div>
  )
}
