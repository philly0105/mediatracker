import { notFound, redirect } from 'next/navigation'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { loadShowDetails } from '@/lib/showDetails'
import { fetchMediaArt, type MediaArt } from '@/lib/mediaArt'
import { fetchTmdbDetails, fetchTmdbRecommendations } from '@/lib/tmdb'
import ShowDetailClient from '@/components/ShowDetailClient'

export default async function ShowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')

  const { id } = await params
  const supabase = await createClient()

  const details = await loadShowDetails({
    supabase,
    userId: user.id,
    mediaId: id,
  })

  if (!details) {
    notFound()
  }

  // The hero's art, tagline, rating and providers, and the "More like this"
  // rail. None of it is the page: a TMDB outage or a database without
  // migration 014 still renders the tracker, just plainer.
  const [art, tmdb, similar] = await Promise.all([
    fetchMediaArt(supabase, [id]).then((map) => map.get(id) ?? null).catch((): MediaArt | null => null),
    fetchTmdbDetails(details.media.tmdb_id, 'show').catch(() => null),
    fetchTmdbRecommendations(details.media.tmdb_id, 'show').catch(() => []),
  ])

  return (
    <ShowDetailClient
      key={id}
      mediaId={id}
      initialDetails={details}
      art={art}
      tmdb={tmdb}
      similar={similar.filter((item) => item.poster_url).slice(0, 12)}
    />
  )
}
