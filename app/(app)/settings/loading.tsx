import { CARD_VARIANT_CLASS } from '@/components/ui/cardVariants'
import { Skeleton } from '@/components/ui/Skeleton'

// Settings awaits the session and a user_settings read before it renders
// anything, so navigating here used to show a blank page for the duration.
// Mirrors the real layout at its real heights so nothing jumps when the page
// swaps in: header, then the 720px column of glass panels (the password form
// with its labels, the two sharing rows with the first one's URL line, the
// export row and the import row with its column guide, mode toggle and drop
// zone), each with its icon circle and title.
function PanelHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 mb-5">
      <Skeleton className="h-9 w-9 rounded-full" />
      <Skeleton className="h-5 w-28" />
    </div>
  )
}

// A 13/18 label over a 44px input.
function FieldSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-28 ml-1 mb-2.5" />
      <Skeleton className="h-11 rounded-[var(--radius-md)]" />
    </div>
  )
}

// A ShareToggle row: the label and the 44px switch, then the URL input and
// Copy button once sharing is on. The row hover is for clickable rows.
function ShareRowSkeleton({ withUrl = false }: { withUrl?: boolean }) {
  return (
    <div className="glass-row hover:bg-[var(--glass-card)] flex flex-col gap-3" style={{ padding: '12px 16px' }}>
      <div className="flex items-center justify-between min-h-11">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[26px] w-24 rounded-full" />
      </div>
      {withUrl && (
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-md)]" />
          <Skeleton className="h-11 w-20 rounded-full" />
        </div>
      )}
    </div>
  )
}

export default function SettingsLoading() {
  return (
    <div className="max-w-[var(--content-narrow)] mx-auto md:mx-0">
      <div className="space-y-3 mb-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="space-y-6">
        <div className={CARD_VARIANT_CLASS.panel}>
          <PanelHeaderSkeleton />
          <Skeleton className="h-5 w-40 mb-5" />
          <div className="space-y-3">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <Skeleton className="h-11 mt-4 rounded-full" />
        </div>

        <div className={CARD_VARIANT_CLASS.panel}>
          <PanelHeaderSkeleton />
          <div className="space-y-1.5 mb-5">
            <Skeleton className="h-3 w-full max-w-xl" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <div className="space-y-3">
            <ShareRowSkeleton withUrl />
            <ShareRowSkeleton />
          </div>
        </div>

        <div className={CARD_VARIANT_CLASS.panel}>
          <PanelHeaderSkeleton />
          <div className="space-y-3">
            <div className="glass-row hover:bg-[var(--glass-card)] flex items-start justify-between gap-4" style={{ padding: 16 }}>
              <div className="space-y-2 py-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-80 max-w-full" />
              </div>
              <Skeleton className="h-11 w-32 rounded-full" />
            </div>
            <div className="glass-row hover:bg-[var(--glass-card)] space-y-5" style={{ padding: 16 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 py-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-80 max-w-full" />
                </div>
                <Skeleton className="h-11 w-40 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {Array.from({ length: 7 }, (_, i) => (
                    <Skeleton key={i} className="h-3 w-56 max-w-full" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-11 w-60 max-w-full rounded-[var(--radius-md)]" />
              <Skeleton className="h-28 rounded-[var(--radius-md)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
