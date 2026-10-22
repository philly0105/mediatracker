import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchUpcomingReleases } from '@/lib/tmdb'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { mediaKey } from '@/lib/mediaKey'
import CalendarClient from '@/components/CalendarClient'

export const metadata: Metadata = {
  title: 'Calendar',
  description: 'Upcoming episodes and releases from your watchlist.',
}

type FollowedRow = {
  media: {
    tmdb_id: number
    title: string
    poster_url: string | null
    release_year: number | null
    genres: string[] | null
    overview: string | null
  } | null
}

type FollowedMedia = NonNullable<FollowedRow['media']>

// PostgREST embeds come back as an object or a single-element array depending
// on the relationship, so handle both shapes (as /api/library/ids does).
type WatchlistMedia = { tmdb_id: number; type: 'movie' | 'show' }
type WatchlistRow = { media: WatchlistMedia | WatchlistMedia[] | null }

export default async function CalendarPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  // The watchlist read is paged like /api/library/ids: it only feeds the
  // bookmark on each row, and a silent 1000-row cut would show saved titles
  // as unsaved rather than fail.
  const [{ data: followedRows }, { rows: watchlistRows }] = await Promise.all([
    supabase
      .from('followed_shows')
      .select('media(tmdb_id, title, poster_url, release_year, genres, overview)')
      .eq('user_id', user.id),
    fetchAllRows<WatchlistRow>((from, to) =>
      supabase
        .from('watchlist_items')
        .select('media!inner(tmdb_id, type)')
        .eq('user_id', user.id)
        .order('id')
        .range(from, to)
    ),
  ])

  const followedShows = ((followedRows ?? []) as unknown as FollowedRow[])
    .map(row => row.media)
    .filter((media): media is FollowedMedia => !!media && !!media.tmdb_id)

  const onWatchlist = new Set(
    watchlistRows.flatMap(row => {
      const media = Array.isArray(row.media) ? row.media[0] : row.media
      return media ? [mediaKey(media.type, media.tmdb_id)] : []
    })
  )

  const releases = await fetchUpcomingReleases({
    pages: { movie: 3, show: 2 },
    followedShows,
  })

  return (
    <CalendarClient
      releases={releases.map(release => ({
        ...release,
        onWatchlist: onWatchlist.has(mediaKey(release.type, release.tmdb_id)),
      }))}
    />
  )
}
