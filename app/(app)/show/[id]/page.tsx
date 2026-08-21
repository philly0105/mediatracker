'use client'
import Image from 'next/image'
import { use, useEffect, useState, useCallback } from 'react'
import EpisodeTracker from '@/components/EpisodeTracker'
import BackButton from '@/components/BackButton'
import { formatAirDate, isUnaired } from '@/lib/formatDate'
import RatingStars from '@/components/RatingStars'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ToastProvider'
import { useDeferredAction } from '@/lib/useDeferredAction'
import { useMediaModal } from '@/components/MediaModalProvider'
import { mediaToResult } from '@/lib/mediaToResult'
import { findNextUp } from '@/lib/nextUp'
import { Check, Info, Loader2, TvMinimal } from 'lucide-react'
import type { Media, Season, Episode, EpisodeProgress, WatchEntry } from '@/types'

export default function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [media, setMedia] = useState<Media | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [progress, setProgress] = useState<EpisodeProgress[]>([])
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [entry, setEntry] = useState<WatchEntry | null>(null)
  const [rating, setRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [markingWatched, setMarkingWatched] = useState(false)
  const { toast } = useToast()
  const { schedule, cancel } = useDeferredAction()
  const { openMedia } = useMediaModal()

  function openDetails() {
    openMedia(mediaToResult(media!), {
      // Only a watch changes the entry this page reads back.
      onChanged: (change) => { if (change === 'watched') void refreshEntry() },
    })
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shows/${id}`)
        if (!res.ok) {
          setLoading(false)
          return
        }
        const data = await res.json()
        setMedia(data.media ?? null)
        setSeasons(data.seasons ?? [])
        setEntry(data.entry ?? null)
        setRating(data.entry?.rating ?? null)
        setProgress(data.progress ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Episode titles are fetched apart from the page load on purpose: the first
  // read of a show fills them from TMDB one request per season, which is slow
  // enough that blocking on it would delay the tracker. It renders E-numbers
  // until this lands, and keeps doing so if it fails.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/episodes/meta?media_id=${id}`)
      .then((res) => (res.ok ? res.json() : { episodes: [] }))
      .then((data) => { if (!cancelled) setEpisodes(data.episodes ?? []) })
      .catch((err) => console.error(err))
    return () => { cancelled = true }
  }, [id])

  // Fetch the latest watch entry and fold it into state — both the header button
  // and the details modal's mark-as-watched re-run this so the stars appear
  // without a reload, instead of each duplicating their own fetch.
  const refreshEntry = useCallback(async () => {
    try {
      const res = await fetch(`/api/shows/${id}`)
      if (res.ok) {
        const data = await res.json()
        setEntry(data.entry ?? null)
        setRating(data.entry?.rating ?? null)
      }
    } catch (err) {
      console.error(err)
    }
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
      await refreshEntry()
      toast(`Logged ${media.title} as watched.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not mark as watched.', { tone: 'error' })
    } finally {
      setMarkingWatched(false)
    }
  }, [media, toast, refreshEntry])

  const handleRatingChange = useCallback(async (newRating: number | null) => {
    if (!entry) return
    setRating(newRating)
    await fetch('/api/watch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, rating: newRating }),
    })
  }, [entry])

  // Re-add rows without duplicating any the user has since re-checked by hand.
  const restoreEpisodes = useCallback((rows: EpisodeProgress[]) => {
    setProgress(prev => {
      const present = new Set(prev.map(p => `${p.season_id}-${p.episode_number}`))
      const missing = rows.filter(r => !present.has(`${r.season_id}-${r.episode_number}`))
      return missing.length > 0 ? [...prev, ...missing] : prev
    })
  }, [])

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
      // Un-checking cascades: clicking E1 of a finished season removes every
      // episode after it too. That was instant and irreversible, so a misclick
      // cost the whole season with no warning. Defer the delete behind an Undo
      // and drop the rows locally in the meantime.
      const removed = progress.filter(
        (p) => p.season_id === seasonId && episodes.includes(p.episode_number)
      )
      if (removed.length === 0) return
      setProgress(prev => prev.filter(p => !(p.season_id === seasonId && episodes.includes(p.episode_number))))

      const key = `episodes-${seasonId}-${[...episodes].sort((a, b) => a - b).join(',')}`
      schedule(key, async () => {
        try {
          const res = await fetch('/api/episodes', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ season_id: seasonId, episodes }),
          })
          if (!res.ok) throw new Error('Failed to remove episodes')
        } catch (err) {
          console.error(err)
          restoreEpisodes(removed)
          toast('Could not update episode progress.', { tone: 'error' })
        }
      })

      toast(
        removed.length === 1
          ? `Unmarked 1 episode.`
          : `Unmarked ${removed.length} episodes.`,
        {
          tone: 'success',
          action: {
            label: 'Undo',
            onClick: () => {
              if (!cancel(key)) {
                toast('Too late to undo — that change has already been saved.', { tone: 'info' })
                return
              }
              restoreEpisodes(removed)
            },
          },
        }
      )
    }
  }, [progress, schedule, cancel, toast, restoreEpisodes])

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

  if (!media) {
    return (
      <EmptyState
        icon={TvMinimal}
        title="That show is not in your library"
        hint="Track a show from its details panel and its episodes show up here."
        actionLabel="Back to your library"
        actionHref="/library"
      />
    )
  }

  const total = seasons.reduce((sum, s) => sum + s.episode_count, 0)
  const watched = progress.length
  // "~Nh left" only makes sense once there is a runtime to multiply against and
  // at least one episode still unwatched; and it is dropped when it rounds to 0.
  const hoursLeft = total > watched && media.runtime_mins != null
    ? Math.round(((total - watched) * media.runtime_mins) / 60)
    : 0

  const watchedKeys = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))
  const nextUp = findNextUp(seasons, watchedKeys)
  const nextUpMeta = nextUp
    ? episodes.find(e => e.season_id === nextUp.season_id && e.episode_number === nextUp.episode_number)
    : null
  const nextUpUnaired = nextUp ? isUnaired(nextUpMeta?.air_date ?? null) : false

  const glassCard = {
    background: 'var(--glass-card)',
    border: '1px solid var(--border-subtle)',
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Show pages are the ones people deep-link into — from Continue Watching,
          a shared link, a bookmark — so the history-length fallback matters most
          here. router.back() on a fresh tab leaves the page. */}
      <BackButton fallback="/library" />
      <div className="flex gap-4">
        {media.poster_url && <Image src={media.poster_url} alt={media.title} width={128} height={192} className="w-32 h-auto rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-lg" />}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">{media.title}</h1>
          <p className="text-zinc-400">{media.release_year} · TV Show</p>
          {total > 0 && (
            <p className="text-sm text-zinc-400">
              {watched}/{total} episodes
              {hoursLeft > 0 && ` · ~${hoursLeft}h left`}
            </p>
          )}
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
            <>
              <RatingStars value={rating} onChange={handleRatingChange} />
              <Button variant="ghost" size="sm" onClick={openDetails}>
                <Info className="w-4 h-4" />
                <span>Details</span>
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleMarkShowWatched} disabled={markingWatched} size="sm">
                {markingWatched ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Mark show as watched</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={openDetails}>
                <Info className="w-4 h-4" />
                <span>Details</span>
              </Button>
            </>
          )}
          {media.overview && <p className="text-sm text-zinc-400 max-w-prose leading-relaxed">{media.overview}</p>}
        </div>
      </div>

      {nextUp && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg" style={glassCard}>
          {nextUpUnaired ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">All caught up</div>
              <div className="text-sm font-semibold text-white">
                S{nextUp.season_number} E{nextUp.episode_number} airs {formatAirDate(nextUpMeta?.air_date ?? '')}
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Next up</div>
                <div className="text-sm font-semibold text-white">
                  S{nextUp.season_number} E{nextUp.episode_number}
                  {nextUpMeta?.name ? ` · ${nextUpMeta.name}` : ''}
                </div>
              </div>
              <Button size="sm" onClick={() => handleProgressChange(nextUp.season_id, nextUp.episode_number, true)}>
                <Check className="w-4 h-4" />
                <span>Mark watched</span>
              </Button>
            </>
          )}
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold tracking-tight mb-3">Episodes</h2>
        <EpisodeTracker seasons={seasons} progress={progress} episodes={episodes} onProgressChange={handleProgressChange} />
      </div>

    </div>
  )
}
