import { Skeleton } from '@/components/ui/Skeleton'
import { GridToolbar } from '@/components/grid/GridToolbar'
import { PosterGrid } from '@/components/grid/PosterGrid'

// Streaming picks a service, then pages TMDB for what is on it. Mirrors the
// real layout: header, the toolbar panel (service chips, then the type
// segments, sort, hide-watched and the Select pill), then the poster grid.
export default function StreamingLoading() {
  return (
    <div className="space-y-6 pb-12">
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <GridToolbar>
        <div className="flex flex-wrap items-center gap-2">
          {/* Literal widths: Tailwind only emits classes it can read. */}
          {['w-24', 'w-20', 'w-28', 'w-24', 'w-20', 'w-20', 'w-24'].map((w, i) => (
            <Skeleton key={i} className={`h-11 ${w} rounded-[var(--radius-pill)]`} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-11 w-48 rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 w-40 rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 w-36 rounded-[var(--radius-pill)]" />
          <Skeleton className="h-11 w-24 rounded-[var(--radius-pill)]" />
        </div>
      </GridToolbar>

      <PosterGrid>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
        ))}
      </PosterGrid>
    </div>
  )
}
