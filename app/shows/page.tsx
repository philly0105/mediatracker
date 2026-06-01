import { createClient } from '@/lib/supabase/server'
import MediaCard from '@/components/MediaCard'

export default async function ShowsPage() {
  const supabase = await createClient()
  const { data: entries } = await supabase
    .from('watch_entries')
    .select('*, media(*)')
    .order('watched_at', { ascending: false })

  const shows = (entries ?? []).filter((e: any) => e.media?.type === 'show')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">TV Shows</h1>
        <span className="text-zinc-500 text-sm">{shows.length} watched</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {shows.map((entry: any) => <MediaCard key={entry.id} entry={entry} />)}
      </div>
      {shows.length === 0 && (
        <p className="text-zinc-400">No shows logged yet. <a href="/search" className="text-white underline underline-offset-2">Search to add one.</a></p>
      )}
    </div>
  )
}
