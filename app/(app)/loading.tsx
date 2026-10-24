import { Skeleton } from '@/components/ui/Skeleton'
import { HeroSectionSkeleton, PanelSkeleton } from '@/components/home/HomeSkeletons'

export default function DashboardLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <span className="sr-only">Loading your dashboard…</span>
      <div aria-hidden="true" className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between" style={{ padding: '4px 0 0 4px' }}>
          <div className="space-y-2">
            <Skeleton className="h-[18px] w-44" />
            <Skeleton className="h-9 w-72 max-w-full" />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full" />
          </div>
        </div>

        {/* Hero, Up next + Coming soon */}
        <HeroSectionSkeleton />

        {/* Recently watched */}
        <PanelSkeleton>
          <div className="grid grid-flow-col auto-cols-[minmax(118px,1fr)] gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
            ))}
          </div>
        </PanelSkeleton>

        {/* Stats + Because you watched */}
        <div className="flex flex-wrap items-stretch gap-6">
          <PanelSkeleton className="flex-[1.7_1_520px]">
            <Skeleton className="h-[200px] w-full" />
          </PanelSkeleton>
          <div className="card-surface flex-[1_1_340px]" style={{ padding: 8, borderRadius: 'var(--radius-2xl)' }}>
            <Skeleton className="h-[268px] w-full rounded-[20px]" />
          </div>
        </div>
      </div>
    </div>
  )
}
