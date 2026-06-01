'use client'
import { useState, useCallback } from 'react'
import type { TmdbSearchResult } from '@/types'
import AddTitleModal from '@/components/AddTitleModal'

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
      <h1 className="text-2xl font-bold">Search</h1>
      <input
        type="text" value={query}
        onChange={e => { setQuery(e.target.value); search(e.target.value) }}
        placeholder="Search movies and TV shows..."
        className="w-full px-4 py-3 bg-gray-900 text-white rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 text-lg"
        autoFocus
      />
      {loading && <p className="text-gray-400 text-sm">Searching...</p>}
      <div className="space-y-3">
        {results.map(r => (
          <button key={r.tmdb_id} onClick={() => setSelected(r)}
            className="w-full flex items-center gap-3 p-3 bg-gray-900 hover:bg-gray-800 rounded-xl text-left">
            {r.poster_url
              ? <img src={r.poster_url} alt={r.title} className="w-10 h-14 object-cover rounded" />
              : <div className="w-10 h-14 bg-gray-700 rounded" />}
            <div>
              <p className="font-medium text-white">{r.title}</p>
              <p className="text-sm text-gray-400">{r.release_year} · {r.type === 'show' ? 'TV Show' : 'Movie'}</p>
              {r.overview && <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{r.overview}</p>}
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <AddTitleModal
          item={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); setResults([]); setQuery('') }}
        />
      )}
    </div>
  )
}
