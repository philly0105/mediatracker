import type { Metadata } from 'next'
import Image from 'next/image'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCollectionDetails } from '@/lib/tmdb'
import CollectionMovieCard from '@/components/CollectionMovieCard'
import BackButton from '@/components/BackButton'

// getCollectionDetails is fetch-cached for 7 days, so this shares the page's
// request rather than adding a second TMDB round-trip.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const collectionId = parseInt(id)
  if (isNaN(collectionId)) return { title: 'Franchise' }

  try {
    const collection = await getCollectionDetails(collectionId)
    return {
      title: collection.name,
      description: collection.overview || `${collection.parts.length} films in the ${collection.name}.`,
      // See the note in app/(app)/show/[id]/layout.tsx: setting images here
      // would suppress this segment's opengraph-image.tsx.
      openGraph: {
        title: `${collection.name} · DorfMovies`,
      },
    }
  } catch {
    return { title: 'Franchise' }
  }
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const collectionId = parseInt(id)
  if (isNaN(collectionId)) notFound()

  const user = await getAuthenticatedUser()
  if (!user) redirect('/login')
  const supabase = await createClient()

  let collection
  try {
    collection = await getCollectionDetails(collectionId)
  } catch {
    notFound()
  }

  const tmdbIds = collection.parts.map(p => p.tmdb_id)

  const { data: mediaRows } = tmdbIds.length > 0
    ? await supabase.from('media').select('id, tmdb_id').in('tmdb_id', tmdbIds)
    : { data: [] }

  const tmdbIdToMediaId = new Map((mediaRows ?? []).map(m => [m.tmdb_id as number, m.id as string]))
  const mediaIds = Array.from(tmdbIdToMediaId.values())

  const [{ data: watched }, { data: watchlisted }] = mediaIds.length > 0
    ? await Promise.all([
        supabase.from('watch_entries').select('media_id').eq('user_id', user.id).in('media_id', mediaIds),
        supabase.from('watchlist_items').select('media_id').eq('user_id', user.id).in('media_id', mediaIds),
      ])
    : [{ data: [] }, { data: [] }]

  const watchedMediaIds = new Set((watched ?? []).map(w => w.media_id))
  const watchlistedMediaIds = new Set((watchlisted ?? []).map(w => w.media_id))

  const watchedCount = collection.parts.filter(p => {
    const mediaId = tmdbIdToMediaId.get(p.tmdb_id)
    return mediaId !== undefined && watchedMediaIds.has(mediaId)
  }).length

  return (
    <div className="space-y-8">
      <BackButton label="Franchises" fallback="/collections" />

      {/* Hero */}
      <div className="relative rounded-[var(--radius-2xl)] overflow-hidden border border-white/5">
        {collection.backdrop_url ? (
          <Image
            src={collection.backdrop_url}
            alt={collection.name}
            width={1280}
            height={256}
            sizes="100vw"
            className="w-full h-48 sm:h-64 object-cover"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 bg-[var(--bg-void)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)] via-[var(--bg-void)]/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end gap-4">
          {collection.poster_url && (
            <Image
              src={collection.poster_url}
              alt={collection.name}
              width={80}
              height={120}
              className="hidden sm:block w-20 h-auto rounded-xl border border-white/10 shadow-lg shrink-0"
            />
          )}
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight drop-shadow-lg">
              {collection.name}
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              {watchedCount} of {collection.parts.length} watched
            </p>
          </div>
        </div>
      </div>

      {collection.overview && (
        <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">{collection.overview}</p>
      )}

      {/* Movie grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {collection.parts.map(part => {
          const mediaId = tmdbIdToMediaId.get(part.tmdb_id)
          return (
            <CollectionMovieCard
              key={part.tmdb_id}
              part={part}
              isWatched={mediaId !== undefined && watchedMediaIds.has(mediaId)}
              isWatchlisted={mediaId !== undefined && watchlistedMediaIds.has(mediaId)}
            />
          )
        })}
      </div>
    </div>
  )
}
