'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import EditEntryModal from './EditEntryModal'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import MediaInfoModal from './MediaInfoModal'
import SelectableOverlay from './SelectableOverlay'
import { MediaRow } from './ui/MediaRow'

interface Props {
  entry: WatchEntry
  hideWatchedDate?: boolean
}

export default function MediaCard({ entry, hideWatchedDate }: Props) {
  const media = entry.media!
  const router = useRouter()
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [tmdbRating, setTmdbRating] = useState<number | null>(media.vote_average ?? null)

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

  const mediaAsResult: TmdbSearchResult = {
    tmdb_id: media.tmdb_id,
    type: media.type,
    title: media.title,
    overview: media.overview ?? '',
    poster_url: media.poster_url,
    release_year: media.release_year,
    genres: media.genres,
    vote_average: tmdbRating ?? media.vote_average ?? undefined,
  }

  async function handleRatingChange(newRating: number) {
    setRating(newRating)
    await fetch('/api/watch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, rating: newRating }),
    })
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this entry?')) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/watch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
      setIsDeleting(false)
    }
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
        <EditEntryModal entry={entry} onClose={() => setShowEditModal(false)} />,
        document.body
      )}
      {showInfo && createPortal(
        <MediaInfoModal
          item={mediaAsResult}
          onClose={() => setShowInfo(false)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: media.tmdb_id, type: media.type, priority: 'want_to_watch' }),
            })
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: media.tmdb_id, type: media.type, watched_at: new Date().toISOString().split('T')[0] }),
            })
            router.refresh()
          }}
        />,
        document.body
      )}
    </SelectableOverlay>
  )
}

