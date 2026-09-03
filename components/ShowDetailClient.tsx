'use client'

import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
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
import type { Episode, EpisodeProgress, WatchEntry } from '@/types'
import type { ShowDetails } from '@/lib/showDetails'

export interface ShowDetailClientProps {
  mediaId: string
  initialDetails: ShowDetails
}

export default function ShowDetailClient({
  mediaId,
  initialDetails,
}: ShowDetailClientProps) {
  const media = initialDetails.media
  const seasons = initialDetails.seasons
  const [progress, setProgress] = useState<EpisodeProgress[]>(initialDetails.progress)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [entry, setEntry] = useState<WatchEntry | null>(initialDetails.entry)
  const [rating, setRating] = useState<number | null>(initialDetails.entry?.rating ?? null)
  const [markingWatched, setMarkingWatched] = useState(false)
  const { toast } = useToast()
  const { schedule, cancel } = useDeferredAction()
  const { openMedia } = useMediaModal()

  function openDetails() {
    if (!media) return
    openMedia(mediaToResult(media), {
      // Only a watch changes the entry this page reads back.
      onChanged: (change) => { if (change === 'watched') void refreshEntry() },
    })
  }

  // Episode titles are fetched apart from the page load on purpose: the first
  // read of a show fills them from TMDB one request per season, which is slow
  // enough that blocking on it would delay the tracker. It renders E-numbers
  // until this lands, and keeps doing so if it fails.
  useEffect(() => {
    let cancelled = false
    fetch(`/api/episodes/meta?media_id=${mediaId}`)
      .then((res) => (res.ok ? res.json() : { episodes: [] }))
      .then((data) => { if (!cancelled) setEpisodes(data.episodes ?? []) })
      .catch((err) => console.error(err))
    return () => { cancelled = true }
  }, [mediaId])

  // Fetch the latest watch entry and fold it into state — both the header button
  // and the details modal's mark-as-watched re-run this so the stars appear
  // without a reload, instead of each duplicating their own fetch.
  const refreshEntry = useCallback(async () => {
    try {
      // `only=entry` — this reads back one rating; the full payload also carries
      // the media row, every season and every progress row.
      const res = await fetch(`/api/shows/${mediaId}?only=entry`)
      if (res.ok) {
        const data = await res.json()
        setEntry(data.entry ?? null)
        setRating(data.entry?.rating ?? null)
      }
    } catch (err) {
      console.error(err)
    }
  }, [mediaId])

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
    const previous = rating
    setRating(newRating)
    try {
      const res = await fetch('/api/watch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, rating: newRating }),
      })
      if (!res.ok) throw new Error('Failed to save rating')
    } catch (err) {
      console.error(err)
      setRating(previous)
      toast('Could not save your rating.', { tone: 'error' })
    }
  }, [entry, rating, toast])

  // Re-add rows without duplicating any the user has since re-checked by hand.
  const restoreEpisodes = useCallback((rows: EpisodeProgress[]) => {
    setProgress(prev => {
      const present = new Set(prev.map(p => `${p.season_id}-${p.episode_number}`))
      const missing = rows.filter(r => !present.has(`${r.season_id}-${r.episode_number}`))
      return missing.length > 0 ? [...prev, ...missing] : prev
    })
  }, [])

  const handleProgressChange = useCallback(async (seasonId: string, episode: number | number[], watched: boolean) => {
    const episodesToUpdate = Array.isArray(episode) ? episode : [episode]
    if (episodesToUpdate.length === 0) return

    if (watched) {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ season_id: seasonId, episodes: episodesToUpdate }),
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
        (p) => p.season_id === seasonId && episodesToUpdate.includes(p.episode_number)
      )
      if (removed.length === 0) return
      setProgress(prev => prev.filter(p => !(p.season_id === seasonId && episodesToUpdate.includes(p.episode_number))))

      const key = `episodes-${seasonId}-${[...episodesToUpdate].sort((a, b) => a - b).join(',')}`
      schedule(key, async () => {
        try {
          const res = await fetch('/api/episodes', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ season_id: seasonId, episodes: episodesToUpdate }),
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
          {/* Not PageHeader: this is a media hero, poster beside title, and that
              component is a full-width page-title block. The type scale is
              matched to it so the two do not drift. */}
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--weight-extrabold)' as React.CSSProperties['fontWeight'],
              letterSpacing: 'var(--tracking-tight)',
              lineHeight: 'var(--leading-tight)',
              color: 'var(--text-primary)',
            }}
          >
            {media.title}
          </h1>
          <p className="text-zinc-400">{media.release_year} · TV Show</p>
          {total > 0 && (
            <div className="space-y-1.5 max-w-xs">
              <p className="text-sm text-zinc-400">
                {watched}/{total} episodes
                {hoursLeft > 0 && ` · ~${hoursLeft}h left`}
              </p>
              {/* Same bar as EpisodeTracker and Continue Watching, which both
                  showed progress here while this page had numbers only. */}
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={watched}
                aria-label={`${watched} of ${total} episodes watched`}
              >
                <div
                  className="h-full rounded-full bg-[var(--teal-400)] transition-all duration-300"
                  style={{ width: `${Math.round((watched / total) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {media.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {media.genres.map(g => (
                <span key={g} className="px-2 py-0.5 text-xs text-zinc-400 rounded-full border border-[var(--border-faint)]"
                  style={{ background: 'var(--btn-ghost-bg)' }}>
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
