import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import DeferredStatsCharts from '@/components/DeferredStatsCharts'
import {
  computeGenreBreakdown,
  computeRatingDistribution,
  computeMonthlyActivity,
  computeYearlyActivity,
  computeTopDirectors,
  computeTopActors,
  computeTotalHours,
  computeTopRated,
  computeRewatchCount,
  computeStreaks,
  availableYears,
  type WatchedEpisode,
} from '@/lib/stats'
import { StatTile } from '@/components/ui/StatTile'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarChart3 } from 'lucide-react'
import { redirect } from 'next/navigation'
import { fetchAllRows } from '@/lib/fetchAllRows'

export const metadata: Metadata = {
  title: 'Stats',
  description: 'Your watching habits, genres and streaks.',
}

// PostgREST embedded resources come back as either an object or a single-element
// array depending on the relationship, so handle both shapes.
function joinedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

type RuntimeMedia = { runtime_mins: number | null } | { runtime_mins: number | null }[] | null
type EpisodeProgressRuntimeRow = {
  watched_at: string
  seasons: { media: RuntimeMedia } | { media: RuntimeMedia }[] | null
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const { year: rawYear } = await searchParams

  const supabase = await createClient()

  // Both reads are paged: every figure on this page is an aggregate over the
  // whole history, so a silent 1000-row truncation would not look like an
  // error, it would look like smaller numbers.
  const [{ rows: entries }, { rows: epProgress }] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('watch_entries')
        .select('id, rating, watched_at, rewatch, media(type, title, genres, director, cast_members, runtime_mins)')
        .eq('user_id', user.id)
        .order('watched_at')
        .order('id')
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('episode_progress')
        .select('watched_at, seasons!inner(media!inner(runtime_mins))')
        .eq('user_id', user.id)
        .order('id')
        .range(from, to)
    ),
  ])

  const all = entries as unknown as import('@/types').WatchEntry[]
  const movies = all.filter(e => e.media?.type === 'movie')

  // Each episode's runtime comes from its show's runtime_mins (per-episode length),
  // threaded through seasons -> media. The show's own watch_entries row must not be
  // double counted, so computeTotalHours only reads the movie entries here.
  const watchedEpisodes: WatchedEpisode[] = (epProgress as unknown as EpisodeProgressRuntimeRow[]).map((row) => {
    const seasons = joinedOne(row.seasons)
    const media = joinedOne(seasons?.media)
    return { watched_at: row.watched_at, runtime_mins: media?.runtime_mins ?? null }
  })

  const totalHours = computeTotalHours(all, watchedEpisodes)
  const streaks = computeStreaks(all, watchedEpisodes)

  // Four zeros and a row of blank charts is a worse first run than saying so.
  const hasData = all.length > 0 || watchedEpisodes.length > 0

  // The activity chart used to be a hardcoded rolling 12 months. The year is
  // mirrored in the URL the way every other filter in the app is, so a view is
  // linkable — and validated against the years that actually have data, so a
  // hand-edited param falls back to the rolling window rather than an empty chart.
  const years = availableYears(all, watchedEpisodes)
  const selectedYear = rawYear && years.includes(Number(rawYear)) ? Number(rawYear) : null

  const statsData = {
    totals: {
      movies: movies.length,
      shows: all.filter(e => e.media?.type === 'show').length,
      episodes: watchedEpisodes.length,
      hours: Math.round(totalHours),
    },
    rewatches: computeRewatchCount(all),
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    genreBreakdown: computeGenreBreakdown(all),
    ratingDist: computeRatingDistribution(all),
    monthlyActivity: selectedYear
      ? computeYearlyActivity(all, watchedEpisodes, selectedYear)
      : computeMonthlyActivity(all, watchedEpisodes, 12),
    activityLabel: selectedYear ? String(selectedYear) : 'Last 12 months',
    years,
    selectedYear,
    topRated: computeTopRated(all),
    topDirectors: computeTopDirectors(movies),
    topActors: computeTopActors(all),
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your viewing"
        title="Stats"
        sub="How much you've watched, and what you keep coming back to."
      />
      {hasData ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile label="Movies" value={statsData.totals.movies} />
            <StatTile label="Shows" value={statsData.totals.shows} />
            <StatTile label="Episodes" value={statsData.totals.episodes} />
            <StatTile label="Hours" value={statsData.totals.hours} />
          </div>
          {/* Not a fixed grid-cols-3: three tiles with 30px numerals and a
              tracked uppercase label each will not fit a 320px viewport. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile label="Rewatches" value={statsData.rewatches} />
            <StatTile label="Current streak" value={statsData.currentStreak} />
            <StatTile label="Longest streak" value={statsData.longestStreak} />
          </div>
          <DeferredStatsCharts data={statsData} />
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Nothing to measure yet"
          hint="Log a few films or shows and this page fills in — genres, ratings, hours watched and the directors you keep returning to."
          actionLabel="Find something to watch"
          actionHref="/?search=1"
        />
      )}
    </div>
  )
}
