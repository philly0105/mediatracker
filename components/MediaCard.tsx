'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import EditEntryModal from './EditEntryModal'
import type { WatchEntry } from '@/types'
import { useMediaActions } from '@/lib/useMediaActions'
import { mediaToResult } from '@/lib/mediaToResult'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import MediaInfoModal from './MediaInfoModal'
import SelectableOverlay from './SelectableOverlay'
import { MediaRow } from './ui/MediaRow'

interface Props {
  entry: WatchEntry
  hideWatchedDate?: boolean
  // Called after this entry is removed or edited. MediaCard is rendered by
  // LibraryView, which holds its rows in client state fetched from /api/watch —
  // router.refresh() re-renders the server tree and does not re-run that fetch,
  // so without these the card stays on screen after it has been deleted.
  onDeleted?: (entryId: string) => void
  onUpdated?: () => void
}

export default function MediaCard({ entry, hideWatchedDate, onDeleted, onUpdated }: Props) {
  const media = entry.media!
  const router = useRouter()
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tmdbRating, setTmdbRating] = useState<number | null>(media.vote_average ?? null)

  const { addToWatchlist, markWatched } = useMediaActions({ priority: 'want_to_watch' })

  useEffect(() => {
    if (tmdbRating === null) {
      fetch(`/api/tmdb/rating?tmdb_id=${media.tmdb_id}&type=${media.type}`)
        .then(r => r.json())
        .then(d => {
          if (d.vote_average) setTmdbRating(d.vote_average)
        })
        .catch(() => {})
    }
  }, [media.tmdb_id, media.type, tmdbRating])

  const mediaAsResult = mediaToResult(media, { vote_average: tmdbRating })

  async function handleRatingChange(newRating: number) {
    setRating(newRating)
    await fetch('/api/watch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, rating: newRating }),
    })
  }

  // The owner performs the delete so it can defer it behind an Undo. There is
  // no confirm() any more — an undo you can ignore beats a dialog you have to
  // dismiss every time.
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setIsDeleting(true)
    onDeleted?.(entry.id)
  }

  return (
    <SelectableOverlay item={mediaAsResult}>
      <MediaRow
        title={media.title}
        year={media.release_year ?? undefined}
        type={media.type as 'movie' | 'show'}
        posterUrl={media.poster_url}
        rating={rating}
        onRate={handleRatingChange}
        review={entry.review}
        watchedAt={!hideWatchedDate ? entry.watched_at : null}
        tmdbRating={hideWatchedDate ? tmdbRating : null}
        onClick={() => { if (!showInfo) setShowInfo(true) }}
        actions={
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
              title="Edit entry"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Delete entry"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        }
      />

      {showEditModal && createPortal(
        <EditEntryModal
          entry={entry}
          onClose={() => setShowEditModal(false)}
          onSaved={onUpdated}
        />,
        document.body
      )}
      {showInfo && createPortal(
        <MediaInfoModal
          item={mediaAsResult}
          onClose={() => setShowInfo(false)}
          onAddToWatchlist={async () => { await addToWatchlist(media.tmdb_id, media.type) }}
          onMarkAsWatched={async (opts) => {
            await markWatched(media.tmdb_id, media.type, opts)
            router.refresh()
          }}
        />,
        document.body
      )}
    </SelectableOverlay>
  )
}

