'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EpisodeTracker from '@/components/EpisodeTracker'
import RatingStars from '@/components/RatingStars'
import type { Media, Season, EpisodeProgress, WatchEntry } from '@/types'

export default function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [media, setMedia] = useState<Media | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [progress, setProgress] = useState<EpisodeProgress[]>([])
  const [entry, setEntry] = useState<WatchEntry | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: m } = await supabase.from('media').select('*').eq('id', id).single()
      setMedia(m)

      const { data: s } = await supabase.from('seasons').select('*').eq('media_id', id).order('season_number')
      setSeasons(s ?? [])

      const seasonIds = (s ?? []).map((s: Season) => s.id)
      if (seasonIds.length > 0) {
        const { data: p } = await supabase.from('episode_progress').select('*').in('season_id', seasonIds)
        setProgress(p ?? [])
      }

      const { data: e } = await supabase
        .from('watch_entries')
        .select('*')
        .eq('media_id', id)
        .order('watched_at', { ascending: false })
        .limit(1)
        .single()
      setEntry(e)
      setRating(e?.rating ?? null)
    }
    load()
  }, [id])

  const handleRatingChange = useCallback(async (newRating: number) => {
    if (!entry) return
    setRating(newRating)
    await fetch('/api/watch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, rating: newRating }),
    })
  }, [entry])

  const handleProgressChange = useCallback(async (seasonId: string, episode: number, watched: boolean) => {
    if (watched) {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: seasonId, episode_number: episode }),
      })
      if (res.ok) {
        const { progress: p } = await res.json()
        setProgress(prev => [...prev, p])
      }
    } else {
      await fetch('/api/episodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: seasonId, episode_number: episode }),
      })
      setProgress(prev => prev.filter(p => !(p.season_id === seasonId && p.episode_number === episode)))
    }
  }, [])

  if (!media) return <div className="text-zinc-400">Loading...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors">
        ← Back
      </button>
      <div className="flex gap-4">
        {media.poster_url && <img src={media.poster_url} alt={media.title} className="w-32 rounded-2xl" />}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">{media.title}</h1>
          <p className="text-zinc-400">{media.release_year} · TV Show</p>
          {media.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {media.genres.map(g => (
                <span key={g} className="px-2 py-0.5 text-xs text-zinc-400 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
          {entry && <RatingStars value={rating} onChange={handleRatingChange} />}
          {media.overview && <p className="text-sm text-zinc-400 max-w-prose leading-relaxed">{media.overview}</p>}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">Episodes</h2>
        <EpisodeTracker seasons={seasons} progress={progress} onProgressChange={handleProgressChange} />
      </div>
    </div>
  )
}
