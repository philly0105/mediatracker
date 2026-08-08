'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

export function useLibraryIds() {
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set())
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchLibraryIds() {
      const supabase = createClient()
      const [watchedRes, watchlistRes] = await Promise.all([
        supabase.from('watch_entries').select('media!inner(tmdb_id)'),
        supabase.from('watchlist_items').select('media!inner(tmdb_id)'),
      ])

      if (watchedRes.data) setWatchedIds(toIdSet(watchedRes.data as unknown as JoinedRow[]))
      if (watchlistRes.data) setWatchlistIds(toIdSet(watchlistRes.data as unknown as JoinedRow[]))
    }
    fetchLibraryIds()
  }, [])

  return { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds }
}
