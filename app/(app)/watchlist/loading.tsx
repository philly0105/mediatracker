import { Skeleton } from '@/components/ui/Skeleton'
import { GridToolbar } from '@/components/grid/GridToolbar'
import { PosterGrid } from '@/components/grid/PosterGrid'

// Mirrors the real layout: header, the toolbar panel (priority segments, then
// Pick for me and the Select pill; search and the filters under them), and the
// poster grid of the bucket that opens first.
export default function WatchlistLoading() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <div className="mb-6 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        <GridToolbar>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-11 w-96 max-w-full rounded-[var(--radius-md)]" />
            <div className="flex items-center gap-3 sm:ml-auto">
              <Skeleton className="h-11 w-36 rounded-[var(--radius-pill)]" />
              <Skeleton className="h-11 w-24 rounded-[var(--radius-pill)]" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-11 min-w-[200px] flex-1 rounded-[var(--radius-md)]" />
            <Skeleton className="h-11 w-56 rounded-[var(--radius-md)]" />
            <Skeleton className="h-11 w-36 rounded-[var(--radius-md)]" />
            <Skeleton className="h-11 w-36 rounded-[var(--radius-md)]" />
          </div>
        </GridToolbar>
      </div>

      <PosterGrid>
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
        ))}
      </PosterGrid>
    </div>
  )
}
