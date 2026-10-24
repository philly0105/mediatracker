/**
 * A single placeholder block: the skeleton fill with a translucent band that
 * sweeps across it. The band is a child moved with `transform`, so the sweep
 * composites rather than repainting each block every frame. Callers pass the
 * radius of the thing the block stands in for; the control radius is the
 * default. The global reduced-motion rule collapses the animation to a single
 * instant run, after which the band returns to where it started, off the left
 * edge, so there is no sweep.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  // Tailwind orders utilities for the same property by name, not by their
  // place in the class list, so a default radius sitting in the list would
  // beat most of the radii callers pass. It only goes in when they pass none.
  const radius = /(^|\s)rounded(-|\s|$)/.test(className) ? '' : 'rounded-[var(--radius-sm)]'
  return (
    <div
      aria-hidden="true"
      className={['relative overflow-hidden bg-[var(--skeleton-bg)]', radius, className].filter(Boolean).join(' ')}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, var(--skeleton-shimmer), transparent)',
          // The band composites over the block's own fill, so at full strength
          // its peak would read as about .15 white. Dimmed, it lands on the .10
          // the shimmer token names.
          opacity: 0.43,
          transform: 'translateX(-100%)',
          animation: 'dorf-shimmer 1.6s var(--ease-standard) infinite',
        }}
      />
    </div>
  )
}

/**
 * The shape most routes load into: a title, then a grid of 2:3 posters at the
 * poster radius.
 */
export function PosterGridSkeleton({
  count = 10,
  showHeader = true,
}: {
  count?: number
  showHeader?: boolean
}) {
  return (
    <div className="space-y-8">
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
