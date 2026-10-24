import { Skeleton } from '@/components/ui/Skeleton'

// /collections/[id] blocks on a TMDB collection-detail fetch plus a couple of DB
// reads before it can render, so it gets a skeleton matching the page: the back
// button, the header frame with its slab, and the poster grid.
export default function CollectionLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading this franchise…</span>
      <div aria-hidden="true" className="space-y-6">
        <Skeleton className="h-5 w-28" />

        {/* Header frame */}
        <div className="glass-panel glass-rim" style={{ padding: 8 }}>
          <div
            className="relative flex flex-col overflow-hidden rounded-[var(--radius-row)] md:block md:min-h-[280px]"
            style={{ background: 'var(--skeleton-bg)' }}
          >
            <div className="h-[200px] md:hidden" />
            <div className="glass-slab glass-rim relative z-[1] flex gap-5 rounded-none p-5 md:m-4 md:max-w-[560px] md:rounded-[var(--radius-slab)] md:p-6">
              <Skeleton className="hidden sm:block w-20 md:w-24 aspect-[2/3] shrink-0 rounded-[var(--radius-md)]" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-1 w-full rounded-[2px]" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </div>
          </div>
        </div>

        {/* Movie grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[2/3] rounded-[var(--radius-xl)]" />
              <Skeleton className="mt-2.5 h-3.5 w-3/4" />
              <Skeleton className="mt-1.5 h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
