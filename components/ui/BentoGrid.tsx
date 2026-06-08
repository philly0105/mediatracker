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
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto ${className}`}
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
