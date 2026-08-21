'use client'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, CheckCircle2, Bookmark, Check, Plus, Loader2, User, Clock } from 'lucide-react'
import type { TmdbSearchResult, TmdbPersonResult } from '@/types'
import { useModal } from '@/lib/useModal'
import { useIsMac } from '@/components/ui/Kbd'
import { useTmdbSearch, type SearchMode } from '@/lib/useTmdbSearch'
import { useLibraryIds } from '@/lib/useLibraryIds'
import { readRecentSearches, recordRecentSearch, clearRecentSearches } from '@/lib/recentSearches'
// Shared with the g-prefixed shortcuts and the help sheet — see lib/quickNav.
import { QUICK_NAV } from '@/lib/quickNav'
import { useMediaActions, isAlreadyWatchedError } from '@/lib/useMediaActions'
import { useMediaModal, type MediaChange } from '@/components/MediaModalProvider'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ToastProvider'

interface Props {
  onClose: () => void
}

export default function SearchOverlay({ onClose }: Props) {
  const [mode, setMode] = useState<SearchMode>('title')
  // The footer hint said ⌘↵ on every platform; the handler has always taken
  // Ctrl too (KeyboardShortcuts.tsx).
  const isMac = useIsMac()
  const { query, setQuery, results, loading, clear } = useTmdbSearch(mode)
  const { watchedIds, watchlistIds, setWatchedIds, setWatchlistIds } = useLibraryIds()
  // The old dashboard dropdown refreshed the route after an action so Recently
  // Watched updated; the overlay now owns that responsibility.
  const router = useRouter()
  const { addToWatchlist, markWatched } = useMediaActions({
    priority: 'want_to_watch',
    onDone: () => router.refresh(),
  })
  const { openMedia } = useMediaModal()

  // KeyboardShortcuts renders this component only after a keypress, so it never
  // exists during SSR — a lazy localStorage read here cannot mismatch hydration.
  const [recents, setRecents] = useState<string[]>(() => readRecentSearches())

  const [activeIndex, setActiveIndex] = useState(0)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const { toast } = useToast()

  const { containerRef } = useModal(handleClose)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Closing resets the query + results. The overlay stays mounted underneath a
  // layered MediaInfoModal, so the reset happens here rather than on unmount.
  function handleClose() {
    clear()
    onClose()
  }

  // The overlay stays mounted under the details modal so the search survives.
  // `onNavigateAway` is the exception: following a link out of the modal should
  // take the whole palette with it, same as picking a person result directly.
  // Remembered when a search is acted on rather than as it is typed — see
  // lib/recentSearches.
  function rememberQuery() {
    setRecents(recordRecentSearch(query))
  }

  function openPerson(name: string) {
    rememberQuery()
    navigateTo(`/person/${encodeURIComponent(name)}`)
  }

  function applyRecent(recent: string) {
    setQuery(recent)
    setActiveIndex(0)
    inputRef.current?.focus()
  }

  function openDetails(result: TmdbSearchResult) {
    rememberQuery()
    openMedia(result, {
      onNavigateAway: handleClose,
      // Focus goes back to the input once the modal is really gone, so the user
      // can keep typing without reaching for the mouse.
      onClosed: () => inputRef.current?.focus(),
      onChanged: (change: MediaChange, changedItem: TmdbSearchResult) => {
        const id = changedItem.tmdb_id
        if (change === 'watched') setWatchedIds((prev) => new Set(prev).add(id))
        if (change === 'watchlisted') setWatchlistIds((prev) => new Set(prev).add(id))
        // Recently Watched on the dashboard reads from the route.
        router.refresh()
      },
    })
  }

  // Under two characters there is nothing to search — in title mode the list
  // slot shows destinations instead, so the palette doubles as quick navigation.
  // People mode has no quick-nav; it shows a hint until there's a query.
  const showQuickNav = mode === 'title' && query.trim().length < 2
  // Recents sit above the destinations in the same slot, so they share the
  // arrow-key index space: [recents…, QUICK_NAV…].
  const shownRecents = showQuickNav ? recents : []

  // Typing filters destinations too — prefix match keeps it to what the user
  // is plausibly steering at ("sta" → Stats) without drowning TMDB results.
  // Only in title mode; a person query shouldn't surface page shortcuts.
  const matchedPages = mode === 'title' && query.trim().length >= 2
    ? QUICK_NAV.filter((page) => page.name.toLowerCase().startsWith(query.trim().toLowerCase()))
    : []

  // `results` is a union; the active mode determines which shape came back.
  const titleResults = mode === 'title' ? (results as TmdbSearchResult[]) : []
  const personResults = mode === 'person' ? (results as TmdbPersonResult[]) : []

  // Every row the arrow keys can reach, in render order. Also what
  // aria-activedescendant indexes into.
  const optionCount = showQuickNav
    ? shownRecents.length + QUICK_NAV.length
    : matchedPages.length + results.length
  const optionId = (index: number) => `search-overlay-option-${index}`

  function navigateTo(href: string) {
    router.push(href)
    handleClose()
  }

  // Logging used to cost a modal and a network round-trip: click a row, wait on
  // /api/tmdb/details, find the footer button, click, Escape twice. Everything
  // these need is already in scope, so the palette can just do it.
  async function logWatched(r: TmdbSearchResult) {
    if (watchedIds.has(r.tmdb_id) || actioningId !== null) return
    try {
      setActioningId(r.tmdb_id)
      await markWatched(r.tmdb_id, r.type)
      setWatchedIds((prev) => new Set(prev).add(r.tmdb_id))
      toast(`Logged ${r.title}.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(
        isAlreadyWatchedError(err)
          ? `${r.title} is already in your watch history.`
          : err instanceof Error ? err.message : 'Could not log that.',
        { tone: 'error' }
      )
    } finally {
      setActioningId(null)
    }
  }

  async function listForLater(r: TmdbSearchResult) {
    if (watchlistIds.has(r.tmdb_id) || actioningId !== null) return
    try {
      setActioningId(r.tmdb_id)
      await addToWatchlist(r.tmdb_id, r.type)
      setWatchlistIds((prev) => new Set(prev).add(r.tmdb_id))
      toast(`Added ${r.title} to your watchlist.`, { tone: 'success' })
    } catch (err) {
      console.error(err)
      toast(err instanceof Error ? err.message : 'Could not add to your watchlist.', { tone: 'error' })
    } finally {
      setActioningId(null)
    }
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

  // Keep the highlighted row in view as the arrow keys move it.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // A fresh keystroke starts the highlight back at the top. Results only change
  // through a debounced search triggered from this handler, so resetting here
  // covers every new result set without an effect.
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setActiveIndex(0)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const itemCount = optionCount
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (itemCount === 0) return
      setActiveIndex((i) => Math.min(i + 1, itemCount - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (itemCount === 0) return
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      // Modified Enter logs the active title without opening anything. Only
      // meaningful over a title result, so it falls through to plain Enter
      // everywhere else.
      const activeTitle = mode === 'title' && !showQuickNav
        ? titleResults[activeIndex - matchedPages.length]
        : undefined
      if (activeTitle && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        logWatched(activeTitle)
        return
      }
      if (activeTitle && e.shiftKey) {
        e.preventDefault()
        listForLater(activeTitle)
        return
      }
      if (mode === 'person') {
        const p = personResults[activeIndex]
        if (p) {
          e.preventDefault()
          openPerson(p.name)
        }
      } else if (showQuickNav) {
        if (activeIndex < shownRecents.length) {
          e.preventDefault()
          applyRecent(shownRecents[activeIndex])
          return
        }
        const active = QUICK_NAV[activeIndex - shownRecents.length]
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
            openDetails(active)
          }
        }
      }
    }
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[45] flex items-start justify-center"
      style={{ background: 'var(--scrim)', paddingTop: '12dvh' }}
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
          {/* The arrow-key highlight used to be purely visual, so a screen
              reader heard nothing as it moved. Focus stays on the input and
              aria-activedescendant points at the highlighted row instead. */}
          <input
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder={mode === 'person' ? 'Search actors and directors…' : 'Search movies and TV shows…'}
            aria-label={mode === 'person' ? 'Search actors and directors' : 'Search movies and TV shows'}
            autoFocus
            role="combobox"
            aria-expanded={optionCount > 0}
            aria-controls="search-overlay-results"
            aria-autocomplete="list"
            aria-activedescendant={optionCount > 0 ? optionId(activeIndex) : undefined}
            className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder:text-zinc-500"
          />
        </div>

        {/* Mode toggles — Titles and People are separate searches, not blended.
            Declared as pressed buttons rather than tabs: the results region is a
            listbox owned by the combobox above, not a tabpanel, so the tab
            pattern was half-implemented and announced a relationship that did
            not exist. */}
        <div className="px-5 pt-3 flex gap-2" role="group" aria-label="Search type">
          {([['title', 'Titles'], ['person', 'People']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
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
        <div
          ref={listRef}
          id="search-overlay-results"
          role="listbox"
          aria-label={mode === 'person' ? 'People' : 'Titles and pages'}
          className="max-h-[min(420px,60dvh)] overflow-y-auto p-2"
        >
          {showQuickNav && shownRecents.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 pt-2 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Recent</span>
                <button
                  type="button"
                  onClick={() => setRecents(clearRecentSearches())}
                  className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  Clear
                </button>
              </div>
              {shownRecents.map((recent, i) => (
                <div
                  key={recent}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === activeIndex}
                  data-index={i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => applyRecent(recent)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
                >
                  <Clock className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{recent}</span>
                </div>
              ))}
            </>
          )}
          {showQuickNav && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Go to</div>
              {QUICK_NAV.map((item, navIndex) => {
                const i = shownRecents.length + navIndex
                const Icon = item.icon
                return (
                  <div
                    key={item.href}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    data-index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigateTo(item.href)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
                  >
                    <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{item.name}</span>
                  </div>
                )
              })}
            </>
          )}
          {!showQuickNav && matchedPages.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Pages</div>
              {matchedPages.map((page, i) => {
                const Icon = page.icon
                return (
                  <div
                    key={page.href}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    data-index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => navigateTo(page.href)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${i === activeIndex ? 'bg-white/[0.06]' : ''}`}
                  >
                    <Icon className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{page.name}</span>
                  </div>
                )
              })}
            </>
          )}
          {mode === 'person' && query.trim().length < 2 && (
            <div className="py-8 text-sm text-zinc-500 text-center">Search for an actor or director by name.</div>
          )}
          {query.trim().length >= 2 && loading && (
            <div className="py-8 text-sm text-zinc-500 text-center">Searching…</div>
          )}
          {query.trim().length >= 2 && !loading && results.length === 0 && matchedPages.length === 0 && (
            <div className="py-8 text-center space-y-3">
              <p className="text-sm text-zinc-500">No matches for &ldquo;{query}&rdquo;.</p>
              {/* A dead end used to be the whole answer. The other index is one
                  keystroke away and usually has the thing they meant. */}
              <button
                type="button"
                onClick={() => switchMode(mode === 'title' ? 'person' : 'title')}
                className="text-xs font-semibold text-[var(--accent)] hover:underline"
              >
                {mode === 'title'
                  ? `Search people for “${query.trim()}” instead`
                  : `Search titles for “${query.trim()}” instead`}
              </button>
            </div>
          )}
          {personResults.map((p, i) => (
            <div
              key={p.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              data-index={i}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => openPerson(p.name)}
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
            </div>
          ))}
          {titleResults.map((r, i) => {
            const listIndex = i + matchedPages.length
            const watched = watchedIds.has(r.tmdb_id)
            const listed = watchlistIds.has(r.tmdb_id)
            return (
              <div
                key={`${r.type}-${r.tmdb_id}`}
                id={optionId(listIndex)}
                role="option"
                aria-selected={listIndex === activeIndex}
                data-index={listIndex}
                onMouseEnter={() => setActiveIndex(listIndex)}
                onClick={() => openDetails(r)}
                className={`group flex items-center gap-3 p-2 rounded-[var(--radius-md)] cursor-pointer w-full text-left ${listIndex === activeIndex ? 'bg-white/[0.06]' : ''}`}
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

                {/* Mouse-only shortcuts for the two things people come here to
                    do. Hidden from assistive tech on purpose: interactive
                    controls do not belong inside a listbox option, and keyboard
                    users get the same two actions from ⌘↵ / ⇧↵, which the
                    footer advertises. */}
                <div
                  aria-hidden="true"
                  className={`flex items-center gap-1 shrink-0 pr-1 transition-opacity ${
                    listIndex === activeIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={watched || actioningId !== null}
                    title={watched ? 'Already watched' : 'Mark as watched'}
                    onClick={(e) => { e.stopPropagation(); logWatched(r) }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-[var(--accent)] hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    {actioningId === r.tmdb_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={listed || watched || actioningId !== null}
                    title={listed ? 'Already on your watchlist' : 'Add to watchlist'}
                    onClick={(e) => { e.stopPropagation(); listForLater(r) }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          {mode === 'title' && !showQuickNav && (
            <>
              <span>{isMac ? '⌘↵' : 'Ctrl ↵'} Watched</span>
              <span>⇧↵ Watchlist</span>
            </>
          )}
          <span>Esc Close</span>
        </div>
      </motion.div>

    </div>

    </>
  )
}
