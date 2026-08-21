import { Suspense } from 'react'
import { Calendar } from 'lucide-react'
import { fetchUpcomingReleases } from '@/lib/tmdb'
import DashboardUpcomingWidget from '@/components/DashboardUpcomingWidget'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * The TMDB call used to sit in the dashboard's top-level `Promise.all`, so on a
 * cold cache the stats tiles, Continue Watching and Recently Watched all waited
 * behind an 8-second-abort network request. Owning the fetch here puts it behind
 * its own Suspense boundary: the bento grid paints immediately and the release
 * calendar streams into this slot when it arrives.
 */
async function UpcomingReleases() {
  const releases = await fetchUpcomingReleases()
  return <DashboardUpcomingWidget releases={releases} />
}

function UpcomingSkeleton() {
  return (
    <div className="flex flex-col h-full p-6 animate-pulse">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-lg border border-[var(--accent)]/30 flex items-center justify-center bg-[var(--accent)]/10 text-[var(--accent)]">
          <Calendar className="w-4 h-4" />
        </div>
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-16 w-11 rounded-[var(--radius-md)]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardUpcoming() {
  return (
    <Suspense fallback={<UpcomingSkeleton />}>
      <UpcomingReleases />
    </Suspense>
  )
}
