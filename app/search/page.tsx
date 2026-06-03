'use client'
import { useState, useCallback } from 'react'
import type { TmdbSearchResult } from '@/types'
import MediaInfoModal from '@/components/MediaInfoModal'
import { Search, Sparkles, Loader2, CheckSquare, Square, Film, Tv } from 'lucide-react'

const glassCard = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
}

interface AskResult {
  tmdb_id: number
  type: 'movie' | 'show'
  title: string
  release_year: number | null
  poster_url: string | null
  overview: string
  vote_average?: number
}

export default function SearchPage() {
  const [mode, setMode] = useState<'search' | 'ask'>('search')

  // Search state
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbSearchResult[]>([])
  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // Ask state
  const [askQuery, setAskQuery] = useState('')
  const [askLoading, setAskLoading] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [askAction, setAskAction] = useState<'watched' | 'watchlist' | null>(null)
  const [askExplanation, setAskExplanation] = useState<string | null>(null)
  const [askResults, setAskResults] = useState<AskResult[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkDone, setBulkDone] = useState(false)

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

  async function handleAsk() {
    if (!askQuery.trim()) return
    setAskLoading(true)
    setAskError(null)
    setAskResults([])
    setAskAction(null)
    setAskExplanation(null)
    setBulkDone(false)
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: askQuery }),
      })
      const data = await res.json()
      if (!res.ok) { setAskError(data.error); return }
      setAskAction(data.action)
      setAskExplanation(data.explanation)
      setAskResults(data.results ?? [])
      setCheckedIds(new Set(data.results.map((r: AskResult) => `${r.type}-${r.tmdb_id}`)))
    } catch {
      setAskError('Something went wrong. Please try again.')
    } finally {
      setAskLoading(false)
    }
  }

  function toggleCheck(r: AskResult) {
    const key = `${r.type}-${r.tmdb_id}`
    setCheckedIds(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleBulkAction() {
    if (!askAction || checkedIds.size === 0) return
    setBulkLoading(true)
    const selected = askResults.filter(r => checkedIds.has(`${r.type}-${r.tmdb_id}`))
    const today = new Date().toISOString().split('T')[0]
    await Promise.all(
      selected.map(r =>
        askAction === 'watched'
          ? fetch('/api/watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: r.tmdb_id, type: r.type, watched_at: today }) })
          : fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: r.tmdb_id, type: r.type, priority: 'want_to_watch' }) })
      )
    )
    setBulkLoading(false)
    setBulkDone(true)
  }

  const checkedCount = checkedIds.size

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        {/* Mode toggle */}
        <div className="flex bg-black/40 p-1 rounded-xl">
          <button
            onClick={() => setMode('search')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'search' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
          <button
            onClick={() => setMode('ask')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === 'ask' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-zinc-500 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ask AI
          </button>
        </div>
      </div>

      {mode === 'search' ? (
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
                await fetch('/api/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, priority: 'want_to_watch' }) })
                setResults([]); setQuery('')
              }}
              onMarkAsWatched={async () => {
                await fetch('/api/watch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: selected.tmdb_id, type: selected.type, watched_at: new Date().toISOString().split('T')[0] }) })
                setResults([]); setQuery('')
              }}
            />
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={askQuery}
              onChange={e => setAskQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAsk()}
              placeholder='e.g. "add all Star Wars movies to watched"'
              className="flex-1 px-5 py-3 rounded-full text-white text-base placeholder:text-zinc-500 focus:outline-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(139,92,246,0.5)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              autoFocus
            />
            <button
              onClick={handleAsk}
              disabled={askLoading || !askQuery.trim()}
              className="px-5 py-3 rounded-full font-semibold text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 flex items-center gap-2 shrink-0"
            >
              {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {askLoading ? 'Thinking...' : 'Ask'}
            </button>
          </div>

          {askError && (
            <p className="text-sm text-rose-400 px-4 py-3 rounded-2xl" style={{ background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.2)' }}>
              {askError}
            </p>
          )}

          {askExplanation && !bulkDone && (
            <p className="text-sm text-violet-300 px-1 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {askExplanation}
            </p>
          )}

          {bulkDone && (
            <div className="px-4 py-3 rounded-2xl text-sm font-semibold text-emerald-400 flex items-center gap-2" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              Done! {checkedCount} {checkedCount === 1 ? 'item' : 'items'} added to your {askAction === 'watched' ? 'watched list' : 'watchlist'}.
            </div>
          )}

          {askResults.length > 0 && !bulkDone && (
            <>
              <div className="space-y-2">
                {askResults.map(r => {
                  const key = `${r.type}-${r.tmdb_id}`
                  const checked = checkedIds.has(key)
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCheck(r)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all"
                      style={{ ...glassCard, opacity: checked ? 1 : 0.45 }}
                    >
                      <span className="shrink-0 text-violet-400">
                        {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-zinc-600" />}
                      </span>
                      {r.poster_url
                        ? <img src={r.poster_url} alt={r.title} className="w-10 h-14 object-cover rounded-lg shrink-0" />
                        : <div className="w-10 h-14 rounded-lg shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />}
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{r.title}</p>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                          {r.type === 'show' ? <Tv className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                          <span>{r.release_year ?? '—'}</span>
                          {r.vote_average ? <span className="text-zinc-600">· ★ {r.vote_average.toFixed(1)}</span> : null}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={handleBulkAction}
                disabled={bulkLoading || checkedCount === 0}
                className="w-full py-3 rounded-full font-bold text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: askAction === 'watched' ? 'rgba(52,211,153,0.15)' : 'rgba(139,92,246,0.15)', border: `1px solid ${askAction === 'watched' ? 'rgba(52,211,153,0.3)' : 'rgba(139,92,246,0.3)'}`, color: askAction === 'watched' ? 'rgb(52,211,153)' : 'rgb(167,139,250)' }}
              >
                {bulkLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                  : `Add ${checkedCount} ${checkedCount === 1 ? 'item' : 'items'} to ${askAction === 'watched' ? 'Watched' : 'Watchlist'}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
