'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { TmdbCollectionSummary } from '@/types'

export default function PopularCollectionsFeed() {
  const [collections, setCollections] = useState<TmdbCollectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [batch, setBatch] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const seenIds = useRef(new Set<number>())

  async function fetchBatch(batchNum: number, isLoadMore = false) {
    isLoadMore ? setLoadingMore(true) : setLoading(true)
    try {
      const res = await fetch(`/api/tmdb/popular-collections?batch=${batchNum}`)
      if (!res.ok) return
      const data = await res.json()
      const fresh = (data.collections as TmdbCollectionSummary[]).filter(c => {
        if (seenIds.current.has(c.id)) return false
        seenIds.current.add(c.id)
        return true
      })
      if (fresh.length === 0) setHasMore(false)
      setCollections(prev => isLoadMore ? [...prev, ...fresh] : fresh)
    } finally {
      isLoadMore ? setLoadingMore(false) : setLoading(false)
    }
  }

  useEffect(() => { fetchBatch(1) }, [])

  function handleLoadMore() {
    const next = batch + 1
    setBatch(next)
    fetchBatch(next, true)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="glass-card rounded-2xl aspect-video animate-pulse bg-white/5" />
        ))}
      </div>
    )
  }

  if (collections.length === 0) {
    return <p className="text-zinc-500 text-sm italic pl-1">No popular collections found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {collections.map(c => (
          <Link key={c.id} href={`/collections/${c.id}`}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="glass-card rounded-2xl overflow-hidden cursor-pointer"
            >
              <div className="relative aspect-video">
                {c.backdrop_url ? (
                  <img src={c.backdrop_url} alt={c.name} className="w-full h-full object-cover" />
                ) : c.poster_url ? (
                  <img src={c.poster_url} alt={c.name} className="w-full h-full object-contain bg-zinc-900" />
                ) : (
                  <div className="w-full h-full bg-zinc-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <p className="absolute bottom-2 left-3 right-3 text-white text-sm font-bold line-clamp-2 leading-snug drop-shadow-md">
                  {c.name}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-6 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 active:scale-95 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
            {loadingMore ? 'Loading...' : 'Show More'}
          </button>
        </div>
      )}
    </div>
  )
}
