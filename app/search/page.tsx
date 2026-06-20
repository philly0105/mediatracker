'use client'
import { useState, useCallback, useEffect } from 'react'
import type { TmdbSearchResult } from '@/types'
import { createClient } from '@/lib/supabase/client'
import MediaInfoModal from '@/components/MediaInfoModal'
import { CheckCircle2, Bookmark, Search } from 'lucide-react'
import SelectableOverlay from '@/components/SelectableOverlay'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'

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
    <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>Search</h1>
      
      <Input
        icon={<Search className="w-5 h-5" />}
        placeholder="Search movies and TV shows..."
        value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value) }}
        autoFocus
      />

      {searchLoading && <p className="text-zinc-500 text-sm px-1">Searching...</p>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(r => {
          const watched = watchedIds.has(r.tmdb_id)
          const listed = watchlistIds.has(r.tmdb_id)
          return (
            <SelectableOverlay key={r.tmdb_id} item={r}>
              <SearchRow r={r} watched={watched} listed={listed} onClick={() => setSelected(r)} />
            </SelectableOverlay>
          )
        })}
        {query.trim().length > 0 && results.length === 0 && !searchLoading && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No matches for &ldquo;{query}&rdquo;.</p>
        )}
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
    </div>
  )
}

function SearchRow({ r, watched, listed, onClick }: { r: TmdbSearchResult, watched: boolean, listed: boolean, onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px',
        textAlign: 'left',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        background: hover ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-soft)',
        backdropFilter: 'blur(var(--blur-md))',
        transition: 'background var(--dur-fast) var(--ease-standard)',
      }}
    >
      {r.poster_url ? (
        <img src={r.poster_url} alt="" className="w-10 h-14 object-cover rounded-[var(--radius-xl)] flex-shrink-0" />
      ) : (
        <div className="w-10 h-14 rounded-[var(--radius-xl)] flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black border border-white/5 text-zinc-600 text-xs">
          No Poster
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="font-semibold text-white text-[15px] m-0">{r.title}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[13px] text-zinc-400">{r.release_year ?? '—'} · {r.type === 'show' ? 'TV Show' : 'Movie'}</span>
          {watched && (
            <Badge tone="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 className="w-3 h-3" /> Watched
            </Badge>
          )}
          {!watched && listed && (
            <Badge tone="neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Bookmark className="w-3 h-3" /> Watchlist
            </Badge>
          )}
        </div>
        {r.overview && <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{r.overview}</p>}
      </div>
    </button>
  )
}
