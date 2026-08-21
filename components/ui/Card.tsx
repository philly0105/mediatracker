'use client'
import React from 'react'
import { activatableProps } from './activatable'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  onClick?: () => void
}

// The hover treatment is `.card-interactive` in globals.css rather than a
// `useState(hover)` inline style: no render per pointer move, keyboard focus
// gets the same affordance, and reduced-motion can reach the lift.
export function Card({ children, onClick, style, className, ...rest }: CardProps) {
  return (
    <div
      onClick={onClick}
      // Spread before `rest` so a caller can still supply its own aria-label.
      {...activatableProps(onClick, rest['aria-label'])}
      className={['card-surface', onClick && 'card-interactive', className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </div>
  )
}
