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
  const sentinelRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore || loadingMore || loading) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const next = batch + 1
        setBatch(next)
        fetchBatch(next, true)
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [batch, hasMore, loadingMore, loading])

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
        <div ref={sentinelRef} className="flex justify-center h-8">
          {loadingMore && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
        </div>
      )}
    </div>
  )
}
