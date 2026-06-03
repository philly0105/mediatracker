'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Star } from 'lucide-react'
import type { TmdbSearchResult, MediaType } from '@/types'

interface Props {
  tmdbId: number
  type: MediaType
  onClose: () => void
}

export default function SimilarModal({ tmdbId, type, onClose }: Props) {
  const [items, setItems] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/tmdb/similar?id=${tmdbId}&type=${type}`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tmdbId, type])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="glass-card rounded-3xl w-full max-w-lg overflow-hidden relative border border-white/15 max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-bold text-white text-sm">
            Similar {type === 'movie' ? 'Movies' : 'TV Shows'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 scrollbar-none">
          {loading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="aspect-[2/3] rounded-xl bg-zinc-900" />
                  <div className="h-2.5 bg-zinc-900 rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-8">No similar titles found.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {items.map(item => (
                <div key={item.tmdb_id} className="space-y-1.5">
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="w-full aspect-[2/3] rounded-xl object-cover border border-white/5"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] text-zinc-600">
                      No Poster
                    </div>
                  )}
                  <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1">
                    {item.release_year && (
                      <span className="text-[10px] text-zinc-500">{item.release_year}</span>
                    )}
                    {item.vote_average != null && item.vote_average > 0 && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5 ml-auto">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        {item.vote_average.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
