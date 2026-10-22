'use client'

import React, { useEffect, useState, useCallback } from 'react'
import EpisodeTracker from '@/components/EpisodeTracker'
import BackButton from '@/components/BackButton'
import AmbientBackdrop from '@/components/AmbientBackdrop'
import { formatDateLabel, isUnaired } from '@/lib/formatDate'
import RatingStars from '@/components/RatingStars'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { TitleHero } from '@/components/title/TitleHero'
import { TitleStatus, type TitleStatusValue } from '@/components/title/TitleStatus'
import { CastStrip } from '@/components/title/CastStrip'
import { MoreLikeThisRail } from '@/components/title/MoreLikeThisRail'
import { StreamingRow } from '@/components/title/StreamingRow'
import { useToast } from '@/components/ToastProvider'
import { useDeferredAction } from '@/lib/useDeferredAction'
import { useMediaModal } from '@/components/MediaModalProvider'
import { mediaToResult } from '@/lib/mediaToResult'
import { findNextUp, seasonProgress } from '@/lib/nextUp'
import { Check, Info, Loader2, TvMinimal } from 'lucide-react'
import type { Episode, EpisodeProgress, TmdbSearchResult, WatchEntry } from '@/types'
import type { ShowDetails } from '@/lib/showDetails'
import type { MediaArt } from '@/lib/mediaArt'
import type { TmdbFullDetails } from '@/lib/tmdb'

export interface ShowDetailClientProps {
  mediaId: string
  initialDetails: ShowDetails
  /** The media row's backdrop and logo (migration 014); absent before it exists. */
  art?: MediaArt | null
  /** TMDB's details, for what the media row never stored: tagline, rating,
   *  score, providers, and art when the row has none. Null when TMDB failed. */
  tmdb?: TmdbFullDetails | null
  /** TMDB's recommendations, for the "More like this" rail. */
  similar?: TmdbSearchResult[]
}

const SIMILAR_TITLE = 'More like this'

