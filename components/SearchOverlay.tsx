'use client'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, CheckCircle2, Bookmark, Home, Library, ListTodo, Clapperboard, Sparkles, List, Layers, BarChart3, Calendar, Settings, User } from 'lucide-react'
import type { TmdbSearchResult, TmdbPersonResult } from '@/types'
import { useModal } from '@/lib/useModal'
import { useTmdbSearch, type SearchMode } from '@/lib/useTmdbSearch'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { useMediaActions } from '@/lib/useMediaActions'
import MediaInfoModal from '@/components/MediaInfoModal'
import { Badge } from '@/components/ui/Badge'

interface Props {
  onClose: () => void
}

// Everything routable from the keyboard, nav-bar order first, then the
// destinations that live outside the sidebar's primary six.
const QUICK_NAV = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Library', href: '/library', icon: Library },
  { name: 'Watchlist', href: '/watchlist', icon: ListTodo },
  { name: 'Streaming', href: '/streaming', icon: Clapperboard },
  { name: 'Recommendations', href: '/recommendations', icon: Sparkles },
  { name: 'Lists', href: '/lists', icon: List },
  { name: 'Franchises', href: '/collections', icon: Layers },
  { name: 'Stats', href: '/stats', icon: BarChart3 },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function SearchOverlay({ onClose }: Props) {
  const [mode, setMode] = useState<SearchMode>('title')
  const { query, setQuery, results, loading, clear } = useTmdbSearch(mode)
  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()
  // The old dashboard dropdown refreshed the route after an action so Recently
  // Watched updated; the overlay now owns that responsibility.
  const router = useRouter()
  const { addToWatchlist, markWatched } = useMediaActions({
    priority: 'want_to_watch',
    onDone: () => router.refresh(),
  })

  const [selected, setSelected] = useState<TmdbSearchResult | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const { containerRef } = useModal(handleClose)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevSelected = useRef<TmdbSearchResult | null>(null)

  // Closing resets the query + results. The overlay stays mounted underneath a
  // layered MediaInfoModal, so the reset happens here rather than on unmount.
  function handleClose() {
    clear()
    onClose()
  }

  // Under two characters there is nothing to search — in title mode the list
  // slot shows destinations instead, so the palette doubles as quick navigation.
  // People mode has no quick-nav; it shows a hint until there's a query.
  const showQuickNav = mode === 'title' && query.trim().length < 2

  // Typing filters destinations too — prefix match keeps it to what the user
  // is plausibly steering at ("sta" → Stats) without drowning TMDB results.
  // Only in title mode; a person query shouldn't surface page shortcuts.
  const matchedPages = mode === 'title' && query.trim().length >= 2
    ? QUICK_NAV.filter((page) => page.name.toLowerCase().startsWith(query.trim().toLowerCase()))
    : []

  // `results` is a union; the active mode determines which shape came back.
  const titleResults = mode === 'title' ? (results as TmdbSearchResult[]) : []
  const personResults = mode === 'person' ? (results as TmdbPersonResult[]) : []

  function navigateTo(href: string) {
    router.push(href)
    handleClose()
  }

  function switchMode(next: SearchMode) {
    if (next === mode) return
    setMode(next)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  // useModal moves focus to the panel container, but the search input is the
  // element that should own focus — steer it back once the panel exists.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // When the layered MediaInfoModal closes, hand focus back to the input so the
  // user can keep searching without reaching for the mouse.
  useEffect(() => {
    if (prevSelected.current && !selected) {
      inputRef.current?.focus()
    }
    prevSelected.current = selected
  }, [selected])

  // Keep the highlighted row in view as the arrow keys move it.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Warm the highlighted person's route before it's clicked. /person/[name] is a
  // dynamic route behind the auth proxy (a getUser round trip per navigation);
  // an un-prefetched push blocks on that round trip before loading.tsx can even
  // show — the ~3s click freeze. Highlighting (hover or arrow keys both set
  // activeIndex) prefetches it so the click is instant. Next dedupes prefetches.
  useEffect(() => {
    const p = personResults[activeIndex]
    if (p) router.prefetch(`/person/${encodeURIComponent(p.name)}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, mode, results])

  // A fresh keystroke starts the highlight back at the top. Results only change
  // through a debounced search triggered from this handler, so resetting here
  // covers every new result set without an effect.
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setActiveIndex(0)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const itemCount = showQuickNav ? QUICK_NAV.length : matchedPages.length + results.length
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (itemCount === 0) return
      setActiveIndex((i) => Math.min(i + 1, itemCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (itemCount === 0) return
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (mode === 'person') {
        const p = personResults[activeIndex]
        if (p) {
          e.preventDefault()
          navigateTo(`/person/${encodeURIComponent(p.name)}`)
        }
      } else if (showQuickNav) {
        const active = QUICK_NAV[activeIndex]
        if (active) {
          e.preventDefault()
          navigateTo(active.href)
        }
      } else {
        if (activeIndex < matchedPages.length) {
          const page = matchedPages[activeIndex]
          if (page) {
            e.preventDefault()
            navigateTo(page.href)
          }
        } else {
          const active = titleResults[activeIndex - matchedPages.length]
          if (active) {
            e.preventDefault()
            setSelected(active)
          }
        }
      }
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[45] flex items-start justify-center backdrop-blur-md"
      style={{ background: 'var(--scrim)', paddingTop: '12vh' }}
      onClick={handleClose}
    >
      <motion.div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search movies and TV shows"
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--surface-modal)', width: 'min(640px, calc(100vw - 32px))' }}
        className="rounded-[var(--radius-2xl)] border border-white/15 shadow-2xl overflow-hidden"
      >
        {/* Input row */}
        <div className="px-5 py-4 flex items-center gap-3 border-b border-white/5">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={mode === 'person' ? 'Search actors and directors…' : 'Search movies and TV shows…'}
            autoFocus
            className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Mode tabs — Titles and People are separate searches, not blended. */}
        <div className="px-5 pt-3 flex gap-2" role="tablist" aria-label="Search type">
          {([['title', 'Titles'], ['person', 'People']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => switchMode(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                mode === value ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Results list */}
        <div ref={listRef} className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {showQuickNav && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Go to</div>
              {QUICK_NAV.map((item, i) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.href}
                    type="button"
                    data-index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigateTo(item.href)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
                  >
                    <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{item.name}</span>
                  </button>
                )
              })}
            </>
          )}
          {!showQuickNav && matchedPages.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Pages</div>
              {matchedPages.map((page, i) => {
                const Icon = page.icon
                return (
                  <button
                    key={page.href}
                    type="button"
                    data-index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigateTo(page.href)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
                  >
                    <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{page.name}</span>
                  </button>
                )
              })}
            </>
          )}
          {mode === 'person' && query.trim().length < 2 && (
            <div className="py-8 text-sm text-zinc-600 text-center">Search for an actor or director by name.</div>
          )}
          {query.trim().length >= 2 && loading && (
            <div className="py-8 text-sm text-zinc-600 text-center">Searching…</div>
          )}
          {query.trim().length >= 2 && !loading && results.length === 0 && matchedPages.length === 0 && (
            <div className="py-8 text-sm text-zinc-600 text-center">No matches for &ldquo;{query}&rdquo;.</div>
          )}
          {personResults.map((p, i) => (
            <button
              key={p.id}
              type="button"
              data-index={i}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => navigateTo(`/person/${encodeURIComponent(p.name)}`)}
              className={`flex items-center gap-3 p-2 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
            >
              {p.profile_url ? (
                <Image
                  src={p.profile_url}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black border border-white/5 text-zinc-600">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                {p.known_for && <p className="text-xs text-zinc-500 truncate mt-0.5">{p.known_for}</p>}
              </div>
            </button>
          ))}
          {titleResults.map((r, i) => {
            const listIndex = i + matchedPages.length
            const watched = watchedIds.has(r.tmdb_id)
            const listed = watchlistIds.has(r.tmdb_id)
            return (
              <button
                key={`${r.type}-${r.tmdb_id}`}
                type="button"
                data-index={listIndex}
                onMouseEnter={() => setActiveIndex(listIndex)}
                onClick={() => setSelected(r)}
                className={`flex items-center gap-3 p-2 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${listIndex === activeIndex ? 'bg-white/[0.06]' : ''}`}
              >
                {r.poster_url ? (
                  <Image
                    src={r.poster_url}
                    alt=""
                    width={40}
                    height={56}
                    className="w-10 h-14 rounded-[var(--radius-xl)] object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-14 rounded-[var(--radius-xl)] flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-black border border-white/5 text-zinc-600 text-xs">
                    No Poster
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500">{r.release_year ?? '—'} · {r.type === 'show' ? 'TV Show' : 'Movie'}</span>
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
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 flex gap-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </motion.div>

    </div>

    {/* Layered above the overlay — it portals to body at z-50, above the
        overlay's z-45 scrim. The overlay stays mounted underneath so focus
        can return to the input when the modal closes. Kept a React sibling of
        the scrim, not a child: portal events bubble through the React tree,
        so nesting it inside the scrim would let every click in the modal hit
        the scrim's close handler. */}
    {selected && (
      <MediaInfoModal
        item={selected}
        onClose={() => setSelected(null)}
        onAddToWatchlist={async () => {
          await addToWatchlist(selected.tmdb_id, selected.type)
          setWatchlistIds((prev) => new Set(prev).add(selected.tmdb_id))
        }}
        onMarkAsWatched={async (opts) => {
          await markWatched(selected.tmdb_id, selected.type, opts)
          setWatchedIds((prev) => new Set(prev).add(selected.tmdb_id))
        }}
      />
    )}
    </>
  )
}
