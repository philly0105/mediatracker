import { Skeleton } from '@/components/ui/Skeleton'

// The row pieces RecommendationCard shares with the loading skeleton. Kept out
// of RecommendationCard.tsx, a client component, because the route's
// loading.tsx renders them: a client module there makes every prefetch of
// /recommendations download all of the route's JavaScript.

/** The three-up row grid: one column on phones, two from the content
 *  breakpoint, three from 1280. Exported so the page, its load state and its
 *  loading.tsx lay the rows out identically and nothing moves when the real
 *  rows replace the placeholders. */
export const RECOMMENDATION_ROW_GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

// These rows stand on the ambient, not inside a panel, so they get a dark
// base: over a warm backdrop (Sinners) the overview's secondary text otherwise
// lands just under 4.5:1. The base is the background image only, leaving
// .glass-row's fill, and its hover fade, on the colour: a gradient cannot
// transition, so folding the fill into one would snap the hover.
export const ROW_BASE = 'bg-[image:linear-gradient(rgba(9,20,27,.30),rgba(9,20,27,.30))]'

/** The same row, as placeholder blocks; shared by the page's load state and
 *  its loading.tsx so the two paint the same shape. The row's hover fill is
 *  for clickable rows, and a placeholder is not one. */
export function RecommendationCardSkeleton() {
  return (
    <div className={`glass-row flex gap-3.5 p-3 hover:bg-[var(--glass-card)] ${ROW_BASE}`}>
      <Skeleton className="h-30 w-20 shrink-0 rounded-[var(--radius-thumb)]" />
      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-6 w-12 rounded-[var(--radius-pill)]" />
        </div>
        <Skeleton className="mt-2 h-3 w-1/4" />
        <Skeleton className="mt-2 h-3 w-full" />
        <Skeleton className="mt-1.5 h-3 w-5/6" />
        <div className="mt-auto flex gap-2 pt-3">
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-pill)]" />
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-pill)]" />
        </div>
      </div>
    </div>
  )
}
