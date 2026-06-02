'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import RatingStars from './RatingStars'
import type { WatchEntry } from '@/types'
import { Calendar, Play, FileText } from 'lucide-react'

interface Props {
  entry: WatchEntry
}

export default function MediaCard({ entry }: Props) {
  const media = entry.media!
  const href = media.type === 'show' ? `/show/${media.id}` : '#'
  const [rating, setRating] = useState<number | null>(entry.rating ?? null)

  async function handleRatingChange(newRating: number) {
    setRating(newRating)
    await fetch('/api/watch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id, rating: newRating }),
    })
  }

  return (
    <motion.div
      whileHover={{ scale: 1.015, y: -2 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="glass-card rounded-2xl overflow-hidden flex gap-4 p-3.5 backdrop-blur-md select-none"
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
        <div>
          <div className="flex items-start justify-between gap-2">
            {media.type === 'show' ? (
              <Link
                href={href}
                className="font-bold text-white hover:text-rose-400 transition-colors line-clamp-1 text-sm flex items-center gap-1 group"
              >
                <span>{media.title}</span>
                <Play className="w-3 h-3 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity fill-rose-500/20" />
              </Link>
            ) : (
              <p className="font-bold text-white line-clamp-1 text-sm">{media.title}</p>
            )}
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded border border-white/[0.03]">
              {media.type}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">{media.release_year}</p>
        </div>

        <div className="space-y-1.5">
          <div className="scale-90 origin-left">
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
    </motion.div>
  )
}

