import { Skeleton } from '@/components/ui/Skeleton'

// The dashboard-shaped group fallback was wrong here too. Mirrors the real
// layout: header, the filter row, then the three priority buckets.
export default function WatchlistLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-44 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-9 w-36 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-9 w-36 rounded-[var(--radius-lg)]" />
        <Skeleton className="h-9 flex-1 min-w-48 rounded-[var(--radius-lg)]" />
      </div>

      {/* Must Watch, Want to Watch, Someday. */}
      <div className="space-y-12">
        {[0, 1, 2].map(bucket => (
          <div key={bucket} className="space-y-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-sm" />
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
