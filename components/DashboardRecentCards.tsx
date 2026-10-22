'use client'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, MonitorPlay, RotateCcw } from 'lucide-react'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import { useMediaModal } from '@/components/MediaModalProvider'
import { mediaToResult } from '@/lib/mediaToResult'
import SelectableOverlay from './SelectableOverlay'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PosterCard, PosterBadge } from '@/components/ui/PosterCard'
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

// SectionHeader's trailing link, for a header that also carries the arrows.
const LINK_CLASS =
  'inline-flex items-center gap-0.5 min-h-11 pl-3 pr-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--white)] hover:bg-[var(--glass-fill-hover)] transition-colors'
const ARROW_CLASS =
  'glass-btn flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] enabled:hover:text-[var(--text-primary)] disabled:opacity-30'

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
      <div className="flex items-center justify-between" style={{ gap: 16, marginBottom: 12, paddingLeft: 4 }}>
        <div style={{ minWidth: 0 }}>
          <h2
            id="recent-title"
            style={{
              margin: 0, fontSize: 'var(--text-xl)', lineHeight: '26px',
              fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
              letterSpacing: 'var(--tracking-snug)', color: 'var(--text-primary)',
            }}
          >
            Recently watched
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)' }}>
            Your ratings, newest first
          </p>
        </div>
        <div className="flex items-center gap-1" style={{ flex: 'none' }}>
          {/* Arrows only where there is a pointer to use them; touch has the
              swipe, and the rail's scrollbar is hidden. */}
          {entries.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5" style={{ marginRight: 4 }}>
              <button type="button" onClick={() => scrollByCards(-1)} disabled={!canScrollLeft} aria-label="Scroll left" className={ARROW_CLASS}>
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scrollByCards(1)} disabled={!canScrollRight} aria-label="Scroll right" className={ARROW_CLASS}>
                <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          )}
          <Link
            href="/library"
            className={LINK_CLASS}
            style={{ fontSize: 'var(--text-base)', lineHeight: '20px', fontWeight: 'var(--weight-medium)' as CSSProperties['fontWeight'], letterSpacing: 'var(--tracking-text)' }}
          >
            Library
            <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        </div>
      </div>

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
        <ul
          ref={scrollerRef}
          onScroll={updateScrollState}
          className="scrollbar-none grid grid-flow-col auto-cols-[minmax(118px,1fr)] gap-4 overflow-x-auto scroll-smooth -mx-3.5 px-3.5 pb-1 md:mx-0 md:px-0"
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
