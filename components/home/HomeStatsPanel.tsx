import type { SupabaseClient } from '@supabase/supabase-js'
import { Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { StatTile } from '@/components/ui/StatTile'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { computeGenreBreakdown, computeTotalHours, computeYearlyHours, type WatchedEpisode } from '@/lib/stats'
import type { WatchEntry } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'
import DeferredHoursChart from './DeferredHoursChart'

export type YearStats = { entries: WatchEntry[]; episodes: WatchedEpisode[] }

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
 * silently cut at PostgREST's row cap. Never rejects: a failed read is an
 * empty year, and the panel shows zeros rather than taking Home down.
 */
export async function loadYearStats(supabase: SupabaseClient, userId: string, year: number): Promise<YearStats> {
  const since = `${year}-01-01`
  const [{ rows: entries }, { rows: progress }] = await Promise.all([
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
  const episodes: WatchedEpisode[] = (progress as unknown as EpisodeRuntimeRow[]).map((row) => {
    const media = joinedOne(joinedOne(row.seasons)?.media)
    return { watched_at: row.watched_at, runtime_mins: media?.runtime_mins ?? null }
  })

  return { entries: entries as unknown as WatchEntry[], episodes }
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
  const { entries, episodes } = await stats
  const year = now.getFullYear()
  const currentIndex = now.getMonth()

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
  const through = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  return (
    <Card variant="panel" as="section" aria-labelledby="stats-title" style={{ flex: '1.7 1 520px', minWidth: 0 }}>
      <SectionHeader
        id="stats-title"
        title={`${year} so far`}
        sub={`January 1 – ${through}`}
        action={{ label: 'All stats', href: '/stats' }}
      />
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
          <StatTile label="In progress" value={inProgress} unit={inProgress === 1 ? 'show' : 'shows'} />
          <StatTile label="On Must watch" value={mustWatch} unit={mustWatch === 1 ? 'title' : 'titles'} />
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
    <div role="status" aria-busy="true" className="card-surface flex-[1.7_1_520px]" style={{ minWidth: 0 }}>
      <span className="sr-only">Loading this year&apos;s stats...</span>
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
