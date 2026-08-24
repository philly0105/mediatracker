'use client'

import React from 'react'

export function BentoGrid({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const hasGridCols = className.split(' ').some(c => c.includes('grid-cols-'))
  return (
    <div
      // No max-w here: the layout already wraps every route in
      // max-w-[var(--content-max)], which is the same 1280px.
      className={`grid gap-4 ${!hasGridCols ? 'grid-cols-1 md:grid-cols-4' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function BentoGridItem({
  className = '',
  children,
  delay = 0,
}: {
  className?: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <div
      style={delay ? { animationDelay: `${delay}s` } : undefined}
      className={`motion-fade-up relative group/bento ${className}`}
    >
      {children}
    </div>
  )
}
