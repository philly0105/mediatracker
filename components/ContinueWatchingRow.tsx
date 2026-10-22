'use client'

import { useState, type ReactNode } from 'react'
import { findNextUp } from '@/lib/nextUp'
import { useToast } from '@/components/ToastProvider'
import { useMediaModal } from '@/components/MediaModalProvider'
import AmbientBackdrop from '@/components/AmbientBackdrop'
import HomeHero from '@/components/home/HomeHero'
import UpNextPanel from '@/components/home/UpNextPanel'
import type { NextEpisodeDetails } from '@/lib/nextEpisode'
import type { Episode } from '@/types'
import type { ContinueWatchingNextUp, ContinueWatchingShow } from '@/components/home/types'

export type {
  ContinueWatchingNextUp,
  ContinueWatchingSeason,
  ContinueWatchingShow,
  ContinueWatchingTmdb,
} from '@/components/home/types'

type Props = {
  shows: ContinueWatchingShow[]
  /** The "Coming soon" panel, laid out beside "Up next". */
  comingSoon?: ReactNode
  /** Takes the hero's place when nothing is in progress. */
  emptyHero?: ReactNode
}

const episodeKey = (nextUp: ContinueWatchingNextUp) => `${nextUp.season_id}-${nextUp.episode_number}`

/**
 * The shows in progress: the first as the hero, the rest in the "Up next"
 * panel, with one owner for the mark-watched state so a check in either place
 * advances the same list. The hero's backdrop is also the page's ambient
 * layer, registered here so it follows the hero as shows finish.
 */
