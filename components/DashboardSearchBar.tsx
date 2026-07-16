'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Film, Tv } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'
import { createPortal } from 'react-dom'

export default function DashboardSearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cancel any pending debounce/request on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  // Search API fetch
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      setShowDropdown(false)
      return
    }

    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setShowDropdown(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.results?.slice(0, 5) ?? []) // limit to 5 quick results
      } else {
        setResults([])
      }
    } catch (err) {
      // Ignore aborts from superseded requests; log real errors
      if ((err as Error)?.name !== 'AbortError') {
        console.error(err)
        setResults([])
      }
      return
    } finally {
      if (abortRef.current === controller) {
        setLoading(false)
      }
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      search(val)
    }, 350)
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl z-30">
      <Input
        icon={loading ? <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" /> : <Search className="w-5 h-5 text-zinc-500" />}
        placeholder="Quick log a movie or TV show..."
        value={query}
        onChange={handleInputChange}
        onFocus={() => { if (query.trim().length >= 2) setShowDropdown(true) }}
        className="w-full bg-[var(--surface-shell)]/80 backdrop-blur-xl border-[var(--border-default)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] transition-all rounded-full h-11 px-5"
      />

      {/* Floating Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-[var(--border-soft)] rounded-lg shadow-2xl overflow-hidden z-40 max-h-[380px] overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="flex items-center gap-3 p-4 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              <span>Searching TMDB...</span>
            </div>
          )}
          
          {!loading && results.length === 0 && (
            <div className="p-4 text-sm text-zinc-500">
              No matches found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <div className="flex flex-col">
              <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Suggestions</span>
                <span className="text-[10px] text-zinc-500">Click to configure</span>
              </div>
              
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.tmdb_id}`}
                  onClick={() => {
                    setSelected(item)
                    setShowDropdown(false)
                    setQuery('')
                  }}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors group"
                >
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt=""
                      className="w-9 h-12 object-cover rounded-md flex-shrink-0 border border-white/5"
                    />
                  ) : (
                    <div className="w-9 h-12 rounded-md flex-shrink-0 flex items-center justify-center bg-zinc-800 border border-white/5 text-zinc-600">
                      {item.type === 'show' ? <Tv className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-[14px] text-white group-hover:text-[var(--accent)] transition-colors block truncate">
                      {item.title}
                    </span>
                    <span className="text-xs text-zinc-400 block mt-0.5">
                      {item.release_year ?? '—'} · {item.type === 'show' ? 'TV Show' : 'Movie'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Log Info Modal */}
      {selected && createPortal(
        <MediaInfoModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToWatchlist={async () => {
            await fetch('/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' }),
            })
            setSelected(null)
            router.refresh()
          }}
          onMarkAsWatched={async () => {
            await fetch('/api/watch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] }),
            })
            setSelected(null)
            router.refresh()
          }}
        />,
        document.body
      )}
    </div>
  )
}
