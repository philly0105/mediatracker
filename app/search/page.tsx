'use client'
import Image from 'next/image'
import { useState, useCallback, useEffect, useRef } from 'react'
import type { TmdbSearchResult } from '@/types'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { useMediaActions, isAlreadyWatchedError } from '@/lib/useMediaActions'
import MediaInfoModal from '@/components/MediaInfoModal'
import { Bookmark, Check, CheckCircle2, Loader2, Search } from 'lucide-react'
import SelectableOverlay from '@/components/SelectableOverlay'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ToastProvider'

export default function SearchPage() {
  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [actioning, setActioning] = useState<{ id: number; action: 'bookmark' | 'check' } | null>(null)

  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()

  const { addToWatchlist, markWatched, removeFromWatchlist } = useMediaActions({ priority: 'want_to_watch' })
  const { toast } = useToast()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Cancel any pending debounce/request on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }

    // Cancel any in-flight request before starting a new one. Without this a
    // slow early response could land after a fast later one and leave the list
    // showing results for a prefix of what was typed.
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setSearchLoading(true)
    try {
      const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      const data = await res.json()
      setResults(data.results ?? [])
    } catch (err) {
      // A superseded request is not a failure — leave the results alone so the
      // newer one can fill them in.
      if ((err as Error)?.name === 'AbortError') return
      setResults([])
    } finally {
      if (abortRef.current === controller) setSearchLoading(false)
    }
  }, [])

  // Every keystroke used to fire its own TMDB request; "breaking bad" was 12.
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2) {
      setResults([])
      setSearchLoading(false)
      return
    }
    debounceRef.current = setTimeout(() => search(value), 350)
  }, [search])

  // Quick actions on a result row. Handlers live here (not in SearchRow) so they
  // share the toast + library-id state; the row just calls back with the item.
  function offerRewatch(r: TmdbSearchResult) {
    toast(`${r.title} is already in your history.`, {
      tone: 'info',
      action: {
        label: 'Log rewatch',
        onClick: () => handleMarkRewatch(r),
      },
    })
  }

  async function handleMarkRewatch(r: TmdbSearchResult) {
    try {
      setActioning({ id: r.tmdb_id, action: 'check' })
      await markWatched(r.tmdb_id, r.type, { rewatch: true })
      setWatchedIds(prev => new Set(prev).add(r.tmdb_id))
      toast(`Logged a rewatch of ${r.title}.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not mark as watched.', { tone: 'error' })
    } finally {
      // Only clear our own pending marker — another row's action may have
      // started while this one was in flight.
      setActioning(prev => (prev?.id === r.tmdb_id ? null : prev))
    }
  }

  async function handleToggleWatched(r: TmdbSearchResult) {
    // Already watched → offer rewatch instead of writing, so an accidental tap
    // never silently logs a duplicate.
    if (watchedIds.has(r.tmdb_id)) {
      offerRewatch(r)
      return
    }
    try {
      setActioning({ id: r.tmdb_id, action: 'check' })
      await markWatched(r.tmdb_id, r.type)
      setWatchedIds(prev => new Set(prev).add(r.tmdb_id))
      toast(`Logged ${r.title} as watched.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      if (isAlreadyWatchedError(err)) {
        offerRewatch(r)
      } else {
        toast(err instanceof Error ? err.message : 'Could not mark as watched.', { tone: 'error' })
      }
    } finally {
      setActioning(prev => (prev?.id === r.tmdb_id ? null : prev))
    }
  }

  async function handleToggleWatchlist(r: TmdbSearchResult) {
    try {
      setActioning({ id: r.tmdb_id, action: 'bookmark' })
      if (watchlistIds.has(r.tmdb_id)) {
        await removeFromWatchlist(r.tmdb_id, r.type)
        setWatchlistIds(prev => {
          const next = new Set(prev)
          next.delete(r.tmdb_id)
          return next
        })
        toast(`Removed ${r.title} from your watchlist.`, { tone: 'success' })
      } else {
        await addToWatchlist(r.tmdb_id, r.type)
        setWatchlistIds(prev => new Set(prev).add(r.tmdb_id))
        toast(`Added ${r.title} to your watchlist.`, { tone: 'success' })
      }
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not update your watchlist.', { tone: 'error' })
    } finally {
      setActioning(prev => (prev?.id === r.tmdb_id ? null : prev))
    }
  }

  return (
    <div style={{ maxWidth: 672, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>Search</h1>
      
      <Input
        icon={<Search className="w-5 h-5" />}
        placeholder="Search movies and TV shows..."
        value={query}
        onChange={e => handleQueryChange(e.target.value)}
        autoFocus
      />

      {searchLoading && <p className="text-zinc-500 text-sm px-1">Searching...</p>}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {results.map(r => {
          const watched = watchedIds.has(r.tmdb_id)
          const listed = watchlistIds.has(r.tmdb_id)
          return (
            <SelectableOverlay key={r.tmdb_id} item={r}>
              <SearchRow
                r={r}
                watched={watched}
                listed={listed}
                onClick={() => setSelected(r)}
                onToggleWatched={handleToggleWatched}
                onToggleWatchlist={handleToggleWatchlist}
                pending={actioning}
              />
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
            await addToWatchlist(selected.tmdb_id, selected.type)
            setWatchlistIds(prev => new Set(prev).add(selected.tmdb_id))
          }}
          onMarkAsWatched={async (opts) => {
            await markWatched(selected.tmdb_id, selected.type, opts)
            setWatchedIds(prev => new Set(prev).add(selected.tmdb_id))
          }}
        />
      )}
    </div>
  )
}

function SearchRow({ r, watched, listed, onClick, onToggleWatched, onToggleWatchlist, pending }: {
  r: TmdbSearchResult
  watched: boolean
  listed: boolean
  onClick: () => void
  onToggleWatched: (r: TmdbSearchResult) => void
  onToggleWatchlist: (r: TmdbSearchResult) => void
  pending: { id: number; action: 'bookmark' | 'check' } | null
}) {
  const [hover, setHover] = useState(false)
  const busy = pending?.id === r.tmdb_id
  return (
    // Wrapper keeps the nested action buttons out of the button element, so the
    // row stays a valid single clickable button (no nested <button> HTML).
    <div className="group relative">
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
          <Image src={r.poster_url} alt="" width={40} height={56} className="w-10 h-14 object-cover rounded-[var(--radius-xl)] flex-shrink-0" />
        ) : (
          <div className="w-10 h-14 rounded-[var(--radius-xl)] flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black border border-white/5 text-zinc-600 text-xs">
            No Poster
          </div>
        )}
        {/* pr-20 keeps text clear of the overlaid action cluster on small screens */}
        <div style={{ minWidth: 0, flex: 1 }} className="pr-20 md:pr-2">
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

      {/* Quick actions — right-aligned over the row, matching the watchlist card */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-sm border border-[var(--border-subtle)] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWatchlist(r) }}
          disabled={busy}
          className={`p-1.5 rounded-sm transition-colors ${
            listed
              ? 'text-[var(--amber-300)] bg-[var(--amber-tint-bg)]'
              : 'text-zinc-400 hover:text-[var(--amber-300)] hover:bg-[var(--amber-tint-bg)]'
          }`}
          title={listed ? 'Remove from watchlist' : 'Add to watchlist'}
          aria-label={listed ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          {busy && pending?.action === 'bookmark' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Bookmark className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWatched(r) }}
          disabled={busy}
          className={`p-1.5 rounded-sm transition-colors ${
            watched
              ? 'text-[var(--teal-300)] bg-[var(--teal-tint-bg)]'
              : 'text-zinc-400 hover:text-[var(--teal-300)] hover:bg-[var(--teal-tint-bg)]'
          }`}
          title={watched ? 'Watched — log a rewatch' : 'Mark as watched'}
          aria-label={watched ? 'Watched — log a rewatch' : 'Mark as watched'}
        >
          {busy && pending?.action === 'check' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
