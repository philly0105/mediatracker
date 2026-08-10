import { Skeleton } from '@/components/ui/Skeleton'

// Stats runs two Supabase reads and then aggregates them, so navigating here
// used to sit on a blank page. Mirrors the real layout: header, four tiles,
// then the chart stack.
export default function StatsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-2xl)]" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} className="h-64 rounded-[var(--radius-2xl)]" />
        ))}
      </div>
    </div>
  )
}
