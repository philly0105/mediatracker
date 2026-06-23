'use client'
import { useState, useEffect } from 'react'
import type { TmdbSearchResult } from '@/types'
import { createClient } from '@/lib/supabase/client'
import MediaInfoModal from '@/components/MediaInfoModal'
import SelectableOverlay from '@/components/SelectableOverlay'
import { motion } from 'framer-motion'
import { CheckCircle2, Bookmark, ChevronLeft, ChevronRight, Loader2, Clapperboard } from 'lucide-react'

const PROVIDERS = [
  { id: '8', name: 'Netflix' },
  { id: '15', name: 'Hulu' },
  { id: '350', name: 'Apple TV+' },
  { id: '337', name: 'Disney+' },
  { id: '1899', name: 'Max' },
  { id: '9', name: 'Prime' },
  { id: '386', name: 'Peacock' },
]

export default function StreamingPage() {
  const [provider, setProvider] = useState('8')
  const [type, setType] = useState<'movie' | 'show'>('movie')
  const [page, setPage] = useState(1)

  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)

  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set())
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchLibraryIds() {
      const supabase = createClient()
      const [watchedRes, watchlistRes] = await Promise.all([
        supabase.from('watch_entries').select('media!inner(tmdb_id)'),
        supabase.from('watchlist_items').select('media!inner(tmdb_id)'),
      ])
      const extract = (rows: any[] | null) =>
        new Set(
          (rows ?? [])
            .map((row: any) => {
              const m = Array.isArray(row.media) ? row.media[0] : row.media
              return m?.tmdb_id
            })
            .filter(Boolean)
        )
      setWatchedIds(extract(watchedRes.data) as Set<number>)
      setWatchlistIds(extract(watchlistRes.data) as Set<number>)
    }
    fetchLibraryIds()
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(`/api/streaming?provider=${provider}&type=${type}&page=${page}`)
        const data = await res.json()
        if (cancelled) return
        setResults(data.results ?? [])
        setTotalPages(data.total_pages ?? 0)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [provider, type, page])

  function changeProvider(id: string) {
    setProvider(id)
    setPage(1)
  }

  function changeType(t: 'movie' | 'show') {
    setType(t)
    setPage(1)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 flex items-center gap-2.5">
          <Clapperboard className="w-7 h-7 text-[var(--accent)]" />
          <span>Streaming</span>
        </h1>
        <p className="text-sm text-zinc-400">
          Browse what&rsquo;s streaming now on your services.
        </p>
      </div>

      {/* Provider pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => changeProvider(p.id)}
            className={`relative px-4 py-2 rounded-full font-semibold text-xs transition-all duration-300 whitespace-nowrap active:scale-95 ${
              provider === p.id
                ? 'text-white'
                : 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10'
            }`}
          >
            {provider === p.id && (
              <motion.div
                layoutId="activeProviderPill"
                className="absolute inset-0 bg-[var(--accent)] rounded-full -z-10 shadow-lg shadow-green-600/20"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {/* Type toggle */}
      <div className="flex justify-start">
        <div className="inline-flex p-1 rounded-sm bg-[var(--surface-input)] border border-[var(--border-subtle)] select-none">
          {([
            { id: 'movie', label: 'Movies' },
            { id: 'show', label: 'TV Shows' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => changeType(t.id)}
              className={`relative px-4 py-2 rounded-sm font-bold text-xs transition-all duration-300 active:scale-95 whitespace-nowrap ${
                type === t.id ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {type === t.id && (
                <motion.div
                  layoutId="activeStreamingType"
                  className="absolute inset-0 bg-white/10 rounded-sm -z-10 shadow-md"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Poster grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] rounded-[var(--radius-xl)] bg-white/5 border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-zinc-400 py-8 text-center">No titles found for this service.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
          {results.map((item) => {
            const watched = watchedIds.has(item.tmdb_id)
            const listed = watchlistIds.has(item.tmdb_id)
            return (
              <SelectableOverlay key={item.tmdb_id} item={item}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="group block w-full text-left"
                >
                  <div className="relative aspect-[2/3] rounded-[var(--radius-xl)] overflow-hidden border border-white/10 bg-[var(--bg-void)] shadow-md shadow-black/30 group-hover:border-[var(--border-strong)] group-hover:-translate-y-0.5 transition-all duration-300">
                    {item.poster_url ? (
                      <img
                        src={item.poster_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                        No Poster
                      </div>
                    )}
                    {watched ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[var(--teal-300)] bg-[var(--teal-tint-bg)] border border-[var(--teal-tint-border)] backdrop-blur-sm">
                        <CheckCircle2 className="w-3 h-3" /> Watched
                      </span>
                    ) : listed ? (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-zinc-200 bg-black/50 border border-white/10 backdrop-blur-sm">
                        <Bookmark className="w-3 h-3" /> Watchlist
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 px-0.5">
                    <p className="text-sm font-semibold text-white line-clamp-1 group-hover:text-[var(--accent)] transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-500">{item.release_year ?? '—'}</p>
                  </div>
                </button>
              </SelectableOverlay>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && results.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-sm text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs text-zinc-400 tabular-nums">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-sm text-xs font-semibold text-zinc-300 bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {selected && (
        <MediaInfoModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' }),
            })
            setWatchlistIds((prev) => new Set(prev).add(selected.tmdb_id))
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] }),
            })
            setWatchedIds((prev) => new Set(prev).add(selected.tmdb_id))
          }}
        />
      )}
    </div>
  )
}
