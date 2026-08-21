'use client'
import { useCallback, useEffect, useState } from 'react'

type JoinedRow = { media: { tmdb_id: number } | { tmdb_id: number }[] | null }

// The embed comes back as an object or a single-element array depending on how
// PostgREST resolves the relationship, so normalise both.
export function toIdSet(rows: JoinedRow[] | null): Set<number> {
  return new Set(
    (rows ?? [])
      .map((row) => (Array.isArray(row.media) ? row.media[0] : row.media)?.tmdb_id)
      .filter((id): id is number => typeof id === 'number')
  )
}

type IdSets = { watched: Set<number>; watchlist: Set<number> }

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
    .then((data: { watched?: number[]; watchlist?: number[] }) => {
      cache = {
        watched: new Set(data.watched ?? []),
        watchlist: new Set(data.watchlist ?? []),
      }
      return cache
    })
    .catch(() => ({ watched: new Set<number>(), watchlist: new Set<number>() }))
    .finally(() => { inFlight = null })

  return inFlight
}

export function useLibraryIds() {
  const [watchedIds, setWatchedIdsState] = useState<Set<number>>(() => cache?.watched ?? new Set())
  const [watchlistIds, setWatchlistIdsState] = useState<Set<number>>(() => cache?.watchlist ?? new Set())

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
  const setWatchedIds = useCallback((update: (prev: Set<number>) => Set<number>) => {
    setWatchedIdsState((prev) => {
      const next = update(prev)
      if (cache) cache.watched = next
      return next
    })
  }, [])

  const setWatchlistIds = useCallback((update: (prev: Set<number>) => Set<number>) => {
    setWatchlistIdsState((prev) => {
      const next = update(prev)
      if (cache) cache.watchlist = next
      return next
    })
  }, [])

  return { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds }
}
