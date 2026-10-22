'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MonitorPlay, RotateCcw } from 'lucide-react'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import { useMediaModal } from '@/components/MediaModalProvider'
import { mediaToResult } from '@/lib/mediaToResult'
import SelectableOverlay from './SelectableOverlay'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PosterCard, PosterBadge } from '@/components/ui/PosterCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { revealRailItem } from '@/components/title/MoreLikeThisRail'
import { formatShortDate } from '@/components/home/format'

interface Props {
  entries: WatchEntry[]
  /**
   * Preload the first poster as the page's LCP candidate. Off by default: on
   * Home the hero backdrop is the one preloaded image, and this only takes
   * over when the hero has no art.
   */
  preloadFirst?: boolean
}

const ARROW_CLASS =
  'glass-btn flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] enabled:hover:text-[var(--text-primary)] disabled:opacity-30'

// The rail's columns are minmax(118px, 1fr): from five cards a phone-width
// panel is full and each is 118-128px wide, so the grid's 50vw would fetch
// posters three times too large. Fewer cards keep the grid's sizes, since on
// wider phones they stretch well past 128px.
const RAIL_SIZES = '(max-width: 767px) 128px, (max-width: 1024px) 33vw, 20vw'

/**
 * The reference's "Recently watched" panel: a rail of poster cards that
 * scrolls inside the panel, each with its half-star rating and the date it
 * was logged, and a Rewatch badge where that applies. No blur per card; the
 * panel is the one tier-1 surface here.
 */
export default function DashboardRecentCards({ entries, preloadFirst = false }: Props) {
  const router = useRouter()
  const { openMedia, closeMedia } = useMediaModal()

  function toResult(entry: WatchEntry): TmdbSearchResult {
    const media = entry.media!
    return mediaToResult(media)
  }

  const scrollerRef = useRef<HTMLUListElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    // A sub-pixel slack: fractional widths mean scrollLeft rarely lands exactly
    // on the maximum, which would leave the right arrow enabled at the end.
    const max = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft < max - 1)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // Fires once on observe, so the initial state comes from here rather than
    // from a setState in the effect body.
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(el)
    return () => observer.disconnect()
  }, [updateScrollState, entries.length])

  // scrollBy with no `behavior` uses the element's computed scroll-behavior, so
  // the `scroll-smooth` class applies — and the global prefers-reduced-motion
  // rule in globals.css turns it back to `auto` for anyone who asked for that.
  function scrollByCards(direction: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 260) })
  }

  return (
    <Card variant="panel" as="section" aria-labelledby="recent-title">
      <SectionHeader
        id="recent-title"
        title="Recently watched"
        sub="Your ratings, newest first"
        action={{ label: 'Library', href: '/library' }}
        actions={
          // Arrows only where there is a pointer to use them; touch has the
          // swipe, and the rail's scrollbar is hidden.
          entries.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5" style={{ marginRight: 4 }}>
              <button type="button" onClick={() => scrollByCards(-1)} disabled={!canScrollLeft} aria-label="Scroll left" className={ARROW_CLASS}>
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scrollByCards(1)} disabled={!canScrollRight} aria-label="Scroll right" className={ARROW_CLASS}>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          )
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          size="compact"
          icon={MonitorPlay}
          title="Nothing watched yet."
          hint="Log your first film or show and your stats, streak and recommendations start building from here."
          actionLabel="Start searching"
          actionHref="/?search=1"
        />
      ) : (
        // A column-flow grid: every card is the same width and the rail
        // overflows sideways inside the panel. On phones it bleeds into the
        // panel's padding so the last card is cut at the panel edge, not short of it.
        // overflow-x:auto clips the y axis too, so the rail carries 8px of
        // block padding (and 8px inline from md) cancelled by a matching
        // negative margin: the focus ring (2px + 2px offset, scaled by the
        // 1.02 lift, plus the lift's own extra height) fits and nothing
        // moves. scroll-padding matches the bleed so a focused card scrolls
        // to the rim, not under it; revealRailItem does that scroll, since
        // Chrome leaves a card that is only partly out of view where it is.
        <ul
          ref={scrollerRef}
          onScroll={updateScrollState}
          onFocus={revealRailItem}
          className="scrollbar-none grid grid-flow-col auto-cols-[minmax(118px,1fr)] gap-4 overflow-x-auto scroll-smooth -my-2 pt-2 pb-3 mx-[calc(var(--panel-pad)*-1)] px-[var(--panel-pad)] scroll-px-[var(--panel-pad)] md:-mx-2 md:px-2 md:scroll-px-2"
          style={{ listStyle: 'none' }}
        >
          {entries.map((entry, index) => (
            <li key={entry.id} style={{ minWidth: 0 }}>
              <SelectableOverlay item={toResult(entry)}>
                <PosterCard
                  title={entry.media?.title || ''}
                  year={formatShortDate(entry.watched_at)}
                  posterUrl={entry.media?.poster_url}
                  rating={entry.rating}
                  preload={preloadFirst && index === 0}
                  sizes={entries.length >= 5 ? RAIL_SIZES : undefined}
                  badges={entry.rewatch ? (
                    <PosterBadge>
                      <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
                      Rewatch
                    </PosterBadge>
                  ) : undefined}
                  onClick={() => openMedia(toResult(entry), {
                    // Both actions closed the modal here; only 'watched' refreshed,
                    // because only that changes what this row renders.
                    onChanged: (change) => {
                      if (change === 'watched') router.refresh()
                      closeMedia()
                    },
                  })}
                />
              </SelectableOverlay>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
