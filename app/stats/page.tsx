import { createClient } from '@/lib/supabase/server'
import StatsCharts from '@/components/StatsCharts'
import { computeGenreBreakdown, computeRatingDistribution, computeMonthlyActivity, computeTopDirectors, computeTopActors } from '@/lib/stats'

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

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
      <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Movies', value: statsData.totals.movies },
          { label: 'Shows', value: statsData.totals.shows },
          { label: 'Episodes', value: statsData.totals.episodes },
          { label: 'Hours', value: statsData.totals.hours },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-2xl p-5 text-center backdrop-blur-md" style={glassCard}>
            <p className="text-3xl font-bold text-white">{value}</p>
            <p className="text-sm text-zinc-400 mt-1">{label}</p>
          </div>
        ))}
      </div>
      <StatsCharts data={statsData} />
    </div>
  )
}
