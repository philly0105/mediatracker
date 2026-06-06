'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, BookmarkCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import MediaInfoModal from './MediaInfoModal'
import type { TmdbCollectionPart, TmdbSearchResult } from '@/types'
import SelectableOverlay from './SelectableOverlay'

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
      <motion.div
        whileHover={{ scale: 1.015, y: -2 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="glass-card rounded-2xl overflow-hidden cursor-pointer relative select-none"
        onClick={() => setShowInfo(true)}
      >
        <div className="relative aspect-[2/3]">
          {part.poster_url ? (
            <img
              src={part.poster_url}
              alt={part.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
              <span className="text-xs text-zinc-600">No Poster</span>
            </div>
          )}
          {(isWatched || isWatchlisted) && (
            <div className="absolute top-2 right-2">
              {isWatched ? (
                <div className="bg-black/60 rounded-full p-0.5">
                  <CheckCircle2 className="w-4 h-4 text-violet-400" />
                </div>
              ) : (
                <div className="bg-black/60 rounded-full p-0.5">
                  <BookmarkCheck className="w-4 h-4 text-orange-400" />
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-semibold text-white text-sm line-clamp-2 leading-snug">{part.title}</p>
          {part.release_year && (
            <p className="text-xs text-zinc-500 mt-0.5">{part.release_year}</p>
          )}
        </div>
      </motion.div>
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
