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
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="glass-card rounded-3xl w-full max-w-2xl overflow-hidden relative border border-white/15 max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
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

        {/* Grid */}
        <div className="overflow-y-auto p-5 scrollbar-none">
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2.5">
                  <div className="aspect-[2/3] rounded-2xl bg-zinc-900" />
                  <div className="h-3 bg-zinc-900 rounded w-4/5" />
                  <div className="h-2.5 bg-zinc-900 rounded w-2/5" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-10">No similar titles found.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.tmdb_id} className="flex flex-col gap-2.5">
                  {/* Poster */}
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt={item.title}
                      className="w-full aspect-[2/3] rounded-2xl object-cover border border-white/5 shadow-md shadow-black/40"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-xs text-zinc-600">
                      No Poster
                    </div>
                  )}

                  {/* Info */}
                  <div className="space-y-1 px-0.5">
                    <p className="text-xs font-semibold text-white leading-snug line-clamp-2">
                      {item.title}
                    </p>
                    <div className="flex items-center justify-between">
                      {item.release_year && (
                        <span className="text-[11px] text-zinc-500">{item.release_year}</span>
                      )}
                      {item.vote_average != null && item.vote_average > 0 && (
                        <span className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {item.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>
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
