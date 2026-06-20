import { createClient } from '@/lib/supabase/server'
import StatsCharts from '@/components/StatsCharts'
import { computeGenreBreakdown, computeRatingDistribution, computeMonthlyActivity, computeTopDirectors, computeTopActors } from '@/lib/stats'
import { StatTile } from '@/components/ui/StatTile'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase.from('watch_entries').select('*, media(*)').order('watched_at')
  const { data: epProgress } = await supabase.from('episode_progress').select('id')

  const all = (entries ?? []) as any[]
  const movies = all.filter(e => e.media?.type === 'movie')

  const totalHours = all.reduce((sum: number, e: any) => sum + (e.media?.runtime_mins ?? 0), 0) / 60

  const statsData = {
    totals: {
      movies: movies.length,
      shows: all.filter(e => e.media?.type === 'show').length,
      episodes: epProgress?.length ?? 0,
      hours: Math.round(totalHours),
    },
    genreBreakdown: computeGenreBreakdown(all),
    ratingDist: computeRatingDistribution(all),
    monthlyActivity: computeMonthlyActivity(all, 12),
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
