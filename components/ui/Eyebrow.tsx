import React from 'react'

interface EyebrowProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

// The muted line above a title (a date, a section's context): 13/18 in plain
// case. Spatial Glass has no tracked uppercase labels anywhere.
export function Eyebrow({ children, style, ...rest }: EyebrowProps) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--eyebrow-size)',
        lineHeight: '18px',
        fontWeight: 'var(--eyebrow-weight)' as React.CSSProperties['fontWeight'],
        letterSpacing: 'var(--eyebrow-tracking)',
        color: 'var(--text-muted)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </p>
  )
}
