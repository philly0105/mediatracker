import React from 'react'

interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon?: React.ReactNode
}

export function StatTile({ label, value, icon, style, className, ...rest }: StatTileProps) {
  return (
    <div
      className={['glass-card', className].filter(Boolean).join(' ')}
      style={{
        padding: '18px 20px',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        ...style,
      }}
      {...rest}
    >
      <div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-widest)', fontWeight: 'var(--weight-bold)' as React.CSSProperties['fontWeight'] }}>
          {label}
        </span>
        <p style={{ margin: '4px 0 0', fontSize: 'var(--text-3xl)', fontWeight: 'var(--weight-extrabold)' as React.CSSProperties['fontWeight'], color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-tight)' }}>
          {value}
        </p>
      </div>
      {icon && (
        <div style={{ color: 'var(--text-muted)', opacity: 0.8 }}>
          {icon}
        </div>
      )}
    </div>
  )
}
