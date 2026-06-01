import { createClient } from '@/lib/supabase/server'
import MediaCard from '@/components/MediaCard'

export default async function MoviesPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('watch_entries')
    .select('*, media(*)')
    .order('watched_at', { ascending: false })

  const movies = (entries ?? []).filter((e: any) => e.media?.type === 'movie')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Movies</h1>
        <span className="text-gray-400 text-sm">{movies.length} watched</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {movies.map((entry: any) => <MediaCard key={entry.id} entry={entry} />)}
      </div>
      {movies.length === 0 && (
        <p className="text-gray-400">No movies logged yet. <a href="/search" className="text-blue-400 hover:underline">Search to add one.</a></p>
      )}
    </div>
  )
}
