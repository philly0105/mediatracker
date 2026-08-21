import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'

// Without this boundary, clicking a person in the search overlay froze on the
// old view until Vercel returned the segment's RSC payload — People clicks
// navigate, unlike Titles clicks which open a modal in place. The router shows
// this instantly on navigation, so the click responds immediately. Mirrors the
// page's own shell (back link, profile card, credit grid) for a seamless swap.
export default function PersonLoading() {
  return (
    <div className="space-y-10 pb-12 animate-pulse">
      <Skeleton className="h-5 w-16" />
      <Card className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6">
        <Skeleton className="w-24 h-24 md:w-32 md:h-32 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 pt-2 w-full">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </div>
  )
}
