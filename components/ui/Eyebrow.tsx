import React from 'react'

interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

export function Eyebrow({ children, style, ...rest }: EyebrowProps) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--eyebrow-size)',
        fontWeight: 'var(--eyebrow-weight)' as React.CSSProperties['fontWeight'],
        letterSpacing: 'var(--eyebrow-tracking)',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </p>
  )
}
