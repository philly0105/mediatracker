'use client'
import { useRouter } from 'next/navigation'
import { Bookmark, Check } from 'lucide-react'
import { useMediaModal } from '@/components/MediaModalProvider'
import type { TmdbCollectionPart } from '@/types'
import { mediaToResult } from '@/lib/mediaToResult'
import SelectableOverlay from './SelectableOverlay'
import { PosterCard, PosterBadge } from './ui/PosterCard'

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
          {/* Top-right rather than the card's own badge slot: SelectableOverlay
              puts its checkbox in the top-left corner. */}
          {(isWatched || isWatchlisted) && (
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              {isWatched ? (
                <PosterBadge>
                  <Check size={12} strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--accent)' }} />
                  Watched
                </PosterBadge>
              ) : (
                <PosterBadge>
                  <Bookmark size={12} strokeWidth={1.8} aria-hidden="true" />
                  Watchlisted
                </PosterBadge>
              )}
            </div>
          )}
        </PosterCard>
      </SelectableOverlay>

    </>
  )
}
