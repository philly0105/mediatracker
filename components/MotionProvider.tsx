'use client'
import { MotionConfig } from 'framer-motion'

// Makes every framer-motion animation in the tree respect the OS-level
// "reduce motion" preference. CSS transitions are handled separately in
// globals.css — MotionConfig cannot reach those.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
