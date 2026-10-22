import { Suspense } from 'react'
import { fetchUpcomingReleases } from '@/lib/tmdb'
import DashboardUpcomingWidget from '@/components/DashboardUpcomingWidget'
import { timeKey } from '@/components/home/greeting'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * The TMDB call used to sit in the dashboard's top-level `Promise.all`, so on a
 * cold cache the stats tiles, Continue Watching and Recently Watched all waited
 * behind an 8-second-abort network request. Owning the fetch here puts it behind
 * its own Suspense boundary: the panel paints immediately and the release
 * list streams into it when it arrives.
 */
async function UpcomingReleases({ watchlistKeys }: { watchlistKeys?: string[] }) {
  const releases = await fetchUpcomingReleases()
  return <DashboardUpcomingWidget releases={releases} watchlistKeys={watchlistKeys} today={timeKey(new Date())} />
}

function UpcomingSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading upcoming releases...</span>
      <div aria-hidden="true">
        <div className="flex items-center justify-between" style={{ marginBottom: 12, paddingLeft: 4 }}>
          <div className="space-y-2">
            <Skeleton className="h-[26px] w-32" />
            <Skeleton className="h-[18px] w-44" />
          </div>
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
        <div className="space-y-3.5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center" style={{ gap: 12 }}>
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-[51px] w-[34px] rounded-[var(--radius-xs)]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-[18px] w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardUpcoming({ watchlistKeys }: { watchlistKeys?: string[] }) {
  return (
    <Card variant="panel" as="section" aria-labelledby="coming-soon-title" style={{ flex: '1 1 340px', minWidth: 0 }}>
      <Suspense fallback={<UpcomingSkeleton />}>
        <UpcomingReleases watchlistKeys={watchlistKeys} />
      </Suspense>
    </Card>
  )
}
