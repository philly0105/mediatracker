'use client'
import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import EpisodeTracker from '@/components/EpisodeTracker'
import RatingStars from '@/components/RatingStars'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ToastProvider'
import { Check, Loader2 } from 'lucide-react'
import type { Media, Season, EpisodeProgress, WatchEntry } from '@/types'

export default function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [media, setMedia] = useState<Media | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [progress, setProgress] = useState<EpisodeProgress[]>([])
  const [entry, setEntry] = useState<WatchEntry | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingWatched, setMarkingWatched] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      // media, seasons and the watch entry are independent — only episode
      // progress needs the season ids, so it is the one that has to wait. These
      // used to run as four sequential round trips.
      const [{ data: m }, { data: s }, { data: e }] = await Promise.all([
        supabase.from('media').select('*').eq('id', id).maybeSingle(),
        supabase.from('seasons').select('*').eq('media_id', id).order('season_number'),
        supabase
          .from('watch_entries')
          .select('*')
          .eq('media_id', id)
          .order('watched_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      setMedia(m)
      setSeasons(s ?? [])
      setEntry(e)
      setRating(e?.rating ?? null)

      const seasonIds = (s ?? []).map((season: Season) => season.id)
      if (seasonIds.length > 0) {
        const { data: p } = await supabase.from('episode_progress').select('*').in('season_id', seasonIds)
        setProgress(p ?? [])
      }
      setLoading(false)
    }
    load()
  }, [id])

  // Tracking episodes never creates a watch_entries row, so the normal path —
  // start a show, watch episodes — left this page with no way to rate the show
  // and no way to log it. The stars only render once an entry exists.
  const handleMarkShowWatched = useCallback(async () => {
    if (!media) return
    setMarkingWatched(true)
    try {
      const res = await fetch('/api/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tmdb_id: media.tmdb_id, type: 'show' }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) throw new Error(body?.error ?? 'Failed to mark as watched')
      setEntry(body.entry)
      setRating(body.entry?.rating ?? null)
      toast(`Logged ${media.title} as watched.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not mark as watched.', { tone: 'error' })
    } finally {
      setMarkingWatched(false)
    }
  }, [media, toast])

  const handleRatingChange = useCallback(async (newRating: number) => {
    if (!entry) return
    setRating(newRating)
    await fetch('/api/watch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, rating: newRating }),
    })
  }, [entry])

  const handleProgressChange = useCallback(async (seasonId: string, episode: number | number[], watched: boolean) => {
    const episodes = Array.isArray(episode) ? episode : [episode]
    if (episodes.length === 0) return

    if (watched) {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: seasonId, episodes }),
      })
      if (res.ok) {
        const { progress: rows } = await res.json()
        const newRows = Array.isArray(rows) ? rows : (rows ? [rows] : [])
        setProgress(prev => {
          const next = [...prev]
          for (const r of newRows) {
            if (!r || !r.season_id || !r.episode_number) continue
            const idx = next.findIndex(p => p.season_id === r.season_id && p.episode_number === r.episode_number)
            if (idx >= 0) next[idx] = r
            else next.push(r)
          }
          return next
        })
      }
    } else {
      await fetch('/api/episodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: seasonId, episodes }),
      })
      setProgress(prev => prev.filter(p => !(p.season_id === seasonId && episodes.includes(p.episode_number))))
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl animate-pulse">
        <div className="flex gap-4">
          <div className="w-32 h-48 rounded-[var(--radius-xl)] bg-white/5 border border-[var(--border-subtle)]" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-8 w-2/3 rounded bg-white/5" />
            <div className="h-4 w-1/3 rounded bg-white/5" />
            <div className="h-16 w-full rounded bg-white/5" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-white/5 border border-[var(--border-subtle)]" />
          ))}
        </div>
      </div>
    )
  }

  if (!media) return <div className="text-zinc-400">That show is not in your library.</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
        ← Back
      </button>
      <div className="flex gap-4">
        {media.poster_url && <img src={media.poster_url} alt={media.title} className="w-32 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-lg" />}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">{media.title}</h1>
          <p className="text-zinc-400">{media.release_year} · TV Show</p>
          {media.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {media.genres.map(g => (
                <span key={g} className="px-2 py-0.5 text-xs text-zinc-400 rounded-full border border-[var(--border-faint)]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
          {entry ? (
            <RatingStars value={rating} onChange={handleRatingChange} />
          ) : (
            <Button onClick={handleMarkShowWatched} disabled={markingWatched} size="sm">
              {markingWatched ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Mark show as watched</span>
            </Button>
          )}
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