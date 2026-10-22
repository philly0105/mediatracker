'use client'
import React from 'react'
import { PosterCard } from '@/components/ui/PosterCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import type { TmdbSearchResult } from '@/types'

export interface MoreLikeThisRailProps {
  /** Already filtered to items with a poster; the rail renders nothing when empty. */
  items: TmdbSearchResult[]
  /** Opens the item: the page and the modal both hand this to `openMedia`. */
  onSelect: (item: TmdbSearchResult) => void
  /** The section heading; defaults to "More like this". */
  title?: string
  /** The muted line under the heading, e.g. "Because you watched Severance". */
  sub?: React.ReactNode
  /** Trailing "See all" link in the header, as `SectionHeader` takes it. */
  action?: { label: string; href: string }
}

/**
 * Brings the rail item that just took keyboard focus to the rim. Chrome
 * scrolls a Tab-focused element into view only when it is wholly out of
 * sight: one cut by the rim stays cut, and `scrollIntoView({ inline:
 * 'nearest' })` leaves it there too. For a rail's `onFocus`; the item lands
 * inside the rail's inline padding, which is the bleed the focus ring needs.
 * `scrollBy` with no `behavior` follows the rail's own scroll-behavior.
 * Keyboard focus only: a click or tap focuses too, and scrolling the rail
 * under a pressed pointer moves the item away before the click lands.
 * Shared by CastStrip and the home page's DashboardRecentCards.
 */
export function revealRailItem(e: React.FocusEvent<HTMLElement>) {
  if (!(e.target as HTMLElement).matches(':focus-visible')) return
  const rail = e.currentTarget
  const item = (e.target as HTMLElement).closest('li')
  if (!item) return
  const r = item.getBoundingClientRect()
  const p = rail.getBoundingClientRect()
  const cs = getComputedStyle(rail)
  const left = p.left + (parseFloat(cs.paddingLeft) || 0)
  const right = p.right - (parseFloat(cs.paddingRight) || 0)
  // A pixel of slack: fractional widths would otherwise nudge every card.
  if (r.right > right + 1) rail.scrollBy({ left: r.right - right })
  else if (r.left < left - 1) rail.scrollBy({ left: r.left - left })
}

/**
 * The "More like this" poster rail: a scrolling row of `PosterCard`s under a
 * section header. Nothing in it blurs; it sits inside whatever panel the
 * caller puts it in. Renders nothing when there is nothing to recommend.
 */
export function MoreLikeThisRail({ items, onSelect, title = 'More like this', sub, action }: MoreLikeThisRailProps) {
  if (items.length === 0) return null

  return (
    <div>
      <SectionHeader title={title} sub={sub} action={action} />
      {/* The reference rail: column-flow grid, posters at least 118px wide,
          scrolling sideways with the scrollbar hidden. It bleeds through the
          panel's padding (--panel-pad, or --space-5 outside a Card panel) so
          the last poster is cut at the rim, not short of it, which is what
          reads as "this scrolls". The 8px of block padding, cancelled by the
          negative margin, is room for the focus ring on a lifted card (the
          2px ring and offset, scaled, plus the 1.02 lift's extra height):
          overflow-x:auto clips the y axis too. */}
      <ul
        className="scrollbar-none"
        onFocus={revealRailItem}
        style={{
          listStyle: 'none',
          margin: '-8px calc(var(--panel-pad, var(--space-5)) * -1)',
          padding: '8px var(--panel-pad, var(--space-5)) 12px',
          scrollPaddingInline: 'var(--panel-pad, var(--space-5))',
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(118px, 1fr)',
          gap: 16,
          overflowX: 'auto',
        }}
      >
        {items.map((item) => (
          <li key={`${item.type}-${item.tmdb_id}`} style={{ minWidth: 0 }}>
            <PosterCard
              title={item.title}
              year={item.release_year ?? undefined}
              posterUrl={item.poster_url}
              onClick={() => onSelect(item)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
