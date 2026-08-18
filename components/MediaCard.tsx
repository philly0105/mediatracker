'use client'
import { useState } from 'react'
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
import { PosterCard } from './ui/PosterCard'
import { useTmdbRating } from '@/lib/tmdbRatings'

interface Props {
  entry: WatchEntry
  // 'row' renders the detailed MediaRow (default); 'poster' renders a
  // compact PosterCard for the library's grid view.
  view?: 'row' | 'poster'
  // Called after this entry is removed or edited. MediaCard is rendered by
  // LibraryView, which holds its rows in client state fetched from /api/watch —
  // router.refresh() re-renders the server tree and does not re-run that fetch,
  // so without these the card stays on screen after it has been deleted.
  onDeleted?: (entryId: string) => void
  onUpdated?: () => void
}

export default function MediaCard({ entry, onDeleted, onUpdated, view = 'row' }: Props) {
  const media = entry.media!
  const router = useRouter()
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Batched across every card on the page — see lib/tmdbRatings.
  const tmdbRating = useTmdbRating(media.tmdb_id, media.type, media.vote_average ?? null)

  const { addToWatchlist, markWatched } = useMediaActions({ priority: 'want_to_watch' })

  const mediaAsResult = mediaToResult(media, { vote_average: tmdbRating })

  async function handleRatingChange(newRating: number | null) {
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
      {view === 'poster' ? (
        <div className="relative group/poster">
          <PosterCard
            title={media.title}
            year={media.release_year ?? undefined}
            posterUrl={media.poster_url}
            rating={rating}
            onClick={() => { if (!showInfo) setShowInfo(true) }}
          />
          {/* Edit/delete float OUTSIDE the PosterCard (its root is a <button>;
              nesting buttons is invalid HTML). Same hover-chip treatment as the
              watchlist cards: always visible on touch, hover-revealed on md+. */}
          <div
            className="absolute top-2 right-2 z-10 flex gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-sm border border-[var(--border-subtle)] opacity-100 md:opacity-0 md:group-hover/poster:opacity-100 md:focus-within:opacity-100 transition-opacity duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              title="Edit entry"
              aria-label="Edit entry"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              title="Delete entry"
              aria-label="Delete entry"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <MediaRow
          title={media.title}
          year={media.release_year ?? undefined}
          type={media.type as 'movie' | 'show'}
          posterUrl={media.poster_url}
          rating={rating}
          onRate={handleRatingChange}
          review={entry.review}
          watchedAt={entry.watched_at}
          tmdbRating={tmdbRating}
          onClick={() => { if (!showInfo) setShowInfo(true) }}
          actions={
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                title="Edit entry"
                aria-label="Edit entry"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                title="Delete entry"
                aria-label="Delete entry"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          }
        />
      )}

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

