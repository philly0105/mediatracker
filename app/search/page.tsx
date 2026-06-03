'use client'
import { useState, useCallback } from 'react'
import type { TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Search</h1>
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
      {loading && <p className="text-zinc-500 text-sm px-1">Searching...</p>}
      <div className="space-y-2">
        {results.map(r => (
          <button key={r.tmdb_id} onClick={() => setSelected(r)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-colors backdrop-blur-md"
            style={glassCard}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)')}>
            {r.poster_url
              ? <img src={r.poster_url} alt={r.title} className="w-10 h-14 object-cover rounded-lg" />
              : <div className="w-10 h-14 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />}
            <div>
              <p className="font-medium text-white">{r.title}</p>
              <p className="text-sm text-zinc-400">{r.release_year} · {r.type === 'show' ? 'TV Show' : 'Movie'}</p>
              {r.overview && <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{r.overview}</p>}
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <MediaInfoModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' })
            })
            setResults([])
            setQuery('')
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] })
            })
            setResults([])
            setQuery('')
          }}
        />
      )}
    </div>
  )
}
