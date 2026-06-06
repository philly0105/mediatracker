'use client'
import { useState, useCallback, useEffect } from 'react'
import type { TmdbSearchResult } from '@/types'
import { createClient } from '@/lib/supabase/client'
import MediaInfoModal from '@/components/MediaInfoModal'
import { CheckCircle2, Bookmark } from 'lucide-react'
import SelectableOverlay from '@/components/SelectableOverlay'

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default function SearchPage() {

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set())
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function fetchLibraryIds() {
      const supabase = createClient()
      const [watchedRes, watchlistRes] = await Promise.all([
        supabase.from('watch_entries').select('media!inner(tmdb_id)'),
        supabase.from('watchlist_items').select('media!inner(tmdb_id)')
      ])
      
      if (watchedRes.data) {
        setWatchedIds(new Set(
          watchedRes.data.map((row: any) => {
            const m = Array.isArray(row.media) ? row.media[0] : row.media
            return m?.tmdb_id
          }).filter(Boolean)
        ))
      }
      if (watchlistRes.data) {
        setWatchlistIds(new Set(
          watchlistRes.data.map((row: any) => {
            const m = Array.isArray(row.media) ? row.media[0] : row.media
            return m?.tmdb_id
          }).filter(Boolean)
        ))
      }
    }
    fetchLibraryIds()
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      </div>

      <>
        <input
            type="text" value={query}
            onChange={e => { setQuery(e.target.value); search(e.target.value) }}
            placeholder="Search movies and TV shows..."
            className="w-full px-5 py-3 rounded-full text-white text-base placeholder:text-zinc-500 focus:outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.3)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            autoFocus
          />
          {searchLoading && <p className="text-zinc-500 text-sm px-1">Searching...</p>}
          <div className="space-y-2">
            {results.map(r => (
              <SelectableOverlay key={r.tmdb_id} item={r}>
              <button onClick={() => setSelected(r)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors backdrop-blur-md"
                style={glassCard}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}>
                {r.poster_url
                  ? <img src={r.poster_url} alt={r.title} className="w-10 h-14 object-cover rounded-lg" />
                  : <div className="w-10 h-14 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />}
                <div>
                  <p className="font-medium text-white">{r.title}</p>
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mt-0.5">
                    <span>{r.release_year ?? '—'} · {r.type === 'show' ? 'TV Show' : 'Movie'}</span>
                    {watchedIds.has(r.tmdb_id) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 shrink-0" /> Watched
                      </span>
                    )}
                    {!watchedIds.has(r.tmdb_id) && watchlistIds.has(r.tmdb_id) && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">
                        <Bookmark className="w-3 h-3 shrink-0" /> Watchlist
                      </span>
                    )}
                  </div>
                  {r.overview && <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{r.overview}</p>}
                </div>
              </button>
              </SelectableOverlay>
            ))}
          </div>
          {selected && (
            <MediaInfoModal
              item={selected}
              onClose={() => setSelected(null)}
              onAddToWatchlist={async () => {
                await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' }) })
                setWatchlistIds(prev => new Set(prev).add(selected.tmdb_id))
              }}
              onMarkAsWatched={async () => {
                await fetch('/api/watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] }) })
                setWatchedIds(prev => new Set(prev).add(selected.tmdb_id))
              }}
            />
          )}
        </>
    </div>
  )
}
