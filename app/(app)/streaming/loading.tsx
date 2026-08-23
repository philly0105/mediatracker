import { Skeleton } from '@/components/ui/Skeleton'

// Streaming picks a service, then pages TMDB for what is on it. Mirrors the
// real layout: header, the service segmented control, then the poster wall —
// which uses an auto-fill grid rather than the fixed columns
// PosterGridSkeleton assumes, so the grid is spelled out here.
export default function StreamingLoading() {
  return (
    <div className="space-y-8 pb-12 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <Skeleton className="h-11 w-full max-w-xl rounded-[var(--radius-2xl)]" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
        ))}
      </div>
    </div>
  )
}
