import { CARD_VARIANT_CLASS } from '@/components/ui/cardVariants'
import { Skeleton } from '@/components/ui/Skeleton'

// Without this boundary, clicking a person in the search overlay froze on the
// old view until Vercel returned the segment's RSC payload — People clicks
// navigate, unlike Titles clicks which open a modal in place. The router shows
// this instantly on navigation, so the click responds immediately. Mirrors the
// page's own shell (back pill, header panel, poster grid) for a seamless swap.
export default function PersonLoading() {
  return (
    <div role="status" aria-busy="true" className="space-y-8 pb-12">
      <span className="sr-only">Loading this filmography…</span>
      <div aria-hidden="true" className="space-y-8">
        <Skeleton className="h-11 w-24 rounded-[var(--radius-pill)]" />
        {/* page.tsx's header is `Card variant="panel"`: the rim, and 14px
            of padding under 760px rather than a flat 20. */}
        <div className={`${CARD_VARIANT_CLASS.panel} flex flex-col items-center gap-5 md:flex-row`}>
          <Skeleton className="h-24 w-24 shrink-0 rounded-full md:h-32 md:w-32" />
          <div className="w-full flex-1 space-y-3 max-md:flex max-md:flex-col max-md:items-center">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          {/* The same grid string as page.tsx's GRID; keep the two in sync. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
