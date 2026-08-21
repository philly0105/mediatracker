'use client'

import React from 'react'
import { motion } from 'framer-motion'

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative group/bento ${className}`}
    >
      {children}
    </motion.div>
  )
}
