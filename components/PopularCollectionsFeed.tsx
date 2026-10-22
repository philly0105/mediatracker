'use client'
import Image from 'next/image'
import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { TmdbCollectionSummary } from '@/types'
import { Skeleton } from '@/components/ui/Skeleton'

const CACHE_KEY = 'popular-collections-cache'

// 2/3/4 columns; the image `sizes` hints below describe exactly this grid.
const GRID = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6'

export default function PopularCollectionsFeed() {
  const [collections, setCollections] = useState<TmdbCollectionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [batch, setBatch] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const seenIds = useRef(new Set<number>())
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchBatch = useCallback(async (batchNum: number, isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true)
    else setLoading(true)
    try {
      const res = await fetch(`/api/tmdb/popular-collections?batch=${batchNum}`)
      if (!res.ok) return
      const data = await res.json()
      const fresh = (data.collections as TmdbCollectionSummary[]).filter(c => {
        if (seenIds.current.has(c.id)) return false
        seenIds.current.add(c.id)
        return true
      })
      const noMore = fresh.length === 0
      if (noMore) setHasMore(false)
      setCollections(prev => {
        const next = isLoadMore ? [...prev, ...fresh] : fresh
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ collections: next, batch: batchNum, hasMore: !noMore }))
        } catch {}
        return next
      })
    } finally {
      if (isLoadMore) setLoadingMore(false)
      else setLoading(false)
    }
  }, [])

  // Safely restore cache or fetch batch 1 on client mount without hydration mismatch
  useEffect(() => {
    let restored = false
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed.collections) && parsed.collections.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCollections(parsed.collections)
          setBatch(parsed.batch ?? 1)
          setHasMore(parsed.hasMore ?? true)
          setLoading(false)
          parsed.collections.forEach((c: TmdbCollectionSummary) => seenIds.current.add(c.id))
          restored = true
        }
      }
    } catch {}
    if (!restored) {
      fetchBatch(1)
    }
  }, [fetchBatch])

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
  }, [batch, hasMore, loadingMore, loading, fetchBatch])

  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="aspect-video rounded-[var(--radius-lg)]" />
        ))}
      </div>
    )
  }

  if (collections.length === 0) {
    return (
      <p style={{ margin: 0, paddingLeft: 4, fontSize: 'var(--text-base)', lineHeight: '20px', color: 'var(--text-muted)' }}>
        No popular franchises found.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className={GRID}>
        {collections.map(c => (
          // A backdrop-shaped poster card: the same lift, ring and hover glow
          // as PosterCard (the `.poster-card*` rules), with the name over a
          // scrim at the foot of the art. No blur: these render per item.
          // The scrim is a solid band under the two caption lines before it
          // fades, because a fade that starts at the bottom edge thins to a
          // third of its strength by the top glyph line and light backdrops
          // (Wicked, The Bear) then fail AA behind the name.
          <Link
            key={c.id}
            href={`/collections/${c.id}`}
            className="poster-card"
            style={{ position: 'relative', display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div
              className="poster-card-frame"
              style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: 'var(--bg-deep)' }}
            >
              {c.backdrop_url ? (
                <Image src={c.backdrop_url} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="poster-card-img object-cover" />
              ) : c.poster_url ? (
                <Image src={c.poster_url} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="poster-card-img object-contain" />
              ) : null}
              <div
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--scrim) 0, var(--scrim) 56px, transparent 104px)' }}
              />
              <p
                style={{
                  position: 'absolute', left: 12, right: 12, bottom: 10, margin: 0,
                  fontSize: 'var(--text-sm)', lineHeight: '18px',
                  fontWeight: 'var(--weight-semibold)' as CSSProperties['fontWeight'],
                  letterSpacing: 'var(--tracking-text)', color: 'var(--text-primary)',
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}
              >
                {c.name}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center h-8">
          {loadingMore && (
            <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={1.8} aria-hidden="true" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      )}
    </div>
  )
}
