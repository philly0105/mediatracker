import Image from 'next/image'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

// The hero's frame and the panels, at the sizes they load into, so the page
// settles in place rather than reflowing as the server render arrives. Shared
// by the route's loading state and the hero's own Suspense fallback, which
// shows while TMDB fills in the next episodes. The hero frame is the panel
// tint without blur: a placeholder is not worth a tier-1 surface.

export function PanelSkeleton({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`card-surface ${className}`}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12, paddingLeft: 4 }}>
        <div className="space-y-2">
          <Skeleton className="h-[26px] w-36" />
          <Skeleton className="h-[18px] w-48" />
        </div>
        <Skeleton className="h-11 w-24 rounded-full" />
      </div>
      {children}
    </div>
  )
}

/**
 * The hero frame and, below it, the "Up next" and "Coming soon" panels.
 *
 * `backdrop` is the hero's art when the database already has it. The frame
 * then shows it, placed exactly as HomeHero places it, rather than a shimmer:
 * the art is the largest thing above the fold, and painting it with the rest
 * of the page instead of after the TMDB reads makes it the page's LCP as soon
 * as it arrives. HomeHero preloads the same URL at the same sizes, so React
 * sends the preload once.
 */
export function HeroSectionSkeleton({ backdrop = null }: { backdrop?: string | null } = {}) {
  return (
    <>
      <div className="card-surface" style={{ padding: 8, borderRadius: 32 }}>
        <div className="@container relative flex flex-col overflow-hidden lg:min-h-[520px] lg:flex-row" style={{ borderRadius: 24 }}>
          {backdrop ? (
            <div className="relative h-[220px] w-full md:h-[320px] lg:absolute lg:inset-0 lg:h-auto">
              <Image
                src={backdrop}
                alt=""
                aria-hidden="true"
                fill
                preload
                fetchPriority="high"
                sizes="(max-width: 1023px) 100vw, 1200px"
                className="object-cover object-[64%_18%] md:object-[50%_18%]"
              />
            </div>
          ) : (
            <Skeleton className="h-[220px] w-full rounded-none md:h-[320px] lg:hidden" />
          )}
          <div className="glass-row relative flex flex-col rounded-none p-5 md:p-7 lg:m-4 lg:w-[min(480px,60cqw-32px)] lg:rounded-[var(--radius-slab)]">
            <Skeleton className="h-[18px] w-40" />
            <Skeleton className="mt-6 h-20 w-72 max-w-full" />
            <Skeleton className="mt-3.5 h-5 w-3/4" />
            <div className="mt-6 flex items-center gap-3.5">
              <Skeleton className="h-[52px] w-[52px] rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-[18px] w-56" />
              </div>
            </div>
            <Skeleton className="mt-4 h-[92px] w-full rounded-[var(--radius-lg)]" />
            <div className="mt-auto flex gap-2 pt-5">
              <Skeleton className="h-12 w-44 rounded-full" />
              <Skeleton className="h-12 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-stretch gap-6">
        <PanelSkeleton className="flex-[1.7_1_520px]">
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-[110px] w-full rounded-[var(--radius-row)]" />
            ))}
          </div>
        </PanelSkeleton>
        <PanelSkeleton className="flex-[1_1_340px]">
          <div className="space-y-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[51px] w-full" />
            ))}
          </div>
        </PanelSkeleton>
      </div>
    </>
  )
}
