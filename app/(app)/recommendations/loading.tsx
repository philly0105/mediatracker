import { Skeleton } from '@/components/ui/Skeleton'
import { RecommendationFeedSkeleton } from '@/components/grid/RecommendationFeedSkeleton'

// Recommendations seeds off the library before it can suggest anything, so it
// is one of the slower routes to first paint. Mirrors the real layout: header
// with the Refresh pill, then the toolbar and rows the page itself shows while
// it loads.
export default function RecommendationsLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-6 pb-12">
      <span className="sr-only">Loading your recommendations…</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-11 w-28 rounded-[var(--radius-pill)]" />
        </div>

        <RecommendationFeedSkeleton />
      </div>
    </div>
  )
}
