import React from 'react'

/**
 * The glass toolbar under a library-type page's header (spec §5.6): one tier-1
 * panel holding that page's controls, so they stop floating loose on the
 * ambient and the grid below reads as its own layer. Each child is a row; the
 * pages lay their rows out as wrapping flex lines. One panel per page, never
 * per item, so the blur budget is untouched.
 */
export function GridToolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={['glass-panel glass-rim flex flex-col gap-3 p-3 md:px-4', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
