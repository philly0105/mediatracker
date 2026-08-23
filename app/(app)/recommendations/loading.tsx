import { Skeleton } from '@/components/ui/Skeleton'

// Recommendations seeds off the library before it can suggest anything, so it
// is one of the slower routes to first paint. Mirrors the real layout: header
// with the refresh button, then the three-column suggestion cards.
export default function RecommendationsLoading() {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[var(--radius-lg)]" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 rounded-[var(--radius-2xl)]"
            style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}
          >
            <Skeleton className="w-20 h-30 shrink-0 rounded-[var(--radius-xl)]" />
            <div className="flex-1 space-y-3 py-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-8 w-full rounded-[var(--radius-lg)]" />
                <Skeleton className="h-8 w-full rounded-[var(--radius-lg)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
