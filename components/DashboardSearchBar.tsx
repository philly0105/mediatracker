'use client'
import Image from 'next/image'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Film, Tv } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import type { TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'
import { useMediaActions } from '@/lib/useMediaActions'
import { useTmdbSearch } from '@/lib/useTmdbSearch'
import { createPortal } from 'react-dom'

export default function DashboardSearchBar() {
  const [showDropdown, setShowDropdown] = useState(false)
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)

  // Query, debounce, and abort-on-supersede now live in the shared hook; this
  // component keeps only its dropdown visibility and the modal selection.
  const { query, setQuery, results, loading } = useTmdbSearch()

  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const { addToWatchlist, markWatched } = useMediaActions({
    priority: 'want_to_watch',
    onDone: () => {
      setSelected(null)
      router.refresh()
    },
  })

  // The hook owns the debounce timer; the dropdown just needs to open once a
  // request is actually in flight rather than on the first keystroke. The open
  // state is a latch driven by the hook's loading transition, so it can't be
  // derived from current props alone.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (loading) setShowDropdown(true)
  }, [loading])

  // A query below the two-character threshold clears the results out; close the
  // dropdown to match the old behaviour.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (query.trim().length < 2) setShowDropdown(false)
  }, [query])

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

  return (
    <div ref={containerRef} className="relative w-full max-w-xl z-30">
      <Input
        icon={loading ? <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" /> : <Search className="w-5 h-5 text-zinc-500" />}
        placeholder="Quick log a movie or TV show..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
              
              {results.slice(0, 5).map((item) => (
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
                    <Image
                      src={item.poster_url}
                      alt=""
                      width={36}
                      height={48}
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
          onAddToWatchlist={async () => { await addToWatchlist(selected.tmdb_id, selected.type) }}
          onMarkAsWatched={async (opts) => { await markWatched(selected.tmdb_id, selected.type, opts) }}
        />,
        document.body
      )}
    </div>
  )
}
