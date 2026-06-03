'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import RatingStars from './RatingStars'
import EditEntryModal from './EditEntryModal'
import type { WatchEntry, TmdbSearchResult } from '@/types'
import { Calendar, Play, FileText, Pencil, Trash2, Loader2 } from 'lucide-react'
import MediaInfoModal from './MediaInfoModal'

interface Props {
  entry: WatchEntry
}

export default function MediaCard({ entry }: Props) {
  const media = entry.media!
  const router = useRouter()
  const href = media.type === 'show' ? `/show/${media.id}` : '#'
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const mediaAsResult: TmdbSearchResult = {
    tmdb_id: media.tmdb_id,
    type: media.type,
    title: media.title,
    overview: media.overview ?? '',
    poster_url: media.poster_url,
    release_year: media.release_year,
    genres: media.genres,
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
    <motion.div
      whileHover={{ scale: 1.015, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-card rounded-2xl overflow-hidden flex gap-4 p-3.5 backdrop-blur-md select-none cursor-pointer"
      onClick={() => { if (!showInfo) setShowInfo(true) }}
    >
      {media.poster_url ? (
        <img
          src={media.poster_url}
          alt={media.title}
          className="w-16 h-24 rounded-xl object-cover shadow-md shadow-black/30 border border-white/5"
        />
      ) : (
        <div className="w-16 h-24 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-600">
          No Poster
        </div>
      )}
      
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {media.type === 'show' ? (
                <Link
                  href={href}
                  className="font-bold text-white hover:text-rose-400 transition-colors line-clamp-2 text-sm leading-snug group flex items-start gap-1"
                >
                  <span>{media.title}</span>
                  <Play className="w-3 h-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity fill-rose-500/20 shrink-0 mt-0.5" />
                </Link>
              ) : (
                <p className="font-bold text-white line-clamp-2 text-sm leading-snug">{media.title}</p>
              )}
            </div>
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded border border-white/[0.03]">
              {media.type === 'show' ? 'TV' : 'Movie'}
            </span>
            {media.release_year && (
              <span className="text-[10px] text-zinc-500">{media.release_year}</span>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="scale-90 origin-left" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
            <RatingStars value={rating} onChange={handleRatingChange} />
          </div>
          
          {entry.review && (
            <div className="flex items-start gap-1 text-[11px] text-zinc-400 bg-white/[0.02] border border-white/[0.04] p-1.5 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
              <p className="line-clamp-2 italic leading-relaxed">{entry.review}</p>
            </div>
          )}
          
          <div className="flex items-center gap-1 text-[10px] text-zinc-600">
            <Calendar className="w-3 h-3 text-zinc-700" />
            <span>Watched {entry.watched_at}</span>
          </div>
        </div>
      </div>

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
            setShowInfo(false)
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: media.tmdb_id, type: media.type, watched_at: new Date().toISOString().split('T')[0] }),
            })
            router.refresh()
            setShowInfo(false)
          }}
        />,
        document.body
      )}
    </motion.div>
  )
}

