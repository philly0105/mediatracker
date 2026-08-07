'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import MediaInfoModal from './MediaInfoModal'
import { useMediaActions } from '@/lib/useMediaActions'
import type { TmdbCollectionPart } from '@/types'
import { mediaToResult } from '@/lib/mediaToResult'
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

  const { addToWatchlist, markWatched } = useMediaActions({
    priority: 'want_to_watch',
    onDone: () => {
      setShowInfo(false)
      router.refresh()
    },
  })

  const item = mediaToResult(part, { type: 'movie' })

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
          onAddToWatchlist={async () => { await addToWatchlist(part.tmdb_id, 'movie') }}
          onMarkAsWatched={async () => { await markWatched(part.tmdb_id, 'movie') }}
        />,
        document.body
      )}
    </>
  )
}
