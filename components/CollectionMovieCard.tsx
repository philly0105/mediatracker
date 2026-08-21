'use client'
import { useRouter } from 'next/navigation'
import { useMediaModal } from '@/components/MediaModalProvider'
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
  const router = useRouter()

  const { openMedia, closeMedia } = useMediaModal()

  // The old useMediaActions onDone closed the modal and refreshed on *either*
  // action, so both are preserved here rather than only on 'watched'.
  function openDetails() {
    openMedia(item, {
      onChanged: () => {
        closeMedia()
        router.refresh()
      },
    })
  }

  const item = mediaToResult(part, { type: 'movie' })

  return (
    <>
      <SelectableOverlay item={item}>
        <PosterCard
          title={part.title}
          year={part.release_year ?? undefined}
          posterUrl={part.poster_url}
          onClick={openDetails}
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

    </>
  )
}
