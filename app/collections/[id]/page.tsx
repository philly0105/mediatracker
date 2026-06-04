import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCollectionDetails } from '@/lib/tmdb'
import CollectionMovieCard from '@/components/CollectionMovieCard'

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const collectionId = parseInt(id)
  if (isNaN(collectionId)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
      <Link
        href="/collections"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Collections
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        {collection.backdrop_url ? (
          <img
            src={collection.backdrop_url}
            alt={collection.name}
            className="w-full h-48 sm:h-64 object-cover"
          />
        ) : (
          <div className="w-full h-48 sm:h-64 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 flex items-end gap-4">
          {collection.poster_url && (
            <img
              src={collection.poster_url}
              alt={collection.name}
              className="hidden sm:block w-20 rounded-xl border border-white/10 shadow-lg shrink-0"
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
