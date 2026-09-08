'use client'
import { useCallback, useEffect, useState } from 'react'
import type { MediaType } from '@/types'
import { mediaKey } from '@/lib/mediaKey'

type JoinedMedia = { tmdb_id?: number | null; type?: MediaType | null }
type JoinedRow = { media: JoinedMedia | JoinedMedia[] | null }

// The embed comes back as an object or a single-element array depending on how
// PostgREST resolves the relationship, so normalise both.
export function toIdSet(rows: JoinedRow[] | null): Set<string> {
  const ids = new Set<string>()
  for (const row of rows ?? []) {
    const media = Array.isArray(row.media) ? row.media[0] : row.media
    if (typeof media?.tmdb_id === 'number' && (media.type === 'movie' || media.type === 'show')) {
      ids.add(mediaKey(media.type, media.tmdb_id))
    }
  }
  return ids
}

type IdSets = { watched: Set<string>; watchlist: Set<string> }

// Session-lifetime cache. KeyboardShortcuts renders the overlay as
// `open ? <SearchOverlay/> : null`, so the hook remounts on every ⌘K; without
// this it re-fetched the whole id set each time. The promise is cached, not
// just the result, so two components mounting in the same tick share one
// request.
let cache: IdSets | null = null
let inFlight: Promise<IdSets> | null = null

function loadIds(): Promise<IdSets> {
  if (cache) return Promise.resolve(cache)
  if (inFlight) return inFlight

  inFlight = fetch('/api/library/ids')
    .then((res) => (res.ok ? res.json() : { watched: [], watchlist: [] }))
    .then((data: { watched?: string[]; watchlist?: string[] }) => {
      cache = {
        watched: new Set(data.watched ?? []),
        watchlist: new Set(data.watchlist ?? []),
      }
      return cache
    })
    .catch(() => ({ watched: new Set<string>(), watchlist: new Set<string>() }))
    .finally(() => { inFlight = null })

  return inFlight
}

export function useLibraryIds() {
  const [watchedIds, setWatchedIdsState] = useState<Set<string>>(() => cache?.watched ?? new Set())
  const [watchlistIds, setWatchlistIdsState] = useState<Set<string>>(() => cache?.watchlist ?? new Set())

  useEffect(() => {
    let active = true
    loadIds().then((ids) => {
      if (!active) return
      setWatchedIdsState(ids.watched)
      setWatchlistIdsState(ids.watchlist)
    })
    return () => { active = false }
  }, [])

  // Callers mark things watched and shortlisted from inside these overlays. The
  // update has to reach the cache too, or closing and reopening ⌘K would paint
  // the pre-action badges back.
  const setWatchedIds = useCallback((update: (prev: Set<string>) => Set<string>) => {
    setWatchedIdsState((prev) => {
      const next = update(prev)
      if (cache) cache.watched = next
      return next
    })
  }, [])

  const setWatchlistIds = useCallback((update: (prev: Set<string>) => Set<string>) => {
    setWatchlistIdsState((prev) => {
      const next = update(prev)
      if (cache) cache.watchlist = next
      return next
    })
  }, [])

  return { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds }
}
