import type { SupabaseClient } from '@supabase/supabase-js'
import { AlertCircle, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { STILL_PANEL_CLASS } from '@/components/ui/cardVariants'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatTile } from '@/components/ui/StatTile'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { computeGenreBreakdown, computeTotalHours, computeYearlyHours, type WatchedEpisode } from '@/lib/stats'
import type { WatchEntry } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'
import DeferredHoursChart from './DeferredHoursChart'

export type YearStats = {
  entries: WatchEntry[]
  episodes: WatchedEpisode[]
  /** A read came back with an error, so the figures below are not the year. */
  failed: boolean
  /** The year ran past fetchAllRows' ceiling, so they are only part of it. */
  truncated: boolean
}

type EpisodeRuntimeRow = {
  watched_at: string
  seasons: { media: { runtime_mins: number | null } | { runtime_mins: number | null }[] | null }
    | { media: { runtime_mins: number | null } | { runtime_mins: number | null }[] | null }[]
    | null
}

function joinedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * This year's watch entries and watched episodes, the two reads behind the
 * "so far" tiles and the hours chart. Paged like /stats so a big year is not
 * silently cut at PostgREST's row cap.
 *
 * Still never rejects. Home's panels are deliberately failure-isolated — the
 * dashboard starts this read and the recommendation read before it awaits
 * anything, and the sibling "Because you watched" catches to null — so a
 * Supabase hiccup here must not take the whole page down the way throwing to
 * the route boundary would.
 *
 * But a failure is no longer reported as an empty year either. "0 titles
 * logged" is a claim about the user's year, and a read that never came back
 * cannot make it; `failed` carries that to the panel, which says so instead.
 */
export async function loadYearStats(supabase: SupabaseClient, userId: string, year: number): Promise<YearStats> {
  const since = `${year}-01-01`
  const [entryRead, episodeRead] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('watch_entries')
        .select('id, rating, watched_at, rewatch, media(type, genres, runtime_mins)')
        .eq('user_id', userId)
        .gte('watched_at', since)
        .order('watched_at')
        .order('id')
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('episode_progress')
        .select('watched_at, seasons!inner(media!inner(runtime_mins))')
        .eq('user_id', userId)
        .gte('watched_at', since)
        .order('id')
        .range(from, to)
    ),
  ])

  // Each episode's runtime is its show's per-episode runtime_mins, threaded
  // through seasons -> media, exactly as /stats computes it.
  const episodes: WatchedEpisode[] = (episodeRead.rows as unknown as EpisodeRuntimeRow[]).map((row) => {
    const media = joinedOne(joinedOne(row.seasons)?.media)
    return { watched_at: row.watched_at, runtime_mins: media?.runtime_mins ?? null }
  })

  return {
    entries: entryRead.rows as unknown as WatchEntry[],
    episodes,
    failed: Boolean(entryRead.error ?? episodeRead.error),
    truncated: entryRead.truncated || episodeRead.truncated,
  }
}

type Props = {
  stats: Promise<YearStats>
  /** Shows with an unwatched episode, from the continue-watching list. */
  inProgress: number
  /** Watchlist titles in the Must watch bucket. */
  mustWatch: number
  now: Date
}

/**
 * The reference's "2026 so far" panel: six numerals and the hours-per-month
 * bars. The year's reads were started before the page awaited anything else
 * and are only awaited here, inside the page's Suspense boundary, so a slow
 * stats query streams in behind the hero rather than delaying it.
 */
