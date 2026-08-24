'use client'
import { useRouter } from 'next/navigation'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import { useMediaModal } from '@/components/MediaModalProvider'
import { mediaToResult } from '@/lib/mediaToResult'
import SelectableOverlay from './SelectableOverlay'
import { PosterCard } from '@/components/ui/PosterCard'
import { formatDateLabel } from '@/lib/formatDate'

interface Props {
  entries: WatchEntry[]
}

export default function DashboardRecentCards({ entries }: Props) {
  const router = useRouter()

  const { openMedia, closeMedia } = useMediaModal()

  function toResult(entry: WatchEntry): TmdbSearchResult {
    const media = entry.media!
    return mediaToResult(media)
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {entries.map((entry, index) => (
          <SelectableOverlay key={entry.id} item={toResult(entry)}>
            <PosterCard
              title={entry.media?.title || ''}
              year={entry.media?.release_year ?? undefined}
              posterUrl={entry.media?.poster_url}
              rating={entry.rating}
              overlay={formatDateLabel(entry.watched_at)}
              // Only the first poster receives preload as the primary LCP candidate.
              preload={index === 0}
              onClick={() => openMedia(toResult(entry), {
                // Both actions closed the modal here; only 'watched' refreshed,
                // because only that changes what this row renders.
                onChanged: (change) => {
                  if (change === 'watched') router.refresh()
                  closeMedia()
                },
              })}
            />
          </SelectableOverlay>
        ))}
      </div>

    </>
  )
}
