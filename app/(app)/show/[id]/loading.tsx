import { Skeleton } from '@/components/ui/Skeleton'

// The page is a client component that fetches on mount, so navigating to a show
// showed the previous route until its JS had loaded *and* its first request had
// come back. This paints the moment the router starts the navigation. It mirrors
// the page's own in-component skeleton, so the two swap without a jump.
export default function ShowLoading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      <Skeleton className="h-5 w-16" />
      <div className="flex gap-4">
        <Skeleton className="w-32 h-48 rounded-[var(--radius-xl)]" />
        <div className="flex-1 space-y-3 py-1">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
