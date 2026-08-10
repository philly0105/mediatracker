import { Skeleton } from '@/components/ui/Skeleton'

// The dashboard fetches TMDB ("upcoming releases") plus several DB reads on the
// server, so without a loading state it would block behind a blank screen. This
// mirrors the page's layout (header, bento grid, recently-watched posters).
export default function DashboardLoading() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between pb-2">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full md:w-96" />
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 rounded-[var(--radius-2xl)]" />
        <Skeleton className="h-32 rounded-[var(--radius-2xl)]" />
        <Skeleton className="h-72 md:col-span-2 rounded-[var(--radius-2xl)]" />
      </div>

      {/* Recently watched */}
      <div className="space-y-5">
        <Skeleton className="h-7 w-44" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
