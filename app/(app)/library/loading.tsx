import { Skeleton } from '@/components/ui/Skeleton'

// Without this the fallback was app/(app)/loading.tsx, which is shaped like the
// dashboard — a bento grid and a poster row the Library never renders. Mirrors
// the real layout: header, the glass toolbar, then the detail rows. The
// Skeleton carries its own shimmer, so nothing here pulses on top of it.
export default function LibraryLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      {/* The toolbar panel: type control, search well, sort, filters, the
          view toggle. The panel itself is the real one, so the blur is already
          in place when the controls land in it. */}
      <div className="glass-panel glass-rim p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-11 w-56 rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 basis-full sm:basis-auto sm:flex-1 sm:min-w-[220px] sm:max-w-sm rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 w-44 rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 w-28 rounded-[var(--radius-pill)]" />
          <Skeleton className="h-11 w-24 rounded-[var(--radius-md)]" />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="glass-row hover:bg-[var(--glass-card)] flex gap-4 p-3">
            <Skeleton className="w-16 h-24 shrink-0 rounded-[var(--radius-md)]" />
            <div className="flex-1 space-y-3 py-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