export default function ContinueWatchingRow({ shows, comingSoon, emptyHero }: Props) {
  const [items, setItems] = useState(() =>
    shows.flatMap((show) => {
      const watchedKeys = new Set(show.watchedEpisodeKeys)
      const nextUp = findNextUp(show.seasons, watchedKeys) ?? show.nextUp
      return nextUp ? [{ ...show, nextUp }] : []
    })
  )
  const [loadingById, setLoadingById] = useState<Record<string, boolean>>({})
  const [errorById, setErrorById] = useState<Record<string, boolean>>({})
  // Episode details by "seasonId-episodeNumber", seeded with what the server
  // sent for each show's next-up episode. Marking one watched moves a show
  // to an episode the server never described, so that fills from the show's
  // cached episode list on demand.
  const [details, setDetails] = useState<Record<string, NextEpisodeDetails | null>>(() => {
    const seeded: Record<string, NextEpisodeDetails | null> = {}
    for (const show of shows) {
      if (show.nextEpisode !== undefined) seeded[episodeKey(show.nextUp)] = show.nextEpisode
    }
    return seeded
  })
  const { toast } = useToast()
  const { openMedia } = useMediaModal()

  const detailsFor = (show: ContinueWatchingShow) => details[episodeKey(show.nextUp)] ?? null

  // The episode list is what /show/[id] reads (and fills from TMDB the first
  // time), so this is the same cache the show page would warm. A miss costs
  // the card its name and still, not the advance.
  async function loadEpisodeDetails(mediaId: string): Promise<Record<string, NextEpisodeDetails | null>> {
    try {
      const response = await fetch(`/api/episodes/meta?media_id=${encodeURIComponent(mediaId)}`)
      if (!response.ok) return {}
      const payload = (await response.json()) as { episodes?: Episode[] }
      const loaded: Record<string, NextEpisodeDetails | null> = {}
      for (const episode of payload.episodes ?? []) {
        loaded[`${episode.season_id}-${episode.episode_number}`] = {
          name: episode.name,
          runtime_mins: episode.runtime_mins,
          air_date: episode.air_date,
          still_url: episode.still_url,
          overview: episode.overview,
        }
      }
      return loaded
    } catch {
      return {}
    }
  }

  async function markWatched(show: ContinueWatchingShow) {
    const currentNextUp = show.nextUp
    const snapshotItem = show
    const snapshotIndex = items.findIndex((item) => item.media.id === show.media.id)
    setLoadingById((prev) => ({ ...prev, [show.media.id]: true }))
    setErrorById((prev) => ({ ...prev, [show.media.id]: false }))

    try {
      const response = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: currentNextUp.season_id,
          episode_number: currentNextUp.episode_number,
        }),
      })

      if (!response.ok) throw new Error('Failed to mark episode watched')

      const watchedKeys = new Set(show.watchedEpisodeKeys)
      watchedKeys.add(episodeKey(currentNextUp))
      const nextUp = findNextUp(show.seasons, watchedKeys)
      if (nextUp && !(episodeKey(nextUp) in details)) {
        const loaded = await loadEpisodeDetails(show.media.id)
        setDetails((prev) => ({ ...loaded, ...prev }))
      }

      setItems((prev) =>
        prev.flatMap((item) => {
          if (item.media.id !== show.media.id) return [item]
          if (!nextUp) return []
          return [{ ...item, watchedEpisodeKeys: Array.from(watchedKeys), nextUp }]
        })
      )

      toast(
        `Marked ${show.media.title} S${currentNextUp.season_number} E${currentNextUp.episode_number} as watched.`,
        {
          tone: 'success',
          action: { label: 'Undo', onClick: () => undoMarkWatched(snapshotItem, snapshotIndex, currentNextUp) },
        }
      )
    } catch {
      setErrorById((prev) => ({ ...prev, [show.media.id]: true }))
    } finally {
      setLoadingById((prev) => ({ ...prev, [show.media.id]: false }))
    }
  }

  // Restores the exact pre-action card: the episode is un-marked server-side
  // and the snapshot replaces (or re-inserts, if the advance removed a finished
  // show) the current card. Indexes may have drifted if other cards changed;
  // clamping to the list length keeps the restore stable rather than perfect.
  async function undoMarkWatched(
    snapshotItem: ContinueWatchingShow,
    snapshotIndex: number,
    nextUp: ContinueWatchingNextUp
  ) {
    try {
      const response = await fetch('/api/episodes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: nextUp.season_id,
          episode_number: nextUp.episode_number,
        }),
      })
      if (!response.ok) throw new Error('Failed to undo')

      setItems((prev) => {
        const existing = prev.findIndex((item) => item.media.id === snapshotItem.media.id)
        if (existing !== -1) {
          return prev.map((item, i) => (i === existing ? snapshotItem : item))
        }
        const insertAt = Math.min(Math.max(snapshotIndex, 0), prev.length)
        return [...prev.slice(0, insertAt), snapshotItem, ...prev.slice(insertAt)]
      })
    } catch {
      toast('Could not undo — the episode is still marked watched.', { tone: 'error' })
    }
  }

  // Rate and "add to a list" both go through the media modal, which already
  // has the rating stars and the watchlist action; there is no separate
  // rate-only surface to open.
  function openDetails(show: ContinueWatchingShow) {
    const { media, tmdb } = show
    if (media.tmdb_id == null) return
    openMedia({
      tmdb_id: media.tmdb_id,
      type: 'show',
      title: media.title,
      overview: '',
      poster_url: media.poster_url,
      release_year: tmdb?.release_year ?? null,
      genres: tmdb?.genres,
      vote_average: tmdb?.vote_average ?? undefined,
    })
  }

  const hero = items[0]
  const rest = items.slice(1)
  const heroBackdrop = hero ? hero.art?.backdrop_url ?? hero.tmdb?.backdrop_url ?? null : null

  return (
    <>
      <AmbientBackdrop src={heroBackdrop} />
      {hero ? (
        <HomeHero
          show={hero}
          details={detailsFor(hero)}
          loading={loadingById[hero.media.id] ?? false}
          failed={errorById[hero.media.id] ?? false}
          onMarkWatched={() => markWatched(hero)}
          onOpenDetails={hero.media.tmdb_id != null ? () => openDetails(hero) : undefined}
        />
      ) : (
        emptyHero
      )}
      {(rest.length > 0 || comingSoon) && (
        <div className="flex flex-wrap items-stretch" style={{ gap: 24 }}>
          {rest.length > 0 && (
            <UpNextPanel
              shows={rest}
              detailsFor={detailsFor}
              loadingById={loadingById}
              errorById={errorById}
              onMarkWatched={markWatched}
            />
          )}
          {comingSoon}
        </div>
      )}
    </>
  )
}