export default async function HomeStatsPanel({ stats, inProgress, mustWatch, now }: Props) {
  const { entries, episodes, failed, truncated } = await stats
  const year = now.getFullYear()
  const currentIndex = now.getMonth()
  const through = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const header = (
    <SectionHeader
      id="stats-title"
      title={`${year} so far`}
      sub={`January 1 – ${through}`}
      action={{ label: 'All stats', href: '/stats' }}
    />
  )

  // These two come from the page's own reads, not the year's, so they are
  // shown whether or not the year's reads failed.
  const inProgressTile = <StatTile label="In progress" value={inProgress} unit={inProgress === 1 ? 'show' : 'shows'} />
  const mustWatchTile = <StatTile label="On Must watch" value={mustWatch} unit={mustWatch === 1 ? 'title' : 'titles'} />

  // A failed read used to render as a year of zeros, which is a statement
  // about the user rather than about the query. Throwing is the wrong answer
  // here — unlike /stats this is one panel among several, and its siblings
  // each degrade on their own — so the panel keeps its slot and says what
  // happened. The compact empty state is a flat row, safe inside a panel that
  // already blurs. Only the year's figures go: the two counts above did load,
  // and dropping them with the rest threw away numbers that were right.
  if (failed) {
    return (
      <Card variant="panel" as="section" aria-labelledby="stats-title" style={{ flex: '1.7 1 520px', minWidth: 0 }}>
        {header}
        <EmptyState
          size="compact"
          tone="error"
          icon={AlertCircle}
          title="This year's numbers didn't load"
          hint="Reload to try again, or open All stats."
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px', padding: '16px 4px 0' }}>
          {inProgressTile}
          {mustWatchTile}
        </div>
      </Card>
    )
  }

  const rated = entries.filter((entry) => entry.rating != null)
  const averageRating = rated.length > 0
    ? (rated.reduce((sum, entry) => sum + (entry.rating ?? 0), 0) / rated.length).toFixed(1)
    : '—'
  const topGenre = computeGenreBreakdown(entries)[0]?.genre ?? '—'
  const hours = Math.round(computeTotalHours(entries, episodes))

  const months = computeYearlyHours(entries, episodes, year)
  const elapsed = months.slice(0, currentIndex + 1)
  const average = elapsed.reduce((sum, row) => sum + row.hours, 0) / elapsed.length
  const currentLabel = now.toLocaleDateString('en-US', { month: 'short' })

  return (
    <Card variant="panel" as="section" aria-labelledby="stats-title" style={{ flex: '1.7 1 520px', minWidth: 0 }}>
      {header}
      {truncated && (
        // Partial aggregates are indistinguishable from small ones, so the
        // ceiling is named rather than quietly applied.
        <p
          role="status"
          style={{ margin: '0 0 12px', paddingLeft: 4, fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)' }}
        >
          Your year is longer than this panel can add up — these cover part of it.
        </p>
      )}
      <div className="flex flex-wrap" style={{ gap: '24px 32px', padding: '0 4px' }}>
        <div
          style={{
            flex: '1 1 250px', display: 'grid', gridTemplateColumns: '1fr 1fr',
            alignContent: 'space-between', gap: '14px 16px', minWidth: 0,
          }}
        >
          <StatTile label="Titles logged" value={entries.length} />
          <StatTile label="Hours watched" value={hours} />
          <StatTile
            label="Average rating"
            value={averageRating}
            icon={<Star size={18} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--rating)', fill: 'var(--rating)' }} />}
          />
          <StatTile label="Top genre" value={topGenre} />
          {inProgressTile}
          {mustWatchTile}
        </div>

        <figure style={{ flex: '1.35 1 280px', margin: 0, minWidth: 0 }}>
          <figcaption
            className="flex flex-wrap items-center justify-between"
            style={{ gap: '4px 12px', fontSize: 'var(--text-sm)', lineHeight: '18px', color: 'var(--text-muted)' }}
          >
            <span>Hours per month</span>
            <span className="tabular inline-flex items-center" style={{ gap: 12 }}>
              <span className="inline-flex items-center" style={{ gap: 6 }}>
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
                {currentLabel} {Math.round(months[currentIndex]?.hours ?? 0)}h
              </span>
              <span className="inline-flex items-center" style={{ gap: 6 }}>
                <span aria-hidden="true" style={{ width: 14, height: 0, borderTop: '2px dashed var(--chart-line)' }} />
                Avg {Math.round(average)}h
              </span>
            </span>
          </figcaption>
          {/* Only the months that have happened: the reference ends its bars
              on the current month rather than trailing empty ones. */}
          <DeferredHoursChart months={elapsed} currentIndex={currentIndex} average={average} />
        </figure>
      </div>
    </Card>
  )
}

/** The panel's footprint while the year's reads stream in. */
export function StatsPanelSkeleton() {
  return (
    // STILL_PANEL_CLASS, like the other Home skeletons: the panel's 14px/20px
    // padding and rim without its blur. `card-surface` padded 20px at every
    // width, so on a phone the panel narrowed and re-wrapped when it loaded.
    <div role="status" aria-busy="true" className={`${STILL_PANEL_CLASS} flex-[1.7_1_520px]`} style={{ minWidth: 0 }}>
      <span className="sr-only">Loading this year&apos;s stats…</span>
      <div aria-hidden="true">
        <div className="flex items-center justify-between" style={{ marginBottom: 12, paddingLeft: 4 }}>
          <div className="space-y-2">
            <Skeleton className="h-[26px] w-32" />
            <Skeleton className="h-[18px] w-44" />
          </div>
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  )
}