export default function ShowDetailClient({
  mediaId,
  initialDetails,
  art,
  tmdb,
  similar = [],
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
  // "3h 42m to go" only makes sense once there is a runtime to multiply against
  // and at least one episode still unwatched.
  const minutesLeft = total > watched && media.runtime_mins != null
    ? (total - watched) * media.runtime_mins
    : null

  const watchedKeys = new Set(progress.map(p => `${p.season_id}-${p.episode_number}`))
  const nextUp = findNextUp(seasons, watchedKeys)
  const nextUpMeta = nextUp
    ? episodes.find(e => e.season_id === nextUp.season_id && e.episode_number === nextUp.episode_number)
    : null
  const nextUpUnaired = nextUp ? isUnaired(nextUpMeta?.air_date ?? null) : false

  // The hero's art and copy: the media row first, then TMDB for whatever the
  // row never stored. The row's columns arrive with migration 014, so `art`
  // is the same pair read in its own query.
  const backdropUrl = art?.backdrop_url ?? media.backdrop_url ?? tmdb?.backdrop_url ?? null
  const logoUrl = art?.logo_url ?? media.logo_url ?? tmdb?.logo_url ?? null
  const genres = media.genres.length > 0 ? media.genres : tmdb?.genres ?? []
  const castNames = media.cast_members.length > 0 ? media.cast_members : tmdb?.cast_members ?? []
  // TMDB's credits carry the headshots and characters; the names alone are
  // the fallback when it has none.
  const cast = tmdb?.cast_credits?.length
    ? tmdb.cast_credits.map((c) => ({ name: c.name, character: c.character, profileUrl: c.profile_url }))
    : castNames.map((name) => ({ name }))
  const flatrate = tmdb?.watch_providers?.flatrate?.[0]
  const platform = flatrate ? { name: flatrate.provider_name, logoUrl: flatrate.logo_path } : null

  // The ring measures the season the next episode is in; once everything is
  // watched, the last one.
  const ringSeason = (nextUp && seasons.find(s => s.id === nextUp.season_id)) ?? seasons[seasons.length - 1]
  const ringProgress = ringSeason ? seasonProgress(ringSeason, watchedKeys) : { watched: 0, total: 0 }

  // A show with episodes shows its progress in the hero and keeps the stars in
  // their own panel; one with none (not yet filled from TMDB) is just a watched
  // title, so its date and stars take the status slot instead.
  const ratingInHero = total === 0 && !!entry
  let status: TitleStatusValue | undefined
  if (total > 0) {
    status = {
      kind: 'progress',
      seasonNumber: ringSeason?.season_number ?? 1,
      seasonWatched: ringProgress.watched,
      seasonTotal: ringProgress.total,
      watched,
      total,
      minutesLeft,
      next: nextUp
        ? {
            seasonNumber: nextUp.season_number,
            episodeNumber: nextUp.episode_number,
            name: nextUpMeta?.name,
            stillUrl: nextUpMeta?.still_url,
            runtimeMins: nextUpMeta?.runtime_mins,
            airDate: nextUpMeta?.air_date,
            unaired: nextUpUnaired,
          }
        : null,
    }
  } else if (entry) {
    status = { kind: 'watched', watchedAt: entry.watched_at, rating, onRate: handleRatingChange, rewatch: entry.rewatch }
  }

  const markNext = nextUp != null && !nextUpUnaired
  const detailsButton = (
    <Button variant="secondary" size="lg" className="max-md:grow" onClick={openDetails}>
      <Info className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
      <span>Details</span>
    </Button>
  )

  return (
    <div className="space-y-6">
      <AmbientBackdrop src={backdropUrl} />
      {/* Show pages are the ones people deep-link into — from Continue Watching,
          a shared link, a bookmark — so the history-length fallback matters most
          here. router.back() on a fresh tab leaves the page. */}
      <BackButton fallback="/library" />

      <TitleHero
        title={media.title}
        type="show"
        backdropUrl={backdropUrl}
        logoUrl={logoUrl}
        posterUrl={media.poster_url}
        tagline={tmdb?.tagline}
        overview={media.overview}
        certification={tmdb?.certification}
        year={media.release_year}
        genres={genres}
        tmdbScore={tmdb?.vote_average ?? media.vote_average}
        platform={platform}
        preload
        status={status && <TitleStatus status={status} />}
        actions={
          <>
            {nextUp && !nextUpUnaired && (
              // The primary action is the next episode. Under md it takes the
              // whole row, as the reference's does, and the secondaries grow
              // to fill their rows evenly rather than wrapping ragged.
              <div className="max-md:basis-full">
                <Button size="lg" fullWidth onClick={() => handleProgressChange(nextUp.season_id, nextUp.episode_number, true)}>
                  <Check className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                  <span>Mark E{nextUp.episode_number} watched</span>
                </Button>
              </div>
            )}
            {total > 0 && (
              // A link cannot wrap a <button>, so it wears the secondary pill's
              // classes, as EmptyState's action link does.
              <a
                href="#episodes"
                className="btn glass-btn inline-flex items-center justify-center gap-2 text-[var(--text-primary)] max-md:grow"
                style={{
                  minHeight: 48,
                  padding: '0 20px',
                  fontSize: 'var(--text-body)',
                  fontWeight: 'var(--weight-semibold)' as React.CSSProperties['fontWeight'],
                  textDecoration: 'none',
                }}
              >
                Episodes
              </a>
            )}
            {!entry && (
              <Button
                variant={markNext ? 'secondary' : 'primary'}
                size="lg"
                className="max-md:grow"
                onClick={handleMarkShowWatched}
                disabled={markingWatched}
              >
                {markingWatched
                  ? <Loader2 className="h-[18px] w-[18px] animate-spin" strokeWidth={1.8} aria-hidden="true" />
                  : <Check className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />}
                <span>Mark show as watched</span>
              </Button>
            )}
            {detailsButton}
          </>
        }
      />

      {total > 0 && (
        // The anchor target clears the phone shell's fixed top bar (64px),
        // which would otherwise cover the heading after the jump.
        <Card as="section" variant="panel" id="episodes" aria-labelledby="episodes-heading" className="scroll-mt-6 max-md:scroll-mt-20">
          <SectionHeader id="episodes-heading" title="Episodes" />
          <EpisodeTracker
            seasons={seasons}
            progress={progress}
            episodes={episodes}
            onProgressChange={handleProgressChange}
          />
        </Card>
      )}

      {((entry && !ratingInHero) || platform) && (
        // Two columns only when both panels render; "Where to watch" on its
        // own takes the full width rather than leaving an empty half.
        <div className={`grid gap-6 ${entry && !ratingInHero && platform ? 'md:grid-cols-2' : ''}`}>
          {entry && !ratingInHero && (
            <Card as="section" variant="panel" aria-labelledby="rating-heading">
              <SectionHeader id="rating-heading" title="Your rating" sub={`Watched ${formatDateLabel(entry.watched_at)}${entry.rewatch ? ' · Rewatch' : ''}`} />
              <div className="flex flex-col gap-3" style={{ paddingLeft: 4 }}>
                <RatingStars value={rating} onChange={handleRatingChange} />
                {entry.review && (
                  <p
                    style={{
                      margin: 0,
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--glass-inset-card)',
                      boxShadow: 'var(--glass-inset-card-edge)',
                      fontSize: 'var(--text-base)',
                      lineHeight: '20px',
                      fontStyle: 'italic',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {entry.review}
                  </p>
                )}
              </div>
            </Card>
          )}
          {platform && (
            <Card as="section" variant="panel" aria-labelledby="streaming-heading">
              <SectionHeader id="streaming-heading" title="Where to watch" />
              <StreamingRow provider={platform} link={tmdb?.watch_providers?.link} />
            </Card>
          )}
        </div>
      )}

      {cast.length > 0 && (
        <Card as="section" variant="panel" aria-label="Cast">
          <CastStrip cast={cast} />
        </Card>
      )}

      {similar.length > 0 && (
        <Card as="section" variant="panel" aria-label={SIMILAR_TITLE}>
          <MoreLikeThisRail title={SIMILAR_TITLE} items={similar} onSelect={(item) => openMedia(item)} />
        </Card>
      )}
    </div>
  )
}
