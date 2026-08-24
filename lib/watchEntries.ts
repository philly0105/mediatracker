import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetchAllRows'
import type { WatchEntry } from '@/types'

// `overview` is deliberately absent: nothing in the library list renders it and
// the client-side search does not read it (lib/matchesLibraryQuery uses title,
// director, year, cast and genres), so it was several hundred bytes per row of
// pure wire weight. MediaInfoModal now takes the synopsis from
// /api/tmdb/details, which was already returning it unused.
export const WATCH_SELECT =
  'id, rating, review, watched_at, rewatch, created_at, media!inner(id, tmdb_id, type, title, poster_url, release_year, genres, vote_average, runtime_mins, director, cast_members)'
export const WATCH_SELECT_LEFT =
  'id, rating, review, watched_at, rewatch, created_at, media(id, tmdb_id, type, title, poster_url, release_year, genres, vote_average, runtime_mins, director, cast_members)'

export async function fetchWatchEntries({
  supabase,
  userId,
  type,
}: {
  supabase: SupabaseClient
  userId: string
  type?: string | null
}): Promise<{ entries: WatchEntry[]; error: string | null; truncated: boolean }> {
  const filterByType = type === 'movie' || type === 'show'

  // Paged rather than a single unbounded select: PostgREST caps a response at
  // 1000 rows and does not say so, which silently froze the Library at 1000
  // titles. The client still filters and sorts the whole set, so the shape of
  // the response is unchanged.
  const { rows, error, truncated } = await fetchAllRows((from, to) => {
    // !inner is what makes .eq('media.type') filter the parent rows. Without it
    // PostgREST filters only the embedded resource and returns every entry with
    // media: null on the non-matches.
    let query = supabase
      .from('watch_entries')
      .select(filterByType ? WATCH_SELECT : WATCH_SELECT_LEFT)
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      // Tiebreak: watched_at is a date, so same-day entries have no inherent
      // order and rows would drift between range windows without this.
      .order('id', { ascending: false })
      .range(from, to)

    if (filterByType) {
      query = query.eq('media.type', type)
    }

    return query
  })

  return { entries: rows as unknown as WatchEntry[], error, truncated }
}
