import { Skeleton } from '@/components/ui/Skeleton'

// Franchises reads the user's watch entries and then renders a popular-collections
// feed on top, so the route blocks for long enough to be worth a skeleton. The
// shapes match the page: header, a poster grid with captions, then the
// backdrop-shaped popular grid.
export default function CollectionsLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-10">
      <span className="sr-only">Loading your franchises…</span>
      <div aria-hidden="true" className="space-y-10">
        <div className="space-y-3 mb-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-64" />
        </div>

        <section>
          <Skeleton className="h-6 w-44 mb-3 ml-1" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i}>
                <Skeleton className="aspect-[2/3] rounded-[var(--radius-xl)]" />
                <Skeleton className="mt-2.5 h-3.5 w-3/4" />
                <Skeleton className="mt-1.5 h-3 w-1/3" />
              </div>
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-6 w-48 mb-3 ml-1" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="aspect-video rounded-[var(--radius-lg)]" />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
