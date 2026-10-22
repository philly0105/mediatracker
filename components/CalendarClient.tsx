'use client'
import Image from 'next/image'
import React, { useState } from 'react'
import { Film, Tv, Clock, Bell, Bookmark, LayoutGrid } from 'lucide-react'
import type { TmdbSearchResult } from '@/types'
import SelectableOverlay from '@/components/SelectableOverlay'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { DateStack } from '@/components/ui/DateStack'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/SegmentedControl'
import { activatableProps } from '@/components/ui/activatable'
import { useMediaModal } from '@/components/MediaModalProvider'

interface UpcomingRelease {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  poster_url: string | null
  full_release_date: string
  priority: string
  overview: string
  release_year: number | null
  genres?: string[]
  vote_average?: number
  followed?: boolean
  episode_label?: string
  /** Already on the watchlist: the row's bookmark fills in accent. */
  onWatchlist?: boolean
}

type Filter = 'all' | 'movie' | 'show'

type Props = {
  releases: UpcomingRelease[]
}

const FILTER_OPTIONS: SegmentedControlOption<Filter>[] = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'show', label: 'TV Shows', icon: Tv },
]

// Local midnight rather than `new Date(string)`: a bare YYYY-MM-DD parses as
// UTC and lands a day early west of Greenwich (see lib/formatDate).
function parseDay(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** The row's countdown: "Today", "Tomorrow", or "in N days". */
export function countdownLabel(date: string, today: Date) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const days = Math.round((parseDay(date).getTime() - start.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `in ${days} days`
}

const POSTER_STYLE = {
  width: 34,
  height: 51,
  flex: 'none',
  objectFit: 'cover',
  borderRadius: 'var(--radius-xs)',
  boxShadow: 'var(--shadow-sm)',
} as const

export default function CalendarClient({ releases }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const { openMedia } = useMediaModal()

  const filtered = releases.filter(r => filter === 'all' || r.type === filter)

  // Group by month
  const groupedReleases: Record<string, UpcomingRelease[]> = {}
  filtered.forEach((release) => {
    const d = new Date(release.full_release_date + 'T12:00:00')
    const monthYear = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    if (!groupedReleases[monthYear]) groupedReleases[monthYear] = []
    groupedReleases[monthYear].push(release)
  })

  // Read once per render so every row counts from the same day.
  const today = new Date()

  // One control, two slots: beside the Select button in the header from lg
  // up, and on its own row under the header below that. Side by side, the
  // pair overruns a 390px viewport ("TV Shows" breaks in half) and at the md
  // breakpoint, where the H1 grows to 28px, wraps the title onto two lines.
  // Only one is displayed at a time, so only one is in the accessibility tree.
  const filterControl = (
    <SegmentedControl
      options={FILTER_OPTIONS}
      value={filter}
      onChange={setFilter}
      label="Release type"
      size="sm"
    />
  )

  return (
    <div className="pb-12">
      <PageHeader
        eyebrow="Next three months"
        title="Upcoming Releases"
        sub="Premieres and release dates for the movies and shows you follow."
        selectable
        action={<div className="hidden lg:block">{filterControl}</div>}
      />
      <div className="mb-6 lg:hidden">{filterControl}</div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="Nothing scheduled here"
          hint={filter === 'all'
            ? 'Follow a few shows and their premieres and release dates will start appearing on this timeline.'
            : 'Nothing in this category over the next three months. Try another filter, or check back later.'}
          actionLabel={filter === 'all' ? 'Browse your library' : undefined}
          actionHref={filter === 'all' ? '/library' : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedReleases).map(([monthYear, items]) => {
            const headingId = `calendar-${monthYear.replace(/\s+/g, '-').toLowerCase()}`
            return (
              <Card key={monthYear} as="section" variant="panel" aria-labelledby={headingId}>
                <SectionHeader id={headingId} title={monthYear} />
                {/* Two columns from lg: a 34px poster row is mostly air at full
                    width, and the agenda runs to forty rows over three months. */}
                <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {items.map((item) => {
                    const media = item as unknown as TmdbSearchResult
                    const open = () => openMedia(media, { priority: 'must_watch' })
                    const day = parseDay(item.full_release_date)
                    const TypeIcon = item.type === 'show' ? Tv : Film
                    // The row is a button named by aria-label, so nothing
                    // inside it is announced: the type icon and the bookmark
                    // state have to travel in the name.
                    const name = [
                      item.title,
                      item.type === 'show' ? 'TV show' : 'movie',
                      ...(item.onWatchlist ? ['on your watchlist'] : []),
                    ].join(', ')
                    return (
                      <li key={`${item.tmdb_id}-${item.full_release_date}`} className="min-w-0">
                        {/* The select chip sits over the poster thumb, not the
                            corner, where it would cover the month: 12px padding
                            + 40px date stack + 12px gap puts the 34px thumb at
                            64, so the 36px chip starts at 63. */}
                        <SelectableOverlay item={media} chipClassName="left-[63px] top-1/2 -translate-y-1/2">
                          <div
                            onClick={open}
                            {...activatableProps(open, name)}
                            className="glass-row flex cursor-pointer items-center gap-3 p-3"
                          >
                            <DateStack date={item.full_release_date} />
                            {item.poster_url ? (
                              <Image
                                src={item.poster_url}
                                alt=""
                                aria-hidden="true"
                                width={34}
                                height={51}
                                style={POSTER_STYLE}
                              />
                            ) : (
                              <div
                                aria-hidden="true"
                                className="glass-inset flex items-center justify-center text-[var(--text-muted)]"
                                style={{ ...POSTER_STYLE, boxShadow: 'var(--shadow-well)' }}
                              >
                                <TypeIcon size={14} strokeWidth={1.8} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              {/* Below sm the episode badge drops under the
                                  title when the two don't fit: beside it,
                                  "Slow Horses" was truncating at 390. */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
                                <p
                                  className="truncate"
                                  style={{
                                    margin: 0,
                                    fontSize: 'var(--text-base)',
                                    lineHeight: '18px',
                                    fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  {item.title}
                                </p>
                                {item.followed && (
                                  <Badge tone="accent" style={{ flex: 'none' }}>
                                    <Bell size={12} strokeWidth={1.8} aria-hidden="true" />
                                    {item.episode_label ?? 'Next Episode'}
                                  </Badge>
                                )}
                              </div>
                              <p
                                className="tabular flex items-center gap-1.5 truncate"
                                style={{ margin: '2px 0 0', fontSize: 'var(--text-xs)', lineHeight: '16px', color: 'var(--text-muted)' }}
                              >
                                <TypeIcon size={14} strokeWidth={1.8} aria-hidden="true" style={{ flex: 'none' }} />
                                {/* The countdown depends on the clock, so the server
                                    and a client in another timezone can disagree by
                                    a day around midnight. React only honours the
                                    flag on the text's own parent, hence the span. */}
                                <span className="truncate" suppressHydrationWarning>
                                  {day.toLocaleDateString('en-US', { weekday: 'short' })} · {countdownLabel(item.full_release_date, today)}
                                </span>
                              </p>
                            </div>
                            {/* Status only: nothing on this page toggles the
                                watchlist, so the bookmark is a mark, not a
                                button. The row's own click opens the modal. */}
                            <span
                              aria-hidden="true"
                              className="flex h-11 w-11 flex-none items-center justify-center"
                              style={{ color: item.onWatchlist ? 'var(--accent)' : 'var(--text-secondary)' }}
                            >
                              <Bookmark size={18} strokeWidth={1.8} fill={item.onWatchlist ? 'currentColor' : 'none'} />
                            </span>
                          </div>
                        </SelectableOverlay>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
