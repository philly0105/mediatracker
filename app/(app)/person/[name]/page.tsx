'use client'
import Image from 'next/image'
import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { TmdbSearchResult } from '@/types'
import { ArrowLeft, User, AlertCircle, SearchX, CheckCircle2, Bookmark } from 'lucide-react'
import SelectableOverlay from '@/components/SelectableOverlay'
import BackButton from '@/components/BackButton'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PosterBadge, PosterCard } from '@/components/ui/PosterCard'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useMediaModal } from '@/components/MediaModalProvider'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { mediaKey } from '@/lib/mediaKey'

// Five or six posters across on a desktop, two or three on a phone, with the
// library grid's gaps. loading.tsx repeats this string (a server component
// can't import a value from a client module), so keep the two the same.
const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5 xl:grid-cols-6'

export default function PersonPage() {
  const params = useParams()
  const rawName = params?.name as string
  const name = rawName ? decodeURIComponent(rawName) : ''

  const [topMovies, setTopMovies] = useState<TmdbSearchResult[]>([])
  const [recentMovies, setRecentMovies] = useState<TmdbSearchResult[]>([])
  const [allMovies, setAllMovies] = useState<TmdbSearchResult[]>([])
  const [viewMode, setViewMode] = useState<'highlights' | 'all'>('highlights')

  const [profileUrl, setProfileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // A flag, not a message: `err.message` on a network failure is the browser's
  // own string ("Failed to fetch"), which was being rendered verbatim as the
  // hint. The real message goes to the console, where it is useful.
  const [error, setError] = useState(false)

  const { openMedia } = useMediaModal()
  // The app already knows which of these credits are in the library; not saying
  // so made the page feel disconnected from the rest of the product.
  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()

  const fetchPersonData = useCallback(async () => {
    if (!name) return
    try {
      setLoading(true)
      setError(false)
      const res = await fetch(`/api/person?name=${encodeURIComponent(name)}`)
      if (!res.ok) throw new Error(`Failed to load person details (${res.status})`)
      const data = await res.json()
      setTopMovies(data.topMovies || [])
      setRecentMovies(data.recentMovies || [])
      setAllMovies(data.allMovies || [])
      setProfileUrl(data.profile_url || null)
    } catch (err: unknown) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [name])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPersonData()
  }, [fetchPersonData])

  if (!name) return null

  const renderMovieGrid = (items: TmdbSearchResult[], title: string, showSeeAllButton = false) => (
    <section aria-label={title}>
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: 12 }}>
        <SectionHeader title={title} style={{ marginBottom: 0 }} />
        {showSeeAllButton && items.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setViewMode('all')}>
            See all {allMovies.length} credits
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <EmptyState
          size="compact"
          icon={SearchX}
          title="No credits to show"
          hint="TMDB has no film or TV credits listed for this person."
        />
      ) : (
        <div className={GRID}>
          {items.map((item) => {
            const key = mediaKey(item.type, item.tmdb_id)
            const typeLabel = item.type === 'show' ? 'TV Show' : 'Movie'
            const score = item.vote_average !== undefined && item.vote_average > 0 ? item.vote_average.toFixed(1) : null
            return (
              <SelectableOverlay key={`${item.tmdb_id}-${item.type}`} item={item}>
                <PosterCard
                  title={item.title}
                  // The type stays in the caption, which is always visible;
                  // the hover overlay never shows on a touch screen.
                  year={item.release_year ? `${item.release_year} · ${typeLabel}` : typeLabel}
                  posterUrl={item.poster_url}
                  overlay={score ? `TMDB ${score}` : undefined}
                  onClick={() => openMedia(item, {
                    priority: 'must_watch',
                    onChanged: (change) => {
                      if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(key))
                      if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(key))
                    },
                  })}
                  // Same badge as the streaming grid, so "already seen" reads
                  // the same wherever TMDB results are listed.
                  badges={
                    watchedIds.has(key) ? (
                      <PosterBadge><CheckCircle2 className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" /> Watched</PosterBadge>
                    ) : watchlistIds.has(key) ? (
                      <PosterBadge><Bookmark className="h-3 w-3" strokeWidth={1.8} aria-hidden="true" /> Watchlist</PosterBadge>
                    ) : undefined
                  }
                />
              </SelectableOverlay>
            )
          })}
        </div>
      )}
    </section>
  )

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        {viewMode === 'all' ? (
          <Button variant="secondary" size="sm" onClick={() => setViewMode('highlights')}>
            <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
            <span>Back to highlights</span>
          </Button>
        ) : (
          <BackButton />
        )}
      </div>

      <Card variant="panel" className="flex flex-col items-center gap-5 text-center md:flex-row md:items-center md:text-left">
        {profileUrl ? (
          <Image
            src={profileUrl}
            alt=""
            aria-hidden="true"
            width={128}
            height={128}
            className="h-24 w-24 shrink-0 rounded-full object-cover md:h-32 md:w-32"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          />
        ) : (
          <div
            aria-hidden="true"
            className="glass-btn flex h-24 w-24 shrink-0 items-center justify-center rounded-full md:h-32 md:w-32"
            style={{ color: 'var(--text-secondary)' }}
          >
            <User className="h-10 w-10 md:h-12 md:w-12" strokeWidth={1.8} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {/* The same responsive pair every other h1 wears (PageHeader): a
              hardcoded 28px ran a long name to three lines at 390px. */}
          <h1
            className="text-[length:var(--text-2xl)] leading-[30px] md:text-[length:var(--text-3xl)] md:leading-[34px]"
            style={{
              margin: 0,
              fontWeight: 'var(--weight-heading)' as React.CSSProperties['fontWeight'],
              letterSpacing: 'var(--tracking-tight)',
              color: 'var(--text-primary)',
            }}
          >
            {name}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-base)', lineHeight: '20px', color: 'var(--text-muted)' }}>
            {viewMode === 'highlights' ? 'Top rated and most recent credits' : `All ${allMovies.length} credits`}
          </p>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className={GRID}>
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-[var(--radius-xl)]" />
            ))}
          </div>
        </div>
      ) : error ? (
        <EmptyState
          tone="error"
          icon={AlertCircle}
          title="Couldn't load this filmography"
          hint="We couldn't reach the film database just now. This is usually temporary."
          actionLabel="Try again"
          onAction={fetchPersonData}
        />
      ) : viewMode === 'highlights' ? (
        <div className="space-y-10">
          {renderMovieGrid(topMovies, 'Top rated', true)}
          {renderMovieGrid(recentMovies, 'Most recent', false)}
        </div>
      ) : (
        <div className="space-y-10">
          {renderMovieGrid(allMovies, 'All credits', false)}
        </div>
      )}
    </div>
  )
}
