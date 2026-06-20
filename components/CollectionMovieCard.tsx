'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import MediaInfoModal from './MediaInfoModal'
import type { TmdbCollectionPart, TmdbSearchResult } from '@/types'
import SelectableOverlay from './SelectableOverlay'
import { PosterCard } from './ui/PosterCard'
import { Badge } from './ui/Badge'

interface Props {
  part: TmdbCollectionPart
  isWatched: boolean
  isWatchlisted: boolean
}

export default function CollectionMovieCard({ part, isWatched, isWatchlisted }: Props) {
  const [showInfo, setShowInfo] = useState(false)
  const router = useRouter()

  const item: TmdbSearchResult = {
    tmdb_id: part.tmdb_id,
    type: 'movie',
    title: part.title,
    overview: part.overview,
    poster_url: part.poster_url,
    release_year: part.release_year,
  }

  return (
    <>
      <SelectableOverlay item={item}>
        <PosterCard
          title={part.title}
          year={part.release_year ?? undefined}
          posterUrl={part.poster_url}
          onClick={() => setShowInfo(true)}
        >
          {(isWatched || isWatchlisted) && (
            <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>
              {isWatched ? (
                <Badge tone="success">Watched</Badge>
              ) : (
                <Badge tone="rating">Watchlisted</Badge>
              )}
            </div>
          )}
        </PosterCard>
      </SelectableOverlay>

      {showInfo && createPortal(
        <MediaInfoModal
          item={item}
          onClose={() => setShowInfo(false)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: part.tmdb_id, type: 'movie', priority: 'want_to_watch' }),
            })
            setShowInfo(false)
            router.refresh()
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                tmdb_id: part.tmdb_id,
                type: 'movie',
                watched_at: new Date().toISOString().split('T')[0],
              }),
            })
            setShowInfo(false)
            router.refresh()
          }}
        />,
        document.body
      )}
    </>
  )
}
