import React from 'react'

/**
 * A single placeholder block. Uses --zinc-800 rather than --zinc-900: the
 * latter sits within one or two steps of both the page and the card surface,
 * so a skeleton drawn in it is nearly invisible on the very screens it exists
 * to reassure people about.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-[var(--zinc-800)] rounded-[var(--radius-sm)] ${className}`} />
}

/**
 * The shape most routes load into: a title, then a grid of 2:3 posters.
 * Wrapped in `animate-pulse` so the whole group breathes together rather than
 * each tile pulsing on its own schedule.
 */
export function PosterGridSkeleton({
  count = 10,
  showHeader = true,
}: {
  count?: number
  showHeader?: boolean
}) {
  return (
    <div className="animate-pulse space-y-8">
      {showHeader && (
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-56" />
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
        ))}
      </div>
    </div>
  )
}

/** A stack of horizontal rows — lists, seasons, calendar entries. */
export function RowListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 rounded-[var(--radius-lg)]"
            style={{
              background: 'var(--glass-card)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <Skeleton className="w-16 h-24 shrink-0 rounded-[var(--radius-xl)]" />
            <div className="flex-1 space-y-3 py-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
