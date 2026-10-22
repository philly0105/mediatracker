import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getCollectionDetails } from '@/lib/tmdb'
import CollectionMovieCard from '@/components/CollectionMovieCard'
import BackButton from '@/components/BackButton'
import AmbientBackdrop from '@/components/AmbientBackdrop'
import { SegmentedProgress } from '@/components/ui/SegmentedProgress'

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
    <div className="space-y-6">
      {/* The page is about this franchise, so its backdrop tints the canvas. */}
      <AmbientBackdrop src={collection.backdrop_url} />

      <BackButton label="Franchises" fallback="/collections" />

      {/* Header: the Home hero at a smaller scale. A glass frame around the
          sharp backdrop, with the facts on a smoked slab over the art. Under
          the content breakpoint the art sits above the slab instead. */}
      <section aria-labelledby="collection-title" className="glass-panel glass-rim" style={{ padding: 8 }}>
        <div
          className="relative flex flex-col overflow-hidden rounded-[var(--radius-row)] md:block md:min-h-[280px]"
          style={{ background: 'var(--bg-deep)' }}
        >
          {collection.backdrop_url && (
            <div className="relative h-[200px] w-full md:absolute md:inset-0 md:h-auto">
              <Image
                src={collection.backdrop_url}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 767px) 100vw, 1136px"
                className="object-cover"
                style={{ objectPosition: '50% 25%' }}
              />
            </div>
          )}
          <div className="glass-slab glass-rim relative z-[1] flex gap-5 rounded-none p-5 md:m-4 md:max-w-[560px] md:rounded-[var(--radius-slab)] md:p-6">
            {collection.poster_url && (
              <Image
                src={collection.poster_url}
                alt=""
                aria-hidden="true"
                width={96}
                height={144}
                className="hidden sm:block w-20 md:w-24 h-auto shrink-0 self-start rounded-[var(--radius-md)] object-cover"
                style={{ boxShadow: 'var(--shadow-sm)' }}
              />
            )}
            <div className="min-w-0 flex-1">
              <h1
                id="collection-title"
                className="text-[length:var(--text-2xl)] leading-[30px] md:text-[length:var(--text-3xl)] md:leading-[34px]"
                style={{
                  margin: 0,
                  fontWeight: 'var(--weight-heading)' as CSSProperties['fontWeight'],
                  letterSpacing: 'var(--tracking-tight)',
                  color: 'var(--text-primary)',
                }}
              >
                {collection.name}
              </h1>
              <p
                className="tabular"
                style={{
                  margin: '6px 0 0',
                  fontSize: 'var(--text-body)',
                  lineHeight: '20px',
                  fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
                  color: 'var(--text-primary)',
                }}
              >
                {watchedCount} of {collection.parts.length} watched
              </p>
              {/* The line above already carries the count. */}
              <SegmentedProgress
                value={watchedCount}
                max={collection.parts.length}
                count={false}
                aria-label={`${watchedCount} of ${collection.parts.length} films watched`}
                style={{ marginTop: 10 }}
              />
              {collection.overview && (
                <p style={{ margin: '14px 0 0', fontSize: 'var(--text-base)', lineHeight: '20px', color: 'var(--text-secondary)' }}>
                  {collection.overview}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Movie grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
