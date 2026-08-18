import { Skeleton } from '@/components/ui/Skeleton'

// Settings awaits auth.getUser() and a user_settings read before it renders
// anything, so navigating here used to show a blank page for the duration.
// Mirrors the real layout: header, the two-column account/sharing cards, then
// the full-width import/export section.
export default function SettingsLoading() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto md:mx-0 animate-pulse">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
              <Skeleton className="h-7 w-7 rounded-sm" />
              <Skeleton className="h-5 w-28" />
            </div>
            <Skeleton className="h-48 rounded-[var(--radius-2xl)]" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-white/[0.04]">
          <Skeleton className="h-7 w-7 rounded-sm" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-40 rounded-[var(--radius-2xl)]" />
      </div>
    </div>
  )
}
