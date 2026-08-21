import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { fetchUpcomingReleases } from '@/lib/tmdb'
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

export default async function CalendarPage() {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  const { data: followedRows } = await supabase
    .from('followed_shows')
    .select('media(tmdb_id, title, poster_url, release_year, genres, overview)')
    .eq('user_id', user.id)

  const followedShows = ((followedRows ?? []) as unknown as FollowedRow[])
    .map(row => row.media)
    .filter((media): media is FollowedMedia => !!media && !!media.tmdb_id)

  const releases = await fetchUpcomingReleases({
    pages: { movie: 3, show: 2 },
    followedShows,
  })

  return <CalendarClient releases={releases} />
}