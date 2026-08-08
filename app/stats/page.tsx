import { createClient } from '@/lib/supabase/server'
import StatsCharts from '@/components/StatsCharts'
import { computeGenreBreakdown, computeRatingDistribution, computeMonthlyActivity, computeTopDirectors, computeTopActors, computeTotalHours, type WatchedEpisode } from '@/lib/stats'
import { StatTile } from '@/components/ui/StatTile'
import { redirect } from 'next/navigation'

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

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: entries } = await supabase.from('watch_entries').select('*, media(*)').eq('user_id', user.id).order('watched_at')
  const { data: epProgress } = await supabase.from('episode_progress').select('watched_at, seasons!inner(media!inner(runtime_mins))').eq('user_id', user.id)

  const all = (entries ?? []) as any[]
  const movies = all.filter(e => e.media?.type === 'movie')

  // Each episode's runtime comes from its show's runtime_mins (per-episode length),
  // threaded through seasons -> media. The show's own watch_entries row must not be
  // double counted, so computeTotalHours only reads the movie entries here.
  const watchedEpisodes: WatchedEpisode[] = ((epProgress ?? []) as unknown as EpisodeProgressRuntimeRow[]).map((row) => {
    const seasons = joinedOne(row.seasons)
    const media = joinedOne(seasons?.media)
    return { watched_at: row.watched_at, runtime_mins: media?.runtime_mins ?? null }
  })

  const totalHours = computeTotalHours(all, watchedEpisodes)

  const statsData = {
    totals: {
      movies: movies.length,
      shows: all.filter(e => e.media?.type === 'show').length,
      episodes: watchedEpisodes.length,
      hours: Math.round(totalHours),
    },
    genreBreakdown: computeGenreBreakdown(all),
    ratingDist: computeRatingDistribution(all),
    monthlyActivity: computeMonthlyActivity(all, watchedEpisodes, 12),
    topDirectors: computeTopDirectors(movies),
    topActors: computeTopActors(all),
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
        Stats
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Movies" value={statsData.totals.movies} />
        <StatTile label="Shows" value={statsData.totals.shows} />
        <StatTile label="Episodes" value={statsData.totals.episodes} />
        <StatTile label="Hours" value={statsData.totals.hours} />
      </div>
      <StatsCharts data={statsData} />
    </div>
  )
}
