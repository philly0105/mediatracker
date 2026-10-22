'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import EditEntryModal from './EditEntryModal'
import type { WatchEntry } from '@/types'
import { useMediaModal } from '@/components/MediaModalProvider'
import { mediaToResult } from '@/lib/mediaToResult'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import SelectableOverlay from './SelectableOverlay'
import { MediaRow } from './ui/MediaRow'
import { PosterCard } from './ui/PosterCard'
import { useTmdbRating } from '@/lib/tmdbRatings'
import { useToast } from '@/components/ToastProvider'

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

// The edit and delete controls are quiet icon circles: transparent until
// hovered, delete turning red. The row gets the full 44px circle; the poster
// chip draws a tighter 36px circle so the pair does not cover half of a
// phone-width poster, and grows the hit area back to 44px with an invisible
// ::after (the chip's gap-2 keeps the two hit areas from overlapping).
const ICON_BTN =
  'inline-flex items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--glass-fill-hover)] disabled:opacity-40'
const ICON_BTN_DANGER = 'hover:text-[var(--danger)]'
const ICON_BTN_ROW = 'w-11 h-11'
const ICON_BTN_POSTER = "w-9 h-9 relative after:absolute after:-inset-1 after:content-['']"

export default function MediaCard({ entry, onDeleted, onUpdated, view = 'row' }: Props) {
  const media = entry.media!
  const router = useRouter()
  const { toast } = useToast()
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Batched across every card on the page — see lib/tmdbRatings.
  const tmdbRating = useTmdbRating(media.tmdb_id, media.type, media.vote_average ?? null)

  const { openMedia } = useMediaModal()

  // Marking watched from the modal changes what this row renders, so the route
  // is refreshed; adding to the watchlist does not.
  function openDetails() {
    openMedia(mediaAsResult, {
      onChanged: (change) => { if (change === 'watched') router.refresh() },
    })
  }

  const mediaAsResult = mediaToResult(media, { vote_average: tmdbRating })

  async function handleRatingChange(newRating: number | null) {
    const previous = rating
    setRating(newRating)
    try {
      const res = await fetch('/api/watch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, rating: newRating }),
      })
      if (!res.ok) throw new Error('Failed to save rating')
    } catch (err) {
      console.error(err)
      setRating(previous)
      toast('Could not save your rating.', { tone: 'error' })
    }
  }

  // The owner performs the delete so it can defer it behind an Undo. There is
  // no confirm() any more — an undo you can ignore beats a dialog you have to
  // dismiss every time.
  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    setIsDeleting(true)
    onDeleted?.(entry.id)
  }

  const size = view === 'poster' ? ICON_BTN_POSTER : ICON_BTN_ROW
  const actions = (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setShowEditModal(true); }}
        className={`${ICON_BTN} ${size}`}
        title="Edit entry"
        aria-label="Edit entry"
      >
        <Pencil className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
      </button>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`${ICON_BTN} ${ICON_BTN_DANGER} ${size}`}
        title="Delete entry"
        aria-label="Delete entry"
      >
        {isDeleting
          ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
          : <Trash2 className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />}
      </button>
    </>
  )

  return (
    <SelectableOverlay item={mediaAsResult}>
      {view === 'poster' ? (
        <div className="relative group/poster">
          <PosterCard
            title={media.title}
            year={media.release_year ?? undefined}
            posterUrl={media.poster_url}
            rating={rating}
            onClick={openDetails}
          />
          {/* Edit/delete float OUTSIDE the PosterCard (its root is a <button>;
              nesting buttons is invalid HTML) on the dark badge fill, which is
              the chip that reads over poster art. Always visible on touch,
              hover-revealed on md+. No blur: one of these per grid cell. */}
          <div
            className="absolute top-2 right-2 z-10 flex gap-2 p-0.5 rounded-[var(--radius-pill)] bg-[var(--glass-badge)] shadow-[var(--glass-badge-edge)] opacity-100 md:opacity-0 md:group-hover/poster:opacity-100 md:focus-within:opacity-100 transition-opacity duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
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
          onClick={openDetails}
          /* Stacked, so the pair takes one 44px column: side by side they
             squeezed the text column under the width of the rating control
             and its clear button slid beneath the pencil. */
          actions={<div className="flex flex-col items-center shrink-0">{actions}</div>}
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
    </SelectableOverlay>
  )
}
