import { Skeleton } from '@/components/ui/Skeleton'
import { GridToolbar } from '@/components/grid/GridToolbar'
import { RECOMMENDATION_ROW_GRID, RecommendationCardSkeleton } from '@/components/grid/RecommendationCard'

/**
 * Everything under the recommendations header while the feed loads: the
 * toolbar panel (type segments and the Select pill, then the genre chips) and
 * six placeholder rows. Shared by the route's loading.tsx and the page's own
 * load state so the two paint the same shape; when they differed the rows
 * jumped up by a toolbar's height between the fallback and the client mount,
 * then back down when the real toolbar arrived.
 */
export function RecommendationFeedSkeleton() {
  return (
    <div className="space-y-6">
      <GridToolbar>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-11 w-64 max-w-full rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 w-24 rounded-[var(--radius-pill)]" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Literal widths: Tailwind only emits classes it can read. */}
          {['w-16', 'w-24', 'w-20', 'w-28', 'w-20', 'w-24'].map((w, i) => (
            <Skeleton key={i} className={`h-11 ${w} rounded-[var(--radius-pill)]`} />
          ))}
        </div>
      </GridToolbar>

      <div className={RECOMMENDATION_ROW_GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <RecommendationCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
