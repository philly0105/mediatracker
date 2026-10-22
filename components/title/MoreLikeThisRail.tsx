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
          reads as "this scrolls". */}
      <ul
        className="scrollbar-none"
        style={{
          listStyle: 'none',
          margin: '0 calc(var(--panel-pad, var(--space-5)) * -1)',
          padding: '0 var(--panel-pad, var(--space-5)) 4px',
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
