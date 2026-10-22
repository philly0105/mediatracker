import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartsSkeleton } from '@/components/DeferredStatsCharts'

// Stats runs two Supabase reads and then aggregates them, so navigating here
// used to sit on a blank page. Mirrors the real layout: header, the totals
// panel of seven tiles, then the same chart skeleton the deferred charts use.
export default function StatsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Card variant="panel">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 xl:grid-cols-7">
          {[0, 1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-[34px] w-16" />
              <Skeleton className="h-[18px] w-20" />
            </div>
          ))}
        </div>
      </Card>

      <ChartsSkeleton />
    </div>
  )
}
