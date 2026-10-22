import { CARD_VARIANT_CLASS } from '@/components/ui/cardVariants'
import { Skeleton } from '@/components/ui/Skeleton'

// The calendar used to fetch client-side and render a skeleton while it waited.
// Now that the page fetches on the server, the skeleton belongs here — without
// it, navigating to /calendar blocks on TMDB behind a blank screen. It mirrors
// the real layout: header with the type filter, then a glass panel per month
// of date-stack rows.
export default function CalendarLoading() {
  return (
    <div className="pb-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-11 w-64 rounded-[var(--radius-md)]" />
      </div>

      <div className="space-y-6">
        {[6, 4].map((rows, i) => (
          <div key={i} className={CARD_VARIANT_CLASS.panel}>
            <Skeleton className="mb-4 ml-1 h-6 w-40" />
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {Array.from({ length: rows }, (_, j) => (
                // A placeholder is not clickable, so it keeps the row's resting fill under the pointer.
                <div key={j} className="glass-row hover:bg-[var(--glass-card)] flex items-center gap-3 p-3">
                  <div className="flex w-10 shrink-0 flex-col items-center gap-1.5">
                    <Skeleton className="h-3 w-7" />
                    <Skeleton className="h-5 w-6" />
                  </div>
                  <Skeleton className="h-[51px] w-[34px] shrink-0 rounded-[var(--radius-xs)]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
