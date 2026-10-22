import { CARD_VARIANT_CLASS } from '@/components/ui/cardVariants'
import { Skeleton } from '@/components/ui/Skeleton'

// Not a client module, so the stats route's loading skeleton can render it
// without making every prefetch of /stats download the page's JavaScript.
// The panels are plain divs with Card's panel classes for the same reason.

// The chart list rows are 18px lines on a 10px rhythm, as in StatsCharts.
function ListSkeleton() {
  return (
    <div className="space-y-2.5 min-h-[140px]">
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-4/5" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  )
}

// Mirrors StatsCharts panel for panel so nothing shifts when the real charts
// land: the same panel tier, a 26px heading line, and the same chart heights.
export function ChartsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="space-y-6"
    >
      <span className="sr-only">Loading charts...</span>
      <div aria-hidden="true" className="space-y-6">
        <div className={CARD_VARIANT_CLASS.panel}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="ml-1 h-[26px] w-48" />
            <Skeleton className="h-11 w-56 rounded-[var(--radius-md)]" />
          </div>
          <Skeleton className="mb-3 ml-1 h-4 w-40" />
          <Skeleton className="h-[200px] w-full" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className={CARD_VARIANT_CLASS.panel}>
            <Skeleton className="mb-3 ml-1 h-[26px] w-24" />
            <Skeleton className="h-[280px] w-full" />
          </div>

          <div className={CARD_VARIANT_CLASS.panel}>
            <Skeleton className="mb-3 ml-1 h-[26px] w-24" />
            <Skeleton className="h-[280px] w-full" />
          </div>
        </div>

        <div className={CARD_VARIANT_CLASS.panel}>
          <Skeleton className="mb-3 ml-1 h-[26px] w-44" />
          <ListSkeleton />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className={CARD_VARIANT_CLASS.panel}>
            <Skeleton className="mb-3 ml-1 h-[26px] w-32" />
            <ListSkeleton />
          </div>
          <div className={CARD_VARIANT_CLASS.panel}>
            <Skeleton className="mb-3 ml-1 h-[26px] w-28" />
            <ListSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
